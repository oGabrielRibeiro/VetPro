/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const {
  evaluateRegressionAlerts,
  defaultRegressionThresholds,
} = require('../services/fieldAssistQualityService');

function parseArgs(argv = []) {
  const defaults = defaultRegressionThresholds();
  const args = {
    dashboardPath: path.resolve(
      process.cwd(),
      'logs',
      'field-assist-quality-latest.json',
    ),
    thresholds: { ...defaults },
  };

  for (const arg of argv) {
    if (arg.startsWith('--dashboard=')) {
      args.dashboardPath = path.resolve(
        process.cwd(),
        arg.replace('--dashboard=', '').trim(),
      );
    } else if (arg.startsWith('--max-needs-review-rate=')) {
      args.thresholds.maxNeedsReviewRate = Number(
        arg.replace('--max-needs-review-rate=', '').trim(),
      );
    } else if (arg.startsWith('--max-p95-total-ms=')) {
      args.thresholds.maxP95TotalMs = Number(
        arg.replace('--max-p95-total-ms=', '').trim(),
      );
    } else if (arg.startsWith('--min-self-check-score=')) {
      args.thresholds.minAiSelfCheckAvgScore = Number(
        arg.replace('--min-self-check-score=', '').trim(),
      );
    } else if (arg.startsWith('--max-low-confidence-avg=')) {
      args.thresholds.maxLowConfidenceAvgCount = Number(
        arg.replace('--max-low-confidence-avg=', '').trim(),
      );
    } else if (arg.startsWith('--max-fallback-rate=')) {
      args.thresholds.maxTranscriptionFallbackRate = Number(
        arg.replace('--max-fallback-rate=', '').trim(),
      );
    }
  }

  if (Number.isFinite(Number(process.env.FIELD_ASSIST_MAX_NEEDS_REVIEW_RATE))) {
    args.thresholds.maxNeedsReviewRate = Number(
      process.env.FIELD_ASSIST_MAX_NEEDS_REVIEW_RATE,
    );
  }
  if (Number.isFinite(Number(process.env.FIELD_ASSIST_MAX_P95_TOTAL_MS))) {
    args.thresholds.maxP95TotalMs = Number(
      process.env.FIELD_ASSIST_MAX_P95_TOTAL_MS,
    );
  }
  if (Number.isFinite(Number(process.env.FIELD_ASSIST_MIN_SELF_CHECK_SCORE))) {
    args.thresholds.minAiSelfCheckAvgScore = Number(
      process.env.FIELD_ASSIST_MIN_SELF_CHECK_SCORE,
    );
  }
  if (
    Number.isFinite(Number(process.env.FIELD_ASSIST_MAX_LOW_CONFIDENCE_AVG))
  ) {
    args.thresholds.maxLowConfidenceAvgCount = Number(
      process.env.FIELD_ASSIST_MAX_LOW_CONFIDENCE_AVG,
    );
  }
  if (Number.isFinite(Number(process.env.FIELD_ASSIST_MAX_FALLBACK_RATE))) {
    args.thresholds.maxTranscriptionFallbackRate = Number(
      process.env.FIELD_ASSIST_MAX_FALLBACK_RATE,
    );
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.dashboardPath)) {
    console.error(`Dashboard não encontrado: ${args.dashboardPath}`);
    process.exit(2);
  }

  const raw = fs.readFileSync(args.dashboardPath, 'utf8');
  const dashboard = JSON.parse(raw);
  const result = evaluateRegressionAlerts(dashboard, args.thresholds);

  console.log(`Dashboard analisado: ${args.dashboardPath}`);
  console.log(`Thresholds: ${JSON.stringify(result.thresholds)}`);
  console.log(
    `Amostras: ${result.totalRequests ?? dashboard?.totalRequests ?? 0}`,
  );

  if (result.skipped) {
    console.log(
      `Validação pulada: ${result.reason} (minSamples=${result.thresholds.minSamples}).`,
    );
    process.exit(0);
  }

  if (result.ok) {
    console.log('Sem regressão detectada.');
    process.exit(0);
  }

  console.error('Regressão detectada:');
  for (const item of result.violations) {
    console.error(
      `- ${item.key}: atual=${item.actual} esperado ${item.comparator} ${item.expected}`,
    );
  }
  process.exit(1);
}

main();
