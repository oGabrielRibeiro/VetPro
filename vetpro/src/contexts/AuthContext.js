import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { toUserFriendlyError } from "../utils/errorMessages";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = () => setError(null);

  const logout = (message = null) => {
    localStorage.removeItem("token");
    localStorage.removeItem("vetpro_profile");
    setUser(null);
    if (typeof message === "string" && message.trim()) {
      setError(message);
    }
  };

  useEffect(() => {
    const onAuthExpired = (event) => {
      const message =
        event?.detail?.message || "Sua sessão expirou. Faça login novamente.";
      logout(message);
      setLoading(false);
    };

    window.addEventListener("vetpro:auth-expired", onAuthExpired);
    return () => window.removeEventListener("vetpro:auth-expired", onAuthExpired);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const localProfileRaw = localStorage.getItem("vetpro_profile");
        const localProfile = localProfileRaw ? JSON.parse(localProfileRaw) : null;
        const merged =
          localProfile && localProfile.id === response.data?.id
            ? { ...response.data, ...localProfile }
            : response.data;
        const withPreviews = {
          ...merged,
          profilePhotoPreview: merged.profilePhoto || merged.profilePhotoPreview || null,
          signaturePreview: merged.signature || merged.signaturePreview || null,
          clinicLogoPreview:
            merged.clinic?.logoUrl || merged.clinicLogoPreview || null,
        };
        setUser(withPreviews);
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email, password) => {
    try {
      setAuthLoading(true);
      clearError();

      const normalizedEmail = String(email || "").trim().toLowerCase();
      const response = await api.post("/auth/login", {
        email: normalizedEmail,
        password,
      });

      const token = response.data?.token || response.data?.data?.token;
      if (!token) {
        throw new Error("Resposta de login invalida");
      }

      localStorage.setItem("token", token);

      const me = await api.get("/auth/me");
      const merged = me.data;
      // reset any cached profile to avoid contaminar outro usuario
      localStorage.setItem("vetpro_profile", JSON.stringify({ id: merged.id }));
      const withPreviews = {
        ...merged,
        profilePhotoPreview: merged.profilePhoto || null,
        signaturePreview: merged.signature || null,
        clinicLogoPreview: merged.clinic?.logoUrl || null,
      };
      setUser(withPreviews);
      return withPreviews;
    } catch (err) {
      setError(toUserFriendlyError(err, "Não foi possível fazer login."));
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (name, email, password) => {
    try {
      setAuthLoading(true);
      clearError();

      const normalizedName = String(name || "").trim();
      const normalizedEmail = String(email || "").trim().toLowerCase();

      const response = await api.post("/auth/register", {
        name: normalizedName,
        email: normalizedEmail,
        password,
        clinicName: `Clinica de ${normalizedName}`,
      });

      const token = response.data?.token || response.data?.data?.token;
      if (!token) {
        throw new Error("Resposta de cadastro invalida");
      }

      localStorage.setItem("token", token);

      const me = await api.get("/auth/me");
      const merged = me.data;
      localStorage.setItem("vetpro_profile", JSON.stringify({ id: merged.id }));
      const withPreviews = {
        ...merged,
        profilePhotoPreview: merged.profilePhoto || null,
        signaturePreview: merged.signature || null,
        clinicLogoPreview: merged.clinic?.logoUrl || null,
      };
      setUser(withPreviews);
      return withPreviews;
    } catch (err) {
      setError(toUserFriendlyError(err, "Não foi possível criar sua conta."));
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
