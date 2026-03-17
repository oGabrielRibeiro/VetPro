const fs = require('fs/promises');
const path = require('path');

function normalizeText(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toMonthKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function resolveFeedbackDirs() {
  const root = process.cwd();
  const feedbackDir = path.resolve(root, 'logs', 'field-assist-feedback');
  const supervisedDir = path.resolve(root, 'src', 'ai', 'benchmarks');
  return { feedbackDir, supervisedDir };
}

async function appendJsonLine(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function sanitizeFeedbackInput(input = {}, userId = null) {
  const now = new Date();
  const decision = String(input?.decision || '')
    .trim()
    .toLowerCase();
  const allowedDecision = decision === 'accepted' ? 'accepted' : 'rejected';

  const telemetryEnabled = input?.telemetryEnabled !== false;
  const field = normalizeText(input?.field);
  const suggestion = normalizeText(input?.suggestion);
  const finalValue = normalizeText(input?.finalValue);
  const source = normalizeText(input?.source || 'unknown').toLowerCase();
  const requestId = normalizeText(input?.requestId);
  const consultationId = normalizeText(input?.consultationId);
  const patientId = normalizeText(input?.patientId);

  const quality =
    input?.quality && typeof input.quality === 'object' ? input.quality : {};
  const confidenceScore = Number(quality?.score || 0);
  const confidenceLabel = normalizeText(quality?.label || '');
  const reconciliationSource = normalizeText(
    quality?.reconciliationSource || '',
  );
  const needsReview = Boolean(quality?.needsReview);
  const contradictionsCount = Number(quality?.contradictionsCount || 0);

  return {
    id: `faf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    monthKey: toMonthKey(now),
    userId: normalizeText(userId),
    requestId,
    consultationId,
    patientId,
    field,
    decision: allowedDecision,
    suggestion,
    finalValue,
    source,
    telemetryEnabled,
    quality: {
      score: Number.isFinite(confidenceScore)
        ? Math.max(0, Math.min(1, confidenceScore))
        : 0,
      label: confidenceLabel || 'desconhecida',
      reconciliationSource: reconciliationSource || 'desconhecida',
      needsReview,
      contradictionsCount: Number.isFinite(contradictionsCount)
        ? Math.max(0, contradictionsCount)
        : 0,
    },
  };
}

async function captureFieldAssistFeedback(input = {}, userId = null) {
  const record = sanitizeFeedbackInput(input, userId);
  if (!record.field) {
    const err = new Error('Campo de feedback e obrigatorio.');
    err.statusCode = 400;
    throw err;
  }

  const { feedbackDir, supervisedDir } = resolveFeedbackDirs();
  const monthlyPath = path.join(
    feedbackDir,
    `feedback-${record.monthKey}.jsonl`,
  );
  await appendJsonLine(monthlyPath, record);

  if (record.telemetryEnabled) {
    const supervisedPath = path.join(
      supervisedDir,
      'field-assist-supervised-feedback.jsonl',
    );
    const supervisedSample = {
      id: record.id,
      createdAt: record.createdAt,
      field: record.field,
      input: record.suggestion,
      output:
        record.decision === 'accepted'
          ? record.suggestion
          : record.finalValue || '',
      decision: record.decision,
      source: record.source,
      quality: record.quality,
    };
    await appendJsonLine(supervisedPath, supervisedSample);
  }

  return {
    id: record.id,
    storedAt: monthlyPath,
    telemetryEnabled: record.telemetryEnabled,
  };
}

module.exports = {
  captureFieldAssistFeedback,
};
