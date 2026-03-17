import React, { useEffect, useId, useRef } from "react";

const ConfirmDialog = ({
  isOpen = false,
  title = "Confirmar acao",
  message = "",
  note = "",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "danger",
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const titleId = useId();
  const messageId = useId();
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onCancel?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    cancelButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const confirmClass =
    confirmVariant === "danger"
      ? "btn btn-danger-soft btn-sm btn-block"
      : "btn btn-primary btn-sm btn-block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        className="vp-card w-full max-w-md p-4 shadow-xl"
      >
        <h3 id={titleId} className="text-base font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
        {message && (
          <p id={messageId} className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {message}
          </p>
        )}
        {note && (
          <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {note}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="btn btn-neutral btn-sm btn-block"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={confirmClass}
            disabled={loading}
          >
            {loading ? "Processando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
