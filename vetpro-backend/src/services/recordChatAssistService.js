const logger = require('../utils/logger');

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

const { buildFieldRefinementPrompt } = require('./promptService');

const {
  buildFieldModeSystemPrompt,
  selectOptimizedExamples,
} = require('./aiPromptService');

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
  const fewShotExamples = selectOptimizedExamples({
    mode,
    porte,
    maxExamples: maxFewShot,
  });

  const systemPrompt = `${buildFieldModeSystemPrompt({
    porte,
    mode,
    patient,
    previousConsultation: null,
  })}\nCONTEXTO: ${tutorContext} | ${vetContext}\nCHAT: ${normalizedChat}`;

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
      temperature: 0,
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
    logger.error('Falha na geracao de rascunho via OpenAI:', aiErrorMessage);
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
      temperature: 0,
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
    logger.error('Falha no refinamento via OpenAI:', error.message);
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
