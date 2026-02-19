const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const app = require("./app");

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";
const HTTPS_ENABLED = String(process.env.HTTPS || "false").toLowerCase() === "true";

function loadHttpsOptions() {
  const keyPath = process.env.HTTPS_KEY_PATH;
  const certPath = process.env.HTTPS_CERT_PATH;

  if (!keyPath || !certPath) {
    return null;
  }

  const resolvedKeyPath = path.resolve(keyPath);
  const resolvedCertPath = path.resolve(certPath);

  if (!fs.existsSync(resolvedKeyPath) || !fs.existsSync(resolvedCertPath)) {
    return null;
  }

  return {
    key: fs.readFileSync(resolvedKeyPath),
    cert: fs.readFileSync(resolvedCertPath),
  };
}

const httpsOptions = HTTPS_ENABLED ? loadHttpsOptions() : null;

if (HTTPS_ENABLED && httpsOptions) {
  https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
    console.log(`Servidor HTTPS rodando em https://${HOST}:${PORT}`);
  });
} else {
  if (HTTPS_ENABLED && !httpsOptions) {
    console.warn(
      "HTTPS ativado no .env, mas certificados nao encontrados. Subindo em HTTP.",
    );
  }

  http.createServer(app).listen(PORT, HOST, () => {
    console.log(`Servidor HTTP rodando em http://${HOST}:${PORT}`);
  });
}
