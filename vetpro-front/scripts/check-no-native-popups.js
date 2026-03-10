const fs = require("fs");
const path = require("path");

const FRONT_SRC_DIR = path.resolve(__dirname, "../src");
const ALLOWED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const NATIVE_POPUP_REGEX = /\b(?:window\.)?(alert|confirm|prompt)\s*\(/;

function listFilesRecursive(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
      continue;
    }
    if (ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function findNativePopupUsages(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const matches = [];

  lines.forEach((line, index) => {
    if (NATIVE_POPUP_REGEX.test(line)) {
      matches.push({
        line: index + 1,
        code: line.trim(),
      });
    }
  });

  return matches;
}

const files = listFilesRecursive(FRONT_SRC_DIR);
const violations = [];

for (const filePath of files) {
  const matches = findNativePopupUsages(filePath);
  matches.forEach((match) => {
    violations.push({
      filePath,
      ...match,
    });
  });
}

if (violations.length > 0) {
  console.error("");
  console.error("Uso de popup nativo detectado (alert/confirm/prompt).");
  console.error("Use os componentes in-app (Toast/ConfirmDialog) no lugar.");
  console.error("");
  violations.forEach((item) => {
    const relativePath = path.relative(process.cwd(), item.filePath);
    console.error(`- ${relativePath}:${item.line} -> ${item.code}`);
  });
  console.error("");
  process.exit(1);
}

console.log("Check de popup nativo: OK (nenhum alert/confirm/prompt encontrado).");
