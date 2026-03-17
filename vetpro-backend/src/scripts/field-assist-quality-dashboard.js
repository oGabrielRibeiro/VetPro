/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const {
  extractArtifactsFromDir,
  buildQualityDashboard,
} = require('../services/fieldAssistQualityService');

function parseArgs(argv = []) {
  const args = {
    artifactsDir: path.resolve(process.cwd(), 'logs', 'field-assist-artifacts'),
    outDir: path.resolve(process.cwd(), 'logs'),
    days: 30,
  };

  for (const arg of argv) {
    if (arg.startsWith('--artifacts-dir=')) {
      args.artifactsDir = path.resolve(
        process.cwd(),
        arg.replace('--artifacts-dir=', '').trim(),
      );
    } else if (arg.startsWith('--out-dir=')) {
      args.outDir = path.resolve(
        process.cwd(),
        arg.replace('--out-dir=', '').trim(),
      );
    } else if (arg.startsWith('--days=')) {
      const value = Number(arg.replace('--days=', '').trim());
      if (Number.isFinite(value) && value > 0) args.days = Math.floor(value);
    }
  }
  return args;
}

function buildMarkdown(report = {}) {
  const metrics = report?.metrics || {};
  const total = Number(report?.totalRequests || 0);
  const stages = metrics?.stageLatency || {};
  const stageRows = Object.entries(stages)
    .map(
      ([stage, details]) =>
        `| ${stage} | ${details.avgMs} | ${details.p95Ms} | ${details.samples} |`,
    )
    .join('\n');

  return [
    '# Field-Assist Quality Dashboard',
    '',
    `- generatedAt: ${report.generatedAt || ''}`,
    `- totalRequests: ${total}`,
    '',
    '## Metrics',
    '',
    `- needsReviewRate: ${metrics.needsReviewRate}`,
    `- lowConfidenceAvgCount: ${metrics.lowConfidenceAvgCount}`,
    `- aiSelfCheckAvgScore: ${metrics.aiSelfCheckAvgScore}`,
    `- transcriptionFallbackRate: ${metrics.transcriptionFallbackRate}`,
    `- totalLatency.avgMs: ${metrics?.totalLatency?.avgMs || 0}`,
    `- totalLatency.p95Ms: ${metrics?.totalLatency?.p95Ms || 0}`,
    '',
    '## Stage Latency',
    '',
    '| stage | avgMs | p95Ms | samples |',
    '|---|---:|---:|---:|',
    stageRows || '| (none) | 0 | 0 | 0 |',
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifacts = extractArtifactsFromDir({
    artifactsDir: args.artifactsDir,
    days: args.days,
  });
  const dashboard = buildQualityDashboard(artifacts);

  fs.mkdirSync(args.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(args.outDir, `field-assist-quality-${stamp}.json`);
  const mdPath = path.join(args.outDir, `field-assist-quality-${stamp}.md`);
  const latestJsonPath = path.join(
    args.outDir,
    'field-assist-quality-latest.json',
  );
  const latestMdPath = path.join(args.outDir, 'field-assist-quality-latest.md');

  fs.writeFileSync(jsonPath, JSON.stringify(dashboard, null, 2), 'utf8');
  fs.writeFileSync(mdPath, buildMarkdown(dashboard), 'utf8');
  fs.writeFileSync(latestJsonPath, JSON.stringify(dashboard, null, 2), 'utf8');
  fs.writeFileSync(latestMdPath, buildMarkdown(dashboard), 'utf8');

  console.log(`Dashboard gerado: ${jsonPath}`);
  console.log(`Resumo markdown: ${mdPath}`);
  console.log(`Total requests analisadas: ${dashboard.totalRequests}`);
}

main();
