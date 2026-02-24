// Funções usadas indiretamente via buildHeuristicDraft e generateWithOpenAI
const {
  runUnifiedClinicalBrain,
  classifyPorteFromContext,
  resolveSpecificFieldKeys,
  splitDialogueByRole,
  detectSpeciesProfile,
  titleByMode,
  buildConfidenceByField,
  buildMissingFields,
  buildHeuristicDraft,
  ensureDraftShape,
  parseJsonObjectSafe,
  mapStructuredRecordToDraft,
  mergeDraftsPreferAI,
  runDraftSanityCheck,
} = require('./heuristicService');

const {
  buildFieldExtractionGuide,
  buildFieldRefinementPrompt,
  buildPortePromptRules,
  selectFewShotExamples,
} = require('./promptService');

const {
  CLINICAL_SCHEMA_VERSION,
  validateStructuredClinicalRecord,
} = require('../ai/clinicalStructuredSchema');

async function generateWithOpenAI({
  messages,
  mode,
  patient,
  recordProfile = null,
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const unified = runUnifiedClinicalBrain(messages);
  const { sourceText } = unified;
  const dialogue = splitDialogueByRole(
    messages.map((item) => String(item?.content || '')).join('\n'),
  );
  const tutorContext =
    unified.context?.tutorContent || dialogue.tutorText || sourceText;
  const vetContext =
    unified.context?.medicoContent || dialogue.vetText || sourceText;
  const porte = classifyPorteFromContext(patient, sourceText, recordProfile);
  const specificFieldKeys = resolveSpecificFieldKeys(recordProfile, porte);
  const patientContext = patient
    ? `Paciente: ${patient.name || ''}; especie: ${patient.species || ''}; raca: ${patient.breed || ''}; tutor: ${patient.ownerName || ''}.`
    : '';
  const specificKeysPrompt = specificFieldKeys
    .map((key) => `"${key}"`)
    .join(', ');
  const detailLevel = String(
    recordProfile?.detailLevel || 'standard',
  ).toLowerCase();
  const extractionGuide = buildFieldExtractionGuide(porte);
  const porteRules = buildPortePromptRules(porte, detailLevel);
  const normalizedChat = messages
    .map(
      (m) =>
        `${m?.role === 'assistant' ? 'ASSISTENTE' : 'USUARIO'}: ${String(m?.content || '')}`,
    )
    .join('\n');
  const maxFewShot = Math.max(
    0,
    Number.isFinite(Number(process.env.OPENAI_FEWSHOT_EXAMPLES))
      ? Number(process.env.OPENAI_FEWSHOT_EXAMPLES)
      : 3,
  );
  const fewShotExamples = selectFewShotExamples({
    mode,
    porte,
    sourceText,
    maxExamples: maxFewShot,
  });

  const systemPrompt = [
    'Voce e um assistente especializado em preenchimento de prontuario veterinario.',
    'OBJETIVO: extrair informacoes clinicas do dialogo e preencher corretamente os campos do prontuario.',
    'REGRAS CRITICAS:',
    '- Use apenas dados presentes na conversa. Nunca invente.',
    '- Se nao houver evidencia para um dado no bloco estruturado, use "Não informado".',
    '- Se inferir com alta confianca, marque com sufixo "(inferido)".',
    '- Prioridade de conflitos: exame fisico > veterinario > tutor.',
    '- Detecte sinais de urgencia e classifique gravidade quando possivel.',
    '- Ignore saudacoes e conversa social sem valor clinico.',
    '- Priorize sinais relatados pelo tutor para queixa/anamnese.',
    '- Priorize condutas e observacoes tecnicas do veterinario para exame/diagnostico/tratamento.',
    '- Nao invente informacoes ausentes no texto.',
    '- Retorne SOMENTE JSON valido, sem markdown ou comentarios.',
    detailLevel === 'max'
      ? 'MODO DETALHADO: maximize completude com frases curtas e objetivas quando houver evidencia.'
      : 'Mantenha objetividade e nao invente dados.',
    `PORTE DO PACIENTE: ${porte}.`,
    `GUIA DE EXTRAÇÃO PARA ESTE PORTE: ${extractionGuide}`,
    `REGRAS ESPECIFICAS DE PORTE: ${porteRules}`,
    'Campos obrigatorios no JSON:',
    '{',
    '  "chiefComplaint": "string",',
    '  "anamnesis": "string",',
    '  "physicalExam": "string",',
    '  "diagnosis": "string",',
    '  "treatment": "string",',
    '  "procedures": "string",',
    '  "medications": "string",',
    '  "examDetails": "string",',
    '  "notes": "string",',
    '  "returnRecommendation": "string",',
    `  "porte": "${porte}",`,
    '  "specificFields": { ... },',
    '  "structuredClinicalRecord": { ... }',
    '}',
    'No bloco structuredClinicalRecord, use este formato: propriedade, animal, neonato_info, queixa_principal, anamnese, tratamento_anterior, vacinacao, vermifugacao, sinais_clinicos, exame_fisico, achados, exames_solicitados, diagnostico_sugestivo, diagnosticos_diferenciais, tratamento, recomendacoes, urgencia, analise_avancada.',
    `No objeto "specificFields", use APENAS estas chaves: ${specificKeysPrompt}.`,
    'Para cada chave sem informacao no chat, retorne string vazia.',
    'Se algum campo nao existir no chat, mantenha string vazia.',
    `Tipo da consulta: ${mode === 'retorno' ? 'retorno' : 'nova'}.`,
    patientContext,
    `CONTEXTO TUTOR: ${tutorContext}`,
    `CONTEXTO VETERINARIO: ${vetContext}`,
    `PRE-PARSE UNIFICADO (mesmo cerebro campo/manual): ${JSON.stringify({
      chiefComplaint: unified.parsed?.chiefComplaint || '',
      anamnesis: unified.parsed?.anamnesis || '',
      physicalExam: unified.parsed?.physicalExam || '',
      diagnosis: unified.parsed?.diagnosis || '',
      treatment: unified.parsed?.treatment || '',
      medications: unified.parsed?.medications || '',
      alerts: unified.pipeline?.semanticRules?.alerts || [],
    })}`,
    `CHAT ORIGINAL:\n${normalizedChat}`,
    fewShotExamples.length
      ? `EXEMPLOS GUIA DISPONIVEIS: ${fewShotExamples.length}. Siga o formato de saída dos exemplos.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const completionMessages = [{ role: 'system', content: systemPrompt }];

  fewShotExamples.forEach((example, index) => {
    const header = `EXEMPLO ${index + 1} (porte=${porte}, modo=${mode})`;
    completionMessages.push({
      role: 'user',
      content: `${header}\nCONVERSA:\n${String(example.input || '')}\nRETORNE O JSON CONFORME REGRAS.`,
    });
    completionMessages.push({
      role: 'assistant',
      content: JSON.stringify(example.output || {}, null, 0),
    });
  });

  completionMessages.push(
    ...messages.map((m) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: String(m?.content || ''),
    })),
  );

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: completionMessages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI ${response.status}: ${errText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || '';
  const parsedResult = parseJsonObjectSafe(content);
  const { parsed } = parsedResult;
  if (!parsed || typeof parsed !== 'object') {
    const reason = parsedResult.error || 'invalid_json';
    throw new Error(`Resposta da IA sem JSON valido (${reason}).`);
  }
  const structuredRaw =
    parsed?.structuredClinicalRecord ||
    parsed?.prontuarioEstruturado ||
    parsed?.prontuario_estruturado ||
    {};
  const structuredClinicalRecord =
    validateStructuredClinicalRecord(structuredRaw);
  const structuredMapped = mapStructuredRecordToDraft(
    structuredClinicalRecord,
    porte,
    specificFieldKeys,
  );
  const mergedAiRaw = {
    ...structuredMapped,
    ...parsed,
    specificFields: {
      ...(structuredMapped.specificFields || {}),
      ...(parsed.specificFields || parsed.specific_fields || {}),
    },
  };

  return {
    draft: ensureDraftShape(mergedAiRaw, mode, specificFieldKeys, porte),
    provider: 'openai',
    confidence: 0.8,
    structuredClinicalRecord,
    schemaVersion: CLINICAL_SCHEMA_VERSION,
    context: {
      porte,
      specificFieldKeys,
      unifiedBrain: {
        semanticAlerts: unified.pipeline?.semanticRules?.alerts || [],
        roleReliability: unified.context?.roleReliability || null,
      },
    },
  };
}

async function generateRecordDraftFromChat({
  messages,
  mode = 'nova',
  patient = null,
  recordProfile = null,
}) {
  const safeMessages = Array.isArray(messages)
    ? messages.filter((m) => m && String(m.content || '').trim())
    : [];
  const sourceText = safeMessages
    .map((m) => String(m?.content || ''))
    .join(' ');
  const porte = classifyPorteFromContext(patient, sourceText, recordProfile);
  const specificFieldKeys = resolveSpecificFieldKeys(recordProfile, porte);

  if (!safeMessages.length) {
    return {
      draft: ensureDraftShape({}, mode, specificFieldKeys, porte),
      provider: 'none',
      confidence: 0,
      missingFields: buildMissingFields(
        ensureDraftShape({}, mode, specificFieldKeys, porte),
        specificFieldKeys,
      ),
      context: {
        modeTitle: titleByMode(mode),
        speciesProfile: 'geral',
        porte,
        specificFieldKeys,
      },
    };
  }

  const speciesProfile = detectSpeciesProfile(patient, sourceText);
  const heuristic = buildHeuristicDraft(
    safeMessages,
    mode,
    patient,
    recordProfile,
  );
  let aiErrorMessage = null;

  try {
    const ai = await generateWithOpenAI({
      messages: safeMessages,
      mode,
      patient,
      recordProfile,
    });
    if (ai) {
      const mergedDraft = mergeDraftsPreferAI(
        ai.draft,
        heuristic.draft,
        specificFieldKeys,
        mode,
        porte,
      );
      const confidence = buildConfidenceByField(
        mergedDraft,
        speciesProfile,
        specificFieldKeys,
      );
      const missingFields = buildMissingFields(mergedDraft, specificFieldKeys);
      const reviewed = runDraftSanityCheck({
        draft: mergedDraft,
        sourceText,
        heuristicDraft: heuristic.draft,
        specificFieldKeys,
      });
      return {
        ...ai,
        draft: reviewed.draft,
        confidence: ai.confidence || confidence.overall,
        confidenceByField: confidence.byField,
        missingFields,
        qualityCheck: reviewed.qualityCheck,
        context: {
          modeTitle: titleByMode(mode),
          speciesProfile: speciesProfile?.id || 'geral',
          porte,
          specificFieldKeys,
          schemaVersion: ai?.schemaVersion || CLINICAL_SCHEMA_VERSION,
          mergedWithHeuristic: true,
        },
      };
    }
  } catch (error) {
    aiErrorMessage = String(error?.message || 'unknown_openai_error');
    console.error('Falha na geracao de rascunho via OpenAI:', aiErrorMessage);
  }

  const reviewedHeuristic = runDraftSanityCheck({
    draft: heuristic.draft,
    sourceText,
    heuristicDraft: heuristic.draft,
    specificFieldKeys,
  });

  return {
    ...heuristic,
    draft: reviewedHeuristic.draft,
    qualityCheck: reviewedHeuristic.qualityCheck,
    context: {
      ...(heuristic.context || {}),
      schemaVersion: CLINICAL_SCHEMA_VERSION,
      aiFallbackReason: aiErrorMessage || 'openai_unavailable_or_failed',
    },
  };
}

function localRefineField(field, text) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';

  const first = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (
    [
      'chiefComplaint',
      'anamnesis',
      'physicalExam',
      'diagnosis',
      'treatment',
      'notes',
    ].includes(field)
  ) {
    return /[.!?]$/.test(first) ? first : `${first}.`;
  }
  return first;
}

async function refineFieldWithOpenAI({
  field,
  text,
  mode = 'nova',
  patient = null,
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = buildFieldRefinementPrompt({ field, mode, patient });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: String(text || '') },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI ${response.status}: ${errText}`);
  }

  const payload = await response.json();
  return String(payload?.choices?.[0]?.message?.content || '').trim();
}

async function refineRecordField({
  field,
  text,
  mode = 'nova',
  patient = null,
}) {
  if (!text || !String(text).trim()) {
    return { text: '', provider: 'none', confidence: 0 };
  }

  try {
    const ai = await refineFieldWithOpenAI({ field, text, mode, patient });
    if (ai) {
      return { text: ai, provider: 'openai', confidence: 0.82 };
    }
  } catch (error) {
    console.error('Falha no refinamento via OpenAI:', error.message);
  }

  return {
    text: localRefineField(field, text),
    provider: 'heuristic',
    confidence: 0.5,
  };
}

module.exports = {
  generateRecordDraftFromChat,
  refineRecordField,
};
