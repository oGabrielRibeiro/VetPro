import React from "react";
import VpButton from "./VpButton";

const TONE_CLASS = {
  info: "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  error: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200",
};

const VpAlert = ({
  tone = "info",
  title,
  message,
  actionLabel,
  onAction,
  className = "",
}) => {
  if (!message && !title) return null;
  const toneClass = TONE_CLASS[tone] || TONE_CLASS.info;

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass} ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {title && <p className="text-sm font-bold">{title}</p>}
          {message && <p className="text-sm">{message}</p>}
        </div>
        {actionLabel && onAction && (
          <VpButton type="button" variant="neutral" size="sm" onClick={onAction}>
            {actionLabel}
          </VpButton>
        )}
      </div>
    </div>
  );
};

export default VpAlert;
