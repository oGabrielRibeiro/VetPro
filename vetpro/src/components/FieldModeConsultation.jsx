import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import FeedbackBanner from "./FeedbackBanner";
import { toUserFriendlyError } from "../utils/errorMessages";

const FieldModeConsultation = ({ patient, onSave, onBack, onSwitchToManual }) => {
  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showPausedActions, setShowPausedActions] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [segments, setSegments] = useState([]);
  const [liveInterim, setLiveInterim] = useState("");
  const [showTimelineExpanded, setShowTimelineExpanded] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [parsedConfidence, setParsedConfidence] = useState(null);
  const [saving, setSaving] = useState(false);
  const [audioProfile, setAudioProfile] = useState("normal");
  const [currentSpeaker, setCurrentSpeaker] = useState("Auto");
  const [analysisSource, setAnalysisSource] = useState("local");
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const keepRecordingRef = useRef(false);
  const transcriptRef = useRef("");
  const segmentsRef = useRef([]);
  const liveInterimRef = useRef("");
  const detectedSpeakerRef = useRef("Tutor");
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordedAudioBlobRef = useRef(null);
  const pauseRequestedRef = useRef(false);

  const supportsSpeech = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    [],
  );

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  useEffect(() => {
    if (!isRecording || !startedAt) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording, startedAt]);

  useEffect(() => {
    return () => {
      keepRecordingRef.current = false;
      recognition?.stop?.();
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop?.();
      }
      mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    };
  }, [recognition]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const formatElapsed = (seconds) => {
    const total = Math.max(0, Number(seconds) || 0);
    const mins = String(Math.floor(total / 60)).padStart(2, "0");
    const secs = String(total % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const normalizeText = (value = "") =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const detectSpeakerFromText = (phrase, fallbackSpeaker = "Tutor") => {
    const normalized = normalizeText(phrase || "");
    if (!normalized) return fallbackSpeaker;

    const tutorSignals = [
      "doutor",
      "doutora",
      "ele ta",
      "ela ta",
      "ele esta",
      "ela esta",
      "em casa",
      "desde ontem",
      "desde hoje",
      "nao come",
      "nao bebe",
      "vomito",
      "diarreia",
      "tosse",
      "coceira",
      "percebi",
      "notei",
      "estou preocupado",
    ];

    const medicoSignals = [
      "no exame",
      "ao exame",
      "diagnostico",
      "conduta",
      "tratamento",
      "prescrevo",
      "prescricao",
      "oriento",
      "retorno",
      "solicito exame",
      "vamos medicar",
      "fc",
      "fr",
      "temperatura",
      "avaliacao clinica",
    ];

    if (tutorSignals.some((signal) => normalized.includes(signal))) return "Tutor";
    if (medicoSignals.some((signal) => normalized.includes(signal))) return "Medico";

    return fallbackSpeaker;
  };

  const resolveSpeaker = (phrase) => {
    const lastSpeaker = detectedSpeakerRef.current || "Tutor";
    const fallback = lastSpeaker === "Tutor" ? "Medico" : "Tutor";
    const detected = detectSpeakerFromText(phrase, fallback);
    detectedSpeakerRef.current = detected;
    setCurrentSpeaker(detected);
    return detected;
  };

  const appendSegment = (chunk, atSeconds, speaker = "Tutor") => {
    const text = (chunk || "").trim();
    if (!text) return;
    if (audioProfile === "ruidoso" && text.length < 6) return;

    setSegments((prev) => {
      const lastNormalized = normalizeText(prev[prev.length - 1]?.text || "");
      const normalizedText = normalizeText(text);
      if (lastNormalized && normalizedText === lastNormalized) {
        return prev;
      }
      return [
        ...prev,
        { stamp: formatElapsed(atSeconds), text, speaker: speaker || "Tutor" },
      ];
    });

    transcriptRef.current = `${transcriptRef.current}${
      transcriptRef.current ? " " : ""
    }${text}`.trim();
  };

  const flushInterim = (atSeconds) => {
    const interim = liveInterimRef.current.trim();
    if (!interim) return;
    const detectedSpeaker = resolveSpeaker(interim);
    appendSegment(interim, atSeconds, detectedSpeaker);
    liveInterimRef.current = "";
    setLiveInterim("");
  };

  const extractByKeywords = (sourceText, keywords) => {
    const normalized = normalizeText(sourceText);
    const stopTokens = [
      "queixa",
      "motivo",
      "anamnese",
      "historico",
      "exame fisico",
      "diagnostico",
      "tratamento",
      "conduta",
      "medicacao",
      "prescricao",
      "retorno",
      "observacao",
    ];

    for (const keyword of keywords) {
      const idx = normalized.indexOf(normalizeText(keyword));
      if (idx < 0) continue;

      const originalSlice = sourceText
        .slice(idx + keyword.length)
        .replace(/^\s*[:\-.]?\s*/, "")
        .trim();

      const normalizedSlice = normalizeText(originalSlice);
      let cutIndex = originalSlice.length;
      for (const stopToken of stopTokens) {
        const stopIdx = normalizedSlice.indexOf(stopToken);
        if (stopIdx > 0 && stopIdx < cutIndex) {
          cutIndex = stopIdx;
        }
      }

      return originalSlice.slice(0, cutIndex).trim();
    }

    return "";
  };

  const splitIntoPhrases = (text = "") =>
    String(text || "")
      .split(/[\n.;!?]+/g)
      .map((item) => item.trim())
      .filter(Boolean);

  const removeDuplicateLines = (items = []) => {
    const seen = new Set();
    const output = [];
    for (const value of items) {
      const text = String(value || "").trim();
      if (!text) continue;
      const key = normalizeText(text);
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(text);
    }
    return output;
  };

  const keywordSets = {
    chiefComplaint: [
      "queixa",
      "motivo",
      "dor",
      "febre",
      "vomito",
      "diarreia",
      "tosse",
      "apatia",
      "sem apetite",
      "perda de apetite",
      "nao come",
      "nao bebe",
      "coceira",
      "claudicacao",
      "inchaco",
      "edema",
      "sangramento",
      "ferida",
    ],
    anamnesis: [
      "anamnese",
      "historico",
      "desde",
      "ha",
      "tutor relata",
      "evolucao",
      "passou a",
      "piorou",
      "melhorou",
      "apresentou",
      "ontem",
      "hoje",
      "semana",
    ],
    physicalExam: [
      "exame fisico",
      "ao exame",
      "palpacao",
      "ausculta",
      "inspecao",
      "mucosa",
      "hidratacao",
      "temperatura",
      "fc",
      "fr",
      "frequencia cardiaca",
      "frequencia respiratoria",
      "dor a palpacao",
      "edema",
      "crepitacao",
    ],
    diagnosis: [
      "diagnostico",
      "suspeita",
      "compativel",
      "quadro",
      "hipotese",
      "provavel",
      "inflamatorio",
      "infeccao",
      "trauma",
    ],
    treatment: [
      "conduta",
      "tratamento",
      "oriento",
      "orientacao",
      "reavaliar",
      "repouso",
      "curativo",
      "imobilizar",
      "retorno em",
      "solicitei",
      "solicito",
      "exame solicitado",
      "encaminhar",
    ],
    medications: [
      "medicacao",
      "prescricao",
      "prescrevo",
      "receita",
      "dipirona",
      "amoxicilina",
      "antibiotico",
      "anti-inflamatorio",
      "analgesico",
      "mg",
      "ml",
      "vo",
      "sid",
      "bid",
      "tid",
      "dose",
      "posologia",
    ],
  };

  const scorePhraseForField = (normalizedPhrase, fieldKey, speaker = "Tutor") => {
    let score = 0;
    for (const token of keywordSets[fieldKey]) {
      if (normalizedPhrase.includes(token)) score += 2;
    }

    if (fieldKey === "chiefComplaint" || fieldKey === "anamnesis") {
      if (speaker === "Tutor") score += 1;
    }
    if (
      fieldKey === "physicalExam" ||
      fieldKey === "diagnosis" ||
      fieldKey === "treatment" ||
      fieldKey === "medications"
    ) {
      if (speaker === "Medico") score += 1;
    }

    return score;
  };

  const classifyPhrase = (phrase, speaker = "Tutor") => {
    const normalized = normalizeText(phrase);
    if (!normalized) return null;

    const scored = [
      ["chiefComplaint", scorePhraseForField(normalized, "chiefComplaint", speaker)],
      ["anamnesis", scorePhraseForField(normalized, "anamnesis", speaker)],
      ["physicalExam", scorePhraseForField(normalized, "physicalExam", speaker)],
      ["diagnosis", scorePhraseForField(normalized, "diagnosis", speaker)],
      ["treatment", scorePhraseForField(normalized, "treatment", speaker)],
      ["medications", scorePhraseForField(normalized, "medications", speaker)],
    ].sort((a, b) => b[1] - a[1]);

    if (scored[0][1] > 0) return scored[0][0];

    if (speaker === "Tutor") {
      if (/\b(desde|ontem|hoje|semana|mes)\b/.test(normalized)) return "anamnesis";
      return "chiefComplaint";
    }

    return "treatment";
  };

  const parseTranscriptLocal = (text, sourceSegments = segments) => {
    const fallbackContent = (text || "").trim();
    const tutorContent = (sourceSegments || [])
      .filter((segment) => segment.speaker === "Tutor")
      .map((segment) => segment.text)
      .join(" ")
      .trim();
    const medicoContent = (sourceSegments || [])
      .filter((segment) => segment.speaker === "Medico")
      .map((segment) => segment.text)
      .join(" ")
      .trim();
    const fullContent = (medicoContent || tutorContent || fallbackContent).trim();

    if (!fullContent) return null;

    const tutorOrFull = tutorContent || fullContent;
    const medicoOrFull = medicoContent || fullContent;

    const grouped = {
      chiefComplaint: [],
      anamnesis: [],
      physicalExam: [],
      diagnosis: [],
      treatment: [],
      medications: [],
    };

    if (Array.isArray(sourceSegments) && sourceSegments.length > 0) {
      for (const segment of sourceSegments) {
        const phraseList = splitIntoPhrases(segment.text);
        for (const phrase of phraseList) {
          const bucket = classifyPhrase(phrase, segment.speaker || "Tutor");
          if (bucket) grouped[bucket].push(phrase);
        }
      }
    } else {
      const phraseList = splitIntoPhrases(fullContent);
      for (const phrase of phraseList) {
        const bucket = classifyPhrase(phrase, "Tutor");
        if (bucket) grouped[bucket].push(phrase);
      }
    }

    const chiefFromLabel = extractByKeywords(tutorOrFull, [
      "queixa",
      "motivo da consulta",
      "motivo",
    ]);
    const anamnesisFromLabel = extractByKeywords(tutorOrFull, ["anamnese", "historico"]);
    const physicalFromLabel = extractByKeywords(medicoOrFull, ["exame fisico", "ao exame"]);
    const diagnosisFromLabel = extractByKeywords(medicoOrFull, ["diagnostico", "suspeita"]);
    const treatmentFromLabel = extractByKeywords(medicoOrFull, ["tratamento", "conduta", "oriento"]);
    const medicationFromLabel = extractByKeywords(medicoOrFull, [
      "medicacao",
      "prescricao",
      "prescrever",
      "receita",
    ]);

    const chiefComplaint = removeDuplicateLines([
      chiefFromLabel,
      ...grouped.chiefComplaint,
    ]).join(". ");
    const anamnesis = removeDuplicateLines([
      anamnesisFromLabel,
      ...grouped.anamnesis,
    ]).join(". ");
    const physicalExam = removeDuplicateLines([
      physicalFromLabel,
      ...grouped.physicalExam,
    ]).join(". ");
    const diagnosis = removeDuplicateLines([
      diagnosisFromLabel,
      ...grouped.diagnosis,
    ]).join(". ");
    const treatment = removeDuplicateLines([
      treatmentFromLabel,
      ...grouped.treatment,
    ]).join(". ");
    const medications = removeDuplicateLines([
      medicationFromLabel,
      ...grouped.medications,
    ]).join(". ");

    return {
      chiefComplaint: chiefComplaint || tutorOrFull.slice(0, 180),
      anamnesis,
      physicalExam,
      diagnosis,
      treatment,
      medications,
    };
  };

  const confidenceLabel = (score) => {
    if (score >= 0.75) return "alta";
    if (score >= 0.5) return "media";
    return "baixa";
  };

  const scoreFieldLocal = (value, sourceText) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return { score: 0, label: "baixa" };

    let score = 0.2 + 0.35;
    if (String(sourceText || "").trim().length > 0) score += 0.2;
    if (trimmed.length >= 20) score += 0.15;
    score += 0.05;
    score = Math.min(1, Number(score.toFixed(2)));
    return { score, label: confidenceLabel(score) };
  };

  const buildLocalConfidence = (parsed, sourceSegments = segments) => {
    if (!parsed) return null;

    const tutorContent = (sourceSegments || [])
      .filter((segment) => segment.speaker === "Tutor")
      .map((segment) => segment.text)
      .join(" ");
    const medicoContent = (sourceSegments || [])
      .filter((segment) => segment.speaker === "Medico")
      .map((segment) => segment.text)
      .join(" ");

    return {
      chiefComplaint: scoreFieldLocal(parsed.chiefComplaint, tutorContent),
      anamnesis: scoreFieldLocal(parsed.anamnesis, tutorContent),
      physicalExam: scoreFieldLocal(parsed.physicalExam, medicoContent),
      diagnosis: scoreFieldLocal(parsed.diagnosis, medicoContent),
      treatment: scoreFieldLocal(parsed.treatment, medicoContent),
      medications: scoreFieldLocal(parsed.medications, medicoContent),
    };
  };

  const confidenceBadgeClass = (label) => {
    if (label === "alta") return "bg-emerald-100 text-emerald-700";
    if (label === "media") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
  };

  const ensureAudioStream = async () => {
    const existing = mediaStreamRef.current;
    if (existing && existing.active) return existing;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    return stream;
  };

  const startAudioCapture = async (resetChunks = false) => {
    if (!navigator?.mediaDevices?.getUserMedia) return;

    try {
      const stream = await ensureAudioStream();

      if (typeof MediaRecorder === "undefined") return;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined,
      });

      if (resetChunks) {
        audioChunksRef.current = [];
        recordedAudioBlobRef.current = null;
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          recordedAudioBlobRef.current = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      return true;
    } catch (error) {
      console.error("Falha ao iniciar captura de audio:", error);
      showFeedback(
        "error",
        "Nao foi possivel acessar o microfone. Verifique a permissao do navegador.",
      );
      return false;
    }
  };

  const stopAudioCapture = async ({ releaseStream = false } = {}) => {
    const recorder = mediaRecorderRef.current;

    await new Promise((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }

      recorder.addEventListener("stop", resolve, { once: true });
      recorder.stop();
    });

    mediaRecorderRef.current = null;
    if (releaseStream) {
      mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const runFieldAssist = async (candidateSegments) => {
    const baseTranscript = transcriptRef.current.trim();
    if (!baseTranscript && (!candidateSegments || candidateSegments.length === 0)) {
      return;
    }

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("segments", JSON.stringify(candidateSegments || []));
      formData.append("transcript", baseTranscript);

      const audioBlob = recordedAudioBlobRef.current;
      if (audioBlob && audioBlob.size > 0) {
        formData.append("audio", audioBlob, "field-audio.webm");
        formData.append("mimeType", audioBlob.type || "audio/webm");
      }

      const response = await api.post("/consultations/field-assist", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data || {};
      if (Array.isArray(result.segments) && result.segments.length > 0) {
        setSegments(result.segments);
      }
      if (result.transcript) {
        transcriptRef.current = result.transcript;
      }
      const parsed =
        result.parsed || parseTranscriptLocal(baseTranscript, candidateSegments);
      setParsedData(parsed);
      setParsedConfidence(
        result.parsedConfidence || buildLocalConfidence(parsed, candidateSegments),
      );
      setAnalysisSource(result.provider || "heuristic");
    } catch (error) {
      console.error("Falha no assistente de campo (backend):", error);
      const parsed = parseTranscriptLocal(baseTranscript, candidateSegments);
      setParsedData(parsed);
      setParsedConfidence(buildLocalConfidence(parsed, candidateSegments));
      setAnalysisSource("local");
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeCurrentConversation = async () => {
    await runFieldAssist(segments);
  };

  const toggleRecording = async () => {
    if (!supportsSpeech) {
      showFeedback(
        "error",
        "Reconhecimento de voz nao disponivel neste navegador. Use Chrome atualizado ou preencha manualmente.",
      );
      return;
    }

    if (isRecording && recognition) {
      keepRecordingRef.current = false;
      pauseRequestedRef.current = true;
      const atSeconds = Math.floor((Date.now() - (startedAt || Date.now())) / 1000);
      flushInterim(atSeconds);
      recognition.stop();
      setIsRecording(false);
      setIsPaused(true);
      setShowPausedActions(true);
      await stopAudioCapture({ releaseStream: false });
      await runFieldAssist(segmentsRef.current);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const nextRecognition = new SpeechRecognition();
    const startTime = Date.now();

    if (!isPaused) {
      setStartedAt(startTime);
      setElapsedSeconds(0);
      setSegments([]);
      setLiveInterim("");
      setShowPausedActions(false);
      setParsedData(null);
      setParsedConfidence(null);
      setCurrentSpeaker("Auto");
      setAnalysisSource("local");
      detectedSpeakerRef.current = "Tutor";
      transcriptRef.current = "";
      liveInterimRef.current = "";
      recordedAudioBlobRef.current = null;
    } else {
      const resumeStartedAt = Date.now() - elapsedSeconds * 1000;
      setStartedAt(resumeStartedAt);
      setIsPaused(false);
      setShowPausedActions(false);
    }

    const audioStarted = await startAudioCapture(!isPaused);
    if (!audioStarted) {
      keepRecordingRef.current = false;
      setIsRecording(false);
      setIsPaused(false);
      return;
    }

    nextRecognition.lang = "pt-BR";
    nextRecognition.continuous = true;
    nextRecognition.interimResults = true;

    keepRecordingRef.current = true;
    nextRecognition.onstart = () => setIsRecording(true);
    nextRecognition.onend = async () => {
      if (keepRecordingRef.current) {
        try {
          nextRecognition.start();
          return;
        } catch {
          // noop
        }
      }
      setIsRecording(false);
      setLiveInterim("");
      liveInterimRef.current = "";
      if (pauseRequestedRef.current) {
        pauseRequestedRef.current = false;
        return;
      }
      await stopAudioCapture({ releaseStream: false });
      await runFieldAssist(segmentsRef.current);
    };
    nextRecognition.onerror = () => {
      if (!keepRecordingRef.current) {
        setIsRecording(false);
      }
    };
    nextRecognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;

        const phrase = (result[0]?.transcript || "").trim();
        if (!phrase) continue;

        const atSeconds = Math.floor((Date.now() - (startedAt || startTime)) / 1000);
        if (result.isFinal) {
          const detectedSpeaker = resolveSpeaker(phrase);
          appendSegment(phrase, atSeconds, detectedSpeaker);
          liveInterimRef.current = "";
          setLiveInterim("");
        } else {
          const detectedSpeaker = detectSpeakerFromText(
            phrase,
            detectedSpeakerRef.current || "Tutor",
          );
          setCurrentSpeaker(detectedSpeaker);
          liveInterimRef.current = phrase;
          setLiveInterim(phrase);
        }
      }
    };

    setRecognition(nextRecognition);
    pauseRequestedRef.current = false;
    nextRecognition.start();
  };

  const discardConversation = () => {
    keepRecordingRef.current = false;
    pauseRequestedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    setShowPausedActions(false);
    setSegments([]);
    setLiveInterim("");
    setParsedData(null);
    setParsedConfidence(null);
    setElapsedSeconds(0);
    setStartedAt(null);
    transcriptRef.current = "";
    liveInterimRef.current = "";
    recordedAudioBlobRef.current = null;
    stopAudioCapture({ releaseStream: true });
    showFeedback("success", "Conversa descartada.");
  };

  const useConversation = async () => {
    await analyzeCurrentConversation();
    setShowPausedActions(false);
    showFeedback("success", "Conversa mantida para preenchimento.");
  };

  const cleanupRecordingResources = async () => {
    keepRecordingRef.current = false;
    pauseRequestedRef.current = false;
    recognition?.stop?.();
    await stopAudioCapture({ releaseStream: true });
    setIsRecording(false);
    setIsPaused(false);
  };

  const buildTimestampedTranscript = () =>
    segments
      .map((item) => `[${item.stamp}] ${item.speaker || "Tutor"}: ${item.text}`)
      .join("\n");

  const handleSave = async (generatePrescription = false) => {
    if (!patient?.id) {
      showFeedback("error", "Selecione um paciente antes de salvar.");
      return;
    }

    const parsed = parsedData || parseTranscriptLocal(transcriptRef.current || "", segments) || {};
    const timestampedTranscript = buildTimestampedTranscript();

    const payload = {
      patientId: patient.id,
      consultationType: "nova",
      weight,
      temperature,
      heartRate,
      respiratoryRate,
      chiefComplaint: parsed.chiefComplaint || "Nao informado",
      anamnesis: parsed.anamnesis || "Nao informado",
      physicalExam: parsed.physicalExam || "Nao informado",
      diagnosis: parsed.diagnosis || "Nao informado",
      treatment: parsed.treatment || "Nao informado",
      procedures: "Nao realizado",
      medications: parsed.medications ? parsed.medications : "Nao prescrita",
      notes: [
        "Registro gerado em Modo Campo.",
        `Origem da analise: ${analysisSource}.`,
        timestampedTranscript
          ? `Transcricao com minutagem:\n${timestampedTranscript}`
          : "Transcricao indisponivel.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      returnRecommendation: "",
      returnPlan: {
        recommended: false,
        date: null,
        open: false,
      },
    };

    try {
      setSaving(true);
      const saved = await onSave(payload);
      const savedId = saved?.id || saved?.data?.id || saved?.data?.data?.id;

      const hasMedication =
        parsed?.medications && !/n[aa]o prescrita/i.test(String(parsed.medications));

      if (generatePrescription && savedId && hasMedication) {
        const response = await api.post(
          `/consultations/${savedId}/prescription`,
          { download: true },
          { responseType: "blob" },
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = `receita-${savedId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      if (generatePrescription && !hasMedication) {
        showFeedback(
          "success",
          "Consulta salva. Nao foi detectada medicacao para gerar receita.",
        );
      } else {
        showFeedback(
          "success",
          generatePrescription
            ? "Consulta salva e receita gerada."
            : "Consulta de campo salva com sucesso.",
        );
      }
      await stopAudioCapture({ releaseStream: true });
      onBack?.();
    } catch (error) {
      console.error("Erro ao salvar consulta de campo:", error);
      showFeedback(
        "error",
        toUserFriendlyError(
          error,
          "Nao foi possivel salvar a consulta de campo.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="max-w-3xl mx-auto rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-bold text-gray-800">Modo Campo</h1>
        <p className="mt-2 text-sm text-gray-600">Nenhum paciente selecionado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24 sm:pb-4">
      <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-emerald-50 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Modo Campo</h1>
            <p className="text-sm text-gray-700 mt-1">
              Paciente: <strong>{patient.name}</strong> · Tutor: {patient.ownerName}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
              isRecording
                ? "bg-red-50 text-red-700"
                : isPaused
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isRecording ? "Gravando" : isPaused ? "Pausado" : "Pronto"}
          </span>
        </div>
      </div>

      <FeedbackBanner
        type={feedback?.type || "error"}
        message={feedback?.message}
        onClose={() => setFeedback(null)}
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Captura de conversa</p>
          <p className="text-sm font-bold text-cyan-700">{formatElapsed(elapsedSeconds)}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Falante detectado automaticamente
          </p>
          <p className="mt-1 text-sm font-bold text-cyan-700">{currentSpeaker}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Perfil de audio
          </label>
          <select
            value={audioProfile}
            onChange={(e) => setAudioProfile(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="normal">Normal</option>
            <option value="ruidoso">Campo ruidoso (filtra falas curtas)</option>
          </select>
        </div>

        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={analyzing}
            className={`h-28 w-28 rounded-full text-white text-sm font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-70 ${
              isRecording ? "bg-red-600 animate-pulse" : "bg-cyan-600"
            }`}
          >
            {isRecording ? "Pausar" : isPaused ? "Retomar" : "Microfone"}
          </button>
          <p className="text-xs text-gray-500">
            {isRecording
              ? "Audio sendo capturado em tempo real"
              : analyzing
                ? "Analisando conversa..."
                : isPaused
                  ? "Captura pausada. Voce pode retomar ou usar esta conversa."
                  : "Toque para iniciar captura de audio"}
          </p>
          {showPausedActions && !isRecording && (
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={useConversation}
                disabled={analyzing}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
              >
                Utilizar conversa
              </button>
              <button
                type="button"
                onClick={discardConversation}
                disabled={analyzing}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-70"
              >
                Descartar
              </button>
            </div>
          )}
          <p className="text-[11px] text-cyan-700 font-semibold">
            Analise: {analysisSource === "deepgram" ? "Diarizacao Deepgram" : "Heuristica local"}
          </p>
        </div>

        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-cyan-800">Timeline de conversa</p>
            <button
              type="button"
              onClick={() => setShowTimelineExpanded((prev) => !prev)}
              className="text-[11px] font-semibold text-cyan-800 underline"
            >
              {showTimelineExpanded ? "Recolher" : "Expandir"}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
            {segments.slice(-8).map((item, index, arr) => (
              <div
                key={`${item.stamp}-${index}`}
                className="min-w-[160px] max-w-[240px] shrink-0 rounded-md border border-cyan-100 bg-white px-3 py-2 transition-opacity duration-300 snap-start"
                style={{ opacity: (index + 1) / arr.length }}
              >
                <p className="text-[10px] font-bold text-cyan-700">[{item.stamp}]</p>
                <p className="text-[10px] font-semibold text-gray-500">{item.speaker || "Tutor"}</p>
                <p className="text-[11px] text-gray-700 line-clamp-2">{item.text}</p>
              </div>
            ))}
            {liveInterim && (
              <div className="min-w-[150px] max-w-[220px] shrink-0 rounded-md border border-cyan-200 bg-white px-2 py-1 animate-pulse">
                <p className="text-[10px] font-bold text-cyan-700">Agora</p>
                <p className="text-[10px] font-semibold text-gray-500">{currentSpeaker}</p>
                <p className="text-[11px] text-cyan-700 italic line-clamp-2">{liveInterim}</p>
              </div>
            )}
            {!segments.length && !liveInterim && (
              <p className="text-[11px] text-gray-400">Aguardando audio...</p>
            )}
          </div>

          {showTimelineExpanded && (
            <div className="max-h-44 overflow-y-auto rounded-md border border-cyan-100 bg-white px-2 py-2 space-y-1">
              {segments.map((item, index) => (
                <p key={`${item.stamp}-${index}`} className="text-[11px] text-gray-700">
                  <strong>[{item.stamp}] {item.speaker || "Tutor"}:</strong> {item.text}
                </p>
              ))}
              {liveInterim && (
                <p className="text-[11px] text-cyan-700 italic">
                  <strong>{currentSpeaker}:</strong> {liveInterim}
                </p>
              )}
            </div>
          )}
        </div>

        {parsedData && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <p className="font-bold text-emerald-900 text-sm">Analise automatica da conversa</p>
              <button
                type="button"
                onClick={analyzeCurrentConversation}
                disabled={analyzing}
                className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 disabled:opacity-70"
              >
                {analyzing ? "Reprocessando..." : "Reprocessar"}
              </button>
            </div>
            {[
              ["chiefComplaint", "Queixa", parsedData.chiefComplaint],
              ["anamnesis", "Anamnese", parsedData.anamnesis],
              ["physicalExam", "Exame fisico", parsedData.physicalExam],
              ["diagnosis", "Diagnostico", parsedData.diagnosis],
              ["treatment", "Conduta", parsedData.treatment],
              ["medications", "Medicacao", parsedData.medications],
            ].map(([key, label, value]) => {
              const conf = parsedConfidence?.[key];
              const pct = Math.round((conf?.score || 0) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-emerald-900">{label}</p>
                    {conf?.label && (
                      <span
                        className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${confidenceBadgeClass(
                          conf.label,
                        )}`}
                      >
                        {conf.label.toUpperCase()} ({pct}%)
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(pct, 5), 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-emerald-900">{value || "-"}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Parametros vitais (edicao manual)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Peso (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Temperatura (C)</label>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequencia cardiaca</label>
            <input
              type="number"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequencia respiratoria</label>
            <input
              type="number"
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            />
          </div>
        </div>

        <div className="h-3" />
      </div>

      <div className="fixed left-0 right-0 bottom-14 sm:bottom-4 z-30 px-4 sm:px-0">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg px-4 py-3 sm:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving || analyzing}
              className="min-h-[46px] rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Salvar Campo"}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving || analyzing}
              className="min-h-[46px] rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-70"
            >
              {saving ? "Processando..." : "Salvar + Receita"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await cleanupRecordingResources();
                onSwitchToManual?.();
              }}
              className="min-h-[46px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700"
            >
              Consulta manual
            </button>
            <button
            type="button"
            onClick={async () => {
              setSegments([]);
              setParsedData(null);
              setParsedConfidence(null);
              transcriptRef.current = "";
            }}
            className="min-h-[46px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700"
          >
            Limpar capturas
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldModeConsultation;





