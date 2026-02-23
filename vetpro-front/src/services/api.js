import axios from "axios";
import { toUserFriendlyError } from "../utils/errorMessages";

function isLoopbackHost(hostname = "") {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function normalizeEnvBaseUrl(envBase) {
  const raw = String(envBase || "").trim();
  if (!raw) return "";
  if (typeof window === "undefined") return raw;

  try {
    const parsed = new URL(raw, window.location.origin);
    const clientHost = window.location.hostname || "localhost";

    // Se o build veio com localhost, em dispositivo remoto trocamos para o host atual.
    if (isLoopbackHost(parsed.hostname) && !isLoopbackHost(clientHost)) {
      parsed.hostname = clientHost;
      if (!parsed.port) parsed.port = "5000";
    }

    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = "/api";
    }

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

function resolveApiBaseUrl() {
  const envBase = process.env.REACT_APP_API_BASE_URL;
  if (envBase && String(envBase).trim()) {
    return normalizeEnvBaseUrl(envBase);
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol || "http:";
    const host = window.location.hostname || "localhost";
    return `${protocol}//${host}:5000/api`;
  }

  return "http://localhost:5000/api";
}

function resolveApiOrigin() {
  const base = resolveApiBaseUrl();
  return base.replace(/\/api\/?$/, "");
}

export function buildApiUrl(path, query = {}) {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const normalizedPath = cleanPath.startsWith("api/")
    ? `/${cleanPath}`
    : `/api/${cleanPath}`;
  const url = new URL(`${resolveApiOrigin()}${normalizedPath}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    if (status === 401) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("vetpro:auth-expired", {
            detail: {
              code: code || "TOKEN_INVALID",
              message: toUserFriendlyError(
                error,
                "Sua sessao expirou. Faca login novamente.",
              ),
            },
          }),
        );
      }
    }

    return Promise.reject(error);
  },
);

export default api;
