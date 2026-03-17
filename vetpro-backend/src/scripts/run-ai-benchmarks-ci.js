/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function runStep({ label, command, args = [], cwd }) {
  const startedAt = Date.now();
  const proc = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: process.env,
  });
  const durationMs = Date.now() - startedAt;
  return {
    label,
    command: [command, ...args].join(' '),
    durationMs,
    exitCode: Number(proc.status ?? 1),
    ok: Number(proc.status ?? 1) === 0,
    stdout: String(proc.stdout || '').slice(-6000),
    stderr: String(proc.stderr || '').slice(-6000),
  };
}

function parseArgs(argv = []) {
  return {
    withFieldDataset: !argv.includes('--skip-field-dataset'),
    withMobile: !argv.includes('--skip-mobile'),
    withRegressionSuite: !argv.includes('--skip-regression-suite'),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const backendRoot = path.resolve(__dirname, '..', '..');
  const logsDir = path.join(backendRoot, 'logs');
  const outDir = path.join(logsDir, 'ai-benchmarks');
  fs.mkdirSync(outDir, { recursive: true });

  const steps = [
    { label: 'ai:evaluate', command: 'npm', args: ['run', 'ai:evaluate'] },
  ];

  if (args.withMobile) {
    steps.push({
      label: 'ai:evaluate:mobile',
      command: 'npm',
      args: ['run', 'ai:evaluate:mobile'],
    });
  }

  if (args.withFieldDataset) {
    steps.push({
      label: 'ai:evaluate:field-dataset:simulated',
      command: 'npm',
      args: ['run', 'ai:evaluate:field-dataset:simulated'],
    });
  }

  steps.push({
    label: 'ai:quality:dashboard',
    command: 'npm',
    args: ['run', 'ai:quality:dashboard', '--', '--days=365'],
  });
  steps.push({
    label: 'ai:quality:alerts',
    command: 'npm',
    args: ['run', 'ai:quality:alerts'],
  });

  if (args.withRegressionSuite) {
    steps.push({
      label: 'ai:regression:suite',
      command: 'npm',
      args: ['run', 'ai:regression:suite'],
    });
  }

  const results = steps.map((step) => runStep({ ...step, cwd: backendRoot }));
  const failed = results.filter((item) => !item.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    backendRoot,
    summary: {
      totalSteps: results.length,
      failedSteps: failed.length,
      ok: failed.length === 0,
    },
    steps: results.map((item) => ({
      label: item.label,
      command: item.command,
      durationMs: item.durationMs,
      exitCode: item.exitCode,
      ok: item.ok,
    })),
    logs: results.reduce((acc, item) => {
      acc[item.label] = {
        stdout: item.stdout,
        stderr: item.stderr,
      };
      return acc;
    }, {}),
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(outDir, `ai-benchmark-ci-${stamp}.json`);
  const latestPath = path.join(outDir, 'ai-benchmark-ci-latest.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Benchmark CI report: ${reportPath}`);
  console.table(
    report.steps.map((item) => ({
      step: item.label,
      ok: item.ok,
      exitCode: item.exitCode,
      durationMs: item.durationMs,
    })),
  );

  if (failed.length > 0) {
    console.error(
      `Falha em ${failed.length} etapa(s): ${failed.map((item) => item.label).join(', ')}`,
    );
    process.exit(1);
  }
}

main();
