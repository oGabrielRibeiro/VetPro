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

const stageTimeouts = {
  aiMs: Number(process.env.FIELD_ASSIST_AI_TIMEOUT_MS || 5000),
  parseMs: Number(process.env.FIELD_ASSIST_PARSE_TIMEOUT_MS || 2000),
  retries: Math.max(0, Number(process.env.FIELD_ASSIST_AI_RETRIES || 1)),
};

const circuitBreakers = new Map();

function getCircuitState(provider = '') {
  const key = String(provider || '').trim();
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, {
      failures: 0,
      openedUntil: 0,
    });
  }
  return circuitBreakers.get(key);
}

function canUseProvider(provider = '') {
  const state = getCircuitState(provider);
  return Date.now() >= Number(state.openedUntil || 0);
}

function reportProviderSuccess(provider = '') {
  const state = getCircuitState(provider);
  state.failures = 0;
  state.openedUntil = 0;
}

function reportProviderFailure(provider = '', reason = '') {
  const state = getCircuitState(provider);
  state.failures += 1;
  if (state.failures >= 3) {
    const openMs = Math.min(120000, state.failures * 5000);
    state.openedUntil = Date.now() + openMs;
    logger.warn('Circuit breaker aberto para provider IA', {
      provider,
      openMs,
      reason,
    });
  }
}

function wait(ms = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

async function withRetry(fn, { retries = 0, baseDelayMs = 350 } = {}) {
  let lastError = null;
  // eslint-disable-next-line no-await-in-loop
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const backoffMs = baseDelayMs * 2 ** attempt;
        // eslint-disable-next-line no-await-in-loop
        await wait(backoffMs);
      }
    }
  }
  throw lastError;
}

