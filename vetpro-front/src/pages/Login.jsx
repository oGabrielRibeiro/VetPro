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

  const submitLabel = useMemo(() => {
    if (authLoading) return "Processando...";
    return isRegisterMode ? "Criar Conta" : "Entrar";
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-emerald-600 to-cyan-700 p-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
              <AppIcon name="patients" />
            </span>
            <h1 className="text-2xl font-bold text-white">VetPro</h1>
          </div>
          <p className="text-emerald-100 text-sm">
            Sistema Profissional de Prontuarios Veterinarios
          </p>
        </div>

        <div className="p-6">
          <div className="flex mb-6 bg-gray-100 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleMode(false)}
              className={`flex-1 py-2 text-sm font-medium ${
                !isRegisterMode ? "bg-white shadow text-emerald-600" : "text-gray-600"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => toggleMode(true)}
              className={`flex-1 py-2 text-sm font-medium ${
                isRegisterMode ? "bg-white shadow text-emerald-600" : "text-gray-600"
              }`}
            >
              Criar Conta
            </button>
          </div>

          {(formError || error) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {formError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegisterMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formError) setFormError("");
                  }}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Dr(a). Joao Silva"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError("");
                }}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError("");
                }}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className={`w-full bg-gradient-to-r from-emerald-600 to-cyan-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                authLoading ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {submitLabel}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {isRegisterMode ? (
              <>
                Ja possui conta?{" "}
                <button
                  type="button"
                  onClick={() => toggleMode(false)}
                  className="text-emerald-600 font-medium"
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
                  className="text-emerald-600 font-medium"
                >
                  Criar conta
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
