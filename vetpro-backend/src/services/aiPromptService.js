// Console replaced by logger
/**
 * Serviço de Prompt Otimizado para IA de Prontuários
 * Focado em animais grandes e uso em campo
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const LARGE_ANIMAL_EXAMPLES_FILE = path.join(
  __dirname,
  '..',
  'ai',
  'fieldModeTrainingDataset.json',
);

let largeAnimalExamplesCache = null;

/**
 * Carrega exemplos específicos para animais grandes
 */
function loadLargeAnimalExamples() {
  if (largeAnimalExamplesCache) {
    return largeAnimalExamplesCache;
  }

  try {
    if (fs.existsSync(LARGE_ANIMAL_EXAMPLES_FILE)) {
      const raw = fs.readFileSync(LARGE_ANIMAL_EXAMPLES_FILE, 'utf8');
      const data = JSON.parse(raw);
      largeAnimalExamplesCache = Array.isArray(data) ? data : [];
      return largeAnimalExamplesCache;
    }
  } catch (error) {
    logger.error(
      'Erro ao carregar exemplos de animais grandes:',
      error.message,
    );
  }

  return [];
}

/**
 * Constrói o prompt do sistema otimizado para modo campo
 */
function buildFieldModeSystemPrompt({
  porte,
  mode,
  patient,
  previousConsultation,
}) {
  const isLargeAnimal = porte === 'grande';
  const isReturn = mode === 'retorno';

  // Contexto do paciente
  let patientContext = '';
  if (patient) {
    patientContext = `
PACIENTE ATUAL:
- Nome: ${patient.name || 'Não informado'}
- Espécie: ${patient.species || patient.specie || 'Não informada'}
- Raça: ${patient.breed || 'Não informada'}
- Peso: ${patient.weight ? `${patient.weight} kg` : 'Não informado'}
- Idade: ${patient.age ? `${patient.age} anos` : 'Não informada'}
- Tutor/Proprietário: ${patient.ownerName || 'Não informado'}
- Contato: ${patient.ownerPhone || 'Não informado'}
${patient.persistentProfile ? `- Perfil persistente: ${JSON.stringify(patient.persistentProfile)}` : ''}
`;
  }

  // Contexto da consulta anterior (para retornos)
  let previousContext = '';
  if (isReturn && previousConsultation) {
    previousContext = `
CONSULTA ANTERIOR (referência):
- Queixa principal: ${previousConsultation.chiefComplaint || 'Não informada'}
- Diagnóstico: ${previousConsultation.diagnosis || 'Não informado'}
- Tratamento: ${previousConsultation.treatment || 'Não informado'}
- Medications: ${previousConsultation.medications || 'Não informadas'}
- Observações: ${previousConsultation.notes || 'Nenhuma'}
`;
  }

  // Regras específicas por porte
  let porteRules = '';
  if (isLargeAnimal) {
    porteRules = `
=== REGRAS ESPECÍFICAS PARA ANIMAIS GRANDES (BOVINOS, EQUINOS, ETC) ===

1. CONTEXTO DE CAMPO:
   - O atendimento frequentemente ocorre na propriedade/fazenda
   - Pode haver múltiplos animais (lote/rebanho)
   - Informações sobre propriedade são importantes
   - Foco em produtividade e manejo

2. CAMPOS IMPORTANTES PARA GRANDES ANIMAIS:
   - fazenda/propriedade: nome da propriedade
   - sistema_producao: leite, corte, cria, trabalho, etc.
   - identificacao_animal: brinco, chip, registro
   - escore_corporal: condição corporal (1-5 ou 1-9)
   - dias_em_lactacao: para vacas leiteiras
   - producao_leite: litros/dia
   - motilidade_ruminal: motility do rúmen
   - condicao_casco: avaliação de cascos
   - historico_vacinal: vacinação do rebanho
   - vermifugacao: controle parasitário
   - manejo_alimentar: pasto, concentrado, volumoso
   - contactantes: outros animais do lote

3. SINAIS CLÍNICOS RELEVANTES:
   - Clandestinação (manqueira)
   - Mastite (em bovinos)
   - Timpanismo
   - Diminuição de produção de leite
   - Febre
   - Anorexia
   - Desidratação
   - Problemas respiratórios

4. TRATAMENTO EM CAMPO:
   - Preferir medicamentos de fácil aplicação
   - Considerar custo-benefício
   - Orientações de manejo
   - Follow-up via telefone
`;
  }

  // Regras específicas para retornos
  let returnRules = '';
  if (isReturn) {
    returnRules = `
=== CONSULTA DE RETORNO ===

1. Sempre mencione a evolução desde a última consulta
2. Compare com achados anteriores
3. Avalie eficácia do tratamento anterior
4. Ajuste tratamento se necessário
5. Documente novas queixas se houver
`;
  }

  const baseRules = `
=== REGRAS GERAIS ===

1. USE DADOS REAIS DA CONVERSA:
   - Extraia EXATAMENTE o que foi dito na transcrição
   - Não invente informações
   - Se não houver dado, use "Não informado"

2. COMPLEMENTE COM INFERÊNCIA LÓGICA:
   - Use contexto para連 inferir informações
   - Exemplo: "vacina em dia" pode ser inferido se tutor mencionar "tomou todas as vacinas"
   - Marque informações inferidas com "(inferido)"

3. PRIORIZE OS CAMPOS:
   - Queixa principal (chiefComplaint): O que motivou a visita
   - Anamnese (anamnesis): Histórico e sinais observados
   - Exame físico (physicalExam): O que você avaliou no animal
   - Diagnóstico (diagnosis): Sua suspeita/diagnóstico
   - Tratamento (treatment): O que você fez/orientou

4. PARA TRANSCRIÇÕES BRUTAS DE ÁUDIO:
   - Identifique quem está falando (tutor ou veterinário)
   - Tutor = queixa, anamnese, histórico
   - Veterinário = exame, diagnóstico, tratamento

5. CAMPOS OBRIGATÓRIOS NO JSON:
   - chiefComplaint
   - anamnesis  
   - physicalExam
   - diagnosis
   - treatment
   - procedures
   - medications
   - examDetails
   - notes
   - returnRecommendation

${porteRules}

${returnRules}
`.trim();

  return `${baseRules}

${patientContext}

${previousContext}

Retorne APENAS JSON válido com os campos do prontuário.`;
}

