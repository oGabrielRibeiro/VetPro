import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { feedbackTransition } from "../motion/presets";

const toneClasses = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200",
};

const FeedbackBanner = ({
  message,
  type = "error",
  onClose,
  actionLabel,
  onAction,
  actionClassName = "",
  className = "",
}) => {
  const prefersReducedMotion = useReducedMotion();
  if (!message) return null;
  const motionProps = feedbackTransition(type, Boolean(prefersReducedMotion));

  return (
    <motion.div
      role={type === "error" || type === "warning" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      initial={motionProps.initial}
      animate={motionProps.animate}
      exit={motionProps.exit}
      transition={motionProps.transition}
      className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between gap-2 ${
        toneClasses[type] || toneClasses.error
      } ${className}`}
    >
      <span>{message}</span>
      <div className="flex items-center gap-2">
        {typeof onAction === "function" && actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className={`rounded-md border border-current/30 bg-white dark:bg-dark-700 px-2 py-1 text-xs font-semibold ${actionClassName}`}
          >
            {actionLabel}
          </button>
        )}
        {typeof onClose === "function" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar aviso"
            className="rounded-md border border-current/30 bg-white dark:bg-dark-700 px-2 py-1 text-xs font-semibold"
          >
            Fechar
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default FeedbackBanner;
