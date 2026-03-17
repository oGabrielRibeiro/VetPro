import React, { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import AppIcon from "../components/AppIcon";

const Login = () => {
  const { login, register, authLoading, error, clearError } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loginLogoError, setLoginLogoError] = useState(false);

  const submitLabel = useMemo(() => {
    if (authLoading) return "Processando...";
    return isRegisterMode ? "Criar conta" : "Entrar";
  }, [authLoading, isRegisterMode]);
  const activeError = formError || error || "";
  const isConnectionError = useMemo(() => {
    const source = String(activeError || "").toLowerCase();
    return (
      source.includes("sem conexao") ||
      source.includes("servidor") ||
      source.includes("cors") ||
      source.includes("network") ||
      source.includes("err_failed")
    );
  }, [activeError]);

  const validate = () => {
    const normalizedEmail = String(email || "").trim();

    if (isRegisterMode && String(name || "").trim().length < 2) {
      return "Informe um nome com pelo menos 2 caracteres.";
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return "Informe um e-mail valido.";
    }

    if (String(password || "").length < 6) {
      return "A senha deve ter no minimo 6 caracteres.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setFormError("");

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      if (isRegisterMode) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch {
      // erro tratado no contexto
    }
  };

  const toggleMode = (registerMode) => {
    clearError();
    setFormError("");
    setIsRegisterMode(registerMode);
  };

  return (
    <div className="app-shell-bg min-h-screen flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-[520px] subtle-enter">
        <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-blue-700 px-5 py-6 text-center">
            <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 overflow-hidden">
              {!loginLogoError ? (
                <img
                  src="/icon.svg"
                  alt="Logo VetPro"
                  className="h-9 w-9 object-contain"
                  onError={() => setLoginLogoError(true)}
                />
              ) : (
                <span className="text-white">
                  <AppIcon name="patients" />
                </span>
              )}
            </div>
            <h2 className="vp-h2 text-white">VetPro</h2>
            <p className="vp-helper mt-1 text-teal-100">
              Plataforma comercial para operacao veterinaria completa
            </p>
          </div>

          <div className="p-5 sm:p-6">

            <div className="mb-5 vp-segment">
              <button
                type="button"
                onClick={() => toggleMode(false)}
                className={`vp-segment-btn transition ${
                  !isRegisterMode ? "is-active" : ""
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => toggleMode(true)}
                className={`vp-segment-btn transition ${
                  isRegisterMode ? "is-active" : ""
                }`}
              >
                Criar conta
              </button>
            </div>

            {activeError && (
              <div className="mb-3 vp-alert-error">
                {activeError}
              </div>
            )}
            {isConnectionError && (
              <div className="mb-4 vp-alert-info">
                <p className="font-semibold">Conexao com backend indisponivel.</p>
                <ol className="vp-tip-list list-decimal">
                  <li>Verifique se backend esta ativo na porta `5000`.</li>
                  <li>Confirme se frontend esta em `http://127.0.0.1:3000`.</li>
                  <li>Valide CORS e variaveis `VITE_API_BASE_URL`/`.env`.</li>
                </ol>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegisterMode && (
                <div>
                  <label htmlFor="loginName" className="vp-label">
                    Nome completo
                  </label>
                  <input
                    id="loginName"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formError) setFormError("");
                    }}
                    required
                    className="vp-input"
                    placeholder="Dr(a). Joao Silva"
                  />
                </div>
              )}

              <div>
                <label htmlFor="loginEmail" className="vp-label">
                  E-mail
                </label>
                <input
                  id="loginEmail"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError("");
                  }}
                  required
                  className="vp-input"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="loginPassword" className="vp-label">
                  Senha
                </label>
                <input
                  id="loginPassword"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError) setFormError("");
                  }}
                  required
                  minLength={6}
                  className="vp-input"
                  placeholder="••••••••"
                />
                {!isRegisterMode && (
                  <p className="vp-helper mt-1 text-gray-500 dark:text-gray-400">
                    Dica: use sua conta comercial da clinica para acessar dados compartilhados.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className={`btn btn-success btn-lg btn-block ${
                  authLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {submitLabel}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-gray-600 dark:text-gray-300">
              {isRegisterMode ? (
                <>
                  Ja possui conta?{" "}
                  <button
                    type="button"
                    onClick={() => toggleMode(false)}
                    className="font-semibold text-emerald-700 dark:text-emerald-300"
                  >
                    Entrar
                  </button>
                </>
              ) : (
                <>
                  Novo na plataforma?{" "}
                  <button
                    type="button"
                    onClick={() => toggleMode(true)}
                    className="font-semibold text-emerald-700 dark:text-emerald-300"
                  >
                    Criar conta
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
