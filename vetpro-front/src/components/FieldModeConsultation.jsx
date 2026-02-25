import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import FeedbackBanner from "./FeedbackBanner";
import LoadingDot from "./LoadingDot";
import FloatingFormActions from "./FloatingFormActions";
import { toUserFriendlyError } from "../utils/errorMessages";
import {
  PORTE_NOTES_MARK_END,
  PORTE_NOTES_MARK_START,
} from "../utils/consultationNotes";
import {
  CONSULTATION_TYPE_OPTIONS,
  resolveConsultationContext,
} from "../utils/consultationContext";

const SPECIFIC_FIELD_LABELS = {
  vaccinationStatus: "Vacinacao",
  vaccinationProtocol: "Protocolo vacinal",
  lastVaccines: "Ultimas vacinas aplicadas",
  dewormingStatus: "Vermifugacao",
  ectoparasiteControl: "Controle de ectoparasitas",
  diet: "Dieta",
  rationBrand: "Racao / marca",
  feedingFrequency: "Frequencia alimentar",
  waterIntakeSmall: "Ingestao de agua",
  housing: "Ambiente",
  lifestyle: "Estilo de vida",
  contactWithAnimals: "Contato com outros animais",
  reproductiveStatusSmall: "Estado reprodutivo",
  preventiveCare: "Preventivos em uso",
  behavior: "Comportamento",
  allergyHistory: "Historico alergico",
  chronicDiseases: "Doencas cronicas",
  currentSupplements: "Suplementos em uso",
  farmName: "Propriedade",
  productionSystem: "Sistema de producao",
  animalFunction: "Finalidade zootecnica",
  batch: "Lote / grupo",
  animalId: "Identificacao do animal",
  bodyConditionScore: "Escore corporal",
  reproductiveStatus: "Estado reprodutivo",
  daysInMilk: "Dias em lactacao",
  parity: "Numero de partos",
  herdVaccination: "Vacinacao do rebanho",
  herdDeworming: "Vermifugacao do rebanho",
  forage: "Volumoso",
  concentrate: "Concentrado",
  waterIntake: "Consumo de agua",
  mineralSupplementation: "Suplementacao mineral",
  hoofStatus: "Casco e locomocao",
  rumenMotility: "Motilidade ruminal",
  fecesAndUrine: "Fezes e urina",
  milkProduction: "Producao de leite",
  historicalDiseases: "Historico sanitario",
  propertyAndManagement: "Propriedade e manejo",
  contactAnimals: "Contactantes",
  animalIdentificationDetails: "Animal atendido - identificacao detalhada",
  neonateAndReproduction: "Neonato / reproducao",
  previousTreatmentHistory: "Tratamento anterior",
  physicalExamDetailed: "Exame fisico detalhado",
  requestedExamPanel: "Exames complementares solicitados",
};

const PERSISTENT_SPECIFIC_KEYS = {
  pequeno: new Set([
    "allergyHistory",
    "chronicDiseases",
    "contactWithAnimals",
    "reproductiveStatusSmall",
  ]),
  grande: new Set([
    "farmName",
    "productionSystem",
    "animalFunction",
    "propertyAndManagement",
    "contactAnimals",
  ]),
};

