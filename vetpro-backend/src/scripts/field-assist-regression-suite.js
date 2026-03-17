/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function findLatestReport({ logsDir, sinceMs = 0 }) {
  if (!fs.existsSync(logsDir)) return null;
  const files = fs
    .readdirSync(logsDir)
    .filter((name) => /^field-agent-eval-.*\.json$/.test(name))
    .map((name) => {
      const full = path.join(logsDir, name);
      const stat = fs.statSync(full);
      return { full, mtimeMs: stat.mtimeMs };
    })
    .filter((item) => item.mtimeMs >= sinceMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files[0]?.full || null;
}

function main() {
  const backendRoot = path.resolve(__dirname, '..', '..');
  const logsDir = path.join(backendRoot, 'logs');
  const baselinePath = path.join(
    backendRoot,
    'src',
    'ai',
    'benchmarks',
    'field-assist-baseline.json',
  );
  if (!fs.existsSync(baselinePath)) {
    console.error(`Baseline nao encontrada: ${baselinePath}`);
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const thresholds = baseline.thresholds || {};

  const startedAt = Date.now();
  const runEval = spawnSync(
    'npm',
    ['run', 'ai:evaluate:field-dataset:simulated'],
    {
      cwd: backendRoot,
      encoding: 'utf8',
      shell: process.platform === 'win32',
      env: process.env,
    },
  );
  if (Number(runEval.status ?? 1) !== 0) {
    console.error('Falha ao executar ai:evaluate:field-dataset:simulated');
    console.error(String(runEval.stderr || '').slice(-6000));
    process.exit(1);
  }

  const latest = findLatestReport({ logsDir, sinceMs: startedAt - 5000 });
  if (!latest) {
    console.error(
      'Nao foi possivel localizar relatorio field-agent-eval apos execucao.',
    );
    process.exit(2);
  }

  const report = JSON.parse(fs.readFileSync(latest, 'utf8'));
  const sim = report.simulatedSummary || {};
  const failures = [];

  const checks = [
    {
      key: 'runs',
      actual: toNumber(sim.runs, 0),
      expected: toNumber(thresholds.minRuns, 1),
      comparator: '>=',
      pass: toNumber(sim.runs, 0) >= toNumber(thresholds.minRuns, 1),
    },
    {
      key: 'avgGlobalScore',
      actual: toNumber(sim.avgGlobalScore, 0),
      expected: toNumber(thresholds.minAvgGlobalScore, 0),
      comparator: '>=',
      pass:
        toNumber(sim.avgGlobalScore, 0) >=
        toNumber(thresholds.minAvgGlobalScore, 0),
    },
    {
      key: 'diagnosisConsistency',
      actual: toNumber(sim.diagnosisConsistency, 0),
      expected: toNumber(thresholds.minDiagnosisConsistency, 0),
      comparator: '>=',
      pass:
        toNumber(sim.diagnosisConsistency, 0) >=
        toNumber(thresholds.minDiagnosisConsistency, 0),
    },
    {
      key: 'treatmentConsistency',
      actual: toNumber(sim.treatmentConsistency, 0),
      expected: toNumber(thresholds.minTreatmentConsistency, 0),
      comparator: '>=',
      pass:
        toNumber(sim.treatmentConsistency, 0) >=
        toNumber(thresholds.minTreatmentConsistency, 0),
    },
    {
      key: 'examConsistency',
      actual: toNumber(sim.examConsistency, 0),
      expected: toNumber(thresholds.minExamConsistency, 0),
      comparator: '>=',
      pass:
        toNumber(sim.examConsistency, 0) >=
        toNumber(thresholds.minExamConsistency, 0),
    },
  ];

  checks.forEach((item) => {
    if (!item.pass) failures.push(item);
  });

  console.log(`Baseline: ${baseline.version || 'n/a'}`);
  console.log(`Relatorio analisado: ${latest}`);
  console.table(
    checks.map((item) => ({
      metric: item.key,
      pass: item.pass,
      actual: item.actual,
      expected: `${item.comparator} ${item.expected}`,
    })),
  );

  if (failures.length) {
    console.error('Regressao detectada na suite de casos criticos.');
    process.exit(1);
  }
}

main();
