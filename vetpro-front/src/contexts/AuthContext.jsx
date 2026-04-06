import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";
import { toUserFriendlyError } from "../utils/errorMessages";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = () => setError(null);

  const resolveUserWithPreviews = useCallback(
    (baseUser = {}, localProfile = null) => {
      const merged =
        localProfile && localProfile.id === baseUser?.id
          ? { ...baseUser, ...localProfile }
          : baseUser;

      return {
        ...merged,
        profilePhotoPreview:
          merged.profilePhoto || merged.profilePhotoPreview || null,
        signaturePreview: merged.signature || merged.signaturePreview || null,
        clinicLogoPreview:
          merged.clinic?.logoUrl || merged.clinicLogoPreview || null,
      };
    },
    [],
  );

  const establishSession = useCallback(
    async (token, refreshToken = null) => {
      if (!token) {
        throw new Error("Token de sessao invalido.");
      }

      localStorage.setItem("token", token);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      const me = await api.get("/auth/me");
      const localProfileRaw = localStorage.getItem("vetpro_profile");
      const localProfile = localProfileRaw ? JSON.parse(localProfileRaw) : null;
      const withPreviews = resolveUserWithPreviews(me.data, localProfile);
      localStorage.setItem(
        "vetpro_profile",
        JSON.stringify({ id: withPreviews.id }),
      );
      setUser(withPreviews);
      return withPreviews;
    },
    [resolveUserWithPreviews],
  );

  const logout = useCallback(async (message = null) => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      const token = localStorage.getItem("token");
      if (token) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch {
      // ignora falha de rede/logout remoto
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("vetpro_profile");
    setUser(null);
    if (typeof message === "string" && message.trim()) {
      setError(message);
    }
  }, []);

  useEffect(() => {
    const onAuthExpired = (event) => {
      const message =
        event?.detail?.message || "Sua sessão expirou. Faça login novamente.";
      logout(message);
      setLoading(false);
    };

    window.addEventListener("vetpro:auth-expired", onAuthExpired);
    return () =>
      window.removeEventListener("vetpro:auth-expired", onAuthExpired);
  }, [logout]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const path = window.location.pathname || "";
        const params = new URLSearchParams(window.location.search || "");
        const isOauthPath =
          path === "/oauth/callback" || path === "/oauth/complete-register";
        const oauthCode = params.get("code");

        if (isOauthPath && oauthCode) {
          const exchange = await api.post("/oauth/exchange-code", {
            code: oauthCode,
          });
          const payload = exchange?.data || {};

          if (payload.type === "auth") {
            await establishSession(
              payload.accessToken,
              payload.refreshToken || null,
            );
            window.history.replaceState({}, "", "/");
            setLoading(false);
            return;
          }

          if (payload.type === "complete-register" && payload.token) {
            const complete = await api.post("/oauth/complete-register", {
              token: payload.token,
              clinicName: "Clinica VetPro",
            });
            await establishSession(
              complete?.data?.accessToken || complete?.data?.token,
              complete?.data?.refreshToken || null,
            );
            window.history.replaceState({}, "", "/");
            setLoading(false);
            return;
          }

          throw new Error("Payload OAuth invalido.");
        }

        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await api.get("/auth/me");
        const localProfileRaw = localStorage.getItem("vetpro_profile");
        const localProfile = localProfileRaw
          ? JSON.parse(localProfileRaw)
          : null;
        const withPreviews = resolveUserWithPreviews(
          response.data,
          localProfile,
        );
        setUser(withPreviews);
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setUser(null);
        const path = window.location.pathname || "";
        if (path === "/oauth/callback" || path === "/oauth/complete-register") {
          setError(
            toUserFriendlyError(err, "Falha ao concluir login com Google."),
          );
          window.history.replaceState({}, "", "/?error=oauth_failed");
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [establishSession, resolveUserWithPreviews]);

  const login = async (email, password, captchaToken = "") => {
    try {
      setAuthLoading(true);
      clearError();

      const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();
      const response = await api.post("/auth/login", {
        email: normalizedEmail,
        password,
        captchaToken,
      });

      if (response?.data?.requires2FA && response?.data?.tempToken) {
        return {
          requires2FA: true,
          tempToken: response.data.tempToken,
          user: response?.data?.user || null,
        };
      }

      const token = response.data?.token || response.data?.data?.token;
      const refreshToken =
        response.data?.refreshToken ||
        response.data?.data?.refreshToken ||
        null;
      const withPreviews = await establishSession(token, refreshToken);
      return withPreviews;
    } catch (err) {
      setError(toUserFriendlyError(err, "Não foi possível fazer login."));
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (name, email, password, captchaToken = "") => {
    try {
      setAuthLoading(true);
      clearError();

      const normalizedName = String(name || "").trim();
      const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();

      const response = await api.post("/auth/register", {
        name: normalizedName,
        email: normalizedEmail,
        password,
        clinicName: `Clinica de ${normalizedName}`,
        captchaToken,
      });

      const token = response.data?.token || response.data?.data?.token;
      const refreshToken =
        response.data?.refreshToken ||
        response.data?.data?.refreshToken ||
        null;
      const withPreviews = await establishSession(token, refreshToken);
      return withPreviews;
    } catch (err) {
      setError(toUserFriendlyError(err, "Não foi possível criar sua conta."));
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const recoverPassword = async (email, captchaToken = "") => {
    try {
      setAuthLoading(true);
      clearError();
      const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();
      await api.post("/auth/recover", {
        email: normalizedEmail,
        captchaToken,
      });
      return true;
    } catch (err) {
      setError(
        toUserFriendlyError(err, "Não foi possível solicitar a recuperação."),
      );
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyTwoFactorLogin = async (tempToken, code) => {
    try {
      setAuthLoading(true);
      clearError();
      const response = await api.post("/auth/2fa/verify-login", {
        tempToken,
        token: code,
      });
      const token = response.data?.token || response.data?.data?.token;
      const refreshToken =
        response.data?.refreshToken ||
        response.data?.data?.refreshToken ||
        null;
      return await establishSession(token, refreshToken);
    } catch (err) {
      setError(toUserFriendlyError(err, "Codigo 2FA invalido."));
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authLoading,
        error,
        clearError,
        login,
        logout,
        register,
        recoverPassword,
        verifyTwoFactorLogin,
        updateProfile: (data) => {
          const clean = {
            ...(user || {}),
            ...(data || {}),
          };
          clean.profilePhotoPreview =
            data?.profilePhotoPreview ||
            data?.profilePhoto ||
            clean.profilePhotoPreview ||
            clean.profilePhoto ||
            null;
          clean.signaturePreview =
            data?.signaturePreview ||
            data?.signature ||
            clean.signaturePreview ||
            clean.signature ||
            null;
          clean.clinicLogoPreview =
            data?.clinicLogoPreview ||
            data?.clinic?.logoUrl ||
            clean.clinicLogoPreview ||
            clean.clinic?.logoUrl ||
            null;
          setUser(clean);
          try {
            const payloadToStore = {
              ...(data || {}),
              id: clean.id,
              profilePhotoPreview: clean.profilePhotoPreview || null,
              signaturePreview: clean.signaturePreview || null,
              clinicLogoPreview: clean.clinicLogoPreview || null,
            };
            localStorage.setItem(
              "vetpro_profile",
              JSON.stringify(payloadToStore),
            );
          } catch {
            // ignore storage errors
          }
          return clean;
        },
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
