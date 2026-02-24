const fs = require('fs');
const path = require('path');

const EXAMPLES_FILE_PATH = path.join(
  __dirname,
  '..',
  'ai',
  'recordChatExamples.json',
);
const MOBILE_EXAMPLES_FILE_PATH = path.join(
  __dirname,
  '..',
  'ai',
  'recordChatMobileExamples.json',
);

let examplesCache = null;
let examplesCacheMtime = 0;

const SPECIES_ALIASES = [
  { id: 'canino', aliases: ['canino', 'cachorro', 'cao', 'dog'] },
  { id: 'felino', aliases: ['felino', 'gato', 'cat'] },
  { id: 'equino', aliases: ['equino', 'equina', 'cavalo', 'egua'] },
  { id: 'bovino', aliases: ['bovino', 'bovina', 'boi', 'vaca', 'bezerro'] },
  { id: 'ave', aliases: ['ave', 'aves', 'passaro', 'psitacideo'] },
];

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function safeReadExamplesFile() {
  if (examplesCache && examplesCacheMtime) {
    const statGeneral = fs.existsSync(EXAMPLES_FILE_PATH)
      ? fs.statSync(EXAMPLES_FILE_PATH)
      : null;
    const mtimeGeneral = Number(statGeneral?.mtimeMs || 0);
    const statMobile = fs.existsSync(MOBILE_EXAMPLES_FILE_PATH)
      ? fs.statSync(MOBILE_EXAMPLES_FILE_PATH)
      : null;
    const mtimeMobile = Number(statMobile?.mtimeMs || 0);

    if (mtimeGeneral <= examplesCacheMtime && mtimeMobile <= examplesCacheMtime) {
      return examplesCache;
    }
  }

  let combinedExamples = [];
  let latestMtime = 0;

  try {
    if (fs.existsSync(EXAMPLES_FILE_PATH)) {
      const stat = fs.statSync(EXAMPLES_FILE_PATH);
      const mtime = Number(stat.mtimeMs || 0);
      if (mtime > latestMtime) latestMtime = mtime;

      const raw = fs.readFileSync(EXAMPLES_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.examples)) {
        combinedExamples = combinedExamples.concat(parsed.examples);
      }
    }

    if (fs.existsSync(MOBILE_EXAMPLES_FILE_PATH)) {
      const stat = fs.statSync(MOBILE_EXAMPLES_FILE_PATH);
      const mtime = Number(stat.mtimeMs || 0);
      if (mtime > latestMtime) latestMtime = mtime;

      const raw = fs.readFileSync(MOBILE_EXAMPLES_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.examples)) {
        combinedExamples = combinedExamples.concat(parsed.examples);
      }
    }

    examplesCache = combinedExamples;
    examplesCacheMtime = latestMtime || Date.now();
    return examplesCache;
  } catch (error) {
    console.error('Falha ao carregar exemplos de IA:', error.message);
    return [];
  }
}

