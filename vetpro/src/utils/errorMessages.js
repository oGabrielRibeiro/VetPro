export function normalizeMessage(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const phraseMap = [
  ["token nao fornecido", "Sua sessao nao foi identificada. Faca login novamente."],
  ["token invalido", "Sua sessao nao e valida. Faca login novamente."],
  ["token expired", "Sua sessao expirou. Faca login novamente."],
  ["sessao expirada", "Sua sessao expirou. Faca login novamente."],
  ["usuario invalido", "Nao foi possivel validar sua sessao. Faca login novamente."],
  ["usuario nao encontrado", "Usuario nao encontrado. Verifique seus dados e tente novamente."],
  ["email invalido", "Informe um e-mail valido."],
  ["credenciais invalidas", "E-mail ou senha incorretos."],
  ["email ja cadastrado", "Este e-mail ja esta em uso."],
  ["consulta nao encontrada", "Nao encontramos este prontuario."],
  ["paciente nao encontrado", "Paciente nao encontrado."],
  ["patientid e obrigatorio", "Selecione um paciente para continuar."],
  ["retorno sem medicacao nova", "Este retorno nao possui nova medicacao para receita."],
  ["nenhum arquivo enviado", "Selecione um arquivo para anexar."],
  ["arquivo nao encontrado", "Arquivo nao encontrado."],
  ["dois arquivos sao necessarios", "Selecione dois arquivos para comparar."],
  ["mesmo tipo para comparacao", "Escolha dois arquivos do mesmo tipo para comparacao."],
  ["erro ao gerar receita", "Nao foi possivel gerar a receita agora. Tente novamente."],
  ["erro ao gerar pdf", "Nao foi possivel gerar o PDF agora. Tente novamente."],
  ["erro ao analisar conversa de campo", "Nao foi possivel analisar a conversa agora. Tente novamente."],
  ["jwt_secret", "Erro de configuracao do servidor. Tente novamente mais tarde."],
];

function mapByPhrase(rawMessage, fallback) {
  const normalized = normalizeMessage(rawMessage);
  for (const [pattern, friendly] of phraseMap) {
    if (normalized.includes(pattern)) {
      return friendly;
    }
  }
  return fallback;
}

export function toUserFriendlyError(error, fallback = "Nao foi possivel concluir a operacao.") {
  if (!error) return fallback;

  if (typeof error === "string") {
    return mapByPhrase(error, fallback);
  }

  const status = error?.response?.status;
  const apiMessage =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "";

  if (!error?.response) {
    if (normalizeMessage(apiMessage).includes("network")) {
      return "Sem conexao com o servidor. Verifique sua internet e tente novamente.";
    }
    return mapByPhrase(apiMessage, "Nao foi possivel conectar ao servidor. Tente novamente.");
  }

  if (status === 401) {
    return mapByPhrase(apiMessage, "Sua sessao expirou. Faca login novamente.");
  }
  if (status === 403) {
    return "Voce nao tem permissao para esta acao.";
  }
  if (status === 404) {
    return mapByPhrase(apiMessage, "Nao encontramos o recurso solicitado.");
  }
  if (status === 409) {
    return mapByPhrase(apiMessage, "Ja existe um registro com estes dados.");
  }
  if (status >= 500) {
    return mapByPhrase(apiMessage, "Erro interno no servidor. Tente novamente em instantes.");
  }

  return mapByPhrase(apiMessage, fallback);
}
