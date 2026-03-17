const DEFAULT_FIELD_ASSIST_PROMPT_VERSION = 'field_assist_extraction_v1.0.0';
const DEFAULT_FIELD_ASSIST_CONTEXT_MODE = 'campo';
const SUPPORTED_CONTEXT_MODES = new Set([
  'nova',
  'retorno',
  'emergencia',
  'campo',
]);

const FIELD_ASSIST_PROMPTS = {
  field_assist_extraction_v1_0_0: {
    version: 'field_assist_extraction_v1.0.0',
    status: 'active',
    releasedAt: '2026-03-10',
    summary:
      'Prompt unificado para diarizacao + extracao estruturada + melhoria textual.',
    systemPrompt: `Você é um assistente clínico veterinário especializado em:

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
  },
  "autoavaliacao": {
    "queixa_principal_evidencia": "",
    "historico_do_problema_evidencia": "",
    "achados_relevantes_evidencia": "",
    "diagnostico_presuntivo_evidencia": "",
    "orientacoes_ao_tutor_evidencia": "",
    "medicacoes_prescritas_evidencia": "",
    "exames_solicitados_evidencia": "",
    "retorno_evidencia": ""
  }
}

ETAPA 3 — MELHORIA TEXTUAL

Reescreva os campos (Queixa principal, Histórico, Avaliação, Plano) de forma técnica, clara e objetiva, mantendo integralmente o significado original.`,
    buildUserPrompt: (
      combinedText = '',
    ) => `Analise esta transcrição de consulta veterinária e retorne UM JSON com a estrutura COMPLETA (todas as chaves obrigatórias):

{
  "transcricao_organizada": "[VETERINÁRIO]: ...\\n[TUTOR]: ...\\n[INDEFINIDO]: ...",
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
  },
  "autoavaliacao": {
    "queixa_principal_evidencia": "trecho literal curto da conversa",
    "historico_do_problema_evidencia": "trecho literal curto da conversa",
    "achados_relevantes_evidencia": "trecho literal curto da conversa",
    "diagnostico_presuntivo_evidencia": "trecho literal curto da conversa",
    "orientacoes_ao_tutor_evidencia": "trecho literal curto da conversa",
    "medicacoes_prescritas_evidencia": "trecho literal curto da conversa",
    "exames_solicitados_evidencia": "trecho literal curto da conversa",
    "retorno_evidencia": "trecho literal curto da conversa"
  }
}

IMPORTANTE: Se qualquer campo não puder ser preenchido com ABSOLUTA CERTEZA baseada na conversa, use exatamente: "Não informado na consulta"
IMPORTANTE 2: Preencha 'autoavaliacao' com evidências curtas e literais do transcript para cada campo; sem evidência confiável, use "Não informado na consulta".

Transcrição a analisar:
${combinedText}`,
  },
};

const FIELD_ASSIST_PROMPT_CHANGELOG = [
  {
    version: 'field_assist_extraction_v1.0.0',
    date: '2026-03-10',
    changes: [
      'Estruturacao de prompt unificado para diarizacao, extracao e melhoria textual.',
      'Padrao explicito de preenchimento conservador com "Não informado na consulta".',
      'Registro de versao para auditoria em quality.aiPrompt.',
    ],
  },
];

const FIELD_ASSIST_FEWSHOT_EXAMPLES = [
  {
    id: 'campo_bovino_negacao_febre',
    contextModes: ['campo', 'retorno'],
    porte: 'grande',
    species: ['bovino'],
    edgeCases: ['negacao'],
    input:
      'Tutor: Em casa ele estava sem febre. Vet: No exame temperatura 39,8 e desidratacao leve.',
    output:
      'diagnostico_presuntivo: Sindrome febril em avaliacao; orientacoes_ao_tutor: monitorar temperatura e retorno em 24-48h.',
  },
  {
    id: 'retorno_pequenos_evolucao',
    contextModes: ['retorno'],
    porte: 'pequeno',
    species: ['canino', 'felino'],
    edgeCases: ['temporalidade'],
    input:
      'Tutor: Melhorou apos 48h, mas voltou a vomitar hoje. Vet: manter suporte, ajustar dieta e reavaliar.',
    output:
      'historico_do_problema: melhora parcial seguida de recidiva; retorno: reavaliar em 24-48h.',
  },
  {
    id: 'emergencia_equino_colica',
    contextModes: ['emergencia', 'campo'],
    porte: 'grande',
    species: ['equino'],
    edgeCases: ['priorizacao_risco'],
    input:
      'Tutor: Cavalo rolando no chao e sudorese intensa. Vet: suspeita de colica, analgesia imediata e estabilizacao.',
    output:
      'diagnostico_presuntivo: colica em avaliacao; orientacoes_ao_tutor: monitoramento intensivo e sinais de alerta.',
  },
  {
    id: 'ambiguidade_falante',
    contextModes: ['nova', 'campo'],
    porte: 'indefinido',
    species: ['indefinido'],
    edgeCases: ['ambiguidade'],
    input:
      '[INDEFINIDO]: ele piorou hoje. Vet: no exame, mucosas hipocoradas e FC elevada.',
    output:
      'transcricao_organizada deve manter [INDEFINIDO] quando a origem da fala nao for clara.',
  },
  {
    id: 'ruido_conversacional_limpeza',
    contextModes: ['nova', 'campo', 'retorno'],
    porte: 'indefinido',
    species: ['indefinido'],
    edgeCases: ['ruido'],
    input:
      'Tutor: Bom dia doutor, tudo bem? Obrigado. Vet: exame sem achados relevantes.',
    output:
      'queixa_principal: Nao informado na consulta; achados_relevantes: exame sem alteracoes relevantes.',
  },
];

