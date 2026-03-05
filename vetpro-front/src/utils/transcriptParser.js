export function normalizeTranscriptText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeSpeakerLabel(value = "Tutor") {
  const raw = normalizeTranscriptText(value).trim();
  if (
    raw === "medico" ||
    raw === "veterinario" ||
    raw === "veterinaria" ||
    raw === "vet" ||
    raw === "dr" ||
    raw === "dra" ||
    raw === "doutor" ||
    raw === "doutora" ||
    raw === "assistant"
  ) {
    return "Medico";
  }
  return "Tutor";
}

export function stripLeadingTimestamp(text = "") {
  return String(text || "")
    .replace(
      /^\s*(?:\[\d{1,2}:\d{2}(?::\d{2})?\]|\d{1,2}:\d{2}(?::\d{2})?)\s*/,
      "",
    )
    .trim();
}

export function parseTaggedSpeakerPhrase(phrase = "", fallbackSpeaker = "Tutor") {
  const fallback = normalizeSpeakerLabel(fallbackSpeaker);
  const stripped = stripLeadingTimestamp(phrase);
  if (!stripped) return { explicit: false, speaker: fallback, text: "" };

  const match = stripped.match(
    /^(Tutor|Responsavel|Responsável|Proprietario|Proprietário|Vet|Veterinario|Veterinário|Veterinaria|Veterinária|Medico|Médico|Dr|Dra|Doutor|Doutora)\s*(?::|-|–|—|->|=>|\|)\s*(.+)$/i,
  );
  if (!match) return { explicit: false, speaker: fallback, text: stripped };

  return {
    explicit: true,
    speaker: normalizeSpeakerLabel(match[1]),
    text: String(match[2] || "").trim(),
  };
}

function scoreTutorLine(line = "") {
  const normalized = normalizeTranscriptText(line);
  if (!normalized) return 0;
  let score = 0;
  if (/^(tutor|responsavel|proprietario)\s*:/.test(normalized)) score += 6;
  [
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
    "parece",
    "desde ontem",
    "desde hoje",
  ].forEach((token) => {
    if (normalized.includes(token)) score += 2;
  });
  if (/\?$/.test(String(line || "").trim())) score += 1;
  return score;
}

function scoreVetLine(line = "") {
  const normalized = normalizeTranscriptText(line);
  if (!normalized) return 0;
  let score = 0;
  if (/^(vet|veterinario|medico|dra|dr|doutor|doutora)\s*:/.test(normalized))
    score += 6;
  [
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
    "prevenir",
    "oriento",
    "solicito",
    "solicitei",
    "fc",
    "fr",
    "temperatura",
    "mucosa",
    "palpacao",
    "ausculta",
  ].forEach((token) => {
    if (normalized.includes(token)) score += 2;
  });
  if (/\b(prescricao|receita|mg\/kg|sid|bid|tid)\b/.test(normalized))
    score += 2;
  return score;
}

function splitDialogueLines(text = "") {
  const normalizedText = String(text || "")
    .replace(/\r/g, "\n")
    .replace(
      /\b(tutor|responsavel|responsável|proprietario|proprietário|vet|veterinario|veterinário|medico|médico|dra|dr|doutor|doutora)\s*(?::|-|–|—|->|=>|\|)/gi,
      "\n$&",
    );

  return normalizedText
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function detectSpeakerFromText(phrase = "", fallbackSpeaker = "Tutor") {
  const parsed = parseTaggedSpeakerPhrase(phrase, fallbackSpeaker);
  if (parsed.explicit) return parsed.speaker;

  const fallback = normalizeSpeakerLabel(fallbackSpeaker);
  const tutorScore = scoreTutorLine(parsed.text);
  const vetScore = scoreVetLine(parsed.text);
  if (tutorScore > vetScore) return "Tutor";
  if (vetScore > tutorScore) return "Medico";
  return fallback;
}

export function splitDialogueByRole(text = "") {
  const lines = splitDialogueLines(text);
  if (!lines.length) {
    return { tutorText: "", vetText: "", medicoText: "", unknownText: "", turns: [] };
  }

  let lastRole = "Tutor";
  const turns = lines.map((line) => {
    const parsedLine = parseTaggedSpeakerPhrase(line, lastRole);
    const cleanLine = parsedLine.text;

    let role = parsedLine.explicit ? parsedLine.speaker : "Unknown";
    if (!parsedLine.explicit) {
      const tutorScore = scoreTutorLine(cleanLine);
      const vetScore = scoreVetLine(cleanLine);
      if (tutorScore > vetScore) role = "Tutor";
      else if (vetScore > tutorScore) role = "Medico";
      else role = lastRole;
    }

    if (role !== "Unknown") lastRole = role;
    return { role, text: cleanLine };
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

  return { tutorText, vetText, medicoText: vetText, unknownText, turns };
}

export function stripSpeakerMarkers(text = "") {
  return String(text || "")
    .replace(/\[[0-9:]+\]/g, " ")
    .replace(
      /\b(Tutor|Medico|Médico|Vet|Veterinario|Veterinário|Dr|Dra|Doutor|Doutora)\s*(?::|-|–|—|->|=>|\|)\s*/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}
