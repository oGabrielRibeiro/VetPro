const fs = require('fs');
const path = require('path');

// Caminho para o dataset de exemplos mobile
const EXAMPLES_PATH = path.join(__dirname, '../ai/recordChatMobileExamples.json');

let cachedData = null;

function loadExamples() {
  if (cachedData) return cachedData;
  try {
    if (fs.existsSync(EXAMPLES_PATH)) {
      const raw = fs.readFileSync(EXAMPLES_PATH, 'utf8');
      cachedData = JSON.parse(raw);
    } else {
      console.warn(`[PromptBuilder] Dataset não encontrado em: ${EXAMPLES_PATH}`);
      cachedData = { examples: [] };
    }
  } catch (error) {
    console.error("[PromptBuilder] Erro ao carregar dataset:", error);
    cachedData = { examples: [] };
  }
  return cachedData;
}

/**
 * Constrói o System Prompt enriquecido com exemplos (Few-Shot).
 * @param {string} mode - 'nova' ou 'retorno'
 * @param {string} porte - 'pequeno' ou 'grande'
 */
function buildSystemPrompt(mode, porte) {
  const data = loadExamples();
  
  const relevantExamples = data.examples.filter(ex => {
    const matchMode = !mode || !ex.mode || ex.mode === mode;
    const matchPorte = !porte || !ex.porte || ex.porte === porte;
    return matchMode && matchPorte;
  });

  const selectedExamples = relevantExamples.slice(0, 3);

  let systemPrompt = `Você é um assistente veterinário especialista em preenchimento de prontuários.\nSua tarefa é analisar a transcrição (texto ou áudio transcrito) e extrair os dados para um formato JSON estruturado.\nResponda APENAS com o JSON válido, sem blocos de código markdown, sem explicações adicionais.`;

  if (selectedExamples.length > 0) {
    systemPrompt += `\n\n### Exemplos de Referência (Few-Shot) ###\n`;
    selectedExamples.forEach((ex, index) => {
      systemPrompt += `\n--- Exemplo ${index + 1} ---\nEntrada: "${ex.input}"\nSaída Esperada: ${JSON.stringify(ex.output)}`;
    });
    systemPrompt += `\n\n### Fim dos Exemplos ###`;
  }

  systemPrompt += `\n\nAgora, analise a entrada do usuário abaixo e gere o JSON correspondente.`;

  return systemPrompt;
}

module.exports = { buildSystemPrompt };