const fs = require('fs');
const path = require('path');
const {
  generateRecordDraftFromChat,
} = require('../services/recordChatAssistService');

const EXAMPLES_PATH = path.join(
  __dirname,
  '..',
  'ai',
  'recordChatExamples.json',
);

function normalize(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isFilled(value) {
  return String(value || '').trim().length > 0;
}

function socialNoiseScore(text = '') {
  const normalized = normalize(text);
  const tokenSet = new Set(normalized.split(/[^a-z0-9]+/g).filter(Boolean));
  let score = 0;

  const phraseNoise = ['bom dia', 'boa tarde', 'boa noite', 'como vai'];
  const wordNoise = [
    'ola',
    'oi',
    'dr',
    'dra',
    'doutor',
    'doutora',
    'entendi',
    'vamos',
  ];

  for (const phrase of phraseNoise) {
    if (normalized.includes(phrase)) score += 1;
  }
  for (const token of wordNoise) {
    if (tokenSet.has(token)) score += 1;
  }

  return score;
}

function loadExamples() {
  if (!fs.existsSync(EXAMPLES_PATH)) {
    throw new Error(`Arquivo de exemplos nao encontrado: ${EXAMPLES_PATH}`);
  }
  const parsed = JSON.parse(fs.readFileSync(EXAMPLES_PATH, 'utf8'));
  return Array.isArray(parsed?.examples) ? parsed.examples : [];
}

function toPatient(porte = 'pequeno') {
  if (porte === 'grande') {
    return {
      species: 'Mamífero',
      breed: 'Bovino',
      ownerName: 'Fazenda Exemplo',
    };
  }
  return { species: 'Mamífero', breed: 'Canino', ownerName: 'Tutor Exemplo' };
}

async function evaluateExample(example) {
  const expected = example.output || {};
  const expectedSpecific = expected.specificFields || {};
  const specificKeys = Object.keys(expectedSpecific);

  const result = await generateRecordDraftFromChat({
    messages: [{ role: 'user', content: String(example.input || '') }],
    mode: example.mode === 'retorno' ? 'retorno' : 'nova',
    patient: toPatient(example.porte),
    recordProfile: {
      porte: example.porte === 'grande' ? 'grande' : 'pequeno',
      specificFieldKeys: specificKeys,
      detailLevel: 'max',
    },
  });

  const draft = result?.draft || {};
  const draftSpecific = draft.specificFields || {};

  const coreFields = [
    'chiefComplaint',
    'anamnesis',
    'physicalExam',
    'diagnosis',
    'treatment',
    'procedures',
    'medications',
    'examDetails',
    'notes',
    'returnRecommendation',
  ];

  let expectedCoreCount = 0;
  let predictedCoreCount = 0;
  for (const field of coreFields) {
    if (isFilled(expected[field])) {
      expectedCoreCount += 1;
      if (isFilled(draft[field])) predictedCoreCount += 1;
    }
  }

  let expectedSpecificCount = 0;
  let predictedSpecificCount = 0;
  for (const key of specificKeys) {
    if (isFilled(expectedSpecific[key])) {
      expectedSpecificCount += 1;
      if (isFilled(draftSpecific[key])) predictedSpecificCount += 1;
    }
  }

  return {
    id: example.id,
    provider: result?.provider || 'none',
    coreCoverage: expectedCoreCount
      ? predictedCoreCount / expectedCoreCount
      : 1,
    specificCoverage: expectedSpecificCount
      ? predictedSpecificCount / expectedSpecificCount
      : 1,
    chiefNoise: socialNoiseScore(draft.chiefComplaint),
    behaviorNoise: socialNoiseScore(draftSpecific.behavior || ''),
  };
}

async function main() {
  const examples = loadExamples();
  if (!examples.length) {
    console.log('Nenhum exemplo encontrado para avaliar.');
    return;
  }

  const rows = [];
  for (const example of examples) {
    // eslint-disable-next-line no-await-in-loop
    rows.push(await evaluateExample(example));
  }

  const avg = (values) =>
    values.length
      ? Number(
          (
            values.reduce((sum, value) => sum + value, 0) / values.length
          ).toFixed(3),
        )
      : 0;

  const coreAvg = avg(rows.map((row) => row.coreCoverage));
  const specificAvg = avg(rows.map((row) => row.specificCoverage));
  const chiefNoiseAvg = avg(rows.map((row) => row.chiefNoise));
  const behaviorNoiseAvg = avg(rows.map((row) => row.behaviorNoise));

  console.log('=== Avaliacao Chat Assist ===');
  console.table(rows);
  console.log(`Cobertura media core:      ${(coreAvg * 100).toFixed(1)}%`);
  console.log(`Cobertura media especifica: ${(specificAvg * 100).toFixed(1)}%`);
  console.log(`Ruido medio queixa:        ${chiefNoiseAvg.toFixed(2)}`);
  console.log(`Ruido medio comportamento: ${behaviorNoiseAvg.toFixed(2)}`);
}

main().catch((error) => {
  console.error('Falha ao avaliar chat assist:', error);
  process.exit(1);
});