function normalizeVersionKey(raw = '') {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w.]+/g, '_')
    .replace(/\./g, '_');
}

function normalizeContextMode(raw = '') {
  const mode = String(raw || '')
    .trim()
    .toLowerCase();
  if (SUPPORTED_CONTEXT_MODES.has(mode)) return mode;
  return DEFAULT_FIELD_ASSIST_CONTEXT_MODE;
}

function buildContextSystemInstructions(
  mode = DEFAULT_FIELD_ASSIST_CONTEXT_MODE,
) {
  if (mode === 'retorno') {
    return `\nCONTEXTO CLINICO: RETORNO\n- Priorize evolucao desde consulta anterior.\n- Compare resposta ao tratamento e pontos de piora/melhora.\n- Se houver conflito, destaque estado atual com base no transcript.`;
  }
  if (mode === 'emergencia') {
    return `\nCONTEXTO CLINICO: EMERGENCIA\n- Priorize sinais de risco imediato e estabilizacao inicial.\n- Destaque conduta das primeiras horas.\n- Evite extrapolacoes diagnosticas sem evidencias objetivas.`;
  }
  if (mode === 'nova') {
    return `\nCONTEXTO CLINICO: CONSULTA NOVA\n- Priorize queixa inicial, cronologia dos sinais e hipoteses iniciais.\n- Estruture plano diagnostico/terapeutico de primeira abordagem.`;
  }
  return `\nCONTEXTO CLINICO: CAMPO\n- Considere variaveis de atendimento em propriedade (manejo, lote, rebanho).\n- Priorize orientacoes praticas e monitoramento em ambiente de campo.`;
}

function buildContextUserInstructions(
  mode = DEFAULT_FIELD_ASSIST_CONTEXT_MODE,
) {
  if (mode === 'retorno') {
    return `\nContexto desta consulta: retorno. Compare com a evolucao relatada e evidencie o estado atual.`;
  }
  if (mode === 'emergencia') {
    return `\nContexto desta consulta: emergencia. Foque em estabilizacao imediata e sinais criticos.`;
  }
  if (mode === 'nova') {
    return `\nContexto desta consulta: nova. Foque em investigacao inicial e plano de primeira conduta.`;
  }
  return `\nContexto desta consulta: campo. Considere manejo, producao e viabilidade de conduta em propriedade.`;
}

function normalizeSpecies(raw = '') {
  const text = String(raw || '')
    .trim()
    .toLowerCase();
  if (!text) return 'indefinido';
  if (/(bovin|vaca|boi|bezer)/.test(text)) return 'bovino';
  if (/(equin|caval|egua|potro)/.test(text)) return 'equino';
  if (/(canin|cachorr|cao)/.test(text)) return 'canino';
  if (/(felin|gato)/.test(text)) return 'felino';
  return 'indefinido';
}

function inferSpeciesFromText(text = '') {
  return normalizeSpecies(text);
}

function resolvePorte({ species = 'indefinido', porteHint = '' } = {}) {
  const porte = String(porteHint || '')
    .trim()
    .toLowerCase();
  if (porte === 'grande' || porte === 'pequeno') return porte;
  if (species === 'bovino' || species === 'equino') return 'grande';
  if (species === 'canino' || species === 'felino') return 'pequeno';
  return 'indefinido';
}

