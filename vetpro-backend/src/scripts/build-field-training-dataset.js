// Console replaced by logger
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const ROOT_AI_DIR = path.join(__dirname, '..', 'ai');
const SOURCE_FILES = [
  {
    name: 'recordChatMobileExamples',
    file: path.join(ROOT_AI_DIR, 'recordChatMobileExamples.json'),
    sourceType: 'mobile',
  },
  {
    name: 'recordChatExamples',
    file: path.join(ROOT_AI_DIR, 'recordChatExamples.json'),
    sourceType: 'general',
  },
];
const DIALOGUE_SEEDS_FILE = path.join(
  ROOT_AI_DIR,
  'fieldModeDialogueSeeds.jsonl',
);
const OUTPUT_FILE = path.join(ROOT_AI_DIR, 'fieldModeTrainingDataset.json');

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    logger.error(`Falha ao ler ${filePath}:`, error.message);
    return null;
  }
}

function safeReadJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    logger.error(`Falha ao ler JSONL ${filePath}:`, error.message);
    return [];
  }
}

function normalizeWhitespace(text = '') {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitBySpeakerHints(input = '') {
  const text = String(input || '')
    .replace(/\r/g, '')
    .trim();
  if (!text) return [];

  const marked = text
    .replace(
      /\b(Tutor(?: por voz)?|Responsavel|Proprietario)\s*:\s*/gi,
      '\nTutor: ',
    )
    .replace(
      /\b(Vet(?:erinario)?|Medico(?: veterinario)?)\s*:\s*/gi,
      '\nMedico: ',
    )
    .replace(
      /\b(No exame fisico|Exame fisico|Diagnostico|Conduta|Medicacao|Retorno)\s*:\s*/gi,
      '\nMedico: $1: ',
    );

  const lines = marked
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const segments = [];
  let currentSpeaker = 'Tutor';
  let seconds = 0;

  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (/^tutor:/.test(normalized)) {
      currentSpeaker = 'Tutor';
    } else if (/^medico:/.test(normalized)) {
      currentSpeaker = 'Medico';
    }

    const content = line.replace(/^(tutor|medico)\s*:\s*/i, '').trim();
    if (!content) continue;

    const stampMinutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    const stampSeconds = String(seconds % 60).padStart(2, '0');

    segments.push({
      stamp: `${stampMinutes}:${stampSeconds}`,
      speaker: currentSpeaker,
      text: content,
    });

    seconds += Math.max(
      3,
      Math.min(12, Math.ceil(content.split(/\s+/g).length / 2)),
    );
  }

  return segments;
}

function sanitizeOutput(output = {}) {
  const safe = output && typeof output === 'object' ? output : {};
  const specificFields =
    safe.specificFields && typeof safe.specificFields === 'object'
      ? safe.specificFields
      : {};

  return {
    chiefComplaint: normalizeWhitespace(safe.chiefComplaint || ''),
    anamnesis: normalizeWhitespace(safe.anamnesis || ''),
    physicalExam: normalizeWhitespace(safe.physicalExam || ''),
    diagnosis: normalizeWhitespace(safe.diagnosis || ''),
    treatment: normalizeWhitespace(safe.treatment || ''),
    procedures: normalizeWhitespace(safe.procedures || ''),
    medications: normalizeWhitespace(safe.medications || ''),
    examDetails: normalizeWhitespace(safe.examDetails || ''),
    notes: normalizeWhitespace(safe.notes || ''),
    returnRecommendation: normalizeWhitespace(safe.returnRecommendation || ''),
    porte:
      String(safe.porte || '').toLowerCase() === 'grande'
        ? 'grande'
        : 'pequeno',
    specificFields,
  };
}

function buildSample(example, sourceInfo) {
  const input = String(example?.input || '').trim();
  const output = sanitizeOutput(example?.output || {});
  const mode =
    String(example?.mode || '').toLowerCase() === 'retorno'
      ? 'retorno'
      : 'nova';
  const porte =
    String(example?.porte || output.porte || '').toLowerCase() === 'grande'
      ? 'grande'
      : 'pequeno';
  const segments = splitBySpeakerHints(input);
  const transcript = normalizeWhitespace(
    segments.length ? segments.map((segment) => segment.text).join(' ') : input,
  );

  return {
    id: String(
      example?.id ||
        `${sourceInfo.name}_${Math.random().toString(36).slice(2, 9)}`,
    ),
    source: sourceInfo.name,
    sourceType: sourceInfo.sourceType,
    mode,
    porte,
    transcript,
    segments,
    target: output,
    metadata: {
      hasSpecificFields: Object.values(output.specificFields || {}).some(
        (value) => String(value || '').trim(),
      ),
      textLength: transcript.length,
    },
  };
}