function tokenizeForSimilarity(text = '') {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function jaccardSimilarityScore(a = '', b = '') {
  const ta = new Set(tokenizeForSimilarity(a));
  const tb = new Set(tokenizeForSimilarity(b));
  if (!ta.size || !tb.size) return 0;

  let intersection = 0;
  ta.forEach((token) => {
    if (tb.has(token)) intersection += 1;
  });

  const union = new Set([...ta, ...tb]).size || 1;
  return Number((intersection / union).toFixed(4));
}

function detectSpeciesHint(value = '') {
  const text = normalize(value);
  if (!text) return null;

  const matched = SPECIES_ALIASES.find((entry) =>
    entry.aliases.some((alias) => text.includes(normalize(alias))),
  );
  return matched?.id || null;
}

function scoreSpeciesAffinity({ sourceSpecies = null, sourceText = '', example = {} }) {
  if (!sourceSpecies) return 0;

  const exampleSpecies =
    detectSpeciesHint(example?.species || '') ||
    detectSpeciesHint(example?.specie || '') ||
    detectSpeciesHint(example?.input || '') ||
    detectSpeciesHint(
      example?.output?.structuredClinicalRecord?.animal?.especie || '',
    );

  if (!exampleSpecies) return 0;
  return sourceSpecies === exampleSpecies ? 0.2 : -0.1;
}

function selectFewShotExamples({
  mode = 'nova',
  porte = 'pequeno',
  sourceText = '',
  maxExamples = 3,
  species = '',
}) {
  const pool = safeReadExamplesFile();
  if (!pool.length) return [];

  const normalizedMode = mode === 'retorno' ? 'retorno' : 'nova';
  const normalizedPorte = porte === 'grande' ? 'grande' : 'pequeno';
  const sourceSpecies = detectSpeciesHint(species || sourceText);

  const scored = pool
    .filter((example) => {
      const eMode = String(example?.mode || 'nova').toLowerCase();
      const ePorte = String(example?.porte || 'pequeno').toLowerCase();
      return eMode === normalizedMode && ePorte === normalizedPorte;
    })
    .map((example) => {
      const lexicalScore = jaccardSimilarityScore(
        sourceText,
        String(example?.input || ''),
      );
      const speciesBonus = scoreSpeciesAffinity({
        sourceSpecies,
        sourceText,
        example,
      });
      return {
        example,
        score: Number((lexicalScore + speciesBonus).toFixed(4)),
      };
    })
    .sort((a, b) => b.score - a.score);

  return scored
    .slice(0, Math.max(0, maxExamples))
    .map((entry) => entry.example);
}

function buildFieldExtractionGuide(porte = 'pequeno') {
  const smallGuide = [
    'vaccinationStatus: status vacinal (em dia/atrasada/desconhecida).',
    'dewormingStatus: vermifugacao (produto/periodo).',
    'diet|rationBrand|feedingFrequency|waterIntakeSmall: alimentacao e agua.',
    'housing|lifestyle|contactWithAnimals: ambiente e convivencia.',
    'behavior|allergyHistory|chronicDiseases|preventiveCare|currentSupplements: historico preventivo.',
  ].join(' ');

  const largeGuide = [
    'farmName|propertyAndManagement|productionSystem: identificar propriedade, tipo de criacao e manejo.',
    'animalId|animalIdentificationDetails|batch|animalFunction: identificar animal/lote e finalidade zootecnica.',
    'bodyConditionScore|reproductiveStatus|daysInMilk|parity: dados produtivos e reprodutivos com numero quando houver.',
    'forage|concentrate|waterIntake|mineralSupplementation: detalhar dieta de campo e acesso a agua/suplemento.',
    'hoofStatus|rumenMotility|fecesAndUrine|physicalExamDetailed: exame fisico e locomotor com foco funcional.',
    'milkProduction|historicalDiseases|previousTreatmentHistory|requestedExamPanel: historico, produtividade e exames.',
  ].join(' ');

  return porte === 'grande' ? largeGuide : smallGuide;
}

function buildPortePromptRules(porte = 'pequeno', detailLevel = 'standard') {
  if (porte !== 'grande') {
    return 'Para pequeno porte, mantenha linguagem clinica objetiva e foco em sinais do tutor, exame, diagnostico e conduta.';
  }

  const baseRules = [
    'PARA GRANDE PORTE, priorize raciocinio de campo com foco em produtividade e manejo.',
    "- Se houver termos de leite/lactacao, preencher productionSystem='Leite' e destacar impacto produtivo.",
    '- Quando existirem pistas numericas, registrar bodyConditionScore, daysInMilk, parity e quedas de producao.',
    '- Em physicalExamDetailed, resumir avaliacao funcional: locomocao/casco, motilidade digestiva, fezes/urina, hidratacao e dor.',
    '- Em treatment, combinar conduta clinica e orientacao de manejo sanitario/nutricional do lote.',
    '- Em requestedExamPanel, listar exames com prioridade de campo (CMT, cultura, copro, hemograma, ultrassom, etc).',
    '- Em casos de lote/rebanho, usar batch e contactAnimals para contextualizar risco coletivo.',
  ];

  if (detailLevel === 'max') {
    baseRules.push(
      '- MODO DETALHADO GRANDE PORTE: preencher o maximo possivel sem inventar; prefira frases curtas com semantica tecnica.',
    );
  }

  return baseRules.join(' ');
}

function buildSystemPrompt(sourceText, { mode, porte, species, maxExamples }) {
    const relevantExamples = selectFewShotExamples({
        mode,
        porte,
        sourceText,
        maxExamples,
        species,
      });

      let systemPrompt = `Você é um assistente veterinário especialista em preenchimento de prontuários.
Sua tarefa é analisar a transcrição (texto ou áudio transcrito) e extrair os dados para um formato JSON estruturado.
Responda APENAS com o JSON válido, sem explicações adicionais.`;

      // Injeta os exemplos (Few-Shot)
      if (relevantExamples.length > 0) {
        systemPrompt += `\n\n### Exemplos de Referência ###\n`;

        relevantExamples.forEach((ex, index) => {
          systemPrompt += `\n--- Exemplo ${index + 1} ---`;
          systemPrompt += `\nEntrada: "${ex.input}"`;
          // Minifica o JSON de saída para economizar tokens
          systemPrompt += `\nSaída Esperada: ${JSON.stringify(ex.output)}`;
        });

        systemPrompt += `\n\n### Fim dos Exemplos ###`;
      }

      return systemPrompt;
}

function buildFieldRefinementPrompt({ field, mode = 'nova', patient = null }) {
  const patientContext = patient
    ? `Paciente: ${patient.name || ''}; especie: ${patient.species || ''}; raca: ${patient.breed || ''}; tutor: ${patient.ownerName || ''}.`
    : '';

  return [
    'Voce e um assistente de redacao de prontuario veterinario.',
    `Refine o texto do campo ${field} mantendo significado clinico e sem inventar dados.`,
    `Tipo da consulta: ${mode === 'retorno' ? 'retorno' : 'nova'}.`,
    patientContext,
    'Retorne apenas o texto final refinado.',
  ]
    .filter(Boolean)
    .join(' ');
}

module.exports = {
  buildFieldExtractionGuide,
  buildFieldRefinementPrompt,
  buildPortePromptRules,
  selectFewShotExamples,
  buildSystemPrompt,
};