function scoreFewShotExample({
  example,
  contextMode,
  species,
  porte,
  normalizedText,
}) {
  let score = 0;
  if (example.contextModes.includes(contextMode)) score += 3;
  if (example.porte === porte) score += 2;
  if (example.species.includes(species)) score += 2;

  for (const edgeCase of example.edgeCases) {
    if (
      (edgeCase === 'negacao' && /\bsem|nao|não\b/.test(normalizedText)) ||
      (edgeCase === 'ambiguidade' && /\bindefinid/.test(normalizedText)) ||
      (edgeCase === 'ruido' &&
        /\b(bom dia|boa tarde|obrigad|certo)\b/.test(normalizedText)) ||
      (edgeCase === 'temporalidade' &&
        /\b(hoje|ontem|48h|24h|dias?)\b/.test(normalizedText)) ||
      (edgeCase === 'priorizacao_risco' &&
        /\b(emerg|risco|grave|colica|urgencia)\b/.test(normalizedText))
    ) {
      score += 1;
    }
  }
  return score;
}

function selectFewShotExamples({
  contextMode,
  species,
  porte,
  combinedText = '',
  maxExamples = 2,
}) {
  const normalizedText = String(combinedText || '').toLowerCase();
  return FIELD_ASSIST_FEWSHOT_EXAMPLES.map((example) => ({
    ...example,
    score: scoreFewShotExample({
      example,
      contextMode,
      species,
      porte,
      normalizedText,
    }),
  }))
    .sort((a, b) => b.score - a.score)
    .filter((example) => example.score > 0)
    .slice(0, Math.max(1, Math.min(4, maxExamples)));
}

function formatFewShotExamples(examples = []) {
  if (!Array.isArray(examples) || !examples.length) return '';
  const blocks = examples
    .map(
      (example, index) =>
        `Exemplo ${index + 1} (${example.id})\nEntrada: ${example.input}\nSaida esperada: ${example.output}`,
    )
    .join('\n\n');
  return `\nEXEMPLOS CURADOS (few-shot)\n${blocks}`;
}

function resolveFieldAssistPrompt(options = {}) {
  const requested = String(
    options?.promptVersion ||
      process.env.FIELD_ASSIST_PROMPT_VERSION ||
      DEFAULT_FIELD_ASSIST_PROMPT_VERSION,
  ).trim();
  const requestedKey = normalizeVersionKey(requested);
  const fallbackKey = normalizeVersionKey(DEFAULT_FIELD_ASSIST_PROMPT_VERSION);
  const entry =
    FIELD_ASSIST_PROMPTS[requestedKey] || FIELD_ASSIST_PROMPTS[fallbackKey];
  const contextMode = normalizeContextMode(options?.contextMode);

  const combinedText = String(options?.combinedText || '').trim();
  const species = normalizeSpecies(
    options?.speciesHint || inferSpeciesFromText(combinedText),
  );
  const porte = resolvePorte({ species, porteHint: options?.porteHint });
  const maxFewShotExamples = Number.isFinite(
    Number(options?.maxFewShotExamples),
  )
    ? Number(options.maxFewShotExamples)
    : Number.isFinite(Number(process.env.FIELD_ASSIST_FEWSHOT_MAX))
      ? Number(process.env.FIELD_ASSIST_FEWSHOT_MAX)
      : 2;
  const selectedFewShots = selectFewShotExamples({
    contextMode,
    species,
    porte,
    combinedText,
    maxExamples: maxFewShotExamples,
  });
  const fewShotSection = formatFewShotExamples(selectedFewShots);
  return {
    version: entry.version,
    status: entry.status,
    releasedAt: entry.releasedAt,
    summary: entry.summary,
    systemPrompt: `${entry.systemPrompt}${buildContextSystemInstructions(contextMode)}${fewShotSection}`,
    userPrompt: `${entry.buildUserPrompt(combinedText)}${buildContextUserInstructions(contextMode)}`,
    fallbackApplied: !FIELD_ASSIST_PROMPTS[requestedKey],
    requestedVersion: requested,
    contextMode,
    species,
    porte,
    fewShotExamples: selectedFewShots.map((example) => ({
      id: example.id,
      edgeCases: example.edgeCases,
    })),
  };
}

function getFieldAssistPromptChangelog() {
  return FIELD_ASSIST_PROMPT_CHANGELOG.map((entry) => ({ ...entry }));
}

module.exports = {
  DEFAULT_FIELD_ASSIST_PROMPT_VERSION,
  DEFAULT_FIELD_ASSIST_CONTEXT_MODE,
  resolveFieldAssistPrompt,
  getFieldAssistPromptChangelog,
};
