/* eslint-disable no-console */
/**
 * Script para substituir console.* pelo logger estruturado
 * Uso: node src/scripts/replace-console-with-logger.js
 */

const fs = require('fs');
const path = require('path');

const loggerImport = "const logger = require('../utils/logger');";
const servicesDir = path.join(__dirname, '..', 'services');
const controllersDir = path.join(__dirname, '..', 'controllers');
const routesDir = path.join(__dirname, '..', 'routes');
const scriptsDir = __dirname;

// Mapeamento de substituições
const replacements = [
  // Substituições de console.error
  { pattern: /console\.error\(([^)]+)\);?/g, replacement: 'logger.error($1);' },
  // Substituições de console.warn
  { pattern: /console\.warn\(([^)]+)\);?/g, replacement: 'logger.warn($1);' },
  // Substituições de console.log
  { pattern: /console\.log\(([^)]+)\);?/g, replacement: 'logger.info($1);' },
  // Substituições de console.info
  { pattern: /console\.info\(([^)]+)\);?/g, replacement: 'logger.info($1);' },
  // Substituições de console.debug
  { pattern: /console\.debug\(([^)]+)\);?/g, replacement: 'logger.debug($1);' },
];

// Função para processar um arquivo
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const hasLoggerImport =
    content.includes("const logger = require('../utils/logger')") ||
    content.includes('const logger = require("../utils/logger")') ||
    content.includes('const logger = require(__dirname');

  // Verificar se já foi modificado
  if (content.includes('// Console replaced by logger')) {
    console.log(`  ⏭️  Já modificado: ${path.basename(filePath)}`);
    return false;
  }

  // Aplicar substituições
  for (const { pattern, replacement } of replacements) {
    const newContent = content.replace(pattern, (match) => {
      modified = true;
      return match.replace(pattern, replacement);
    });
    if (newContent !== content) {
      content = newContent;
    }
  }

  // Adicionar import do logger se necessário
  if (modified && !hasLoggerImport) {
    // Encontrar onde inserir o import (após outros requires)
    const requireMatch = content.match(/const\s+\w+\s+=\s+require\(['"]/g);
    if (requireMatch) {
      const lastRequire = requireMatch[requireMatch.length - 1];
      const lastRequireIndex = content.lastIndexOf(lastRequire);
      const nextNewline = content.indexOf('\n', lastRequireIndex);

      if (nextNewline !== -1) {
        content = `${
          content.slice(0, nextNewline + 1) + loggerImport
        }\n${content.slice(nextNewline + 1)}`;
      }
    }
  }

  if (modified) {
    // Adicionar comentário indicating que foi modificado
    content = `// Console replaced by logger\n${content}`;
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Função para processar todos os arquivos em um diretório
function processDirectory(dir, extensions = ['.js']) {
  if (!fs.existsSync(dir)) {
    console.log(`Diretório não encontrado: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });
  let count = 0;

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      // Ignorar diretórios node_modules, .git, etc
      if (!file.name.startsWith('.') && file.name !== 'node_modules') {
        count += processDirectory(filePath, extensions);
      }
    } else if (
      file.isFile() &&
      extensions.some((ext) => file.name.endsWith(ext))
    ) {
      // Ignorar o próprio logger.js
      if (file.name === 'logger.js') {
        continue;
      }

      if (processFile(filePath)) {
        console.log(`  ✅ ${path.relative(servicesDir, filePath)}`);
        count += 1;
      }
    }
  }

  return count;
}

console.log('🔄 Substituindo console.* por logger...\n');

// Processar serviços
console.log('📁 Processando serviços...');
const servicesCount = processDirectory(servicesDir);
console.log(`   ${servicesCount} arquivos modificados\n`);

// Processar controllers
console.log('📁 Processando controllers...');
const controllersCount = processDirectory(controllersDir);
console.log(`   ${controllersCount} arquivos modificados\n`);

// Processar routes
console.log('📁 Processando rotas...');
const routesCount = processDirectory(routesDir);
console.log(`   ${routesCount} arquivos modificados\n`);

// Processar scripts
console.log('📁 Processando scripts...');
const scriptsCount = processDirectory(scriptsDir);
console.log(`   ${scriptsCount} arquivos modificados\n`);

const total = servicesCount + controllersCount + routesCount + scriptsCount;
console.log(`✨ Total: ${total} arquivos modificados!`);
