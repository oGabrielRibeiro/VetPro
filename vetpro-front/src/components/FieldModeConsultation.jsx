import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import api from "../services/api";
import FeedbackBanner from "./FeedbackBanner";
import LoadingDot from "./LoadingDot";
import FloatingFormActions from "./FloatingFormActions";
import AnesthesiaFormFields from "./AnesthesiaFormFields";
import MedicationFormFields from "./MedicationFormFields";
import ProcedureFormFields from "./ProcedureFormFields";
import HospitalizationFormFields from "./HospitalizationFormFields";
import VaccinationFormFields from "./VaccinationFormFields";
import FollowUpFormFields from "./FollowUpFormFields";
import ReportFormFields from "./ReportFormFields";
import SignatureModal from "./SignatureModal";
import {
  extractFirstValidationField,
  toUserFriendlyError,
} from "../utils/errorMessages";
import {
  PORTE_NOTES_MARK_END,
  PORTE_NOTES_MARK_START,
} from "../utils/consultationNotes";
import {
  CONSULTATION_TYPE_OPTIONS,
  resolveConsultationContext,
} from "../utils/consultationContext";
import {
  detectSpeakerFromText,
  stripSpeakerMarkers,
} from "../utils/transcriptParser";

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

const CAMPOS_ESPECIFICOS_POR_PORTE = {
  pequeno: [
    "vaccinationStatus",
    "vaccinationProtocol",
    "lastVaccines",
    "dewormingStatus",
    "ectoparasiteControl",
    "diet",
    "rationBrand",
    "feedingFrequency",
    "waterIntakeSmall",
    "housing",
    "lifestyle",
    "contactWithAnimals",
    "reproductiveStatusSmall",
    "preventiveCare",
    "behavior",
    "allergyHistory",
    "chronicDiseases",
    "currentSupplements",
  ],
  grande: [
    "farmName",
    "productionSystem",
    "animalFunction",
    "batch",
    "animalId",
    "bodyConditionScore",
    "reproductiveStatus",
    "daysInMilk",
    "parity",
    "herdVaccination",
    "herdDeworming",
    "forage",
    "concentrate",
    "waterIntake",
    "mineralSupplementation",
    "hoofStatus",
    "rumenMotility",
    "fecesAndUrine",
    "milkProduction",
    "historicalDiseases",
    "propertyAndManagement",
    "contactAnimals",
    "animalIdentificationDetails",
    "neonateAndReproduction",
    "previousTreatmentHistory",
    "physicalExamDetailed",
    "requestedExamPanel",
  ],
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
  const [anesthesiaForm, setAnesthesiaForm] = useState(() => ({
    surgeryName: "",
    preOpDiagnosis: "",
    surgeon: "",
    anesthetist: "",
    assistant: "",
    asaClass: "",
    anesthesiaStart: "",
    anesthesiaEnd: "",
    surgeryStart: "",
    surgeryEnd: "",
    procedureDate: "",
    premedication: [],
    induction: [],
    maintenance: [],
    analgesia: [],
    rescue: [],
    vitals: [],
    vitalsGrid: [],
    animalName: "",
    ownerName: "",
    recordNumber: "",
    species: "",
    breed: "",
    weight: "",
    age: "",
    sex: "",
    hydration: "",
    preOpTemperature: "",
    preOpHeartRate: "",
    preOpRespiratoryRate: "",
    mucosaColor: "",
    tpc: "",
    tgoAst: "",
    tp: "",
    totalProteins: "",
    hematocrit: "",
    urea: "",
    creatinine: "",
    fibrinogen: "",
    fa: "",
    respSpontaneous: "",
    respAssisted: "",
    localAnesthesia: "",
    generalAnesthesia: "",
    intubation: "",
    tubeProbe: "",
    tubeProbeNumber: "",
    oxygen: "",
    ventilation: "",
    consentSignature: "",
    animalPosition: "",
    circuit: "",
    fluidTherapy: "",
    finalOutcome: "",
    conditions: "",
    legendMarkers: [
      { code: "FC*", label: "Frequencia cardiaca" },
      { code: "FR*", label: "Frequencia respiratoria" },
      { code: "Temp*", label: "Temperatura" },
      { code: "SpO2*", label: "Saturacao" },
      { code: "PAM*", label: "Pressao arterial media" },
      { code: "PASV*", label: "Pressao arterial sistolica" },
      { code: "EtCO2*", label: "CO2 expirado" },
    ],
    notes: "",
  }));
  const [medicationForm, setMedicationForm] = useState(() => ({
    diagnosis: "",
    items: [],
    notes: "",
  }));
  const [procedureForm, setProcedureForm] = useState(() => ({
    procedureName: "",
    indication: "",
    technique: "",
    anesthesiaUsed: "",
    surgeon: "",
    assistant: "",
    consentGiven: "",
    consentDate: "",
    consentSignature: "",
    findings: "",
    complications: "",
    postOpPlan: "",
    medications: [],
  }));
  const [hospitalizationForm, setHospitalizationForm] = useState(() => ({
    admissionDate: "",
    dischargeDate: "",
    mainDiagnosis: "",
    responsible: "",
    dailyEvolution: "",
    vitalsNotes: "",
    medications: [],
    feeding: "",
    hydration: "",
    elimination: "",
    observations: "",
  }));
  const [vaccinationForm, setVaccinationForm] = useState(() => ({
    vaccineName: "",
    vaccineManufacturer: "",
    vaccineLot: "",
    vaccineExpiry: "",
    vaccineDose: "",
    vaccineRoute: "",
    vaccineDate: "",
    vaccineNextDate: "",
    dewormerName: "",
    dewormerManufacturer: "",
    dewormerLot: "",
    dewormerDate: "",
    dewormerNextDate: "",
    notes: "",
  }));
  const [followUpForm, setFollowUpForm] = useState(() => ({
    previousDiagnosis: "",
    currentStatus: "",
    responseToTreatment: "",
    adjustments: "",
    nextVisitDate: "",
    notes: "",
  }));
  const [reportForm, setReportForm] = useState(() => ({
    title: "",
    reportDate: "",
    summary: "",
    findings: "",
    conclusion: "",
    recommendations: "",
  }));
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState(null);

  const openSignatureModal = (target) => {
    setSignatureTarget(target);
    setIsSignatureModalOpen(true);
  };

  const closeSignatureModal = () => {
    setIsSignatureModalOpen(false);
    setSignatureTarget(null);
  };

  const saveSignature = (dataUrl) => {
    if (signatureTarget === "anesthesia") {
      setAnesthesiaForm((prev) => ({ ...prev, consentSignature: dataUrl }));
    } else if (signatureTarget === "procedure") {
      setProcedureForm((prev) => ({ ...prev, consentSignature: dataUrl }));
    }
    closeSignatureModal();
  };

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
  const [fieldAssistQuality, setFieldAssistQuality] = useState(null);
  const [fieldReviewDecisions, setFieldReviewDecisions] = useState({});
  const [fieldDecisionLoading, setFieldDecisionLoading] = useState({});
  const [feedbackCorrectionNote, setFeedbackCorrectionNote] = useState("");
  const [feedbackTelemetryEnabled, setFeedbackTelemetryEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("vetpro_feedback_telemetry_enabled");
    if (!stored) return true;
    return stored !== "false";
  });
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
  const incrementalRequestRef = useRef(false);
  const incrementalTimerRef = useRef(null);
  const incrementalKeyRef = useRef("");
  const draftSaveTimerRef = useRef(null);
  const [uploadedAudioName, setUploadedAudioName] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileStep, setMobileStep] = useState("captura");
  const porteChoiceTitleId = useId();
  const porteChoiceDescriptionId = useId();
  const captureSectionRef = useRef(null);
  const reviewSectionRef = useRef(null);
  const saveSectionRef = useRef(null);

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
  const isAnesthesiaType = consultationType === "anestesia";
  const isMedicationType = consultationType === "medicacao";
  const isProcedureType = consultationType === "procedimento";
  const isHospitalizationType = consultationType === "internacao";
  const isVaccinationType = consultationType === "vacinacao";
  const isFollowUpType = consultationType === "retorno";
  const isReportType = consultationType === "laudo";
  const isCustomFormType =
    isAnesthesiaType ||
    isMedicationType ||
    isProcedureType ||
    isHospitalizationType ||
    isVaccinationType ||
    isFollowUpType ||
    isReportType;
  const draftKey = useMemo(() => {
    if (!patient?.id) return "";
    const suffix =
      initialData?.previousConsultationId || initialData?.id || "new";
    return `vetpro_draft_field_${patient.id}_${suffix}`;
  }, [patient?.id, initialData?.previousConsultationId, initialData?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "vetpro_feedback_telemetry_enabled",
      feedbackTelemetryEnabled ? "true" : "false",
    );
  }, [feedbackTelemetryEnabled]);

  useEffect(() => {
    if (!showPorteChoiceModal) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowPorteChoiceModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPorteChoiceModal]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const focusFieldByValidation = (rawField = "") => {
    const field = String(rawField || "").trim().replace(/^payload\./, "");
    if (!field) return false;

    if (field.startsWith("specificFields.")) {
      scrollToStep("salvar");
      return true;
    }

    const fieldMap = {
      consultationType: "#fieldConsultationType",
      chiefComplaint: "#fieldChiefComplaint",
      anamnesis: "#fieldAnamnesis",
      physicalExam: "#fieldPhysicalExam",
      diagnosis: "#fieldDiagnosis",
      treatment: "#fieldTreatment",
      procedures: "#fieldProcedures",
      medications: "#fieldMedications",
      examDetails: "#fieldExamDetails",
      notes: "#fieldNotes",
      returnRecommendation: "#fieldReturnRecommendation",
      weight: "#fieldWeight",
      temperature: "#fieldTemperature",
      heartRate: "#fieldHeartRate",
      respiratoryRate: "#fieldRespiratoryRate",
    };

    const selector = fieldMap[field];
    if (!selector) return false;
    const target = document.querySelector(selector);
    if (!target) return false;

    scrollToStep("salvar");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      if (typeof target.focus === "function") target.focus();
    }, 180);
    return true;
  };

  const focusFirstValidationFieldFromError = (error) => {
    const firstField = extractFirstValidationField(error);
    const focused = focusFieldByValidation(firstField);
    if (!focused) {
      scrollToStep("salvar");
    }
  };

  const scrollToStep = (step) => {
    setMobileStep(step);
    const refMap = {
      captura: captureSectionRef,
      revisao: reviewSectionRef,
      salvar: saveSectionRef,
    };
    const target = refMap[step]?.current;
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const clearCapturedData = () => {
    setSegments([]);
    setParsedData(null);
    setStructuredDraft(null);
    setParsedConfidence(null);
    setParsedConfidenceComposite(null);
    setFieldAssistQuality(null);
    setFieldReviewDecisions({});
    setFieldDecisionLoading({});
    setFeedbackCorrectionNote("");
    setRuleAlerts([]);
    setRoleReliability(null);
    setManualPorteOverride(null);
    setPorteDetectionState({ porte: "pequeno", confident: false, reason: "indefinido" });
    setShowPorteChoiceModal(false);
    transcriptRef.current = "";
    incrementalKeyRef.current = "";
    recordedAudioBlobRef.current = null;
    setUploadedAudioName("");
    setMobileStep("captura");
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
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
      if (incrementalTimerRef.current) {
        clearTimeout(incrementalTimerRef.current);
      }
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
      }
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
    if (initialData.customFormData?.anesthesia) {
      setAnesthesiaForm((prev) => ({ ...prev, ...initialData.customFormData.anesthesia }));
    }
    if (initialData.customFormData?.medication) {
      setMedicationForm((prev) => ({ ...prev, ...initialData.customFormData.medication }));
    }
    if (initialData.customFormData?.procedure) {
      setProcedureForm((prev) => ({ ...prev, ...initialData.customFormData.procedure }));
    }
    if (initialData.customFormData?.hospitalization) {
      setHospitalizationForm((prev) => ({
        ...prev,
        ...initialData.customFormData.hospitalization,
      }));
    }
    if (initialData.customFormData?.vaccination) {
      setVaccinationForm((prev) => ({ ...prev, ...initialData.customFormData.vaccination }));
    }
    if (initialData.customFormData?.followUp) {
      setFollowUpForm((prev) => ({ ...prev, ...initialData.customFormData.followUp }));
    }
    if (initialData.customFormData?.report) {
      setReportForm((prev) => ({ ...prev, ...initialData.customFormData.report }));
    }
  }, [initialData]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);

      setWeight(draft.weight ?? patient?.weight ?? "");
      setTemperature(draft.temperature || "");
      setHeartRate(draft.heartRate || "");
      setRespiratoryRate(draft.respiratoryRate || "");
      setConsultationType(draft.consultationType || "nova");
      if (draft.customFormData?.anesthesia) {
        setAnesthesiaForm((prev) => ({ ...prev, ...draft.customFormData.anesthesia }));
      }
      if (draft.customFormData?.medication) {
        setMedicationForm((prev) => ({ ...prev, ...draft.customFormData.medication }));
      }
      if (draft.customFormData?.procedure) {
        setProcedureForm((prev) => ({ ...prev, ...draft.customFormData.procedure }));
      }
      if (draft.customFormData?.hospitalization) {
        setHospitalizationForm((prev) => ({
          ...prev,
          ...draft.customFormData.hospitalization,
        }));
      }
      if (draft.customFormData?.vaccination) {
        setVaccinationForm((prev) => ({ ...prev, ...draft.customFormData.vaccination }));
      }
      if (draft.customFormData?.followUp) {
        setFollowUpForm((prev) => ({ ...prev, ...draft.customFormData.followUp }));
      }
      if (draft.customFormData?.report) {
        setReportForm((prev) => ({ ...prev, ...draft.customFormData.report }));
      }
      setSegments(Array.isArray(draft.segments) ? draft.segments : []);
      setParsedData(draft.parsedData || null);
      setStructuredDraft(draft.structuredDraft || null);
      setManualPorteOverride(draft.manualPorteOverride || null);
      setPorteDetectionState(
        draft.porteDetectionState || {
          porte: "pequeno",
          confident: false,
          reason: "indefinido",
        },
      );
      setAnalysisSource(draft.analysisSource || "local");
      setCurrentSpeaker(draft.currentSpeaker || "Auto");
      setUploadedAudioName(draft.uploadedAudioName || "");
      setElapsedSeconds(Number(draft.elapsedSeconds || 0));
      if (draft.startedAt) setStartedAt(draft.startedAt);
      transcriptRef.current = String(draft.transcript || "");
      setLiveInterim(String(draft.liveInterim || ""));
      liveInterimRef.current = String(draft.liveInterim || "");
      showFeedback("success", "Rascunho de campo restaurado.");
    } catch {
      // ignora rascunho corrompido
    }
  }, [draftKey, patient?.weight]);

  useEffect(() => {
    if (!draftKey || saving) return;
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
    }

    draftSaveTimerRef.current = setTimeout(() => {
      const draft = {
        weight,
        temperature,
        heartRate,
        respiratoryRate,
        consultationType,
        customFormData: {
          anesthesia: anesthesiaForm,
          medication: medicationForm,
          procedure: procedureForm,
          hospitalization: hospitalizationForm,
          vaccination: vaccinationForm,
          followUp: followUpForm,
          report: reportForm,
        },
        segments,
        parsedData,
        structuredDraft,
        manualPorteOverride,
        porteDetectionState,
        analysisSource,
        currentSpeaker,
        uploadedAudioName,
        elapsedSeconds,
        startedAt,
        transcript: transcriptRef.current || "",
        liveInterim,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // sem espaço no storage
      }
    }, 800);

    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
      }
    };
  }, [
    draftKey,
    saving,
    weight,
    temperature,
    heartRate,
    respiratoryRate,
    consultationType,
    anesthesiaForm,
    medicationForm,
    procedureForm,
    hospitalizationForm,
    vaccinationForm,
    followUpForm,
    reportForm,
    segments,
    parsedData,
    structuredDraft,
    manualPorteOverride,
    porteDetectionState,
    analysisSource,
    currentSpeaker,
    uploadedAudioName,
    elapsedSeconds,
    startedAt,
    liveInterim,
  ]);

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

  const looksLikeConversationalNoise = (value = "") => {
    const normalized = normalizeText(value);
    if (!normalized) return true;
    if (normalized.length < 8) return true;
    const hasClinicalSignal =
      /\b(febre|dor|exame|diagnost|suspeita|tratamento|conduta|medic|vacina|vermifug|casco|ruminal|fezes|urina|apetite|mucosa|fc|fr)\b/.test(
        normalized,
      );
    if (hasClinicalSignal) return false;
    return /^(certo|ok|okay|entendi|beleza|perfeito|isso|entao|então|ricardo|doutor|doutora|dr|dra)\b/.test(
      normalized,
    );
  };

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

  const squashRepeatedSpecificValues = (rawFields = {}) => {
    const entries = Object.entries(rawFields || {}).filter(([, value]) =>
      String(value || "").trim(),
    );
    if (!entries.length) return {};

    const frequency = new Map();
    entries.forEach(([key, value]) => {
      const normalized = normalizeText(String(value || ""));
      if (!normalized) return;
      const prev = frequency.get(normalized) || { count: 0, keys: [] };
      prev.count += 1;
      prev.keys.push(key);
      frequency.set(normalized, prev);
    });

    const cleaned = {};
    entries.forEach(([key, value]) => {
      const text = String(value || "").trim();
      const normalized = normalizeText(text);
      const meta = frequency.get(normalized);
      // Se o mesmo trecho aparece em muitos campos, mantemos só nos 2 primeiros.
      if (meta && meta.count > 2) {
        const idx = meta.keys.indexOf(key);
        if (idx > 1) return;
      }
      cleaned[key] = text;
    });

    return cleaned;
  };

  const isNonInformativeSpecificValue = (value = "") => {
    const normalized = normalizeText(value);
    if (!normalized) return true;
    if (
      /\b(nao informado|não informado|nao informada|não informada|sem informacao|sem informação|nao consta|não consta|n\/a|indefinido|nao mencionado|não mencionado)\b/.test(
        normalized,
      )
    ) {
      return true;
    }
    return false;
  };

  const isSpecificValueGrounded = (value = "", transcriptSource = "") => {
    const source = normalizeText(transcriptSource);
    const normalized = normalizeText(value);
    if (!normalized) return false;
    if (!source) return true;
    const tokens = normalized
      .split(/[^a-z0-9]+/g)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);
    if (!tokens.length) return false;
    const hits = tokens.filter((token) => source.includes(token)).length;
    return hits >= 1 || hits / tokens.length >= 0.34;
  };

  const correspondeSemanticaCampoEspecifico = (key = "", value = "") => {
    const normalized = normalizeText(value);
    if (!normalized) return false;
    const map = {
      vaccinationStatus: /\b(vacina|vacin|atrasad|em dia)\b/,
      vaccinationProtocol: /\b(v8|v10|raiva|antirrab|protocolo)\b/,
      lastVaccines: /\b(vacina|dose|reforco|reforço|raiva)\b/,
      dewormingStatus: /\b(vermif|iverm|albend|vermifug)\b/,
      ectoparasiteControl: /\b(pulga|carrapato|ectoparasita|pipeta|coleira)\b/,
      diet: /\b(dieta|racao|ração|aliment)\b/,
      rationBrand: /\b(racao|ração|marca)\b/,
      feedingFrequency: /\b(vez|dia|refeic|aliment)\b/,
      waterIntakeSmall: /\b(agua|água|ingest|consumo|litro)\b/,
      housing: /\b(casa|apartamento|domic|canil|ambiente)\b/,
      lifestyle: /\b(ativo|sedent|passeio|rua|quintal)\b/,
      contactWithAnimals: /\b(contato|animal|convive|outros)\b/,
      reproductiveStatusSmall: /\b(castr|inteiro|cio|gest|prenhe)\b/,
      preventiveCare: /\b(prevent|vacina|vermif|ecto)\b/,
      behavior: /\b(comport|apat|letarg|agitado|ansioso)\b/,
      allergyHistory: /\b(alerg|prurid|coce|dermat)\b/,
      chronicDiseases: /\b(cronic|diabet|renal|cardio|epilep)\b/,
      currentSupplements: /\b(suplement|vitamin|omega|probiot)\b/,
      farmName: /\b(haras|fazenda|sitio|sítio|propriedade)\b/,
      productionSystem: /\b(extensivo|intensivo|semi|confin|leite|corte|esporte|trabalho)\b/,
      animalFunction: /\b(esporte|trabalho|leite|corte|reproduc)\b/,
      batch: /\b(lote|grupo|piquete|baia)\b/,
      animalId: /\b(brinco|chip|id|registro|nome)\b/,
      bodyConditionScore: /\b([1-5](?:[.,][0-9])?|ecc|escore)\b/,
      reproductiveStatus: /\b(prenhe|gest|lact|seca|anestro|pos[- ]?parto|pós[- ]?parto)\b/,
      daysInMilk: /\b(\d{1,3}\s*dias?|del)\b/,
      parity: /\b(partos?|paridade|\d+)\b/,
      herdVaccination: /\b(vacin|raiva|brucel|clostrid|rebanho)\b/,
      herdDeworming: /\b(vermif|iverm|rebanho)\b/,
      forage: /\b(volumoso|pasto|silagem|feno|capim)\b/,
      concentrate: /\b(concentrado|racao|ração|milho|farelo)\b/,
      waterIntake: /\b(agua|água|ingest|consumo|litro)\b/,
      mineralSupplementation: /\b(sal mineral|mineral|suplement)\b/,
      hoofStatus: /\b(casco|locomoc|claudic|andadura)\b/,
      rumenMotility: /\b(rumen|ruminal|motilidade|contrac|timpan)\b/,
      fecesAndUrine: /\b(fezes|urina|diarre|disuria|disúria)\b/,
      milkProduction: /\b(leite|litro|ordenha|produc)\b/,
      historicalDiseases: /\b(historic|sanitar|mastite|metrite|aie|mormo)\b/,
      propertyAndManagement: /\b(propriedade|manejo|fazenda|haras|rotina)\b/,
      contactAnimals: /\b(contact|contato|lote|rebanho|animais)\b/,
      animalIdentificationDetails: /\b(nome|pelagem|idade|brinco|chip|raca|raça)\b/,
      neonateAndReproduction: /\b(neonato|umbigo|brix|colostro|insemin|parto|distoc)\b/,
      previousTreatmentHistory: /\b(tratamento|hidrat|ringer|antibiot|anti[- ]?inflamat|medic)\b/,
      physicalExamDetailed: /\b(exame|mucosa|fc|fr|temperatura|tpc|desidrat)\b/,
      requestedExamPanel: /\b(exame|hemograma|bioquim|ultrassom|coleta|painel)\b/,
    };
    const matcher = map[key];
    if (!matcher) return true;
    return matcher.test(normalized);
  };

  const extrairCamposEspecificosDoParsed = (parsed = {}, porte = "pequeno") => {
    const safe = parsed && typeof parsed === "object" ? parsed : {};
    const limit = (value, size = 180) =>
      String(value || "").replace(/\s+/g, " ").trim().slice(0, size);

    if (porte === "grande") {
      const mapped = {
        herdVaccination: safe.vacinacao || "",
        herdDeworming: safe.vermifugacao || "",
        propertyAndManagement: safe.ambiente || "",
        historicalDiseases: safe.doencas_previas || "",
        previousTreatmentHistory: [safe.uso_medicacao, safe.treatment, safe.medications]
          .filter(Boolean)
          .join(". "),
        physicalExamDetailed: safe.physicalExam || safe.exame_fisico || "",
        requestedExamPanel: safe.examDetails || safe.exames_solicitados || "",
      };
      return Object.entries(mapped).reduce((acc, [key, value]) => {
        const text = limit(value);
        if (text) acc[key] = text;
        return acc;
      }, {});
    }

    const mapped = {
      vaccinationStatus: safe.vacinacao || "",
      dewormingStatus: safe.vermifugacao || "",
      diet: safe.alimentacao || "",
      housing: safe.ambiente || "",
      chronicDiseases: safe.doencas_previas || "",
      currentSupplements: safe.uso_medicacao || "",
      behavior: safe.anamnesis || safe.anamnese || "",
      waterIntakeSmall: safe.anamnesis || "",
    };
    return Object.entries(mapped).reduce((acc, [key, value]) => {
      const text = limit(value);
      if (text) acc[key] = text;
      return acc;
    }, {});
  };

  const sanitizeSpecificFieldsWithEvidence = (
    rawFields = {},
    transcriptSource = "",
    options = {},
  ) => {
    const porte = options?.porte === "grande" ? "grande" : "pequeno";
    const allowedKeys = new Set(CAMPOS_ESPECIFICOS_POR_PORTE[porte] || []);
    const strictGrounding = options?.strictGrounding !== false;
    const cleaned = {};
    Object.entries(rawFields || {}).forEach(([key, value]) => {
      if (allowedKeys.size && !allowedKeys.has(key)) return;
      const text = String(value || "").trim();
      if (!text) return;
      if (isNonInformativeSpecificValue(text)) return;
      if (looksLikeConversationalNoise(text)) return;
      const grounded = isSpecificValueGrounded(text, transcriptSource);
      const semanticMatch = correspondeSemanticaCampoEspecifico(key, text);
      if (strictGrounding) {
        if (!grounded && !semanticMatch) return;
      } else if (!grounded && !semanticMatch && text.length > 40) {
        return;
      }
      cleaned[key] = text;
    });
    return squashRepeatedSpecificValues(cleaned);
  };

  const mergeSpecificFieldsByEvidence = ({
    parsedSpecific = {},
    fallbackSpecific = {},
    aiSpecific = {},
    transcriptSource = "",
    porte = "pequeno",
  }) => {
    const sanitizedParsed = sanitizeSpecificFieldsWithEvidence(
      parsedSpecific,
      transcriptSource,
      { porte, strictGrounding: true },
    );
    const sanitizedFallback = sanitizeSpecificFieldsWithEvidence(
      fallbackSpecific,
      transcriptSource,
      { porte, strictGrounding: true },
    );
    const sanitizedAI = sanitizeSpecificFieldsWithEvidence(
      aiSpecific,
      transcriptSource,
      { porte, strictGrounding: false },
    );
    return {
      ...sanitizedParsed,
      ...sanitizedFallback,
      ...Object.entries(sanitizedAI).reduce((acc, [key, value]) => {
        const current = String(sanitizedFallback[key] || sanitizedParsed[key] || "").trim();
        if (current && current.length >= String(value || "").trim().length) return acc;
        acc[key] = value;
        return acc;
      }, {}),
    };
  };

  const enrichCriticalParsedFields = (baseParsed = {}, transcriptText = "", sourceSegments = []) => {
    const current = { ...(baseParsed || {}) };
    const local = parseTranscriptLocal(transcriptText, sourceSegments) || {};

    const mergeKey = (key) => {
      const currentValue = String(current?.[key] || "").trim();
      if (currentValue) return;
      const localValue = String(local?.[key] || "").trim();
      if (localValue) current[key] = localValue;
    };

    ["chiefComplaint", "anamnesis", "physicalExam", "diagnosis", "treatment", "medications"].forEach(
      mergeKey,
    );

    if (!String(current?.anamnesis || "").trim()) {
      const alias = String(current?.anamnese || local?.anamnese || "").trim();
      if (alias) current.anamnesis = alias;
    }

    if (!String(current?.diagnosis || "").trim()) {
      const phrases = splitIntoPhrases(transcriptText);
      const diagnosisPhrase = phrases.find((phrase) => {
        const normalized = normalizeText(phrase);
        return /\b(diagnost|suspeita|compativel com|quadro de|hipotese)\b/.test(normalized);
      });
      if (diagnosisPhrase) {
        current.diagnosis = diagnosisPhrase.trim();
      }
    }

    return current;
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

  /* eslint-disable react-hooks/exhaustive-deps */
  const parseTranscriptLocal = useCallback((text, sourceSegments = segments) => {
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
  }, [segments]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const extractSpecificFieldsFallback = (sourceText = "", porte = "pequeno", parsed = {}) => {
    const cleaned = stripSpeakerMarkers(sourceText);
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
    const usedSentences = new Set();
    const pickSentence = (tokens = [], options = {}) => {
      const { minHits = 1, allowReuse = false } = options;
      const normTokens = tokens.map((token) => normalizeText(token));
      let best = "";
      let bestHits = 0;
      for (const sentence of sentences) {
        const sentenceNorm = normalizeText(sentence);
        if (looksLikeConversationalNoise(sentenceNorm)) continue;
        if (!allowReuse && usedSentences.has(sentenceNorm)) continue;
        const hits = normTokens.filter(
          (token) => token && sentenceNorm.includes(token),
        ).length;
        if (hits >= minHits && hits > bestHits) {
          best = sentence;
          bestHits = hits;
        }
      }
      if (best) {
        usedSentences.add(normalizeText(best));
        return best;
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

      out.herdVaccination = pickSentence(["vacina", "raiva", "tetano", "gripe", "encefalo"], { minHits: 1 });
      out.herdDeworming = pickSentence(["vermifug", "ivermect"], { minHits: 1 });
      out.waterIntake = pickSentence(["ingestao de agua", "consumo de agua", "agua diminu", "água diminu"], { minHits: 1 });
      out.hoofStatus = pickSentence(["casco", "locomoc", "claudic", "flanco", "arranho", "arranh"], { minHits: 1 });
      out.rumenMotility = pickSentence(["motilidade", "ruminal", "hipomotilidade", "sons diminu"], { minHits: 1 });
      out.fecesAndUrine = pickSentence(["fezes", "urina"], { minHits: 1 });
      out.historicalDiseases = pickSentence(["historico do lote", "aie", "mormo", "sem ocorrencia", "sem ocorrência"], { minHits: 1 });
      out.physicalExamDetailed = limit(
        String(parsed?.physicalExam || "").trim() || pickSentence(["mucosa", "tpc", "febre", "frequencia cardiaca", "fc"], { minHits: 1 }),
      );
      out.requestedExamPanel = pickSentence(["hemograma", "bioquim", "aie", "mormo", "coleta", "exame"], { minHits: 1 });
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

      const reduced = Object.entries(out).reduce((acc, [key, value]) => {
        const cleanedValue = limit(value);
        if (cleanedValue) acc[key] = cleanedValue;
        return acc;
      }, {});
      return squashRepeatedSpecificValues(reduced);
    }

    const smallOut = {
      vaccinationProtocol: pickSentence(["v8", "v10", "antirrab", "raiva", "vacina"], { minHits: 1 }),
      dewormingStatus: pickSentence(["vermifug", "ivermect"], { minHits: 1 }),
      ectoparasiteControl: pickSentence(["pulga", "carrapato", "ectoparasita", "pipeta"], { minHits: 1 }),
      diet: pickSentence(["racao", "ração", "dieta", "petisco"], { minHits: 1 }),
      waterIntakeSmall: pickSentence(["ingestao de agua", "consumo de agua", "agua"], { minHits: 1 }),
      behavior: pickSentence(["apatia", "pregui", "comportamento", "letarg"], { minHits: 1 }),
      allergyHistory: pickSentence(["alerg", "prurido", "coceira"], { minHits: 1 }),
    };
    if (/\batrasad/i.test(norm)) smallOut.vaccinationStatus = "Atrasada";
    else if (/\bem dia\b/i.test(norm)) smallOut.vaccinationStatus = "Em dia";

    const reduced = Object.entries(smallOut).reduce((acc, [key, value]) => {
      const cleanedValue = limit(value);
      if (cleanedValue) acc[key] = cleanedValue;
      return acc;
    }, {});
    return squashRepeatedSpecificValues(reduced);
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

  const sourceBadgeClass = (source) => {
    if (source === "evidence") return "bg-cyan-100 text-cyan-800";
    if (source === "heuristic") return "bg-violet-100 text-violet-800";
    if (source === "ai") return "bg-blue-100 text-blue-800";
    return "bg-slate-200 text-slate-700";
  };

  const sourceLabel = (source) => {
    if (source === "evidence") return "Regra";
    if (source === "heuristic") return "Heuristica";
    if (source === "ai") return "IA";
    return "Desconhecida";
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

  const runFieldAssist = async (candidateSegments, options = {}) => {
    const fromUploadedAudio = Boolean(options?.fromUploadedAudio);
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
        timeout: 120000,
      });

      const result = response.data || {};
      setFieldAssistQuality(result?.quality || null);
      setFieldReviewDecisions({});
      setRoleReliability(result?.context?.roleReliability || null);
      const qualityConfidence = mapConfidenceByFieldFromDraft(
        result?.quality?.fieldConfidence || {},
      );
      setParsedConfidenceComposite(
        result?.parsedConfidenceComposite || qualityConfidence || null,
      );
      setRuleAlerts(
        Array.isArray(result?.quality?.contradictions)
          ? result.quality.contradictions
          : result?.pipeline?.semanticRules?.alerts || [],
      );
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
          }, { timeout: 90000 });
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

      const parsedFromResult = {
        chiefComplaint: String(
          parsed?.chiefComplaint || parsed?.queixa_principal || "",
        ).trim(),
        anamnesis: String(
          parsed?.anamnesis || parsed?.anamnese || parsed?.historico_do_problema || "",
        ).trim(),
        physicalExam: String(
          parsed?.physicalExam || parsed?.achados_relevantes || "",
        ).trim(),
        diagnosis: String(
          parsed?.diagnosis || parsed?.diagnostico_presuntivo || "",
        ).trim(),
        treatment: String(
          parsed?.treatment || parsed?.orientacoes_ao_tutor || "",
        ).trim(),
        medications: String(
          parsed?.medications || parsed?.medicacoes_prescritas || "",
        ).trim(),
      };

      const parsedBaseDoDraft = bestDraft
        ? {
            chiefComplaint: String(bestDraft.chiefComplaint || parsedFromResult.chiefComplaint || "").trim(),
            anamnesis: String(bestDraft.anamnesis || parsedFromResult.anamnesis || "").trim(),
            physicalExam: String(bestDraft.physicalExam || parsedFromResult.physicalExam || "").trim(),
            diagnosis: String(bestDraft.diagnosis || parsedFromResult.diagnosis || "").trim(),
            treatment: String(bestDraft.treatment || parsedFromResult.treatment || "").trim(),
            medications: String(bestDraft.medications || parsedFromResult.medications || "").trim(),
          }
        : parsedFromResult;
      const normalizedParsed = enrichCriticalParsedFields(
        parsedBaseDoDraft,
        fallbackTranscript,
        fallbackSegments,
      );

      const porteForSpecific =
        manualPorteOverride ||
        (String(bestDraft?.porte || "").toLowerCase() === "grande" ? "grande" : "") ||
        inferPorteFromContext(fallbackTranscript).porte ||
        "pequeno";
      const parsedSpecific = extrairCamposEspecificosDoParsed(
        { ...(parsed || {}), ...(normalizedParsed || {}) },
        porteForSpecific,
      );
      const fallbackSpecific = extractSpecificFieldsFallback(
        fallbackTranscript,
        porteForSpecific,
        normalizedParsed,
      );
      const aiSpecificRaw =
        bestDraft?.specificFields && typeof bestDraft.specificFields === "object"
          ? bestDraft.specificFields
          : {};
      const mergedSpecificFields = mergeSpecificFieldsByEvidence({
        parsedSpecific,
        fallbackSpecific,
        aiSpecific: aiSpecificRaw,
        transcriptSource: fallbackTranscript,
        porte: porteForSpecific,
      });
      const sanitizedBestDraft = bestDraft
        ? {
            ...bestDraft,
            porte: porteForSpecific,
            specificFields: mergedSpecificFields,
          }
        : {
            porte: porteForSpecific,
            specificFields: mergedSpecificFields,
          };

      setStructuredDraft(sanitizedBestDraft);
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
      } else if (fromUploadedAudio) {
        showFeedback("success", "Audio processado com sucesso.");
      }
    } catch (error) {
      console.error("Falha no assistente de campo (backend):", error);
      const parsed = parseTranscriptLocal(baseTranscript, candidateSegments);
      setStructuredDraft(null);
      setParsedData(parsed);
      setParsedConfidence(buildLocalConfidence(parsed, candidateSegments));
      setParsedConfidenceComposite(null);
      setFieldAssistQuality(null);
      setFieldReviewDecisions({});
      setRuleAlerts([]);
      setRoleReliability({ reliable: false, score: 0.3, reason: "fallback_local" });
      setAnalysisSource("local");
      if (fromUploadedAudio) {
        showFeedback(
          "error",
          toUserFriendlyError(
            error,
            "Nao foi possivel processar o audio gravado agora. Tente novamente.",
          ),
        );
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const sendFieldReviewDecision = async (fieldKey, decision) => {
    const field = String(fieldKey || "").trim();
    const normalizedDecision = decision === "accepted" ? "accepted" : "rejected";
    const suggestion = String(parsedData?.[field] || "").trim();
    if (!field || !suggestion) {
      showFeedback("error", "Nao ha sugestao para registrar neste campo.");
      return;
    }
    if (fieldDecisionLoading[field]) return;

    setFieldReviewDecisions((prev) => ({ ...prev, [field]: normalizedDecision }));
    if (!feedbackTelemetryEnabled) {
      showFeedback("success", `Campo ${field} marcado como ${normalizedDecision}.`);
      return;
    }

    const conf = parsedConfidenceComposite?.[field] || parsedConfidence?.[field] || {};
    const reconciliationSource =
      String(fieldAssistQuality?.reconciliation?.[field]?.source || "").trim() ||
      "unknown";
    const payload = {
      requestId: fieldAssistQuality?.pipeline?.requestId || "",
      consultationId: initialData?.id || "",
      patientId: patient?.id || "",
      field,
      suggestion,
      decision: normalizedDecision,
      finalValue:
        normalizedDecision === "rejected" ? String(feedbackCorrectionNote || "").trim() : "",
      source: reconciliationSource || analysisSource || "unknown",
      telemetryEnabled: feedbackTelemetryEnabled,
      quality: {
        score: Number(conf?.score || 0),
        label: String(conf?.label || ""),
        reconciliationSource,
        needsReview: Boolean(fieldAssistQuality?.needsReview),
        contradictionsCount: Array.isArray(fieldAssistQuality?.contradictions)
          ? fieldAssistQuality.contradictions.length
          : 0,
      },
    };

    try {
      setFieldDecisionLoading((prev) => ({ ...prev, [field]: true }));
      await api.post("/consultations/field-assist/feedback", payload);
      showFeedback(
        "success",
        `Feedback ${normalizedDecision === "accepted" ? "aceito" : "rejeitado"} registrado para ${field}.`,
      );
    } catch (error) {
      showFeedback(
        "error",
        toUserFriendlyError(error, "Nao foi possivel registrar feedback do campo."),
      );
    } finally {
      setFieldDecisionLoading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const mergeParsedFields = useCallback((current = {}, incoming = {}) => {
    const keys = [
      "chiefComplaint",
      "anamnesis",
      "physicalExam",
      "diagnosis",
      "treatment",
      "medications",
      "procedures",
      "examDetails",
      "returnRecommendation",
    ];
    const next = { ...(current || {}) };
    keys.forEach((key) => {
      const value = String(incoming?.[key] || "").trim();
      if (!value) return;
      const existing = String(next?.[key] || "").trim();
      if (!existing || existing === "-" || existing.length < 18) {
        next[key] = value;
      }
    });
    return next;
  }, []);

  const runIncrementalHeuristic = useCallback(async (candidateSegments, candidateTranscript) => {
    if (incrementalRequestRef.current) return;
    const safeSegments = Array.isArray(candidateSegments) ? candidateSegments : [];
    if (safeSegments.length < 2) return;

    const transcriptText = String(candidateTranscript || "").trim();
    const key = `${safeSegments.length}:${transcriptText.slice(0, 120)}`;
    if (incrementalKeyRef.current === key) return;
    incrementalKeyRef.current = key;
    incrementalRequestRef.current = true;

    try {
      const response = await api.post("/consultations/heuristic-parse", {
        segments: safeSegments,
        transcript: transcriptText,
      });
      const backendParsed = response?.data?.parsed || {};
      const localParsed = parseTranscriptLocal(transcriptText, safeSegments) || {};
      const merged = mergeParsedFields(backendParsed, localParsed);

      const hasContent = Object.values(merged).some((value) =>
        String(value || "").trim(),
      );
      if (hasContent) {
        setParsedData((current) => mergeParsedFields(current, merged));
      }
    } catch {
      const parsedLocal = parseTranscriptLocal(transcriptText, safeSegments);
      const hasContent = Object.values(parsedLocal || {}).some((value) =>
        String(value || "").trim(),
      );
      if (hasContent) {
        setParsedData((current) => mergeParsedFields(current, parsedLocal));
      }
    } finally {
      incrementalRequestRef.current = false;
    }
  }, [mergeParsedFields, parseTranscriptLocal]);

  useEffect(() => {
    if (!segments.length || analyzing) return;
    const joinedTranscript = segments.map((item) => item.text).join(" ").trim();
    if (!joinedTranscript) return;

    const parsedLocal = parseTranscriptLocal(joinedTranscript, segments);
    const hasContent = Object.values(parsedLocal || {}).some((value) =>
      String(value || "").trim(),
    );
    if (hasContent) {
      setParsedData((current) => current || parsedLocal);
      if (isMobile && !isRecording) {
        setMobileStep("revisao");
      }
    }
  }, [segments, analyzing, isMobile, isRecording, parseTranscriptLocal]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isRecording) return undefined;
    const transcriptNow = transcriptRef.current || "";
    if (!segments.length && !transcriptNow.trim()) return undefined;

    if (incrementalTimerRef.current) {
      clearTimeout(incrementalTimerRef.current);
    }

    incrementalTimerRef.current = setTimeout(() => {
      runIncrementalHeuristic(segmentsRef.current, transcriptRef.current);
    }, 1200);

    return () => {
      if (incrementalTimerRef.current) {
        clearTimeout(incrementalTimerRef.current);
      }
    };
  }, [segments, isRecording, runIncrementalHeuristic]);

  const analyzeCurrentConversation = async () => {
    await runFieldAssist(segments);
  };

  const handlePickRecordedAudio = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (!String(file.type || "").startsWith("audio/")) {
      showFeedback("error", "Selecione um arquivo de audio valido (MP3, WAV ou M4A).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showFeedback("error", "Arquivo maior que 25MB. Reduza a duracao do audio e tente novamente.");
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
    setFieldAssistQuality(null);
    setFieldReviewDecisions({});
    setFieldDecisionLoading({});
    setFeedbackCorrectionNote("");
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

    showFeedback("success", "Audio carregado. A IA de campo esta processando e preenchendo os campos.");
    await runFieldAssist([], { fromUploadedAudio: true });
    if (isMobile) {
      setMobileStep("revisao");
    }

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
      if (isMobile) {
        setMobileStep("captura");
      }
      setStartedAt(startTime);
      setElapsedSeconds(0);
      setSegments([]);
      setLiveInterim("");
      setShowPausedActions(false);
      setParsedData(null);
      setStructuredDraft(null);
      setParsedConfidence(null);
      setParsedConfidenceComposite(null);
      setFieldAssistQuality(null);
      setFieldReviewDecisions({});
      setFieldDecisionLoading({});
      setFeedbackCorrectionNote("");
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
    setFieldAssistQuality(null);
    setFieldReviewDecisions({});
    setFieldDecisionLoading({});
    setFeedbackCorrectionNote("");
    setRuleAlerts([]);
    setRoleReliability(null);
    setManualPorteOverride(null);
    setPorteDetectionState({ porte: "pequeno", confident: false, reason: "indefinido" });
    setShowPorteChoiceModal(false);
    setElapsedSeconds(0);
    setStartedAt(null);
    transcriptRef.current = "";
    incrementalKeyRef.current = "";
    recordedAudioBlobRef.current = null;
    setUploadedAudioName("");
    liveInterimRef.current = "";
    recordedAudioBlobRef.current = null;
    stopAudioCapture({ releaseStream: true });
    showFeedback("success", "Conversa descartada.");
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
  };

  const useConversation = async () => {
    await analyzeCurrentConversation();
    setShowPausedActions(false);
    showFeedback("success", "Conversa mantida para preenchimento.");
    if (isMobile) {
      scrollToStep("revisao");
    }
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
    const parsedSpecific = extrairCamposEspecificosDoParsed(parsed, porte);
    const aiSpecific =
      draft.specificFields && typeof draft.specificFields === "object"
        ? draft.specificFields
        : {};
    const specificFields = mergeSpecificFieldsByEvidence({
      parsedSpecific,
      fallbackSpecific,
      aiSpecific,
      transcriptSource: transcriptForSpecific,
      porte,
    });
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
    const medicationSummary = isMedicationType
      ? (medicationForm.items || [])
          .filter((item) => String(item.name || "").trim())
          .map(
            (item) =>
              `${item.name}${item.dose ? ` - ${item.dose}` : ""}${
                item.route ? ` - ${item.route}` : ""
              }${item.frequency ? ` - ${item.frequency}` : ""}${
                item.duration ? ` - ${item.duration}` : ""
              }`,
          )
          .join("\n")
      : "";
    const procedureMedicationSummary = (procedureForm.medications || [])
      .filter((item) => String(item.name || "").trim())
      .map(
        (item) =>
          `${item.name}${item.dose ? ` - ${item.dose}` : ""}${
            item.route ? ` - ${item.route}` : ""
          }`,
      )
      .join("\n");
    const hospitalizationMedicationSummary = (hospitalizationForm.medications || [])
      .filter((item) => String(item.name || "").trim())
      .map(
        (item) =>
          `${item.name}${item.dose ? ` - ${item.dose}` : ""}${
            item.route ? ` - ${item.route}` : ""
          }`,
      )
      .join("\n");
    const resolvedDiagnosis = isAnesthesiaType
      ? anesthesiaForm.preOpDiagnosis || diagnosis
      : isMedicationType
        ? medicationForm.diagnosis || diagnosis
        : isFollowUpType
          ? followUpForm.previousDiagnosis || diagnosis
        : diagnosis;
    const resolvedProcedures = isAnesthesiaType
      ? anesthesiaForm.surgeryName || procedures
      : isProcedureType
        ? procedureForm.procedureName || procedures
        : isHospitalizationType
          ? "Evolucao / Internacao"
          : isVaccinationType
            ? "Vacinacao / Vermifugacao"
            : isReportType
              ? "Laudo / Atestado"
              : procedures;
    const resolvedMedications = isMedicationType
      ? medicationSummary || medications
      : isProcedureType
        ? procedureMedicationSummary || medications
        : isHospitalizationType
          ? hospitalizationMedicationSummary || medications
          : medications;
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
      resolvedDiagnosis,
      treatment,
      resolvedMedications,
      anesthesiaForm.surgeryName,
      medicationForm.diagnosis,
      procedureForm.procedureName,
      hospitalizationForm.dailyEvolution,
      vaccinationForm.vaccineName,
      reportForm.title,
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
        diagnosis: resolvedDiagnosis,
        treatment,
        procedures: resolvedProcedures,
        medications: resolvedMedications,
        examDetails,
        returnRecommendation,
        customFormData: isCustomFormType
          ? {
              anesthesia: isAnesthesiaType ? anesthesiaForm : null,
              medication: isMedicationType ? medicationForm : null,
              procedure: isProcedureType ? procedureForm : null,
              hospitalization: isHospitalizationType ? hospitalizationForm : null,
              vaccination: isVaccinationType ? vaccinationForm : null,
              followUp: isFollowUpType ? followUpForm : null,
              report: isReportType ? reportForm : null,
            }
          : null,
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
          resolvedDiagnosis ? `Diagnostico: ${resolvedDiagnosis}` : "",
          treatment ? `Conduta: ${treatment}` : "",
          resolvedMedications ? `Medicacao: ${resolvedMedications}` : "",
          isAnesthesiaType && anesthesiaForm.notes
            ? `Anestesia: ${anesthesiaForm.notes}`
            : "",
          isMedicationType && medicationForm.notes
            ? `Medicacao: ${medicationForm.notes}`
            : "",
          isProcedureType && procedureForm.postOpPlan
            ? `Plano pos-operatorio: ${procedureForm.postOpPlan}`
            : "",
          isHospitalizationType && hospitalizationForm.observations
            ? `Internacao: ${hospitalizationForm.observations}`
            : "",
          isVaccinationType && vaccinationForm.notes
            ? `Vacinacao: ${vaccinationForm.notes}`
            : "",
          isFollowUpType && followUpForm.notes
            ? `Retorno: ${followUpForm.notes}`
            : "",
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
      customFormData: manualPayload.customFormData || null,
      notes: [
        `Registro gerado em Modo Campo (${consultationTypeLabel}).`,
        `Origem da analise: ${analysisSource}.`,
        manualPayload.examDetails ? `Detalhes do exame: ${manualPayload.examDetails}` : "",
        !isCustomFormType && specificSummary,
        isAnesthesiaType && manualPayload.customFormData?.anesthesia?.notes
          ? `Anestesia: ${manualPayload.customFormData.anesthesia.notes}`
          : "",
        isMedicationType && manualPayload.customFormData?.medication?.notes
          ? `Medicacao: ${manualPayload.customFormData.medication.notes}`
          : "",
        timestampedTranscript
          ? `Transcricao com minutagem:\n${timestampedTranscript}`
          : "Transcricao indisponivel.",
        !isCustomFormType && structuredPorteBlock,
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
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      onBack?.();
      if (isMobile) {
        setMobileStep("captura");
      }
    } catch (error) {
      console.error("Erro ao salvar consulta de campo:", error);
      focusFirstValidationFieldFromError(error);
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
    <div className="w-full max-w-4xl mx-auto space-y-3 sm:space-y-4 pb-52 sm:pb-28">
      <div className="rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-gradient-to-r from-cyan-50 to-emerald-50 dark:from-cyan-900 dark:to-emerald-900 p-3 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Modo Campo</h1>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 mt-1">
              Paciente: <strong>{patient.name}</strong>
              {!isMobile && <> · Tutor: {patient.ownerName}</>}
            </p>
            <p className="text-xs text-cyan-800 dark:text-cyan-300 mt-1 font-semibold">
              Contexto ativo: {consultationTypeLabel}
            </p>
          </div>
          <span
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold ${
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

      {isMobile && (
        <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Fluxo rapido de campo
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["captura", "Captura"],
              ["revisao", "Revisao"],
              ["salvar", "Salvar"],
            ].map(([step, label]) => (
              <button
                key={step}
                type="button"
                onClick={() => scrollToStep(step)}
                className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${
                  mobileStep === step
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <FeedbackBanner
        type={feedback?.type || "error"}
        message={feedback?.message}
        onClose={() => setFeedback(null)}
      />

      <div
        ref={captureSectionRef}
        className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-5 lg:p-6 space-y-3 sm:space-y-4"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Tipo de consulta
          </label>
          <select
            id="fieldConsultationType"
            value={consultationType}
            onChange={(event) => setConsultationType(event.target.value)}
            className="h-11 sm:h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
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
            className="h-11 sm:h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
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
          {!isMobile && roleReliability && (
            <p className={`text-[11px] font-semibold ${roleReliability.reliable ? "text-emerald-700" : "text-amber-700"}`}>
              Separacao Tutor/Vet: {roleReliability.reliable ? "estavel" : "incerta"} ({Math.round((roleReliability.score || 0) * 100)}%)
            </p>
          )}
          <div className="w-full rounded-lg border border-cyan-200 bg-white p-2 sm:p-3 space-y-2">
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
          <div className="w-full rounded-lg border border-cyan-200 bg-white p-2 sm:p-3">
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
              {uploadedAudioName
                ? `Arquivo: ${uploadedAudioName}`
                : isMobile
                  ? "Selecione um audio (max. 25MB)."
                  : "Selecione um arquivo de audio do celular/computador (max. 25MB)."}
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

      {isCustomFormType ? (
        <div className="space-y-4">
          {isAnesthesiaType && (
            <AnesthesiaFormFields
              value={anesthesiaForm}
              onChange={setAnesthesiaForm}
              onRequestSignature={() => openSignatureModal("anesthesia")}
            />
          )}
          {isMedicationType && (
            <MedicationFormFields
              value={medicationForm}
              onChange={setMedicationForm}
            />
          )}
          {isProcedureType && (
            <ProcedureFormFields
              value={procedureForm}
              onChange={setProcedureForm}
              onRequestSignature={() => openSignatureModal("procedure")}
            />
          )}
          {isHospitalizationType && (
            <HospitalizationFormFields
              value={hospitalizationForm}
              onChange={setHospitalizationForm}
            />
          )}
          {isVaccinationType && (
            <VaccinationFormFields
              value={vaccinationForm}
              onChange={setVaccinationForm}
            />
          )}
          {isFollowUpType && (
            <FollowUpFormFields value={followUpForm} onChange={setFollowUpForm} />
          )}
          {isReportType && (
            <ReportFormFields value={reportForm} onChange={setReportForm} />
          )}
        </div>
      ) : (
      <>
      <div
        ref={reviewSectionRef}
        className="rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/70 p-3 sm:p-5 lg:p-6 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
            Revisao rapida do prontuario
          </h2>
          <button
            type="button"
            onClick={analyzeCurrentConversation}
            disabled={analyzing || !segments.length}
            className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-900 disabled:opacity-50"
          >
            {analyzing ? "Analisando..." : "Atualizar"}
          </button>
        </div>
        <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={feedbackTelemetryEnabled}
              onChange={(e) => setFeedbackTelemetryEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Capturar feedback supervisionado (telemetria anonima)
          </label>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
            Quando ativo, aceite/rejeicao por campo alimenta melhoria continua do parser/IA.
          </p>
        </div>
        {parsedData &&
          (Boolean(fieldAssistQuality?.needsReview) ||
            (fieldAssistQuality?.lowConfidenceFields || []).length > 0 ||
            ruleAlerts.length > 0) && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
              <p className="text-xs font-semibold">Revisao manual recomendada</p>
              <p className="text-[11px]">
                {(fieldAssistQuality?.lowConfidenceFields || []).length > 0
                  ? `Campos com baixa confianca: ${(fieldAssistQuality?.lowConfidenceFields || []).join(", ")}. `
                  : ""}
                {ruleAlerts.length > 0
                  ? `Conflitos clinicos detectados: ${ruleAlerts.length}. `
                  : ""}
                Confirme os campos antes de salvar.
              </p>
            </div>
          )}
        {!parsedData ? (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Inicie a captura e pause para revisar os campos preenchidos automaticamente.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 text-sm">
            {[
              ["chiefComplaint", "Queixa", parsedData.chiefComplaint],
              ["anamnesis", "Anamnese", parsedData.anamnesis],
              ["physicalExam", "Exame fisico", parsedData.physicalExam],
              ["diagnosis", "Diagnostico", parsedData.diagnosis],
              ["treatment", "Conduta", parsedData.treatment],
              ["medications", "Medicacao", parsedData.medications],
            ].map(([key, label, value]) => {
              const conf = parsedConfidenceComposite?.[key] || parsedConfidence?.[key];
              const reconciliationSource = String(
                fieldAssistQuality?.reconciliation?.[key]?.source || "",
              ).trim();
              const decision = fieldReviewDecisions[key];
              const isLoading = Boolean(fieldDecisionLoading[key]);
              const pct = Math.round((Number(conf?.score || 0) || 0) * 100);
              const lowConfidence = (fieldAssistQuality?.lowConfidenceFields || []).includes(
                key,
              );

              return (
                <div
                  key={key}
                  className={`rounded-lg border px-3 py-2 ${
                    decision === "accepted"
                      ? "border-emerald-300 bg-emerald-50"
                      : decision === "rejected"
                        ? "border-rose-300 bg-rose-50"
                        : lowConfidence
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      {conf?.label && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${confidenceBadgeClass(
                            conf.label,
                          )}`}
                        >
                          {conf.label.toUpperCase()} ({pct}%)
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sourceBadgeClass(
                          reconciliationSource,
                        )}`}
                      >
                        {sourceLabel(reconciliationSource)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-800 dark:text-slate-100">{value || "-"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => sendFieldReviewDecision(key, "accepted")}
                      disabled={isLoading || !String(value || "").trim()}
                      className="rounded-md border border-emerald-400 bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-900 disabled:opacity-50"
                    >
                      {isLoading && decision === "accepted" ? "Salvando..." : "Aceitar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => sendFieldReviewDecision(key, "rejected")}
                      disabled={isLoading || !String(value || "").trim()}
                      className="rounded-md border border-rose-400 bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-900 disabled:opacity-50"
                    >
                      {isLoading && decision === "rejected" ? "Salvando..." : "Rejeitar"}
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2">
              <label
                htmlFor="fieldFeedbackCorrectionNote"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Observacao de correcao (opcional para campos rejeitados)
              </label>
              <textarea
                id="fieldFeedbackCorrectionNote"
                value={feedbackCorrectionNote}
                onChange={(e) => setFeedbackCorrectionNote(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Ex.: ajustar diagnostico para sindrome colica em observacao..."
              />
            </div>
          </div>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={() => scrollToStep("salvar")}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
          >
            Continuar para salvar
          </button>
        )}
      </div>

      <div
        ref={saveSectionRef}
        className="rounded-xl border border-gray-200 bg-white p-3 sm:p-5 lg:p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Parametros vitais (edicao manual)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Peso (kg)</label>
            <input
              id="fieldWeight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Temperatura (C)</label>
            <input
              id="fieldTemperature"
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequencia cardiaca (bpm)</label>
            <input
              id="fieldHeartRate"
              type="number"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Frequencia respiratoria (mpm)</label>
            <input
              id="fieldRespiratoryRate"
              type="number"
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base sm:text-sm"
            />
          </div>
        </div>

        <div className="h-3" />
      </div>

      </>
      )}

      <FloatingFormActions
        maxWidthClass="max-w-4xl"
        mobileSticky
        desktopFloating={false}
      >
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving || analyzing}
            className="btn btn-success btn-lg btn-block min-h-[48px] sm:min-h-[52px] text-sm sm:text-base"
          >
            {saving && <LoadingDot />}
            {saving ? "Salvando..." : "Salvar consulta"}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving || analyzing}
            className="btn btn-primary btn-lg btn-block min-h-[48px] sm:min-h-[52px] text-sm sm:text-base"
          >
            {saving && <LoadingDot />}
            {saving ? "Processando..." : "Salvar + gerar receita"}
          </button>
          <button
            type="button"
            onClick={goToManualEditor}
            className="btn btn-neutral btn-lg btn-block min-h-[48px] sm:min-h-[52px] text-sm sm:text-base"
          >
            Editar manualmente
          </button>
          <button
            type="button"
            onClick={clearCapturedData}
            className="btn btn-neutral btn-lg btn-block min-h-[48px] sm:min-h-[52px] text-sm sm:text-base"
          >
            Limpar capturas
          </button>
        </div>
      </FloatingFormActions>

      {showPorteChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={porteChoiceTitleId}
            aria-describedby={porteChoiceDescriptionId}
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
          >
            <h3 id={porteChoiceTitleId} className="text-base font-bold text-gray-900">Confirmar porte do paciente</h3>
            <p id={porteChoiceDescriptionId} className="mt-1 text-sm text-gray-600">
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

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={closeSignatureModal}
        onSave={saveSignature}
        title="Assinatura do tutor"
      />
    </div>
  );
};

export default FieldModeConsultation;
