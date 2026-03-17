import React from "react";

const TONE_CLASS = {
  neutral:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-dark-700 dark:text-gray-300 dark:border-dark-600",
  success:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  info: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
  warning:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  danger:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
};

const VpBadge = ({ tone = "neutral", children, className = "" }) => {
  const toneClass = TONE_CLASS[tone] || TONE_CLASS.neutral;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
};

export default VpBadge;
