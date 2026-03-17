/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { analyzeFieldConversation } = require('../services/fieldAssistService');

function normalize(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function containsNormalized(haystack = '', needle = '') {
  const h = normalize(haystack);
  const n = normalize(needle);
  return Boolean(h && n && h.includes(n));
}

function tokenizeRelevant(value = '') {
  return normalize(value)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 4);
}

function overlapScore(text = '', reference = '') {
  const sourceTokens = new Set(tokenizeRelevant(text));
  const referenceTokens = tokenizeRelevant(reference);
  if (!referenceTokens.length) return 1;
  const hits = referenceTokens.filter((token) =>
    sourceTokens.has(token),
  ).length;
  return hits / referenceTokens.length;
}

function buildSyntheticTranscript(dataset = {}) {
  const ctx = dataset.contexto_consulta || {};
  const nut = dataset.manejo_nutricao || {};
  const exam = dataset.exame_fisico || {};
  const diag = dataset.diagnostico || {};
  const treatment = Array.isArray(dataset.tratamento) ? dataset.tratamento : [];

  const tutorParts = [
    `Nome do animal ${ctx.paciente || 'Nao informado'}.`,
    `Especie ${ctx.especie || 'Nao informado'}.`,
    `Tutor ${ctx.tutor || 'Nao informado'}.`,
    `Propriedade ${ctx.propriedade || 'Nao informado'}.`,
    `Sistema de producao ${ctx.sistema_producao || 'Nao informado'}.`,
    `Lote ${ctx.lote || 'Nao informado'}.`,
    `Escore corporal ${ctx.escore_corporal || 'Nao informado'}.`,
    `Vacinacao ${nut.vacinacao || 'Nao informado'}.`,
    `Vermifugacao ${nut.vermifugacao || 'Nao informado'}.`,
    `Consumo de agua ${nut.agua || 'Nao informado'}.`,
  ];

  const medicoParts = [
    `No exame fisico temperatura ${exam.temperatura_c ?? 'Nao informado'} graus.`,
    `Frequencia cardiaca ${exam.fc_bpm ?? 'Nao informado'} bpm.`,
    `Frequencia respiratoria ${exam.fr_irpm ?? 'Nao informado'} irpm.`,
    `Mucosas ${exam.mucosas || 'Nao informado'}.`,
    `TPC ${exam.tpc_seg ?? 'Nao informado'} segundos.`,
    `Desidratacao ${exam.desidratacao_percent ?? 'Nao informado'} por cento.`,
    `Dor abdominal ${exam.dor_abdominal || 'Nao informado'}.`,
    `Diagnostico principal ${diag.principal || 'Nao informado'}.`,
    `Diagnosticos diferenciais ${Array.isArray(diag.diferenciais) ? diag.diferenciais.join(', ') : 'Nao informado'}.`,
    `Prognostico ${diag.prognostico || 'Nao informado'}.`,
    `Tratamento proposto ${treatment.join('; ') || 'Nao informado'}.`,
  ];

  return `Tutor: ${tutorParts.join(' ')}\nMedico: ${medicoParts.join(' ')}`;
}

