const { z } = require("zod");

const NOT_INFORMED = "Não informado";
const CLINICAL_SCHEMA_VERSION = "1.1.0";

/**
 * @typedef {Object} ClinicalStructuredRecordDTO
 * @property {string} schema_version
 * @property {Object} propriedade
 * @property {Object} animal
 * @property {Object} neonato_info
 * @property {Object} queixa_principal
 * @property {string} anamnese
 * @property {string} tratamento_anterior
 * @property {string} vacinacao
 * @property {string} vermifugacao
 * @property {Object} sinais_clinicos
 * @property {Object} exame_fisico
 * @property {string} achados
 * @property {string[]} exames_solicitados
 * @property {string} diagnostico_sugestivo
 * @property {string[]} diagnosticos_diferenciais
 * @property {string[]} tratamento
 * @property {string[]} recomendacoes
 * @property {boolean} urgencia
 * @property {Object} analise_avancada
 */

const safeString = z
  .preprocess((value) => {
    if (value == null) return "";
    return String(value).trim();
  }, z.string())
  .transform((value) => (value ? value : NOT_INFORMED))
  .catch(NOT_INFORMED);

const safeStringArray = z
  .preprocess((value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => String(item == null ? "" : item).trim())
      .filter(Boolean);
  }, z.array(z.string()))
  .catch([]);

const gravidadeSchema = z
  .preprocess((value) => String(value == null ? "" : value).trim().toLowerCase(), z.string())
  .transform((value) => {
    if (["leve", "moderado", "grave"].includes(value)) return value;
    return NOT_INFORMED;
  })
  .catch(NOT_INFORMED);

const prioridadeTriagemSchema = z
  .preprocess((value) => String(value == null ? "" : value).trim().toLowerCase(), z.string())
  .transform((value) => {
    if (["baixa", "media", "alta", "imediata"].includes(value)) return value;
    return NOT_INFORMED;
  })
  .catch(NOT_INFORMED);

const riscoSchema = z
  .preprocess((value) => String(value == null ? "" : value).trim().toLowerCase(), z.string())
  .transform((value) => {
    if (["baixo", "moderado", "alto"].includes(value)) return value;
    return NOT_INFORMED;
  })
  .catch(NOT_INFORMED);

const percentualSchema = z
  .preprocess((value) => {
    const text = String(value == null ? "" : value).trim().replace("%", "");
    if (!text) return NOT_INFORMED;
    const num = Number(text.replace(",", "."));
    if (!Number.isFinite(num)) return NOT_INFORMED;
    return Math.max(0, Math.min(100, Number(num.toFixed(2))));
  }, z.union([z.number(), z.string()]))
  .catch(NOT_INFORMED);

const clinicalStructuredSchema = z
  .object({
    schema_version: z.string().default(CLINICAL_SCHEMA_VERSION),
    propriedade: z
      .object({
        responsavel_local: safeString,
        contato: safeString,
        proprietario: safeString,
        endereco: safeString,
        fazenda: safeString,
        tipo_criacao: safeString,
        alimentacao: safeString,
        sal_mineral: safeString,
        vacinacao_rebanho: safeStringArray,
        contactantes: safeStringArray,
      })
      .default({}),
    animal: z
      .object({
        nome: safeString,
        peso: safeString,
        especie: safeString,
        raca: safeString,
        sexo: safeString,
        idade: safeString,
        classificacao_idade: safeString,
        pelagem: safeString,
        identificacao: safeString,
      })
      .default({}),
    neonato_info: z
      .object({
        tipo_concepcao: safeString,
        tipo_parto: safeString,
        colostragem: safeString,
        cura_umbigo: safeString,
      })
      .default({}),
    queixa_principal: z
      .object({
        sistema: safeStringArray,
        descricao: safeString,
      })
      .default({}),
    anamnese: safeString,
    tratamento_anterior: safeString,
    vacinacao: safeString,
    vermifugacao: safeString,
    sinais_clinicos: z
      .object({
        apetite: safeString,
        agua: safeString,
      })
      .default({}),
    exame_fisico: z
      .object({
        estado_geral: safeString,
        ecc: safeString,
        prenhez: safeString,
        postura: safeString,
        fc: safeString,
        fr: safeString,
        temperatura: safeString,
        rumen: safeString,
        ph: safeString,
        linfonodos: safeString,
        mucosas: safeString,
        tpc: safeString,
        pele: safeString,
        ectoparasitas: safeString,
      })
      .default({}),
    achados: safeString,
    exames_solicitados: safeStringArray,
    diagnostico_sugestivo: safeString,
    diagnosticos_diferenciais: safeStringArray,
    tratamento: safeStringArray,
    recomendacoes: safeStringArray,
    urgencia: z.coerce.boolean().catch(false),
    analise_avancada: z
      .object({
        gravidade: gravidadeSchema,
        sinais_alerta: safeStringArray,
        inconsistencias_clinicas: safeStringArray,
        erro_manejo: safeString,
        isolamento_sanitario: safeString,
        possivel_zoonose: safeString,
        risco_morte: riscoSchema,
        score_prognostico: percentualSchema,
        risco_anestesico: riscoSchema,
        probabilidade_diagnostica: percentualSchema,
        prioridade_triagem: prioridadeTriagemSchema,
        cid_vet_equivalente: safeString,
      })
      .optional()
      .default({}),
  })
  .passthrough();

function validateStructuredClinicalRecord(input = {}) {
  const parsed = clinicalStructuredSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  // Fallback defensivo com todos os campos obrigatorios do schema.
  return clinicalStructuredSchema.parse({});
}

module.exports = {
  CLINICAL_SCHEMA_VERSION,
  NOT_INFORMED,
  validateStructuredClinicalRecord,
};
