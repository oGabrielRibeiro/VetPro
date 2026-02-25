const logger = require('../utils/logger');

/**
 * Normaliza transcrição com timestamps removendo marcações de tempo
 */
function normalizeTimestampedTranscript(transcript = '') {
  const text = String(transcript || '').trim();
  if (!text) return '';
  // Remove timestamps no formato [mm:ss] ou mm:ss do início das linhas
  return text.replace(/^\[?\d{1,2}:\d{2}\]?\s*/gm, '').trim();
}

/**
 * Extrai transcrição das notas do prontuário (campo notes)
 */
function extractTranscriptFromNotes(notes = '') {
  const text = String(notes || '');
  // Procura por seções de transcrição nas notas
  const transcriptMatch = text.match(
    /(?:transcri[cç][ãa]o|transcription|audio)[\s:]*([\s\S]*?)(?=\n\n|$)/i,
  );
  if (transcriptMatch && transcriptMatch[1]) {
    return transcriptMatch[1].trim();
  }
  return normalizeTimestampedTranscript(text);
}

/**
 * Constrói segmentos simples quando só temos texto sem timestamp
 */
function buildSimpleSegments(text = '') {
  const words = text.split(/\s+/);
  let elapsed = 0;
  const segments = [];
  let currentSegment = { stamp: '00:00', speaker: 'Tutor', text: '' };
  let wordCount = 0;

  words.forEach((word) => {
    if (wordCount > 0 && wordCount % 8 === 0) {
      currentSegment.text = currentSegment.text.trim();
      segments.push(currentSegment);
      elapsed += Math.ceil(wordCount / 3);
      currentSegment = {
        stamp: `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`,
        speaker: 'Tutor',
        text: '',
      };
    }
    currentSegment.text = `${currentSegment.text}${word} `;
    wordCount += 1;
  });

  if (currentSegment.text.trim()) {
    currentSegment.text = currentSegment.text.trim();
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Extração básica de campos clínicos (fallback) - definida antes de parseClinicalFieldsFromSegments
 */
function basicFieldExtraction(text = '') {
  const result = {};

  // Extrai queixa principal
  const queixaMatch = text.match(
    /(?:queixa|principal|problema)[\s:]*([^.!?\n]+)/i,
  );
  if (queixaMatch && queixaMatch[1]) {
    result.chiefComplaint = queixaMatch[1].trim();
  }

  // Extrai anamnese
  const anamneseMatch = text.match(
    /(?:anamnese|hist[óo]rico)[\s:]*([^.!?\n]+)/i,
  );
  if (anamneseMatch && anamneseMatch[1]) {
    result.anamnesis = anamneseMatch[1].trim();
  }

  // Extrai diagnóstico
  const diagnosticoMatch = text.match(
    /(?:diagn[óo]stico|suspeita)[\s:]*([^.!?\n]+)/i,
  );
  if (diagnosticoMatch && diagnosticoMatch[1]) {
    result.diagnosis = diagnosticoMatch[1].trim();
  }

  // Extrai tratamento
  const tratamentoMatch = text.match(
    /(?:tratamento|conduta)[\s:]*([^.!?\n]+)/i,
  );
  if (tratamentoMatch && tratamentoMatch[1]) {
    result.treatment = tratamentoMatch[1].trim();
  }

  return result;
}

/**
 * Parses clinical fields from conversation segments
 */
function parseClinicalFieldsFromSegments(segments = [], sourceText = '') {
  try {
    const allText =
      (Array.isArray(sourceText) ? sourceText.join(' ') : sourceText) || '';

    const combinedText =
      segments && segments.length > 0
        ? `${allText} ${segments.map((s) => s.text).join(' ')}`
        : allText;

    // Tenta importar do heuristicService para usar as funções existentes
    let runUnifiedClinicalBrain;

    // eslint-disable-next-line global-require
    let heuristic;
    try {
      heuristic = require('./heuristicService');
      runUnifiedClinicalBrain = heuristic.runUnifiedClinicalBrain;
    } catch (e) {
      logger.warn(
        'heuristicService nao disponivel para parseClinicalFieldsFromSegments',
      );
      runUnifiedClinicalBrain = null;
    }

    const parsed = {};
    const context = {};
    const pipeline = {};

    if (
      runUnifiedClinicalBrain &&
      typeof runUnifiedClinicalBrain === 'function'
    ) {
      const messages = [{ role: 'user', content: combinedText }];
      const result = runUnifiedClinicalBrain(messages);
      parsed.parsed = result.parsed || {};
      context.context = result.context || {};
      pipeline.pipeline = result.pipeline || {};
    } else {
      // Fallback: extração básica de campos clínicos
      const basicResult = basicFieldExtraction(combinedText);
      Object.assign(parsed, basicResult);
    }

    return { parsed, context, pipeline };
  } catch (err) {
    logger.error('parseClinicalFieldsFromSegments erro:', err.message);
    return { parsed: {}, context: {}, pipeline: {} };
  }
}

/**
 * Analisa conversa de campo (áudio/transcrição)
 */
async function analyzeFieldConversation({
  audioBuffer,
  mimeType,
  filename,
  segments,
  transcript,
}) {
  let finalTranscription = '';
  let finalSegments = [];

  // Se há buffer de áudio, transcreve via OpenAI Whisper
  if (audioBuffer && audioBuffer.length > 0) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: mimeType });
        formData.append('file', blob, filename);
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'verbose_json');

        const response = await fetch(
          'https://api.openai.com/v1/audio/transcriptions',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
          },
        );

        if (!response.ok) {
          throw new Error(`Whisper error: ${response.status}`);
        }

        const data = await response.json();
        finalTranscription = data.text || '';

        // Converte resultado do Whisper para formato interno
        if (data.duration && data.segments && data.segments.length > 0) {
          finalSegments = data.segments.map((seg) => {
            const startTime = seg.start || 0;
            const minutes = Math.floor(startTime / 60);
            const seconds = Math.floor(startTime % 60);
            return {
              stamp: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
              speaker: 'Tutor',
              text: (seg.text || '').trim(),
            };
          });
        } else {
          finalSegments = buildSimpleSegments(finalTranscription);
        }
      } else {
        logger.warn('OPENAI_API_KEY nao configurada para transcricao');
      }
    } catch (audioError) {
      logger.error('Erro ao transcrever audio:', audioError.message);
    }
  }

  // Se tem segmentos direto da requisição usa eles
  if (
    !finalTranscription &&
    finalSegments.length === 0 &&
    segments &&
    segments.length > 0
  ) {
    finalSegments = Array.isArray(segments)
      ? segments.map((s) => ({
          stamp: s.stamp || '00:00',
          speaker: s.speaker || 'Tutor',
          text: (s.text || '').trim(),
        }))
      : [];
  }

  // Usa a transcrição fornecida diretamente na requisição como fallback
  if (!finalTranscription && finalSegments.length === 0) {
    finalTranscription = normalizeTimestampedTranscript(transcript) || '';
  }

  const sourceTextFinal =
    finalSegments.length > 0
      ? finalSegments.map((s) => s.text).join(' ')
      : finalTranscription;

  // Chama parseClinicalFieldsFromSegments com os dados processados
  return parseClinicalFieldsFromSegments(finalSegments, sourceTextFinal);
}

/**
 * Escreve memória heurística
 */
function writeHeuristicMemory(inputData) {
  try {
    const data = Array.isArray(inputData) ? inputData : [];
    // Armazena em memória global como fallback
    global.vetProHeuristicMemory = data;
  } catch (e) {
    logger.warn('Falha ao salvar memoria heuristica:', e.message);
    global.vetProHeuristicMemory = [];
  }
}

/**
 * Lê memória heurística
 */
function readHeuristicMemory() {
  try {
    return global.vetProHeuristicMemory || [];
  } catch (e) {
    logger.warn('Falha ao ler memoria heuristica:', e.message);
    return [];
  }
}

module.exports = {
  analyzeFieldConversation,
  parseClinicalFieldsFromSegments,
  extractTranscriptFromNotes,
  normalizeTimestampedTranscript,
  writeHeuristicMemory,
  readHeuristicMemory,
};
