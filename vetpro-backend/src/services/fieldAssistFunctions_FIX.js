/* eslint-disable no-use-before-define */
/* Fixed version of fieldAssistFunctions.js - CORRECTED VERSION */

const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger');

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function detectSpeakerFromText(phrase, fallbackSpeaker = 'Tutor') {
  const normalized = normalizeText(phrase || '');
  if (!normalized) return fallbackSpeaker;

  const tutorSignals = [
    'doutor',
    'doutora',
    'ele ta',
    'ela ta',
    'em casa',
    'nao come',
    'nao bebe',
    'vomito',
    'diarreia',
  ];
  const vetSignals = [
    'no exame',
    'ao exame',
    'diagnostico',
    'conduta',
    'tratamento',
    'prescrevo',
    'retorno',
  ];

  let tutorScore = 0;
  let vetScore = 0;

  for (const signal of tutorSignals) {
    if (normalized.includes(signal)) tutorScore += 2;
  }
  for (const signal of vetSignals) {
    if (normalized.includes(signal)) vetScore += 2;
  }

  if (tutorScore > vetScore) return 'Tutor';
  if (vetScore > tutorScore) return 'Medico';
  return fallbackSpeaker;
}

function normalizeTimestampedTranscript(transcript = '') {
  const text = String(transcript || '').trim();
  if (!text) return '';
  return text.replace(/^\[?\d{1,2}:\d{2}\]?\s*/gm, '').trim();
}

function extractTranscriptFromNotes(notes = '') {
  const text = String(notes || '');
  const transcriptMatch = text.match(
    /(?:transcri[cç][ãa]o|transcription|audio)[\s:]*([\s\S]*?)(?=\n\n|$)/i,
  );
  if (transcriptMatch && transcriptMatch[1]) {
    return transcriptMatch[1].trim();
  }
  return normalizeTimestampedTranscript(text);
}