function buildSeedSample(seed) {
  const scenario = String(seed?.cenario || 'cenario_campo').trim();
  const id =
    String(seed?.id || '').trim() || Math.random().toString(36).slice(2, 9);
  const turns = Array.isArray(seed?.dialogo) ? seed.dialogo : [];
  const segments = turns
    .map((turn, index) => {
      const speakerRaw = String(turn?.speaker || '').toLowerCase();
      const speaker = speakerRaw.startsWith('vet') ? 'Medico' : 'Tutor';
      const text = normalizeWhitespace(turn?.text || '');
      if (!text) return null;
      const stampMinutes = String(Math.floor((index * 6) / 60)).padStart(
        2,
        '0',
      );
      const stampSeconds = String((index * 6) % 60).padStart(2, '0');
      return {
        stamp: `${stampMinutes}:${stampSeconds}`,
        speaker,
        text,
      };
    })
    .filter(Boolean);

  const transcript = normalizeWhitespace(
    segments.map((segment) => segment.text).join(' '),
  );
  const isLargeHint = /cavalo|equino|pasto|haras|colica|claudic/i.test(
    `${scenario} ${transcript}`,
  );
  const porte = isLargeHint ? 'grande' : 'pequeno';

  return {
    id: `seed_${id}_${scenario}`,
    source: 'fieldModeDialogueSeeds',
    sourceType: 'dialogue-seed',
    mode: 'nova',
    porte,
    transcript,
    segments,
    target: {
      chiefComplaint: '',
      anamnesis: '',
      physicalExam: '',
      diagnosis: '',
      treatment: '',
      procedures: '',
      medications: '',
      examDetails: '',
      notes: '',
      returnRecommendation: '',
      porte,
      specificFields: {},
    },
    metadata: {
      scenario,
      hasSpecificFields: false,
      textLength: transcript.length,
    },
  };
}

function main() {
  const samples = [];

  for (const source of SOURCE_FILES) {
    const payload = safeReadJson(source.file);
    const examples = Array.isArray(payload?.examples) ? payload.examples : [];
    for (const example of examples) {
      const sample = buildSample(example, source);
      if (!sample.transcript) continue;
      samples.push(sample);
    }
  }

  const seeds = safeReadJsonl(DIALOGUE_SEEDS_FILE);
  for (const seed of seeds) {
    const sample = buildSeedSample(seed);
    if (!sample.transcript) continue;
    samples.push(sample);
  }

  const stats = {
    total: samples.length,
    byPorte: samples.reduce(
      (acc, sample) => {
        acc[sample.porte] += 1;
        return acc;
      },
      { pequeno: 0, grande: 0 },
    ),
    byMode: samples.reduce(
      (acc, sample) => {
        acc[sample.mode] += 1;
        return acc;
      },
      { nova: 0, retorno: 0 },
    ),
    withSegments: samples.filter((sample) => sample.segments.length > 0).length,
  };

  const dataset = {
    version: 1,
    generatedAt: new Date().toISOString(),
    description:
      'Dataset estruturado para treino e avaliacao do Modo Campo (transcricao, diarizacao e preenchimento de prontuario).',
    schema: {
      sample: {
        id: 'string',
        source: 'recordChatMobileExamples|recordChatExamples',
        sourceType: 'mobile|general',
        mode: 'nova|retorno',
        porte: 'pequeno|grande',
        transcript: 'string',
        segments: [{ stamp: 'mm:ss', speaker: 'Tutor|Medico', text: 'string' }],
        target: {
          chiefComplaint: 'string',
          anamnesis: 'string',
          physicalExam: 'string',
          diagnosis: 'string',
          treatment: 'string',
          procedures: 'string',
          medications: 'string',
          examDetails: 'string',
          notes: 'string',
          returnRecommendation: 'string',
          porte: 'pequeno|grande',
          specificFields: 'object',
        },
      },
    },
    stats,
    samples,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dataset, null, 2), 'utf8');
  logger.info(`Dataset salvo em: ${OUTPUT_FILE}`);
  logger.info(`Total de amostras: ${stats.total}`);
  logger.info(
    `Porte pequeno/grande: ${stats.byPorte.pequeno}/${stats.byPorte.grande}`,
  );
  logger.info(
    `Modo nova/retorno: ${stats.byMode.nova}/${stats.byMode.retorno}`,
  );
}

main();
