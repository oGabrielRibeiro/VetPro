/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const GOLD_PATH = path.resolve(
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
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo nao encontrado: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalize(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hasSensitiveMarkers(text = '') {
  const normalized = normalize(text);
  if (!normalized) return false;
  const patterns = [
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // cpf
    /\b\d{2}\s?\d{4,5}-?\d{4}\b/, // telefone
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/, // email
  ];
  return patterns.some((regex) => regex.test(normalized));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateRubric(rubric = {}) {
  assert(rubric && typeof rubric === 'object', 'Rubrica invalida.');
  assert(
    rubric.labels && typeof rubric.labels === 'object',
    'Rubrica sem labels.',
  );
  assert(
    rubric.fieldWeights && typeof rubric.fieldWeights === 'object',
    'Rubrica sem fieldWeights.',
  );
  const requiredLabels = ['exato', 'parcial', 'incorreto', 'nao_informado'];
  for (const key of requiredLabels) {
    assert(rubric.labels[key], `Rubrica sem label obrigatoria: ${key}`);
  }
}

function main() {
  const gold = readJson(GOLD_PATH);
  const rubric = readJson(RUBRIC_PATH);

  validateRubric(rubric);

  const cases = Array.isArray(gold?.cases) ? gold.cases : [];
  assert(
    cases.length >= 200,
    `Gold dataset com menos de 200 casos: ${cases.length}`,
  );

  const seenIds = new Set();
  const stats = {
    total: cases.length,
    porte: { pequeno: 0, grande: 0 },
    mode: { nova: 0, retorno: 0 },
    split: { train: 0, dev: 0, test: 0 },
    sensitiveCount: 0,
  };

  for (const item of cases) {
    assert(item.id, 'Caso sem id.');
    assert(!seenIds.has(item.id), `Id duplicado: ${item.id}`);
    seenIds.add(item.id);

    assert(item.transcript, `Caso sem transcript: ${item.id}`);
    assert(
      item.target && typeof item.target === 'object',
      `Caso sem target: ${item.id}`,
    );
    assert(
      item.audio?.anonymized === true,
      `Caso sem flag anonymized: ${item.id}`,
    );

    const porte = item.porte === 'grande' ? 'grande' : 'pequeno';
    const mode = item.mode === 'retorno' ? 'retorno' : 'nova';
    const split = ['train', 'dev', 'test'].includes(item.split)
      ? item.split
      : 'train';
    stats.porte[porte] += 1;
    stats.mode[mode] += 1;
    stats.split[split] += 1;

    if (hasSensitiveMarkers(item.transcript)) {
      stats.sensitiveCount += 1;
    }
  }

  assert(stats.porte.pequeno > 0, 'Sem casos de pequeno porte.');
  assert(stats.porte.grande > 0, 'Sem casos de grande porte.');
  assert(stats.mode.nova > 0, 'Sem casos de modo nova.');
  assert(stats.mode.retorno > 0, 'Sem casos de modo retorno.');
  assert(
    stats.sensitiveCount === 0,
    `Foram encontrados ${stats.sensitiveCount} casos com dados sensiveis.`,
  );

  console.log('Gold dataset validado com sucesso.');
  console.table([stats]);
}

main();
