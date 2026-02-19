import axios from "axios";
import { toUserFriendlyError } from "../utils/errorMessages";

function resolveApiBaseUrl() {
  const envBase = process.env.REACT_APP_API_BASE_URL;
  if (envBase && String(envBase).trim()) {
    return String(envBase).trim();
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
