function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function extractByLabels(sourceText, labels = [], stopLabels = []) {
  const text = String(sourceText || "").trim();
  if (!text || !labels.length) return "";

  const labelPattern = labels.map(escapeRegex).join("|");
  const stopPattern = stopLabels.length
    ? stopLabels.map(escapeRegex).join("|")
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
  const triggerPattern = triggers.map(escapeRegex).join("|");
  const regex = new RegExp(`(?:\\b(?:${triggerPattern})\\b)\\s*[:\\-]?\\s*([^.!?\\n]+)`, "i");
  const match = text.match(regex);
  if (!match?.[1]) return "";
  return toSentence(match[1]);
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

function buildConfidenceByField(draft, speciesProfile = null) {
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

function ensureDraftShape(raw = {}, mode = "nova") {
  const consultationType = mode === "retorno" ? "retorno" : "nova";

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
    returnRecommendation: String(raw.returnRecommendation || raw.recomendacaoRetorno || "").trim()
  };
}

function buildHeuristicDraft(messages = [], mode = "nova", patient = null) {
  const sourceText = messages
    .map((item) => String(item?.content || ""))
    .join(" ")
    .trim();
  const speciesProfile = detectSpeciesProfile(patient, sourceText);

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

  const explicitChiefComplaint = extractByKeywords(sourceText, ["queixa", "motivo da consulta", "motivo"]);
  const chiefSource = explicitChiefComplaint ||
    sourceText.split(/\b(?:conduta|tratamento|diagnostico|suspeita|medicacao|prescricao|receita|retorno|reavaliacao|reavaliar)\b/i)[0];

  const diagnosisByLabel = extractByLabels(
    sourceText,
    ["diagnostico", "suspeita diagnostica", "suspeita"],
    stopLabels
  );
  const treatmentByLabel = extractByLabels(
    sourceText,
    ["conduta", "tratamento"],
    stopLabels.filter((label) => !["retorno", "reavaliacao", "reavaliar", "reavaliar em"].includes(label))
  );
  const medicationsByLabel = extractByLabels(
    sourceText,
    ["medicacao", "prescricao", "receita", "prescrito", "prescrevi", "prescrever"],
    stopLabels
  );
  const proceduresByLabel = extractByLabels(
    sourceText,
    ["procedimento", "procedimentos", "intervencao", "foi realizado", "realizado"],
    stopLabels
  );
  const examByLabel = extractByLabels(
    sourceText,
    ["exame solicitado", "exames solicitados", "exame complementar", "solicitar exame", "solicitado exame", "solicitei", "solicitado"],
    stopLabels
  );

  const returnByLabel = extractByLabels(
    sourceText,
    ["retorno", "reavaliacao", "reavaliar em", "reavaliar"],
    stopLabels
  );

  const explicitNotes = extractByKeywords(sourceText, ["observacao", "obs"]);

  const draftRaw = {
    chiefComplaint: firstSentence(chiefSource || sourceText, 220),
    anamnesis: buildHeuristicAnamnesis(
      extractByKeywords(sourceText, ["anamnese", "historico"]),
      firstSentence(chiefSource || sourceText, 220)
    ),
    physicalExam: extractByKeywords(sourceText, ["exame fisico"]),
    diagnosis: buildHeuristicDiagnosis(
      diagnosisByLabel || extractByKeywords(sourceText, ["diagnostico"])
    ),
    treatment: buildHeuristicTreatment(
      treatmentByLabel || extractByKeywords(sourceText, ["tratamento", "conduta"])
    ),
    procedures: proceduresByLabel,
    medications: medicationsByLabel || extractByKeywords(sourceText, ["medicacao", "prescricao", "receita"]),
    examDetails: examByLabel,
    notes: explicitNotes,
    returnRecommendation: buildHeuristicReturnRecommendation(
      extractReturnPhrase(sourceText) ||
      returnByLabel ||
      extractByKeywords(sourceText, ["retorno", "reavaliacao"]),
      treatmentByLabel || extractByKeywords(sourceText, ["tratamento", "conduta"])
    )
  };

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
  const draftTemplated = applyModeTemplate(draftRaw, mode);
  const draft = ensureDraftShape(draftTemplated, mode);
  const confidence = buildConfidenceByField(draft, speciesProfile);

  return {
    draft,
    provider: "heuristic",
    confidence: confidence.overall,
    confidenceByField: confidence.byField,
    context: {
      modeTitle: titleByMode(mode),
      speciesProfile: speciesProfile?.id || "geral"
    }
  };
}

async function generateWithOpenAI({ messages, mode, patient }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const patientContext = patient
    ? `Paciente: ${patient.name || ""}; especie: ${patient.species || ""}; raca: ${patient.breed || ""}; tutor: ${patient.ownerName || ""}.`
    : "";

  const systemPrompt = [
    "Voce e um assistente de veterinaria.",
    "Converta o chat do medico em um rascunho estruturado de prontuario.",
    "Retorne APENAS um JSON valido, sem markdown.",
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
    '  "returnRecommendation": "string"',
    "}",
    "Se algum campo nao existir no chat, retorne string vazia.",
    `Tipo da consulta: ${mode === "retorno" ? "retorno" : "nova"}.`,
    patientContext
  ]
    .filter(Boolean)
    .join(" ");

  const completionMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content || "")
    }))
  ];

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
    draft: ensureDraftShape(parsed, mode),
    provider: "openai",
    confidence: 0.8
  };
}

async function generateRecordDraftFromChat({ messages, mode = "nova", patient = null }) {
  const safeMessages = Array.isArray(messages)
    ? messages.filter((m) => m && String(m.content || "").trim())
    : [];

  if (!safeMessages.length) {
    return {
      draft: ensureDraftShape({}, mode),
      provider: "none",
      confidence: 0
    };
  }

  const sourceText = safeMessages.map((m) => String(m?.content || "")).join(" ");
  const speciesProfile = detectSpeciesProfile(patient, sourceText);

  try {
    const ai = await generateWithOpenAI({ messages: safeMessages, mode, patient });
    if (ai) {
      const confidence = buildConfidenceByField(ai.draft, speciesProfile);
      return {
        ...ai,
        confidence: ai.confidence || confidence.overall,
        confidenceByField: confidence.byField,
        context: {
          modeTitle: titleByMode(mode),
          speciesProfile: speciesProfile?.id || "geral"
        }
      };
    }
  } catch (error) {
    console.error("Falha na geracao de rascunho via OpenAI:", error.message);
  }

  return buildHeuristicDraft(safeMessages, mode, patient);
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