function summarizeMetrics(result = {}, dataset = {}) {
  const parsed = result.parsed || {};
  const exam = dataset.exame_fisico || {};
  const diag = dataset.diagnostico || {};
  const treatment = Array.isArray(dataset.tratamento) ? dataset.tratamento : [];

  const diagnosisText = String(parsed.diagnosis || parsed.diagnostico || '');
  const treatmentText = [
    parsed.treatment,
    parsed.medications,
    parsed.procedures,
    parsed.examDetails,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');
  const examText = [
    parsed.physicalExam,
    parsed.temperatura,
    parsed.frequencia_cardiaca,
    parsed.frequencia_respiratoria,
    parsed.mucosas,
    parsed.hidratacao,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');

  const diagnosisScore = overlapScore(diagnosisText, diag.principal || '');
  const treatmentScore = overlapScore(treatmentText, treatment.join(' '));
  const examScore = overlapScore(
    examText,
    [
      `temperatura ${exam.temperatura_c ?? ''}`,
      `frequencia cardiaca ${exam.fc_bpm ?? ''}`,
      `frequencia respiratoria ${exam.fr_irpm ?? ''}`,
      `mucosas ${exam.mucosas || ''}`,
      `desidratacao ${exam.desidratacao_percent ?? ''}`,
      `dor abdominal ${exam.dor_abdominal || ''}`,
    ].join(' '),
  );

  const hasDiagnosis = containsNormalized(diagnosisText, diag.principal || '');
  const hasTreatmentEvidence = treatment.some((item) =>
    containsNormalized(treatmentText, item),
  );
  const hasExamEvidence =
    containsNormalized(examText, String(exam.temperatura_c ?? '')) &&
    containsNormalized(examText, String(exam.fc_bpm ?? ''));

  const globalScore = Number(
    ((diagnosisScore + treatmentScore + examScore) / 3).toFixed(3),
  );

  const specificChecks = [
    {
      key: 'vacinacao',
      expected: dataset?.manejo_nutricao?.vacinacao || '',
      predicted: parsed.vacinacao || '',
    },
    {
      key: 'vermifugacao',
      expected: dataset?.manejo_nutricao?.vermifugacao || '',
      predicted: parsed.vermifugacao || '',
    },
    {
      key: 'temperatura',
      expected: String(dataset?.exame_fisico?.temperatura_c ?? ''),
      predicted: parsed.temperatura || parsed.physicalExam || '',
    },
    {
      key: 'frequencia_cardiaca',
      expected: String(dataset?.exame_fisico?.fc_bpm ?? ''),
      predicted: parsed.frequencia_cardiaca || parsed.physicalExam || '',
    },
    {
      key: 'mucosas',
      expected: dataset?.exame_fisico?.mucosas || '',
      predicted: parsed.mucosas || parsed.physicalExam || '',
    },
  ].map((item) => {
    const match = containsNormalized(item.predicted, item.expected);
    return { ...item, match };
  });

  const specificCoverage = Number(
    (
      specificChecks.filter((item) => item.match).length /
      Math.max(specificChecks.length, 1)
    ).toFixed(3),
  );

  return {
    diagnosisScore: Number(diagnosisScore.toFixed(3)),
    treatmentScore: Number(treatmentScore.toFixed(3)),
    examScore: Number(examScore.toFixed(3)),
    globalScore,
    specificCoverage,
    checks: {
      hasDiagnosis,
      hasTreatmentEvidence,
      hasExamEvidence,
    },
    specificChecks,
  };
}

function parseArgs(argv = []) {
  const args = {
    datasetDir: null,
    transcriptOnly: false,
    simulateAsr: false,
    runs: 8,
  };

  for (const arg of argv) {
    if (arg === '--transcript-only') {
      args.transcriptOnly = true;
      continue;
    }
    if (arg === '--simulate-asr') {
      args.simulateAsr = true;
      args.transcriptOnly = true;
      continue;
    }
    if (arg.startsWith('--dataset-dir=')) {
      args.datasetDir = arg.replace('--dataset-dir=', '').trim();
      continue;
    }
    if (arg.startsWith('--runs=')) {
      const value = Number(arg.replace('--runs=', '').trim());
      if (Number.isFinite(value) && value >= 1 && value <= 50) {
        args.runs = Math.floor(value);
      }
    }
  }

  return args;
}

function createDeterministicRng(seed = 42) {
  let state = Math.abs(Number(seed) || 42) % 2147483647;
  if (state === 0) state = 42;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

function mutateToken(token = '', rng = Math.random) {
  const value = String(token || '');
  if (!value) return value;
  const roll = rng();
  if (roll < 0.07) return '';
  if (roll < 0.13 && value.length > 5) return value.slice(0, -1);
  if (roll < 0.17 && /\d/.test(value)) return value.replace(/\d/g, '');
  if (roll < 0.2 && value.length > 4) return `${value}${value.slice(-1)}`;
  return value;
}

function simulateAsrNoise(text = '', seed = 42) {
  const rng = createDeterministicRng(seed);
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const mutated = lines.map((line) => {
    const tokens = line.split(/\s+/g);
    const next = [];
    for (const token of tokens) {
      const changed = mutateToken(token, rng);
      if (!changed) continue;
      next.push(changed);
      if (rng() < 0.04) next.push(changed);
    }
    return next.join(' ').trim();
  });

  return mutated.join('\n').trim();
}

function semanticSignatureByField(field = '', value = '') {
  const text = normalize(value);
  if (!text) return '';

  const diagnosisRules = [
    {
      regex: /\breticuloperiton|corpo estranho\b/,
      label: 'reticuloperitonite',
    },
    { regex: /\bcolica|dor abdominal\b/, label: 'colica' },
    { regex: /\bmastite|quarto mamario\b/, label: 'mastite' },
    { regex: /\bgastroenter|enterop|diarre\b/, label: 'enteropatia' },
    { regex: /\botite|conduto|orelha\b/, label: 'otite' },
    { regex: /\bpododerm|casco|manc|claudic\b/, label: 'locomotor' },
  ];
  const treatmentRules = [
    { regex: /\bhidrat|ringer|fluid|soro\b/, label: 'suporte_hidrico' },
    { regex: /\bdiet|alimen|nutri|manejo\b/, label: 'ajuste_nutricional' },
    { regex: /\bmonitor|retorn|reavali|temperat\b/, label: 'monitoramento' },
    {
      regex: /\banti[- ]?inflam|flunix|melox|cetopro\b/,
      label: 'anti_inflamatorio',
    },
    {
      regex: /\bantibio|oxitetra|penic|cef|ciclina\b/,
      label: 'antibioticoterapia',
    },
    {
      regex: /\bima ruminal|proced|colet|sondag|curativ\b/,
      label: 'procedimentos',
    },
    {
      regex: /\bexame|hemogram|cultur|copro|ultra|radiograf\b/,
      label: 'exames',
    },
  ];

  if (field === 'diagnosis') {
    const hit = diagnosisRules.find((rule) => rule.regex.test(text));
    return hit ? hit.label : '';
  }

  if (field === 'treatment') {
    const labels = treatmentRules
      .filter((rule) => rule.regex.test(text))
      .map((rule) => rule.label);
    return labels.sort().join('|');
  }

  if (field === 'physicalExam') {
    const tags = [];
    if (/\btemperat|\bfc\b|\bfr\b|frequenc/.test(text)) tags.push('vitals');
    if (/\bmucos|tpc|desidrat|hidrata/.test(text)) tags.push('perfusion');
    if (/\bdor\b|palpac|auscult|motilid|edema/.test(text))
      tags.push('semiology');
    return tags.sort().join('|');
  }

  return '';
}

function semanticConsistencyIndex(values = [], field = '') {
  const normalized = values
    .map((value) => normalize(value))
    .filter((value) => value.length > 0);
  if (!normalized.length) return 0;

  let pairs = 0;
  let matches = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      pairs += 1;
      const a = normalized[i];
      const b = normalized[j];
      const sigA = semanticSignatureByField(field, a);
      const sigB = semanticSignatureByField(field, b);

      const sameSemantic = Boolean(sigA && sigB && sigA === sigB);
      const partialExamSemantic =
        field === 'physicalExam' && sigA && sigB
          ? sigA
              .split('|')
              .some((token) => token && sigB.split('|').includes(token))
          : false;
      const contains = a === b || a.includes(b) || b.includes(a);
      const overlap = overlapScore(a, b) >= 0.65;

      if (sameSemantic || partialExamSemantic || contains || overlap)
        matches += 1;
    }
  }
  if (!pairs) return 1;
  return Number((matches / pairs).toFixed(3));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const datasetDir = args.datasetDir
    ? path.resolve(repoRoot, args.datasetDir)
    : path.join(repoRoot, 'dataset_treinamento_veterinario_apolo');

  const datasetPath = path.join(datasetDir, 'dataset_prontuario_apolo.json');
  const wavPath = path.join(datasetDir, 'vet_dialogo_treinamento_realista.wav');
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset JSON nao encontrado em: ${datasetPath}`);
  }

  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const syntheticTranscript = buildSyntheticTranscript(dataset);

  let audioBuffer = null;
  if (!args.transcriptOnly && fs.existsSync(wavPath)) {
    audioBuffer = fs.readFileSync(wavPath);
  }

  const runs = [];
  const totalRuns = args.simulateAsr ? args.runs : 1;
  for (let index = 0; index < totalRuns; index += 1) {
    const transcriptForRun = args.simulateAsr
      ? simulateAsrNoise(syntheticTranscript, 42 + index * 17)
      : syntheticTranscript;
    // eslint-disable-next-line no-await-in-loop
    const result = await analyzeFieldConversation({
      audioBuffer: args.simulateAsr ? null : audioBuffer,
      mimeType: 'audio/wav',
      filename: path.basename(wavPath),
      segments: [],
      transcript: transcriptForRun,
    });
    runs.push({
      run: index + 1,
      transcriptLength: String(result?.transcript || '').length,
      parsed: result?.parsed || {},
      metrics: summarizeMetrics(result, dataset),
    });
  }

  const [{ metrics }] = runs;
  const simulatedSummary = args.simulateAsr
    ? {
        runs: runs.length,
        avgGlobalScore: Number(
          (
            runs.reduce((sum, item) => sum + item.metrics.globalScore, 0) /
            Math.max(runs.length, 1)
          ).toFixed(3),
        ),
        bestGlobalScore: Number(
          Math.max(...runs.map((item) => item.metrics.globalScore)).toFixed(3),
        ),
        worstGlobalScore: Number(
          Math.min(...runs.map((item) => item.metrics.globalScore)).toFixed(3),
        ),
        diagnosisConsistency: semanticConsistencyIndex(
          runs.map((item) => item.parsed.diagnosis || ''),
          'diagnosis',
        ),
        treatmentConsistency: semanticConsistencyIndex(
          runs.map((item) => item.parsed.treatment || ''),
          'treatment',
        ),
        examConsistency: semanticConsistencyIndex(
          runs.map((item) => item.parsed.physicalExam || ''),
          'physicalExam',
        ),
      }
    : null;

  const report = {
    executedAt: new Date().toISOString(),
    datasetPath,
    wavPath: fs.existsSync(wavPath) ? wavPath : null,
    transcriptOnly: Boolean(args.transcriptOnly || !audioBuffer),
    simulateAsr: args.simulateAsr,
    runs: runs.map((item) => ({
      run: item.run,
      transcriptLength: item.transcriptLength,
      metrics: item.metrics,
    })),
    simulatedSummary,
    metrics,
    parsed: runs[0].parsed,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(logsDir, `field-agent-eval-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('=== Avaliacao Dataset de Campo (Apolo) ===');
  console.table([
    {
      diagnostico: metrics.diagnosisScore,
      tratamento: metrics.treatmentScore,
      exame: metrics.examScore,
      scoreGlobal: metrics.globalScore,
      coberturaPorte: metrics.specificCoverage,
      temDiagnostico: metrics.checks.hasDiagnosis,
      temTratamento: metrics.checks.hasTreatmentEvidence,
      temExame: metrics.checks.hasExamEvidence,
      transcriptOnly: report.transcriptOnly,
      simulateAsr: args.simulateAsr,
      runs: totalRuns,
    },
  ]);
  if (simulatedSummary) {
    console.table([
      {
        avgScore: simulatedSummary.avgGlobalScore,
        bestScore: simulatedSummary.bestGlobalScore,
        worstScore: simulatedSummary.worstGlobalScore,
        consDiag: simulatedSummary.diagnosisConsistency,
        consTrat: simulatedSummary.treatmentConsistency,
        consExame: simulatedSummary.examConsistency,
      },
    ]);
  }
  console.log(`Relatorio salvo em: ${reportPath}`);
}

main().catch((error) => {
  console.error('Falha ao avaliar dataset de campo:', error.message);
  process.exit(1);
});
