/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const TARGET_SIZE = 220;
const DATASET_VERSION = '2026-03-11.v1';
const SOURCE_PATH = path.resolve(
  __dirname,
  '..',
  'ai',
  'fieldModeTrainingDataset.json',
);
const OUTPUT_PATH = path.resolve(
  __dirname,
  '..',
  'ai',
  'benchmarks',
  'field-assist-gold-dataset.json',
);
const RUBRIC_PATH = path.resolve(
  __dirname,
  '..',
  'ai',
  'benchmarks',
  'field-assist-rubric.json',
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeText(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferSpecies(text = '') {
  const source = String(text || '').toLowerCase();
  if (/\bbovin|vaca|bezer|gado|rebanho/.test(source)) return 'bovino';
  if (/\bequin|cavalo|haras/.test(source)) return 'equino';
  if (/\bfelin|gato/.test(source)) return 'felino';
  if (/\bcanin|cachorro|cao/.test(source)) return 'canino';
  if (/\bovin|ovelha/.test(source)) return 'ovino';
  if (/\bcaprin|cabra/.test(source)) return 'caprino';
  return 'nao_informado';
}

function inferScenario(text = '') {
  const source = String(text || '').toLowerCase();
  if (/\bemergenc|urgenc|colica/.test(source)) return 'emergencia';
  if (/\bretorno|reavali/.test(source)) return 'retorno';
  if (/\bvacina|preventiv|checkup/.test(source)) return 'preventivo';
  return 'consulta_nova';
}

function sanitizeTranscript(text = '') {
  const compact = normalizeText(text)
    .replace(/\b(ricardo|joao|maria|ana|carlos)\b/gi, 'responsavel')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf_redigido]')
    .replace(/\b\d{2}\s?\d{4,5}-?\d{4}\b/g, '[telefone_redigido]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email_redigido]');
  return compact;
}

function deterministicSeed(index = 0) {
  return ((index * 9301 + 49297) % 233280) / 233280;
}

function mutateTranscript(base = '', variant = 'raw', index = 0) {
  const text = sanitizeTranscript(base);
  if (!text) return '';

  if (variant === 'raw') return text;

  let next = text;
  if (variant === 'clinical_synonym') {
    next = next
      .replace(/\btemperatura\b/gi, 'temp')
      .replace(/\bfrequencia cardiaca\b/gi, 'fc')
      .replace(/\bfrequencia respiratoria\b/gi, 'fr')
      .replace(/\bdiagnostico\b/gi, 'hipotese diagnostica')
      .replace(/\btratamento\b/gi, 'conduta');
  }

  if (variant === 'asr_noise_light') {
    next = next
      .replace(/\bque\b/gi, 'q')
      .replace(/\bpara\b/gi, 'pra')
      .replace(/\bcom\b/gi, 'c/')
      .replace(/\bnao\b/gi, 'n');
    if (deterministicSeed(index) > 0.5) {
      next = next.replace(/\btemperatura\b/gi, 'temperatra');
    }
  }

  return normalizeText(next);
}

function buildCase(sample, index = 0, variant = 'raw') {
  const transcript = mutateTranscript(sample.transcript || '', variant, index);
  const species = inferSpecies(transcript);
  const scenario = inferScenario(transcript);
  const target = sample.target || {};
  const specificFields =
    target.specificFields && typeof target.specificFields === 'object'
      ? target.specificFields
      : {};

  const difficulty =
    transcript.length > 700
      ? 'alta'
      : transcript.length > 350
        ? 'media'
        : 'baixa';

  const split = index % 10 === 0 ? 'test' : index % 5 === 0 ? 'dev' : 'train';

  return {
    id: `gold_${String(index + 1).padStart(4, '0')}`,
    version: DATASET_VERSION,
    split,
    sourceSampleId: sample.id || `sample_${index + 1}`,
    sourceType: sample.sourceType || 'training',
    mode: sample.mode || 'nova',
    porte: sample.porte || 'pequeno',
    species,
    scenario,
    difficulty,
    transcript,
    segments: Array.isArray(sample.segments) ? sample.segments : [],
    audio: {
      anonymized: true,
      status: 'catalogado',
      reference: `gold_audio_${String(index + 1).padStart(4, '0')}.wav`,
    },
    target: {
      chiefComplaint: normalizeText(target.chiefComplaint || ''),
      anamnesis: normalizeText(target.anamnesis || ''),
      physicalExam: normalizeText(target.physicalExam || ''),
      diagnosis: normalizeText(target.diagnosis || ''),
      treatment: normalizeText(target.treatment || ''),
      procedures: normalizeText(target.procedures || ''),
      medications: normalizeText(target.medications || ''),
      examDetails: normalizeText(target.examDetails || ''),
      notes: normalizeText(target.notes || ''),
      returnRecommendation: normalizeText(target.returnRecommendation || ''),
      porte: sample.porte || target.porte || 'pequeno',
      specificFields,
    },
  };
}

function buildRubricTemplate() {
  return {
    version: '2026-03-11.v1',
    description:
      'Rubrica oficial de avaliacao por campo para pipeline de audio/transcricao/parser/IA.',
    labels: {
      exato: {
        score: 1,
        criteria: 'Conteudo clinico principal e detalhes chave corretos.',
      },
      parcial: {
        score: 0.5,
        criteria:
          'Campo com sinal clinico correto, mas incompleto ou parcialmente especifico.',
      },
      incorreto: {
        score: 0,
        criteria:
          'Conteudo contraditorio, inventado ou clinicamente inadequado.',
      },
      nao_informado: {
        score: 0,
        criteria:
          'Campo ausente quando havia evidencia suficiente no transcript.',
      },
    },
    fieldWeights: {
      chiefComplaint: 0.12,
      anamnesis: 0.12,
      physicalExam: 0.18,
      diagnosis: 0.2,
      treatment: 0.2,
      medications: 0.08,
      examDetails: 0.06,
      returnRecommendation: 0.04,
    },
    specificFieldWeights: {
      vacinacao: 0.15,
      vermifugacao: 0.15,
      bodyConditionScore: 0.2,
      daysInMilk: 0.1,
      parity: 0.1,
      forage: 0.15,
      concentrate: 0.15,
    },
    partialMatchRules: {
      minLexicalOverlap: 0.45,
      minSemanticSignal: 0.5,
      allowUnitNormalization: true,
      allowSynonymNormalization: true,
    },
    gatingRules: {
      requiredCoreFields: ['physicalExam', 'diagnosis', 'treatment'],
      overfillPenalty: 0.2,
      hallucinationPenalty: 0.35,
      contradictionPenalty: 0.25,
    },
  };
}

function summarizeCases(cases = []) {
  const summary = {
    total: cases.length,
    byPorte: { pequeno: 0, grande: 0 },
    byMode: { nova: 0, retorno: 0 },
    byScenario: {},
    bySplit: { train: 0, dev: 0, test: 0 },
  };

  for (const item of cases) {
    if (item.porte === 'grande') summary.byPorte.grande += 1;
    else summary.byPorte.pequeno += 1;

    if (item.mode === 'retorno') summary.byMode.retorno += 1;
    else summary.byMode.nova += 1;

    summary.byScenario[item.scenario] =
      (summary.byScenario[item.scenario] || 0) + 1;
    summary.bySplit[item.split] = (summary.bySplit[item.split] || 0) + 1;
  }

  return summary;
}

function main() {
  const source = readJson(SOURCE_PATH);
  const samples = Array.isArray(source?.samples) ? source.samples : [];
  if (!samples.length) {
    throw new Error(`Sem amostras em ${SOURCE_PATH}`);
  }

  const variants = ['raw', 'clinical_synonym', 'asr_noise_light'];
  const cases = [];
  let cursor = 0;
  while (cases.length < TARGET_SIZE) {
    const sample = samples[cursor % samples.length];
    const variant =
      variants[Math.floor(cursor / samples.length) % variants.length];
    cases.push(buildCase(sample, cursor, variant));
    cursor += 1;
  }

  const rubric = buildRubricTemplate();
  const summary = summarizeCases(cases);

  const payload = {
    version: DATASET_VERSION,
    generatedAt: new Date().toISOString(),
    source: {
      file: path.relative(process.cwd(), SOURCE_PATH),
      baseSamples: samples.length,
      targetCases: TARGET_SIZE,
      variants,
    },
    summary,
    cases,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(RUBRIC_PATH, JSON.stringify(rubric, null, 2), 'utf8');

  console.log(`Gold dataset salvo em: ${OUTPUT_PATH}`);
  console.log(`Rubrica salva em: ${RUBRIC_PATH}`);
  console.table([summary]);
}

main();
