/* eslint-disable no-use-before-define */
const fs = require('fs');
const path = require('path');

// Em Docker: variáveis já estão em process.env (env_file do docker-compose)
// Em desenvolvimento local: tenta carregar do .env na raiz do projeto
if (!process.env.OPENAI_API_KEY) {
  const possiblePaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
      break;
    }
  }
}

const logger = require('../utils/logger');

/**
 * Normaliza texto para detecção de speaker
 */
function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Detecta o speaker (Tutor ou Medico) baseado no texto
 */
function detectSpeakerFromText(phrase, fallbackSpeaker = 'Tutor') {
  const normalized = normalizeText(phrase || '');
  if (!normalized) return fallbackSpeaker;

  // Sinais de que é o Tutor (dono do animal)
  const tutorSignals = [
    'doutor',
    'doutora',
    'dr ',
    'dra ',
    'ele ta',
    'ela ta',
    'ele está',
    'ela está',
    'em casa',
    'desde ontem',
    'desde hoje',
    'nao come',
    'nao bebe',
    'vomito',
    'diarreia',
    'tosse',
    'coceira',
    'percebi',
    'notei',
    'estou preocupado',
    'meu cachorro',
    'meu gato',
    'meu animal',
    'o dog',
    'o gato',
    'o pet',
    'aqui em casa',
    'em casa',
  ];

  // Sinais de que é o Veterinário
  const vetSignals = [
    'no exame',
    'ao exame',
    'diagnostico',
    'conduta',
    'tratamento',
    'prescrevo',
    'prescricao',
    'oriento',
    'retorno',
    'solicito exame',
    'vamos medicar',
    'fc ',
    'fr ',
    'temperatura',
    'avaliacao clinica',
    'exame fisico',
    'palpacao',
    'ausculta',
    'suspeita',
    'prescrito',
    'recomendo',
    'encaminhar',
    'coletar',
    'orientação',
  ];

  let tutorScore = 0;
  let vetScore = 0;

  for (const signal of tutorSignals) {
    if (normalized.includes(signal)) tutorScore += 2;
  }
  for (const signal of vetSignals) {
    if (normalized.includes(signal)) vetScore += 2;
  }

  // Se menciona "dr" ou "doutor" seguido de pergunta, é tutor falando com vet
  if (/^(dr|dra|doutor|doutora)\b/.test(normalized)) {
    // Geralmente tutor diz "dr, o cachorro..."
    tutorScore += 1;
  }

  if (tutorScore > vetScore) return 'Tutor';
  if (vetScore > tutorScore) return 'Medico';

  return fallbackSpeaker;
}

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
      // Detecta speaker antes de salvar o segmento
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

    logger.info('parseClinicalFieldsFromSegments - debug', {
      segmentsCount: segments ? segments.length : 0,
      sourceTextLength: sourceText ? sourceText.length : 0,
      combinedTextLength: combinedText.length,
      combinedTextPreview: combinedText.substring(0, 200),
    });

    // Tenta importar do heuristicService para usar as funções existentes
    let runUnifiedClinicalBrain;

    // eslint-disable-next-line global-require
    let heuristic;
    try {
      heuristic = require('./heuristicService');
      runUnifiedClinicalBrain = heuristic.runUnifiedClinicalBrain;
      logger.info('heuristicService carregado com sucesso');
    } catch (e) {
      logger.warn(
        'heuristicService nao disponivel para parseClinicalFieldsFromSegments',
        { error: e.message },
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
      logger.info('Chamando runUnifiedClinicalBrain com', {
        messageCount: messages.length,
      });

      const result = runUnifiedClinicalBrain(messages);

      logger.info('runUnifiedClinicalBrain retornou', {
        hasParsed: !!result?.parsed,
        parsedKeys: result?.parsed ? Object.keys(result.parsed) : [],
        parsedPreview: JSON.stringify(result?.parsed || {}).substring(0, 200),
      });

      parsed.parsed = result.parsed || {};
      context.context = result.context || {};
      pipeline.pipeline = result.pipeline || {};
    } else {
      // Fallback: extração básica de campos clínicos
      logger.info('Usando fallback basicFieldExtraction');
      const basicResult = basicFieldExtraction(combinedText);
      Object.assign(parsed, basicResult);
    }

    return { parsed, context, pipeline };
  } catch (err) {
    logger.error('parseClinicalFieldsFromSegments erro:', err.message, {
      stack: err.stack,
    });
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

  // Debug: log dos parâmetros recebidos
  logger.info('analyzeFieldConversation chamado', {
    hasAudioBuffer: !!(audioBuffer && audioBuffer.length > 0),
    audioBufferLength: audioBuffer ? audioBuffer.length : 0,
    mimeType,
    filename,
    segmentsCount: Array.isArray(segments) ? segments.length : 0,
    transcriptLength: transcript ? transcript.length : 0,
  });

  // Se há buffer de áudio, transcreve via OpenAI Whisper
  if (audioBuffer && audioBuffer.length > 0) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      logger.info('Verificando OPENAI_API_KEY para transcricao', {
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 10) : 'undefined',
      });

      if (apiKey) {
        // Debug: verificar se o buffer é válido
        logger.info('Preparando transcricao Whisper', {
          bufferLength: audioBuffer.length,
          mimeType,
          filename,
        });

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
          const errorText = await response.text();
          logger.error('Whisper API error', {
            status: response.status,
            error: errorText,
          });
          throw new Error(`Whisper error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        finalTranscription = data.text || '';
        logger.info('Transcricao Whisper concluida', {
          transcriptionLength: finalTranscription.length,
          segmentsCount: data.segments ? data.segments.length : 0,
        });

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
      logger.error('Erro ao transcrever audio:', audioError.message, {
        stack: audioError.stack,
      });
    }
  } else {
    logger.info('Sem audioBuffer - usando transcricao fornecida ou segmentos');
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

  logger.info('Iniciando análise em paralelo: IA + Heurística', {
    transcriptLength: sourceTextFinal.length,
    segmentsCount: finalSegments.length,
  });

  // Roda IA e Heurística em paralelo
  const [aiResult, heuristicResult] = await Promise.all([
    // IA: análise com OpenAI
    analyzeWithAI(sourceTextFinal, finalSegments).catch((err) => {
      logger.error('Erro na análise com IA:', err.message);
      return null;
    }),
    // Heurística: parse tradicional
    Promise.resolve(
      parseClinicalFieldsFromSegments(finalSegments, sourceTextFinal),
    ),
  ]);

  // Combina os resultados - IA tem prioridade
  let combinedParsed = {};
  let combinedSegments = finalSegments;

  if (aiResult) {
    // Usa segments da IA se disponíveis
    if (aiResult.segments && aiResult.segments.length > 0) {
      combinedSegments = aiResult.segments;
      logger.info('Usando segments da IA');
    }

    // Combina campos - IA é mais detalhada, mas usa heurística como backup
    const aiFields = aiResult.fields || {};
    const heuristicFields = heuristicResult?.parsed || {};

    combinedParsed = {
      // IA (mais detalhado)
      chiefComplaint:
        aiFields.queixa_principal || heuristicFields.chiefComplaint || '',
      anamnese: aiFields.anamnese || heuristicFields.anamnesis || '',
      physicalExam: aiFields.exame_fisico || heuristicFields.physicalExam || '',
      diagnosis:
        aiFields.diagnostico_sugestivo || heuristicFields.diagnosis || '',
      treatment: Array.isArray(aiFields.tratamento)
        ? aiFields.tratamento.join('; ')
        : aiFields.tratamento || heuristicFields.treatment || '',
      procedures: heuristicFields.procedures || '',
      medications: heuristicFields.medications || '',
      examDetails: Array.isArray(aiFields.exames_solicitados)
        ? aiFields.exames_solicitados.join('; ')
        : '',
      notes: heuristicFields.notes || '',
      returnRecommendation: Array.isArray(aiFields.recomendacoes)
        ? aiFields.recomendacoes.join('; ')
        : '',
    };

    logger.info('Resultado combinado: IA + Heurística', {
      hasChiefComplaint: !!combinedParsed.chiefComplaint,
      hasAnamnese: !!combinedParsed.anamnese,
      hasDiagnosis: !!combinedParsed.diagnosis,
      hasTreatment: !!combinedParsed.treatment,
    });
  } else {
    // Sem IA - usa só heurística
    logger.info('Usando apenas heurística (IA indisponível)');
    combinedParsed = {
      chiefComplaint: heuristicResult?.parsed?.chiefComplaint || '',
      anamnese: heuristicResult?.parsed?.anamnesis || '',
      physicalExam: heuristicResult?.parsed?.physicalExam || '',
      diagnosis: heuristicResult?.parsed?.diagnosis || '',
      treatment: heuristicResult?.parsed?.treatment || '',
      procedures: heuristicResult?.parsed?.procedures || '',
      medications: heuristicResult?.parsed?.medications || '',
      examDetails: heuristicResult?.parsed?.examDetails || '',
      notes: heuristicResult?.parsed?.notes || '',
      returnRecommendation: heuristicResult?.parsed?.returnRecommendation || '',
    };
  }

  // Retorna também transcript e segments para o frontend
  return {
    parsed: combinedParsed,
    transcript: sourceTextFinal,
    segments: combinedSegments,
  };
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

/**
 * Usa IA para separar speakers e extrair campos clínicos detalhados
 */
async function analyzeWithAI(transcript = '', existingSegments = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY não configurada para análise com IA');
    return null;
  }

  const combinedText =
    existingSegments.length > 0
      ? existingSegments.map((s) => s.text).join(' ')
      : transcript;

  if (!combinedText || combinedText.length < 20) {
    logger.info('Texto muito curto para análise com IA');
    return null;
  }

  const systemPrompt = `Você é um assistente de transcrição veterinária. Analise a conversa entre TUTOR (dono do animal) e VETERINÁRIO e:

1. IDENTIFIQUE O SPEAKER DE CADA TRECHO: Marque cada fala como "Tutor" ou "Veterinário"
2. EXTRAIA OS CAMPOS CLÍNICOS de forma DETALHADA e PROFISSIONAL:

- **queixa_principal**: O que o tutor relatado como motivo da consulta (detalhe: quando começou, sintomas observados, comportamento do animal)
- **anamnese**: Histórico completo mencionaDO pelo tutor (alimentação, comportamento, ambiente, contatos com outros animais, histórico de doenças, vaccinação, vermifugação)
- **exame_fisico**: O que o veterinário observou no exame clínico (FC, FR, temperatura, mucosas, hidratação, palpação, ausculta)
- **diagnostico_sugestivo**: Diagnóstico ou suspeita diagnóstica identificada pelo veterinário
- **tratamento**: Conduta e tratamento prescrito pelo veterinário (medicações com doses, vias, frequência)
- **exames_solicitados**: Exames complementares solicitados
- **recomendações**: Orientações de retorno, cuidados, medicações

IMPORTANTE: 
- Seja detalhado nos campos extraídos
- Não invente informações - extraia apenas o que está na transcrição
- Use linguagem técnica profissional兽医
- Se um campo não for mencionado, use null`;

  const userPrompt = `Analise esta transcrição de consulta veterinária e retorne um JSON com a estrutura:

{
  "segments": [
    {"speaker": "Tutor|Veterinário", "text": "texto da fala"}
  ],
  "fields": {
    "queixa_principal": "detalhes da queixa",
    "anamnese": "histórico detalhado",
    "exame_fisico": "achados do exame",
    "diagnostico_sugestivo": "diagnóstico",
    "tratamento": "tratamento prescrito",
    "exames_solicitados": ["exame1", "exame2"],
    "recomendacoes": ["retorno em X dias", "cuidados"]
  }
}

Transcrição:
${combinedText}`;

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

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Erro na API OpenAI:', {
        status: response.status,
        error: errorText,
      });
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      logger.warn('Resposta vazia da OpenAI');
      return null;
    }

    const parsed = JSON.parse(content);
    logger.info('Análise IA concluída', {
      hasSegments: !!parsed.segments,
      hasFields: !!parsed.fields,
    });

    return parsed;
  } catch (error) {
    logger.error('Erro na análise com IA:', error.message);
    return null;
  }
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
