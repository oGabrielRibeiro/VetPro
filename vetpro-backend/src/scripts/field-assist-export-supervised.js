/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function parseArgs(argv = []) {
  const args = {
    month: '',
    minScore: 0.45,
    out: path.resolve(
      process.cwd(),
      'src',
      'ai',
      'benchmarks',
      'field-assist-supervised-training.jsonl',
    ),
  };
  argv.forEach((arg) => {
    if (arg.startsWith('--month='))
      args.month = arg.replace('--month=', '').trim();
    if (arg.startsWith('--min-score=')) {
      const value = Number(arg.replace('--min-score=', '').trim());
      if (Number.isFinite(value))
        args.minScore = Math.max(0, Math.min(1, value));
    }
    if (arg.startsWith('--out=')) {
      args.out = path.resolve(process.cwd(), arg.replace('--out=', '').trim());
    }
  });
  return args;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function resolveMonthKey(raw = '') {
  const today = new Date();
  const fallback = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
  return /^\d{4}-\d{2}$/.test(String(raw || '').trim()) ? raw : fallback;
}

function buildTrainingRecord(item = {}) {
  const decision = item?.decision === 'accepted' ? 'accepted' : 'rejected';
  const target =
    decision === 'accepted'
      ? String(item?.suggestion || '').trim()
      : String(item?.finalValue || '').trim();

  return {
    id: item?.id || `sft_${Date.now()}`,
    createdAt: item?.createdAt || new Date().toISOString(),
    field: String(item?.field || '').trim(),
    source: String(item?.source || '').trim() || 'unknown',
    input: String(item?.suggestion || '').trim(),
    output: target,
    decision,
    quality: item?.quality || {},
    tags: ['field_assist_feedback', 'supervised'],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const monthKey = resolveMonthKey(args.month);
  const sourcePath = path.resolve(
    process.cwd(),
    'logs',
    'field-assist-feedback',
    `feedback-${monthKey}.jsonl`,
  );
  const items = readJsonl(sourcePath);

  const training = items
    .filter((item) => {
      const field = String(item?.field || '').trim();
      if (!field) return false;
      const score = Number(item?.quality?.score || 0);
      if (!Number.isFinite(score) || score < args.minScore) return false;
      if (
        item?.decision === 'rejected' &&
        !String(item?.finalValue || '').trim()
      ) {
        return false;
      }
      return Boolean(String(item?.suggestion || '').trim());
    })
    .map(buildTrainingRecord);

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  const lines = training.map((item) => JSON.stringify(item)).join('\n');
  fs.writeFileSync(args.out, lines ? `${lines}\n` : '', 'utf8');

  console.log(`Export supervisionado salvo em: ${args.out}`);
  console.table([
    {
      month: monthKey,
      inputCount: items.length,
      exported: training.length,
      minScore: args.minScore,
    },
  ]);
}

main();
