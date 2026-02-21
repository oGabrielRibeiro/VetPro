import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import VoiceTextarea from "./VoiceTextarea";
import FeedbackBanner from "./FeedbackBanner";
import LoadingDot from "./LoadingDot";
import { toUserFriendlyError } from "../utils/errorMessages";
import {
  PORTE_NOTES_MARK_END,
  PORTE_NOTES_MARK_START,
  sanitizeConsultationNotesForDisplay,
} from "../utils/consultationNotes";

const SMALL_ANIMAL_FIELDS = [
  { key: "vaccinationStatus", label: "Vacinacao" },
  { key: "vaccinationProtocol", label: "Protocolo vacinal" },
  { key: "lastVaccines", label: "Ultimas vacinas aplicadas" },
  { key: "dewormingStatus", label: "Vermifugacao" },
  { key: "ectoparasiteControl", label: "Controle de ectoparasitas" },
  { key: "diet", label: "Dieta" },
  { key: "rationBrand", label: "Racao / marca" },
  { key: "feedingFrequency", label: "Frequencia alimentar" },
  { key: "waterIntakeSmall", label: "Ingestao de agua" },
  { key: "housing", label: "Ambiente" },
  { key: "lifestyle", label: "Estilo de vida" },
  { key: "contactWithAnimals", label: "Contato com outros animais" },
  { key: "reproductiveStatusSmall", label: "Estado reprodutivo" },
  { key: "preventiveCare", label: "Preventivos em uso" },
  { key: "behavior", label: "Comportamento" },
  { key: "allergyHistory", label: "Historico alergico" },
  { key: "chronicDiseases", label: "Doencas cronicas" },
  { key: "currentSupplements", label: "Suplementos em uso" },
];

const LARGE_ANIMAL_FIELDS = [
  { key: "farmName", label: "Propriedade" },
  { key: "productionSystem", label: "Sistema de producao" },
  { key: "animalFunction", label: "Finalidade zootecnica" },
  { key: "batch", label: "Lote" },
  { key: "animalId", label: "Identificacao do animal" },
  { key: "bodyConditionScore", label: "Escore corporal" },
  { key: "reproductiveStatus", label: "Estado reprodutivo" },
  { key: "daysInMilk", label: "Dias em lactacao" },
  { key: "parity", label: "Numero de partos" },
  { key: "herdVaccination", label: "Vacinacao do rebanho" },
  { key: "herdDeworming", label: "Vermifugacao do rebanho" },
  { key: "forage", label: "Volumoso" },
  { key: "concentrate", label: "Concentrado" },
  { key: "waterIntake", label: "Consumo de agua" },
  { key: "mineralSupplementation", label: "Suplementacao mineral" },
  { key: "hoofStatus", label: "Casco e locomocao" },
  { key: "rumenMotility", label: "Motilidade ruminal" },
  { key: "fecesAndUrine", label: "Fezes e urina" },
  { key: "milkProduction", label: "Producao de leite" },
  { key: "historicalDiseases", label: "Historico sanitario" },
  { key: "propertyAndManagement", label: "Propriedade e manejo" },
  { key: "contactAnimals", label: "Contactantes" },
  { key: "animalIdentificationDetails", label: "Animal atendido - identificacao detalhada" },
  { key: "neonateAndReproduction", label: "Neonato / reproducao" },
  { key: "previousTreatmentHistory", label: "Tratamento anterior" },
  { key: "physicalExamDetailed", label: "Exame fisico detalhado" },
  { key: "requestedExamPanel", label: "Exames complementares solicitados" },
];

const DEFAULT_SMALL_ANIMAL_DATA = {
  vaccinationStatus: "",
  vaccinationProtocol: "",
  lastVaccines: "",
  dewormingStatus: "",
  ectoparasiteControl: "",
  diet: "",
  rationBrand: "",
  feedingFrequency: "",
  waterIntakeSmall: "",
  housing: "",
  lifestyle: "",
  contactWithAnimals: "",
  reproductiveStatusSmall: "",
  preventiveCare: "",
  behavior: "",
  allergyHistory: "",
  chronicDiseases: "",
  currentSupplements: "",
};

const DEFAULT_LARGE_ANIMAL_DATA = {
  farmName: "",
  productionSystem: "",
  animalFunction: "",
  batch: "",
  animalId: "",
  bodyConditionScore: "",
  reproductiveStatus: "",
  daysInMilk: "",
  parity: "",
  herdVaccination: "",
  herdDeworming: "",
  forage: "",
  concentrate: "",
  waterIntake: "",
  mineralSupplementation: "",
  hoofStatus: "",
  rumenMotility: "",
  fecesAndUrine: "",
  milkProduction: "",
  historicalDiseases: "",
  propertyAndManagement: "",
  contactAnimals: "",
  animalIdentificationDetails: "",
  neonateAndReproduction: "",
  previousTreatmentHistory: "",
  physicalExamDetailed: "",
  requestedExamPanel: "",
};

