const fs = require('fs');
const path = require('path');
const { parseClinicalFieldsFromSegments } = require('./fieldAssistFunctions');
const logger = require('../utils/logger');
// Removidos imports nao usados neste modulo para satisfazer lint

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeSpeakerFromRole(role = '') {
  const raw = String(role || '')
    .trim()
    .toLowerCase();
  if (
    raw === 'assistant' ||
    raw === 'medico' ||
    raw === 'médico' ||
    raw === 'veterinario' ||
    raw === 'veterinário' ||
    raw === 'veterinaria' ||
    raw === 'veterinária' ||
    raw === 'dr' ||
    raw === 'dra' ||
    raw === 'doutor' ||
    raw === 'doutora' ||
    raw === 'vet'
  )
    return 'Medico';
  return 'Tutor';
}

function stripLeadingTimestamp(text = '') {
  return String(text || '')
    .replace(
      /^\s*(?:\[\d{1,2}:\d{2}(?::\d{2})?\]|\d{1,2}:\d{2}(?::\d{2})?)\s*/,
      '',
    )
    .trim();
}

function extractSpeakerFromTaggedLine(line = '', fallbackSpeaker = 'Tutor') {
  const stripped = stripLeadingTimestamp(line);
  if (!stripped) {
    return {
      explicit: false,
      speaker: normalizeSpeakerFromRole(fallbackSpeaker),
      text: '',
    };
  }

  const match = stripped.match(
    /^(Tutor|Responsavel|Responsável|Proprietario|Proprietário|Vet|Veterinario|Veterinário|Veterinaria|Veterinária|Medico|Médico|Dr|Dra|Doutor|Doutora)\s*(?::|-|–|—|->|=>|\|)\s*(.+)$/i,
  );

  if (!match) {
    return {
      explicit: false,
      speaker: normalizeSpeakerFromRole(fallbackSpeaker),
      text: stripped,
    };
  }

  return {
    explicit: true,
    speaker: normalizeSpeakerFromRole(match[1]),
    text: String(match[2] || '').trim(),
  };
}

function splitLinesAsSegments(content = '', speaker = 'Tutor', startAt = 0) {
  const lines = String(content || '')
    .replace(/\r/g, '\n')
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  let seconds = startAt;
  return lines.map((line) => {
    const stamp = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    seconds += Math.max(4, Math.ceil(line.split(/\s+/g).length / 2));
    return { stamp, speaker, text: line };
  });
}

function buildClinicalSegmentsFromMessages(messages = []) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  let elapsed = 0;
  const segments = [];
  const pushSegment = (speaker = 'Tutor', text = '') => {
    const cleanText = String(text || '').trim();
    if (!cleanText) return;
    const stamp = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    segments.push({ stamp, speaker, text: cleanText });
    elapsed += Math.max(4, Math.ceil(cleanText.split(/\s+/g).length / 2));
  };

  for (const item of safeMessages) {
    const content = String(item?.content || '').trim();
    if (!content) continue;
    const defaultSpeaker = normalizeSpeakerFromRole(item?.role);

    const explicitLines = content
      .replace(/\r/g, '\n')
      .split(/\n+/g)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsedLines = explicitLines.map((line) =>
      extractSpeakerFromTaggedLine(line, defaultSpeaker),
    );
    const hasExplicitSpeaker = parsedLines.some((line) => line.explicit);

    if (!hasExplicitSpeaker) {
      const lineSegments = splitLinesAsSegments(
        content,
        defaultSpeaker,
        elapsed,
      );
      if (lineSegments.length) {
        segments.push(...lineSegments);
        const tail = lineSegments[lineSegments.length - 1];
        const [mm, ss] = String(tail.stamp || '00:00')
          .split(':')
          .map((n) => Number(n) || 0);
        elapsed =
          mm * 60 +
          ss +
          Math.max(
            4,
            Math.ceil(String(tail.text || '').split(/\s+/g).length / 2),
          );
      }
      continue;
    }

    for (const parsedLine of parsedLines) {
      pushSegment(
        parsedLine.explicit ? parsedLine.speaker : defaultSpeaker,
        parsedLine.text,
      );
    }
  }

  return segments;
}

// Contador global para evitar loops infinitos
let runUnifiedBrainCallCount = 0;
const MAX_UNIFIED_BRAIN_CALLS = 5;

