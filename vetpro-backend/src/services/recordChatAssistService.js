const fs = require("fs");
const path = require("path");

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const EXAMPLES_FILE_PATH = path.join(__dirname, "..", "ai", "recordChatExamples.json");
let examplesCache = null;
let examplesCacheMtime = 0;

function safeReadExamplesFile() {
  if (!fs.existsSync(EXAMPLES_FILE_PATH)) return [];

  try {
    const stat = fs.statSync(EXAMPLES_FILE_PATH);
    const mtime = Number(stat.mtimeMs || 0);
    if (examplesCache && mtime === examplesCacheMtime) {
      return examplesCache;
    }

    const raw = fs.readFileSync(EXAMPLES_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.examples) ? parsed.examples : [];
    examplesCache = list;
    examplesCacheMtime = mtime;
    return list;
  } catch (error) {
    console.error("Falha ao carregar exemplos de IA:", error.message);
    return [];
  }
}

function tokenizeForSimilarity(text = "") {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function jaccardSimilarityScore(a = "", b = "") {
  const ta = new Set(tokenizeForSimilarity(a));
  const tb = new Set(tokenizeForSimilarity(b));
  if (!ta.size || !tb.size) return 0;

  let intersection = 0;
  ta.forEach((token) => {
    if (tb.has(token)) intersection += 1;
  });

  const union = new Set([...ta, ...tb]).size || 1;
  return Number((intersection / union).toFixed(4));
}

function selectFewShotExamples({ mode = "nova", porte = "pequeno", sourceText = "", maxExamples = 3 }) {
  const pool = safeReadExamplesFile();
  if (!pool.length) return [];

  const normalizedMode = mode === "retorno" ? "retorno" : "nova";
  const normalizedPorte = porte === "grande" ? "grande" : "pequeno";

  const scored = pool
    .filter((example) => {
      const eMode = String(example?.mode || "nova").toLowerCase();
      const ePorte = String(example?.porte || "pequeno").toLowerCase();
      return eMode === normalizedMode && ePorte === normalizedPorte;
    })
    .map((example) => {
      const score = jaccardSimilarityScore(sourceText, String(example?.input || ""));
      return { example, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, Math.max(0, maxExamples)).map((entry) => entry.example);
}

const SPECIES_PROFILES = [
  {
    id: "canino",
    aliases: ["canino", "cachorro", "cao", "dog"],
    clinicalKeywords: ["claudicacao", "otite", "prurido", "vomito", "diarreia"]
  },
  {
    id: "felino",
    aliases: ["felino", "gato", "cat"],
    clinicalKeywords: ["estranguria", "disuria", "apatia", "vomito", "diarreia"]
  },
  {
    id: "ave",
    aliases: ["ave", "aves", "passaro", "psitacideo"],
    clinicalKeywords: ["prostracao", "dispneia", "penugem", "bicada", "regurgitacao"]
  },
  {
    id: "equino",
    aliases: ["equino", "equina", "cavalo", "egua"],
    clinicalKeywords: ["colica", "laminite", "claudicacao", "taquipneia"]
  },
  {
    id: "bovino",
    aliases: ["bovino", "bovina", "boi", "vaca", "bezerro"],
    clinicalKeywords: ["ruminacao", "timpanismo", "mastite", "hiporexia"]
  }
];

const SPECIFIC_FIELDS_BY_PORTE = {
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
    "currentSupplements"
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
    "requestedExamPanel"
  ]
};

const SPECIFIC_FIELD_LABELS = {
  vaccinationStatus: ["vacinacao", "vacina em dia"],
  vaccinationProtocol: ["protocolo vacinal"],
  lastVaccines: ["ultimas vacinas", "vacinas aplicadas"],
  dewormingStatus: ["vermifugacao", "vermifugo"],
  ectoparasiteControl: ["ectoparasita", "pulga", "carrapato"],
  diet: ["dieta", "alimentacao"],
  rationBrand: ["racao", "marca da racao"],
  feedingFrequency: ["frequencia alimentar", "refeicoes por dia"],
  waterIntakeSmall: ["ingestao de agua", "consumo de agua"],
  housing: ["ambiente", "domicilio"],
  lifestyle: ["estilo de vida", "atividade"],
  contactWithAnimals: ["contato com outros animais"],
  reproductiveStatusSmall: ["estado reprodutivo", "castrado"],
  preventiveCare: ["preventivos", "preventivo"],
  behavior: ["comportamento"],
  allergyHistory: ["historico alergico", "alergia"],
  chronicDiseases: ["doencas cronicas", "comorbidades"],
  currentSupplements: ["suplementos", "suplementacao"],
  farmName: ["propriedade", "fazenda", "sitio"],
  productionSystem: ["sistema de producao", "tipo de criacao"],
  animalFunction: ["finalidade zootecnica", "funcao do animal", "uso do animal"],
  batch: ["lote"],
  animalId: ["identificacao do animal", "brinco", "chip", "registro"],
  bodyConditionScore: ["escore corporal", "ecc"],
  reproductiveStatus: ["estado reprodutivo", "prenhez"],
  daysInMilk: ["dias em lactacao", "del"],
  parity: ["numero de partos", "paridade"],
  herdVaccination: ["vacinacao do rebanho"],
  herdDeworming: ["vermifugacao do rebanho"],
  forage: ["volumoso", "silagem", "feno", "pasto"],
  concentrate: ["concentrado"],
  waterIntake: ["consumo de agua", "ingestao de agua"],
  mineralSupplementation: ["suplementacao mineral", "sal mineral"],
  hoofStatus: ["casco", "locomocao", "claudicacao"],
  rumenMotility: ["motilidade ruminal", "ruminacao"],
  fecesAndUrine: ["fezes", "urina"],
  milkProduction: ["producao de leite"],
  historicalDiseases: ["historico sanitario", "historico de doencas"],
  propertyAndManagement: ["propriedade e manejo", "manejo"],
  contactAnimals: ["contactantes", "animais contactantes"],
  animalIdentificationDetails: ["animal atendido", "identificacao detalhada"],
  neonateAndReproduction: ["neonato", "reproducao"],
  previousTreatmentHistory: ["tratamento anterior", "historico de tratamento"],
  physicalExamDetailed: ["exame fisico detalhado", "avaliacao do atendimento"],
  requestedExamPanel: ["exames complementares", "exames solicitados"]
};

function classifyPorteFromContext(patient = null, sourceText = "", recordProfile = null) {
  const profilePorte = String(recordProfile?.porte || "").trim().toLowerCase();
  if (profilePorte === "grande" || profilePorte === "pequeno") return profilePorte;

  const source = normalize(
    `${patient?.species || patient?.specie || ""} ${patient?.breed || ""} ${sourceText || ""}`
  );
  const largeSignals = ["equino", "bovino", "caprino", "ovino", "suino", "bufalo", "rebanho", "fazenda"];
  if (largeSignals.some((signal) => source.includes(signal))) return "grande";
  return "pequeno";
}

function resolveSpecificFieldKeys(recordProfile = null, porte = "pequeno") {
  const configuredKeys = Array.isArray(recordProfile?.specificFieldKeys)
    ? recordProfile.specificFieldKeys.filter((key) => typeof key === "string" && key.trim())
    : [];
  if (configuredKeys.length) return configuredKeys;
  return SPECIFIC_FIELDS_BY_PORTE[porte] || SPECIFIC_FIELDS_BY_PORTE.pequeno;
}

function sanitizeSpecificFields(raw = {}, allowedKeys = []) {
  const source = raw && typeof raw === "object" ? raw : {};
  return allowedKeys.reduce((acc, key) => {
    const value = String(source[key] || "").trim();
    acc[key] = value;
    return acc;
  }, {});
}

function extractSpecificFieldsHeuristic(sourceText = "", allowedKeys = []) {
  const output = {};
  const stopLabels = Object.values(SPECIFIC_FIELD_LABELS).flat();

  for (const key of allowedKeys) {
    const labels = SPECIFIC_FIELD_LABELS[key] || [];
    if (!labels.length) {
      output[key] = "";
      continue;
    }

    const extracted = extractByLabels(sourceText, labels, stopLabels) || extractByKeywords(sourceText, labels);
    output[key] = normalizeSpecificValueByKey(key, extracted);
  }

  return output;
}

function buildMissingFields(draft, specificFieldKeys = []) {
  const requiredCore = ["chiefComplaint", "anamnesis", "physicalExam", "diagnosis", "treatment"];
  const missingCore = requiredCore.filter((field) => !String(draft?.[field] || "").trim());
  const specific = draft?.specificFields || {};
  const missingSpecific = specificFieldKeys.filter((key) => !String(specific[key] || "").trim());
  return {
    core: missingCore,
    specific: missingSpecific
  };
}

function extractByKeywords(sourceText, keywords) {
  const text = String(sourceText || "").trim();
  if (!text) return "";

  const normalized = normalize(text);
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
    "observacao"
  ];

  for (const keyword of keywords) {
    const idx = normalized.indexOf(normalize(keyword));
    if (idx < 0) continue;

    const originalSlice = text
      .slice(idx + keyword.length)
      .replace(/^\s*[:\-.]?\s*/, "")
      .trim();
    const normalizedSlice = normalize(originalSlice);
    let cutIndex = originalSlice.length;

    for (const token of stopTokens) {
      const stopIdx = normalizedSlice.indexOf(token);
      if (stopIdx > 0 && stopIdx < cutIndex) {
        cutIndex = stopIdx;
      }
    }

    return originalSlice.slice(0, cutIndex).trim();
  }

  return "";
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ACCENT_CHAR_CLASS = {
  a: "[aáàâã]",
  e: "[eéèê]",
  i: "[iíìî]",
  o: "[oóòôõ]",
  u: "[uúùû]",
  c: "[cç]",
  n: "[nñ]"
};

function accentAgnosticPattern(value = "") {
  return escapeRegex(value)
    .split("")
    .map((char) => ACCENT_CHAR_CLASS[char.toLowerCase()] || char)
    .join("");
}

function extractByLabels(sourceText, labels = [], stopLabels = []) {
  const text = String(sourceText || "").trim();
  if (!text || !labels.length) return "";

  const labelPattern = labels.map(accentAgnosticPattern).join("|");
  const stopPattern = stopLabels.length
    ? stopLabels.map(accentAgnosticPattern).join("|")
    : null;

  const regex = stopPattern
    ? new RegExp(
      `(?:^|\\b)(?:${labelPattern})\\s*[:\\-]?\\s*([\\s\\S]*?)(?=(?:\\b(?:${stopPattern})\\s*[:\\-]?)|$)`,
      "i"
    )
    : new RegExp(`(?:^|\\b)(?:${labelPattern})\\s*[:\\-]?\\s*([\\s\\S]*)`, "i");

  const match = text.match(regex);
  if (!match?.[1]) return "";
  return match[1].replace(/\s+/g, " ").trim();
}

function firstSentence(text = "", limit = 180) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const split = clean.split(/[.!?]\s/)[0] || clean;
  return split.slice(0, limit).trim();
}

const CLINICAL_SIGNAL_TERMS = [
  "apatia",
  "prostracao",
  "preguicos",
  "letarg",
  "vomit",
  "diarre",
  "dor",
  "claudic",
  "coce",
  "prurid",
  "apetite",
  "hiporexia",
  "anorexia",
  "polidips",
  "poliur",
  "febre",
  "tosse",
  "espirro",
  "perda de peso",
  "ganho de peso"
];

const SOCIAL_ONLY_TERMS = [
  "ola",
  "oi",
  "bom dia",
  "boa tarde",
  "boa noite",
  "como vai",
  "tudo bem"
];

function splitConversationSentences(text = "") {
  return String(text || "")
    .replace(/\r/g, " ")
    .split(/[\n.!?]+/g)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitDialogueLines(text = "") {
  const normalizedText = String(text || "")
    .replace(/\r/g, "")
    .replace(
      /\b(tutor|responsavel|proprietario|proprietária|vet|veterinario|veterinário|medico|medico veterinario|medico veterinário|dra|dr)\s*:/gi,
      "\n$1:"
    );

  return normalizedText
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function scoreTutorLine(line = "") {
  const normalized = normalize(line);
  if (!normalized) return 0;
  let score = 0;
  if (/^(tutor|responsavel|proprietario)\s*:/.test(normalized)) score += 6;
  const tutorSignals = [
    "notei",
    "percebi",
    "ele",
    "ela",
    "meu",
    "minha",
    "em casa",
    "anda",
    "apetite",
    "vomito",
    "diarreia",
    "preguic",
    "apatia",
    "nao come",
    "nao bebe",
    "nao esta",
    "nao ta",
    "parece"
  ];
  for (const token of tutorSignals) {
    if (normalized.includes(token)) score += 2;
  }
  if (/\bdr\b|\bdra\b|\bdoutor\b|\bdoutora\b/.test(normalized)) score += 1;
  if (/\b(obrigado|obrigada)\b/.test(normalized)) score += 1;
  return score;
}

function scoreVetLine(line = "") {
  const normalized = normalize(line);
  if (!normalized) return 0;
  let score = 0;
  if (/^(vet|veterinario|medico|dra|dr)\s*:/.test(normalized)) score += 6;
  const vetSignals = [
    "entendi",
    "vamos",
    "no exame",
    "ao exame",
    "observamos",
    "suspeita",
    "diagnostico",
    "conduta",
    "tratamento",
    "prescrev",
    "retorno",
    "reavaliar",
    "colocar na balanca",
    "manter o peso",
    "prevenir"
  ];
  for (const token of vetSignals) {
    if (normalized.includes(token)) score += 2;
  }
  if (/\bdr\b|\bdra\b|\bdoutor\b|\bdoutora\b/.test(normalized)) score -= 1;
  return score;
}

function splitDialogueByRole(text = "") {
  const lines = splitDialogueLines(text);
  if (!lines.length) {
    return {
      tutorText: "",
      vetText: "",
      unknownText: "",
      turns: []
    };
  }

  let lastRole = "Tutor";
  const turns = lines.map((line) => {
    const tutorScore = scoreTutorLine(line);
    const vetScore = scoreVetLine(line);
    let role = "Unknown";

    if (tutorScore > vetScore) role = "Tutor";
    else if (vetScore > tutorScore) role = "Medico";
    else role = lastRole;

    lastRole = role === "Unknown" ? lastRole : role;
    return { role, text: line };
  });

  const tutorText = turns
    .filter((turn) => turn.role === "Tutor")
    .map((turn) => turn.text)
    .join(" ")
    .trim();
  const vetText = turns
    .filter((turn) => turn.role === "Medico")
    .map((turn) => turn.text)
    .join(" ")
    .trim();
  const unknownText = turns
    .filter((turn) => turn.role === "Unknown")
    .map((turn) => turn.text)
    .join(" ")
    .trim();

  return { tutorText, vetText, unknownText, turns };
}

function isLikelySocialOnlySentence(sentence = "") {
  const normalized = normalize(sentence);
  if (!normalized) return true;
  if (normalized.length <= 8 && SOCIAL_ONLY_TERMS.some((token) => normalized.includes(token))) {
    return true;
  }
  if (SOCIAL_ONLY_TERMS.some((token) => normalized === token)) return true;
  if (/^(dr|dra|doutor|doutora)\b/.test(normalized)) return true;
  return false;
}

function scoreClinicalComplaintSentence(sentence = "") {
  const normalized = normalize(sentence);
  if (!normalized) return -10;

  let score = 0;
  for (const token of CLINICAL_SIGNAL_TERMS) {
    if (normalized.includes(token)) score += 3;
  }

  if (/\b(notei|tutor|relata|anda|parece|apresenta|mudanc|aumentou|diminuiu)\b/.test(normalized)) score += 2;
  if (/\b(vamos|manter|prevenir|balanca|check-?up)\b/.test(normalized) && score < 3) score -= 2;
  if (isLikelySocialOnlySentence(sentence)) score -= 4;

  return score;
}

function extractClinicalComplaintFromConversation(text = "", limit = 220) {
  const sentences = splitConversationSentences(text);
  if (!sentences.length) return "";

  const scored = sentences
    .map((sentence) => ({ sentence, score: scoreClinicalComplaintSentence(sentence) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best && best.score > 0) {
    return best.sentence.slice(0, limit).trim();
  }

  const fallback = sentences.find((sentence) => !isLikelySocialOnlySentence(sentence)) || sentences[0];
  return String(fallback || "").slice(0, limit).trim();
}

function extractReturnPhrase(sourceText = "") {
  const text = String(sourceText || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const match = text.match(/\b(reavaliar(?:\s+em)?[^.!?\n]*|retorno[^.!?\n]*|reavaliacao[^.!?\n]*)/i);
  return String(match?.[1] || "").trim();
}

function toSentence(text = "") {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const first = clean.charAt(0).toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(first) ? first : `${first}.`;
}

function normalizeHours(text = "") {
  return String(text || "").replace(/\b(\d+)\s*h\b/gi, "$1 horas");
}

function containsAny(text = "", terms = []) {
  const content = normalize(text);
  return terms.some((term) => content.includes(normalize(term)));
}

function extractSentenceFromTriggers(sourceText = "", triggers = []) {
  const text = String(sourceText || "").replace(/\s+/g, " ").trim();
  if (!text || !triggers.length) return "";
  const triggerPattern = triggers.map(accentAgnosticPattern).join("|");
  const regex = new RegExp(`(?:\\b(?:${triggerPattern})\\b)\\s*[:\\-]?\\s*([^.!?\\n]+)`, "i");
  const match = text.match(regex);
  if (!match?.[1]) return "";
  return toSentence(match[1]);
}

function extractClinicalSentenceByTerms(sourceText = "", terms = []) {
  const sentences = splitConversationSentences(sourceText);
  if (!sentences.length || !terms.length) return "";

  const normalizedTerms = terms.map((term) => normalize(term));
  const scored = sentences
    .map((sentence) => {
      const normalizedSentence = normalize(sentence);
      let hits = 0;
      for (const term of normalizedTerms) {
        if (normalizedSentence.includes(term)) hits += 1;
      }
      const score = hits - (isLikelySocialOnlySentence(sentence) ? 2 : 0);
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score <= 0) return "";
  return toSentence(scored[0].sentence);
}

function buildHeuristicDiagnosis(value = "") {
  const clean = normalizeHours(value);
  if (!clean) return "";
  const lower = normalize(clean);
  if (lower.startsWith("suspeita")) {
    const withoutKeyword = clean.replace(/^\s*suspeita\s*[:\-]?\s*/i, "").trim();
    if (!withoutKeyword) return "Suspeita diagnostica a esclarecer.";
    if (/^de\b/i.test(withoutKeyword)) return toSentence(`Suspeita ${withoutKeyword}`);
    return toSentence(`Suspeita de ${withoutKeyword}`);
  }
  if (/\binflamatori/i.test(lower) && !/\bsuspeita/i.test(lower)) {
    return "Suspeita de processo inflamatorio.";
  }
  return toSentence(clean);
}

function buildHeuristicTreatment(value = "") {
  const clean = normalizeHours(value);
  if (!clean) return "";
  const lower = normalize(clean);
  if (lower.startsWith("conduta")) {
    return toSentence(clean.replace(/^\s*conduta\s*[:\-]?\s*/i, ""));
  }
  return toSentence(clean);
}

function buildHeuristicAnamnesis(current = "", chiefComplaint = "") {
  if (String(current || "").trim()) return toSentence(current);
  const complaint = String(chiefComplaint || "").trim();
  if (!complaint) return "";
  return toSentence(`Tutor relata ${complaint.charAt(0).toLowerCase()}${complaint.slice(1)}`);
}

function buildHeuristicReturnRecommendation(value = "", treatment = "") {
  const fromValue = normalizeHours(value);
  if (String(fromValue).trim()) return toSentence(fromValue);

  const treatmentText = normalizeHours(treatment);
  const match = treatmentText.match(/\b(reavaliar(?:\s+em)?[^.!?\n]*)/i);
  if (match?.[1]) return toSentence(match[1]);
  return "";
}

function detectSpeciesProfile(patient = null, sourceText = "") {
  const patientSpecies = normalize(patient?.species || patient?.specie || "");
  const patientBreed = normalize(patient?.breed || "");
  const source = normalize(sourceText);

  for (const profile of SPECIES_PROFILES) {
    if (profile.aliases.some((alias) => patientSpecies.includes(alias) || patientBreed.includes(alias))) {
      return profile;
    }
  }

  for (const profile of SPECIES_PROFILES) {
    if (profile.aliases.some((alias) => source.includes(alias))) {
      return profile;
    }
  }

  return null;
}

function titleByMode(mode = "nova") {
  if (mode === "retorno") return "Consulta de retorno";
  if (mode === "emergencia") return "Atendimento emergencial";
  return "Consulta clinica";
}

function applyModeTemplate(draft, mode = "nova") {
  const next = { ...draft };

  if (!next.chiefComplaint) {
    next.chiefComplaint = mode === "retorno"
      ? "Retorno para reavaliacao da evolucao clinica."
      : mode === "emergencia"
        ? "Atendimento emergencial para estabilizacao inicial."
        : "Avaliacao clinica inicial.";
  }

  if (!next.anamnesis && next.chiefComplaint) {
    if (mode === "retorno") {
      next.anamnesis = `Tutor relata evolucao desde a consulta anterior: ${next.chiefComplaint.charAt(0).toLowerCase()}${next.chiefComplaint.slice(1)}`;
    } else {
      next.anamnesis = `Tutor relata ${next.chiefComplaint.charAt(0).toLowerCase()}${next.chiefComplaint.slice(1)}`;
    }
  }

  if (!next.physicalExam && mode === "emergencia") {
    next.physicalExam = "Exame fisico inicial focado em estabilizacao do paciente.";
  }

  return next;
}

function scoreFieldConfidence(fieldName, value, speciesProfile = null) {
  const text = String(value || "").trim();
  if (!text) return 0.12;

  const normalized = normalize(text);
  let score = 0.45;

  const length = text.length;
  if (length >= 20) score += 0.12;
  if (length >= 45) score += 0.12;
  if (length >= 80) score += 0.08;
  if (/[.!?]$/.test(text)) score += 0.05;

  const fieldKeywords = {
    chiefComplaint: ["dor", "febre", "apatia", "vomito", "diarreia", "dispneia", "tosse"],
    anamnesis: ["tutor", "evolucao", "historico", "inicio", "dias", "semanas"],
    physicalExam: ["temperatura", "fc", "fr", "mucosa", "palpacao", "ausculta", "hidratacao"],
    diagnosis: ["suspeita", "diagnostico", "quadro", "processo", "sindrome"],
    treatment: ["conduta", "tratamento", "analges", "antibiot", "suporte", "monitorar"],
    procedures: ["procedimento", "realizado", "sutura", "curativo", "coleta", "drenagem"],
    medications: ["mg", "ml", "via", "oral", "im", "iv", "sc", "dose"],
    examDetails: ["exame", "hemograma", "rx", "ultrassom", "sorologia", "cultura"],
    returnRecommendation: ["retorno", "reavaliar", "horas", "dias"]
  };

  const keywords = fieldKeywords[fieldName] || [];
  if (keywords.some((keyword) => normalized.includes(keyword))) score += 0.14;
  if (speciesProfile && speciesProfile.clinicalKeywords.some((keyword) => normalized.includes(keyword))) {
    score += 0.06;
  }

  return Math.min(0.97, Math.max(0.12, Number(score.toFixed(2))));
}

function buildConfidenceByField(draft, speciesProfile = null, specificFieldKeys = []) {
  const byField = {
    chiefComplaint: scoreFieldConfidence("chiefComplaint", draft.chiefComplaint, speciesProfile),
    anamnesis: scoreFieldConfidence("anamnesis", draft.anamnesis, speciesProfile),
    physicalExam: scoreFieldConfidence("physicalExam", draft.physicalExam, speciesProfile),
    diagnosis: scoreFieldConfidence("diagnosis", draft.diagnosis, speciesProfile),
    treatment: scoreFieldConfidence("treatment", draft.treatment, speciesProfile),
    procedures: scoreFieldConfidence("procedures", draft.procedures, speciesProfile),
    medications: scoreFieldConfidence("medications", draft.medications, speciesProfile),
    examDetails: scoreFieldConfidence("examDetails", draft.examDetails, speciesProfile),
    returnRecommendation: scoreFieldConfidence("returnRecommendation", draft.returnRecommendation, speciesProfile)
  };

  if (Array.isArray(specificFieldKeys) && specificFieldKeys.length > 0) {
    const specificFields = draft?.specificFields || {};
    const specificScores = specificFieldKeys.map((key) =>
      scoreFieldConfidence("notes", String(specificFields[key] || ""), speciesProfile)
    );
    byField.specificFields = specificScores.length
      ? Number((specificScores.reduce((sum, value) => sum + value, 0) / specificScores.length).toFixed(2))
      : 0.12;
  }

  const values = Object.values(byField);
  const overall = values.length
    ? Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2))
    : 0.2;

  return { byField, overall };
}

function parseJsonObject(rawText = "") {
  const text = String(rawText || "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function ensureDraftShape(raw = {}, mode = "nova", allowedSpecificFieldKeys = [], porte = "pequeno") {
  const consultationType = mode === "retorno" ? "retorno" : "nova";
  const rawSpecific = raw.specificFields || raw.specific_fields || {};
  const specificFields = sanitizeSpecificFields(rawSpecific, allowedSpecificFieldKeys);

  return {
    consultationType,
    chiefComplaint: String(raw.chiefComplaint || raw.queixa || "").trim(),
    anamnesis: String(raw.anamnesis || raw.anamnese || "").trim(),
    physicalExam: String(raw.physicalExam || raw.exameFisico || "").trim(),
    diagnosis: String(raw.diagnosis || raw.diagnostico || "").trim(),
    treatment: String(raw.treatment || raw.conduta || "").trim(),
    procedures: String(raw.procedures || raw.procedimento || "").trim(),
    medications: String(raw.medications || raw.medicacao || "").trim(),
    examDetails: String(raw.examDetails || raw.examesSolicitados || raw.examRequested || "").trim(),
    notes: String(raw.notes || raw.observations || "").trim(),
    returnRecommendation: String(raw.returnRecommendation || raw.recomendacaoRetorno || "").trim(),
    porte: porte === "grande" ? "grande" : "pequeno",
    specificFields
  };
}

function buildHeuristicDraft(messages = [], mode = "nova", patient = null, recordProfile = null) {
  const sourceText = messages
    .map((item) => String(item?.content || ""))
    .join(" ")
    .trim();
  const dialogue = splitDialogueByRole(
    messages.map((item) => String(item?.content || "")).join("\n")
  );
  const tutorContext = (dialogue.tutorText || sourceText).trim();
  const vetContext = (dialogue.vetText || sourceText).trim();
  const speciesProfile = detectSpeciesProfile(patient, sourceText);
  const porte = classifyPorteFromContext(patient, sourceText, recordProfile);
  const specificFieldKeys = resolveSpecificFieldKeys(recordProfile, porte);

  const stopLabels = [
    "queixa",
    "motivo",
    "anamnese",
    "historico",
    "exame fisico",
    "diagnostico",
    "suspeita",
    "tratamento",
    "conduta",
    "medicacao",
    "prescrito",
    "prescrevi",
    "prescrever",
    "prescricao",
    "receita",
    "exame solicitado",
    "solicitei",
    "solicitado",
    "retorno",
    "reavaliacao",
    "reavaliar",
    "observacao"
  ];

  const explicitChiefComplaint = extractByKeywords(tutorContext || sourceText, ["queixa", "motivo da consulta", "motivo"]);
  const chiefSource = explicitChiefComplaint ||
    tutorContext.split(/\b(?:conduta|tratamento|diagnostico|suspeita|medicacao|prescricao|receita|retorno|reavaliacao|reavaliar)\b/i)[0];
  const clinicalChiefComplaint = extractClinicalComplaintFromConversation(chiefSource || tutorContext || sourceText, 220);

  const diagnosisByLabel = extractByLabels(
    vetContext || sourceText,
    ["diagnostico", "suspeita diagnostica", "suspeita"],
    stopLabels
  );
  const treatmentByLabel = extractByLabels(
    vetContext || sourceText,
    ["conduta", "tratamento"],
    stopLabels.filter((label) => !["retorno", "reavaliacao", "reavaliar", "reavaliar em"].includes(label))
  );
  const medicationsByLabel = extractByLabels(
    vetContext || sourceText,
    ["medicacao", "prescricao", "receita", "prescrito", "prescrevi", "prescrever"],
    stopLabels
  );
  const proceduresByLabel = extractByLabels(
    vetContext || sourceText,
    ["procedimento", "procedimentos", "intervencao", "foi realizado", "realizado"],
    stopLabels
  );
  const examByLabel = extractByLabels(
    vetContext || sourceText,
    ["exame solicitado", "exames solicitados", "exame complementar", "solicitar exame", "solicitado exame", "solicitei", "solicitado"],
    stopLabels
  );

  const returnByLabel = extractByLabels(
    vetContext || sourceText,
    ["retorno", "reavaliacao", "reavaliar em", "reavaliar"],
    stopLabels
  );

  const explicitNotes = extractByKeywords(sourceText, ["observacao", "obs"]);
  const specificFields = extractSpecificFieldsHeuristic(sourceText, specificFieldKeys);

  const draftRaw = {
    chiefComplaint: clinicalChiefComplaint || firstSentence(chiefSource || sourceText, 220),
    anamnesis: buildHeuristicAnamnesis(
      extractByKeywords(tutorContext || sourceText, ["anamnese", "historico"]),
      clinicalChiefComplaint || firstSentence(chiefSource || sourceText, 220)
    ),
    physicalExam: extractByKeywords(vetContext || sourceText, ["exame fisico"]),
    diagnosis: buildHeuristicDiagnosis(
      diagnosisByLabel || extractByKeywords(vetContext || sourceText, ["diagnostico"])
    ),
    treatment: buildHeuristicTreatment(
      treatmentByLabel || extractByKeywords(vetContext || sourceText, ["tratamento", "conduta"])
    ),
    procedures: proceduresByLabel,
    medications: medicationsByLabel || extractByKeywords(vetContext || sourceText, ["medicacao", "prescricao", "receita"]),
    examDetails: examByLabel,
    notes: explicitNotes,
    returnRecommendation: buildHeuristicReturnRecommendation(
      extractReturnPhrase(vetContext || sourceText) ||
      returnByLabel ||
      extractByKeywords(vetContext || sourceText, ["retorno", "reavaliacao"]),
      treatmentByLabel || extractByKeywords(vetContext || sourceText, ["tratamento", "conduta"])
    ),
    specificFields,
    porte
  };

  if (!draftRaw.physicalExam) {
    draftRaw.physicalExam = extractClinicalSentenceByTerms(vetContext || sourceText, [
      "exame",
      "ao exame",
      "palpacao",
      "palpação",
      "mucosa",
      "ausculta",
      "linfonodo",
      "hiperemia",
      "edema",
      "temperatura",
      "desidratacao",
      "desidratação"
    ]);
  }

  if (!draftRaw.diagnosis) {
    draftRaw.diagnosis = buildHeuristicDiagnosis(
      extractClinicalSentenceByTerms(vetContext || sourceText, [
        "suspeita",
        "diagnostico",
        "diagnóstico",
        "quadro compativel",
        "quadro compatível",
        "provavel",
        "provável"
      ])
    );
  }

  if (!draftRaw.treatment) {
    draftRaw.treatment = buildHeuristicTreatment(
      extractClinicalSentenceByTerms(vetContext || sourceText, [
        "conduta",
        "tratamento",
        "orientado",
        "orientada",
        "recomendado",
        "recomendada",
        "instituido",
        "instituído",
        "suporte",
        "repouso"
      ])
    );
  }

  if (!draftRaw.procedures) {
    draftRaw.procedures = extractClinicalSentenceByTerms(vetContext || sourceText, [
      "procedimento",
      "coleta",
      "sondagem",
      "drenagem",
      "curativo",
      "cirurgia",
      "paaf",
      "citologia",
      "intervencao",
      "intervenção"
    ]);
  }

  if (!draftRaw.medications) {
    draftRaw.medications = extractClinicalSentenceByTerms(vetContext || sourceText, [
      "medicacao",
      "medicação",
      "prescricao",
      "prescrição",
      "prescrito",
      "antibiotico",
      "antibiótico",
      "anti-inflamatorio",
      "anti-inflamatório",
      "analgesico",
      "analgésico",
      "fluidoterapia"
    ]);
  }

  if (!draftRaw.examDetails) {
    draftRaw.examDetails = extractClinicalSentenceByTerms(vetContext || sourceText, [
      "solicitado",
      "solicitada",
      "solicitei",
      "exame",
      "hemograma",
      "ultrassom",
      "radiografia",
      "raio-x",
      "rx",
      "cultura",
      "sorologia",
      "urinalise",
      "urinálise"
    ]);
  }

  if (!draftRaw.procedures && containsAny(sourceText, ["procedimento", "sutura", "curativo", "drenagem", "coleta"])) {
    draftRaw.procedures = "Procedimento mencionado durante a consulta (revisar descricao).";
  }

  if (!draftRaw.examDetails && containsAny(sourceText, ["exame", "hemograma", "radiografia", "rx", "ultrassom", "sorologia", "cultura"])) {
    draftRaw.examDetails = "Exame complementar mencionado durante a consulta (revisar tipo).";
  }

  if (!draftRaw.medications) {
    const fromPrescriptionSentence = extractSentenceFromTriggers(sourceText, ["prescrito", "prescrevi", "prescrever", "medicacao"]);
    if (fromPrescriptionSentence) {
      draftRaw.medications = fromPrescriptionSentence;
    }
  }

  if (!draftRaw.examDetails) {
    const fromExamSentence = extractSentenceFromTriggers(sourceText, ["solicitei", "exame", "exames"]);
    if (fromExamSentence && containsAny(fromExamSentence, ["hemograma", "radiografia", "rx", "ultrassom", "sorologia", "cultura", "exame"])) {
      draftRaw.examDetails = fromExamSentence;
    }
  }

  if (!draftRaw.medications && containsAny(draftRaw.treatment, ["mg", "ml", "dose", "via", "analgesico", "antibiotico", "anti-inflamatorio", "dipirona", "amoxicilina"])) {
    draftRaw.medications = draftRaw.treatment;
  }

  for (const key of specificFieldKeys) {
    if (!String(draftRaw.specificFields?.[key] || "").trim()) {
      draftRaw.specificFields[key] = inferSpecificFieldValueFromContext(
        key,
        sourceText,
        draftRaw.chiefComplaint
      );
    }
  }

  const draftTemplated = applyModeTemplate(draftRaw, mode);
  const draft = ensureDraftShape(draftTemplated, mode, specificFieldKeys, porte);
  const confidence = buildConfidenceByField(draft, speciesProfile, specificFieldKeys);
  const missingFields = buildMissingFields(draft, specificFieldKeys);

  return {
    draft,
    provider: "heuristic",
    confidence: confidence.overall,
    confidenceByField: confidence.byField,
    missingFields,
    context: {
      modeTitle: titleByMode(mode),
      speciesProfile: speciesProfile?.id || "geral",
      porte,
      specificFieldKeys,
      dialogueTurnsDetected: dialogue.turns.length
    }
  };
}

function buildFieldExtractionGuide(porte = "pequeno") {
  const smallGuide = [
    "vaccinationStatus: status vacinal (em dia/atrasada/desconhecida).",
    "dewormingStatus: vermifugacao (produto/periodo).",
    "diet|rationBrand|feedingFrequency|waterIntakeSmall: alimentacao e agua.",
    "housing|lifestyle|contactWithAnimals: ambiente e convivencia.",
    "behavior|allergyHistory|chronicDiseases|preventiveCare|currentSupplements: historico preventivo."
  ].join(" ");

  const largeGuide = [
    "farmName|propertyAndManagement|productionSystem: identificar propriedade, tipo de criacao e manejo.",
    "animalId|animalIdentificationDetails|batch|animalFunction: identificar animal/lote e finalidade zootecnica.",
    "bodyConditionScore|reproductiveStatus|daysInMilk|parity: dados produtivos e reprodutivos com numero quando houver.",
    "forage|concentrate|waterIntake|mineralSupplementation: detalhar dieta de campo e acesso a agua/suplemento.",
    "hoofStatus|rumenMotility|fecesAndUrine|physicalExamDetailed: exame fisico e locomotor com foco funcional.",
    "milkProduction|historicalDiseases|previousTreatmentHistory|requestedExamPanel: historico, produtividade e exames."
  ].join(" ");

  return porte === "grande" ? largeGuide : smallGuide;
}

function buildPortePromptRules(porte = "pequeno", detailLevel = "standard") {
  if (porte !== "grande") {
    return "Para pequeno porte, mantenha linguagem clinica objetiva e foco em sinais do tutor, exame, diagnostico e conduta.";
  }

  const baseRules = [
    "PARA GRANDE PORTE, priorize raciocinio de campo com foco em produtividade e manejo.",
    "- Se houver termos de leite/lactacao, preencher productionSystem='Leite' e destacar impacto produtivo.",
    "- Quando existirem pistas numericas, registrar bodyConditionScore, daysInMilk, parity e quedas de producao.",
    "- Em physicalExamDetailed, resumir avaliacao funcional: locomocao/casco, motilidade digestiva, fezes/urina, hidratacao e dor.",
    "- Em treatment, combinar conduta clinica e orientacao de manejo sanitario/nutricional do lote.",
    "- Em requestedExamPanel, listar exames com prioridade de campo (CMT, cultura, copro, hemograma, ultrassom, etc).",
    "- Em casos de lote/rebanho, usar batch e contactAnimals para contextualizar risco coletivo."
  ];

  if (detailLevel === "max") {
    baseRules.push(
      "- MODO DETALHADO GRANDE PORTE: preencher o maximo possivel sem inventar; prefira frases curtas com semantica tecnica."
    );
  }

  return baseRules.join(" ");
}

function truncateText(value = "", limit = 220) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > limit ? `${clean.slice(0, limit - 1).trim()}.` : clean;
}

function trimBySentenceBoundary(value = "") {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const match = clean.match(/^(.+?[.;!?])\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/);
  if (match?.[1]) return match[1].trim();
  return clean;
}

function trimByPlanningTail(value = "") {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const markers = [
    " vou ",
    " vamos ",
    " irei ",
    " orient",
    " solicit",
    " colet",
    " prescrev",
    " retorno",
    " reavali"
  ];
  const normalized = normalize(` ${clean} `);
  let cut = clean.length;
  for (const marker of markers) {
    const idx = normalized.indexOf(marker);
    if (idx > 1 && idx - 1 < cut) cut = idx - 1;
  }
  return clean.slice(0, cut).trim();
}

function looksLikeNoisyConversation(value = "") {
  const normalized = normalize(value);
  if (!normalized) return false;
  const noiseTokens = [
    "ola",
    "oi",
    "bom dia",
    "boa tarde",
    "boa noite",
    "dr",
    "dra",
    "doutor",
    "doutora",
    "como vai",
    "entendi",
    "vamos"
  ];
  const noiseHits = noiseTokens.filter((token) => normalized.includes(token)).length;
  const sentenceCount = splitConversationSentences(value).length;
  return noiseHits >= 2 && sentenceCount >= 2;
}

function normalizeSpecificValueByKey(key, value = "") {
  let clean = truncateText(value, 240);
  const normalized = normalize(clean);
  if (!clean) return "";

  if (key === "vaccinationStatus") {
    if (normalized.includes("em dia")) return "Em dia";
    if (normalized.includes("atras")) return "Atrasada";
    if (normalized.includes("desconhec")) return "Desconhecida";
    return "";
  }

  if (key === "waterIntakeSmall") {
    if (normalized.includes("aument")) return "Aumentada";
    if (normalized.includes("diminu")) return "Diminuida";
    if (normalized.includes("normal")) return "Normal";
    return "";
  }

  if (key === "feedingFrequency") {
    const freq = clean.match(/(\d+\s*(x|vez|vezes))/i);
    return freq ? freq[1] : truncateText(clean, 60);
  }

  if (key === "rationBrand") {
    clean = trimByPlanningTail(trimBySentenceBoundary(clean));
    return truncateText(clean, 90);
  }

  if (key === "allergyHistory") {
    clean = trimByPlanningTail(trimBySentenceBoundary(clean));
    return truncateText(clean, 120);
  }

  if (["diet", "dewormingStatus", "ectoparasiteControl", "chronicDiseases"].includes(key)) {
    clean = trimByPlanningTail(trimBySentenceBoundary(clean));
    return truncateText(clean, 120);
  }

  if (["daysInMilk", "parity", "bodyConditionScore"].includes(key)) {
    const num = clean.match(/\d+[.,]?\d*/);
    return num ? num[0] : truncateText(clean, 40);
  }

  if (key === "behavior") {
    if (looksLikeNoisyConversation(clean)) {
      clean = extractClinicalComplaintFromConversation(clean, 180) || clean;
    }
    return truncateText(clean, 180);
  }

  if (["physicalExamDetailed", "propertyAndManagement", "previousTreatmentHistory"].includes(key)) {
    return truncateText(clean, 220);
  }

  return truncateText(clean, 140);
}

function inferSpecificFieldValueFromContext(key, sourceText = "", chiefComplaint = "") {
  const text = String(sourceText || "");
  const normalized = normalize(text);

  if (key === "behavior") {
    const fromComplaint = extractClinicalComplaintFromConversation(chiefComplaint || text, 180);
    return normalizeSpecificValueByKey(key, fromComplaint);
  }

  if (key === "vaccinationStatus") {
    if (/\b(vacina|vacinacao|vacinas)\b/.test(normalized) && /\bem dia\b/.test(normalized)) return "Em dia";
    if (/\b(vacina|vacinacao|vacinas)\b/.test(normalized) && /\b(atras|desatual|incomplet)\b/.test(normalized)) {
      return "Atrasada";
    }
  }

  if (key === "waterIntakeSmall") {
    if (/\b(polidips|bebe muita agua|ingestao aumentada|aumentou a agua)\b/.test(normalized)) return "Aumentada";
    if (/\b(nao bebe|recusa agua|ingestao reduzida|bebe pouco|desidrat)\b/.test(normalized)) return "Diminuida";
    if (/\b(agua normal|ingestao normal)\b/.test(normalized)) return "Normal";
  }

  if (key === "diet") {
    return normalizeSpecificValueByKey(
      key,
      extractClinicalSentenceByTerms(text, ["racao", "ração", "dieta", "alimentacao", "alimentação"])
    );
  }

  if (key === "ectoparasiteControl") {
    return normalizeSpecificValueByKey(
      key,
      extractClinicalSentenceByTerms(text, ["carrapato", "pulga", "ectoparasita"])
    );
  }

  if (key === "productionSystem") {
    if (/\b(lactacao|leite|producao leiteira)\b/.test(normalized)) return "Leite";
    if (/\b(corte|engorda)\b/.test(normalized)) return "Corte";
  }

  if (key === "milkProduction") {
    return normalizeSpecificValueByKey(
      key,
      extractClinicalSentenceByTerms(text, ["producao", "produção", "leiteira", "queda de producao", "queda de produção"])
    );
  }

  if (key === "hoofStatus") {
    return normalizeSpecificValueByKey(
      key,
      extractClinicalSentenceByTerms(text, ["casco", "claudicacao", "claudicação", "locomocao", "locomoção"])
    );
  }

  if (key === "fecesAndUrine") {
    return normalizeSpecificValueByKey(
      key,
      extractClinicalSentenceByTerms(text, ["fezes", "urina", "diarreia", "miccao", "micção"])
    );
  }

  if (key === "animalFunction") {
    if (/\b(esporte|trabalho)\b/.test(normalized)) return "Esporte";
    if (/\b(leite|lactacao)\b/.test(normalized)) return "Producao leiteira";
  }

  if (key === "batch") {
    return normalizeSpecificValueByKey(key, extractClinicalSentenceByTerms(text, ["lote", "rebanho"]));
  }

  if (key === "mineralSupplementation") {
    return normalizeSpecificValueByKey(
      key,
      extractClinicalSentenceByTerms(text, ["suplementacao mineral", "suplementação mineral", "sal mineral"])
    );
  }

  return "";
}

function pickSpecificFieldValue(key, aiValue = "", heuristicValue = "") {
  const aiNormalized = normalizeSpecificValueByKey(key, aiValue);
  const heuristicNormalized = normalizeSpecificValueByKey(key, heuristicValue);

  if (!aiNormalized && heuristicNormalized) return heuristicNormalized;
  if (!aiNormalized) return "";

  if (looksLikeNoisyConversation(aiValue)) {
    if (heuristicNormalized) return heuristicNormalized;
    if (key === "behavior") {
      const cleaned = extractClinicalComplaintFromConversation(aiValue, 180);
      return normalizeSpecificValueByKey(key, cleaned);
    }
  }

  return aiNormalized;
}

function mergeDraftsPreferAI(aiDraft, heuristicDraft, specificFieldKeys = [], mode = "nova", porte = "pequeno") {
  const ai = ensureDraftShape(aiDraft || {}, mode, specificFieldKeys, porte);
  const local = ensureDraftShape(heuristicDraft || {}, mode, specificFieldKeys, porte);
  const merged = { ...local, ...ai };

  const coreFields = [
    "chiefComplaint",
    "anamnesis",
    "physicalExam",
    "diagnosis",
    "treatment",
    "procedures",
    "medications",
    "examDetails",
    "notes",
    "returnRecommendation"
  ];

  for (const key of coreFields) {
    if (!String(merged[key] || "").trim()) {
      merged[key] = String(local[key] || "").trim();
    }
  }

  merged.specificFields = {};
  for (const key of specificFieldKeys) {
    merged.specificFields[key] = pickSpecificFieldValue(
      key,
      ai.specificFields?.[key] || "",
      local.specificFields?.[key] || ""
    );
  }

  return merged;
}

async function generateWithOpenAI({ messages, mode, patient, recordProfile = null }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const sourceText = messages.map((item) => String(item?.content || "")).join(" ");
  const dialogue = splitDialogueByRole(messages.map((item) => String(item?.content || "")).join("\n"));
  const tutorContext = dialogue.tutorText || sourceText;
  const vetContext = dialogue.vetText || sourceText;
  const porte = classifyPorteFromContext(patient, sourceText, recordProfile);
  const specificFieldKeys = resolveSpecificFieldKeys(recordProfile, porte);
  const patientContext = patient
    ? `Paciente: ${patient.name || ""}; especie: ${patient.species || ""}; raca: ${patient.breed || ""}; tutor: ${patient.ownerName || ""}.`
    : "";
  const specificKeysPrompt = specificFieldKeys.map((key) => `"${key}"`).join(", ");
  const detailLevel = String(recordProfile?.detailLevel || "standard").toLowerCase();
  const extractionGuide = buildFieldExtractionGuide(porte);
  const porteRules = buildPortePromptRules(porte, detailLevel);
  const normalizedChat = messages
    .map((m) => `${m?.role === "assistant" ? "ASSISTENTE" : "USUARIO"}: ${String(m?.content || "")}`)
    .join("\n");
  const maxFewShot = Math.max(
    0,
    Number.isFinite(Number(process.env.OPENAI_FEWSHOT_EXAMPLES))
      ? Number(process.env.OPENAI_FEWSHOT_EXAMPLES)
      : 3
  );
  const fewShotExamples = selectFewShotExamples({
    mode,
    porte,
    sourceText,
    maxExamples: maxFewShot
  });

  const systemPrompt = [
    "Voce e um assistente especializado em preenchimento de prontuario veterinario.",
    "OBJETIVO: extrair informacoes clinicas do dialogo e preencher corretamente os campos do prontuario.",
    "REGRAS CRITICAS:",
    "- Ignore saudacoes e conversa social sem valor clinico.",
    "- Priorize sinais relatados pelo tutor para queixa/anamnese.",
    "- Priorize condutas e observacoes tecnicas do veterinario para exame/diagnostico/tratamento.",
    "- Nao invente informacoes ausentes no texto.",
    "- Retorne SOMENTE JSON valido, sem markdown ou comentarios.",
    detailLevel === "max"
      ? "MODO DETALHADO: maximize completude com frases curtas e objetivas quando houver evidencia."
      : "Mantenha objetividade e nao invente dados.",
    `PORTE DO PACIENTE: ${porte}.`,
    `GUIA DE EXTRAÇÃO PARA ESTE PORTE: ${extractionGuide}`,
    `REGRAS ESPECIFICAS DE PORTE: ${porteRules}`,
    "Campos obrigatorios no JSON:",
    "{",
    '  "chiefComplaint": "string",',
    '  "anamnesis": "string",',
    '  "physicalExam": "string",',
    '  "diagnosis": "string",',
    '  "treatment": "string",',
    '  "procedures": "string",',
    '  "medications": "string",',
    '  "examDetails": "string",',
    '  "notes": "string",',
    '  "returnRecommendation": "string",',
    `  "porte": "${porte}",`,
    '  "specificFields": { ... }',
    "}",
    `No objeto "specificFields", use APENAS estas chaves: ${specificKeysPrompt}.`,
    "Para cada chave sem informacao no chat, retorne string vazia.",
    "Se algum campo nao existir no chat, mantenha string vazia.",
    `Tipo da consulta: ${mode === "retorno" ? "retorno" : "nova"}.`,
    patientContext,
    `CONTEXTO TUTOR: ${tutorContext}`,
    `CONTEXTO VETERINARIO: ${vetContext}`,
    `CHAT ORIGINAL:\n${normalizedChat}`,
    fewShotExamples.length
      ? `EXEMPLOS GUIA DISPONIVEIS: ${fewShotExamples.length}. Siga o formato de saída dos exemplos.`
      : ""
  ]
    .filter(Boolean)
    .join(" ");

  const completionMessages = [{ role: "system", content: systemPrompt }];

  fewShotExamples.forEach((example, index) => {
    const header = `EXEMPLO ${index + 1} (porte=${porte}, modo=${mode})`;
    completionMessages.push({
      role: "user",
      content: `${header}\nCONVERSA:\n${String(example.input || "")}\nRETORNE O JSON CONFORME REGRAS.`
    });
    completionMessages.push({
      role: "assistant",
      content: JSON.stringify(example.output || {}, null, 0)
    });
  });

  completionMessages.push(
    ...messages.map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content || "")
    }))
  );

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: completionMessages
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI ${response.status}: ${errText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || "";
  const parsed = parseJsonObject(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Resposta da IA sem JSON valido.");
  }

  return {
    draft: ensureDraftShape(parsed, mode, specificFieldKeys, porte),
    provider: "openai",
    confidence: 0.8,
    context: {
      porte,
      specificFieldKeys
    }
  };
}

async function generateRecordDraftFromChat({ messages, mode = "nova", patient = null, recordProfile = null }) {
  const safeMessages = Array.isArray(messages)
    ? messages.filter((m) => m && String(m.content || "").trim())
    : [];
  const sourceText = safeMessages.map((m) => String(m?.content || "")).join(" ");
  const porte = classifyPorteFromContext(patient, sourceText, recordProfile);
  const specificFieldKeys = resolveSpecificFieldKeys(recordProfile, porte);

  if (!safeMessages.length) {
    return {
      draft: ensureDraftShape({}, mode, specificFieldKeys, porte),
      provider: "none",
      confidence: 0,
      missingFields: buildMissingFields(
        ensureDraftShape({}, mode, specificFieldKeys, porte),
        specificFieldKeys
      ),
      context: {
        modeTitle: titleByMode(mode),
        speciesProfile: "geral",
        porte,
        specificFieldKeys
      }
    };
  }

  const speciesProfile = detectSpeciesProfile(patient, sourceText);
  const heuristic = buildHeuristicDraft(safeMessages, mode, patient, recordProfile);

  try {
    const ai = await generateWithOpenAI({
      messages: safeMessages,
      mode,
      patient,
      recordProfile
    });
    if (ai) {
      const mergedDraft = mergeDraftsPreferAI(
        ai.draft,
        heuristic.draft,
        specificFieldKeys,
        mode,
        porte
      );
      const confidence = buildConfidenceByField(mergedDraft, speciesProfile, specificFieldKeys);
      const missingFields = buildMissingFields(mergedDraft, specificFieldKeys);
      return {
        ...ai,
        draft: mergedDraft,
        confidence: ai.confidence || confidence.overall,
        confidenceByField: confidence.byField,
        missingFields,
        context: {
          modeTitle: titleByMode(mode),
          speciesProfile: speciesProfile?.id || "geral",
          porte,
          specificFieldKeys,
          mergedWithHeuristic: true
        }
      };
    }
  } catch (error) {
    console.error("Falha na geracao de rascunho via OpenAI:", error.message);
  }

  return heuristic;
}

function localRefineField(field, text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const first = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (["chiefComplaint", "anamnesis", "physicalExam", "diagnosis", "treatment", "notes"].includes(field)) {
    return /[.!?]$/.test(first) ? first : `${first}.`;
  }
  return first;
}

async function refineFieldWithOpenAI({ field, text, mode = "nova", patient = null }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const patientContext = patient
    ? `Paciente: ${patient.name || ""}; especie: ${patient.species || ""}; raca: ${patient.breed || ""}; tutor: ${patient.ownerName || ""}.`
    : "";

  const prompt = [
    "Voce e um assistente de redacao de prontuario veterinario.",
    `Refine o texto do campo ${field} mantendo significado clinico e sem inventar dados.`,
    `Tipo da consulta: ${mode === "retorno" ? "retorno" : "nova"}.`,
    patientContext,
    "Retorne apenas o texto final refinado."
  ]
    .filter(Boolean)
    .join(" ");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: String(text || "") }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI ${response.status}: ${errText}`);
  }

  const payload = await response.json();
  return String(payload?.choices?.[0]?.message?.content || "").trim();
}

async function refineRecordField({ field, text, mode = "nova", patient = null }) {
  if (!text || !String(text).trim()) {
    return { text: "", provider: "none", confidence: 0 };
  }

  try {
    const ai = await refineFieldWithOpenAI({ field, text, mode, patient });
    if (ai) {
      return { text: ai, provider: "openai", confidence: 0.82 };
    }
  } catch (error) {
    console.error("Falha no refinamento via OpenAI:", error.message);
  }

  return {
    text: localRefineField(field, text),
    provider: "heuristic",
    confidence: 0.5
  };
}

module.exports = {
  generateRecordDraftFromChat,
  refineRecordField
};