function normalizeWords(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function classifyAnimalPorte(patient) {
  const source = normalizeWords(
    `${patient?.species || patient?.specie || ""} ${patient?.subcategory || ""} ${patient?.breed || ""}`,
  );

  const largeSignals = [
    "equino",
    "bovino",
    "caprino",
    "ovino",
    "suino",
    "asinino",
    "muar",
    "bufalo",
    "fazenda",
    "rebanho",
  ];
  const smallSignals = ["canino", "felino", "cao", "gato", "coelho", "hamster", "pet"];

  if (largeSignals.some((token) => source.includes(token))) return "grande";
  if (smallSignals.some((token) => source.includes(token))) return "pequeno";
  if (source.includes("ave")) return "pequeno";
  return "indefinido";
}

function inferPorteFromText(text = "") {
  const source = normalizeWords(text);
  const largeSignals = [
    "equino",
    "cavalo",
    "egua",
    "quarto de milha",
    "bovino",
    "vaca",
    "bezerro",
    "rebanho",
    "fazenda",
    "lote",
    "piquete"
  ];
  const smallSignals = ["canino", "cachorro", "cao", "felino", "gato", "pet", "apartamento"];
  const largeHits = largeSignals.filter((token) => source.includes(token)).length;
  const smallHits = smallSignals.filter((token) => source.includes(token)).length;
  if (largeHits > smallHits && largeHits >= 1) return "grande";
  if (smallHits > largeHits && smallHits >= 1) return "pequeno";
  return null;
}

const QuickConsultation = ({
  patient,
  onSave,
  onBack,
  initialData = null,
  fieldMode = false,
}) => {
  const [weight, setWeight] = useState(initialData?.weight || "");
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState(
    initialData?.chiefComplaint || "",
  );
  const [consultationType, setConsultationType] = useState(
    initialData?.consultationType || "nova",
  );
  const [anamnesis, setAnamnesis] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");
  const [diagnosis, setDiagnosis] = useState(initialData?.diagnosis || "");
  const [treatment, setTreatment] = useState(initialData?.treatment || "");
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
  const [smallAnimalData, setSmallAnimalData] = useState(DEFAULT_SMALL_ANIMAL_DATA);
  const [largeAnimalData, setLargeAnimalData] = useState(DEFAULT_LARGE_ANIMAL_DATA);
  const [saving, setSaving] = useState(false);

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
  const [aiMissingFields, setAiMissingFields] = useState({ core: [], specific: [] });
  const [porteOverride, setPorteOverride] = useState(null);
  const [selectedPorte, setSelectedPorte] = useState(null);

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
    if (!patient?.id) return null;
    return `vetpro_draft_quick_${patient.id}_${initialData?.id || "new"}`;
  }, [patient?.id, initialData?.id]);
  const patientPorte = useMemo(() => classifyAnimalPorte(patient), [patient]);
  const detectedPorte = porteOverride || (patientPorte === "indefinido" ? null : patientPorte);
  const animalPorte = selectedPorte || detectedPorte || "pequeno";
  const isLargeAnimal = animalPorte === "grande";
  const isSmallAnimal = !isLargeAnimal;
  const specificFields = isLargeAnimal ? LARGE_ANIMAL_FIELDS : SMALL_ANIMAL_FIELDS;
  const specificData = isLargeAnimal ? largeAnimalData : smallAnimalData;
  const specificCompletion = useMemo(() => {
    const total = specificFields.length || 1;
    const filled = specificFields.filter((field) =>
      String(specificData[field.key] || "").trim(),
    ).length;
    return {
      filled,
      total,
      percent: Math.round((filled / total) * 100),
    };
  }, [specificData, specificFields]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const scrollToSection = (sectionId) => {
    if (typeof window === "undefined") return;
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const updateSmallAnimalField = (key, value) => {
    setSmallAnimalData((prev) => ({ ...prev, [key]: value }));
  };

  const updateLargeAnimalField = (key, value) => {
    setLargeAnimalData((prev) => ({ ...prev, [key]: value }));
  };

  const isNotInformedValue = (value = "") => {
    const normalized = normalizeWords(String(value || ""));
    return normalized === "nao informado" || normalized === "não informado";
  };

  useEffect(() => {
    conversationRecognitionRef.current = conversationRecognition;
  }, [conversationRecognition]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const section = document.getElementById("porte-section");
    if (!section) return;

    const targets = section.querySelectorAll("input, textarea, select");
    targets.forEach((element) => {
      const value = String(element?.value || "");
      const notInformed = isNotInformedValue(value);
      element.classList.toggle("bg-gray-100", notInformed);
      element.classList.toggle("text-gray-500", notInformed);
      element.classList.toggle("italic", notInformed);
      element.classList.toggle("border-gray-400", notInformed);
    });
  }, [smallAnimalData, largeAnimalData, isLargeAnimal]);

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

  const clinicalSignalTerms = [
    "apatia",
    "preguicos",
    "letarg",
    "vomit",
    "diarre",
    "dor",
    "coce",
    "prurid",
    "apetite",
    "perda de peso",
    "ganho de peso",
    "tosse",
    "febre",
    "poliuria",
    "polidipsia",
  ];

  const splitConversationSentences = (text = "") =>
    String(text || "")
      .replace(/\r/g, " ")
      .split(/[\n.!?]+/g)
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter(Boolean);

  const splitDialogueByRoleLocal = (text = "") => {
    const lines = String(text || "")
      .replace(/\r/g, "")
      .split(/\n+/g)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return { tutorText: "", vetText: "", turns: [] };
    }

    let lastRole = "Tutor";
    const turns = lines.map((line) => {
      const normalized = normalizeText(line);
      let tutorScore = 0;
      let vetScore = 0;

      ["notei", "percebi", "ele", "ela", "anda", "parece", "apetite", "vomito", "diarreia", "preguic"].forEach((token) => {
        if (normalized.includes(token)) tutorScore += 2;
      });
      ["entendi", "vamos", "no exame", "diagnostico", "conduta", "tratamento", "prescrev", "retorno", "reavaliar"].forEach((token) => {
        if (normalized.includes(token)) vetScore += 2;
      });

      let role = lastRole;
      if (tutorScore > vetScore) role = "Tutor";
      else if (vetScore > tutorScore) role = "Medico";
      lastRole = role;

      return { role, text: line };
    });

    return {
      tutorText: turns.filter((t) => t.role === "Tutor").map((t) => t.text).join(" ").trim(),
      vetText: turns.filter((t) => t.role === "Medico").map((t) => t.text).join(" ").trim(),
      turns,
    };
  };

  const isSocialSentence = (sentence = "") => {
    const normalized = normalizeText(sentence);
    if (!normalized) return true;
    const socialTerms = ["ola", "oi", "bom dia", "boa tarde", "boa noite", "como vai", "tudo bem"];
    if (socialTerms.some((token) => normalized === token)) return true;
    if (/^(dr|dra|doutor|doutora)\b/.test(normalized)) return true;
    return false;
  };

  const extractClinicalComplaintSentence = (text = "") => {
    const sentences = splitConversationSentences(text);
    if (!sentences.length) return "";

    const scored = sentences
      .map((sentence) => {
        const normalized = normalizeText(sentence);
        let score = 0;
        if (clinicalSignalTerms.some((token) => normalized.includes(token))) score += 3;
        if (/\b(notei|relata|anda|parece|apresenta|mudanca|aumentou|diminuiu)\b/.test(normalized)) score += 2;
        if (isSocialSentence(sentence)) score -= 4;
        if (/\b(vamos|prevenir|check-?up)\b/.test(normalized) && score < 3) score -= 2;
        return { sentence, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scored[0]?.score > 0) return scored[0].sentence;
    return sentences.find((sentence) => !isSocialSentence(sentence)) || sentences[0] || "";
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

  const parseTranscriptToSections = (text) => {
    const content = (text || "").trim();
    if (!content) return null;
    const dialogue = splitDialogueByRoleLocal(content);
    const tutorContext = dialogue.tutorText || content;
    const vetContext = dialogue.vetText || content;
    const complaintFallback = extractClinicalComplaintSentence(tutorContext || content);

    return {
      chiefComplaint:
        extractByKeywords(tutorContext, ["queixa", "motivo da consulta", "motivo"]) ||
        complaintFallback ||
        content.slice(0, 220),
      anamnesis: extractByKeywords(tutorContext, ["anamnese", "historico"]),
      physicalExam: extractByKeywords(vetContext, ["exame fisico"]),
      diagnosis: extractByKeywords(vetContext, ["diagnostico", "suspeita"]),
      treatment: extractByKeywords(vetContext, ["tratamento", "conduta"]),
      medication: extractByKeywords(vetContext, [
        "medicacao",
        "prescricao",
        "prescrever",
        "receita",
      ]),
    };
  };

  const extractSpecificFallbackFromText = (text = "", targetIsLargeAnimal = false) => {
    const rawMultiLine = String(text || "").replace(/\r/g, "").trim();
    if (!rawMultiLine) return {};
    const raw = rawMultiLine.replace(/\n+/g, "\n").trim();
    const flat = raw.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    const sentences = splitConversationSentences(flat);
    const extractSectionByLabels = (labels = []) => {
      if (!labels.length) return "";
      const pattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const regex = new RegExp(
        `(?:^|\\n)\\s*(?:${pattern})\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*[A-Za-zÀ-ÿ][^:\\n]{2,50}:|$)`,
        "i",
      );
      const match = raw.match(regex);
      return match?.[1] ? String(match[1]).replace(/\s+/g, " ").trim() : "";
    };
    const pickSentence = (tokens = []) => {
      const normalizedTokens = tokens.map((token) => normalizeText(token));
      for (const sentence of sentences) {
        const source = normalizeText(sentence);
        if (normalizedTokens.some((token) => token && source.includes(token))) {
          return sentence.trim();
        }
      }
      return "";
    };
    const pick = (regex) => {
      const match = flat.match(regex);
      return match?.[1] ? String(match[1]).trim() : "";
    };
    const compact = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const limit = (value, max = 180) => compact(value).slice(0, max);
    const fields = {};

    if (targetIsLargeAnimal) {
      const propertyAndManagement = extractSectionByLabels(["Propriedade e Manejo", "Propriedade/Manejo"]);
      if (propertyAndManagement) fields.propertyAndManagement = limit(propertyAndManagement);

      const animalIdentification = extractSectionByLabels(["Animal atendido"]);
      if (animalIdentification) fields.animalIdentificationDetails = limit(animalIdentification);
      const animalNameFromSection = animalIdentification.split(",")[0]?.trim();
      if (animalNameFromSection && animalNameFromSection.length >= 2) {
        fields.animalId = limit(animalNameFromSection, 80);
      }

      const contactAnimals = extractSectionByLabels(["Contactantes"]);
      if (contactAnimals) fields.contactAnimals = limit(contactAnimals);

      const previousTreatment = extractSectionByLabels(["Tratamento anterior/Sanidade", "Tratamento anterior", "Sanidade"]);
      if (previousTreatment) fields.previousTreatmentHistory = limit(previousTreatment);

      const historicalDiseases = extractSectionByLabels(["Historico do lote", "Histórico do lote"]);
      if (historicalDiseases) fields.historicalDiseases = limit(historicalDiseases);

      const physicalExam = extractSectionByLabels(["Exame Fisico", "Exame Físico"]);
      if (physicalExam) fields.physicalExamDetailed = limit(physicalExam);

      const hoofStatus = extractSectionByLabels(["Casco e locomocao", "Casco e locomoção"]);
      if (hoofStatus) fields.hoofStatus = limit(hoofStatus);

      const rumenMotility = extractSectionByLabels(["Motilidade", "Motilidade ruminal"]);
      if (rumenMotility) fields.rumenMotility = limit(rumenMotility);

      const fecesAndUrine = extractSectionByLabels(["Fezes e urina"]);
      if (fecesAndUrine) fields.fecesAndUrine = limit(fecesAndUrine);

      const requestedExamPanel = extractSectionByLabels(["Conduta"]);
      if (requestedExamPanel) fields.requestedExamPanel = limit(requestedExamPanel);

      const farmName = pick(/\b((?:Haras|Fazenda|S[ií]tio)\s+[^.,;\n]+)/i);
      if (farmName) fields.farmName = limit(farmName);

      if (/\bsemi[-\s]?extensiv/i.test(flat)) fields.productionSystem = "Semi-extensivo";
      else if (/\bconfinad/i.test(flat)) fields.productionSystem = "Confinado";
      else if (/\bextensiv/i.test(flat)) fields.productionSystem = "Extensivo";
      else if (/\bintensiv/i.test(flat)) fields.productionSystem = "Intensivo";

      if (/\besporte|prova|laco|la[cç]o/i.test(flat)) fields.animalFunction = "Esporte";
      else if (/\bleite|lacta[cç][aã]o/i.test(flat)) fields.animalFunction = "Leite";
      else if (/\bcorte|engorda/i.test(flat)) fields.animalFunction = "Corte";
      else if (/\breprodu[cç][aã]o/i.test(flat)) fields.animalFunction = "Reproducao";

      const species = pick(/\b(Equino|Bovino|Ovino|Caprino|Suino|Asinino|Muar|Bufalo)\b/i);
      const breed = pick(/\b(Quarto de Milha|Mangalarga(?: Marchador)?|Crioulo|Nelore|Holandes|Jersey|Angus|Girolando|Simental)\b/i);
      const sex = pick(/\b(macho|femea)\b/i);
      const age = pick(/\b(\d{1,2})\s*anos?\b/i);
      const namedByAge = pick(/\b\d{1,2}\s*anos?,\s*([A-Za-zÀ-ÿ][\wÀ-ÿ-]*)/i);
      const namedByLabel = pick(/\b(?:nome|animal|paciente)\s*[:\-]?\s*([A-Za-zÀ-ÿ][\wÀ-ÿ-]*)/i);
      const animalName = animalNameFromSection || namedByAge || namedByLabel;
      if (animalName && !fields.animalId) fields.animalId = limit(animalName, 80);
      const identificationParts = [
        animalName ? `Nome: ${animalName}` : "",
        species || "",
        breed || "",
        sex || "",
        age ? `${age} anos` : "",
      ].filter(Boolean);
      if (identificationParts.length) {
        fields.animalIdentificationDetails = limit(identificationParts.join(", "));
      }

      const herdVaccination = pickSentence(["vacina", "vacinas", "raiva", "tetano", "gripe", "encefalo"]);
      if (herdVaccination) fields.herdVaccination = limit(herdVaccination);

      const herdDeworming = pickSentence(["vermifug", "ivermect"]);
      if (herdDeworming) fields.herdDeworming = limit(herdDeworming);

      const forage = pickSentence(["volumoso", "silagem", "feno", "pasto", "coast-cross", "coast cross"]);
      if (forage) fields.forage = limit(forage);

      const concentrate = pickSentence(["concentrado", "racao", "ração", "proteina", "proteína"]);
      if (concentrate) fields.concentrate = limit(concentrate);

      const waterIntake = pickSentence(["ingestao de agua", "ingestão de água", "consumo de agua", "consumo de água", "agua diminu", "água diminu"]);
      if (waterIntake) fields.waterIntake = limit(waterIntake);

      const mineral = pickSentence(["sal mineral", "suplementacao mineral", "suplementação mineral"]);
      if (mineral) fields.mineralSupplementation = limit(mineral);

      const hoof = pickSentence(["casco", "claudic", "locomoc", "flanco"]);
      if (hoof) fields.hoofStatus = limit(hoof);

      const rumen = pickSentence(["motilidade", "ruminal", "rumen", "hipomotil", "timpanismo"]);
      if (rumen) fields.rumenMotility = limit(rumen);

      const fecesUrine = pickSentence(["fezes", "urina"]);
      if (fecesUrine) fields.fecesAndUrine = limit(fecesUrine);

      const historical = pickSentence(["historico", "histórico", "mormo", "aie", "surto", "ocorrencia", "ocorrência"]);
      if (historical) fields.historicalDiseases = limit(historical);

      const physicalExamDetailed =
        pick(/(?:exame fisico|exame físico)\s*[:\-]?\s*([^.\n]+)/i) ||
        pickSentence(["febre", "mucosa", "tpc", "fc ", "fr ", "hipomotilidade"]);
      if (physicalExamDetailed) fields.physicalExamDetailed = limit(physicalExamDetailed);

      const requestedExams = pickSentence(["hemograma", "bioquim", "aie", "mormo", "ultrassom", "raio x", "rx", "exames"]);
      if (requestedExams) fields.requestedExamPanel = limit(requestedExams);
      const previousTreatmentBySentence = pickSentence(["prescrevi", "dipirona", "flunixin", "tratamento anterior", "vermifugacao", "vermifugação"]);
      if (previousTreatmentBySentence && !fields.previousTreatmentHistory) {
        fields.previousTreatmentHistory = limit(previousTreatmentBySentence);
      }
    } else {
      if (/\batrasad/i.test(flat)) fields.vaccinationStatus = "Atrasada";
      else if (/\bem dia\b/i.test(flat)) fields.vaccinationStatus = "Em dia";

      const vaccination = pickSentence(["vacina", "v8", "v10", "antirrab", "raiva", "giardia"]);
      if (vaccination) fields.vaccinationProtocol = limit(vaccination);

      const deworming = pickSentence(["vermifug", "vermifuga", "vermifugacao", "ivermect"]);
      if (deworming) fields.dewormingStatus = limit(deworming);

      const ecto = pickSentence(["pulga", "carrapato", "ectoparasita", "pipeta", "coleira"]);
      if (ecto) fields.ectoparasiteControl = limit(ecto);

      const diet = pickSentence(["racao", "ração", "dieta", "alimentacao", "alimentação", "petisco"]);
      if (diet) fields.diet = limit(diet);

      const water = pickSentence(["ingestao de agua", "ingestão de água", "bebe agua", "bebe água", "agua", "água"]);
      if (water) fields.waterIntakeSmall = limit(water);

      const housing = pickSentence(["apartamento", "casa", "quintal", "ambiente", "acesso externo"]);
      if (housing) fields.housing = limit(housing);

      const lifestyle = pickSentence(["sedentario", "sedentário", "ativo", "passeio", "atividade"]);
      if (lifestyle) fields.lifestyle = limit(lifestyle);

      const contact = pickSentence(["contato com outros", "convive com", "outros animais", "canil"]);
      if (contact) fields.contactWithAnimals = limit(contact);

      const behavior = pickSentence(["comportamento", "preguicos", "preguiços", "apatia", "agitado", "letarg"]);
      if (behavior) fields.behavior = limit(behavior);

      const allergy = pickSentence(["alerg", "prurido", "coceira", "dermatite"]);
      if (allergy) fields.allergyHistory = limit(allergy);

      const chronic = pickSentence(["cronica", "crônica", "endocrino", "cardio", "renal", "diabetes"]);
      if (chronic) fields.chronicDiseases = limit(chronic);

      const supplements = pickSentence(["omega", "condro", "probiot", "suplement", "vitamina"]);
      if (supplements) fields.currentSupplements = limit(supplements);
    }

    return Object.entries(fields).reduce((acc, [key, value]) => {
      const cleaned = compact(value);
      if (cleaned) acc[key] = cleaned;
      return acc;
    }, {});
  };

  const extractVitalSignsFromText = (text = "") => {
    const raw = String(text || "").replace(/\r/g, " ").replace(/\s+/g, " ");
    if (!raw.trim()) {
      return { weight: "", temperature: "", heartRate: "", respiratoryRate: "" };
    }

    const pickNum = (regex) => {
      const m = raw.match(regex);
      return m?.[1] ? String(m[1]).replace(",", ".") : "";
    };

    const extractWeightValue = () => {
      const explicitWeight = pickNum(/\b(?:peso|weight)\s*[:=]?\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*kg\b/i);
      if (explicitWeight) return explicitWeight;

      const candidates = [...raw.matchAll(/\b(\d{1,4}(?:[.,]\d{1,2})?)\s*kg\b/gi)];
      for (const item of candidates) {
        const value = String(item?.[1] || "").replace(",", ".");
        if (!value) continue;
        const start = item.index || 0;
        const end = start + String(item[0] || "").length;
        const context = raw.slice(Math.max(0, start - 24), Math.min(raw.length, end + 24)).toLowerCase();

        const isFeedContext =
          /kg\s*\/\s*dia|kg\/dia|\/dia|por dia|racao|ração|concentrad|proteina|proteína|ingerida/i.test(context);
        if (isFeedContext) continue;
        return value;
      }
      return "";
    };

    const weightValue = extractWeightValue();

    const temperatureValue =
      pickNum(/\b(?:temperatura|temp|t)\s*[:=]?\s*(\d{2}(?:[.,]\d)?)\s*(?:c|°c)\b/i) ||
      pickNum(/\b(\d{2}(?:[.,]\d)?)\s*(?:°c|c)\b/i);

    const heartRateValue =
      pickNum(/\b(?:fc|frequencia cardiaca|freq(?:uencia)? cardiaca)\s*[:=]?\s*(\d{2,3})\s*(?:bpm)?\b/i) ||
      pickNum(/\b(\d{2,3})\s*bpm\b/i);

    const respiratoryRateValue =
      pickNum(/\b(?:fr|frequencia respiratoria|freq(?:uencia)? respiratoria)\s*[:=]?\s*(\d{1,3})\s*(?:mrm|min|irpm)?\b/i) ||
      pickNum(/\b(\d{1,3})\s*(?:mrm|irpm|mr\/min)\b/i);

    return {
      weight: weightValue,
      temperature: temperatureValue,
      heartRate: heartRateValue,
      respiratoryRate: respiratoryRateValue
    };
  };

  const buildEmergencyDraftFromText = (text = "") => {
    const parsed = parseTranscriptToSections(text) || {};
    const clean = String(text || "").trim();
    const fallbackComplaint = extractClinicalComplaintSentence(clean) || clean.slice(0, 220);
    return {
      chiefComplaint: String(parsed.chiefComplaint || fallbackComplaint).trim(),
      anamnesis: String(parsed.anamnesis || (fallbackComplaint ? `Tutor relata ${fallbackComplaint}.` : "")).trim(),
      physicalExam: String(parsed.physicalExam || "").trim(),
      diagnosis: String(parsed.diagnosis || "").trim(),
      treatment: String(parsed.treatment || "").trim(),
      medications: String(parsed.medication || "").trim(),
      procedures: "",
      examDetails: "",
      notes: "",
      returnRecommendation: ""
    };
  };

  const isDraftEffectivelyEmpty = (draft) => {
    if (!draft || typeof draft !== "object") return true;
    const coreFields = [
      "chiefComplaint",
      "anamnesis",
      "physicalExam",
      "diagnosis",
      "treatment",
      "medications",
      "procedures",
      "examDetails",
      "notes",
      "returnRecommendation",
    ];
    const hasCoreValue = coreFields.some((key) => String(draft[key] || "").trim());
    const specific = draft.specificFields && typeof draft.specificFields === "object"
      ? Object.values(draft.specificFields).some((value) => String(value || "").trim())
      : false;
    return !hasCoreValue && !specific;
  };

  useEffect(() => {
    setWeight(initialData?.weight || "");
    setTemperature("");
    setHeartRate("");
    setRespiratoryRate("");
    setChiefComplaint(initialData?.chiefComplaint || "");
    setAnamnesis("");
    setPhysicalExam("");
    setDiagnosis(initialData?.diagnosis || "");
    setTreatment(initialData?.treatment || "");
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
    setSmallAnimalData(DEFAULT_SMALL_ANIMAL_DATA);
    setLargeAnimalData(DEFAULT_LARGE_ANIMAL_DATA);
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
    setAiMissingFields({ core: [], specific: [] });
    setPorteOverride(null);
    setSelectedPorte(null);
    liveInterimRef.current = "";
    transcriptRef.current = "";
    keepConversationRecordingRef.current = false;
    setIsConversationRecording(false);
    conversationRecognitionRef.current?.stop?.();
    setConversationRecognition(null);
  }, [patient?.id, initialData]);

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
      setWeight(draft.weight || "");
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
      setSmallAnimalData({
        ...DEFAULT_SMALL_ANIMAL_DATA,
        ...(draft.smallAnimalData || {}),
      });
      setLargeAnimalData({
        ...DEFAULT_LARGE_ANIMAL_DATA,
        ...(draft.largeAnimalData || {}),
      });
      setConversationTranscript(draft.conversationTranscript || "");
      setTranscriptSegments(draft.transcriptSegments || []);
      setConversationStartedAt(draft.conversationStartedAt || null);
      setParsedTranscriptPreview(draft.parsedTranscriptPreview || null);
      setLiveInterimText("");
      setShowTranscriptExpanded(Boolean(draft.showTranscriptExpanded));
      setSelectedPorte(draft.selectedPorte || null);
      liveInterimRef.current = "";
      transcriptRef.current = draft.conversationTranscript || "";
    } catch (error) {
      console.error("Erro ao restaurar rascunho da consulta:", error);
    }
  }, [draftKey]);

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
      smallAnimalData,
      largeAnimalData,
      conversationTranscript,
      transcriptSegments,
      conversationStartedAt,
      parsedTranscriptPreview,
      liveInterimText,
      showTranscriptExpanded,
      selectedPorte,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.error("Erro ao salvar rascunho da consulta:", error);
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
    smallAnimalData,
    largeAnimalData,
    consultationType,
    conversationTranscript,
    transcriptSegments,
    conversationStartedAt,
    parsedTranscriptPreview,
    liveInterimText,
    showTranscriptExpanded,
    selectedPorte,
  ]);

  const toggleConversationRecording = () => {
    if (!supportsSpeech) {
      showFeedback(
        "error",
        "Reconhecimento de voz nao dispona­vel neste navegador. Use Chrome atualizado ou preencha manualmente.",
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
    setAiMissingFields({ core: [], specific: [] });
  };

  const parseTranscriptToSectionsLocal = (text) => {
    const content = (text || "").trim();
    if (!content) return null;
    const dialogue = splitDialogueByRoleLocal(content);
    const tutorContext = dialogue.tutorText || content;
    const vetContext = dialogue.vetText || content;
    const complaintFallback = extractClinicalComplaintSentence(tutorContext || content);

    return {
      chiefComplaint:
        extractByKeywords(tutorContext, ["queixa", "motivo da consulta", "motivo"]) ||
        complaintFallback ||
        content.slice(0, 220),
      anamnesis: extractByKeywords(tutorContext, ["anamnese", "historico"]),
      physicalExam: extractByKeywords(vetContext, ["exame fisico"]),
      diagnosis: extractByKeywords(vetContext, ["diagnostico", "suspeita"]),
      treatment: extractByKeywords(vetContext, ["tratamento", "conduta"]),
      medication: extractByKeywords(vetContext, [
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
      parsed = parseTranscriptToSectionsLocal(text);
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
    const transcriptVitals = extractVitalSignsFromText(text);
    if (!weight && transcriptVitals.weight) setWeight(transcriptVitals.weight);
    if (!temperature && transcriptVitals.temperature) setTemperature(transcriptVitals.temperature);
    if (!heartRate && transcriptVitals.heartRate) setHeartRate(transcriptVitals.heartRate);
    if (!respiratoryRate && transcriptVitals.respiratoryRate) setRespiratoryRate(transcriptVitals.respiratoryRate);

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

    showFeedback("success", "Transcricao aplicada aos campos do prontuario.");
  };

  const applyAiDraft = (draft, overwrite = false, sourceText = "") => {
    if (!draft || typeof draft !== "object") return;

    const draftPorte = String(draft?.porte || "").toLowerCase();
    if (draftPorte === "grande" || draftPorte === "pequeno") {
      setPorteOverride(draftPorte);
    }
    const targetIsLargeAnimal =
      draftPorte === "grande" ? true : draftPorte === "pequeno" ? false : isLargeAnimal;

    if (overwrite || !chiefComplaint) setChiefComplaint(String(draft.chiefComplaint || ""));
    if (overwrite || !anamnesis) setAnamnesis(String(draft.anamnesis || ""));
    if (overwrite || !physicalExam) setPhysicalExam(String(draft.physicalExam || ""));
    if (overwrite || !diagnosis) setDiagnosis(String(draft.diagnosis || ""));
    if (overwrite || !treatment) setTreatment(String(draft.treatment || ""));

    const candidateVitalText = [
      sourceText,
      draft.physicalExam,
      draft.notes,
      draft.anamnesis,
      draft.chiefComplaint
    ]
      .filter(Boolean)
      .join(" ");
    const extractedVitals = extractVitalSignsFromText(candidateVitalText);
    if ((overwrite || !weight) && extractedVitals.weight) setWeight(extractedVitals.weight);
    if ((overwrite || !temperature) && extractedVitals.temperature) setTemperature(extractedVitals.temperature);
    if ((overwrite || !heartRate) && extractedVitals.heartRate) setHeartRate(extractedVitals.heartRate);
    if ((overwrite || !respiratoryRate) && extractedVitals.respiratoryRate) setRespiratoryRate(extractedVitals.respiratoryRate);

    const extractionBaseText = [
      sourceText,
      draft.physicalExam,
      draft.notes,
      draft.anamnesis,
      draft.chiefComplaint,
      draft.treatment,
      draft.examDetails,
      draft.medications,
      draft.procedures
    ]
      .filter(Boolean)
      .join(" ");

    const incomingSpecificFields =
      draft.specificFields && typeof draft.specificFields === "object"
        ? draft.specificFields
        : {};
    const fallbackSpecificFields = extractSpecificFallbackFromText(
      extractionBaseText,
      targetIsLargeAnimal,
    );
    const mergedSpecificFields = {
      ...fallbackSpecificFields,
      ...incomingSpecificFields,
    };

    if (Object.keys(mergedSpecificFields).length > 0) {
      if (targetIsLargeAnimal) {
        setLargeAnimalData((prev) => {
          const next = { ...prev };
          Object.entries(mergedSpecificFields).forEach(([key, value]) => {
            if (!(key in next)) return;
            const text = String(value || "").trim();
            if (!text) return;
            if (overwrite || !String(next[key] || "").trim() || isNotInformedValue(next[key])) {
              next[key] = text;
            }
          });
          return next;
        });
      } else {
        setSmallAnimalData((prev) => {
          const next = { ...prev };
          Object.entries(mergedSpecificFields).forEach(([key, value]) => {
            if (!(key in next)) return;
            const text = String(value || "").trim();
            if (!text) return;
            if (overwrite || !String(next[key] || "").trim() || isNotInformedValue(next[key])) {
              next[key] = text;
            }
          });
          return next;
        });
      }
    }

    // Nao preencher automaticamente tudo com "Nao informado":
    // isso reduz ruido visual e destaca apenas o que a IA realmente extraiu.

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

    const aiNotes = sanitizeConsultationNotesForDisplay(String(draft.notes || "")).trim();
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

  const generateDraftFromChat = async (overwrite = false, detailLevel = "standard") => {
    const text = aiChatText.trim();
    if (!text) {
      showFeedback("error", "Escreva uma instrucao para gerar o rascunho com IA.");
      return;
    }

    const textPorte = inferPorteFromText(text);
    const requestedPorte =
      selectedPorte ||
      textPorte ||
      (patientPorte === "indefinido" ? null : patientPorte) ||
      animalPorte;
    const requestSpecificFields =
      requestedPorte === "grande" ? LARGE_ANIMAL_FIELDS : SMALL_ANIMAL_FIELDS;

    try {
      setAiGenerating(true);
      setAiMissingFields({ core: [], specific: [] });
      const response = await api.post("/consultations/chat-assist", {
        patientId: patient?.id || null,
        mode: initialData?.consultationType === "retorno" ? "retorno" : "nova",
        text,
        recordProfile: {
          porte: requestedPorte,
          specificFieldKeys: requestSpecificFields.map((item) => item.key),
          detailLevel
        }
      });

      const draft = response?.data?.draft || null;
      const provider = response?.data?.provider || "heuristic";
      setAiConfidenceByField(response?.data?.confidenceByField || {});
      setAiMissingFields(response?.data?.missingFields || { core: [], specific: [] });
      if (!draft || isDraftEffectivelyEmpty(draft)) {
        const emergencyDraft = buildEmergencyDraftFromText(text);
        applyAiDraft(emergencyDraft, overwrite, text);
        showFeedback(
          "success",
          "IA retornou rascunho incompleto. Aplicado preenchimento local de seguranca.",
        );
      } else {
        applyAiDraft(draft, overwrite, text);
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
          detailLevel === "max"
            ? `Rascunho detalhado aplicado com IA (${provider === "openai" ? "OpenAI" : "Local"}).`
            : `Rascunho aplicado com IA (${provider === "openai" ? "OpenAI" : "Local"}).`,
        );
      }
    } catch (error) {
      console.error("Erro ao gerar rascunho por chat:", error);
      const emergencyDraft = buildEmergencyDraftFromText(text);
      if (!isDraftEffectivelyEmpty(emergencyDraft)) {
        applyAiDraft(emergencyDraft, overwrite, text);
        showFeedback(
          "success",
          "Falha de comunicacao com IA. Aplicado preenchimento local com base no texto.",
        );
      } else {
        showFeedback(
          "error",
          toUserFriendlyError(error, "Nao foi possivel gerar sugestao por chat."),
        );
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAutoFillWithAI = () => {
    const hasCoreContent = [
      chiefComplaint,
      anamnesis,
      physicalExam,
      diagnosis,
      treatment,
      procedureDetails,
      medicationDetails,
      examDetails,
      notes,
      returnRecommendation,
    ].some((value) => String(value || "").trim());
    const hasSpecificContent = Object.values(specificData || {}).some((value) =>
      String(value || "").trim()
    );

    // Se já houver conteúdo, preserva o que está preenchido; se estiver vazio, permite preencher tudo.
    const overwrite = !(hasCoreContent || hasSpecificContent);
    generateDraftFromChat(overwrite, "max");
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
        mode: initialData?.consultationType === "retorno" ? "retorno" : "nova",
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

  const buildPayload = () => {
    const transcriptWithTime = buildTimestampedTranscript();
    const transcriptBlock = transcriptWithTime
      ? `Transcricao com minutagem:\n${transcriptWithTime}`
      : conversationTranscript.trim()
        ? `Transcricao da conversa:\n${conversationTranscript.trim()}`
        : "";
    const filledSpecificItems = specificFields
      .map((field) => ({
        label: field.label,
        key: field.key,
        value: String(specificData[field.key] || "").trim(),
      }))
      .filter((item) => item.value);
    const summaryTitle = isLargeAnimal
      ? "Ficha detalhada - grande porte"
      : "Ficha complementar - pequeno porte";
    const specificSummary = filledSpecificItems.length
      ? [summaryTitle, ...filledSpecificItems.map((item) => `${item.label}: ${item.value}`)].join("\n")
      : "";
    const structuredPorteBlock = filledSpecificItems.length
      ? `${PORTE_NOTES_MARK_START}\n${JSON.stringify({
          porte: animalPorte,
          fields: filledSpecificItems.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
          }, {}),
        })}\n${PORTE_NOTES_MARK_END}`
      : "";

    return {
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
      specificSummary,
      transcriptBlock,
      structuredPorteBlock,
    ]
      .filter(Boolean)
      .join("\n\n"),
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

  const renderSmallAnimalSection = () => (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5 space-y-3">
      <h2 className="text-sm font-bold text-blue-900">Prontuario de pequeno porte</h2>
      <p className="text-xs text-blue-800">
        Campos detalhados para animais de companhia, rotina domiciliar e preventivos.
      </p>
      <details open className="rounded-lg border border-blue-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-blue-900">
          Preventivos e historico sanitario
        </summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Vacinacao</label>
            <select
              value={smallAnimalData.vaccinationStatus}
              onChange={(e) => updateSmallAnimalField("vaccinationStatus", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            >
              <option value="">Selecione</option>
              <option value="Em dia">Em dia</option>
              <option value="Atrasada">Atrasada</option>
              <option value="Desconhecida">Desconhecida</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Protocolo vacinal</label>
            <input
              type="text"
              value={smallAnimalData.vaccinationProtocol}
              onChange={(e) => updateSmallAnimalField("vaccinationProtocol", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="V8/V10, antirrabica, giardia, etc."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Ultimas vacinas aplicadas</label>
            <input
              type="text"
              value={smallAnimalData.lastVaccines}
              onChange={(e) => updateSmallAnimalField("lastVaccines", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Vacina e data aproximada"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Vermifugacao</label>
            <input
              type="text"
              value={smallAnimalData.dewormingStatus}
              onChange={(e) => updateSmallAnimalField("dewormingStatus", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Produto e data"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Controle de ectoparasitas</label>
            <input
              type="text"
              value={smallAnimalData.ectoparasiteControl}
              onChange={(e) => updateSmallAnimalField("ectoparasiteControl", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Pulgas/carrapatos (produto e frequencia)"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Doencas cronicas</label>
            <input
              type="text"
              value={smallAnimalData.chronicDiseases}
              onChange={(e) => updateSmallAnimalField("chronicDiseases", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Dermatite, endocrinopatia, cardiopatia..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Historico alergico</label>
            <input
              type="text"
              value={smallAnimalData.allergyHistory}
              onChange={(e) => updateSmallAnimalField("allergyHistory", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Reacao alimentar, medicamentosa, ambiental"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Preventivos em uso</label>
            <input
              type="text"
              value={smallAnimalData.preventiveCare}
              onChange={(e) => updateSmallAnimalField("preventiveCare", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Protetor articular, dental, cardiaco, renal, etc."
            />
          </div>
        </div>
      </details>

      <details open className="rounded-lg border border-blue-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-blue-900">
          Manejo, alimentacao e comportamento
        </summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dieta</label>
            <input
              type="text"
              value={smallAnimalData.diet}
              onChange={(e) => updateSmallAnimalField("diet", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Natural, comercial, mista"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Racao / marca</label>
            <input
              type="text"
              value={smallAnimalData.rationBrand}
              onChange={(e) => updateSmallAnimalField("rationBrand", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Marca e linha da dieta"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequencia alimentar</label>
            <input
              type="text"
              value={smallAnimalData.feedingFrequency}
              onChange={(e) => updateSmallAnimalField("feedingFrequency", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Numero de refeicoes por dia"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ingestao de agua</label>
            <select
              value={smallAnimalData.waterIntakeSmall}
              onChange={(e) => updateSmallAnimalField("waterIntakeSmall", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            >
              <option value="">Selecione</option>
              <option value="Normal">Normal</option>
              <option value="Aumentada">Aumentada</option>
              <option value="Diminuida">Diminuida</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ambiente</label>
            <input
              type="text"
              value={smallAnimalData.housing}
              onChange={(e) => updateSmallAnimalField("housing", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Apartamento, casa, quintal, acesso externo"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Estilo de vida</label>
            <input
              type="text"
              value={smallAnimalData.lifestyle}
              onChange={(e) => updateSmallAnimalField("lifestyle", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Sedentario, ativo, enriquecimento ambiental"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contato com outros animais</label>
            <input
              type="text"
              value={smallAnimalData.contactWithAnimals}
              onChange={(e) => updateSmallAnimalField("contactWithAnimals", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Estado reprodutivo</label>
            <input
              type="text"
              value={smallAnimalData.reproductiveStatusSmall}
              onChange={(e) => updateSmallAnimalField("reproductiveStatusSmall", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Castrado(a), inteiro(a), cio, gestacao"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Comportamento</label>
            <textarea
              value={smallAnimalData.behavior}
              onChange={(e) => updateSmallAnimalField("behavior", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm min-h-[82px]"
              placeholder="Alteracao de comportamento, ansiedade, agressividade, vocalizacao, apatia"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Suplementos em uso</label>
            <input
              type="text"
              value={smallAnimalData.currentSupplements}
              onChange={(e) => updateSmallAnimalField("currentSupplements", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
              placeholder="Omega 3, condroprotetor, probiotico, vitaminas"
            />
          </div>
        </div>
      </details>
    </div>
  );

  const renderLargeAnimalSection = () => (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 space-y-4">
      <h2 className="text-sm font-bold text-amber-900">Prontuario de grande porte (detalhado)</h2>
      <p className="text-xs text-amber-800">
        Modelo detalhado para rotina de campo, rebanho e medicina de producao.
      </p>
      <details open className="rounded-lg border border-amber-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-amber-900">
          Ficha completa de grande porte
        </summary>
        <div className="mt-3 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Propriedade</label>
          <input
            type="text"
            value={largeAnimalData.farmName}
            onChange={(e) => updateLargeAnimalField("farmName", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Nome da fazenda/sitio"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sistema de producao</label>
          <select
            value={largeAnimalData.productionSystem}
            onChange={(e) => updateLargeAnimalField("productionSystem", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          >
            <option value="">Selecione</option>
            <option value="Leite">Leite</option>
            <option value="Corte">Corte</option>
            <option value="Misto">Misto</option>
            <option value="Esporte/Trabalho">Esporte/Trabalho</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Finalidade zootecnica</label>
          <input
            type="text"
            value={largeAnimalData.animalFunction}
            onChange={(e) => updateLargeAnimalField("animalFunction", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Lactacao, reproducao, engorda, tracao"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Lote / grupo</label>
          <input
            type="text"
            value={largeAnimalData.batch}
            onChange={(e) => updateLargeAnimalField("batch", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Identificacao do animal</label>
          <input
            type="text"
            value={largeAnimalData.animalId}
            onChange={(e) => updateLargeAnimalField("animalId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Brinco, chip, tatuagem"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Escore corporal (1-5)</label>
          <input
            type="text"
            value={largeAnimalData.bodyConditionScore}
            onChange={(e) => updateLargeAnimalField("bodyConditionScore", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Estado reprodutivo</label>
          <input
            type="text"
            value={largeAnimalData.reproductiveStatus}
            onChange={(e) => updateLargeAnimalField("reproductiveStatus", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Vazia, prenhe, pos-parto"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Dias em lactacao</label>
          <input
            type="text"
            value={largeAnimalData.daysInMilk}
            onChange={(e) => updateLargeAnimalField("daysInMilk", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Numero de partos</label>
          <input
            type="text"
            value={largeAnimalData.parity}
            onChange={(e) => updateLargeAnimalField("parity", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Vacinacao do rebanho</label>
          <input
            type="text"
            value={largeAnimalData.herdVaccination}
            onChange={(e) => updateLargeAnimalField("herdVaccination", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Vermifugacao do rebanho</label>
          <input
            type="text"
            value={largeAnimalData.herdDeworming}
            onChange={(e) => updateLargeAnimalField("herdDeworming", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Volumoso</label>
          <input
            type="text"
            value={largeAnimalData.forage}
            onChange={(e) => updateLargeAnimalField("forage", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Silagem, feno, pasto"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Concentrado</label>
          <input
            type="text"
            value={largeAnimalData.concentrate}
            onChange={(e) => updateLargeAnimalField("concentrate", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Kg/dia e composicao"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Consumo de agua</label>
          <input
            type="text"
            value={largeAnimalData.waterIntake}
            onChange={(e) => updateLargeAnimalField("waterIntake", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Suplementacao mineral</label>
          <input
            type="text"
            value={largeAnimalData.mineralSupplementation}
            onChange={(e) => updateLargeAnimalField("mineralSupplementation", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Casco e locomocao</label>
          <input
            type="text"
            value={largeAnimalData.hoofStatus}
            onChange={(e) => updateLargeAnimalField("hoofStatus", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Claudicacao, casqueamento, aprumos"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Motilidade ruminal</label>
          <input
            type="text"
            value={largeAnimalData.rumenMotility}
            onChange={(e) => updateLargeAnimalField("rumenMotility", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Contracoes/2 min, timpanismo"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fezes e urina</label>
          <input
            type="text"
            value={largeAnimalData.fecesAndUrine}
            onChange={(e) => updateLargeAnimalField("fecesAndUrine", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Consistencia, cor, volume"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Producao de leite</label>
          <input
            type="text"
            value={largeAnimalData.milkProduction}
            onChange={(e) => updateLargeAnimalField("milkProduction", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            placeholder="Litros/dia, queda de producao"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Historico sanitario e ocorrencias do lote</label>
        <textarea
          value={largeAnimalData.historicalDiseases}
          onChange={(e) => updateLargeAnimalField("historicalDiseases", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm min-h-[88px]"
          placeholder="Mastite, metrite, pneumonia, surtos recentes, tratamentos anteriores"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Propriedade e manejo (modelo da ficha)</label>
        <textarea
          value={largeAnimalData.propertyAndManagement}
          onChange={(e) => updateLargeAnimalField("propertyAndManagement", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm min-h-[100px]"
          placeholder="Responsavel local, proprietario, contato, endereco, tipo de criacao (leite/corte/ambos/confinado/semi-extensivo/extensivo), tipo de alimentacao e sal mineral."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Contactantes</label>
        <input
          type="text"
          value={largeAnimalData.contactAnimals}
          onChange={(e) => updateLargeAnimalField("contactAnimals", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
          placeholder="Bovinos, equinos, ovinos, caprinos, caninos, outros"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Animal atendido - identificacao detalhada</label>
        <textarea
          value={largeAnimalData.animalIdentificationDetails}
          onChange={(e) => updateLargeAnimalField("animalIdentificationDetails", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm min-h-[90px]"
          placeholder="Sexo, idade (m, neonato, bezerro, garrote, adulto), pelagem, tatuagem/brinco/registro genealogico."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Neonato / reproducao</label>
        <textarea
          value={largeAnimalData.neonateAndReproduction}
          onChange={(e) => updateLargeAnimalField("neonateAndReproduction", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm min-h-[90px]"
          placeholder="Monta natural/inseminacao, parto normal/distocico/cesarea, colostragem, cura de umbigo, brix, prenhez e dados reprodutivos."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Tratamento anterior</label>
        <textarea
          value={largeAnimalData.previousTreatmentHistory}
          onChange={(e) => updateLargeAnimalField("previousTreatmentHistory", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm min-h-[90px]"
          placeholder="Vacinas (tipo e datas), antiparasitario interno/externo, apetite e ingestao de agua."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Exame fisico detalhado</label>
        <textarea
          value={largeAnimalData.physicalExamDetailed}
          onChange={(e) => updateLargeAnimalField("physicalExamDetailed", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm min-h-[120px]"
          placeholder="Estado geral, ECC, postura, FC, FR, TC, FMRu, pH, linfonodos, mucosas, TPC, pele/pelos, parametros normais e avaliacao de achados."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Exames complementares solicitados</label>
        <textarea
          value={largeAnimalData.requestedExamPanel}
          onChange={(e) => updateLargeAnimalField("requestedExamPanel", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm min-h-[88px]"
          placeholder="Exames laboratoriais, exames de imagem, outros, necropsia e justificativas."
        />
      </div>
      </div>
      </details>
    </div>
  );

  const clearAllFields = () => {
    const confirmed = window.confirm("Deseja limpar todos os campos deste prontuario?");
    if (!confirmed) return;

    setWeight("");
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
    setSmallAnimalData(DEFAULT_SMALL_ANIMAL_DATA);
    setLargeAnimalData(DEFAULT_LARGE_ANIMAL_DATA);
    setConversationTranscript("");
    setTranscriptSegments([]);
    setConversationStartedAt(null);
    setParsedTranscriptPreview(null);
    setLiveInterimText("");
    setShowTranscriptExpanded(false);
    setAiChatText("");
    setAiMessages([]);
    setAiConfidenceByField({});
    setAiMissingFields({ core: [], specific: [] });
    setFeedback(null);
    liveInterimRef.current = "";
    transcriptRef.current = "";

    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
  };

  const saveConsultationWithPrescription = async (download) => {
    if (!patient?.id) {
      showFeedback("error", "Selecione um paciente antes de salvar a consulta.");
      onBack?.();
      return;
    }

    try {
      setSaving(true);
      const saved = await onSave(buildPayload());
      const savedId = saved?.id || saved?.data?.id || saved?.data?.data?.id;
      if (!savedId) return;
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
          "Prontuario salvo com sucesso. Nao ha nova medicacao para receita.",
        );
        onBack?.();
        return;
      }

      if (download) {
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
        download
          ? "Prontuario salvo. Receita anexada e download iniciado."
          : "Prontuario salvo com receita anexada.",
      );
      onBack?.();
    } catch (error) {
      console.error("Erro ao salvar consulta/receita:", error);
      showFeedback(
        "error",
        toUserFriendlyError(
          error,
          "Nao foi possivel concluir o salvamento da consulta/receita.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="max-w-3xl mx-auto rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-bold text-gray-800">Nova Consulta</h1>
        <p className="mt-2 text-sm text-gray-600">Nenhum paciente selecionado.</p>
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

      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Consulta Clinica Completa</h1>
        <p className="text-sm text-gray-700 mt-1">
          Paciente: <strong>{patient.name}</strong> - Tutor: {patient.ownerName}
        </p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-xs font-semibold text-gray-700 flex flex-col">
            Tipo de consulta
            <select
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              className="mt-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"
              disabled={initialData?.consultationType === "retorno"}
            >
              <option value="nova">Consulta geral</option>
              <option value="vacinacao">Vacinação</option>
              <option value="anestesia">Anestesia</option>
              <option value="retorno" disabled>Retorno (use criar retorno)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="md:hidden sticky top-0 z-20 -mx-1 rounded-xl border border-gray-200 bg-white/95 px-2 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => scrollToSection("assistant-section")}
            className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            Assistente
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("porte-section")}
            className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            Porte
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("clinical-section")}
            className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            Clinico
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("followup-section")}
            className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            Retorno
          </button>
        </div>
      </div>

      <FeedbackBanner
        type={feedback?.type || "error"}
        message={feedback?.message}
        onClose={() => setFeedback(null)}
      />

      {!fieldMode && (
        <div id="assistant-section" className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
          <h2 className="text-sm font-bold text-violet-900">Assistente IA por chat</h2>
          <p className="text-xs text-violet-800">
            Descreva em linguagem livre o caso e a IA monta um rascunho estruturado.
          </p>
          <textarea
            value={aiChatText}
            onChange={(e) => setAiChatText(e.target.value)}
            rows={3}
            placeholder="Ex: retorno de ave com febre, sem apetite, no exame apresentou..."
            className="w-full rounded-lg border border-violet-300 px-3 py-3 text-sm"
          />
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={handleAutoFillWithAI}
              disabled={aiGenerating}
              className="min-h-[46px] rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {aiGenerating && <LoadingDot />}
              {aiGenerating ? "Processando..." : "Preencher com IA (automatico)"}
            </button>
          </div>
          <details className="rounded-lg border border-violet-200 bg-white p-2">
            <summary className="cursor-pointer text-xs font-semibold text-violet-900">
              Opcoes avancadas de IA
            </summary>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => generateDraftFromChat(false, "standard")}
                disabled={aiGenerating}
                className="min-h-[40px] rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-70 inline-flex items-center justify-center gap-2"
              >
                {aiGenerating && <LoadingDot />}
                {aiGenerating ? "Gerando..." : "Preencher vazios"}
              </button>
              <button
                type="button"
                onClick={() => generateDraftFromChat(true, "standard")}
                disabled={aiGenerating}
                className="min-h-[40px] rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-bold text-violet-800 disabled:opacity-70 inline-flex items-center justify-center gap-2"
              >
                {aiGenerating && <LoadingDot className="text-violet-700" />}
                {aiGenerating ? "Aplicando..." : "Substituir campos"}
              </button>
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
                className="min-h-[40px] rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-bold text-violet-800 disabled:opacity-70 sm:col-span-3 inline-flex items-center justify-center gap-2"
              >
                {aiRefining && <LoadingDot className="text-violet-700" />}
                {aiRefining ? "Refinando..." : "Refinar campo selecionado"}
              </button>
            </div>
          </details>
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
          {(aiMissingFields.core.length > 0 || aiMissingFields.specific.length > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <p className="font-semibold">
                Pendencias detectadas pela IA
              </p>
              {aiMissingFields.core.length > 0 && (
                <p className="mt-1">
                  Clinico: {aiMissingFields.core.join(", ")}
                </p>
              )}
              {aiMissingFields.specific.length > 0 && (
                <p className="mt-1">
                  Ficha de porte: {aiMissingFields.specific.length} campo(s) sem evidencia no texto.
                </p>
              )}
              {aiMissingFields.specific.length > 0 && (
                <button
                  type="button"
                  onClick={() => scrollToSection("porte-section")}
                  className="mt-2 rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-800"
                >
                  Ir para ficha de porte
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {fieldMode && (
        <div id="assistant-section" className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
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
              {isConversationRecording
                ? "Parar gravacao"
                : "Iniciar transcricao"}
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

      <div id="porte-section" className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Classificacao do prontuario por porte
        </h2>
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            Porte detectado:{" "}
            <strong>
              {detectedPorte === "grande"
                ? "Grande porte"
                : detectedPorte === "pequeno"
                  ? "Pequeno porte"
                  : "Nao detectado automaticamente"}
            </strong>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedPorte("pequeno")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                animalPorte === "pequeno"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : detectedPorte === "pequeno"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              Pequeno porte
              {detectedPorte === "pequeno" && (
                <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  Detectado
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPorte("grande")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                animalPorte === "grande"
                  ? "border-amber-600 bg-amber-600 text-white"
                  : detectedPorte === "grande"
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              Grande porte
              {detectedPorte === "grande" && (
                <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Detectado
                </span>
              )}
            </button>
            {selectedPorte && (
              <button
                type="button"
                onClick={() => setSelectedPorte(null)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
              >
                Usar detectado
              </button>
            )}
          </div>
          {selectedPorte && detectedPorte && selectedPorte !== detectedPorte && (
            <p className="text-xs font-medium text-amber-700">
              Porte selecionado manualmente. A IA usara este porte para preencher a ficha.
            </p>
          )}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
            <span>Preenchimento da ficha de porte</span>
            <strong>{specificCompletion.filled}/{specificCompletion.total}</strong>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.max(8, specificCompletion.percent)}%` }}
            />
          </div>
        </div>
        {isSmallAnimal ? renderSmallAnimalSection() : renderLargeAnimalSection()}
      </div>

      <div id="clinical-section" className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Parametros vitais</h2>
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

        <VoiceTextarea
          id="chiefComplaint"
          label="Queixa principal"
          value={chiefComplaint}
          onChange={setChiefComplaint}
          rows={3}
          placeholder="Descreva o motivo da consulta"
        />

        <VoiceTextarea
          id="anamnesis"
          label="Anamnese"
          value={anamnesis}
          onChange={setAnamnesis}
          rows={4}
          placeholder="Historico clinico relatado pelo tutor"
        />

        <VoiceTextarea
          id="physicalExam"
          label="Exame fisico"
          value={physicalExam}
          onChange={setPhysicalExam}
          rows={4}
          placeholder="Achados do exame fisico"
        />

        <VoiceTextarea
          id="diagnosis"
          label="Diagnostico"
          value={diagnosis}
          onChange={setDiagnosis}
          rows={3}
          placeholder="Diagnostico clinico"
        />

        <VoiceTextarea
          id="treatment"
          label="Tratamento / conduta"
          value={treatment}
          onChange={setTreatment}
          rows={4}
          placeholder="Plano terapeutico"
        />

        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-700">Procedimento realizado?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700">
              <input type="radio" name="procedurePerformed" checked={procedurePerformed === "sim"} onChange={() => setProcedurePerformed("sim")} /> Sim
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700">
              <input type="radio" name="procedurePerformed" checked={procedurePerformed === "nao"} onChange={() => setProcedurePerformed("nao")} /> Nao
            </label>
          </div>
          {procedurePerformed === "sim" && (
            <div className="mt-3">
              <VoiceTextarea
                id="procedureDetails"
                label="Descreva o procedimento"
                value={procedureDetails}
                onChange={setProcedureDetails}
                rows={3}
                placeholder="Detalhes do procedimento executado"
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-700">Medicacao prescrita?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700">
              <input type="radio" name="medicationPrescribed" checked={medicationPrescribed === "sim"} onChange={() => setMedicationPrescribed("sim")} /> Sim
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700">
              <input type="radio" name="medicationPrescribed" checked={medicationPrescribed === "nao"} onChange={() => setMedicationPrescribed("nao")} /> Nao
            </label>
          </div>
          {medicationPrescribed === "sim" && (
            <div className="mt-3">
              <VoiceTextarea
                id="medicationDetails"
                label="Descreva a medicacao"
                value={medicationDetails}
                onChange={setMedicationDetails}
                rows={3}
                placeholder="Farmaco, dose, via e tempo"
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-700">Exame complementar solicitado?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700">
              <input type="radio" name="examRequested" checked={examRequested === "sim"} onChange={() => setExamRequested("sim")} /> Sim
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700">
              <input type="radio" name="examRequested" checked={examRequested === "nao"} onChange={() => setExamRequested("nao")} /> Nao
            </label>
          </div>
          {examRequested === "sim" && (
            <div className="mt-3">
              <VoiceTextarea
                id="examDetails"
                label="Descreva o exame solicitado"
                value={examDetails}
                onChange={setExamDetails}
                rows={3}
                placeholder="Tipo de exame e justificativa"
              />
            </div>
          )}
        </div>

        <VoiceTextarea
          id="notes"
          label="Observacoes"
          value={notes}
          onChange={setNotes}
          rows={3}
          placeholder="Observacoes gerais"
        />

        <div id="followup-section" className="rounded-xl border border-gray-200 p-3 space-y-3">
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
              <VoiceTextarea
                id="returnRecommendation"
                label="Recomendacao de retorno"
                value={returnRecommendation}
                onChange={setReturnRecommendation}
                rows={2}
                placeholder="Prazo e orientacoes para retorno"
              />
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

        <div className="fixed left-0 right-0 bottom-14 sm:bottom-4 z-30 px-4 sm:px-0">
          <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg px-4 py-3 sm:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={clearAllFields}
              disabled={saving}
              className="min-h-[46px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-70"
            >
              Limpar campos
            </button>
            <button
              type="button"
              onClick={() => saveConsultationWithPrescription(false)}
              disabled={saving}
              className="min-h-[46px] rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {saving && <LoadingDot />}
              {saving ? "Salvando..." : "Salvar Consulta"}
            </button>
            <button
              type="button"
              onClick={() => saveConsultationWithPrescription(true)}
              disabled={saving}
              className="min-h-[46px] rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {saving && <LoadingDot />}
              {saving ? "Processando..." : "Salvar + Gerar Receita"}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickConsultation;







