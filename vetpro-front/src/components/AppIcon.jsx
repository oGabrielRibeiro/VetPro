import React from "react";

const emojiByName = {
  dashboard: "📊",
  patients: "🐾",
  appointments: "📅",
  consultations: "📋",
  reports: "📈",
  profile: "👤",
  logout: "↪️",
  refresh: "🔄",
  vaccine: "💉",
  plus: "➕",
  search: "🔎",
  paperclip: "📎",
  print: "🖨️",
  dog: "🐶",
  cat: "🐱",
  bird: "🐦",
  fish: "🐟",
  reptile: "🦎",
  paw: "🐾",
  horse: "🐴",
  cow: "🐮",
  sheep: "🐑",
  goat: "🐐",
  pig: "🐷",
  // Ações
  edit: "✏️",
  delete: "🗑️",
  confirm: "✅",
  back: "⬅️",
  save: "💾",
  cancel: "❌",
  view: "👁️",
  warning: "⚠️",
  success: "✓",
  error: "✗",
  info: "ℹ️",
  medical: "🩺",
  heart: "❤️",
  thermometer: "🌡️",
  weight: "⚖️",
  phone: "📞",
  email: "📧",
  address: "📍",
  calendar: "📆",
  clock: "🕐",
  star: "⭐",
  heartRate: "💗",
  signature: "✍️"
};

const toneByName = {
  dashboard: "bg-gradient-to-br from-sky-100 to-blue-200",
  patients: "bg-gradient-to-br from-emerald-100 to-teal-200",
  appointments: "bg-gradient-to-br from-amber-100 to-orange-200",
  consultations: "bg-gradient-to-br from-indigo-100 to-violet-200",
  reports: "bg-gradient-to-br from-fuchsia-100 to-purple-200",
  profile: "bg-gradient-to-br from-cyan-100 to-teal-200",
  logout: "bg-gradient-to-br from-rose-100 to-red-200"
};

function resolveEmojiSize(className = "", variant = "default") {
  const source = String(className || "");
  if (/\bh-3\b/.test(source)) return variant === "colorful" ? "0.9rem" : "0.78rem";
  if (/\bh-4\b/.test(source)) return variant === "colorful" ? "1.05rem" : "0.92rem";
  if (/\bh-5\b/.test(source)) return variant === "colorful" ? "1.2rem" : "1.06rem";
  if (/\bh-6\b/.test(source)) return variant === "colorful" ? "1.5rem" : "1.2rem";
  if (/\bh-7\b/.test(source)) return variant === "colorful" ? "1.7rem" : "1.34rem";
  if (/\bh-8\b/.test(source)) return variant === "colorful" ? "1.9rem" : "1.48rem";
  if (/\bh-9\b/.test(source)) return variant === "colorful" ? "2.1rem" : "1.66rem";
  if (/\bh-10\b/.test(source)) return variant === "colorful" ? "2.3rem" : "1.86rem";
  return variant === "colorful" ? "1.1rem" : "1rem";
}

const AppIcon = ({ name, className = "", variant = "default" }) => {
  const emoji = emojiByName[name] || "•";
  const sizeClass = className || "h-5 w-5";
  const emojiSize = resolveEmojiSize(sizeClass, variant);

  if (variant === "colorful") {
    return (
      <span
        className={`${sizeClass} inline-flex items-center justify-center bg-transparent`}
        role="img"
        aria-label={name || "icon"}
      >
        <span className="leading-none" style={{ fontSize: emojiSize }}>
          {emoji}
        </span>
      </span>
    );
  }

  return (
    <span className={`${sizeClass} inline-flex items-center justify-center`} role="img" aria-label={name || "icon"}>
      <span className="leading-none" style={{ fontSize: emojiSize }}>
        {emoji}
      </span>
    </span>
  );
};

export default AppIcon;
