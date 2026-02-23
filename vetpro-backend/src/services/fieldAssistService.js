const fs = require("fs");
const path = require("path");

const HEURISTIC_MEMORY_PATH = path.join(__dirname, "..", "ai", "heuristicMemory.json");
const DEBUG_DIR_PATH = path.join(__dirname, "..", "ai", "debug");
const MAX_MEMORY_ITEMS = 300;
const CLINICAL_CATEGORIES = [
  "queixa",
  "sintoma",
  "exame",
  "historico",
  "comportamento",
  "diagnostico",
  "conduta",
  "irrelevante"
];
const MEDICATION_TOKENS = [
  "dipirona",
  "flunixin",
  "meloxicam",
  "amoxic",
  "antibiot",
  "anti-inflam",
  "iv",
  "im",
  "vo",
  "mg",
  "ml",
  "ringer",
  "soro",
  "fluidoterapia"
];
const VET_ONTOLOGY = [
  {
    concept: "dor abdominal",
    canonical: "Dor abdominal com desconforto",
    aliases: ["rolar", "inquieto", "bate pata", "deita e levanta", "flanco", "colica", "cólica"]
  },
  {
    concept: "apetite diminuido",
    canonical: "Apetite diminuido",
    aliases: ["nao come", "não come", "come pouco", "sem apetite", "anorexia", "recusou alimento"]
  },
  {
    concept: "sinal febril",
    canonical: "Febre",
    aliases: ["febre", "temperatura alta", "hipertermia", "39.", "40."]
  },
  {
    concept: "desidratacao",
    canonical: "Possivel desidratacao",
    aliases: ["urina concentrada", "pouca agua", "ingestao de agua diminuida", "fezes ressecadas"]
  },
  {
    concept: "alteracao mucosa",
    canonical: "Mucosas alteradas",
    aliases: ["mucosa palida", "mucosa pálida", "icterica", "ictérica"]
  }
];

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractByKeywords(sourceText, keywords) {
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
    "observacao"
  ];

  for (const keyword of keywords) {
    const idx = normalized.indexOf(normalizeText(keyword));
    if (idx < 0) continue;

    const originalSlice = String(sourceText)
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
}