function runUnifiedClinicalBrain(messages = []) {
  // Reset contador a cada nova requisição de alto nível
  if (messages && messages.length > 0 && messages[0].role === 'user') {
    runUnifiedBrainCallCount = 0;
  }

  // Protecao contra loop infinito
  runUnifiedBrainCallCount += 1;
  if (runUnifiedBrainCallCount > MAX_UNIFIED_BRAIN_CALLS) {
    logger.warn('runUnifiedClinicalBrain - limite de chamadas excedido', {
      callCount: runUnifiedBrainCallCount,
    });
    return {
      sourceText: '',
      segments: [],
      parsed: {},
      context: {},
      pipeline: {},
    };
  }

  const sourceText = (Array.isArray(messages) ? messages : [])
    .map((item) => String(item?.content || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  const segments = buildClinicalSegmentsFromMessages(messages);

  // Passa um parametro para indicar que NAO deve chamar runUnifiedClinicalBrain novamente
  const parsedResult = parseClinicalFieldsFromSegments(segments, sourceText, {
    skipUnifiedBrain: true,
  });

  return {
    sourceText,
    segments,
    parsed: parsedResult?.parsed || {},
    context: parsedResult?.context || {},
    pipeline: parsedResult?.pipeline || {},
  };
}

const PORTE_DICTIONARY_FILE_PATH = path.join(
  __dirname,
  '..',
  'ai',
  'porteDetectionDictionary.json',
);
let porteDictionaryCache = null;
let porteDictionaryCacheMtime = 0;
const SPECIFIC_FIELD_DICTIONARY_FILE_PATH = path.join(
  __dirname,
  '..',
  'ai',
  'specificFieldExtractionDictionary.json',
);
let specificFieldDictionaryCache = null;
let specificFieldDictionaryCacheMtime = 0;

function defaultPorteDictionary() {
  return {
    large: [
      { token: 'equino', weight: 5 },
      { token: 'cavalo', weight: 5 },
      { token: 'egua', weight: 5 },
      { token: 'quarto de milha', weight: 6 },
      { token: 'mangalarga', weight: 5 },
      { token: 'mangalarga marchador', weight: 6 },
      { token: 'crioulo', weight: 5 },
      { token: 'bovino', weight: 5 },
      { token: 'vaca', weight: 5 },
      { token: 'boi', weight: 5 },
      { token: 'bezerro', weight: 5 },
      { token: 'nelore', weight: 5 },
      { token: 'holandes', weight: 5 },
      { token: 'girolando', weight: 5 },
      { token: 'jersey', weight: 5 },
      { token: 'angus', weight: 5 },
      { token: 'rebanho', weight: 5 },
      { token: 'haras', weight: 5 },
      { token: 'fazenda', weight: 4 },
    ],
    small: [
      { token: 'canino', weight: 4 },
      { token: 'cachorro', weight: 4 },
      { token: 'felino', weight: 4 },
      { token: 'gato', weight: 4 },
      { token: 'pet', weight: 3 },
    ],
    conflict_resolution: {
      strong_threshold: 6,
      minimum_margin: 2,
    },
  };
}

function safeReadPorteDictionaryFile() {
  if (!fs.existsSync(PORTE_DICTIONARY_FILE_PATH))
    return defaultPorteDictionary();

  try {
    const stat = fs.statSync(PORTE_DICTIONARY_FILE_PATH);
    const mtime = Number(stat.mtimeMs || 0);
    if (porteDictionaryCache && mtime === porteDictionaryCacheMtime) {
      return porteDictionaryCache;
    }

    const raw = fs.readFileSync(PORTE_DICTIONARY_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const dictionary = {
      large: Array.isArray(parsed?.large) ? parsed.large : [],
      small: Array.isArray(parsed?.small) ? parsed.small : [],
      conflict_resolution: parsed?.conflict_resolution || {},
    };

    porteDictionaryCache = dictionary;
    porteDictionaryCacheMtime = mtime;
    return dictionary;
  } catch (error) {
    logger.error('Falha ao carregar dicionario de porte', {
      error: error.message,
    });
    return defaultPorteDictionary();
  }
}

function defaultSpecificFieldDictionary() {
  return {
    global: {
      herdDeworming: [
        'controle parasitario do rebanho',
        'anti helmintico coletivo',
        'desverminacao coletiva',
      ],
      herdVaccination: ['imunizacao do rebanho', 'vacinas do lote'],
      bodyConditionScore: ['ecc', 'escore corporal'],
      daysInMilk: ['del'],
      parity: ['paridade', 'numero de crias'],
    },
    byPorte: {
      grande: {
        forage: ['forragem', 'capineira'],
        concentrate: ['farelado', 'nucleo concentrado'],
        rumenMotility: ['movimentos ruminais'],
      },
      pequeno: {
        diet: ['plano alimentar'],
        ectoparasiteControl: ['controle de carrapatos'],
      },
    },
    bySpecies: {
      equino: {
        hoofStatus: ['aprumo', 'ranilha'],
      },
      bovino: {
        rumenMotility: ['ruminacao', 'atonia ruminal'],
        milkProduction: ['producao diaria de leite'],
      },
      canino: {
        lifestyle: ['enriquecimento ambiental'],
      },
      felino: {
        lifestyle: ['acesso a janelas'],
      },
    },
  };
}

function sanitizeSpecificFieldDictionaryMap(raw = {}) {
  if (!raw || typeof raw !== 'object') return {};
  const output = {};
  for (const [fieldKey, terms] of Object.entries(raw)) {
    if (!Array.isArray(terms)) continue;
    const seen = new Set();
    const cleanTerms = terms
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((item) => {
        const key = normalize(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (cleanTerms.length) output[fieldKey] = cleanTerms;
  }
  return output;
}

function safeReadSpecificFieldDictionaryFile() {
  if (!fs.existsSync(SPECIFIC_FIELD_DICTIONARY_FILE_PATH))
    return defaultSpecificFieldDictionary();

  try {
    const stat = fs.statSync(SPECIFIC_FIELD_DICTIONARY_FILE_PATH);
    const mtime = Number(stat.mtimeMs || 0);
    if (
      specificFieldDictionaryCache &&
      mtime === specificFieldDictionaryCacheMtime
    ) {
      return specificFieldDictionaryCache;
    }

    const raw = fs.readFileSync(SPECIFIC_FIELD_DICTIONARY_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const dictionary = {
      global: sanitizeSpecificFieldDictionaryMap(parsed?.global || {}),
      byPorte: {
        grande: sanitizeSpecificFieldDictionaryMap(
          parsed?.byPorte?.grande || {},
        ),
        pequeno: sanitizeSpecificFieldDictionaryMap(
          parsed?.byPorte?.pequeno || {},
        ),
      },
      bySpecies: Object.entries(parsed?.bySpecies || {}).reduce(
        (acc, [speciesId, termsByField]) => {
          acc[
            String(speciesId || '')
              .trim()
              .toLowerCase()
          ] = sanitizeSpecificFieldDictionaryMap(termsByField || {});
          return acc;
        },
        {},
      ),
    };

    specificFieldDictionaryCache = dictionary;
    specificFieldDictionaryCacheMtime = mtime;
    return dictionary;
  } catch (error) {
    logger.error('Falha ao carregar dicionario de extracao de campos', {
      error: error.message,
    });
    return defaultSpecificFieldDictionary();
  }
}

function resolveGuidedLabelsForSpecificField(
  key = '',
  baseLabels = [],
  porte = 'pequeno',
  speciesId = '',
) {
  const dictionary = safeReadSpecificFieldDictionaryFile();
  const normalizedSpeciesId = String(speciesId || '')
    .trim()
    .toLowerCase();
  const globalLabels = dictionary?.global?.[key] || [];
  const porteLabels = dictionary?.byPorte?.[porte]?.[key] || [];
  const speciesLabels =
    dictionary?.bySpecies?.[normalizedSpeciesId]?.[key] || [];

  const seen = new Set();
  return [...baseLabels, ...globalLabels, ...porteLabels, ...speciesLabels]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => {
      const normalized = normalize(value);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function scorePorteByDictionary(source = '', terms = []) {
  const text = normalize(source);
  if (!text) return 0;
  return terms.reduce((sum, item) => {
    const token = normalize(item?.token || '');
    const weight = Number(item?.weight || 0) || 0;
    if (!token || !weight) return sum;
    return text.includes(token) ? sum + weight : sum;
  }, 0);
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

const SPECIES_PROFILES = [
  {
    id: 'canino',
    aliases: ['canino', 'cachorro', 'cao', 'dog'],
    clinicalKeywords: ['claudicacao', 'otite', 'prurido', 'vomito', 'diarreia'],
  },
  {
    id: 'felino',
    aliases: ['felino', 'gato', 'cat'],
    clinicalKeywords: [
      'estranguria',
      'disuria',
      'apatia',
      'vomito',
      'diarreia',
    ],
  },
  {
    id: 'ave',
    aliases: ['ave', 'aves', 'passaro', 'psitacideo'],
    clinicalKeywords: [
      'prostracao',
      'dispneia',
      'penugem',
      'bicada',
      'regurgitacao',
    ],
  },
  {
    id: 'equino',
    aliases: ['equino', 'equina', 'cavalo', 'egua'],
    clinicalKeywords: ['colica', 'laminite', 'claudicacao', 'taquipneia'],
  },
  {
    id: 'bovino',
    aliases: ['bovino', 'bovina', 'boi', 'vaca', 'bezerro'],
    clinicalKeywords: ['ruminacao', 'timpanismo', 'mastite', 'hiporexia'],
  },
];

const SPECIFIC_FIELDS_BY_PORTE = {
  pequeno: [
    'vaccinationStatus',
    'vaccinationProtocol',
    'lastVaccines',
    'dewormingStatus',
    'ectoparasiteControl',
    'diet',
    'rationBrand',
    'feedingFrequency',
    'waterIntakeSmall',
    'housing',
    'lifestyle',
    'contactWithAnimals',
    'reproductiveStatusSmall',
    'preventiveCare',
    'behavior',
    'allergyHistory',
    'chronicDiseases',
    'currentSupplements',
  ],
  grande: [
    'farmName',
    'productionSystem',
    'animalFunction',
    'batch',
    'animalId',
    'bodyConditionScore',
    'reproductiveStatus',
    'daysInMilk',
    'parity',
    'herdVaccination',
    'herdDeworming',
    'forage',
    'concentrate',
    'waterIntake',
    'mineralSupplementation',
    'hoofStatus',
    'rumenMotility',
    'fecesAndUrine',
    'milkProduction',
    'historicalDiseases',
    'propertyAndManagement',
    'contactAnimals',
    'animalIdentificationDetails',
  ],
};

const SPECIFIC_FIELD_LABELS = {
  vaccinationStatus: ['vacinacao', 'vacina em dia'],
  vaccinationProtocol: ['protocolo vacinal'],
  lastVaccines: ['ultimas vacinas', 'vacinas aplicadas'],
  dewormingStatus: ['vermifugacao', 'vermifugo'],
  ectoparasiteControl: ['ectoparasita', 'pulga', 'carrapato'],
  diet: ['dieta', 'alimentacao'],
  rationBrand: ['racao', 'marca da racao'],
  feedingFrequency: ['frequencia alimentar', 'refeicoes por dia'],
  waterIntakeSmall: ['ingestao de agua', 'consumo de agua'],
  housing: ['ambiente', 'domicilio'],
  lifestyle: ['estilo de vida', 'atividade'],
  contactWithAnimals: ['contato com outros animais'],
  reproductiveStatusSmall: ['estado reprodutivo', 'castrado'],
  preventiveCare: ['preventivos', 'preventivo'],
  behavior: ['comportamento'],
  allergyHistory: ['historico alergico', 'alergia'],
  chronicDiseases: ['doencas cronicas', 'comorbidades'],
  currentSupplements: ['suplementos', 'suplementacao'],
  farmName: ['propriedade', 'fazenda', 'sitio'],
  productionSystem: ['sistema de producao', 'tipo de criacao'],
  animalFunction: [
    'finalidade zootecnica',
    'funcao do animal',
    'uso do animal',
  ],
  batch: ['lote'],
  animalId: ['identificacao do animal', 'brinco', 'chip', 'registro'],
  bodyConditionScore: ['escore corporal', 'ecc'],
  reproductiveStatus: ['estado reprodutivo', 'prenhez'],
  daysInMilk: ['dias em lactacao', 'del'],
  parity: ['numero de partos', 'paridade'],
  herdVaccination: ['vacinacao do rebanho'],
  herdDeworming: ['vermifugacao do rebanho'],
  forage: ['volumoso', 'silagem', 'feno', 'pasto'],
  concentrate: ['concentrado'],
  waterIntake: ['consumo de agua', 'ingestao de agua'],
  mineralSupplementation: ['suplementacao mineral', 'sal mineral'],
  hoofStatus: ['casco', 'locomocao', 'claudicacao'],
  rumenMotility: ['motilidade ruminal', 'ruminacao'],
  fecesAndUrine: ['fezes', 'urina'],
  milkProduction: ['producao de leite'],
  historicalDiseases: ['historico sanitario', 'historico de doencas'],
  propertyAndManagement: ['propriedade e manejo', 'manejo'],
  contactAnimals: ['contactantes', 'animais contactantes'],
  animalIdentificationDetails: ['animal atendido', 'identificacao detalhada'],
  neonateAndReproduction: ['neonato', 'reproducao'],
  previousTreatmentHistory: ['tratamento anterior', 'historico de tratamento'],
  physicalExamDetailed: ['exame fisico detalhado', 'avaliacao do atendimento'],
  requestedExamPanel: ['exames complementares', 'exames solicitados'],
};

const SPECIFIC_FIELD_SEMANTIC_REGEX = {
  vaccinationStatus: /\b(vacin|em dia|atrasad|protocolo)\b/,
  vaccinationProtocol: /\b(protocolo|vacin|dose|reforco)\b/,
  lastVaccines: /\b(vacina|dose|raiva|v\d+|últim|ultim)\b/,
  dewormingStatus: /\b(vermif|iverm|albend|milbemic)\b/,
  ectoparasiteControl: /\b(carrapato|pulga|ectoparasita|sarna)\b/,
  diet: /\b(dieta|aliment|racao|ração|comida|pasto|silagem|feno)\b/,
  rationBrand: /\b(racao|ração|marca|premium|super premium)\b/,
  feedingFrequency: /\b(\d+\s*x|vezes|frequencia|refeic|aliment)\b/,
  waterIntakeSmall: /\b(agua|água|ingest|consumo|bebe)\b/,
  housing: /\b(ambiente|domic|apartamento|quintal|canil|baia|piquete)\b/,
  lifestyle: /\b(estilo|sedent|ativo|passeio|atividade)\b/,
  contactWithAnimals: /\b(contato|contact|animais|convive)\b/,
  reproductiveStatusSmall: /\b(castrad|inteiro|cio|gest|prenhe)\b/,
  preventiveCare: /\b(prevent|antiparasit|vacina|controle)\b/,
  behavior: /\b(comport|agress|apatico|ansios|letarg)\b/,
  allergyHistory: /\b(alerg|prurid|coce|dermat)\b/,
  chronicDiseases: /\b(cronic|diabet|renal|cardiac|epilep)\b/,
  currentSupplements: /\b(suplement|omega|vitamina|miner)\b/,
  farmName: /\b(haras|fazenda|sitio|sítio|propriedade)\b/,
  productionSystem:
    /\b(extensivo|intensivo|semi|confin|leite|corte|esporte|trabalho)\b/,
  animalFunction: /\b(esporte|trabalho|leite|corte|reproduc)\b/,
  batch: /\b(lote|grupo|piquete|baia)\b/,
  animalId: /\b(brinco|chip|id|registro|nome)\b/,
  bodyConditionScore: /\b([1-5](?:[.,][0-9])?|ecc|escore)\b/,
  reproductiveStatus: /\b(prenhe|gest|lact|seca|anestro|parto|reprodutor)\b/,
  daysInMilk: /\b(\d{1,3}\s*dias?|del)\b/,
  parity: /\b(partos?|paridade)\b/,
  herdVaccination: /\b(vacin|raiva|brucel|clostrid|rebanho)\b/,
  herdDeworming: /\b(vermif|ivermect|rebanho)/,
  forage: /\b(volumoso|forragem|capineira|pasto|silagem|feno|capim)\b/,
  concentrate: /\b(concentrado|racao|ração|milho|farelo)\b/,
  waterIntake: /\b(agua|água|ingest|consumo|litro)\b/,
  mineralSupplementation: /\b(sal mineral|mineral|suplement)\b/,
  hoofStatus: /\b(casco|locomoc|claudic)\b/,
  rumenMotility: /\b(rumen|ruminal|motilidade|contrac|timpan)\b/,
  fecesAndUrine: /\b(fezes|urina|diarre|disur)\b/,
  milkProduction: /\b(leite|litro|ordenha|produc)\b/,
  historicalDiseases: /\b(historic|sanitar|mastite|metrite|aie|mormo)\b/,
  propertyAndManagement: /\b(propriedade|manejo|fazenda|haras|rotina)\b/,
  contactAnimals: /\b(contact|contato|lote|rebanho|animais)\b/,
  animalIdentificationDetails: /\b(nome|pelagem|idade|brinco|chip|raca|raça)\b/,
  neonateAndReproduction:
    /\b(neonato|umbigo|brix|colostro|insemin|parto|distoc)\b/,
  previousTreatmentHistory:
    /\b(tratamento|hidrat|ringer|antibiot|anti[- ]?inflamat|medic)\b/,
  physicalExamDetailed: /\b(exame|mucosa|fc|fr|temperatura|tpc|desidrat)\b/,
  requestedExamPanel: /\b(exame|hemograma|bioquim|ultrassom|coleta|painel)\b/,
};

const CONVERSATIONAL_PREFIX_REGEX =
  /^(?:certo|ok(?:ay)?|entendi|beleza|perfeito|isso|entao|então|ricardo|doutor|doutora|dr|dra)\b[\s,:-]*/i;

function cleanSpecificFieldValue(value = '') {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.replace(CONVERSATIONAL_PREFIX_REGEX, '').trim();
}

function classifyPorteFromContext(
  patient = null,
  sourceText = '',
  recordProfile = null,
) {
  const profilePorte = String(recordProfile?.porte || patient?.porte || '')
    .trim()
    .toLowerCase();
  const source = normalize(
    `${patient?.species || patient?.specie || ''} ${patient?.subcategory || ''} ${patient?.breed || ''} ${sourceText || ''}`,
  );
  const dictionary = safeReadPorteDictionaryFile();
  const largeScore = scorePorteByDictionary(source, dictionary.large);
  const smallScore = scorePorteByDictionary(source, dictionary.small);
  const strongThreshold =
    Number(dictionary?.conflict_resolution?.strong_threshold || 6) || 6;
  const minMargin =
    Number(dictionary?.conflict_resolution?.minimum_margin || 2) || 2;

  if (profilePorte === 'grande' || profilePorte === 'pequeno') {
    // Se o perfil vier conflitante, mas o texto trouxer forte evidencia do porte oposto,
    // priorizamos a evidencia clinica do contexto para evitar ficha errada.
    if (
      profilePorte === 'pequeno' &&
      largeScore >= strongThreshold &&
      largeScore - smallScore >= minMargin
    ) {
      return 'grande';
    }
    if (
      profilePorte === 'grande' &&
      smallScore >= strongThreshold &&
      smallScore - largeScore >= minMargin
    ) {
      return 'pequeno';
    }
    return profilePorte;
  }

  if (largeScore > smallScore) return 'grande';
  if (smallScore > largeScore) return 'pequeno';
  return 'pequeno';
}

function resolveSpecificFieldKeys(recordProfile = null, porte = 'pequeno') {
  const configuredKeys = Array.isArray(recordProfile?.specificFieldKeys)
    ? recordProfile.specificFieldKeys.filter(
        (key) => typeof key === 'string' && key.trim(),
      )
    : [];
  if (configuredKeys.length) return configuredKeys;
  return SPECIFIC_FIELDS_BY_PORTE[porte] || SPECIFIC_FIELDS_BY_PORTE.pequeno;
}

function normalizeSpecificValueForSanitize(key, value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const parseNumber = (raw = '') => {
    const clean = String(raw || '')
      .replace(',', '.')
      .trim();
    if (!clean) return null;
    const num = Number(clean);
    return Number.isFinite(num) ? num : null;
  };

  if (key === 'bodyConditionScore') {
    const explicit =
      text.match(
        /\b(?:ecc|escore(?:\s+corporal)?)\s*(?:de|:)?\s*([1-5](?:[.,]\d)?)\b/i,
      ) || text.match(/\b([1-5](?:[.,]\d)?)\s*(?:\/\s*5)?\b/i);
    const score = parseNumber(explicit?.[1] || '');
    if (score === null || score < 1 || score > 5) return '';
    return Number.isInteger(score) ? String(score) : score.toFixed(1);
  }

  if (key === 'daysInMilk') {
    const match =
      text.match(/\b(?:del|dias?\s+em\s+lactacao)\s*[:=]?\s*(\d{1,3})\b/i) ||
      text.match(/\b(\d{1,3})\s*(?:dias?|del)\b/i);
    const days = parseNumber(match?.[1] || '');
    if (days === null || days < 0 || days > 999) return '';
    return `${Math.round(days)} dias`;
  }

  if (key === 'parity') {
    const match =
      text.match(/\b(?:paridade|partos?)\s*(?:de|:)?\s*(\d{1,2})\b/i) ||
      text.match(/\b(\d{1,2})\s*partos?\b/i);
    const parity = parseNumber(match?.[1] || '');
    if (parity === null || parity < 0 || parity > 30) return '';
    return String(Math.round(parity));
  }

  return text;
}

function sanitizeSpecificFields(raw = {}, allowedKeys = [], sourceText = '') {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalizedSourceText = normalize(sourceText || '');
  const normalizedSourceTextNumeric = normalizedSourceText.replace(/,/g, '.');
  const shortNumericAllowedKeys = new Set([
    'bodyConditionScore',
    'daysInMilk',
    'parity',
    'temperature',
    'heartRate',
    'respiratoryRate',
  ]);
  const cleanedByKey = {};
  const valueFrequency = new Map();
  const tokenStopWords = new Set([
    'de',
    'da',
    'do',
    'das',
    'dos',
    'e',
    'em',
    'no',
    'na',
    'nos',
    'nas',
    'com',
    'para',
    'por',
    'um',
    'uma',
    'ao',
    'aos',
    'as',
    'os',
    'que',
  ]);

  const normalizedFieldSignature = (value = '') =>
    normalize(value)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/g)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !tokenStopWords.has(token))
      .join(' ');

  const specificEvidenceScore = (key, value) => {
    const normalized = normalize(value);
    if (!normalized) return 0;
    let score = 0;
    const semanticRegex = SPECIFIC_FIELD_SEMANTIC_REGEX[key];
    if (semanticRegex && semanticRegex.test(normalized)) score += 2;
    const labels = SPECIFIC_FIELD_LABELS[key] || [];
    const labelHits = labels.reduce((sum, label) => {
      const token = normalize(label);
      return token && normalized.includes(token) ? sum + 1 : sum;
    }, 0);
    score += Math.min(1.2, labelHits * 0.4);
    if (/\b\d+([.,]\d+)?\b/.test(normalized)) score += 0.4;
    if (/\b(mg\/kg|sid|bid|tid|litro|dias?|horas?)\b/.test(normalized))
      score += 0.4;
    if (normalized.split(/\s+/g).length >= 5) score += 0.2;
    return Number(score.toFixed(2));
  };

  const hasGroundingInSource = (value = '') => {
    const normalizedValue = normalize(value);
    if (!normalizedValue) return false;
    if (!normalizedSourceText) return true;
    if (normalizedSourceText.includes(normalizedValue)) return true;

    const lexical = jaccardSimilarityScore(value, sourceText);
    if (lexical >= 0.035) return true;

    const tokens = normalizedValue
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/g)
      .filter((token) => token.length >= 3 && !tokenStopWords.has(token));

    // Campos numericos curtos (ex.: "3.5", "4") precisam de grounding por numero
    // antes de descartar por falta de tokens lexicais.
    const numericTokens = normalizedValue.match(/\d+(?:[.,]\d+)?/g) || [];
    if (
      numericTokens.length > 0 &&
      numericTokens.some((num) => {
        const n = String(num || '').replace(',', '.');
        return (
          normalizedSourceText.includes(num) ||
          normalizedSourceTextNumeric.includes(n)
        );
      })
    ) {
      return true;
    }

    if (!tokens.length) return false;

    const overlap = tokens.filter((token) =>
      normalizedSourceText.includes(token),
    );
    const overlapRatio = overlap.length / tokens.length;
    if (overlapRatio >= 0.5 && overlap.length >= 2) return true;

    return false;
  };

  const hasLabelAnchoring = (key, value) => {
    const normalizedValue = normalize(value);
    if (!normalizedSourceText || !normalizedValue) return false;
    if (!normalizedSourceText.includes(normalizedValue)) return false;
    const labels = SPECIFIC_FIELD_LABELS[key] || [];
    return labels.some((label) =>
      normalizedSourceText.includes(normalize(label)),
    );
  };

  for (const key of allowedKeys) {
    const rawValue = source[key];
    const value = normalizeSpecificValueForSanitize(
      key,
      cleanSpecificFieldValue(rawValue),
    );
    const normalizedValue = normalize(value).trim();
    if (
      !value ||
      !normalizedValue ||
      normalizedValue === 'nao informado' ||
      normalizedValue === 'não informado'
    ) {
      cleanedByKey[key] = '';
      continue;
    }

    const allowShortNumeric = shortNumericAllowedKeys.has(key);
    if ((value.length < 3 && !allowShortNumeric) || value.length > 180) {
      cleanedByKey[key] = '';
      continue;
    }

    const normalizedValueForField = normalize(value);
    if (
      /^(certo|ok|entendi|beleza|perfeito|isso|entao|então|ricardo|doutor|doutora|dr|dra)\b/.test(
        normalizedValueForField,
      )
    ) {
      cleanedByKey[key] = '';
      continue;
    }

    const semanticRegex = SPECIFIC_FIELD_SEMANTIC_REGEX[key];
    const tokenCount = normalizedValueForField
      .split(/\s+/g)
      .filter(Boolean).length;
    if (
      semanticRegex &&
      !semanticRegex.test(normalizedValueForField) &&
      tokenCount > 3 &&
      !hasLabelAnchoring(key, value)
    ) {
      cleanedByKey[key] = '';
      continue;
    }

    if (!hasGroundingInSource(value)) {
      cleanedByKey[key] = '';
      continue;
    }

    cleanedByKey[key] = value;
    const freq = valueFrequency.get(normalizedValueForField) || 0;
    valueFrequency.set(normalizedValueForField, freq + 1);
  }

  // Evita sobrepreenchimento com a mesma frase em vários campos.
  const deduped = {};
  const seenRepeated = new Set();
  const accepted = [];
  for (const key of allowedKeys) {
    const value = cleanedByKey[key] || '';
    if (!value) {
      deduped[key] = '';
      continue;
    }
    const normalizedValue = normalize(value);
    const repeated = (valueFrequency.get(normalizedValue) || 0) > 1;
    const signature = normalizedFieldSignature(value);
    const currentScore = specificEvidenceScore(key, value);
    let skipCurrent = false;

    if (repeated && seenRepeated.has(normalizedValue)) {
      deduped[key] = '';
      continue;
    }

    for (let i = 0; i < accepted.length; i += 1) {
      const existing = accepted[i];
      const similarity = jaccardSimilarityScore(signature, existing.signature);
      const overlapByContainment =
        (signature.length >= 22 && existing.signature.includes(signature)) ||
        (existing.signature.length >= 22 &&
          signature.includes(existing.signature));
      const nearDuplicate =
        similarity >= 0.84 ||
        overlapByContainment ||
        normalizedValue === existing.normalizedValue;

      if (!nearDuplicate) continue;

      if (currentScore > existing.score + 0.35) {
        deduped[existing.key] = '';
        accepted[i] = {
          key,
          normalizedValue,
          signature,
          score: currentScore,
        };
        deduped[key] = value;
      } else {
        deduped[key] = '';
        skipCurrent = true;
      }
      break;
    }

    if (skipCurrent) continue;

    if (repeated) {
      seenRepeated.add(normalizedValue);
    }
    if (!(key in deduped)) {
      deduped[key] = value;
      accepted.push({
        key,
        normalizedValue,
        signature,
        score: currentScore,
      });
    }
  }

  return deduped;
}

/* eslint-disable no-use-before-define */
function extractSpecificFieldsHeuristic(
  sourceText = '',
  allowedKeys = [],
  options = {},
) {
  const source = stripSpeakerTagsFromText(sourceText);
  const porte = options?.porte === 'grande' ? 'grande' : 'pequeno';
  const speciesProfile =
    options?.speciesProfile || detectSpeciesProfile(options?.patient, source);
  const output = {};
  const labelsByKey = {};
  const stopLabelsSet = new Set();

  for (const key of allowedKeys) {
    const labels = resolveGuidedLabelsForSpecificField(
      key,
      SPECIFIC_FIELD_LABELS[key] || [],
      porte,
      speciesProfile?.id || '',
    );
    labelsByKey[key] = labels;
    labels.forEach((label) => stopLabelsSet.add(label));
  }

  const stopLabels = Array.from(stopLabelsSet);

  for (const key of allowedKeys) {
    const labels = labelsByKey[key] || [];
    if (!labels.length) {
      output[key] = '';
      continue;
    }

    const extracted =
      extractByLabels(source, labels, stopLabels) ||
      extractByKeywords(source, labels);
    output[key] = normalizeSpecificValueByKey(key, extracted);
  }

  return output;
}
/* eslint-enable no-use-before-define */

function buildMissingFields(draft, specificFieldKeys = []) {
  const requiredCore = [
    'chiefComplaint',
    'anamnesis',
    'physicalExam',
    'diagnosis',
    'treatment',
  ];
  const missingCore = requiredCore.filter(
    (field) => !String(draft?.[field] || '').trim(),
  );
  const specific = draft?.specificFields || {};
  const missingSpecific = specificFieldKeys.filter(
    (key) => !String(specific[key] || '').trim(),
  );
  return {
    core: missingCore,
    specific: missingSpecific,
  };
}

// Normaliza valor especifico por chave (padrão: string aparada)
function normalizeSpecificValueByKey(key, value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const normalized = normalize(text);

  const parseNumber = (raw = '') => {
    const clean = String(raw || '')
      .replace(',', '.')
      .trim();
    if (!clean) return null;
    const num = Number(clean);
    if (!Number.isFinite(num)) return null;
    return num;
  };

  if (key === 'bodyConditionScore') {
    const explicit =
      text.match(
        /\b(?:ecc|escore(?:\s+corporal)?)\s*(?:de|:)?\s*([1-5](?:[.,]\d)?)\b/i,
      ) || text.match(/\b([1-5](?:[.,]\d)?)\s*(?:\/\s*5)?\b/i);
    const score = parseNumber(explicit?.[1] || '');
    if (score === null) return '';
    if (score < 1 || score > 5) return '';
    return Number.isInteger(score) ? String(score) : score.toFixed(1);
  }

  if (key === 'daysInMilk') {
    const match =
      text.match(/\b(?:del|dias?\s+em\s+lactacao)\s*[:=]?\s*(\d{1,3})\b/i) ||
      text.match(/\b(\d{1,3})\s*(?:dias?|del)\b/i);
    const days = parseNumber(match?.[1] || '');
    if (days === null) return '';
    if (days < 0 || days > 999) return '';
    return `${Math.round(days)} dias`;
  }

  if (key === 'parity') {
    const match =
      text.match(/\b(?:paridade|partos?)\s*(?:de|:)?\s*(\d{1,2})\b/i) ||
      text.match(/\b(\d{1,2})\s*partos?\b/i);
    const parity = parseNumber(match?.[1] || '');
    if (parity === null) return '';
    if (parity < 0 || parity > 30) return '';
    return String(Math.round(parity));
  }

  if (key === 'temperature') {
    const match = text.match(/\b(\d{2}(?:[.,]\d)?)\s*(?:°?\s*c|graus?)\b/i);
    const temp = parseNumber(match?.[1] || '');
    if (temp === null) return '';
    if (temp < 34 || temp > 43) return '';
    return `${temp.toFixed(1)} C`;
  }

  if (key === 'heartRate') {
    const match = text.match(
      /\b(?:fc|frequencia\s+cardiaca)\D{0,10}(\d{2,3})\s*(?:bpm)?\b/i,
    );
    const hr = parseNumber(match?.[1] || '');
    if (hr === null) return '';
    if (hr < 20 || hr > 260) return '';
    return `${Math.round(hr)} bpm`;
  }

  if (key === 'respiratoryRate') {
    const match = text.match(
      /\b(?:fr|frequencia\s+respiratoria)\D{0,10}(\d{1,3})\s*(?:mpm|irpm)?\b/i,
    );
    const rr = parseNumber(match?.[1] || '');
    if (rr === null) return '';
    if (rr < 5 || rr > 180) return '';
    return `${Math.round(rr)} mpm`;
  }

  if (normalized === 'nao informado' || normalized === 'não informado') {
    return '';
  }

  return text;
}

function extractByKeywords(sourceText, keywords) {
  const text = String(sourceText || '').trim();
  if (!text) return '';

  const normalized = normalize(text);
  const stopTokens = [
    'queixa',
    'motivo',
    'anamnese',
    'historico',
    'exame fisico',
    'diagnostico',
    'tratamento',
    'conduta',
    'medicacao',
    'prescricao',
    'retorno',
    'observacao',
  ];

  for (const keyword of keywords) {
    const idx = normalized.indexOf(normalize(keyword));
    if (idx < 0) continue;

    const originalSlice = text
      .slice(idx + keyword.length)
      .replace(/^\s*[:\-.]?\s*/, '')
      .trim();
    const normalizedSlice = normalize(originalSlice);
    let cutIndex = originalSlice.length;

    for (const token of stopTokens) {
      const stopIdx = normalizedSlice.indexOf(token);
      if (stopIdx > 0 && stopIdx < cutIndex) {
        cutIndex = stopIdx;
      }
    }

    return originalSlice.slice(0, cutIndex).trim();
  }

  return '';
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ACCENT_CHAR_CLASS = {
  a: '[aáàâã]',
  e: '[eéèê]',
  i: '[iíìî]',
  o: '[oóòôõ]',
  u: '[uúùû]',
  c: '[cç]',
  n: '[nñ]',
};

function accentAgnosticPattern(value = '') {
  return escapeRegex(value)
    .split('')
    .map((char) => ACCENT_CHAR_CLASS[char.toLowerCase()] || char)
    .join('');
}

function stripSpeakerTagsFromText(text = '') {
  return String(text || '')
    .replace(
      /\b(?:tutor|vet|medico|médico|veterinario|veterinário)\s*[:|-]\s*/gi,
      '\n',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function extractByLabels(sourceText, labels = [], stopLabels = []) {
  const text = stripSpeakerTagsFromText(sourceText);
  if (!text || !labels.length) return '';

  const labelPattern = labels.map(accentAgnosticPattern).join('|');
  const inlineRegex = new RegExp(
    `(?:^|[\\n.;]\\s*)(?:${labelPattern})\\s*[:-]?\\s*([^\\n.;]+)`,
    'i',
  );
  const inlineMatch = text.match(inlineRegex);
  if (inlineMatch?.[1]) {
    return inlineMatch[1].replace(/\s+/g, ' ').trim();
  }

  const stopPattern = stopLabels.length
    ? stopLabels.map(accentAgnosticPattern).join('|')
    : null;

  const regex = stopPattern
    ? new RegExp(
        `(?:^|\\b)(?:${labelPattern})\\s*[:-]?\\s*([\\s\\S]*?)(?=(?:\\b(?:${stopPattern})\\s*[:-]?)|(?:\\b(?:tutor|vet|medico|médico|veterinario|veterinário)\\s*[:-])|$)`,
        'i',
      )
    : new RegExp(`(?:^|\\b)(?:${labelPattern})\\s*[:-]?\\s*([\\s\\S]*)`, 'i');

  const match = text.match(regex);
  if (!match?.[1]) return '';
  return match[1].replace(/\s+/g, ' ').trim();
}

function firstSentence(text = '', limit = 180) {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';
  const split = clean.split(/[.!?]\s/)[0] || clean;
  return split.slice(0, limit).trim();
}

const CLINICAL_SIGNAL_TERMS = [
  'apatia',
  'prostracao',
  'preguicos',
  'letarg',
  'vomit',
  'diarre',
  'dor',
  'claudic',
  'coce',
  'prurid',
  'apetite',
  'hiporexia',
  'anorexia',
  'polidips',
  'poliur',
  'febre',
  'tosse',
  'espirro',
  'perda de peso',
  'ganho de peso',
];

const SOCIAL_ONLY_TERMS = [
  'ola',
  'oi',
  'bom dia',
  'boa tarde',
  'boa noite',
  'como vai',
  'tudo bem',
];

function splitConversationSentences(text = '') {
  return String(text || '')
    .replace(/\r/g, ' ')
    .split(/[\n.!?]+/g)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function splitDialogueLines(text = '') {
  const normalizedText = String(text || '')
    .replace(/\r/g, '\n')
    .replace(
      /\b(tutor|responsavel|responsável|proprietario|proprietário|vet|veterinario|veterinário|medico|médico|dra|dr|doutor|doutora)\s*(?::|-|–|—|->|=>|\|)/gi,
      '\n$&',
    );

  return normalizedText
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function scoreTutorLine(line = '') {
  const normalized = normalize(line);
  if (!normalized) return 0;
  let score = 0;
  if (/^(tutor|responsavel|proprietario)\s*:/.test(normalized)) score += 6;
  const tutorSignals = [
    'notei',
    'percebi',
    'ele',
    'ela',
    'meu',
    'minha',
    'em casa',
    'anda',
    'apetite',
    'vomito',
    'diarreia',
    'preguic',
    'apatia',
    'nao come',
    'nao bebe',
    'nao esta',
    'nao ta',
    'parece',
  ];
  for (const token of tutorSignals) {
    if (normalized.includes(token)) score += 2;
  }
  if (/\bdr\b|\bdra\b|\bdoutor\b|\bdoutora\b/.test(normalized)) score += 1;
  if (/\b(obrigado|obrigada)\b/.test(normalized)) score += 1;
  return score;
}

function scoreVetLine(line = '') {
  const normalized = normalize(line);
  if (!normalized) return 0;
  let score = 0;
  if (/^(vet|veterinario|medico|dra|dr)\s*:/.test(normalized)) score += 6;
  const vetSignals = [
    'entendi',
    'vamos',
    'no exame',
    'ao exame',
    'observamos',
    'suspeita',
    'diagnostico',
    'conduta',
    'tratamento',
    'prescrev',
    'retorno',
    'reavaliar',
    'colocar na balanca',
    'manter o peso',
    'prevenir',
  ];
  for (const token of vetSignals) {
    if (normalized.includes(token)) score += 2;
  }
  if (/\bdr\b|\bdra\b|\bdoutor\b|\bdoutora\b/.test(normalized)) score -= 1;
  return score;
}

function splitDialogueByRole(text = '') {
  const lines = splitDialogueLines(text);
  if (!lines.length) {
    return {
      tutorText: '',
      vetText: '',
      unknownText: '',
      turns: [],
    };
  }

  let lastRole = 'Tutor';
  const turns = lines.map((line) => {
    const parsedLine = extractSpeakerFromTaggedLine(line, lastRole);
    const cleanLine = parsedLine.text;

    let role = parsedLine.explicit ? parsedLine.speaker : 'Unknown';
    if (!parsedLine.explicit) {
      const tutorScore = scoreTutorLine(cleanLine);
      const vetScore = scoreVetLine(cleanLine);
      if (tutorScore > vetScore) role = 'Tutor';
      else if (vetScore > tutorScore) role = 'Medico';
      else role = lastRole;
    }

    lastRole = role === 'Unknown' ? lastRole : role;
    return { role, text: cleanLine };
  });

  const tutorText = turns
    .filter((turn) => turn.role === 'Tutor')
    .map((turn) => turn.text)
    .join(' ')
    .trim();
  const vetText = turns
    .filter((turn) => turn.role === 'Medico')
    .map((turn) => turn.text)
    .join(' ')
    .trim();
  const unknownText = turns
    .filter((turn) => turn.role === 'Unknown')
    .map((turn) => turn.text)
    .join(' ')
    .trim();

  return { tutorText, vetText, unknownText, turns };
}

function isLikelySocialOnlySentence(sentence = '') {
  const normalized = normalize(sentence);
  if (!normalized) return true;
  if (
    normalized.length <= 8 &&
    SOCIAL_ONLY_TERMS.some((token) => normalized.includes(token))
  ) {
    return true;
  }
  if (SOCIAL_ONLY_TERMS.some((token) => normalized === token)) return true;
  if (/^(dr|dra|doutor|doutora)\b/.test(normalized)) return true;
  return false;
}

function scoreClinicalComplaintSentence(sentence = '') {
  const normalized = normalize(sentence);
  if (!normalized) return -10;

  let score = 0;
  for (const token of CLINICAL_SIGNAL_TERMS) {
    if (normalized.includes(token)) score += 3;
  }

  if (
    /\b(notei|tutor|relata|anda|parece|apresenta|mudanc|aumentou|diminuiu)\b/.test(
      normalized,
    )
  )
    score += 2;
  if (
    /\b(vamos|manter|prevenir|balanca|check-?up)\b/.test(normalized) &&
    score < 3
  )
    score -= 2;
  if (isLikelySocialOnlySentence(sentence)) score -= 4;

  return score;
}

function extractClinicalComplaintFromConversation(text = '', limit = 220) {
  const sentences = splitConversationSentences(text);
  if (!sentences.length) return '';

  const scored = sentences
    .map((sentence) => ({
      sentence,
      score: scoreClinicalComplaintSentence(sentence),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best && best.score > 0) {
    return best.sentence.slice(0, limit).trim();
  }

  const fallback =
    sentences.find((sentence) => !isLikelySocialOnlySentence(sentence)) ||
    sentences[0];
  return String(fallback || '')
    .slice(0, limit)
    .trim();
}

function extractReturnPhrase(sourceText = '') {
  const text = String(sourceText || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const match = text.match(
    /\b(reavaliar(?:\s+em)?[^.!?\n]*|retorno[^.!?\n]*|reavaliacao[^.!?\n]*)/i,
  );
  return String(match?.[1] || '').trim();
}

function toSentence(text = '') {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';
  const first = clean.charAt(0).toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(first) ? first : `${first}.`;
}

function normalizeHours(text = '') {
  return String(text || '').replace(/\b(\d+)\s*h\b/gi, '$1 horas');
}

function containsAny(text = '', terms = []) {
  const content = normalize(text);
  return terms.some((term) => content.includes(normalize(term)));
}

function extractSentenceFromTriggers(sourceText = '', triggers = []) {
  const text = String(sourceText || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || !triggers.length) return '';
  const triggerPattern = triggers.map(accentAgnosticPattern).join('|');
  const regex = new RegExp(
    `(?:\\b(?:${triggerPattern})\\b)\\s*[:-]?\\s*([^.!?\\n]+)`,
    'i',
  );
  const match = text.match(regex);
  if (!match?.[1]) return '';
  return toSentence(match[1]);
}

function extractClinicalSentenceByTerms(sourceText = '', terms = []) {
  const sentences = splitConversationSentences(sourceText);
  if (!sentences.length || !terms.length) return '';

  const normalizedTerms = terms.map((term) => normalize(term));
  const scored = sentences
    .map((sentence) => {
      const normalizedSentence = normalize(sentence);
      let hits = 0;
      for (const term of normalizedTerms) {
        if (normalizedSentence.includes(term)) hits += 1;
      }
      const score = hits - (isLikelySocialOnlySentence(sentence) ? 2 : 0);
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score <= 0) return '';
  return toSentence(scored[0].sentence);
}

function buildHeuristicDiagnosis(value = '') {
  const clean = normalizeHours(value);
  if (!clean) return '';
  const lower = normalize(clean);
  if (lower.startsWith('suspeita')) {
    const withoutKeyword = clean
      .replace(/^\s*suspeita\s*[:\-]?\s*/i, '')
      .trim();
    if (!withoutKeyword) return 'Suspeita diagnostica a esclarecer.';
    if (/^de\b/i.test(withoutKeyword))
      return toSentence(`Suspeita ${withoutKeyword}`);
    return toSentence(`Suspeita de ${withoutKeyword}`);
  }
  if (/\binflamatori/i.test(lower) && !/\bsuspeita/i.test(lower)) {
    return 'Suspeita de processo inflamatorio.';
  }
  return toSentence(clean);
}

function buildHeuristicTreatment(value = '') {
  const clean = normalizeHours(value);
  if (!clean) return '';
  const lower = normalize(clean);
  if (lower.startsWith('conduta')) {
    return toSentence(clean.replace(/^\s*conduta\s*[:\-]?\s*/i, ''));
  }
  return toSentence(clean);
}

function buildHeuristicAnamnesis(current = '', chiefComplaint = '') {
  if (String(current || '').trim()) return toSentence(current);
  const complaint = String(chiefComplaint || '').trim();
  if (!complaint) return '';
  return toSentence(
    `Tutor relata ${complaint.charAt(0).toLowerCase()}${complaint.slice(1)}`,
  );
}

function buildHeuristicReturnRecommendation(value = '', treatment = '') {
  const fromValue = normalizeHours(value);
  if (String(fromValue).trim()) return toSentence(fromValue);

  const treatmentText = normalizeHours(treatment);
  const match = treatmentText.match(/\b(reavaliar(?:\s+em)?[^.!?\n]*)/i);
  if (match?.[1]) return toSentence(match[1]);
  return '';
}

function detectSpeciesProfile(patient = null, sourceText = '') {
  const patientSpecies = normalize(patient?.species || patient?.specie || '');
  const patientBreed = normalize(patient?.breed || '');
  const source = normalize(sourceText);

  for (const profile of SPECIES_PROFILES) {
    if (
      profile.aliases.some(
        (alias) =>
          patientSpecies.includes(alias) || patientBreed.includes(alias),
      )
    ) {
      return profile;
    }
  }

  for (const profile of SPECIES_PROFILES) {
    if (profile.aliases.some((alias) => source.includes(alias))) {
      return profile;
    }
  }

  return null;
}

function titleByMode(mode = 'nova') {
  if (mode === 'retorno') return 'Consulta de retorno';
  if (mode === 'emergencia') return 'Atendimento emergencial';
  return 'Consulta clinica';
}

function applyModeTemplate(draft, mode = 'nova') {
  const next = { ...draft };

  if (!next.chiefComplaint) {
    next.chiefComplaint =
      mode === 'retorno'
        ? 'Retorno para reavaliacao da evolucao clinica.'
        : mode === 'emergencia'
          ? 'Atendimento emergencial para estabilizacao inicial.'
          : 'Avaliacao clinica inicial.';
  }

  if (!next.anamnesis && next.chiefComplaint) {
    if (mode === 'retorno') {
      next.anamnesis = `Tutor relata evolucao desde a consulta anterior: ${next.chiefComplaint.charAt(0).toLowerCase()}${next.chiefComplaint.slice(1)}`;
    } else {
      next.anamnesis = `Tutor relata ${next.chiefComplaint.charAt(0).toLowerCase()}${next.chiefComplaint.slice(1)}`;
    }
  }

  if (!next.physicalExam && mode === 'emergencia') {
    next.physicalExam =
      'Exame fisico inicial focado em estabilizacao do paciente.';
  }

  return next;
}

function scoreFieldConfidence(fieldName, value, speciesProfile = null) {
  const text = String(value || '').trim();
  if (!text) return 0.12;

  const normalized = normalize(text);
  let score = 0.45;

  const { length } = text;
  if (length >= 20) score += 0.12;
  if (length >= 45) score += 0.12;
  if (length >= 80) score += 0.08;
  if (/[.!?]$/.test(text)) score += 0.05;

  const fieldKeywords = {
    chiefComplaint: [
      'dor',
      'febre',
      'apatia',
      'vomito',
      'diarreia',
      'dispneia',
      'tosse',
    ],
    anamnesis: ['tutor', 'evolucao', 'historico', 'inicio', 'dias', 'semanas'],
    physicalExam: [
      'temperatura',
      'fc',
      'fr',
      'mucosa',
      'palpacao',
      'ausculta',
      'hidratacao',
    ],
    diagnosis: ['suspeita', 'diagnostico', 'quadro', 'processo', 'sindrome'],
    treatment: [
      'conduta',
      'tratamento',
      'analges',
      'antibiot',
      'suporte',
      'monitorar',
    ],
    procedures: [
      'procedimento',
      'realizado',
      'sutura',
      'curativo',
      'coleta',
      'drenagem',
    ],
    medications: ['mg', 'ml', 'via', 'oral', 'im', 'iv', 'sc', 'dose'],
    examDetails: [
      'exame',
      'hemograma',
      'rx',
      'ultrassom',
      'sorologia',
      'cultura',
    ],
    returnRecommendation: ['retorno', 'reavaliar', 'horas', 'dias'],
  };

  const keywords = fieldKeywords[fieldName] || [];
  if (keywords.some((keyword) => normalized.includes(keyword))) score += 0.14;
  if (
    speciesProfile &&
    speciesProfile.clinicalKeywords.some((keyword) =>
      normalized.includes(keyword),
    )
  ) {
    score += 0.06;
  }

  return Math.min(0.97, Math.max(0.12, Number(score.toFixed(2))));
}

function buildConfidenceByField(
  draft,
  speciesProfile = null,
  specificFieldKeys = [],
) {
  const byField = {
    chiefComplaint: scoreFieldConfidence(
      'chiefComplaint',
      draft.chiefComplaint,
      speciesProfile,
    ),
    anamnesis: scoreFieldConfidence(
      'anamnesis',
      draft.anamnesis,
      speciesProfile,
    ),
    physicalExam: scoreFieldConfidence(
      'physicalExam',
      draft.physicalExam,
      speciesProfile,
    ),
    diagnosis: scoreFieldConfidence(
      'diagnosis',
      draft.diagnosis,
      speciesProfile,
    ),
    treatment: scoreFieldConfidence(
      'treatment',
      draft.treatment,
      speciesProfile,
    ),
    procedures: scoreFieldConfidence(
      'procedures',
      draft.procedures,
      speciesProfile,
    ),
    medications: scoreFieldConfidence(
      'medications',
      draft.medications,
      speciesProfile,
    ),
    examDetails: scoreFieldConfidence(
      'examDetails',
      draft.examDetails,
      speciesProfile,
    ),
    returnRecommendation: scoreFieldConfidence(
      'returnRecommendation',
      draft.returnRecommendation,
      speciesProfile,
    ),
  };

  if (Array.isArray(specificFieldKeys) && specificFieldKeys.length > 0) {
    const specificFields = draft?.specificFields || {};
    const specificScores = specificFieldKeys.map((key) =>
      scoreFieldConfidence(
        'notes',
        String(specificFields[key] || ''),
        speciesProfile,
      ),
    );
    byField.specificFields = specificScores.length
      ? Number(
          (
            specificScores.reduce((sum, value) => sum + value, 0) /
            specificScores.length
          ).toFixed(2),
        )
      : 0.12;
  }

  const values = Object.values(byField);
  const overall = values.length
    ? Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2))
    : 0.2;

  return { byField, overall };
}

// eslint-disable-next-line no-unused-vars
function parseJsonObject(rawText = '') {
  const text = String(rawText || '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// eslint-disable-next-line no-unused-vars
function parseJsonObjectSafe(rawText = '') {
  const text = String(rawText || '').trim();
  if (!text) {
    return { parsed: null, error: 'empty_response' };
  }

  try {
    return { parsed: JSON.parse(text), error: null };
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return { parsed: JSON.parse(text.slice(start, end + 1)), error: null };
      } catch {
        return { parsed: null, error: 'invalid_json_object' };
      }
    }
    return { parsed: null, error: 'no_json_found' };
  }
}

function isNotInformedText(value = '') {
  const normalized = normalize(String(value || '')).trim();
  return (
    !normalized ||
    normalized === 'nao informado' ||
    normalized === 'não informado'
  );
}

function joinNonEmpty(items = []) {
  return items
    .map((item) => String(item || '').trim())
    .filter((item) => item && !isNotInformedText(item))
    .join('. ')
    .trim();
}

function summarizeExamFromStructured(exame = {}) {
  if (!exame || typeof exame !== 'object') return '';
  const parts = [
    exame.estado_geral,
    exame.ecc ? `ECC ${exame.ecc}` : '',
    exame.fc ? `FC ${exame.fc}` : '',
    exame.fr ? `FR ${exame.fr}` : '',
    exame.temperatura ? `Temperatura ${exame.temperatura}` : '',
    exame.mucosas ? `Mucosas ${exame.mucosas}` : '',
    exame.tpc ? `TPC ${exame.tpc}` : '',
    exame.rumen ? `Rumen ${exame.rumen}` : '',
  ];
  return joinNonEmpty(parts);
}

// eslint-disable-next-line no-unused-vars
function mapStructuredRecordToDraft(
  structured = {},
  porte = 'pequeno',
  specificFieldKeys = [],
) {
  const source = structured && typeof structured === 'object' ? structured : {};
  const propriedade =
    source.propriedade && typeof source.propriedade === 'object'
      ? source.propriedade
      : {};
  const animal =
    source.animal && typeof source.animal === 'object' ? source.animal : {};
  const sinais =
    source.sinais_clinicos && typeof source.sinais_clinicos === 'object'
      ? source.sinais_clinicos
      : {};
  const exame =
    source.exame_fisico && typeof source.exame_fisico === 'object'
      ? source.exame_fisico
      : {};

  const mapped = {
    chiefComplaint: String(source?.queixa_principal?.descricao || '').trim(),
    anamnesis: String(source?.anamnese || '').trim(),
    physicalExam: joinNonEmpty([
      summarizeExamFromStructured(exame),
      source?.achados,
    ]),
    diagnosis: String(source?.diagnostico_sugestivo || '').trim(),
    treatment: joinNonEmpty(source?.tratamento || []),
    procedures: joinNonEmpty([source?.tratamento_anterior]),
    medications: joinNonEmpty(
      (source?.tratamento || []).filter((item) =>
        /\b(mg|ml|iv|im|sc|oral|dose|antibi|analgesi|anti[\s-]?inflam|dipirona|amoxic|flunixin)\b/i.test(
          String(item || ''),
        ),
      ),
    ),
    examDetails: joinNonEmpty(source?.exames_solicitados || []),
    notes: joinNonEmpty([
      Array.isArray(source?.diagnosticos_diferenciais)
        ? `Diagnosticos diferenciais: ${source.diagnosticos_diferenciais.join(', ')}`
        : '',
      source?.analise_avancada?.gravidade
        ? `Gravidade: ${source.analise_avancada.gravidade}`
        : '',
      source?.analise_avancada?.prioridade_triagem
        ? `Prioridade triagem: ${source.analise_avancada.prioridade_triagem}`
        : '',
      source?.analise_avancada?.risco_morte
        ? `Risco de morte: ${source.analise_avancada.risco_morte}`
        : '',
    ]),
    returnRecommendation: joinNonEmpty(source?.recomendacoes || []),
    specificFields: {},
  };

  const mappedSpecificByPorte =
    porte === 'grande'
      ? {
          farmName: propriedade.fazenda || propriedade.proprietario || '',
          productionSystem: propriedade.tipo_criacao || '',
          herdVaccination: Array.isArray(propriedade.vacinacao_rebanho)
            ? propriedade.vacinacao_rebanho.join(', ')
            : '',
          herdDeworming: source.vermifugacao || '',
          waterIntake: sinais.agua || '',
          contactAnimals: Array.isArray(propriedade.contactantes)
            ? propriedade.contactantes.join(', ')
            : '',
          animalId: animal.identificacao || animal.nome || '',
          animalIdentificationDetails: joinNonEmpty([
            animal.nome ? `Nome: ${animal.nome}` : '',
            animal.especie || '',
            animal.raca || '',
            animal.sexo || '',
            animal.idade || '',
            animal.pelagem ? `Pelagem: ${animal.pelagem}` : '',
          ]),
          previousTreatmentHistory: source.tratamento_anterior || '',
          physicalExamDetailed: summarizeExamFromStructured(exame),
          requestedExamPanel: joinNonEmpty(source.exames_solicitados || []),
          rumenMotility: exame.rumen || '',
        }
      : {
          vaccinationProtocol: source.vacinacao || '',
          vaccinationStatus: source.vacinacao || '',
          dewormingStatus: source.vermifugacao || '',
          diet: propriedade.alimentacao || '',
          waterIntakeSmall: sinais.agua || '',
          contactWithAnimals: Array.isArray(propriedade.contactantes)
            ? propriedade.contactantes.join(', ')
            : '',
          behavior: String(source?.anamnese || '').trim(),
          preventiveCare: propriedade.sal_mineral || '',
        };

  for (const key of specificFieldKeys) {
    mapped.specificFields[key] = String(
      mappedSpecificByPorte[key] || '',
    ).trim();
  }

  return mapped;
}

function groundingScore(value = '', sourceText = '') {
  const fieldText = String(value || '').trim();
  const source = String(sourceText || '').trim();
  if (!fieldText || !source) return 0;

  const score = jaccardSimilarityScore(fieldText, source);
  if (score > 0) return score;

  const numberMatches = fieldText.match(/\d+(?:[.,]\d+)?/g) || [];
  if (
    numberMatches.length &&
    numberMatches.some((num) => source.includes(num))
  ) {
    return 0.16;
  }

  return 0;
}

// Heurística simples para detectar conversa ruidosa (saudacoes, curtas, sem termos clinicos)
function looksLikeNoisyConversation(text = '') {
  const src = String(text || '').trim();
  if (!src) return true;
  const norm = normalize(src);
  if (norm.length < 8) return true;
  const social = ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite'];
  if (social.some((t) => norm.includes(t))) return true;
  const clinicalHits = ['dor', 'febre', 'vomit', 'diarre', 'exame', 'trat'];
  return clinicalHits.every((t) => !norm.includes(t));
}

// eslint-disable-next-line no-unused-vars
function runDraftSanityCheck({
  draft = {},
  sourceText = '',
  heuristicDraft = {},
  specificFieldKeys = [],
}) {
  const coreFields = [
    'chiefComplaint',
    'anamnesis',
    'physicalExam',
    'diagnosis',
    'treatment',
    'procedures',
    'medications',
    'examDetails',
    'returnRecommendation',
  ];

  const reviewed = {
    ...draft,
    specificFields: { ...(draft?.specificFields || {}) },
  };
  const issues = [];
  let checked = 0;

  for (const key of coreFields) {
    const value = String(reviewed[key] || '').trim();
    if (!value || isNotInformedText(value)) continue;
    checked += 1;
    const score = groundingScore(value, sourceText);
    if (score < 0.04 && looksLikeNoisyConversation(value)) {
      const fallback = String(heuristicDraft?.[key] || '').trim();
      reviewed[key] = fallback;
      issues.push({ field: key, reason: 'conteudo_ruidoso_substituido' });
      continue;
    }
    if (score < 0.015) {
      const fallback = String(heuristicDraft?.[key] || '').trim();
      reviewed[key] = fallback || '';
      issues.push({ field: key, reason: 'baixa_aderencia_ao_texto' });
    }
  }

  for (const key of specificFieldKeys) {
    const value = String(reviewed?.specificFields?.[key] || '').trim();
    if (!value || isNotInformedText(value)) continue;
    checked += 1;
    const score = groundingScore(value, sourceText);
    if (score < 0.01 && looksLikeNoisyConversation(value)) {
      reviewed.specificFields[key] = String(
        heuristicDraft?.specificFields?.[key] || '',
      ).trim();
      issues.push({
        field: `specificFields.${key}`,
        reason: 'campo_especifico_ruidoso',
      });
    }
  }

  const score = checked
    ? Number(Math.max(0, 1 - issues.length / checked).toFixed(2))
    : 0.8;

  return {
    draft: reviewed,
    qualityCheck: {
      score,
      status: score >= 0.8 ? 'ok' : score >= 0.55 ? 'revisar' : 'baixo',
      issues,
    },
  };
}

function ensureDraftShape(
  raw = {},
  mode = 'nova',
  allowedSpecificFieldKeys = [],
  porte = 'pequeno',
  sourceText = '',
) {
  const consultationType = mode === 'retorno' ? 'retorno' : 'nova';
  const rawSpecific = raw.specificFields || raw.specific_fields || {};
  const specificFields = sanitizeSpecificFields(
    rawSpecific,
    allowedSpecificFieldKeys,
    sourceText,
  );

  return {
    consultationType,
    chiefComplaint: String(raw.chiefComplaint || raw.queixa || '').trim(),
    anamnesis: String(raw.anamnesis || raw.anamnese || '').trim(),
    physicalExam: String(raw.physicalExam || raw.exameFisico || '').trim(),
    diagnosis: String(raw.diagnosis || raw.diagnostico || '').trim(),
    treatment: String(raw.treatment || raw.conduta || '').trim(),
    procedures: String(raw.procedures || raw.procedimento || '').trim(),
    medications: String(raw.medications || raw.medicacao || '').trim(),
    examDetails: String(
      raw.examDetails || raw.examesSolicitados || raw.examRequested || '',
    ).trim(),
    notes: String(raw.notes || raw.observations || '').trim(),
    returnRecommendation: String(
      raw.returnRecommendation || raw.recomendacaoRetorno || '',
    ).trim(),
    porte: porte === 'grande' ? 'grande' : 'pequeno',
    specificFields,
  };
}

// Inferência simples de campos especificos a partir do contexto
function inferSpecificFieldValueFromContext(key, sourceText = '') {
  const labels = SPECIFIC_FIELD_LABELS[key] || [];
  const value =
    extractByLabels(
      sourceText,
      labels,
      Object.values(SPECIFIC_FIELD_LABELS).flat(),
    ) || extractByKeywords(sourceText, labels);
  return normalizeSpecificValueByKey(key, cleanSpecificFieldValue(value));
}

// eslint-disable-next-line no-unused-vars
function buildHeuristicDraft(
  messages = [],
  mode = 'nova',
  patient = null,
  recordProfile = null,
) {
  const unified = runUnifiedClinicalBrain(messages);
  const { sourceText } = unified;
  const dialogue = splitDialogueByRole(
    messages.map((item) => String(item?.content || '')).join('\n'),
  );
  const tutorContext = (
    unified.context?.tutorContent ||
    dialogue.tutorText ||
    sourceText
  ).trim();
  const vetContext = (
    unified.context?.medicoContent ||
    dialogue.vetText ||
    sourceText
  ).trim();
  const speciesProfile = detectSpeciesProfile(patient, sourceText);
  const porte = classifyPorteFromContext(patient, sourceText, recordProfile);
  const specificFieldKeys = resolveSpecificFieldKeys(recordProfile, porte);

  const stopLabels = [
    'queixa',
    'motivo',
    'anamnese',
    'historico',
    'exame fisico',
    'diagnostico',
    'suspeita',
    'tratamento',
    'conduta',
    'medicacao',
    'prescrito',
    'prescrevi',
    'prescrever',
    'prescricao',
    'receita',
    'exame solicitado',
    'solicitei',
    'solicitado',
    'retorno',
    'reavaliacao',
    'reavaliar',
    'observacao',
  ];

  const explicitChiefComplaint = extractByKeywords(tutorContext || sourceText, [
    'queixa',
    'motivo da consulta',
    'motivo',
  ]);
  const chiefSource =
    explicitChiefComplaint ||
    tutorContext.split(
      /\b(?:conduta|tratamento|diagnostico|suspeita|medicacao|prescricao|receita|retorno|reavaliacao|reavaliar)\b/i,
    )[0];
  const clinicalChiefComplaint = extractClinicalComplaintFromConversation(
    chiefSource || tutorContext || sourceText,
    220,
  );

  const diagnosisByLabel = extractByLabels(
    vetContext || sourceText,
    ['diagnostico', 'suspeita diagnostica', 'suspeita'],
    stopLabels,
  );
  const treatmentByLabel = extractByLabels(
    vetContext || sourceText,
    ['conduta', 'tratamento'],
    stopLabels.filter(
      (label) =>
        !['retorno', 'reavaliacao', 'reavaliar', 'reavaliar em'].includes(
          label,
        ),
    ),
  );
  const medicationsByLabel = extractByLabels(
    vetContext || sourceText,
    [
      'medicacao',
      'prescricao',
      'receita',
      'prescrito',
      'prescrevi',
      'prescrever',
    ],
    stopLabels,
  );
  const proceduresByLabel = extractByLabels(
    vetContext || sourceText,
    [
      'procedimento',
      'procedimentos',
      'intervencao',
      'foi realizado',
      'realizado',
    ],
    stopLabels,
  );
  const examByLabel = extractByLabels(
    vetContext || sourceText,
    [
      'exame solicitado',
      'exames solicitados',
      'exame complementar',
      'solicitar exame',
      'solicitado exame',
      'solicitei',
      'solicitado',
    ],
    stopLabels,
  );

  const returnByLabel = extractByLabels(
    vetContext || sourceText,
    ['retorno', 'reavaliacao', 'reavaliar em', 'reavaliar'],
    stopLabels,
  );

  const explicitNotes = extractByKeywords(sourceText, ['observacao', 'obs']);
  const specificFields = extractSpecificFieldsHeuristic(
    sourceText,
    specificFieldKeys,
    { patient, porte, speciesProfile },
  );

  const draftRaw = {
    chiefComplaint:
      String(unified.parsed?.chiefComplaint || '').trim() ||
      clinicalChiefComplaint ||
      firstSentence(chiefSource || sourceText, 220),
    anamnesis:
      String(unified.parsed?.anamnesis || '').trim() ||
      buildHeuristicAnamnesis(
        extractByKeywords(tutorContext || sourceText, [
          'anamnese',
          'historico',
        ]),
        clinicalChiefComplaint || firstSentence(chiefSource || sourceText, 220),
      ),
    physicalExam:
      String(unified.parsed?.physicalExam || '').trim() ||
      extractByKeywords(vetContext || sourceText, ['exame fisico']),
    diagnosis:
      String(unified.parsed?.diagnosis || '').trim() ||
      buildHeuristicDiagnosis(
        diagnosisByLabel ||
          extractByKeywords(vetContext || sourceText, ['diagnostico']),
      ),
    treatment:
      String(unified.parsed?.treatment || '').trim() ||
      buildHeuristicTreatment(
        treatmentByLabel ||
          extractByKeywords(vetContext || sourceText, [
            'tratamento',
            'conduta',
          ]),
      ),
    procedures: proceduresByLabel,
    medications:
      String(unified.parsed?.medications || '').trim() ||
      medicationsByLabel ||
      extractByKeywords(vetContext || sourceText, [
        'medicacao',
        'prescricao',
        'receita',
      ]),
    examDetails: examByLabel,
    notes: explicitNotes,
    returnRecommendation: buildHeuristicReturnRecommendation(
      extractReturnPhrase(vetContext || sourceText) ||
        returnByLabel ||
        extractByKeywords(vetContext || sourceText, ['retorno', 'reavaliacao']),
      treatmentByLabel ||
        extractByKeywords(vetContext || sourceText, ['tratamento', 'conduta']),
    ),
    specificFields,
    porte,
  };

  if (!draftRaw.physicalExam) {
    draftRaw.physicalExam = extractClinicalSentenceByTerms(
      vetContext || sourceText,
      [
        'exame',
        'ao exame',
        'palpacao',
        'palpação',
        'mucosa',
        'ausculta',
        'linfonodo',
        'hiperemia',
        'edema',
        'temperatura',
        'desidratacao',
        'desidratação',
      ],
    );
  }

  if (!draftRaw.diagnosis) {
    draftRaw.diagnosis = buildHeuristicDiagnosis(
      extractClinicalSentenceByTerms(vetContext || sourceText, [
        'suspeita',
        'diagnostico',
        'diagnóstico',
        'quadro compativel',
        'quadro compatível',
        'provavel',
        'provável',
      ]),
    );
  }

  if (!draftRaw.treatment) {
    draftRaw.treatment = buildHeuristicTreatment(
      extractClinicalSentenceByTerms(vetContext || sourceText, [
        'conduta',
        'tratamento',
        'orientado',
        'orientada',
        'recomendado',
        'recomendada',
        'instituido',
        'instituído',
        'suporte',
        'repouso',
      ]),
    );
  }

  if (!draftRaw.procedures) {
    draftRaw.procedures = extractClinicalSentenceByTerms(
      vetContext || sourceText,
      [
        'procedimento',
        'coleta',
        'sondagem',
        'drenagem',
        'curativo',
        'cirurgia',
        'paaf',
        'citologia',
        'intervencao',
        'intervenção',
      ],
    );
  }

  if (!draftRaw.medications) {
    draftRaw.medications = extractClinicalSentenceByTerms(
      vetContext || sourceText,
      [
        'medicacao',
        'medicação',
        'prescricao',
        'prescrição',
        'prescrito',
        'antibiotico',
        'antibiótico',
        'anti-inflamatorio',
        'anti-inflamatório',
        'analgesico',
        'analgésico',
        'fluidoterapia',
      ],
    );
  }

  if (!draftRaw.examDetails) {
    draftRaw.examDetails = extractClinicalSentenceByTerms(
      vetContext || sourceText,
      [
        'solicitado',
        'solicitada',
        'solicitei',
        'exame',
        'hemograma',
        'ultrassom',
        'radiografia',
        'raio-x',
        'rx',
        'cultura',
        'sorologia',
        'urinalise',
        'urinálise',
      ],
    );
  }

  if (
    !draftRaw.procedures &&
    containsAny(sourceText, [
      'procedimento',
      'sutura',
      'curativo',
      'drenagem',
      'coleta',
    ])
  ) {
    draftRaw.procedures =
      'Procedimento mencionado durante a consulta (revisar descricao).';
  }

  if (
    !draftRaw.examDetails &&
    containsAny(sourceText, [
      'exame',
      'hemograma',
      'radiografia',
      'rx',
      'ultrassom',
      'sorologia',
      'cultura',
    ])
  ) {
    draftRaw.examDetails =
      'Exame complementar mencionado durante a consulta (revisar tipo).';
  }

  if (!draftRaw.medications) {
    const fromPrescriptionSentence = extractSentenceFromTriggers(sourceText, [
      'prescrito',
      'prescrevi',
      'prescrever',
      'medicacao',
    ]);
    if (fromPrescriptionSentence) {
      draftRaw.medications = fromPrescriptionSentence;
    }
  }

  if (!draftRaw.examDetails) {
    const fromExamSentence = extractSentenceFromTriggers(sourceText, [
      'solicitei',
      'exame',
      'exames',
    ]);
    if (
      fromExamSentence &&
      containsAny(fromExamSentence, [
        'hemograma',
        'radiografia',
        'rx',
        'ultrassom',
        'sorologia',
        'cultura',
        'exame',
      ])
    ) {
      draftRaw.examDetails = fromExamSentence;
    }
  }

  if (
    !draftRaw.medications &&
    containsAny(draftRaw.treatment, [
      'mg',
      'ml',
      'dose',
      'via',
      'analgesico',
      'antibiotico',
      'anti-inflamatorio',
      'dipirona',
      'amoxicilina',
    ])
  ) {
    draftRaw.medications = draftRaw.treatment;
  }

  for (const key of specificFieldKeys) {
    if (!String(draftRaw.specificFields?.[key] || '').trim()) {
      draftRaw.specificFields[key] = inferSpecificFieldValueFromContext(
        key,
        sourceText,
        draftRaw.chiefComplaint,
      );
    }
  }

  const draftTemplated = applyModeTemplate(draftRaw, mode);
  const draft = ensureDraftShape(
    draftTemplated,
    mode,
    specificFieldKeys,
    porte,
    sourceText,
  );
  const confidence = buildConfidenceByField(
    draft,
    speciesProfile,
    specificFieldKeys,
  );
  const missingFields = buildMissingFields(draft, specificFieldKeys);

  return {
    draft,
    provider: 'heuristic',
    confidence: confidence.overall,
    confidenceByField: confidence.byField,
    missingFields,
    context: {
      modeTitle: titleByMode(mode),
      speciesProfile: speciesProfile?.id || 'geral',
      porte,
      specificFieldKeys,
      dialogueTurnsDetected: dialogue.turns.length,
      unifiedBrain: {
        semanticAlerts: unified.pipeline?.semanticRules?.alerts || [],
        roleReliability: unified.context?.roleReliability || null,
      },
    },
  };
}

/**
 * Mescla drafts dando preferência para campos da IA
 * AI tem prioridade, heurística preenche campos vazios
 */
function mergeDraftsPreferAI(
  aiDraft = {},
  heuristicDraft = {},
  specificFieldKeys = [],
  mode = 'nova',
  porte = 'pequeno',
) {
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

  const merged = { ...aiDraft };

  // Para campos core, IA tem prioridade, heuristic preenche vazios
  for (const field of coreFields) {
    const aiValue = String(aiDraft[field] || '').trim();
    const heuristicValue = String(heuristicDraft[field] || '').trim();

    if (!aiValue && heuristicValue) {
      merged[field] = heuristicValue;
    }
  }

  // Para campos específicos, mescla também
  const aiSpecific = aiDraft.specificFields || {};
  const heuristicSpecific = heuristicDraft.specificFields || {};
  const mergedSpecific = { ...aiSpecific };

  for (const key of specificFieldKeys) {
    const aiValue = String(aiSpecific[key] || '').trim();
    const heuristicValue = String(heuristicSpecific[key] || '').trim();

    if (!aiValue && heuristicValue) {
      mergedSpecific[key] = heuristicValue;
    }
  }

  merged.specificFields = mergedSpecific;

  // Garante shape correto
  return ensureDraftShape(
    merged,
    mode,
    specificFieldKeys,
    porte,
    String(aiDraft?.sourceText || heuristicDraft?.sourceText || '').trim(),
  );
}

module.exports = {
  // Funções principais
  buildHeuristicDraft,
  ensureDraftShape,
  runDraftSanityCheck,
  mergeDraftsPreferAI,
  // Funções auxiliares
  runUnifiedClinicalBrain,
  classifyPorteFromContext,
  resolveSpecificFieldKeys,
  splitDialogueByRole,
  detectSpeciesProfile,
  titleByMode,
  buildConfidenceByField,
  buildMissingFields,
  parseJsonObjectSafe,
  mapStructuredRecordToDraft,
  // Funções utilitárias
  normalize,
  splitConversationSentences,
  splitDialogueLines,
  isLikelySocialOnlySentence,
  scoreClinicalComplaintSentence,
  extractClinicalComplaintFromConversation,
  extractReturnPhrase,
  toSentence,
  normalizeHours,
  containsAny,
  extractSentenceFromTriggers,
  extractClinicalSentenceByTerms,
  buildHeuristicDiagnosis,
  buildHeuristicTreatment,
  buildHeuristicAnamnesis,
  buildHeuristicReturnRecommendation,
  applyModeTemplate,
  scoreFieldConfidence,
  parseJsonObject,
  isNotInformedText,
  joinNonEmpty,
  summarizeExamFromStructured,
  groundingScore,
  looksLikeNoisyConversation,
  sanitizeSpecificFields,
  extractSpecificFieldsHeuristic,
  inferSpecificFieldValueFromContext,
  extractByKeywords,
  extractByLabels,
  firstSentence,
  // Constantes
  SPECIFIC_FIELDS_BY_PORTE,
  SPECIFIC_FIELD_LABELS,
};
