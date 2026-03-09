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

export const openApiBlobInNewTab = async (path) => {
  const blobUrl = await fetchBlobUrlFromApi(path);
  const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("Nao foi possivel abrir nova aba.");
  }
  revokeLater(blobUrl);
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