function splitIntoSentences(text = "") {
  return String(text || "")
    .replace(/\r/g, " ")
    .split(/[\n.!?;]+/g)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitSentencesWithMetadata(text = "", meta = {}) {
  const raw = String(text || "").replace(/\r/g, " ");
  const pieces = raw
    .split(/[\n.!?;]+/g)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return pieces.map((sentence, index) => ({
    sentence,
    index,
    ...meta
  }));
}

function detectSentenceCategory(sentence = "") {
  const normalized = normalizeText(sentence);
  if (!normalized) return { category: "irrelevante", confidence: 0 };

  const categoryTokens = {
    queixa: [
      "nao ta bem", "não tá bem", "queixa", "motivo", "veio porque", "principal",
      "hoje", "ontem", "desde"
    ],
    sintoma: [
      "dor", "febre", "vomit", "diarre", "apat", "prostr", "sem apetite", "nao come",
      "não come", "manco", "claudic", "coce", "prurido", "ingestao de agua", "agua diminu"
    ],
    exame: [
      "exame", "fc", "fr", "tpc", "mucosa", "ausculta", "palpac", "temperatura", "39.",
      "icter", "palida", "pálida", "rumen", "linfonodo"
    ],
    historico: [
      "historico", "histórico", "vacina", "vermif", "ja teve", "participou", "lote",
      "mormo", "aie", "tratamento anterior", "ha ", "há ", "meses", "dias"
    ],
    comportamento: [
      "comportamento", "inquieto", "agitado", "deitou", "rolou", "preguicoso", "preguiçoso",
      "mudou", "diferente", "sedentario", "ativo"
    ],
    diagnostico: [
      "suspeita", "diagnost", "pode ser", "provavel", "provável", "diferencial", "hipotese", "hipótese"
    ],
    conduta: [
      "conduta", "tratamento", "prescrev", "solicitei", "pedi", "coleta", "coletar", "reavaliar",
      "retorno", "internar", "hidrata", "medicar", "sonda"
    ]
  };

  const scored = CLINICAL_CATEGORIES.map((category) => {
    if (category === "irrelevante") return { category, score: 0 };
    const matches = (categoryTokens[category] || []).reduce(
      (sum, token) => (normalized.includes(token) ? sum + 1 : sum),
      0
    );
    return { category, score: matches };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score <= 0) return { category: "irrelevante", confidence: 0.2 };

  const confidence = Math.min(0.95, Number((0.35 + best.score * 0.15).toFixed(2)));
  return { category: best.category, confidence };
}

function normalizeClinicalConcepts(sentence = "") {
  const normalized = normalizeText(sentence);
  const concepts = [];
  for (const entry of VET_ONTOLOGY) {
    if (entry.aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      concepts.push(entry.canonical);
    }
  }
  return concepts;
}

function isMedicationSentence(sentence = "") {
  const normalized = normalizeText(sentence);
  return MEDICATION_TOKENS.some((token) => normalized.includes(token));
}

function createExtractionState() {
  return {
    queixa: [],
    sintoma: [],
    exame: [],
    historico: [],
    comportamento: [],
    diagnostico: [],
    conduta: [],
    medicacao: [],
    conceitos: []
  };
}

function pushUnique(bucket = [], text = "") {
  const value = String(text || "").trim();
  if (!value) return;
  const key = normalizeText(value);
  const exists = bucket.some((item) => normalizeText(item) === key);
  if (!exists) bucket.push(value);
}

function applySentenceToState(state, classifiedSentence) {
  const next = state || createExtractionState();
  const sentence = String(classifiedSentence?.text || "").trim();
  if (!sentence) return next;

  const category = classifiedSentence?.category || "irrelevante";
  const concepts = Array.isArray(classifiedSentence?.concepts) ? classifiedSentence.concepts : [];

  if (category !== "irrelevante" && Object.prototype.hasOwnProperty.call(next, category)) {
    pushUnique(next[category], sentence);
  }
  if (isMedicationSentence(sentence)) {
    pushUnique(next.medicacao, sentence);
  }
  concepts.forEach((concept) => pushUnique(next.conceitos, concept));

  return next;
}

function classifyAndExtractIncremental(segments = [], transcript = "") {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const sourceSentences = safeSegments.length
    ? safeSegments.flatMap((segment) =>
        splitSentencesWithMetadata(segment?.text || "", {
          stamp: segment?.stamp || "00:00",
          speaker: segment?.speaker || "Tutor"
        })
      )
    : splitSentencesWithMetadata(transcript, { stamp: "00:00", speaker: "Tutor" });

  const state = createExtractionState();
  const classified = sourceSentences.map((item, idx) => {
    const text = String(item?.sentence || "").trim();
    const categoryResult = detectSentenceCategory(text);
    const concepts = normalizeClinicalConcepts(text);
    const row = {
      id: idx + 1,
      stamp: item?.stamp || "00:00",
      speaker: item?.speaker || "Tutor",
      text,
      category: categoryResult.category,
      confidence: categoryResult.confidence,
      concepts
    };
    applySentenceToState(state, row);
    return row;
  });

  return { classified, state };
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function evaluateClinicalRules(transcript = "", extractionState = {}) {
  const normalized = normalizeText(transcript);
  const alerts = [];

  const hasShockPattern =
    (/tpc\s*([3-9]|[1-9]\d)/.test(normalized) || normalized.includes("tpc 3")) &&
    (normalized.includes("palida") || normalized.includes("pálida") || normalized.includes("icter"));
  if (hasShockPattern) {
    alerts.push({
      id: "choque_circulatorio",
      severity: "alta",
      message: "Padrao compativel com hipoperfusao/choque circulatorio; reavaliar urgencia imediatamente."
    });
  }

  const hasColicPattern =
    (normalized.includes("rolar") || normalized.includes("flanco") || normalized.includes("dor abdominal")) &&
    (normalized.includes("colica") || normalized.includes("hipomotilidade") || normalized.includes("inquiet"));
  if (hasColicPattern) {
    alerts.push({
      id: "suspeita_colica",
      severity: "alta",
      message: "Sinais sugerem colica; considerar monitorizacao continua e analgesia protocolada."
    });
  }

  const hasDehydrationPattern =
    (normalized.includes("agua diminu") || normalized.includes("nao bebe") || normalized.includes("não bebe")) &&
    (normalized.includes("urina concentrada") || normalized.includes("fezes ressec"));
  if (hasDehydrationPattern) {
    alerts.push({
      id: "desidratacao",
      severity: "media",
      message: "Sinais de desidratacao; considerar fluidoterapia e monitorar perfusao."
    });
  }

  const evidenceCount =
    (extractionState?.sintoma?.length || 0) +
    (extractionState?.exame?.length || 0) +
    (extractionState?.diagnostico?.length || 0) +
    (extractionState?.conduta?.length || 0);
  const coherence = clampValue((alerts.length * 0.2 + evidenceCount * 0.05), 0, 1);

  return {
    alerts,
    coherenceScore: Number(coherence.toFixed(2))
  };
}

function buildParsedFromExtractionState(state = {}, fallbackText = "", roleData = {}) {
  const tutorContent = String(roleData?.tutorContent || "").trim();
  const medicoContent = String(roleData?.medicoContent || "").trim();
  const fullContent = String(roleData?.fullContent || fallbackText || "").trim();

  const chiefComplaintDraft = dedupeAndJoin([...(state.queixa || []), ...(state.sintoma || [])]).slice(0, 260);
  const anamnesisDraft = dedupeAndJoin([
    ...(state.historico || []),
    ...(state.comportamento || []),
    ...(state.sintoma || [])
  ]);
  const physicalExamDraft = dedupeAndJoin(state.exame || []);
  const diagnosisDraft = dedupeAndJoin(state.diagnostico || []);
  const treatmentDraft = dedupeAndJoin(state.conduta || []);
  const medicationDraft = dedupeAndJoin(state.medicacao || []);

  const fallbackClassified = classifySentencesHeuristic(fullContent);

  return {
    chiefComplaint:
      extractByKeywords(tutorContent || fullContent, ["queixa", "motivo da consulta", "motivo"]) ||
      chiefComplaintDraft ||
      dedupeAndJoin(fallbackClassified.complaint).slice(0, 260) ||
      (tutorContent || fullContent).slice(0, 220),
    anamnesis:
      extractByKeywords(tutorContent || fullContent, ["anamnese", "historico", "histórico", "evolucao", "evolução"]) ||
      anamnesisDraft ||
      dedupeAndJoin(fallbackClassified.anamnesis),
    physicalExam:
      extractByKeywords(medicoContent || fullContent, ["exame fisico", "exame físico"]) ||
      physicalExamDraft ||
      dedupeAndJoin(fallbackClassified.physicalExam),
    diagnosis:
      extractByKeywords(medicoContent || fullContent, ["diagnostico", "diagnóstico", "suspeita"]) ||
      diagnosisDraft ||
      dedupeAndJoin(fallbackClassified.diagnosis),
    treatment:
      extractByKeywords(medicoContent || fullContent, ["tratamento", "conduta"]) ||
      treatmentDraft ||
      dedupeAndJoin(fallbackClassified.treatment),
    medications:
      extractByKeywords(medicoContent || fullContent, [
        "medicacao",
        "medicação",
        "prescricao",
        "prescrição",
        "prescrever",
        "receita"
      ]) ||
      medicationDraft ||
      dedupeAndJoin(fallbackClassified.medications)
  };
}

function dedupeAndJoin(values = []) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const text = String(value || "").trim();
    if (!text) continue;
    const key = normalizeText(text);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output.join(". ");
}

function classifySentencesHeuristic(text = "") {
  const sentences = splitIntoSentences(text);
  const buckets = {
    complaint: [],
    anamnesis: [],
    physicalExam: [],
    diagnosis: [],
    treatment: [],
    medications: []
  };

  const isMatch = (source, tokens) => tokens.some((token) => source.includes(token));

  for (const sentence of sentences) {
    const normalized = normalizeText(sentence);
    if (!normalized) continue;

    const symptomTokens = [
      "apat", "sem apetite", "nao come", "não come", "dor", "colica", "cólica",
      "vomit", "diarre", "manco", "claudic", "prostr", "coce", "mucosa", "febre"
    ];
    const anamnesisTokens = [
      "desde", "ontem", "hoje", "ha ", "há ", "historico", "histórico",
      "tutor", "notei", "percebi", "evolucao", "evolução", "participou", "fds"
    ];
    const examTokens = [
      "exame fisico", "exame físico", "fc ", "fr ", "tpc", "temperatura",
      "mucosa", "icter", "palida", "pálida", "desidrat", "ausculta", "palp"
    ];
    const diagnosisTokens = [
      "suspeita", "diagnost", "diagnós", "pode ser", "provavel", "provável",
      "compat", "hipotese", "hipótese"
    ];
    const treatmentTokens = [
      "conduta", "tratamento", "solicitei", "solicito", "pedi ", "pedi ",
      "coletar", "coleta", "reavaliar", "retorno", "internar", "sonda", "hidrata"
    ];
    const medicationTokens = [
      "dipirona", "flunixin", "meloxicam", "amoxic", "antibiot", "anti-inflam",
      "mg", "ml", "iv", "im", "vo", "prescrevi", "prescricao", "prescrição"
    ];

    if (isMatch(normalized, symptomTokens)) buckets.complaint.push(sentence);
    if (isMatch(normalized, anamnesisTokens)) buckets.anamnesis.push(sentence);
    if (isMatch(normalized, examTokens)) buckets.physicalExam.push(sentence);
    if (isMatch(normalized, diagnosisTokens)) buckets.diagnosis.push(sentence);
    if (isMatch(normalized, treatmentTokens)) buckets.treatment.push(sentence);
    if (isMatch(normalized, medicationTokens)) buckets.medications.push(sentence);
  }

  return buckets;
}

function countClinicalSignals(text = "") {
  const normalized = normalizeText(text);
  if (!normalized) return 0;

  const tokens = [
    "queixa", "anamnese", "exame", "diagnost", "suspeita", "conduta",
    "tratamento", "prescre", "medic", "retorno", "febre", "mucosa",
    "tpc", "fc", "fr", "dor", "vomit", "diarre", "claudic", "colica"
  ];

  return tokens.reduce((sum, token) => (normalized.includes(token) ? sum + 1 : sum), 0);
}

function assessRoleReliability(segments = [], tutorContent = "", medicoContent = "") {
  const safeSegments = Array.isArray(segments) ? segments : [];
  if (!safeSegments.length) {
    return {
      reliable: false,
      score: 0,
      reason: "no_segments"
    };
  }

  const tutorTurns = safeSegments.filter((segment) => segment?.speaker === "Tutor").length;
  const medicoTurns = safeSegments.filter((segment) => segment?.speaker === "Medico").length;
  const totalTurns = Math.max(1, safeSegments.length);

  if (!tutorTurns || !medicoTurns) {
    return {
      reliable: false,
      score: 0.2,
      reason: "single_speaker_detected"
    };
  }

  const tutorSignals = countClinicalSignals(tutorContent);
  const medicoSignals = countClinicalSignals(medicoContent);
  const turnBalance = 1 - Math.abs(tutorTurns - medicoTurns) / totalTurns;
  const signalBalance = 1 - Math.abs(tutorSignals - medicoSignals) / Math.max(1, tutorSignals + medicoSignals);
  const coverage = Math.min(1, (tutorSignals + medicoSignals) / 8);

  const score = Number((turnBalance * 0.35 + signalBalance * 0.25 + coverage * 0.4).toFixed(2));
  const reliable = score >= 0.5;

  return {
    reliable,
    score,
    reason: reliable ? "ok" : "low_confidence_role_split"
  };
}

function detectSpeakerFromSentence(sentence = "", lastSpeaker = "Tutor") {
  const normalized = normalizeText(sentence);
  if (!normalized) return lastSpeaker || "Tutor";

  const symptomContext =
    /\b(nao ta bem|não tá bem|sem apetite|vomit|diarre|febre|dor|apat|prostr|mucosa|coce)\b/.test(normalized);
  const vetQuestionContext =
    /\b(desde quando|ha quanto|há quanto|me explica|me conte|me conta|pode me dizer)\b/.test(normalized);
  const vetActionContext =
    /\b(vamos|no exame|ao exame|suspeita|diagnost|conduta|tratamento|prescrev|oriento|solicitei|pedi|coletar)\b/.test(normalized);

  const tutorSignals = [
    "notei", "percebi", "ele", "ela", "desde", "ontem", "hoje", "apetite",
    "nao come", "não come", "nao bebe", "não bebe", "vomit", "diarre", "coce",
    "ficou", "anda", "parece", "tutor", "proprietario", "proprietário"
  ];
  const medicoSignals = [
    "entendi", "vamos", "no exame", "ao exame", "suspeita", "diagnost",
    "conduta", "tratamento", "prescrev", "oriento", "solicitei", "pedi",
    "coletar", "retorno", "reavaliar", "fc", "fr", "tpc", "mucosa"
  ];

  let tutorScore = 0;
  let medicoScore = 0;
  tutorSignals.forEach((token) => {
    if (normalized.includes(token)) tutorScore += 2;
  });
  medicoSignals.forEach((token) => {
    if (normalized.includes(token)) medicoScore += 2;
  });

  if (/^(dr|dra|doutor|doutora)\b/.test(normalized)) {
    if (symptomContext) tutorScore += 3;
    else medicoScore += 1;
  }
  if (/\b(meu|minha|aqui em casa|em casa)\b/.test(normalized)) tutorScore += 2;
  if (vetQuestionContext) medicoScore += 3;
  if (vetActionContext) medicoScore += 2;
  if (/\bprescrev|solicitei|conduta\b/.test(normalized)) medicoScore += 2;

  if (medicoScore > tutorScore) return "Medico";
  if (tutorScore > medicoScore) return "Tutor";
  return lastSpeaker === "Tutor" ? "Medico" : "Tutor";
}

function formatStamp(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = String(Math.floor(total / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function buildHeuristicTurnsFromTranscript(transcript = "") {
  const sentences = splitIntoSentences(transcript);
  if (!sentences.length) return [];

  const turns = [];
  let lastSpeaker = "Tutor";
  let elapsed = 0;
  for (const sentence of sentences) {
    const speaker = detectSpeakerFromSentence(sentence, lastSpeaker);
    lastSpeaker = speaker;
    const existing = turns[turns.length - 1];
    if (existing && existing.speaker === speaker) {
      existing.text = `${existing.text}. ${sentence}`.replace(/\s+/g, " ").trim();
      continue;
    }
    turns.push({
      stamp: formatStamp(elapsed),
      speaker,
      text: sentence
    });
    elapsed += Math.max(4, Math.ceil(sentence.split(/\s+/g).length / 2));
  }

  return turns;
}

function readHeuristicMemory() {
  if (!fs.existsSync(HEURISTIC_MEMORY_PATH)) return [];
  try {
    const raw = fs.readFileSync(HEURISTIC_MEMORY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.examples) ? parsed.examples : [];
  } catch {
    return [];
  }
}

function writeHeuristicMemory(examples = []) {
  try {
    const payload = {
      examples: optimizeHeuristicMemory(Array.isArray(examples) ? examples : [])
    };
    fs.writeFileSync(HEURISTIC_MEMORY_PATH, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    console.error("Falha ao salvar memoria heuristica:", error.message);
  }
}

function countFilledParsedFields(parsed = {}) {
  return ["chiefComplaint", "anamnesis", "physicalExam", "diagnosis", "treatment", "medications"]
    .filter((key) => String(parsed?.[key] || "").trim()).length;
}

function scoreMemoryExample(example = {}) {
  const source = String(example?.sourceText || "").trim();
  const parsed = example?.parsed && typeof example.parsed === "object" ? example.parsed : {};
  const filledCount = countFilledParsedFields(parsed);
  const coverageScore = filledCount / 6;
  const lengthScore = Math.min(source.length / 600, 1) * 0.18;
  const richnessScore = Math.min(
    ([
      "febre", "mucosa", "tpc", "suspeita", "diagnost", "conduta", "prescre",
      "hemograma", "bioquim", "ultrassom", "rx", "retorno"
    ].filter((token) => normalizeText(source).includes(token)).length / 6),
    1
  ) * 0.22;
  return Number(Math.min(1, coverageScore * 0.6 + lengthScore + richnessScore).toFixed(4));
}

function normalizeMemoryExample(example = {}) {
  return {
    createdAt: example?.createdAt || new Date().toISOString(),
    sourceText: String(example?.sourceText || "").replace(/\s+/g, " ").trim(),
    parsed: {
      chiefComplaint: String(example?.parsed?.chiefComplaint || "").trim(),
      anamnesis: String(example?.parsed?.anamnesis || "").trim(),
      physicalExam: String(example?.parsed?.physicalExam || "").trim(),
      diagnosis: String(example?.parsed?.diagnosis || "").trim(),
      treatment: String(example?.parsed?.treatment || "").trim(),
      medications: String(example?.parsed?.medications || "").trim()
    }
  };
}

function optimizeHeuristicMemory(examples = []) {
  const normalized = examples
    .map(normalizeMemoryExample)
    .filter((item) => item.sourceText.length >= 40);

  const scored = normalized
    .map((item) => ({ item, score: scoreMemoryExample(item) }))
    .filter((entry) => entry.score >= 0.22);

  const deduped = [];
  for (const entry of scored) {
    const duplicateIndex = deduped.findIndex((stored) =>
      jaccardSimilarity(entry.item.sourceText, stored.item.sourceText) >= 0.92
    );
    if (duplicateIndex < 0) {
      deduped.push(entry);
      continue;
    }

    const existing = deduped[duplicateIndex];
    const entryDate = new Date(entry.item.createdAt).getTime() || 0;
    const existingDate = new Date(existing.item.createdAt).getTime() || 0;
    if (entry.score > existing.score || (entry.score === existing.score && entryDate > existingDate)) {
      deduped[duplicateIndex] = entry;
    }
  }

  const rankedByQuality = [...deduped].sort((a, b) => b.score - a.score);
  const best = rankedByQuality.slice(0, Math.max(0, MAX_MEMORY_ITEMS - 50));
  const bestKeys = new Set(best.map((entry) => normalizeText(entry.item.sourceText)));

  const recentPool = [...deduped]
    .filter((entry) => !bestKeys.has(normalizeText(entry.item.sourceText)))
    .sort((a, b) => {
      const aDate = new Date(a.item.createdAt).getTime() || 0;
      const bDate = new Date(b.item.createdAt).getTime() || 0;
      return bDate - aDate;
    })
    .slice(0, 50);

  return [...best, ...recentPool]
    .slice(0, MAX_MEMORY_ITEMS)
    .map((entry) => entry.item)
    .sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime() || 0;
      const bDate = new Date(b.createdAt).getTime() || 0;
      return aDate - bDate;
    });
}

function tokenize(text = "") {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function jaccardSimilarity(a = "", b = "") {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (!sa.size || !sb.size) return 0;
  let intersection = 0;
  sa.forEach((token) => {
    if (sb.has(token)) intersection += 1;
  });
  const union = new Set([...sa, ...sb]).size || 1;
  return intersection / union;
}

function normalizeTimestampedTranscript(text = "") {
  return String(text || "")
    .replace(/\[\d{2}:\d{2}\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTranscriptFromNotes(notes = "") {
  const source = String(notes || "");
  const timed = source.match(/Transcricao com minutagem:\s*([\s\S]*?)(?:\n{2,}|$)/i);
  if (timed?.[1]) return normalizeTimestampedTranscript(timed[1]);
  const plain = source.match(/Transcricao da conversa:\s*([\s\S]*?)(?:\n{2,}|$)/i);
  if (plain?.[1]) return normalizeTimestampedTranscript(plain[1]);
  return "";
}

function applyMemoryToParsed(parsed = {}, sourceText = "") {
  const text = String(sourceText || "").trim();
  if (!text) return parsed;
  const memory = readHeuristicMemory();
  if (!memory.length) return parsed;

  const ranked = memory
    .map((item) => ({
      item,
      score: jaccardSimilarity(text, String(item?.sourceText || ""))
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 0.3) return parsed;

  const reference = best.item?.parsed && typeof best.item.parsed === "object"
    ? best.item.parsed
    : {};

  const merged = { ...parsed };
  for (const key of ["chiefComplaint", "anamnesis", "physicalExam", "diagnosis", "treatment", "medications"]) {
    if (!String(merged[key] || "").trim() && String(reference[key] || "").trim()) {
      merged[key] = String(reference[key]).trim();
    }
  }
  return merged;
}

function parseClinicalFieldsFromSegments(segments = [], transcript = "") {
  const safeSegments = Array.isArray(segments) ? segments : [];

  const tutorContent = safeSegments
    .filter((segment) => segment?.speaker === "Tutor")
    .map((segment) => segment?.text || "")
    .join(" ")
    .trim();

  const medicoContent = safeSegments
    .filter((segment) => segment?.speaker === "Medico")
    .map((segment) => segment?.text || "")
    .join(" ")
    .trim();

  const fallbackContent = String(transcript || "").trim();
  const fullContent = (medicoContent || tutorContent || fallbackContent).trim();

  if (!fullContent) {
    return {
      parsed: {
        chiefComplaint: "",
        anamnesis: "",
        physicalExam: "",
        diagnosis: "",
        treatment: "",
        medications: ""
      },
      context: {
        tutorContent: "",
        medicoContent: "",
        fullContent: ""
      }
    };
  }

  const roleReliability = assessRoleReliability(safeSegments, tutorContent, medicoContent);
  const shouldUseFullAsPrimary = !roleReliability.reliable;

  const tutorOrFull = shouldUseFullAsPrimary ? fullContent : (tutorContent || fullContent);
  const medicoOrFull = shouldUseFullAsPrimary ? fullContent : (medicoContent || fullContent);
  const { classified: classifiedSentences, state: extractionState } = classifyAndExtractIncremental(
    safeSegments,
    fullContent
  );

  const parsedRaw = buildParsedFromExtractionState(
    extractionState,
    fullContent,
    {
      tutorContent: tutorOrFull,
      medicoContent: medicoOrFull,
      fullContent
    }
  );

  const parsed = applyMemoryToParsed(parsedRaw, fullContent);
  const semanticRules = evaluateClinicalRules(fullContent, extractionState);

  return {
    parsed,
    context: {
      tutorContent,
      medicoContent,
      fullContent,
      roleReliability
    },
    pipeline: {
      classifiedSentences,
      extractionState,
      semanticRules
    }
  };
}

function confidenceLabel(score) {
  if (score >= 0.75) return "alta";
  if (score >= 0.5) return "media";
  return "baixa";
}

function scoreField(value, expectedSourceContent, provider) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { score: 0, label: "baixa" };
  }

  let score = 0.2;
  score += 0.35;

  if (String(expectedSourceContent || "").trim().length > 0) {
    score += 0.2;
  }

  if (trimmed.length >= 20) {
    score += 0.15;
  }

  score += provider === "deepgram" ? 0.15 : 0.05;
  score = Math.min(1, Number(score.toFixed(2)));

  return { score, label: confidenceLabel(score) };
}

function buildParsedConfidence(parsed, context, provider) {
  return {
    chiefComplaint: scoreField(parsed.chiefComplaint, context.tutorContent, provider),
    anamnesis: scoreField(parsed.anamnesis, context.tutorContent, provider),
    physicalExam: scoreField(parsed.physicalExam, context.medicoContent, provider),
    diagnosis: scoreField(parsed.diagnosis, context.medicoContent, provider),
    treatment: scoreField(parsed.treatment, context.medicoContent, provider),
    medications: scoreField(parsed.medications, context.medicoContent, provider)
  };
}

function normalizeSpeakerId(speakerId) {
  if (speakerId === null || speakerId === undefined) return "spk_0";
  const numeric = Number(speakerId);
  if (!Number.isNaN(numeric)) return `spk_${numeric}`;
  const raw = String(speakerId || "").trim().toLowerCase();
  return raw ? `spk_${raw.replace(/[^a-z0-9_-]/g, "")}` : "spk_0";
}

function scoreSpeakerRole(text = "") {
  const normalized = normalizeText(text);
  if (!normalized) return { tutor: 0, medico: 0 };

  let tutor = 0;
  let medico = 0;

  const tutorTokens = [
    "notei", "percebi", "ele", "ela", "meu", "minha", "em casa", "anda",
    "apetite", "vomito", "diarreia", "nao come", "nao bebe", "proprietario", "tutor"
  ];
  const medicoTokens = [
    "entendi", "vamos", "no exame", "ao exame", "suspeita", "diagnost",
    "conduta", "tratamento", "prescrev", "retorno", "solicitei", "pedi",
    "fc", "fr", "tpc", "ausculta", "palpacao"
  ];

  tutorTokens.forEach((token) => {
    if (normalized.includes(token)) tutor += 2;
  });
  medicoTokens.forEach((token) => {
    if (normalized.includes(token)) medico += 2;
  });

  if (/\b(dr|dra|doutor|doutora)\b/.test(normalized) && /\b(ele|ela|nao|não)\b/.test(normalized)) {
    tutor += 2;
  }
  if (/\b(prescrev|solicit|diagnost|conduta)\b/.test(normalized)) {
    medico += 2;
  }

  return { tutor, medico };
}

function resolveRolesFromDiarizedTurns(turns = []) {
  const safeTurns = Array.isArray(turns) ? turns : [];
  if (!safeTurns.length) return [];

  const bySpeaker = {};
  for (const turn of safeTurns) {
    const speakerId = turn.speakerId || "spk_0";
    const score = scoreSpeakerRole(turn.text || "");
    if (!bySpeaker[speakerId]) {
      bySpeaker[speakerId] = { tutor: 0, medico: 0 };
    }
    bySpeaker[speakerId].tutor += score.tutor;
    bySpeaker[speakerId].medico += score.medico;
  }

  const speakers = Object.keys(bySpeaker);
  const roleBySpeaker = {};

  if (speakers.length === 2) {
    const [a, b] = speakers;
    const aDiff = bySpeaker[a].tutor - bySpeaker[a].medico;
    const bDiff = bySpeaker[b].tutor - bySpeaker[b].medico;

    if (aDiff === bDiff) {
      roleBySpeaker[a] = "Tutor";
      roleBySpeaker[b] = "Medico";
    } else if (aDiff > bDiff) {
      roleBySpeaker[a] = "Tutor";
      roleBySpeaker[b] = "Medico";
    } else {
      roleBySpeaker[a] = "Medico";
      roleBySpeaker[b] = "Tutor";
    }
  } else {
    speakers.forEach((speakerId, index) => {
      const score = bySpeaker[speakerId];
      if (score.tutor > score.medico) roleBySpeaker[speakerId] = "Tutor";
      else if (score.medico > score.tutor) roleBySpeaker[speakerId] = "Medico";
      else roleBySpeaker[speakerId] = index === 0 ? "Tutor" : "Medico";
    });
  }

  let lastSpeaker = "Tutor";
  return safeTurns.map((turn) => {
    const explicit = roleBySpeaker[turn.speakerId || "spk_0"];
    const inferred = detectSpeakerFromSentence(turn.text || "", lastSpeaker);
    const finalSpeaker = explicit || inferred || lastSpeaker;
    lastSpeaker = finalSpeaker;
    return {
      stamp: turn.stamp || "00:00",
      speaker: finalSpeaker,
      text: String(turn.text || "").trim()
    };
  });
}

function buildTurnsFromDeepgramWords(words = []) {
  const rawTurns = [];
  let current = null;

  for (const word of words) {
    const rawWord = word?.punctuated_word || word?.word || "";
    const text = String(rawWord).trim();
    if (!text) continue;

    const speakerId = normalizeSpeakerId(word?.speaker);
    const stamp = `${String(Math.floor((word?.start || 0) / 60)).padStart(2, "0")}:${String(
      Math.floor((word?.start || 0) % 60)
    ).padStart(2, "0")}`;

    if (!current || current.speakerId !== speakerId) {
      if (current?.text?.trim()) {
        rawTurns.push(current);
      }
      current = {
        speakerId,
        stamp,
        text
      };
      continue;
    }

    current.text = `${current.text} ${text}`.trim();
  }

  if (current?.text?.trim()) {
    rawTurns.push(current);
  }

  return resolveRolesFromDiarizedTurns(rawTurns);
}

async function diarizeWithDeepgram(audioBuffer, mimeType = "audio/webm") {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.DEEPGRAM_MODEL || "nova-3";
  const response = await fetch(
    `https://api.deepgram.com/v1/listen?model=${encodeURIComponent(model)}&diarize=true&punctuate=true&language=pt-BR`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType || "audio/webm"
      },
      body: audioBuffer
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Deepgram ${response.status}: ${message}`);
  }

  const data = await response.json();
  const words =
    data?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  const transcript =
    data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

  const turns = buildTurnsFromDeepgramWords(words);

  return {
    provider: "deepgram",
    transcript,
    segments: turns
  };
}

function computeCompositeFieldConfidence({
  rawScore = 0,
  sentenceCoverage = 0,
  clinicalCoherence = 0,
  evidenceCount = 0
}) {
  const modelScore = clampValue(Number(rawScore) || 0, 0, 1);
  const coverage = clampValue(Number(sentenceCoverage) || 0, 0, 1);
  const coherence = clampValue(Number(clinicalCoherence) || 0, 0, 1);
  const evidence = clampValue((Number(evidenceCount) || 0) / 4, 0, 1);

  const score = Number((
    modelScore * 0.45 +
    coverage * 0.2 +
    coherence * 0.2 +
    evidence * 0.15
  ).toFixed(2));

  return {
    score,
    label: confidenceLabel(score),
    factors: {
      model: modelScore,
      coverage,
      coherence,
      evidence
    }
  };
}

function buildCompositeConfidence(parsedConfidence = {}, pipeline = {}) {
  const state = pipeline?.extractionState || {};
  const coherence = pipeline?.semanticRules?.coherenceScore || 0;

  const map = {
    chiefComplaint: { source: ["queixa", "sintoma"] },
    anamnesis: { source: ["historico", "comportamento", "sintoma"] },
    physicalExam: { source: ["exame"] },
    diagnosis: { source: ["diagnostico"] },
    treatment: { source: ["conduta"] },
    medications: { source: ["medicacao", "conduta"] }
  };

  const result = {};
  Object.keys(map).forEach((field) => {
    const raw = parsedConfidence?.[field]?.score || 0;
    const sources = map[field].source || [];
    const evidenceCount = sources.reduce((sum, bucket) => sum + (state?.[bucket]?.length || 0), 0);
    const coverage = sources.length
      ? sources.reduce((sum, bucket) => sum + Math.min(1, (state?.[bucket]?.length || 0) / 2), 0) / sources.length
      : 0;
    result[field] = computeCompositeFieldConfidence({
      rawScore: raw,
      sentenceCoverage: coverage,
      clinicalCoherence: coherence,
      evidenceCount
    });
  });

  return result;
}

function shouldWriteDebugArtifacts() {
  const forced = String(process.env.FIELD_ASSIST_DEBUG || "").trim().toLowerCase();
  if (forced === "0" || forced === "false" || forced === "off") return false;
  if (forced === "1" || forced === "true" || forced === "on") return true;
  return process.env.NODE_ENV !== "production";
}

function writeDebugArtifacts(payload = {}) {
  if (!shouldWriteDebugArtifacts()) return;
  try {
    fs.mkdirSync(DEBUG_DIR_PATH, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const files = [
      { suffix: "transcricao", data: payload.transcript || "" },
      { suffix: "frases_classificadas", data: payload.classifiedSentences || [] },
      { suffix: "extracao_por_frase", data: payload.extractionState || {} },
      { suffix: "resultado_final", data: payload.finalResult || {} }
    ];

    for (const file of files) {
      const fullPath = path.join(DEBUG_DIR_PATH, `${stamp}-${file.suffix}.json`);
      fs.writeFileSync(fullPath, JSON.stringify(file.data, null, 2), "utf8");
    }
  } catch (error) {
    console.error("Falha ao gravar logs de debug do modo campo:", error.message);
  }
}

async function transcribeWithOpenAI(audioBuffer, mimeType = "audio/webm", filename = "field-audio.webm") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });
  formData.append("file", blob, filename || "field-audio.webm");
  formData.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe");
  formData.append("language", "pt");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI transcription ${response.status}: ${message}`);
  }

  const data = await response.json();
  const transcript = String(data?.text || "").trim();
  if (!transcript) return null;
  const turns = buildHeuristicTurnsFromTranscript(transcript);

  return {
    provider: "openai",
    transcript,
    segments: turns.length
      ? turns
      : [
          {
            stamp: "00:00",
            speaker: "Tutor",
            text: transcript
          }
        ]
  };
}

function mergeSegmentsWithFallback(diarizedSegments, fallbackSegments) {
  if (Array.isArray(diarizedSegments) && diarizedSegments.length > 0) {
    return diarizedSegments.map((segment) => ({
      stamp: segment.stamp || "00:00",
      speaker: segment.speaker || "Tutor",
      text: segment.text || ""
    }));
  }

  return (fallbackSegments || []).map((segment) => ({
    stamp: segment.stamp || "00:00",
    speaker: segment.speaker || "Tutor",
    text: segment.text || ""
  }));
}

async function analyzeFieldConversation({ audioBuffer, mimeType, filename, segments, transcript }) {
  let diarizationResult = null;

  if (audioBuffer && audioBuffer.length > 0) {
    try {
      diarizationResult = await diarizeWithDeepgram(audioBuffer, mimeType);
    } catch (error) {
      console.error("Falha na diarizacao via Deepgram:", error.message);
    }

    if (!diarizationResult) {
      try {
        diarizationResult = await transcribeWithOpenAI(
          audioBuffer,
          mimeType,
          filename,
        );
      } catch (error) {
        console.error("Falha na transcricao via OpenAI:", error.message);
      }
    }
  }

  const mergedSegments = mergeSegmentsWithFallback(
    diarizationResult?.segments,
    segments
  );

  const finalTranscript =
    diarizationResult?.transcript ||
    mergedSegments.map((segment) => segment.text).join(" ") ||
    String(transcript || "").trim();
  const normalizedSegments =
    mergedSegments.length >= 2
      ? mergedSegments
      : buildHeuristicTurnsFromTranscript(finalTranscript);

  const provider = diarizationResult?.provider || "heuristic";
  const { parsed, context, pipeline } = parseClinicalFieldsFromSegments(
    normalizedSegments,
    finalTranscript
  );
  const parsedConfidence = buildParsedConfidence(parsed, context, provider);
  const parsedConfidenceComposite = buildCompositeConfidence(parsedConfidence, pipeline);

  const result = {
    provider,
    transcript: finalTranscript,
    segments: normalizedSegments,
    context,
    parsed,
    parsedConfidence,
    parsedConfidenceComposite,
    pipeline: {
      classifiedSentences: pipeline?.classifiedSentences || [],
      semanticRules: pipeline?.semanticRules || { alerts: [], coherenceScore: 0 },
      extractionState: pipeline?.extractionState || {}
    }
  };

  writeDebugArtifacts({
    transcript: finalTranscript,
    classifiedSentences: result.pipeline.classifiedSentences,
    extractionState: result.pipeline.extractionState,
    finalResult: {
      parsed: result.parsed,
      parsedConfidence: result.parsedConfidence,
      parsedConfidenceComposite: result.parsedConfidenceComposite,
      semanticRules: result.pipeline.semanticRules
    }
  });

  return result;
}

module.exports = {
  analyzeFieldConversation,
  parseClinicalFieldsFromSegments,
  extractTranscriptFromNotes,
  normalizeTimestampedTranscript,
  writeHeuristicMemory,
  readHeuristicMemory
};