const FieldModeConsultation = ({
  patient,
  initialData = null,
  onSave,
  onBack,
  onSwitchToManual,
  onContinueToManual,
}) => {
  const [weight, setWeight] = useState(
    initialData?.weight ?? patient?.weight ?? "",
  );
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [consultationType, setConsultationType] = useState(
    initialData?.consultationType || "nova",
  );

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
  const [structuredDraft, setStructuredDraft] = useState(null);
  const [parsedConfidence, setParsedConfidence] = useState(null);
  const [parsedConfidenceComposite, setParsedConfidenceComposite] = useState(null);
  const [roleReliability, setRoleReliability] = useState(null);
  const [ruleAlerts, setRuleAlerts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [audioProfile, setAudioProfile] = useState("normal");
  const [currentSpeaker, setCurrentSpeaker] = useState("Auto");
  const [analysisSource, setAnalysisSource] = useState("local");
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showPorteChoiceModal, setShowPorteChoiceModal] = useState(false);
  const [manualPorteOverride, setManualPorteOverride] = useState(null);
  const [porteDetectionState, setPorteDetectionState] = useState({
    porte: "pequeno",
    confident: false,
    reason: "indefinido",
  });

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
  const audioFileInputRef = useRef(null);
  const [uploadedAudioName, setUploadedAudioName] = useState("");

  const supportsSpeech = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    [],
  );

  const isTypeLockedByContext = initialData?.consultationType === "retorno";
  const consultationContext = useMemo(
    () => resolveConsultationContext(consultationType),
    [consultationType],
  );
  const consultationTypeLabel = consultationContext.label;

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const clearCapturedData = () => {
    setSegments([]);
    setParsedData(null);
    setStructuredDraft(null);
    setParsedConfidence(null);
    setParsedConfidenceComposite(null);
    setRuleAlerts([]);
    setRoleReliability(null);
    setManualPorteOverride(null);
    setPorteDetectionState({ porte: "pequeno", confident: false, reason: "indefinido" });
    setShowPorteChoiceModal(false);
    transcriptRef.current = "";
    recordedAudioBlobRef.current = null;
    setUploadedAudioName("");
  };

  const buildChatInputFromSegments = (currentSegments, fallbackTranscript) => {
    if (Array.isArray(currentSegments) && currentSegments.length > 0) {
      return currentSegments
        .map((item) => {
          const speaker = item?.speaker || "Tutor";
          const text = String(item?.text || "").trim();
          if (!text) return "";
          return `${speaker}: ${text}`;
        })
        .filter(Boolean)
        .join("\n");
    }
    return String(fallbackTranscript || "").trim();
  };

  const mapConfidenceByFieldFromDraft = (raw = {}) => {
    if (!raw || typeof raw !== "object") return null;
    const mapped = {};
    Object.entries(raw).forEach(([key, value]) => {
      const score = Math.max(0, Math.min(1, Number(value || 0)));
      const label = score >= 0.75 ? "alta" : score >= 0.5 ? "media" : "baixa";
      mapped[key] = { score, label };
    });
    return Object.keys(mapped).length ? mapped : null;
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

  useEffect(() => {
    const fallbackWeight = patient?.weight == null ? "" : String(patient.weight);
    setWeight((current) => (String(current || "").trim() ? current : fallbackWeight));
  }, [patient?.id, patient?.weight]);

  useEffect(() => {
    if (!initialData) return;
    if (initialData.consultationType) {
      setConsultationType(initialData.consultationType);
    }
    if (initialData.weight !== undefined && initialData.weight !== null) {
      setWeight(String(initialData.weight));
    }
  }, [initialData]);

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

  const inferPorteFromContext = (sourceText = "") => {
    const patientSource = normalizeText(
      `${patient?.species || patient?.specie || ""} ${patient?.subcategory || ""} ${patient?.breed || ""}`,
    );
    const textSource = normalizeText(sourceText);
    const source = `${patientSource} ${textSource}`.trim();

    const largeSignals = [
      "equino",
      "cavalo",
      "egua",
      "quarto de milha",
      "mangalarga",
      "bovino",
      "vaca",
      "bezerro",
      "ovino",
      "caprino",
      "suino",
      "fazenda",
      "haras",
      "rebanho",
      "lote",
    ];
    const smallSignals = [
      "canino",
      "cachorro",
      "cao",
      "felino",
      "gato",
      "pet",
      "apartamento",
      "domiciliar",
    ];

    const largeHits = largeSignals.filter((token) => source.includes(token)).length;
    const smallHits = smallSignals.filter((token) => source.includes(token)).length;

    if (largeHits >= 1 && largeHits >= smallHits) {
      return {
        porte: "grande",
        confident: largeHits >= smallHits + 1,
        reason: "tokens-grande",
      };
    }
    if (smallHits >= 1 && smallHits > largeHits) {
      return {
        porte: "pequeno",
        confident: smallHits >= largeHits + 1,
        reason: "tokens-pequeno",
      };
    }
    return {
      porte: "pequeno",
      confident: false,
      reason: "sem-evidencia",
    };
  };

  const detectSpeakerFromText = (phrase, fallbackSpeaker = "Tutor") => {
    const normalized = normalizeText(phrase || "");
    if (!normalized) return fallbackSpeaker;

    const symptomContext =
      /\b(nao ta bem|não tá bem|sem apetite|vomit|diarre|febre|dor|apat|prostr|mucosa|coce)\b/.test(normalized);
    const vetQuestionContext =
      /\b(desde quando|ha quanto|há quanto|me explica|me conte|me conta|pode me dizer)\b/.test(normalized);
    const vetActionContext =
      /\b(vamos|no exame|ao exame|suspeita|diagnost|conduta|tratamento|prescrev|oriento|solicitei|pedi|coletar)\b/.test(normalized);

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

    let tutorScore = 0;
    let medicoScore = 0;
    tutorSignals.forEach((signal) => {
      if (normalized.includes(signal)) tutorScore += 2;
    });
    medicoSignals.forEach((signal) => {
      if (normalized.includes(signal)) medicoScore += 2;
    });

    if (/^(dr|dra|doutor|doutora)\b/.test(normalized)) {
      if (symptomContext) tutorScore += 3;
      else medicoScore += 1;
    }
    if (/\b(meu|minha|aqui em casa|em casa)\b/.test(normalized)) tutorScore += 2;
    if (vetQuestionContext) medicoScore += 3;
    if (vetActionContext) medicoScore += 2;

    if (tutorScore > medicoScore) return "Tutor";
    if (medicoScore > tutorScore) return "Medico";

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

  const extractSpecificFieldsFallback = (sourceText = "", porte = "pequeno", parsed = {}) => {
    const cleaned = String(sourceText || "")
      .replace(/\[[0-9:]+\]/g, " ")
      .replace(/\b(Tutor|Medico)\s*:\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return {};

    const norm = normalizeText(cleaned);
    const sentences = cleaned
      .split(/[.!?;]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
    const pick = (regex) => {
      const match = cleaned.match(regex);
      return match?.[1] ? String(match[1]).trim() : "";
    };
    const pickSentence = (tokens = []) => {
      const normTokens = tokens.map((token) => normalizeText(token));
      for (const sentence of sentences) {
        const sentenceNorm = normalizeText(sentence);
        if (normTokens.some((token) => token && sentenceNorm.includes(token))) {
          return sentence;
        }
      }
      return "";
    };
    const limit = (value, size = 180) => String(value || "").replace(/\s+/g, " ").trim().slice(0, size);

    if (porte === "grande") {
      const out = {};
      out.farmName =
        pick(/\b((?:Haras|Fazenda|Sitio|Sítio)\s+[^,.;]+)/i) ||
        "";
      out.animalId =
        pick(/\b(?:animal|paciente|nome)\s*[:-]?\s*([A-Za-zÀ-ÿ][\wÀ-ÿ-]{1,40})/i) ||
        patient?.name ||
        "";

      if (/\bprova|laco|la[cç]o|esporte\b/i.test(norm)) out.animalFunction = "Esporte";
      else if (/\bleite|lacta[cç][aã]o\b/i.test(norm)) out.animalFunction = "Leite";
      else if (/\bcorte|engorda\b/i.test(norm)) out.animalFunction = "Corte";

      out.herdVaccination = pickSentence(["vacina", "raiva", "tetano", "gripe", "encefalo"]);
      out.herdDeworming = pickSentence(["vermifug", "ivermect"]);
      out.waterIntake = pickSentence(["ingestao de agua", "consumo de agua", "agua diminu", "água diminu"]);
      out.hoofStatus = pickSentence(["casco", "locomoc", "claudic", "flanco", "arranho", "arranh"]);
      out.rumenMotility = pickSentence(["motilidade", "ruminal", "hipomotilidade", "sons diminu"]);
      out.fecesAndUrine = pickSentence(["fezes", "urina"]);
      out.historicalDiseases = pickSentence(["historico do lote", "aie", "mormo", "sem ocorrencia", "sem ocorrência"]);
      out.physicalExamDetailed = limit(
        String(parsed?.physicalExam || "").trim() || pickSentence(["mucosa", "tpc", "febre", "frequencia cardiaca", "fc"]),
      );
      out.requestedExamPanel = pickSentence(["hemograma", "bioquim", "aie", "mormo", "coleta", "exame"]);
      out.previousTreatmentHistory = limit(
        [
          String(parsed?.treatment || "").trim(),
          String(parsed?.medications || "").trim(),
        ]
          .filter(Boolean)
          .join(". "),
      );
      out.animalIdentificationDetails = limit(
        [
          patient?.name ? `Nome: ${patient.name}` : "",
          patient?.subcategory || patient?.species || "",
          patient?.breed || "",
        ]
          .filter(Boolean)
          .join(", "),
      );

      return Object.entries(out).reduce((acc, [key, value]) => {
        const cleanedValue = limit(value);
        if (cleanedValue) acc[key] = cleanedValue;
        return acc;
      }, {});
    }

    const smallOut = {
      vaccinationProtocol: pickSentence(["v8", "v10", "antirrab", "raiva", "vacina"]),
      dewormingStatus: pickSentence(["vermifug", "ivermect"]),
      ectoparasiteControl: pickSentence(["pulga", "carrapato", "ectoparasita", "pipeta"]),
      diet: pickSentence(["racao", "ração", "dieta", "petisco"]),
      waterIntakeSmall: pickSentence(["ingestao de agua", "consumo de agua", "agua"]),
      behavior: pickSentence(["apatia", "pregui", "comportamento", "letarg"]),
      allergyHistory: pickSentence(["alerg", "prurido", "coceira"]),
    };
    if (/\batrasad/i.test(norm)) smallOut.vaccinationStatus = "Atrasada";
    else if (/\bem dia\b/i.test(norm)) smallOut.vaccinationStatus = "Em dia";

    return Object.entries(smallOut).reduce((acc, [key, value]) => {
      const cleanedValue = limit(value);
      if (cleanedValue) acc[key] = cleanedValue;
      return acc;
    }, {});
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
    const audioBlob = recordedAudioBlobRef.current;
    if (
      !baseTranscript &&
      (!candidateSegments || candidateSegments.length === 0) &&
      !(audioBlob && audioBlob.size > 0)
    ) {
      return;
    }

    setAnalyzing(true);
    setParsedConfidence(null);
    setParsedConfidenceComposite(null);
    setRuleAlerts([]);
    setRoleReliability(null);
    try {
      const formData = new FormData();
      formData.append("segments", JSON.stringify(candidateSegments || []));
      formData.append("transcript", baseTranscript);

      if (audioBlob && audioBlob.size > 0) {
        const fileName = audioBlob?.name || "field-audio.webm";
        formData.append("audio", audioBlob, fileName);
        formData.append("mimeType", audioBlob.type || "audio/webm");
      }

      const response = await api.post("/consultations/field-assist", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data || {};
      setRoleReliability(result?.context?.roleReliability || null);
      setParsedConfidenceComposite(result?.parsedConfidenceComposite || null);
      setRuleAlerts(result?.pipeline?.semanticRules?.alerts || []);
      if (Array.isArray(result.segments) && result.segments.length > 0) {
        setSegments(result.segments);
      }
      if (result.transcript) {
        transcriptRef.current = result.transcript;
      }
      const fallbackTranscript = String(
        result.transcript || baseTranscript || "",
      ).trim();
      const fallbackSegments =
        (Array.isArray(result.segments) && result.segments.length > 0
          ? result.segments
          : candidateSegments) || [];
      const parsed =
        result.parsed || parseTranscriptLocal(fallbackTranscript, fallbackSegments);

      let bestDraft = null;
      try {
        const chatInput = buildChatInputFromSegments(fallbackSegments, fallbackTranscript);
        if (chatInput) {
          const inferredPorte = inferPorteFromContext(chatInput);
          const requestedPorte = manualPorteOverride || inferredPorte.porte;
          setPorteDetectionState(inferredPorte);
          const draftResponse = await api.post("/consultations/chat-assist", {
            mode: "nova",
            patientId: patient?.id || null,
            text: chatInput,
            transcript: fallbackTranscript,
            segments: fallbackSegments,
            messages: [{ role: "user", content: chatInput }],
            recordProfile: {
              porte: requestedPorte,
            },
          });
          bestDraft = draftResponse?.data?.draft || null;
          if (bestDraft) {
            const draftPorte = String(bestDraft.porte || "").toLowerCase();
            if (requestedPorte === "grande" && draftPorte !== "grande") {
              bestDraft = {
                ...bestDraft,
                porte: "grande",
              };
            }
          }
          if (!manualPorteOverride && !inferredPorte.confident) {
            setShowPorteChoiceModal(true);
          }
          const confidenceFromDraft = mapConfidenceByFieldFromDraft(
            draftResponse?.data?.confidenceByField || {},
          );
          if (confidenceFromDraft) {
            setParsedConfidence(confidenceFromDraft);
          }
        }
      } catch (draftError) {
        console.error("Falha ao detalhar draft da consulta de campo:", draftError);
      }

      const normalizedParsed = bestDraft
        ? {
            chiefComplaint: String(bestDraft.chiefComplaint || parsed?.chiefComplaint || "").trim(),
            anamnesis: String(bestDraft.anamnesis || parsed?.anamnesis || "").trim(),
            physicalExam: String(bestDraft.physicalExam || parsed?.physicalExam || "").trim(),
            diagnosis: String(bestDraft.diagnosis || parsed?.diagnosis || "").trim(),
            treatment: String(bestDraft.treatment || parsed?.treatment || "").trim(),
            medications: String(bestDraft.medications || parsed?.medications || "").trim(),
          }
        : parsed;

      setStructuredDraft(bestDraft);
      setParsedData(normalizedParsed);
      setParsedConfidence((prev) =>
        prev || result.parsedConfidence || buildLocalConfidence(normalizedParsed, fallbackSegments),
      );
      setAnalysisSource(result.provider || "heuristic");
      const hasParsedContent = Object.values(normalizedParsed || {}).some((value) =>
        String(value || "").trim(),
      );
      if (!fallbackTranscript && !hasParsedContent) {
        showFeedback(
          "error",
          "Nao foi possivel transcrever o audio. Verifique se o backend tem DEEPGRAM_API_KEY ou OPENAI_API_KEY.",
        );
      }
    } catch (error) {
      console.error("Falha no assistente de campo (backend):", error);
      const parsed = parseTranscriptLocal(baseTranscript, candidateSegments);
      setStructuredDraft(null);
      setParsedData(parsed);
      setParsedConfidence(buildLocalConfidence(parsed, candidateSegments));
      setParsedConfidenceComposite(null);
      setRuleAlerts([]);
      setRoleReliability({ reliable: false, score: 0.3, reason: "fallback_local" });
      setAnalysisSource("local");
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeCurrentConversation = async () => {
    await runFieldAssist(segments);
  };

  const handlePickRecordedAudio = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (!String(file.type || "").startsWith("audio/")) {
      showFeedback("error", "Selecione um arquivo de audio valido.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showFeedback("error", "Arquivo maior que 25MB. Reduza o audio e tente novamente.");
      return;
    }

    keepRecordingRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    setShowPausedActions(false);
    setSegments([]);
    setParsedData(null);
    setStructuredDraft(null);
    setParsedConfidence(null);
    setParsedConfidenceComposite(null);
    setRuleAlerts([]);
    setRoleReliability(null);
    setManualPorteOverride(null);
    setPorteDetectionState({ porte: "pequeno", confident: false, reason: "indefinido" });
    setShowPorteChoiceModal(false);
    setElapsedSeconds(0);
    setStartedAt(null);
    transcriptRef.current = "";
    liveInterimRef.current = "";
    setLiveInterim("");
    audioChunksRef.current = [];
    recordedAudioBlobRef.current = file;
    setUploadedAudioName(file.name);

    try {
      await stopAudioCapture({ releaseStream: false });
    } catch {
      // noop
    }

    showFeedback("success", "Audio carregado. Processando com IA de campo...");
    await runFieldAssist([]);

    if (audioFileInputRef.current) {
      audioFileInputRef.current.value = "";
    }
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
      setStructuredDraft(null);
      setParsedConfidence(null);
      setParsedConfidenceComposite(null);
      setRuleAlerts([]);
      setRoleReliability(null);
      setManualPorteOverride(null);
      setPorteDetectionState({ porte: "pequeno", confident: false, reason: "indefinido" });
      setShowPorteChoiceModal(false);
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
    setStructuredDraft(null);
    setParsedConfidence(null);
    setParsedConfidenceComposite(null);
    setRuleAlerts([]);
    setRoleReliability(null);
    setManualPorteOverride(null);
    setPorteDetectionState({ porte: "pequeno", confident: false, reason: "indefinido" });
    setShowPorteChoiceModal(false);
    setElapsedSeconds(0);
    setStartedAt(null);
    transcriptRef.current = "";
    recordedAudioBlobRef.current = null;
    setUploadedAudioName("");
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

  const choosePorteManually = async (porte) => {
    const selected = porte === "grande" ? "grande" : "pequeno";
    setManualPorteOverride(selected);
    setPorteDetectionState((prev) => ({
      ...prev,
      porte: selected,
      confident: true,
      reason: "manual",
    }));
    setShowPorteChoiceModal(false);
    if (segmentsRef.current.length || transcriptRef.current.trim()) {
      await runFieldAssist(segmentsRef.current);
    }
  };

  const detectedPorte =
    String(structuredDraft?.porte || "").toLowerCase() === "grande"
      ? "grande"
      : String(structuredDraft?.porte || "").toLowerCase() === "pequeno"
        ? "pequeno"
        : porteDetectionState.porte;
  const activePorte = manualPorteOverride || detectedPorte || "pequeno";

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

  const buildManualDraftPayload = () => {
    const parsed = parsedData || parseTranscriptLocal(transcriptRef.current || "", segments) || {};
    const draft = structuredDraft && typeof structuredDraft === "object" ? structuredDraft : {};
    const timestampedTranscript = buildTimestampedTranscript();
    const enforcedPorte = manualPorteOverride || porteDetectionState.porte || draft.porte || "pequeno";
    const porte = String(enforcedPorte || "").toLowerCase() === "grande" ? "grande" : "pequeno";
    const transcriptForSpecific = [
      timestampedTranscript,
      transcriptRef.current || "",
      String(parsed?.chiefComplaint || ""),
      String(parsed?.anamnesis || ""),
      String(parsed?.physicalExam || ""),
      String(parsed?.diagnosis || ""),
      String(parsed?.treatment || ""),
      String(parsed?.medications || ""),
    ]
      .filter(Boolean)
      .join("\n");
    const fallbackSpecific = extractSpecificFieldsFallback(transcriptForSpecific, porte, parsed);
    const aiSpecific =
      draft.specificFields && typeof draft.specificFields === "object"
        ? draft.specificFields
        : {};
    const specificFields = {
      ...fallbackSpecific,
      ...Object.entries(aiSpecific).reduce((acc, [key, value]) => {
        const text = String(value || "").trim();
        if (text) acc[key] = text;
        return acc;
      }, {}),
    };
    const filledSpecificItems = Object.entries(specificFields)
      .map(([key, value]) => ({
        key,
        label: SPECIFIC_FIELD_LABELS[key] || key,
        value: String(value || "").trim(),
      }))
      .filter((item) => item.value);

    const chiefComplaint = String(draft.chiefComplaint || parsed.chiefComplaint || "").trim();
    const anamnesis = String(draft.anamnesis || parsed.anamnesis || "").trim();
    const physicalExam = String(draft.physicalExam || parsed.physicalExam || "").trim();
    const diagnosis = String(draft.diagnosis || parsed.diagnosis || "").trim();
    const treatment = String(draft.treatment || parsed.treatment || "").trim();
    const procedures = String(draft.procedures || "").trim();
    const medications = String(draft.medications || parsed.medications || "").trim();
    const examDetails = String(draft.examDetails || "").trim();
    const returnRecommendation = String(draft.returnRecommendation || "").trim();
    const persistentFields = filledSpecificItems.reduce((acc, item) => {
      const text = String(item.value || "").trim();
      if (!text) return acc;
      const normalized = normalizeText(text);
      if (normalized === "nao informado" || normalized === "não informado") return acc;
      const allowedByPorte =
        porte === "grande"
          ? PERSISTENT_SPECIFIC_KEYS.grande
          : PERSISTENT_SPECIFIC_KEYS.pequeno;
      if (!allowedByPorte.has(item.key)) return acc;
      acc[item.key] = text;
      return acc;
    }, {});

    const hasMeaningfulData = [
      chiefComplaint,
      anamnesis,
      physicalExam,
      diagnosis,
      treatment,
      medications,
      transcriptRef.current,
    ].some((value) => String(value || "").trim());

    return {
      hasMeaningfulData,
      porte,
      payload: {
        patientId: patient.id,
        consultationType,
        ...(initialData?.previousConsultationId
          ? { previousConsultationId: initialData.previousConsultationId }
          : {}),
        weight,
        temperature,
        heartRate,
        respiratoryRate,
        chiefComplaint,
        anamnesis,
        physicalExam,
        diagnosis,
        treatment,
        procedures,
        medications,
        examDetails,
        returnRecommendation,
        persistentProfileUpdate: Object.keys(persistentFields).length
          ? {
              porte,
              fields: persistentFields,
            }
          : null,
        fromFieldMode: true,
        porte,
        specificFields: filledSpecificItems.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {}),
        aiChatText: [
          `Contexto: ${consultationTypeLabel}`,
          chiefComplaint ? `Queixa: ${chiefComplaint}` : "",
          anamnesis ? `Anamnese: ${anamnesis}` : "",
          physicalExam ? `Exame fisico: ${physicalExam}` : "",
          diagnosis ? `Diagnostico: ${diagnosis}` : "",
          treatment ? `Conduta: ${treatment}` : "",
          medications ? `Medicacao: ${medications}` : "",
          timestampedTranscript ? `Transcricao:\n${timestampedTranscript}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
      timestampedTranscript,
      filledSpecificItems,
      shouldRecommendReturn:
        Boolean(returnRecommendation) && !/\b(nao|não)\s+retorn/.test(returnRecommendation.toLowerCase()),
    };
  };

  const handleSave = async (generatePrescription = false) => {
    if (!patient?.id) {
      showFeedback("error", "Selecione um paciente antes de salvar.");
      return;
    }

    if (!manualPorteOverride && !porteDetectionState.confident) {
      setShowPorteChoiceModal(true);
      showFeedback(
        "error",
        "Nao foi possivel detectar o porte com seguranca. Escolha pequeno ou grande porte para continuar.",
      );
      return;
    }

    const draftBundle = buildManualDraftPayload();
    const {
      porte,
      payload: manualPayload,
      timestampedTranscript,
      filledSpecificItems,
      shouldRecommendReturn,
    } = draftBundle;

    const specificSummary = filledSpecificItems.length
      ? [
          porte === "grande"
            ? "Ficha detalhada - grande porte"
            : "Ficha complementar - pequeno porte",
          ...filledSpecificItems.map((item) => `${item.label}: ${item.value}`),
        ].join("\n")
      : "";
    const structuredPorteBlock = filledSpecificItems.length
      ? `${PORTE_NOTES_MARK_START}\n${JSON.stringify({
          porte,
          fields: filledSpecificItems.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
          }, {}),
        })}\n${PORTE_NOTES_MARK_END}`
      : "";

    const payload = {
      patientId: manualPayload.patientId,
      consultationType: manualPayload.consultationType,
      weight: manualPayload.weight,
      temperature: manualPayload.temperature,
      heartRate: manualPayload.heartRate,
      respiratoryRate: manualPayload.respiratoryRate,
      chiefComplaint: manualPayload.chiefComplaint || "Nao informado",
      anamnesis: manualPayload.anamnesis || "Nao informado",
      physicalExam: manualPayload.physicalExam || "Nao informado",
      diagnosis: manualPayload.diagnosis || "Nao informado",
      treatment: manualPayload.treatment || "Nao informado",
      procedures: manualPayload.procedures || "Nao realizado",
      medications: manualPayload.medications || "Nao prescrita",
      notes: [
        `Registro gerado em Modo Campo (${consultationTypeLabel}).`,
        `Origem da analise: ${analysisSource}.`,
        manualPayload.examDetails ? `Detalhes do exame: ${manualPayload.examDetails}` : "",
        specificSummary,
        timestampedTranscript
          ? `Transcricao com minutagem:\n${timestampedTranscript}`
          : "Transcricao indisponivel.",
        structuredPorteBlock,
      ]
        .filter(Boolean)
        .join("\n\n"),
      returnRecommendation: manualPayload.returnRecommendation,
      returnPlan: {
        recommended: shouldRecommendReturn,
        date: null,
        open: shouldRecommendReturn,
      },
    };

    if (!generatePrescription && typeof onContinueToManual === "function") {
      setShowPorteChoiceModal(false);
      onContinueToManual({
        ...manualPayload,
      });
      return;
    }

    try {
      setSaving(true);
      const saved = await onSave(payload);
      const savedId = saved?.id || saved?.data?.id || saved?.data?.data?.id;

      const hasMedication =
        payload.medications && !/n[aa]o prescrita/i.test(String(payload.medications));

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

  const goToManualEditor = async () => {
    const draftBundle = buildManualDraftPayload();
    if (!draftBundle.hasMeaningfulData) {
      showFeedback(
        "error",
        "Ainda nao ha dados suficientes para preencher o prontuario manual.",
      );
      return;
    }

    await cleanupRecordingResources();
    if (typeof onContinueToManual === "function") {
      onContinueToManual(draftBundle.payload);
      return;
    }
    onSwitchToManual?.();
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
    <div className="max-w-3xl mx-auto space-y-4 pb-36 sm:pb-28">
      <div className="rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-gradient-to-r from-cyan-50 to-emerald-50 dark:from-cyan-900 dark:to-emerald-900 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Modo Campo</h1>
            <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
              Paciente: <strong>{patient.name}</strong> · Tutor: {patient.ownerName}
            </p>
            <p className="text-xs text-cyan-800 dark:text-cyan-300 mt-1 font-semibold">
              Contexto ativo: {consultationTypeLabel}
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
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Tipo de consulta
          </label>
          <select
            value={consultationType}
            onChange={(event) => setConsultationType(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            disabled={isTypeLockedByContext}
          >
            {CONSULTATION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isTypeLockedByContext && (
            <p className="mt-1 text-[11px] text-amber-700">
              Contexto de retorno fixado pela consulta anterior selecionada.
            </p>
          )}
        </div>

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
          {roleReliability && (
            <p className={`text-[11px] font-semibold ${roleReliability.reliable ? "text-emerald-700" : "text-amber-700"}`}>
              Separacao Tutor/Vet: {roleReliability.reliable ? "estavel" : "incerta"} ({Math.round((roleReliability.score || 0) * 100)}%)
            </p>
          )}
          <div className="w-full max-w-md rounded-lg border border-cyan-200 bg-white p-2 space-y-2">
            <p className="text-[11px] font-semibold text-cyan-800">
              Porte do prontuario:{" "}
              <strong>{activePorte === "grande" ? "Grande porte" : "Pequeno porte"}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => choosePorteManually("pequeno")}
                disabled={analyzing}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  activePorte === "pequeno"
                    ? "border-blue-600 bg-blue-600 text-white"
                    : detectedPorte === "pequeno"
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                Pequeno porte
              </button>
              <button
                type="button"
                onClick={() => choosePorteManually("grande")}
                disabled={analyzing}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  activePorte === "grande"
                    ? "border-amber-600 bg-amber-600 text-white"
                    : detectedPorte === "grande"
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                Grande porte
              </button>
              {manualPorteOverride && (
                <button
                  type="button"
                  onClick={() => setManualPorteOverride(null)}
                  disabled={analyzing}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                >
                  Usar detectado
                </button>
              )}
            </div>
          </div>
          <div className="w-full max-w-md rounded-lg border border-cyan-200 bg-white p-2">
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*"
              onChange={handlePickRecordedAudio}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              disabled={analyzing || isRecording}
              className="w-full rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 disabled:opacity-70"
            >
              Usar audio gravado
            </button>
            <p className="mt-1 text-[11px] text-gray-500">
              {uploadedAudioName ? `Arquivo: ${uploadedAudioName}` : "Selecione um arquivo de audio do celular/computador (max. 25MB)."}
            </p>
          </div>
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
                className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 disabled:opacity-70 inline-flex items-center justify-center gap-1"
              >
                {analyzing && <LoadingDot className="h-3 w-3" />}
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
              const conf = parsedConfidenceComposite?.[key] || parsedConfidence?.[key];
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
            {ruleAlerts.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 space-y-1">
                <p className="text-[11px] font-semibold text-amber-900">Alertas clinicos detectados</p>
                {ruleAlerts.slice(0, 4).map((alert, index) => (
                  <p key={`${alert?.id || "alert"}-${index}`} className="text-[11px] text-amber-900">
                    {(alert?.severity || "media").toUpperCase()}: {alert?.message || "-"}
                  </p>
                ))}
              </div>
            )}
            {structuredDraft && (
              <div className="rounded-lg border border-emerald-200 bg-white p-2 space-y-1">
                <p className="text-[11px] font-semibold text-emerald-900">
                  Ficha de porte detectada:{" "}
                  <strong>
                    {String(structuredDraft?.porte || "").toLowerCase() === "grande"
                      ? "Grande porte"
                      : "Pequeno porte"}
                  </strong>
                </p>
                <p className="text-[11px] text-emerald-800">
                  Campos especificos preenchidos:{" "}
                  {
                    Object.values(structuredDraft?.specificFields || {}).filter((value) =>
                      String(value || "").trim(),
                    ).length
                  }
                </p>
              </div>
            )}
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

      <FloatingFormActions maxWidthClass="max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving || analyzing}
            className="btn btn-success btn-lg btn-block"
          >
            {saving && <LoadingDot />}
            {saving ? "Salvando..." : "Salvar Campo"}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving || analyzing}
            className="btn btn-primary btn-lg btn-block"
          >
            {saving && <LoadingDot />}
            {saving ? "Processando..." : "Salvar + Receita"}
          </button>
          <button
            type="button"
            onClick={goToManualEditor}
            className="btn btn-neutral btn-lg btn-block"
          >
            Consulta manual
          </button>
          <button
            type="button"
            onClick={clearCapturedData}
            className="btn btn-neutral btn-lg btn-block"
          >
            Limpar capturas
          </button>
        </div>
      </FloatingFormActions>

      {showPorteChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Confirmar porte do paciente</h3>
            <p className="mt-1 text-sm text-gray-600">
              A transcricao nao trouxe evidencia suficiente para detectar o porte com seguranca.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => choosePorteManually("pequeno")}
                className="btn btn-info-soft btn-sm btn-block"
              >
                Pequeno porte
              </button>
              <button
                type="button"
                onClick={() => choosePorteManually("grande")}
                className="btn btn-warn-soft btn-sm btn-block"
              >
                Grande porte
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowPorteChoiceModal(false)}
              className="btn btn-neutral btn-sm btn-block mt-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldModeConsultation;





