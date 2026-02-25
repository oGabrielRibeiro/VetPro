import { useState, useCallback } from "react";

// Hook personalizado para gerenciar notificações toast
const useToast = () => {
  const [toasts, setToasts] = useState([]);

  // Adicionar um novo toast
  const addToast = useCallback((message, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  // Métodos de conveniência
  const success = useCallback(
    (message, duration) => addToast(message, "success", duration),
    [addToast],
  );

  const error = useCallback(
    (message, duration) => addToast(message, "error", duration),
    [addToast],
  );

  const warning = useCallback(
    (message, duration) => addToast(message, "warning", duration),
    [addToast],
  );

  const info = useCallback(
    (message, duration) => addToast(message, "info", duration),
    [addToast],
  );

  // Remover um toast específico
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Limpar todos os toasts
  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
  };
};

export default useToast;
