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
  pig: "🐷"
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
  if (/\bh-3\b/.test(source)) return variant === "colorful" ? "0.72rem" : "0.78rem";
  if (/\bh-4\b/.test(source)) return variant === "colorful" ? "0.84rem" : "0.92rem";
  if (/\bh-5\b/.test(source)) return variant === "colorful" ? "0.98rem" : "1.06rem";
  if (/\bh-6\b/.test(source)) return variant === "colorful" ? "1.1rem" : "1.2rem";
  if (/\bh-7\b/.test(source)) return variant === "colorful" ? "1.22rem" : "1.34rem";
  if (/\bh-8\b/.test(source)) return variant === "colorful" ? "1.34rem" : "1.48rem";
  if (/\bh-9\b/.test(source)) return variant === "colorful" ? "1.5rem" : "1.66rem";
  if (/\bh-10\b/.test(source)) return variant === "colorful" ? "1.66rem" : "1.86rem";
  return variant === "colorful" ? "0.92rem" : "1rem";
}

const AppIcon = ({ name, className = "", variant = "default" }) => {
  const emoji = emojiByName[name] || "•";
  const sizeClass = className || "h-5 w-5";
  const emojiSize = resolveEmojiSize(sizeClass, variant);

  if (variant === "colorful") {
    const toneClass = toneByName[name] || "bg-gradient-to-br from-slate-100 to-gray-200";
    return (
      <span
        className={`${sizeClass} inline-flex items-center justify-center rounded-lg shadow-sm ${toneClass}`}
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
