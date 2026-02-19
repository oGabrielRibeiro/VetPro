const toneClasses = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-amber-200 bg-amber-50 text-amber-800",
};

const FeedbackBanner = ({ message, type = "error", onClose, className = "" }) => {
  if (!message) return null;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between gap-2 ${
        toneClasses[type] || toneClasses.error
      } ${className}`}
    >
      <span>{message}</span>
      {typeof onClose === "function" && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-current/30 bg-white px-2 py-1 text-xs font-semibold"
        >
          Fechar
        </button>
      )}
    </div>
  );
};

export default FeedbackBanner;
