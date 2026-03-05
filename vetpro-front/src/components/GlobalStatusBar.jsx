import React from "react";

const STATUS_STYLES = {
  offline: "border-amber-300 bg-amber-50 text-amber-900",
  syncing: "border-cyan-300 bg-cyan-50 text-cyan-900",
  queued: "border-indigo-300 bg-indigo-50 text-indigo-900",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  error: "border-red-300 bg-red-50 text-red-900",
  idle: "border-gray-200 bg-gray-50 text-gray-700",
};

const STATUS_LABELS = {
  offline: "Offline",
  syncing: "Sincronizando",
  queued: "Na fila",
  success: "Atualizado",
  error: "Atencao",
  idle: "Pronto",
};

const GlobalStatusBar = ({ status = "idle", message = "" }) => {
  const normalized = STATUS_STYLES[status] ? status : "idle";
  const style = STATUS_STYLES[normalized];
  const label = STATUS_LABELS[normalized];
  const safeMessage = String(message || "").trim();
  if (!safeMessage && normalized === "idle") return null;

  return (
    <div
      className={`mb-3 rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium ${style}`}
      role="status"
      aria-live="polite"
    >
      <span className="font-bold">{label}:</span>{" "}
      {safeMessage || "Sistema operacional normal."}
    </div>
  );
};

export default GlobalStatusBar;

