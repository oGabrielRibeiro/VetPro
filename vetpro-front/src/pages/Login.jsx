import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import AppIcon from "../components/AppIcon";

const Login = () => {
  const { login, register, recoverPassword, authLoading, error, clearError } =
    useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");
  const [loginLogoError, setLoginLogoError] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const captchaContainerRef = useRef(null);
  const captchaWidgetIdRef = useRef(null);
  const captchaSiteKey = import.meta.env.VITE_CAPTCHA_SITE_KEY;
  const captchaEnabled = Boolean(captchaSiteKey);

  const submitLabel = useMemo(() => {
    if (authLoading) return "Processando...";
    if (isRecoveryMode) return "Enviar recuperação";
    return isRegisterMode ? "Criar conta" : "Entrar";
  }, [authLoading, isRegisterMode, isRecoveryMode]);
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

    if (!isRecoveryMode && String(password || "").length < 6) {
      return "A senha deve ter no minimo 6 caracteres.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setFormError("");
    setCaptchaError("");
    setRecoverySuccess("");

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (captchaEnabled && !captchaToken) {
      setCaptchaError("Confirme o captcha antes de continuar.");
      return;
    }

    try {
      if (isRecoveryMode) {
        await recoverPassword(email, captchaToken);
        setRecoverySuccess(
          "Se o e-mail existir, enviaremos instrucoes para redefinir a senha.",
        );
      } else if (isRegisterMode) {
        await register(name, email, password, captchaToken);
      } else {
        await login(email, password, captchaToken);
      }
    } catch {
      // erro tratado no contexto
    }
  };

  const toggleMode = (registerMode) => {
    clearError();
    setFormError("");
    setCaptchaError("");
    setRecoverySuccess("");
    setCaptchaToken("");
    setIsRecoveryMode(false);
    setIsRegisterMode(registerMode);
  };

  const toggleRecovery = () => {
    clearError();
    setFormError("");
    setCaptchaError("");
    setRecoverySuccess("");
    setCaptchaToken("");
    setIsRegisterMode(false);
    setIsRecoveryMode((prev) => !prev);
  };

  useEffect(() => {
    if (!captchaEnabled) return;
    if (!captchaContainerRef.current) return;

    const renderCaptcha = () => {
      if (!window.hcaptcha || captchaWidgetIdRef.current !== null) return;
      captchaWidgetIdRef.current = window.hcaptcha.render(
        captchaContainerRef.current,
        {
          sitekey: captchaSiteKey,
          callback: (token) => setCaptchaToken(token),
          "expired-callback": () => setCaptchaToken(""),
        },
      );
    };

    if (window.hcaptcha) {
      renderCaptcha();
      return;
    }

    const scriptId = "hcaptcha-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderCaptcha;
      document.body.appendChild(script);
    } else {
      renderCaptcha();
    }
  }, [captchaEnabled, captchaSiteKey]);

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

            {!isRecoveryMode ? (
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
            ) : (
              <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center text-sm font-semibold text-gray-700">
                Recuperar senha
              </div>
            )}

            {activeError && (
              <div className="mb-3 vp-alert-error">
                {activeError}
              </div>
            )}
            {recoverySuccess && (
              <div className="mb-3 vp-alert-success">
                {recoverySuccess}
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
              {isRegisterMode && !isRecoveryMode && (
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

              {!isRecoveryMode && (
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
                <button
                  type="button"
                  onClick={toggleRecovery}
                  className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  Esqueci minha senha
                </button>
              </div>
              )}

              {captchaEnabled && (
                <div className="space-y-2">
                  <div
                    ref={captchaContainerRef}
                    className="flex justify-center"
                  />
                  {captchaError && (
                    <p className="text-xs text-red-500">{captchaError}</p>
                  )}
                </div>
              )}

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
              {isRecoveryMode ? (
                <button
                  type="button"
                  onClick={() => toggleMode(false)}
                  className="font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  Voltar ao login
                </button>
              ) : isRegisterMode ? (
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
