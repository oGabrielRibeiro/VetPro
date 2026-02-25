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
 * @param {Array} segments - Array de segmentos da conversa
 * @param {string} sourceText - Texto original da conversa
 * @param {Object} options - Opções adicionais
 * @param {boolean} options.skipUnifiedBrain - Se true, pula a chamada ao runUnifiedClinicalBrain para evitar loop infinito
 */
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
      combinedTextPreview: combinedText.substring(0, 200),
      skipUnifiedBrain,
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

    // ONLY call runUnifiedClinicalBrain if NOT already called (to avoid infinite loop)
    if (
      !skipUnifiedBrain &&
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

    // Mapeia os novos campos da IA para o formato do frontend
    combinedParsed = {
      // Identificação (novos campos)
      nome_animal: aiFields.nome_animal || '',
      especie: aiFields.especie || '',
      raca: aiFields.raca || '',
      idade: aiFields.idade || '',
      sexo: aiFields.sexo || '',
      peso: aiFields.peso || '',

      // Anamnese
      chiefComplaint:
        aiFields.queixa_principal || heuristicFields.chiefComplaint || '',
      anamnese:
        aiFields.historico_do_problema ||
        aiFields.anamnese ||
        heuristicFields.anamnesis ||
        '',
      alimentacao: aiFields.alimentacao || '',
      ambiente: aiFields.ambiente || '',
      vacinacao: aiFields.vacinacao || '',
      vermifugacao: aiFields.vermifugacao || '',
      doencas_previas: aiFields.doencas_previas || '',
      uso_medicacao: aiFields.uso_medicacao || '',

      // Exame físico
      physicalExam:
        aiFields.achados_relevantes ||
        aiFields.exame_fisico ||
        heuristicFields.physicalExam ||
        '',
      estado_geral: aiFields.estado_geral || '',
      temperatura: aiFields.temperatura || '',
      frequencia_cardiaca: aiFields.frequencia_cardiaca || '',
      frequencia_respiratoria: aiFields.frequencia_respiratoria || '',
      mucosas: aiFields.mucosas || '',
      hidratacao: aiFields.hidratacao || '',

      // Avaliação
      diagnosis:
        aiFields.diagnostico_presuntivo ||
        aiFields.diagnostico_sugestivo ||
        heuristicFields.diagnosis ||
        '',
      suspeitas_clinicas: aiFields.suspeitas_clinicas || '',

      // Plano
      treatment:
        aiFields.orientacoes_ao_tutor ||
        aiFields.tratamento ||
        heuristicFields.treatment ||
        '',
      medications:
        aiFields.medicacoes_prescritas || heuristicFields.medications || '',
      examDetails: aiFields.exames_solicitados || '',
      returnRecommendation:
        aiFields.retorno ||
        aiFields.recomendacoes ||
        heuristicFields.returnRecommendation ||
        '',

      // Transcrição organizada
      transcricao_organizada: aiFields.transcricao_organizada || '',
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
 * Segue pipeline de 4 etapas:
 * 1) Whisper/ASR → Transcrição bruta
 * 2) LLM 1 → Separação Vet / Tutor
 * 3) LLM 2 → Extração estruturada
 * 4) LLM 3 → Refinamento clínico
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

  // ETAPA 1-3: Separação de falas, extração estruturada e refinamento em um único prompt
  const systemPrompt = `Você é um assistente clínico veterinário especializado em:

1) Transcrição médica veterinária
2) Identificação de interlocutores (Veterinário e Tutor)
3) Estruturação de prontuário clínico
4) Correção gramatical mantendo fidelidade clínica

REGRAS OBRIGATÓRIAS:

- NÃO invente informações.
- NÃO altere significado clínico.
- NÃO presuma dados que não foram falados.
- Se algo estiver incompleto, marque como "Não informado na consulta".
- Se houver ambiguidade, mantenha a forma mais fiel ao áudio.
- Use linguagem técnica veterinária adequada.
- Corrija erros gramaticais mantendo o contexto original.

ETAPA 1 — TRANSCRIÇÃO ORGANIZADA

Separe claramente as falas em:
- [VETERINÁRIO]: para falas do veterinário
- [TUTOR]: para falas do tutor/dono do animal

Se houver dúvida na identificação do interlocutor, use:
[INDEFINIDO]:

ETAPA 2 — EXTRAÇÃO CLÍNICA ESTRUTURADA

Com base na conversa, preencha os seguintes campos. SE NÃO HOUVER CERTEZA ABSOLUTA, use "Não informado na consulta":

{
  "identificacao": {
    "nome_animal": "",
    "especie": "",
    "raca": "",
    "idade": "",
    "sexo": "",
    "peso": ""
  },
  "anamnese": {
    "queixa_principal": "",
    "historico_do_problema": "",
    "alimentacao": "",
    "ambiente": "",
    "vacinacao": "",
    "vermifugacao": "",
    "doencas_previas": "",
    "uso_medicacao": ""
  },
  "exame_fisico": {
    "estado_geral": "",
    "temperatura": "",
    "frequencia_cardiaca": "",
    "frequencia_respiratoria": "",
    "mucosas": "",
    "hidratacao": "",
    "achados_relevantes": ""
  },
  "avaliacao": {
    "suspeitas_clinicas": "",
    "diagnostico_presuntivo": ""
  },
  "plano": {
    "exames_solicitados": "",
    "medicacoes_prescritas": "",
    "orientacoes_ao_tutor": "",
    "retorno": ""
  }
}

ETAPA 3 — MELHORIA TEXTUAL

Reescreva os campos (Queixa principal, Histórico, Avaliação, Plano) de forma técnica, clara e objetiva, mantendo integralmente o significado original.`;

  const userPrompt = `Analise esta transcrição de consulta veterinária e retorne UM JSON com a estrutura COMPLETA (todas as chaves obrigatórias):

{
  "transcricao_organizada": "[VETERINÁRIO]: ...\n[TUTOR]: ...\n[INDEFINIDO]: ...",
  "identificacao": {
    "nome_animal": "nome do animal mencionado",
    "especie": "canino, felino, bovino, etc",
    "raca": "raça mencionada",
    "idade": "idade mencionada",
    "sexo": "macho/fêmea",
    "peso": "peso mencionado"
  },
  "anamnese": {
    "queixa_principal": "o que o tutor relatou como motivo da consulta",
    "historico_do_problema": "como começou, evolução, tratamentos anteriores",
    "alimentacao": "ração, frequência, quantidade",
    "ambiente": "onde vive, acesso à rua, outros animais",
    "vacinacao": "vacinas em dia, últimas vacinas",
    "vermifugacao": "vermifugação em dia",
    "doencas_previas": "histórico de doenças",
    "uso_medicacao": "medicações atuais"
  },
  "exame_fisico": {
    "estado_geral": "alerta, prostrado, depressivo",
    "temperatura": "temperatura corporal",
    "frequencia_cardiaca": "FC",
    "frequencia_respiratoria": "FR",
    "mucosas": "cor, tempo de preenchimento capilar",
    "hidratacao": "hidratado, desidratado",
    "achados_relevantes": "palpação, ausculta, outros achados"
  },
  "avaliacao": {
    "suspeitas_clinicas": "hipóteses diagnósticas",
    "diagnostico_presuntivo": "diagnóstico presuntivo"
  },
  "plano": {
    "exames_solicitados": "exames complementares pedidos",
    "medicacoes_prescritas": "medicações com dose, via e frequência",
    "orientacoes_ao_tutor": "cuidados em casa, alimentação",
    "retorno": "retorno recomendado"
  }
}

IMPORTANTE: Se qualquer campo não puder ser preenchido com ABSOLUTA CERTEZA baseada na conversa, use exatamente: "Não informado na consulta"

Transcrição a analisar:
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
      hasTranscricao: !!parsed.transcricao_organizada,
      hasIdentificacao: !!parsed.identificacao,
      hasAnamnese: !!parsed.anamnese,
      hasExameFisico: !!parsed.exame_fisico,
      hasAvaliacao: !!parsed.avaliacao,
      hasPlano: !!parsed.plano,
    });

    // Mapeia a nova estrutura para o formato esperado pelo frontend
    const mappedFields = {
      // Transcrição organizada
      transcricao_organizada: parsed.transcricao_organizada || '',

      // Identificação
      nome_animal: parsed.identificacao?.nome_animal || '',
      especie: parsed.identificacao?.especie || '',
      raca: parsed.identificacao?.raca || '',
      idade: parsed.identificacao?.idade || '',
      sexo: parsed.identificacao?.sexo || '',
      peso: parsed.identificacao?.peso || '',

      // Anamnese
      queixa_principal: parsed.anamnese?.queixa_principal || '',
      historico_do_problema: parsed.anamnese?.historico_do_problema || '',
      alimentacao: parsed.anamnese?.alimentacao || '',
      ambiente: parsed.anamnese?.ambiente || '',
      vacinacao: parsed.anamnese?.vacinacao || '',
      vermifugacao: parsed.anamnese?.vermifugacao || '',
      doencas_previas: parsed.anamnese?.doencas_previas || '',
      uso_medicacao: parsed.anamnese?.uso_medicacao || '',

      // Exame físico
      estado_geral: parsed.exame_fisico?.estado_geral || '',
      temperatura: parsed.exame_fisico?.temperatura || '',
      frequencia_cardiaca: parsed.exame_fisico?.frequencia_cardiaca || '',
      frequencia_respiratoria:
        parsed.exame_fisico?.frequencia_respiratoria || '',
      mucosas: parsed.exame_fisico?.mucosas || '',
      hidratacao: parsed.exame_fisico?.hidratacao || '',
      achados_relevantes: parsed.exame_fisico?.achados_relevantes || '',

      // Avaliação
      suspeitas_clinicas: parsed.avaliacao?.suspeitas_clinicas || '',
      diagnostico_presuntivo: parsed.avaliacao?.diagnostico_presuntivo || '',

      // Plano
      exames_solicitados: parsed.plano?.exames_solicitados || '',
      medicacoes_prescritas: parsed.plano?.medicacoes_prescritas || '',
      orientacoes_ao_tutor: parsed.plano?.orientacoes_ao_tutor || '',
      retorno: parsed.plano?.retorno || '',
    };

    // Gera segments a partir da transcrição organizada
    const segments = [];
    if (parsed.transcricao_organizada) {
      const lines = parsed.transcricao_organizada.split('\n');
      let currentSpeaker = 'Tutor';
      let currentText = '';

      for (const line of lines) {
        const vetMatch = line.match(/^\[VETERINÁRIO\]:\s*(.*)/i);
        const tutorMatch = line.match(/^\[TUTOR\]:\s*(.*)/i);
        const indefinidoMatch = line.match(/^\[INDEFINIDO\]:\s*(.*)/i);

        if (vetMatch) {
          if (currentText && currentSpeaker) {
            segments.push({
              speaker: currentSpeaker,
              text: currentText.trim(),
            });
          }
          currentSpeaker = 'Medico';
          currentText = vetMatch[1];
        } else if (tutorMatch) {
          if (currentText && currentSpeaker) {
            segments.push({
              speaker: currentSpeaker,
              text: currentText.trim(),
            });
          }
          currentSpeaker = 'Tutor';
          currentText = tutorMatch[1];
        } else if (indefinidoMatch) {
          if (currentText && currentSpeaker) {
            segments.push({
              speaker: currentSpeaker,
              text: currentText.trim(),
            });
          }
          currentSpeaker = 'Tutor';
          currentText = indefinidoMatch[1];
        } else if (line.trim()) {
          currentText += ' ' + line;
        }
      }

      if (currentText && currentSpeaker) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
    }

    return {
      fields: mappedFields,
      segments: segments,
      raw: parsed, // Mantém o resultado original para debug
    };
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
