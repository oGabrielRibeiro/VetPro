/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function parseArgs(argv = []) {
  const args = {
    month: '',
    outDir: path.resolve(process.cwd(), 'logs'),
  };
  argv.forEach((arg) => {
    if (arg.startsWith('--month='))
      args.month = arg.replace('--month=', '').trim();
    if (arg.startsWith('--out-dir=')) {
      args.outDir = path.resolve(
        process.cwd(),
        arg.replace('--out-dir=', '').trim(),
      );
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

  const byDecision = { accepted: 0, rejected: 0 };
  const byField = {};
  const bySource = {};
  let needsReviewCount = 0;

  for (const item of items) {
    const decision = item?.decision === 'accepted' ? 'accepted' : 'rejected';
    const field = String(item?.field || 'unknown').trim() || 'unknown';
    const source = String(item?.source || 'unknown').trim() || 'unknown';
    byDecision[decision] += 1;
    byField[field] = byField[field] || { accepted: 0, rejected: 0, total: 0 };
    byField[field][decision] += 1;
    byField[field].total += 1;
    bySource[source] = (bySource[source] || 0) + 1;
    if (item?.quality?.needsReview) needsReviewCount += 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    monthKey,
    sourcePath,
    totals: {
      count: items.length,
      byDecision,
      needsReviewCount,
    },
    byField,
    bySource,
  };

  fs.mkdirSync(args.outDir, { recursive: true });
  const jsonPath = path.join(
    args.outDir,
    `field-assist-feedback-report-${monthKey}.json`,
  );
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Relatorio salvo em: ${jsonPath}`);
  console.table([
    {
      month: monthKey,
      total: items.length,
      accepted: byDecision.accepted,
      rejected: byDecision.rejected,
      needsReview: needsReviewCount,
    },
  ]);
}

main();
