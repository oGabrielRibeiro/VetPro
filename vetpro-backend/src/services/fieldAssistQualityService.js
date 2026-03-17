const fs = require('fs');
const path = require('path');

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function percentile(values = [], p = 95) {
  const nums = (Array.isArray(values) ? values : [])
    .map((value) => toNumber(value, NaN))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!nums.length) return 0;
  const rank = Math.min(
    nums.length - 1,
    Math.max(0, Math.ceil((p / 100) * nums.length) - 1),
  );
  return nums[rank];
}

function avg(values = []) {
  const nums = (Array.isArray(values) ? values : [])
    .map((value) => toNumber(value, NaN))
    .filter((value) => Number.isFinite(value));
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function extractArtifactsFromDir({ artifactsDir, days = 30 }) {
  const baseDir = path.resolve(
    artifactsDir ||
      path.resolve(process.cwd(), 'logs', 'field-assist-artifacts'),
  );
  if (!fs.existsSync(baseDir)) return [];

  const maxAgeMs = Math.max(1, toNumber(days, 30)) * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const filePath = path.join(baseDir, entry.name);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) return null;
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          filePath,
          mtimeMs: stat.mtimeMs,
          data: parsed,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function buildQualityDashboard(artifactItems = []) {
  const items = Array.isArray(artifactItems) ? artifactItems : [];
  const artifacts = items
    .map((item) => item?.data || null)
    .filter((item) => item && typeof item === 'object');

  const totalMsList = artifacts.map((item) => item?.pipeline?.totalMs || 0);
  const needsReviewList = artifacts.map((item) =>
    item?.parsed?.quality?.needsReview ? 1 : 0,
  );
  const lowConfidenceCountList = artifacts.map((item) =>
    Array.isArray(item?.parsed?.quality?.lowConfidenceFields)
      ? item.parsed.quality.lowConfidenceFields.length
      : 0,
  );
  const selfCheckScoreList = artifacts.map(
    (item) => item?.parsed?.quality?.aiSelfCheck?.score || 0,
  );
  const transcriptionFallbackList = artifacts.map((item) =>
    item?.transcriptionMeta?.usedTranscriptFallback ? 1 : 0,
  );

  const stageLatency = {};
  for (const artifact of artifacts) {
    const stages = artifact?.pipeline?.stages || {};
    for (const [stage, details] of Object.entries(stages)) {
      if (!stageLatency[stage]) stageLatency[stage] = [];
      stageLatency[stage].push(toNumber(details?.latencyMs, 0));
    }
  }

  const stageSummary = Object.fromEntries(
    Object.entries(stageLatency).map(([stage, values]) => [
      stage,
      {
        avgMs: Number(avg(values).toFixed(2)),
        p95Ms: Number(percentile(values, 95).toFixed(2)),
        samples: values.length,
      },
    ]),
  );

  const byContextMode = {};
  for (const artifact of artifacts) {
    const mode =
      String(artifact?.parsed?.quality?.aiPrompt?.contextMode || 'unknown') ||
      'unknown';
    if (!byContextMode[mode]) {
      byContextMode[mode] = {
        requests: 0,
        needsReviewRate: 0,
      };
    }
    byContextMode[mode].requests += 1;
    if (artifact?.parsed?.quality?.needsReview) {
      byContextMode[mode].needsReviewRate += 1;
    }
  }
  const byContextModeNormalized = Object.fromEntries(
    Object.entries(byContextMode).map(([mode, entry]) => [
      mode,
      {
        ...entry,
        needsReviewRate: Number(
          (entry.needsReviewRate / Math.max(1, entry.requests)).toFixed(3),
        ),
      },
    ]),
  );

  const totalRequests = artifacts.length;
  return {
    generatedAt: new Date().toISOString(),
    totalRequests,
    metrics: {
      needsReviewRate: Number((avg(needsReviewList) || 0).toFixed(3)),
      lowConfidenceAvgCount: Number(avg(lowConfidenceCountList).toFixed(3)),
      aiSelfCheckAvgScore: Number(avg(selfCheckScoreList).toFixed(3)),
      transcriptionFallbackRate: Number(
        (avg(transcriptionFallbackList) || 0).toFixed(3),
      ),
      totalLatency: {
        avgMs: Number(avg(totalMsList).toFixed(2)),
        p95Ms: Number(percentile(totalMsList, 95).toFixed(2)),
      },
      stageLatency: stageSummary,
    },
    breakdown: {
      byContextMode: byContextModeNormalized,
    },
  };
}

function defaultRegressionThresholds() {
  return {
    minSamples: 5,
    maxNeedsReviewRate: 0.35,
    maxP95TotalMs: 12000,
    minAiSelfCheckAvgScore: 0.6,
    maxLowConfidenceAvgCount: 2.5,
    maxTranscriptionFallbackRate: 0.5,
  };
}

function evaluateRegressionAlerts(dashboard = {}, thresholds = {}) {
  const current = dashboard?.metrics || {};
  const totalRequests = toNumber(dashboard?.totalRequests, 0);
  const merged = {
    ...defaultRegressionThresholds(),
    ...(thresholds || {}),
  };

  if (totalRequests < merged.minSamples) {
    return {
      ok: true,
      skipped: true,
      reason: 'insufficient_samples',
      totalRequests,
      thresholds: merged,
      violations: [],
    };
  }

  const violations = [];
  const pushViolation = (key, actual, expected, comparator) => {
    violations.push({
      key,
      actual: Number(toNumber(actual, 0).toFixed(3)),
      expected: Number(toNumber(expected, 0).toFixed(3)),
      comparator,
    });
  };

  if (toNumber(current?.needsReviewRate, 0) > merged.maxNeedsReviewRate) {
    pushViolation(
      'needsReviewRate',
      current.needsReviewRate,
      merged.maxNeedsReviewRate,
      '<=',
    );
  }

  if (toNumber(current?.totalLatency?.p95Ms, 0) > merged.maxP95TotalMs) {
    pushViolation(
      'totalLatency.p95Ms',
      current.totalLatency.p95Ms,
      merged.maxP95TotalMs,
      '<=',
    );
  }

  if (
    toNumber(current?.aiSelfCheckAvgScore, 0) < merged.minAiSelfCheckAvgScore
  ) {
    pushViolation(
      'aiSelfCheckAvgScore',
      current.aiSelfCheckAvgScore,
      merged.minAiSelfCheckAvgScore,
      '>=',
    );
  }

  if (
    toNumber(current?.lowConfidenceAvgCount, 0) >
    merged.maxLowConfidenceAvgCount
  ) {
    pushViolation(
      'lowConfidenceAvgCount',
      current.lowConfidenceAvgCount,
      merged.maxLowConfidenceAvgCount,
      '<=',
    );
  }

  if (
    toNumber(current?.transcriptionFallbackRate, 0) >
    merged.maxTranscriptionFallbackRate
  ) {
    pushViolation(
      'transcriptionFallbackRate',
      current.transcriptionFallbackRate,
      merged.maxTranscriptionFallbackRate,
      '<=',
    );
  }

  return {
    ok: violations.length === 0,
    skipped: false,
    totalRequests,
    thresholds: merged,
    violations,
  };
}

module.exports = {
  extractArtifactsFromDir,
  buildQualityDashboard,
  evaluateRegressionAlerts,
  defaultRegressionThresholds,
};
