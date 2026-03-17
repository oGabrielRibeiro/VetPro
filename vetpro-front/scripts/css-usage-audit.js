import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "src");
const cssPath = path.join(root, "index.css");

const readFile = (filePath) => fs.readFileSync(filePath, "utf8");

const collectSource = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSource(fullPath);
    if (!/\.jsx?$|\.tsx?$/.test(entry.name)) return [];
    return [readFile(fullPath)];
  });
};

const sourceText = collectSource(root).join("\n");
const cssText = readFile(cssPath);

const classMatches = [...cssText.matchAll(/\.(?<name>[a-zA-Z0-9_-]+)\s*[{:,]/g)];
const classNames = Array.from(
  new Set(classMatches.map((match) => match.groups?.name).filter(Boolean)),
);

const ignored = new Set(["dark", "hover", "focus", "active"]);
const candidates = classNames.filter((name) => {
  if (ignored.has(name)) return false;
  if (name.startsWith("dark")) return false;
  return true;
});

const unused = candidates.filter((name) => !sourceText.includes(name));

if (!unused.length) {
  console.log("Nenhuma classe customizada encontrada como nao usada.");
  process.exit(0);
}

console.log("Classes customizadas possivelmente nao usadas:");
unused.forEach((name) => console.log(`- ${name}`));
process.exit(1);
