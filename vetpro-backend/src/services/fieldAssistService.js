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

  const tutorOrFull = tutorContent || fullContent;
  const medicoOrFull = medicoContent || fullContent;

  return {
    parsed: {
      chiefComplaint:
      extractByKeywords(tutorOrFull, ["queixa", "motivo da consulta", "motivo"]) ||
      tutorOrFull.slice(0, 220),
      anamnesis: extractByKeywords(tutorOrFull, ["anamnese", "historico"]),
      physicalExam: extractByKeywords(medicoOrFull, ["exame fisico"]),
      diagnosis: extractByKeywords(medicoOrFull, ["diagnostico"]),
      treatment: extractByKeywords(medicoOrFull, ["tratamento", "conduta"]),
      medications: extractByKeywords(medicoOrFull, [
        "medicacao",
        "prescricao",
        "prescrever",
        "receita"
      ])
    },
    context: {
      tutorContent,
      medicoContent,
      fullContent
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

function formatSpeakerLabel(speakerId) {
  if (speakerId === null || speakerId === undefined) return "Tutor";
  const numeric = Number(speakerId);
  if (Number.isNaN(numeric)) return "Tutor";
  return numeric % 2 === 0 ? "Tutor" : "Medico";
}

function buildTurnsFromDeepgramWords(words = []) {
  const turns = [];
  let current = null;

  for (const word of words) {
    const rawWord = word?.punctuated_word || word?.word || "";
    const text = String(rawWord).trim();
    if (!text) continue;

    const speaker = formatSpeakerLabel(word?.speaker);
    const stamp = `${String(Math.floor((word?.start || 0) / 60)).padStart(2, "0")}:${String(
      Math.floor((word?.start || 0) % 60)
    ).padStart(2, "0")}`;

    if (!current || current.speaker !== speaker) {
      if (current?.text?.trim()) {
        turns.push(current);
      }
      current = {
        speaker,
        stamp,
        text
      };
      continue;
    }

    current.text = `${current.text} ${text}`.trim();
  }

  if (current?.text?.trim()) {
    turns.push(current);
  }

  return turns;
}

async function diarizeWithDeepgram(audioBuffer, mimeType = "audio/webm") {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&language=pt-BR",
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

async function analyzeFieldConversation({ audioBuffer, mimeType, segments, transcript }) {
  let diarizationResult = null;

  if (audioBuffer && audioBuffer.length > 0) {
    try {
      diarizationResult = await diarizeWithDeepgram(audioBuffer, mimeType);
    } catch (error) {
      console.error("Falha na diarizacao via Deepgram:", error.message);
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

  const provider = diarizationResult?.provider || "heuristic";
  const { parsed, context } = parseClinicalFieldsFromSegments(
    mergedSegments,
    finalTranscript
  );
  const parsedConfidence = buildParsedConfidence(parsed, context, provider);

  return {
    provider,
    transcript: finalTranscript,
    segments: mergedSegments,
    parsed,
    parsedConfidence
  };
}

module.exports = {
  analyzeFieldConversation
};
