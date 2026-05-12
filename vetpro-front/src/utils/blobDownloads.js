import api from "../services/api";

const revokeLater = (url) => {
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
};

export const resolveApiPath = (urlOrPath = "") => {
  const raw = String(urlOrPath || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw, window.location.origin);
    parsed.searchParams.delete("token");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return raw;
  }
};

export const fetchBlobUrlFromApi = async (path) => {
  const safePath = resolveApiPath(path);
  if (!safePath) throw new Error("Caminho de arquivo invalido.");
  const response = await api.get(safePath, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(response.data);
  return blobUrl;
};

export const openApiBlobInNewTab = async (path, filename = "arquivo.pdf") => {
  // Abre imediatamente para evitar bloqueio de popup em chamadas async.
  const pendingTab = window.open("", "_blank", "noopener,noreferrer");

  // Se popup foi bloqueado, faz download como fallback
  if (!pendingTab || pendingTab.closed) {
    console.warn("Popup bloqueado pelo navegador, fazendo download como fallback...");
    // Fazer download
    return await downloadApiBlob(path, filename);
  }

  try {
    const blobUrl = await fetchBlobUrlFromApi(path);
    pendingTab.location.href = blobUrl;
    revokeLater(blobUrl);
  } catch (error) {
    pendingTab.close();
    throw error;
  }
};

export const downloadApiBlob = async (path, fileName = "arquivo") => {
  const blobUrl = await fetchBlobUrlFromApi(path);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  revokeLater(blobUrl);
};