function buildSimpleSegments(text = '') {
  const words = text.split(/\s+/);
  let elapsed = 0;
  const segments = [];
  let currentSegment = { stamp: '00:00', speaker: 'Tutor', text: '' };
  let wordCount = 0;

  words.forEach((word) => {
    if (wordCount > 0 && wordCount % 8 === 0) {
      currentSegment.text = currentSegment.text.trim();
      if (currentSegment.text) {
        currentSegment.speaker = detectSpeakerFromText(currentSegment.text);
      }
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
    currentSegment.speaker = detectSpeakerFromText(currentSegment.text);
    segments.push(currentSegment);
  }

  return segments;
}

function basicFieldExtraction(text = '') {
  const result = {};
  const queixaMatch = text.match(
    /(?:queixa|principal|problema)[\s:]*([^.!?\n]+)/i,
  );
  if (queixaMatch && queixaMatch[1]) {
    result.chiefComplaint = queixaMatch[1].trim();
  }
  const anamneseMatch = text.match(
    /(?:anamnese|hist[óo]rico)[\s:]*([^.!?\n]+)/i,
  );
  if (anamneseMatch && anamneseMatch[1]) {
    result.anamnesis = anamneseMatch[1].trim();
  }
  const diagnosticoMatch = text.match(
    /(?:diagn[óo]stico|suspeita)[\s:]*([^.!?\n]+)/i,
  );
  if (diagnosticoMatch && diagnosticoMatch[1]) {
    result.diagnosis = diagnosticoMatch[1].trim();
  }
  const tratamentoMatch = text.match(
    /(?:tratamento|conduta)[\s:]*([^.!?\n]+)/i,
  );
  if (tratamentoMatch && tratamentoMatch[1]) {
    result.treatment = tratamentoMatch[1].trim();
  }
  return result;
}

// FIXED: Added options parameter to avoid infinite loop
function parseClinicalFieldsFromSegments(
  segments = [],
  sourceText = '',
  options = {},
) {
  const { skipUnifiedBrain = false } = options;

  try {
    const allText =
      (Array.isArray(sourceText) ? sourceText.join(' ') : sourceText) || '';
    const combinedText =
      segments && segments.length > 0
        ? `${allText} ${segments.map((s) => s.text).join(' ')}`
        : allText;

    logger.info('parseClinicalFieldsFromSegments - debug', {
      segmentsCount: segments ? segments.length : 0,
      sourceTextLength: sourceText ? sourceText.length : 0,
      combinedTextLength: combinedText.length,
      skipUnifiedBrain,
    });

    let runUnifiedClinicalBrain = null;

    try {
      const heuristic = require('./heuristicService');
      runUnifiedClinicalBrain = heuristic.runUnifiedClinicalBrain;
    } catch (e) {
      logger.warn('heuristicService nao disponivel');
    }

    const parsed = {};
    const context = {};
    const pipeline = {};

    // FIXED: Only call runUnifiedClinicalBrain if skipUnifiedBrain is false
    if (
      !skipUnifiedBrain &&
      runUnifiedClinicalBrain &&
      typeof runUnifiedClinicalBrain === 'function'
    ) {
      const messages = [{ role: 'user', content: combinedText }];
      const result = runUnifiedClinicalBrain(messages);
      parsed.parsed = result.parsed || {};
      context.context = result.context || {};
      pipeline.pipeline = result.pipeline || {};
    } else {
      logger.info('Usando fallback basicFieldExtraction', {
        reason: skipUnifiedBrain
          ? 'skipUnifiedBrain=true'
          : 'runUnifiedBrain nao disponivel',
      });
      const basicResult = basicFieldExtraction(combinedText);
      Object.assign(parsed, basicResult);
    }

    return { parsed, context, pipeline };
  } catch (err) {
    logger.error('parseClinicalFieldsFromSegments erro:', err.message);
    return { parsed: {}, context: {}, pipeline: {} };
  }
}

async function analyzeFieldConversation({
  audioBuffer,
  mimeType,
  filename,
  segments,
  transcript,
}) {
  let finalTranscription = '';
  let finalSegments = [];

  logger.info('analyzeFieldConversation chamado', {
    hasAudioBuffer: !!(audioBuffer && audioBuffer.length > 0),
  });

  if (audioBuffer && audioBuffer.length > 0) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: mimeType });
        formData.append('file', blob, filename);
        formData.append('model', 'whisper-1');

        const response = await fetch(
          'https://api.openai.com/v1/audio/transcriptions',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
          },
        );

        if (response.ok) {
          const data = await response.json();
          finalTranscription = data.text || '';
          logger.info('Transcricao concluida', {
            length: finalTranscription.length,
          });

          if (data.segments && data.segments.length > 0) {
            finalSegments = data.segments.map((seg) => ({
              stamp: `${String(Math.floor((seg.start || 0) / 60)).padStart(2, '0')}:${String(Math.floor((seg.start || 0) % 60)).padStart(2, '0')}`,
              speaker: 'Tutor',
              text: (seg.text || '').trim(),
            }));
          } else {
            finalSegments = buildSimpleSegments(finalTranscription);
          }
        }
      }
    } catch (audioError) {
      logger.error('Erro ao transcrever audio:', audioError.message);
    }
  }

  if (
    !finalTranscription &&
    finalSegments.length === 0 &&
    segments &&
    segments.length > 0
  ) {
    finalSegments = Array.isArray(segments) ? segments : [];
  }

  if (!finalTranscription && finalSegments.length === 0) {
    finalTranscription = normalizeTimestampedTranscript(transcript) || '';
  }

  const sourceTextFinal =
    finalSegments.length > 0
      ? finalSegments.map((s) => s.text).join(' ')
      : finalTranscription;

  logger.info('Iniciando análise', {
    transcriptLength: sourceTextFinal.length,
  });

  const [aiResult, heuristicResult] = await Promise.all([
    analyzeWithAI(sourceTextFinal, finalSegments).catch(() => null),
    Promise.resolve(
      parseClinicalFieldsFromSegments(finalSegments, sourceTextFinal),
    ),
  ]);

  let combinedParsed = {};
  let combinedSegments = finalSegments;

  if (aiResult && aiResult.fields) {
    if (aiResult.segments && aiResult.segments.length > 0) {
      combinedSegments = aiResult.segments;
    }
    const heuristicFields = heuristicResult?.parsed || {};
    combinedParsed = {
      chiefComplaint:
        aiResult.fields.queixa_principal ||
        heuristicFields.chiefComplaint ||
        '',
      anamnese: aiResult.fields.anamnese || heuristicFields.anamnesis || '',
      physicalExam:
        aiResult.fields.exame_fisico || heuristicFields.physicalExam || '',
      diagnosis:
        aiResult.fields.diagnostico_sugestivo ||
        heuristicFields.diagnosis ||
        '',
      treatment: Array.isArray(aiResult.fields.tratamento)
        ? aiResult.fields.tratamento.join('; ')
        : aiResult.fields.tratamento || heuristicFields.treatment || '',
      procedures: heuristicFields.procedures || '',
      medications: heuristicFields.medications || '',
      examDetails: '',
      notes: '',
      returnRecommendation: '',
    };
  } else {
    combinedParsed = {
      chiefComplaint: heuristicResult?.parsed?.chiefComplaint || '',
      anamnese: heuristicResult?.parsed?.anamnesis || '',
      physicalExam: heuristicResult?.parsed?.physicalExam || '',
      diagnosis: heuristicResult?.parsed?.diagnosis || '',
      treatment: heuristicResult?.parsed?.treatment || '',
      procedures: heuristicResult?.parsed?.procedures || '',
      medications: heuristicResult?.parsed?.medications || '',
      examDetails: '',
      notes: '',
      returnRecommendation: '',
    };
  }

  return {
    parsed: combinedParsed,
    transcript: sourceTextFinal,
    segments: combinedSegments,
  };
}

function writeHeuristicMemory(inputData) {
  try {
    global.vetProHeuristicMemory = Array.isArray(inputData) ? inputData : [];
  } catch (e) {
    global.vetProHeuristicMemory = [];
  }
}

function readHeuristicMemory() {
  try {
    return global.vetProHeuristicMemory || [];
  } catch (e) {
    return [];
  }
}

async function analyzeWithAI(transcript = '', existingSegments = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const combinedText =
    existingSegments.length > 0
      ? existingSegments.map((s) => s.text).join(' ')
      : transcript;

  if (!combinedText || combinedText.length < 20) return null;

  const systemPrompt = `Você é um assistente de transcrição veterinária. Analise a conversa entre TUTOR e VETERINÁRIO e extraia os campos clínicos.`;

  const userPrompt = `Analise esta transcrição e retorne JSON com: { "fields": { "queixa_principal": "...", "anamnese": "...", "exame_fisico": "...", "diagnostico_sugestivo": "...", "tratamento": "..." } }\n\nTranscrição:\n${combinedText}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (error) {
    logger.error('Erro na análise com IA:', error.message);
  }
  return null;
}

module.exports = {
  analyzeFieldConversation,
  parseClinicalFieldsFromSegments,
  extractTranscriptFromNotes,
  normalizeTimestampedTranscript,
  writeHeuristicMemory,
  readHeuristicMemory,
  analyzeWithAI,
};
