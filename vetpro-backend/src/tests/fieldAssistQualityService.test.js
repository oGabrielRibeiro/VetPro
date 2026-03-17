const {
  buildQualityDashboard,
  evaluateRegressionAlerts,
} = require('../services/fieldAssistQualityService');

describe('fieldAssistQualityService', () => {
  it('deve agregar dashboard com metricas principais', () => {
    const artifacts = [
      {
        data: {
          pipeline: {
            totalMs: 8000,
            stages: {
              ai_analysis: { latencyMs: 2500 },
              quality_gate: { latencyMs: 140 },
            },
          },
          transcriptionMeta: { usedTranscriptFallback: false },
          parsed: {
            quality: {
              needsReview: false,
              lowConfidenceFields: ['diagnosis'],
              aiSelfCheck: { score: 0.8 },
              aiPrompt: { contextMode: 'campo' },
            },
          },
        },
      },
      {
        data: {
          pipeline: {
            totalMs: 12000,
            stages: {
              ai_analysis: { latencyMs: 4200 },
              quality_gate: { latencyMs: 210 },
            },
          },
          transcriptionMeta: { usedTranscriptFallback: true },
          parsed: {
            quality: {
              needsReview: true,
              lowConfidenceFields: ['chiefComplaint', 'treatment'],
              aiSelfCheck: { score: 0.55 },
              aiPrompt: { contextMode: 'retorno' },
            },
          },
        },
      },
    ];

    const report = buildQualityDashboard(artifacts);

    expect(report.totalRequests).toBe(2);
    expect(report.metrics.needsReviewRate).toBeCloseTo(0.5, 3);
    expect(report.metrics.lowConfidenceAvgCount).toBeCloseTo(1.5, 3);
    expect(report.metrics.aiSelfCheckAvgScore).toBeCloseTo(0.675, 3);
    expect(report.metrics.totalLatency.p95Ms).toBe(12000);
    expect(report.metrics.stageLatency.ai_analysis.samples).toBe(2);
    expect(report.breakdown.byContextMode.campo.requests).toBe(1);
  });

  it('deve sinalizar alertas de regressao quando thresholds forem violados', () => {
    const dashboard = {
      totalRequests: 12,
      metrics: {
        needsReviewRate: 0.7,
        lowConfidenceAvgCount: 3,
        aiSelfCheckAvgScore: 0.4,
        transcriptionFallbackRate: 0.8,
        totalLatency: { p95Ms: 18000 },
      },
    };

    const result = evaluateRegressionAlerts(dashboard);
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(4);
    expect(
      result.violations.some((item) => item.key === 'needsReviewRate'),
    ).toBe(true);
    expect(
      result.violations.some((item) => item.key === 'aiSelfCheckAvgScore'),
    ).toBe(true);
  });

  it('deve pular alerta quando nao houver amostras suficientes', () => {
    const dashboard = {
      totalRequests: 0,
      metrics: {
        needsReviewRate: 1,
        aiSelfCheckAvgScore: 0,
        lowConfidenceAvgCount: 10,
        transcriptionFallbackRate: 1,
        totalLatency: { p95Ms: 99999 },
      },
    };
    const result = evaluateRegressionAlerts(dashboard);
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('insufficient_samples');
  });
});
