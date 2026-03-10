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
  const envBase =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_BASE_URL;
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

let isRefreshingToken = false;
let authExpiredDispatched = false;
let queuedRequests = [];

const flushQueuedRequests = (error, nextToken = null) => {
  queuedRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(nextToken);
  });
  queuedRequests = [];
};

const markSessionExpired = (error) => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");

  if (authExpiredDispatched) return;
  authExpiredDispatched = true;

  if (typeof window !== "undefined") {
    const code = error?.response?.data?.code;
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
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const normalizedToken = String(token || "").trim();

  if (
    normalizedToken &&
    normalizedToken !== "undefined" &&
    normalizedToken !== "null"
  ) {
    config.headers.Authorization = `Bearer ${normalizedToken}`;
    authExpiredDispatched = false;
  } else if (token) {
    localStorage.removeItem("token");
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};

    if (status !== 401) {
      return Promise.reject(error);
    }

    // Evita loop em endpoints de auth.
    const isAuthEndpoint = String(originalRequest?.url || "").includes("/auth/");
    if (isAuthEndpoint) {
      markSessionExpired(error);
      return Promise.reject(error);
    }

    // Tentativa de refresh de token, quando disponível.
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      markSessionExpired(error);
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      markSessionExpired(error);
      return Promise.reject(error);
    }

    if (isRefreshingToken) {
      return new Promise((resolve, reject) => {
        queuedRequests.push({ resolve, reject });
      })
        .then((nextToken) => {
          originalRequest.headers.Authorization = `Bearer ${nextToken}`;
          return api(originalRequest);
        })
        .catch((queuedError) => Promise.reject(queuedError));
    }

    originalRequest._retry = true;
    isRefreshingToken = true;

    try {
      const refreshResponse = await axios.post(
        `${resolveApiOrigin()}/api/auth/refresh`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );

      const nextToken =
        refreshResponse?.data?.token ||
        refreshResponse?.data?.data?.token ||
        refreshResponse?.data?.accessToken ||
        "";

      if (!nextToken) {
        throw new Error("Refresh token sem access token.");
      }

      localStorage.setItem("token", nextToken);
      flushQueuedRequests(null, nextToken);

      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      flushQueuedRequests(refreshError, null);
      markSessionExpired(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshingToken = false;
    }
  },
);

export default api;