async function fetchJsonWithTimeout(
  url,
  options = {},
  { timeoutMs = 5000, provider = 'unknown' } = {},
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${provider} ${response.status}: ${errText}`);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${provider} timeout (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveProviderCascade() {
  return [{ id: 'openai' }, { id: 'azure' }, { id: 'gcp' }];
}

function mapAiResponseToDraft({
  parsed = {},
  mode = 'nova',
  porte = 'pequeno',
  specificFieldKeys = [],
  provider = 'openai',
  unified = null,
}) {
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
    provider,
    confidence: 0.8,
    structuredClinicalRecord,
    schemaVersion: CLINICAL_SCHEMA_VERSION,
    context: {
      porte,
      specificFieldKeys,
      unifiedBrain: {
        semanticAlerts: unified?.pipeline?.semanticRules?.alerts || [],
        roleReliability: unified?.context?.roleReliability || null,
      },
    },
  };
}

async function callOpenAIChat({
  completionMessages = [],
  model = 'gpt-4o-mini',
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('openai_missing_api_key');

  const payload = await fetchJsonWithTimeout(
    'https://api.openai.com/v1/chat/completions',
    {
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
    },
    { timeoutMs: stageTimeouts.aiMs, provider: 'openai' },
  );

  return String(payload?.choices?.[0]?.message?.content || '').trim();
}

async function callAzureOpenAIChat({
  completionMessages = [],
  model = 'gpt-4o-mini',
}) {
  const endpoint = String(process.env.AZURE_OPENAI_ENDPOINT || '').trim();
  const deployment = String(
    process.env.AZURE_OPENAI_DEPLOYMENT || model || '',
  ).trim();
  const apiKey = String(process.env.AZURE_OPENAI_API_KEY || '').trim();
  if (!endpoint || !deployment || !apiKey) {
    throw new Error('azure_openai_not_configured');
  }

  const base = endpoint.replace(/\/+$/, '');
  const url = `${base}/openai/deployments/${deployment}/chat/completions?api-version=2024-06-01`;
  const payload = await fetchJsonWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: completionMessages,
      }),
    },
    { timeoutMs: stageTimeouts.aiMs, provider: 'azure' },
  );

  return String(payload?.choices?.[0]?.message?.content || '').trim();
}

async function callGoogleGeminiChat({ completionMessages = [] }) {
  const apiKey = String(process.env.GCP_GEMINI_API_KEY || '').trim();
  const model = String(
    process.env.GCP_GEMINI_MODEL || 'gemini-1.5-flash',
  ).trim();
  if (!apiKey) throw new Error('gcp_gemini_not_configured');

  const prompt = completionMessages
    .map(
      (m) =>
        `${String(m.role || 'user').toUpperCase()}: ${String(m.content || '')}`,
    )
    .join('\n\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = await fetchJsonWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
    { timeoutMs: stageTimeouts.aiMs, provider: 'gcp' },
  );

  const text =
    payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
    payload?.candidates?.[0]?.content?.parts?.map((p) => p?.text).join('\n') ||
    '';
  return String(text || '').trim();
}

async function runChatCompletionProvider({
  provider = 'openai',
  completionMessages = [],
  model = 'gpt-4o-mini',
}) {
  if (provider === 'openai') {
    return callOpenAIChat({ completionMessages, model });
  }
  if (provider === 'azure') {
    return callAzureOpenAIChat({ completionMessages, model });
  }
  return callGoogleGeminiChat({ completionMessages });
}

async function generateWithOpenAI({
  messages,
  mode,
  patient,
  recordProfile = null,
}) {
  const hasAnyProvider =
    Boolean(process.env.OPENAI_API_KEY) ||
    Boolean(process.env.AZURE_OPENAI_API_KEY) ||
    Boolean(process.env.GCP_GEMINI_API_KEY);
  if (!hasAnyProvider) return null;

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

  const cascade = resolveProviderCascade();
  let lastError = null;

  for (const entry of cascade) {
    const provider = entry.id;
    if (!canUseProvider(provider)) {
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const content = await withRetry(
        async () =>
          runChatCompletionProvider({
            provider,
            completionMessages,
            model,
          }),
        { retries: stageTimeouts.retries },
      );

      const parsedResult = parseJsonObjectSafe(content);
      const { parsed } = parsedResult;
      if (!parsed || typeof parsed !== 'object') {
        const reason = parsedResult.error || 'invalid_json';
        throw new Error(`${provider}_invalid_json_${reason}`);
      }

      reportProviderSuccess(provider);
      return mapAiResponseToDraft({
        parsed,
        mode,
        porte,
        specificFieldKeys,
        provider,
        unified,
      });
    } catch (error) {
      lastError = error;
      reportProviderFailure(provider, error?.message || 'provider_error');
      logger.warn('Provider IA falhou, tentando proximo', {
        provider,
        error: String(error?.message || 'unknown_error'),
      });
    }
  }

  throw lastError || new Error('ia_provider_cascade_failed');
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
  let heuristic = null;
  try {
    heuristic = await Promise.race([
      Promise.resolve(
        buildHeuristicDraft(safeMessages, mode, patient, recordProfile),
      ),
      new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(`heuristic_parse_timeout_${stageTimeouts.parseMs}ms`),
            ),
          stageTimeouts.parseMs,
        );
      }),
    ]);
  } catch (error) {
    logger.warn('Falha no parser heuristico', { error: error.message });
    heuristic = {
      draft: ensureDraftShape({}, mode, specificFieldKeys, porte),
      provider: 'heuristic',
      confidence: 0.2,
      confidenceByField: {},
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
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = buildFieldRefinementPrompt({ field, mode, patient });
  const completionMessages = [
    { role: 'system', content: prompt },
    { role: 'user', content: String(text || '') },
  ];

  const cascade = resolveProviderCascade();
  let lastError = null;

  for (const entry of cascade) {
    const provider = entry.id;
    if (!canUseProvider(provider)) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const content = await withRetry(
        async () =>
          runChatCompletionProvider({
            provider,
            completionMessages,
            model,
          }),
        { retries: stageTimeouts.retries },
      );
      reportProviderSuccess(provider);
      return String(content || '').trim();
    } catch (error) {
      lastError = error;
      reportProviderFailure(provider, error?.message || 'provider_error');
    }
  }

  throw lastError || new Error('ia_refine_provider_cascade_failed');
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
