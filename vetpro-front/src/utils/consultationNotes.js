export const PORTE_NOTES_MARK_START = "[[PORTE_CLINICO]]";
export const PORTE_NOTES_MARK_END = "[[/PORTE_CLINICO]]";
export const CHAT_NOTES_MARK_START = "[[AI_CHAT_HISTORY]]";
export const CHAT_NOTES_MARK_END = "[[/AI_CHAT_HISTORY]]";

const MARKER_PAIRS = [
  [PORTE_NOTES_MARK_START, PORTE_NOTES_MARK_END],
  [CHAT_NOTES_MARK_START, CHAT_NOTES_MARK_END],
];

function removeMarkedBlock(text = "", startMark = "", endMark = "") {
  let result = String(text || "");
  let startIndex = result.indexOf(startMark);

  while (startIndex >= 0) {
    const endIndex = result.indexOf(endMark, startIndex + startMark.length);
    if (endIndex < 0) {
      result = `${result.slice(0, startIndex)}${result.slice(startIndex + startMark.length)}`;
      break;
    }
    result = `${result.slice(0, startIndex)}${result.slice(endIndex + endMark.length)}`;
    startIndex = result.indexOf(startMark);
  }

  return result;
}

export function sanitizeConsultationNotesForDisplay(notes = "") {
  let result = String(notes || "");
  for (const [startMark, endMark] of MARKER_PAIRS) {
    result = removeMarkedBlock(result, startMark, endMark);
  }
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export function parsePorteDataFromNotes(notes = "") {
  const text = String(notes || "");
  const start = text.indexOf(PORTE_NOTES_MARK_START);
  const end = text.indexOf(PORTE_NOTES_MARK_END);
  if (start < 0 || end <= start) return null;

  const raw = text.slice(start + PORTE_NOTES_MARK_START.length, end).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const fields = parsed?.fields && typeof parsed.fields === "object" ? parsed.fields : null;
    if (!fields) return null;
    return {
      porte: parsed?.porte === "grande" ? "grande" : "pequeno",
      fields,
    };
  } catch {
    return null;
  }
}