/**
 * Otimiza o prompt com base no tipo de entrada
 */
function optimizePromptForInputType({
  inputType, // 'transcription', 'audio', 'notes', 'chat'
  porte,
  mode,
  patient,
  previousConsultation,
  recordProfile,
}) {
  let additionalInstructions = '';

  switch (inputType) {
    case 'transcription':
    case 'audio':
      additionalInstructions = `
TIPO DE ENTRADA: Transcrição de áudio
- Identifique claramente quem disse cada coisa
- Use formato: "TUTOR: ..." e "VET: ..."
- Extraia sinais clínicos específicos mencionados
- Note condições ambiente (chuva, sol, lama, etc)
`;
      break;

    case 'notes':
      additionalInstructions = `
TIPO DE ENTRADA: Notas rápidas
- Organize as notas em campos estruturados
- Complete campos faltantes logicamente
- Mantenha objetividade
`;
      break;

    case 'chat':
    default:
      additionalInstructions = `
TIPO DE ENTRADA: Chat/Diálogo
- Mantenha conversa original
- Extraia informações clínicas
- Ignore saudações e social
`;
  }

  return (
    buildFieldModeSystemPrompt({
      porte,
      mode,
      patient,
      previousConsultation,
      recordProfile,
    }) + additionalInstructions
  );
}

/**
 * Seleciona exemplos few-shot otimizados
 */
function selectOptimizedExamples({ porte, mode, maxExamples = 3 }) {
  const largeExamples = loadLargeAnimalExamples();

  // Filtrar exemplos por porte e modo
  const filtered = largeExamples.filter((ex) => {
    const exPorte = String(ex.porte || '').toLowerCase();
    const exMode = String(ex.mode || '').toLowerCase();

    if (porte === 'grande') {
      return exPorte === 'grande' || exPorte === 'campo';
    }

    return exMode === mode || exPorte === porte;
  });

  // Se não houver exemplos específicos, usar os gerais
  if (!filtered.length) {
    return largeExamples.slice(0, maxExamples);
  }

  return filtered.slice(0, maxExamples);
}

/**
 * Constrói prompt para refinamento de campo
 */
function buildEnhancedRefinementPrompt({
  field,
  mode,
  patient,
  porte,
  previousConsultation,
}) {
  let contextInfo = '';

  if (patient) {
    contextInfo += `
Paciente: ${patient.name} (${patient.species || patient.specie})
Porte: ${porte}
`;
  }

  if (previousConsultation && mode === 'retorno') {
    contextInfo += `
Última consulta:
- Diagnóstico: ${previousConsultation.diagnosis || 'N/A'}
- Tratamento: ${previousConsultation.treatment || 'N/A'}
`;
  }

  return `
Você é um assistente veterinário especializado em redigir prontuários.

Tarefa: Melhore a redação do campo "${field}" mantendo o significado original.

Contexto:
${contextInfo}

Regras:
1. Mantenha EXATAMENTE os fatos mencionados
2. Melhore apenas a clareza e objetividade
3. NÃO adicione informações não presentes no texto original
4. Use linguagem técnica adequada
5. Campos devem ficar prontos para arquivo médico

Texto original:
{{TEXT}}

Retorne apenas o texto melhorado, sem explicações.
`.trim();
}

/**
 * Valida se os sinais vitais estão em faixas plausíveis
 */
function validateVitals(vitals) {
  const warnings = [];

  if (vitals.temperature) {
    const temp = parseFloat(vitals.temperature);
    if (temp < 37 || temp > 42) {
      warnings.push(`Temperatura ${temp}°C fora da faixa típica (37-42°C)`);
    }
  }

  if (vitals.heartRate) {
    const fc = parseInt(vitals.heartRate, 10);
    if (fc < 30 || fc > 120) {
      warnings.push(`Frequência cardíaca ${fc} bpm pode estar incorreta`);
    }
  }

  if (vitals.respiratoryRate) {
    const fr = parseInt(vitals.respiratoryRate, 10);
    if (fr < 8 || fr > 60) {
      warnings.push(`Frequência respiratória ${fr} ipm pode estar incorreta`);
    }
  }

  return warnings;
}

/**
 * Preenche campos faltantes baseado no histórico
 */
function fillFromHistory(currentDraft, patientHistory) {
  const filled = { ...currentDraft };

  // Se não há queixa atual mas há histórico, usar o diagnóstico anterior como contexto
  if (!filled.chiefComplaint && patientHistory?.lastDiagnosis) {
    filled.chiefComplaint = `Retorno para reavaliação de: ${patientHistory.lastDiagnosis}`;
  }

  // Se não há medications mas há histórico, usar tratamentos anteriores
  if (!filled.medications && patientHistory?.lastTreatments) {
    filled.medications = patientHistory.lastTreatments;
  }

  return filled;
}

module.exports = {
  buildFieldModeSystemPrompt,
  optimizePromptForInputType,
  selectOptimizedExamples,
  buildEnhancedRefinementPrompt,
  validateVitals,
  fillFromHistory,
  loadLargeAnimalExamples,
};
