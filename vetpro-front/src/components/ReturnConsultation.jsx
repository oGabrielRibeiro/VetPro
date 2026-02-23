import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import VoiceTextarea from "./VoiceTextarea";
import FeedbackBanner from "./FeedbackBanner";
import LoadingDot from "./LoadingDot";
import FloatingFormActions from "./FloatingFormActions";
import { toUserFriendlyError } from "../utils/errorMessages";
import { sanitizeConsultationNotesForDisplay } from "../utils/consultationNotes";

const ReturnConsultation = ({
  patient,
  previousConsultation,
  onSave,
  onBack,
  fieldMode = false,
}) => {
  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [anamnesis, setAnamnesis] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [procedurePerformed, setProcedurePerformed] = useState("nao");
  const [procedureDetails, setProcedureDetails] = useState("");
  const [medicationPrescribed, setMedicationPrescribed] = useState("nao");
  const [medicationDetails, setMedicationDetails] = useState("");
  const [examRequested, setExamRequested] = useState("nao");
  const [examDetails, setExamDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [returnRecommended, setReturnRecommended] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [openReturnWithoutDate, setOpenReturnWithoutDate] = useState(false);
  const [returnRecommendation, setReturnRecommendation] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMobileMoreActions, setShowMobileMoreActions] = useState(false);

  const [conversationTranscript, setConversationTranscript] = useState("");
  const [isConversationRecording, setIsConversationRecording] = useState(false);
  const [conversationRecognition, setConversationRecognition] = useState(null);
  const [transcriptSegments, setTranscriptSegments] = useState([]);
  const [conversationStartedAt, setConversationStartedAt] = useState(null);
  const [parsedTranscriptPreview, setParsedTranscriptPreview] = useState(null);
  const [liveInterimText, setLiveInterimText] = useState("");
  const [showTranscriptExpanded, setShowTranscriptExpanded] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [aiChatText, setAiChatText] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiRefineField, setAiRefineField] = useState("diagnosis");
  const [aiRefining, setAiRefining] = useState(false);
  const [aiConfidenceByField, setAiConfidenceByField] = useState({});

  const keepConversationRecordingRef = useRef(false);
  const transcriptRef = useRef("");
  const liveInterimRef = useRef("");
  const conversationRecognitionRef = useRef(null);

  const supportsSpeech = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    [],
  );

  const draftKey = useMemo(() => {
    if (!patient?.id || !previousConsultation?.id) return null;
    return `vetpro_draft_return_${patient.id}_${previousConsultation.id}`;
  }, [patient?.id, previousConsultation?.id]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  useEffect(() => {
    conversationRecognitionRef.current = conversationRecognition;
  }, [conversationRecognition]);

  const normalizeText = (value = "") =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const formatElapsed = (seconds) => {
    const total = Math.max(0, Number(seconds) || 0);
    const mins = String(Math.floor(total / 60)).padStart(2, "0");
    const secs = String(total % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const appendTranscriptChunk = (chunk, elapsedSeconds = null) => {
    const nextChunk = (chunk || "").trim();
    if (!nextChunk) return;
    const stamp = formatElapsed(elapsedSeconds);
    setConversationTranscript((prev) => {
      const merged = `${prev}${prev ? " " : ""}${nextChunk}`.trim();
      transcriptRef.current = merged;
      return merged;
    });
    setTranscriptSegments((prev) => [...prev, { stamp, text: nextChunk }]);
  };

  const flushLiveInterimToTranscript = (elapsedSeconds = null) => {
    const interim = liveInterimRef.current.trim();
    if (!interim) return;
    appendTranscriptChunk(interim, elapsedSeconds);
    liveInterimRef.current = "";
    setLiveInterimText("");
  };

  const buildTimestampedTranscript = () => {
    if (!transcriptSegments.length) return "";
    return transcriptSegments.map((item) => `[${item.stamp}] ${item.text}`).join("\n");
  };

  const extractByKeywords = (sourceText, keywords) => {
    const normalized = normalizeText(sourceText);
    const stopTokens = [
      "queixa",
      "motivo",
      "anamnese",
      "historico",
      "evolucao",
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
      const keywordNormalized = normalizeText(keyword);
      const idx = normalized.indexOf(keywordNormalized);
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

  useEffect(() => {
    setWeight(previousConsultation?.weight || "");
    setTemperature("");
    setHeartRate("");
    setRespiratoryRate("");
    setChiefComplaint("");
    setAnamnesis("");
    setPhysicalExam("");
    setDiagnosis("");
    setTreatment("");
    setProcedurePerformed("nao");
    setProcedureDetails("");
    setMedicationPrescribed("nao");
    setMedicationDetails("");
    setExamRequested("nao");
    setExamDetails("");
    setNotes("");
    setReturnRecommended(false);
    setReturnDate("");
    setOpenReturnWithoutDate(false);
    setReturnRecommendation("");
    setConversationTranscript("");
    setTranscriptSegments([]);
    setConversationStartedAt(null);
    setParsedTranscriptPreview(null);
    setLiveInterimText("");
    setShowTranscriptExpanded(false);
    setFeedback(null);
    setAiMessages([]);
    setAiRefineField("diagnosis");
    setAiRefining(false);
    setAiConfidenceByField({});
    setShowMobileMoreActions(false);
    liveInterimRef.current = "";
    transcriptRef.current = "";
    keepConversationRecordingRef.current = false;
    setIsConversationRecording(false);
    conversationRecognitionRef.current?.stop?.();
    setConversationRecognition(null);
  }, [
    patient?.id,
    previousConsultation?.id,
    previousConsultation?.weight,
  ]);

  useEffect(() => {
    return () => {
      keepConversationRecordingRef.current = false;
      conversationRecognition?.stop?.();
    };
  }, [conversationRecognition]);

  useEffect(() => {
    if (!draftKey) return;

    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;

      const draft = JSON.parse(raw);
      setWeight(draft.weight || previousConsultation?.weight || "");
      setTemperature(draft.temperature || "");
      setHeartRate(draft.heartRate || "");
      setRespiratoryRate(draft.respiratoryRate || "");
      setChiefComplaint(draft.chiefComplaint || "");
      setAnamnesis(draft.anamnesis || "");
      setPhysicalExam(draft.physicalExam || "");
      setDiagnosis(draft.diagnosis || "");
      setTreatment(draft.treatment || "");
      setProcedurePerformed(draft.procedurePerformed || "nao");
      setProcedureDetails(draft.procedureDetails || "");
      setMedicationPrescribed(draft.medicationPrescribed || "nao");
      setMedicationDetails(draft.medicationDetails || "");
      setExamRequested(draft.examRequested || "nao");
      setExamDetails(draft.examDetails || "");
      setNotes(sanitizeConsultationNotesForDisplay(draft.notes || ""));
      setReturnRecommended(Boolean(draft.returnRecommended));
      setReturnDate(draft.returnDate || "");
      setOpenReturnWithoutDate(Boolean(draft.openReturnWithoutDate));
      setReturnRecommendation(draft.returnRecommendation || "");
      setConversationTranscript(draft.conversationTranscript || "");
      setTranscriptSegments(draft.transcriptSegments || []);
      setConversationStartedAt(draft.conversationStartedAt || null);
      setParsedTranscriptPreview(draft.parsedTranscriptPreview || null);
      setLiveInterimText("");
      setShowTranscriptExpanded(Boolean(draft.showTranscriptExpanded));
      liveInterimRef.current = "";
      transcriptRef.current = draft.conversationTranscript || "";
    } catch (error) {
      console.error("Erro ao restaurar rascunho do retorno:", error);
    }
  }, [draftKey, previousConsultation?.weight]);

  useEffect(() => {
    if (!draftKey || saving) return;

    const draft = {
      weight,
      temperature,
      heartRate,
      respiratoryRate,
      chiefComplaint,
      anamnesis,
      physicalExam,
      diagnosis,
      treatment,
      procedurePerformed,
      procedureDetails,
      medicationPrescribed,
      medicationDetails,
      examRequested,
      examDetails,
      notes,
      returnRecommended,
      returnDate,
      openReturnWithoutDate,
      returnRecommendation,
      conversationTranscript,
      transcriptSegments,
      conversationStartedAt,
      parsedTranscriptPreview,
      liveInterimText,
      showTranscriptExpanded,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.error("Erro ao salvar rascunho do retorno:", error);
    }
  }, [
    draftKey,
    saving,
    weight,
    temperature,
    heartRate,
    respiratoryRate,
    chiefComplaint,
    anamnesis,
    physicalExam,
    diagnosis,
    treatment,
    procedurePerformed,
    procedureDetails,
    medicationPrescribed,
    medicationDetails,
    examRequested,
    examDetails,
    notes,
    returnRecommended,
    returnDate,
    openReturnWithoutDate,
    returnRecommendation,
    conversationTranscript,
    transcriptSegments,
    conversationStartedAt,
    parsedTranscriptPreview,
    liveInterimText,
    showTranscriptExpanded,
  ]);

  const toggleConversationRecording = () => {
    if (!supportsSpeech) {
      showFeedback(
        "error",
        "Reconhecimento de voz nao disponivel neste navegador. Use Chrome atualizado ou preencha manualmente.",
      );
      return;
    }

    if (isConversationRecording && conversationRecognition) {
      keepConversationRecordingRef.current = false;
      const elapsedSeconds = Math.floor(
        (Date.now() - (conversationStartedAt || Date.now())) / 1000,
      );
      flushLiveInterimToTranscript(elapsedSeconds);
      conversationRecognition.stop();
      setIsConversationRecording(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    keepConversationRecordingRef.current = true;
    const recordingStartAt = conversationStartedAt || Date.now();
    if (!conversationStartedAt) {
      setConversationStartedAt(recordingStartAt);
    }
    recognition.onstart = () => setIsConversationRecording(true);
    recognition.onend = () => {
      if (keepConversationRecordingRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // no-op
        }
      }
      setIsConversationRecording(false);
      setLiveInterimText("");
      liveInterimRef.current = "";
    };
    recognition.onerror = () => {
      if (!keepConversationRecordingRef.current) {
        setIsConversationRecording(false);
      }
    };
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const phrase = (result[0]?.transcript || "").trim();
        if (!phrase) continue;
        const elapsedSeconds = Math.floor((Date.now() - recordingStartAt) / 1000);
        if (result.isFinal) {
          appendTranscriptChunk(phrase, elapsedSeconds);
          liveInterimRef.current = "";
          setLiveInterimText("");
        } else {
          liveInterimRef.current = phrase;
          setLiveInterimText(phrase);
        }
      }
    };

    setConversationRecognition(recognition);
    recognition.start();
  };

  const clearTranscript = () => {
    setConversationTranscript("");
    setTranscriptSegments([]);
    setConversationStartedAt(null);
    setParsedTranscriptPreview(null);
    setLiveInterimText("");
    setShowTranscriptExpanded(false);
    liveInterimRef.current = "";
    transcriptRef.current = "";
    setAiMessages([]);
    setAiConfidenceByField({});
  };

  const analyzeTranscriptLocal = (text) => {
    const content = (text || "").trim();
    if (!content) return null;

    return {
      chiefComplaint:
        extractByKeywords(content, ["queixa", "motivo do retorno", "motivo"]) ||
        content.slice(0, 220),
      anamnesis: extractByKeywords(content, ["anamnese", "historico", "evolucao"]),
      physicalExam: extractByKeywords(content, ["exame fisico"]),
      diagnosis: extractByKeywords(content, ["diagnostico"]),
      treatment: extractByKeywords(content, ["tratamento", "conduta"]),
      medication: extractByKeywords(content, [
        "medicacao",
        "prescricao",
        "prescrever",
        "receita",
      ]),
    };
  };

  const analyzeTranscript = async () => {
    const text = transcriptRef.current.trim() || conversationTranscript.trim();
    if (!text) {
      showFeedback(
        "error",
        "Nenhuma transcricao encontrada. Grave ou digite um texto primeiro.",
      );
      return null;
    }

    let parsed = null;
    try {
      const response = await api.post("/consultations/heuristic-parse", {
        transcript: text,
        segments: transcriptSegments
      });
      const serverParsed = response?.data?.parsed || {};
      parsed = {
        chiefComplaint: String(serverParsed.chiefComplaint || "").trim(),
        anamnesis: String(serverParsed.anamnesis || "").trim(),
        physicalExam: String(serverParsed.physicalExam || "").trim(),
        diagnosis: String(serverParsed.diagnosis || "").trim(),
        treatment: String(serverParsed.treatment || "").trim(),
        medication: String(serverParsed.medications || "").trim(),
      };
    } catch {
      parsed = analyzeTranscriptLocal(text);
    }

    setParsedTranscriptPreview(parsed);
    return parsed;
  };

  const applyTranscriptToRecord = async () => {
    const text = transcriptRef.current.trim() || conversationTranscript.trim();
    if (!text) {
      showFeedback(
        "error",
        "Nenhuma transcricao encontrada. Grave ou digite um texto primeiro.",
      );
      return;
    }

    const parsed = parsedTranscriptPreview || (await analyzeTranscript());
    if (!parsed) return;

    if (!chiefComplaint) setChiefComplaint(parsed.chiefComplaint);
    if (!anamnesis && parsed.anamnesis) setAnamnesis(parsed.anamnesis);
    if (!physicalExam && parsed.physicalExam) setPhysicalExam(parsed.physicalExam);
    if (!diagnosis && parsed.diagnosis) setDiagnosis(parsed.diagnosis);
    if (!treatment && parsed.treatment) setTreatment(parsed.treatment);

    if (parsed.medication) {
      setMedicationPrescribed("sim");
      if (!medicationDetails) setMedicationDetails(parsed.medication);
    }

    const transcriptWithTime = buildTimestampedTranscript();
    setNotes((prev) =>
      [
        prev,
        transcriptWithTime
          ? `Transcricao com minutagem:\n${transcriptWithTime}`
          : `Transcricao da conversa:\n${text}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );

    showFeedback("success", "Transcricao aplicada aos campos do retorno.");
  };

  const applyAiDraft = (draft, overwrite = false) => {
    if (!draft || typeof draft !== "object") return;

    if (overwrite || !chiefComplaint) setChiefComplaint(String(draft.chiefComplaint || ""));
    if (overwrite || !anamnesis) setAnamnesis(String(draft.anamnesis || ""));
    if (overwrite || !physicalExam) setPhysicalExam(String(draft.physicalExam || ""));
    if (overwrite || !diagnosis) setDiagnosis(String(draft.diagnosis || ""));
    if (overwrite || !treatment) setTreatment(String(draft.treatment || ""));

    const meds = String(draft.medications || "").trim();
    const treatmentSignal = String(draft.treatment || "").trim();
    const medsSignal = `${meds} ${treatmentSignal}`.toLowerCase();
    const inferredMedication =
      /(\bmg\b|\bml\b|dose|via|dipirona|amoxicilina|prednis|antibiot|analges|anti-?inflam)/i.test(medsSignal);

    if (meds) {
      setMedicationPrescribed("sim");
      if (overwrite || !medicationDetails) setMedicationDetails(meds);
    } else if (inferredMedication) {
      setMedicationPrescribed("sim");
      if (overwrite || !medicationDetails) setMedicationDetails(treatmentSignal);
    }

    const procedures = String(draft.procedures || "").trim();
    if (procedures) {
      setProcedurePerformed("sim");
      if (overwrite || !procedureDetails) setProcedureDetails(procedures);
    }

    const exams = String(draft.examDetails || "").trim();
    if (exams) {
      setExamRequested("sim");
      if (overwrite || !examDetails) setExamDetails(exams);
    }

    const aiNotes = String(draft.notes || "").trim();
    if (aiNotes) {
      setNotes((prev) =>
        [prev, `Sugestao IA:\n${aiNotes}`].filter(Boolean).join("\n\n"),
      );
    }

    if (draft.returnRecommendation) {
      setReturnRecommended(true);
      setReturnRecommendation(String(draft.returnRecommendation));
    } else {
      const returnSignal = `${draft.treatment || ""} ${draft.notes || ""}`;
      if (/\b(retorno|reavaliar|reavaliacao)\b/i.test(returnSignal)) {
        setReturnRecommended(true);
      }
    }
  };

  const generateDraftFromChat = async (overwrite = false) => {
    const text = aiChatText.trim();
    if (!text) {
      showFeedback("error", "Escreva uma instrucao para gerar o rascunho com IA.");
      return;
    }

    try {
      setAiGenerating(true);
      const response = await api.post("/consultations/chat-assist", {
        patientId: patient?.id || null,
        mode: "retorno",
        text
      });

      const draft = response?.data?.draft || null;
      const provider = response?.data?.provider || "heuristic";
      setAiConfidenceByField(response?.data?.confidenceByField || {});
      if (!draft) {
        showFeedback("error", "Nao foi possivel gerar sugestao por IA.");
        return;
      }

      applyAiDraft(draft, overwrite);
      setAiMessages((prev) => [
        ...prev,
        { role: "user", content: text, createdAt: new Date().toISOString() },
        {
          role: "assistant",
          content: `Rascunho gerado (${provider}).`,
          createdAt: new Date().toISOString()
        }
      ]);
      showFeedback(
        "success",
        `Rascunho aplicado com IA (${provider === "openai" ? "OpenAI" : "Local"}).`,
      );
    } catch (error) {
      console.error("Erro ao gerar rascunho por chat:", error);
      showFeedback(
        "error",
        toUserFriendlyError(error, "Nao foi possivel gerar sugestao por chat."),
      );
    } finally {
      setAiGenerating(false);
    }
  };

  const getFieldValueByKey = (fieldKey) => {
    switch (fieldKey) {
      case "chiefComplaint":
        return chiefComplaint;
      case "anamnesis":
        return anamnesis;
      case "physicalExam":
        return physicalExam;
      case "diagnosis":
        return diagnosis;
      case "treatment":
        return treatment;
      case "medications":
        return medicationDetails;
      case "notes":
        return notes;
      default:
        return "";
    }
  };

  const setFieldValueByKey = (fieldKey, value) => {
    switch (fieldKey) {
      case "chiefComplaint":
        setChiefComplaint(value);
        break;
      case "anamnesis":
        setAnamnesis(value);
        break;
      case "physicalExam":
        setPhysicalExam(value);
        break;
      case "diagnosis":
        setDiagnosis(value);
        break;
      case "treatment":
        setTreatment(value);
        break;
      case "medications":
        setMedicationPrescribed("sim");
        setMedicationDetails(value);
        break;
      case "notes":
        setNotes(sanitizeConsultationNotesForDisplay(value));
        break;
      default:
        break;
    }
  };

  const refineSelectedField = async () => {
    const currentValue = String(getFieldValueByKey(aiRefineField) || "").trim();
    if (!currentValue) {
      showFeedback("error", "Preencha o campo antes de pedir refinamento.");
      return;
    }

    try {
      setAiRefining(true);
      const response = await api.post("/consultations/refine-field", {
        patientId: patient?.id || null,
        mode: "retorno",
        field: aiRefineField,
        text: currentValue
      });

      const refined = String(response?.data?.text || "").trim();
      const provider = response?.data?.provider || "heuristic";
      if (!refined) {
        showFeedback("error", "Nao foi possivel refinar o texto.");
        return;
      }

      setFieldValueByKey(aiRefineField, refined);
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Refinamento do campo ${aiRefineField} (${provider}).`,
          createdAt: new Date().toISOString()
        }
      ]);
      showFeedback("success", "Campo refinado com IA.");
    } catch (error) {
      console.error("Erro ao refinar campo:", error);
      showFeedback("error", toUserFriendlyError(error, "Nao foi possivel refinar o campo."));
    } finally {
      setAiRefining(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR");
  };

  const buildPayload = () => {
    const transcriptWithTime = buildTimestampedTranscript();
    const transcriptBlock = transcriptWithTime
      ? `Transcricao com minutagem:\n${transcriptWithTime}`
      : conversationTranscript.trim()
        ? `Transcricao da conversa:\n${conversationTranscript.trim()}`
        : "";

    return {
    patientId: patient.id,
    consultationType: "retorno",
    previousConsultationId: previousConsultation?.id,
    weight,
    temperature,
    heartRate,
    respiratoryRate,
    chiefComplaint,
    anamnesis,
    physicalExam,
    diagnosis,
    treatment,
    procedures:
      procedurePerformed === "sim"
        ? procedureDetails || "Procedimento realizado sem descricao"
        : "Nao realizado",
    medications:
      medicationPrescribed === "sim"
        ? medicationDetails || "Medicacao prescrita sem descricao"
        : "Nao prescrita",
    notes: [
      notes,
      `Exame solicitado: ${examRequested === "sim" ? "Sim" : "Nao"}`,
      examRequested === "sim" && examDetails ? `Detalhes do exame: ${examDetails}` : "",
      transcriptBlock,
    ]
      .filter(Boolean)
      .join("\n"),
    returnRecommendation,
    returnPlan: returnRecommended
      ? {
          recommended: true,
          date: openReturnWithoutDate ? null : returnDate || null,
          open: openReturnWithoutDate || !returnDate,
        }
      : {
          recommended: false,
          date: null,
          open: false,
        },
    };
  };

  const handleSave = async (downloadPrescription) => {
    if (!patient?.id || !previousConsultation?.id) {
      showFeedback(
        "error",
        "Nao foi possivel identificar o paciente e a consulta anterior.",
      );
      return;
    }

    try {
      setSaving(true);
      const saved = await onSave(buildPayload());
      const savedId = saved?.id || saved?.data?.id || saved?.data?.data?.id;
      if (!savedId) {
        showFeedback("error", "Retorno salvo, mas não foi possível confirmar o ID.");
        return;
      }

      if (aiMessages.length > 0) {
        try {
          await api.post(`/consultations/${savedId}/chat-history`, {
            messages: aiMessages
          });
        } catch (chatError) {
          console.error("Erro ao salvar historico de chat:", chatError);
        }
      }

      const shouldGeneratePrescription =
        medicationPrescribed === "sim" && medicationDetails.trim().length > 0;

      if (!shouldGeneratePrescription) {
        if (draftKey) localStorage.removeItem(draftKey);
        showFeedback(
          "success",
          "Retorno salvo com sucesso. Nao ha nova medicacao para receita.",
        );
        onBack?.();
        return;
      }

      if (downloadPrescription) {
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
      } else {
        await api.post(`/consultations/${savedId}/prescription`, {
          download: false,
        });
      }

      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      showFeedback(
        "success",
        downloadPrescription
          ? "Retorno salvo. Receita anexada e download iniciado."
          : "Retorno salvo com receita anexada.",
      );
      onBack?.();
    } catch (error) {
      console.error("Erro ao salvar retorno:", error);
      showFeedback(
        "error",
        toUserFriendlyError(
          error,
          "Nao foi possivel concluir o salvamento do retorno.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!patient || !previousConsultation) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-800">Consulta de Retorno</h1>
        <p className="text-sm text-gray-600 mt-2">
          Dados da consulta anterior nao encontrados.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-36 sm:pb-28">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Voltar
      </button>

      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Consulta de Retorno Completa</h1>
        <p className="text-sm text-gray-700 mt-1">
          Paciente: <strong>{patient.name}</strong> - Tutor: {patient.ownerName}
        </p>
      </div>

      <FeedbackBanner
        type={feedback?.type || "error"}
        message={feedback?.message}
        onClose={() => setFeedback(null)}
      />

      {!fieldMode && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
          <h2 className="text-sm font-bold text-violet-900">Assistente IA por chat</h2>
          <p className="text-xs text-violet-800">
            Descreva o retorno em linguagem livre para gerar um rascunho estruturado.
          </p>
          <textarea
            value={aiChatText}
            onChange={(e) => setAiChatText(e.target.value)}
            rows={3}
            placeholder="Ex: retorno com melhora parcial, no exame atual..."
            className="w-full rounded-lg border border-violet-300 px-3 py-3 text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => generateDraftFromChat(false)}
              disabled={aiGenerating}
              className="min-h-[42px] rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {aiGenerating && <LoadingDot />}
              {aiGenerating ? "Gerando..." : "Gerar IA (preencher vazios)"}
            </button>
            <button
              type="button"
              onClick={() => generateDraftFromChat(true)}
              disabled={aiGenerating}
              className="min-h-[42px] rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-bold text-violet-800 disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {aiGenerating && <LoadingDot className="text-violet-700" />}
              {aiGenerating ? "Aplicando..." : "Gerar IA (substituir campos)"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={aiRefineField}
              onChange={(e) => setAiRefineField(e.target.value)}
              className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm"
            >
              <option value="chiefComplaint">Queixa principal</option>
              <option value="anamnesis">Anamnese</option>
              <option value="physicalExam">Exame fisico</option>
              <option value="diagnosis">Diagnostico</option>
              <option value="treatment">Tratamento</option>
              <option value="medications">Medicacao</option>
              <option value="notes">Observacoes</option>
            </select>
            <button
              type="button"
              onClick={refineSelectedField}
              disabled={aiRefining}
              className="min-h-[42px] rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-bold text-violet-800 disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {aiRefining && <LoadingDot className="text-violet-700" />}
              {aiRefining ? "Refinando..." : "Refinar campo com IA"}
            </button>
          </div>
          {aiMessages.length > 0 && (
            <div className="max-h-36 overflow-y-auto rounded-lg border border-violet-200 bg-white p-2 text-xs space-y-1">
              {aiMessages.slice(-10).map((msg, idx) => (
                <p key={`${msg.createdAt || idx}-${idx}`} className="text-gray-700">
                  <strong>{msg.role === "assistant" ? "IA" : "Medico"}:</strong> {msg.content}
                </p>
              ))}
            </div>
          )}
          {Object.keys(aiConfidenceByField || {}).length > 0 && (
            <div className="rounded-lg border border-violet-200 bg-white p-2">
              <p className="text-[11px] font-semibold text-violet-900 mb-1">Confianca por campo</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(aiConfidenceByField).map(([field, value]) => (
                  <span
                    key={field}
                    className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800"
                  >
                    {field}: {Math.round(Number(value || 0) * 100)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {fieldMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <h2 className="text-sm font-bold text-amber-900">
            Modo Campo: Assistente de conversa
          </h2>
          <p className="text-xs text-amber-800">
            Capture a conversa tutor/medico e aplique preenchimento assistido.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={toggleConversationRecording}
              className={`min-h-[44px] rounded-lg px-3 text-sm font-bold text-white ${
                isConversationRecording ? "bg-red-600" : "bg-indigo-600"
              }`}
            >
              {isConversationRecording ? "Parar gravacao" : "Iniciar transcricao"}
            </button>
            <button
              type="button"
              onClick={analyzeTranscript}
              className="min-h-[44px] rounded-lg border border-cyan-300 bg-white px-3 text-sm font-bold text-cyan-700"
            >
              Analisar conversa
            </button>
            <button
              type="button"
              onClick={applyTranscriptToRecord}
              className="min-h-[44px] rounded-lg border border-indigo-300 bg-white px-3 text-sm font-bold text-indigo-700"
            >
              Aplicar no prontuario
            </button>
            <button
              type="button"
              onClick={clearTranscript}
              className="min-h-[44px] rounded-lg border border-amber-300 bg-white px-3 text-sm font-bold text-amber-800"
            >
              Limpar transcricao
            </button>
          </div>
          <textarea
            value={conversationTranscript}
            onChange={(e) => {
              setConversationTranscript(e.target.value);
              transcriptRef.current = e.target.value;
            }}
            rows={2}
            placeholder="Transcricao em tempo real da conversa..."
            className="w-full rounded-lg border border-amber-300 px-3 py-3 text-sm"
          />
          <div className="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-amber-700">
                Captura em tempo real
              </p>
              <button
                type="button"
                onClick={() => setShowTranscriptExpanded((prev) => !prev)}
                className="text-[11px] font-semibold text-amber-800 underline"
              >
                {showTranscriptExpanded ? "Recolher transcricao" : "Expandir transcricao"}
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {transcriptSegments.slice(-8).map((item, index, arr) => (
                <div
                  key={`${item.stamp}-${index}`}
                  className="min-w-[160px] max-w-[220px] shrink-0 rounded-md border border-amber-100 bg-amber-50 px-2 py-1 transition-opacity duration-300"
                  style={{ opacity: (index + 1) / arr.length }}
                >
                  <p className="text-[10px] font-bold text-amber-700">[{item.stamp}]</p>
                  <p className="text-[11px] text-gray-700 line-clamp-2">{item.text}</p>
                </div>
              ))}
              {liveInterimText && (
                <div className="min-w-[160px] max-w-[220px] shrink-0 rounded-md border border-amber-200 bg-white px-2 py-1 animate-pulse">
                  <p className="text-[10px] font-bold text-amber-700">Agora</p>
                  <p className="text-[11px] text-amber-700 italic line-clamp-2">
                    {liveInterimText}
                  </p>
                </div>
              )}
              {!transcriptSegments.length && !liveInterimText && (
                <p className="text-[11px] text-gray-400">Aguardando fala...</p>
              )}
            </div>

            {showTranscriptExpanded && (
              <div className="max-h-44 overflow-y-auto rounded-md border border-amber-100 bg-white px-2 py-2 space-y-1">
                {transcriptSegments.map((item, index) => (
                  <p key={`${item.stamp}-${index}`} className="text-[11px] text-gray-700">
                    <strong>[{item.stamp}]</strong> {item.text}
                  </p>
                ))}
                {liveInterimText && (
                  <p className="text-[11px] text-amber-700 italic">{liveInterimText}</p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-amber-800">
            Rascunho automatico ativo neste aparelho para evitar perda de dados.
          </p>
          {parsedTranscriptPreview && (
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900 space-y-1">
              <p className="font-bold">Sugestao de preenchimento (revisar antes de aplicar)</p>
              <p><strong>Queixa:</strong> {parsedTranscriptPreview.chiefComplaint || "-"}</p>
              <p><strong>Anamnese:</strong> {parsedTranscriptPreview.anamnesis || "-"}</p>
              <p><strong>Exame fisico:</strong> {parsedTranscriptPreview.physicalExam || "-"}</p>
              <p><strong>Diagnostico:</strong> {parsedTranscriptPreview.diagnosis || "-"}</p>
              <p><strong>Conduta:</strong> {parsedTranscriptPreview.treatment || "-"}</p>
              <p><strong>Medicacao:</strong> {parsedTranscriptPreview.medication || "-"}</p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Ultima consulta
        </h2>
        <div className="mt-3 space-y-2 text-sm text-gray-700">
          <p><strong>Data:</strong> {formatDate(previousConsultation.createdAt)}</p>
          <p><strong>Queixa principal:</strong> {previousConsultation.chiefComplaint || "Nao informado"}</p>
          <p><strong>Diagnostico anterior:</strong> {previousConsultation.diagnosis || "Nao informado"}</p>
          <p><strong>Tratamento anterior:</strong> {previousConsultation.treatment || "Nao informado"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Parametros vitais</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Peso (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Temperatura (C)</label>
            <input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequencia cardiaca</label>
            <input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequencia respiratoria</label>
            <input type="number" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm" />
          </div>
        </div>

        <VoiceTextarea id="return-chiefComplaint" label="Nova queixa / motivo do retorno" value={chiefComplaint} onChange={setChiefComplaint} rows={3} placeholder="Descreva o motivo do retorno" />
        <VoiceTextarea id="return-anamnesis" label="Evolucao (anamnese)" value={anamnesis} onChange={setAnamnesis} rows={4} placeholder="Evolucao desde a ultima consulta" />
        <VoiceTextarea id="return-physicalExam" label="Exame fisico atual" value={physicalExam} onChange={setPhysicalExam} rows={4} placeholder="Achados do exame fisico" />
        <VoiceTextarea id="return-diagnosis" label="Diagnostico atualizado" value={diagnosis} onChange={setDiagnosis} rows={3} placeholder="Diagnostico da consulta de retorno" />
        <VoiceTextarea id="return-treatment" label="Conduta / tratamento atualizado" value={treatment} onChange={setTreatment} rows={4} placeholder="Plano terapeutico atual" />

        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-700">Procedimento realizado neste retorno?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"><input type="radio" name="returnProcedurePerformed" checked={procedurePerformed === "sim"} onChange={() => setProcedurePerformed("sim")} /> Sim</label>
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"><input type="radio" name="returnProcedurePerformed" checked={procedurePerformed === "nao"} onChange={() => setProcedurePerformed("nao")} /> Nao</label>
          </div>
          {procedurePerformed === "sim" && (
            <div className="mt-3">
              <VoiceTextarea id="return-procedureDetails" label="Descreva o procedimento" value={procedureDetails} onChange={setProcedureDetails} rows={3} placeholder="Detalhes do procedimento" />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-700">Nova medicacao prescrita?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"><input type="radio" name="returnMedicationPrescribed" checked={medicationPrescribed === "sim"} onChange={() => setMedicationPrescribed("sim")} /> Sim</label>
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"><input type="radio" name="returnMedicationPrescribed" checked={medicationPrescribed === "nao"} onChange={() => setMedicationPrescribed("nao")} /> Nao</label>
          </div>
          {medicationPrescribed === "sim" && (
            <div className="mt-3">
              <VoiceTextarea id="return-medicationDetails" label="Descreva a medicacao" value={medicationDetails} onChange={setMedicationDetails} rows={3} placeholder="Farmaco, dose e orientacoes" />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-700">Solicitou exame complementar?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"><input type="radio" name="returnExamRequested" checked={examRequested === "sim"} onChange={() => setExamRequested("sim")} /> Sim</label>
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"><input type="radio" name="returnExamRequested" checked={examRequested === "nao"} onChange={() => setExamRequested("nao")} /> Nao</label>
          </div>
          {examRequested === "sim" && (
            <div className="mt-3">
              <VoiceTextarea id="return-examDetails" label="Descreva o exame solicitado" value={examDetails} onChange={setExamDetails} rows={3} placeholder="Tipo e justificativa" />
            </div>
          )}
        </div>

        <VoiceTextarea id="return-notes" label="Observacoes" value={notes} onChange={setNotes} rows={3} placeholder="Observacoes da consulta de retorno" />

        <div className="rounded-xl border border-gray-200 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={returnRecommended}
              onChange={(e) => {
                const checked = e.target.checked;
                setReturnRecommended(checked);
                if (!checked) {
                  setReturnRecommendation("");
                  setReturnDate("");
                  setOpenReturnWithoutDate(false);
                }
              }}
            />
            Retorno recomendado?
          </label>

          {returnRecommended && (
            <>
              <VoiceTextarea id="return-recommendation" label="Recomendacao de retorno" value={returnRecommendation} onChange={setReturnRecommendation} rows={2} placeholder="Prazo e orientacoes de retorno" />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={openReturnWithoutDate}
                  onChange={(e) => setOpenReturnWithoutDate(e.target.checked)}
                />
                Marcar como possivel retorno em aberto (sem data)
              </label>
              {!openReturnWithoutDate && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Data sugerida para retorno
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <FloatingFormActions maxWidthClass="max-w-3xl">
          <div className="sm:hidden space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={saving} onClick={() => handleSave(false)} className="btn btn-success btn-md btn-block">
                {saving && <LoadingDot />}
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowMobileMoreActions((prev) => !prev)}
                className="btn btn-neutral btn-md btn-block"
              >
                {showMobileMoreActions ? "Fechar" : "Mais"}
              </button>
            </div>
            {showMobileMoreActions && (
              <button type="button" disabled={saving} onClick={() => handleSave(true)} className="btn btn-primary btn-sm btn-block">
                {saving && <LoadingDot />}
                {saving ? "Processando..." : "Salvar + Receita"}
              </button>
            )}
          </div>
          <div className="hidden sm:grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => handleSave(false)} className="btn btn-success btn-lg btn-block">
              {saving && <LoadingDot />}
              {saving ? "Salvando..." : "Salvar Retorno"}
            </button>
            <button type="button" disabled={saving} onClick={() => handleSave(true)} className="btn btn-primary btn-lg btn-block">
              {saving && <LoadingDot />}
              {saving ? "Processando..." : "Salvar + Gerar Receita"}
            </button>
          </div>
        </FloatingFormActions>
      </div>
    </div>
  );
};

export default ReturnConsultation;





