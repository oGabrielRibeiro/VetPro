import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

function getToastTheme(type) {
  switch (type) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "error":
      return "border-red-200 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-blue-200 bg-blue-50 text-blue-800";
  }
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration, open: true }]);
    return id;
  }, []);

  const updateToastOpen = useCallback(
    (id, open) => {
      setToasts((prev) =>
        prev.map((toast) => (toast.id === id ? { ...toast, open } : toast)),
      );
      if (!open) {
        setTimeout(() => removeToast(id), 180);
      }
    },
    [removeToast],
  );

  const contextValue = useMemo(
    () => ({
      addToast,
      removeToast,
      success: (message, duration) => addToast(message, "success", duration),
      error: (message, duration) => addToast(message, "error", duration),
      warning: (message, duration) => addToast(message, "warning", duration),
      info: (message, duration) => addToast(message, "info", duration),
    }),
    [addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            open={toast.open}
            duration={toast.duration}
            onOpenChange={(open) => updateToastOpen(toast.id, open)}
            className={`
              group flex w-[min(92vw,26rem)] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg
              data-[state=open]:animate-[subtle-enter_180ms_ease-out]
              data-[state=closed]:animate-[subtle-fade_160ms_ease-in]
              data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
              data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform
              data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]
              ${getToastTheme(toast.type)}
            `}
          >
            <ToastPrimitive.Title className="flex-1 text-sm font-semibold">
              {toast.message}
            </ToastPrimitive.Title>
            <ToastPrimitive.Close
              aria-label="Fechar notificacao"
              className="rounded-md p-1 text-current/80 hover:bg-black/5"
            >
              <span aria-hidden>&times;</span>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed right-4 top-4 z-[80] flex max-h-screen w-auto flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
