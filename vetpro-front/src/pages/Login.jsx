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
      <div className="w-full max-w-[980px] grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-4 subtle-enter">
        <section className="hidden lg:flex shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 p-8 flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              VetPro Platform
            </p>
            <h1 className="shell-title mt-2 text-4xl font-black text-gray-900 dark:text-white leading-tight">
              Prontuario veterinario com padrao SaaS
            </h1>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 max-w-lg">
              Operacao clinica, atendimento em campo e inteligencia de dados em uma
              experiencia unica para desktop e mobile.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Modo campo", icon: "consultations" },
              { label: "Agenda", icon: "appointments" },
              { label: "Relatorios", icon: "reports" },
            ].map((item) => (
              <div
                key={item.label}
                className="interactive-card rounded-2xl border border-gray-200 dark:border-dark-700 bg-white/80 dark:bg-dark-800/70 p-3 text-center"
              >
                <span className="mx-auto mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  <AppIcon name={item.icon} />
                </span>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-blue-700 px-5 py-6 text-center">
            <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 overflow-hidden">
              {!loginLogoError ? (
                <img
                  src="/logo192.png"
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
            <h2 className="shell-title text-2xl font-extrabold text-white">VetPro</h2>
            <p className="mt-1 text-xs text-teal-100">
              Plataforma profissional de prontuarios veterinarios
            </p>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-5 grid grid-cols-2 rounded-xl border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 p-1">
              <button
                type="button"
                onClick={() => toggleMode(false)}
                className={`h-10 rounded-lg text-sm font-semibold transition ${
                  !isRegisterMode
                    ? "bg-white dark:bg-dark-800 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => toggleMode(true)}
                className={`h-10 rounded-lg text-sm font-semibold transition ${
                  isRegisterMode
                    ? "bg-white dark:bg-dark-800 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Criar conta
              </button>
            </div>

            {(formError || error) && (
              <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                {formError || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegisterMode && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formError) setFormError("");
                    }}
                    required
                    className="h-11 sm:h-10 w-full rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 px-3 text-sm"
                    placeholder="Dr(a). Joao Silva"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError("");
                  }}
                  required
                  className="h-11 sm:h-10 w-full rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 px-3 text-sm"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError) setFormError("");
                  }}
                  required
                  minLength={6}
                  className="h-11 sm:h-10 w-full rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 px-3 text-sm"
                  placeholder="••••••••"
                />
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
