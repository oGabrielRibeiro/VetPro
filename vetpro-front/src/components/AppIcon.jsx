import React from "react";

const iconClass = "h-5 w-5";

const IconPath = ({ children, className = iconClass }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const toneByName = {
  dashboard: "bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700",
  patients: "bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-700",
  appointments: "bg-gradient-to-br from-amber-100 to-orange-200 text-amber-700",
  consultations: "bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700",
  reports: "bg-gradient-to-br from-fuchsia-100 to-purple-200 text-purple-700",
  profile: "bg-gradient-to-br from-cyan-100 to-teal-200 text-cyan-700",
  logout: "bg-gradient-to-br from-rose-100 to-red-200 text-rose-700",
  plus: "bg-gradient-to-br from-emerald-100 to-green-200 text-emerald-700",
  search: "bg-gradient-to-br from-slate-100 to-gray-200 text-slate-700",
  paperclip: "bg-gradient-to-br from-sky-100 to-cyan-200 text-cyan-700",
  print: "bg-gradient-to-br from-blue-100 to-indigo-200 text-indigo-700",
};

const AppIcon = ({ name, className = "", variant = "default" }) => {
  const wrapperClass = className ? className : iconClass;
  const toneClass = toneByName[name] || "bg-gradient-to-br from-slate-100 to-gray-200 text-slate-700";
  const iconSizeClass = variant === "colorful" ? "h-3.5 w-3.5" : "h-full w-full";

  const renderIcon = () => {
    switch (name) {
    case "dashboard":
      return (
        <IconPath className={iconSizeClass}>
          <path d="M3 13h8V3H3z" />
          <path d="M13 21h8V11h-8z" />
          <path d="M13 3h8v6h-8z" />
          <path d="M3 21h8v-6H3z" />
        </IconPath>
      );
    case "patients":
      return (
        <IconPath className={iconSizeClass}>
          <path d="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M6 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M3 21v-1a4 4 0 0 1 4-4h3" />
          <path d="M13 21v-2a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v2" />
        </IconPath>
      );
    case "appointments":
      return (
        <IconPath className={iconSizeClass}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
        </IconPath>
      );
    case "consultations":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
            <path d="M14 2v5h5" />
            <path d="M9 13h6" />
            <path d="M9 17h6" />
            <path d="M9 9h2" />
          </IconPath>
      );
    case "reports":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M4 19V5" />
            <path d="M10 19V9" />
            <path d="M16 19V13" />
            <path d="M22 19V3" />
          </IconPath>
      );
    case "profile":
      return (
          <IconPath className={iconSizeClass}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </IconPath>
      );
    case "logout":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </IconPath>
      );
    case "refresh":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </IconPath>
      );
    case "vaccine":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M14.5 4.5l5 5" />
            <path d="M7 17l7.5-7.5" />
            <path d="M5 19l2 2" />
            <path d="M3 21l4-4" />
            <path d="M16 3l5 5" />
          </IconPath>
      );
    case "plus":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </IconPath>
      );
    case "search":
      return (
          <IconPath className={iconSizeClass}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </IconPath>
      );
    case "paperclip":
      return (
          <IconPath className={iconSizeClass}>
            <path d="m21.44 11.05-8.49 8.49a5 5 0 0 1-7.07-7.07l9.2-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.2a2 2 0 1 1-2.83-2.83l8.48-8.48" />
          </IconPath>
      );
    case "print":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M7 8V3h10v5" />
            <rect x="5" y="14" width="14" height="7" rx="1" />
            <rect x="3" y="8" width="18" height="6" rx="2" />
          </IconPath>
      );
    case "dog":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M6 11V7l3-2 3 2v4" />
            <path d="M6 11c0 4 2 7 6 7s6-3 6-7" />
            <path d="M12 14v4" />
          </IconPath>
      );
    case "cat":
      return (
          <IconPath className={iconSizeClass}>
            <path d="m7 7 2-3 3 2 3-2 2 3" />
            <path d="M6 11a6 6 0 1 0 12 0" />
            <path d="M9 13h.01" />
            <path d="M15 13h.01" />
          </IconPath>
      );
    case "bird":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M3 12c3-6 12-8 18-5-2 2-5 3-8 3" />
            <path d="M3 12c2 5 9 8 14 7" />
            <path d="M10 13l-2 3" />
          </IconPath>
      );
    case "fish":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M3 12c3-4 6-5 10-5 2 0 4 1 6 2-2 1-3 2-3 3s1 2 3 3c-2 1-4 2-6 2-4 0-7-1-10-5Z" />
            <circle cx="10" cy="11" r="0.7" fill="currentColor" />
          </IconPath>
      );
    case "reptile":
      return (
          <IconPath className={iconSizeClass}>
            <path d="M4 14c3-5 7-7 12-6 2 1 3 3 3 5-1 3-4 5-8 5-3 0-5-1-7-4Z" />
            <path d="M9 13h.01" />
          </IconPath>
      );
    case "paw":
      return (
          <IconPath className={iconSizeClass}>
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="12" cy="7" r="1.5" />
            <circle cx="16" cy="8" r="1.5" />
            <path d="M8 15c1.5-2 6.5-2 8 0 1.2 1.5.2 4-2 4H10c-2.2 0-3.2-2.5-2-4Z" />
          </IconPath>
      );
    default:
      return (
          <IconPath className={iconSizeClass}>
            <circle cx="12" cy="12" r="9" />
          </IconPath>
      );
    }
  };

  if (variant === "colorful") {
    const sizeClass = className || "h-7 w-7";
    return (
      <span
        className={`${sizeClass} inline-flex items-center justify-center rounded-lg shadow-sm ${toneClass}`}
      >
        {renderIcon()}
      </span>
    );
  }

  return <div className={wrapperClass}>{renderIcon()}</div>;
};

export default AppIcon;
