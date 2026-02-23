const major = Number((process.versions.node || "0").split(".")[0]);

if (!Number.isFinite(major) || major < 20 || major >= 21) {
  console.error(
    [
      "",
      "Versao do Node.js nao suportada para o VetPro Front.",
      `Node atual: ${process.versions.node}`,
      "Use Node 20.x (LTS).",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
