import React from "react";

function iconPaths(name) {
  switch (name) {
    case "dashboard":
      return (
        <>
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </>
      );
    case "patients":
      return (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
        </>
      );
    case "appointments":
    case "calendar":
      return (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </>
      );
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
    case "consultations":
      return (
        <>
          <path d="M6 4h12a2 2 0 0 1 2 2v12l-4-3H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        </>
      );
    case "reports":
      return (
        <>
          <path d="M5 19V9M12 19V5M19 19v-7" />
          <path d="M3 19h18" />
        </>
      );
    case "profile":
      return (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c1.2-3.3 4-5 7.5-5s6.3 1.7 7.5 5" />
        </>
      );
    case "logout":
      return (
        <>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
        </>
      );
    case "refresh":
      return (
        <>
          <path d="M20 11a8 8 0 1 0 1.2 4.2" />
          <path d="M20 4v7h-7" />
        </>
      );
    case "plus":
      return <path d="M12 5v14M5 12h14" />;
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </>
      );
    case "paperclip":
      return <path d="M9 12.5l5.5-5.5a3 3 0 1 1 4.2 4.2l-7.8 7.8a4.5 4.5 0 1 1-6.4-6.4l7.1-7.1" />;
    case "print":
      return (
        <>
          <path d="M7 8V4h10v4" />
          <rect x="6" y="14" width="12" height="6" rx="1.5" />
          <rect x="4" y="8" width="16" height="6" rx="2" />
        </>
      );
    case "edit":
      return (
        <>
          <path d="M3 21l3.5-.7L19 7.8a2 2 0 0 0-2.8-2.8L3.7 17.5 3 21z" />
        </>
      );
    case "delete":
      return (
        <>
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M7 7l1 13h8l1-13" />
        </>
      );
    case "confirm":
    case "success":
      return <path d="M5 13l4 4 10-10" />;
    case "cancel":
    case "error":
      return <path d="M6 6l12 12M18 6L6 18" />;
    case "warning":
      return (
        <>
          <path d="M12 3l9 16H3l9-16z" />
          <path d="M12 9v4M12 17h.01" />
        </>
      );
    case "info":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6M12 7h.01" />
        </>
      );
    case "back":
      return <path d="M15 18l-6-6 6-6" />;
    case "save":
      return (
        <>
          <path d="M5 4h12l2 2v14H5z" />
          <path d="M8 4v6h8V4" />
        </>
      );
    case "view":
      return (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L4.9 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.5 2h5l.5-2a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z" />
        </>
      );
    case "medical":
    case "vaccine":
      return (
        <>
          <path d="M7 4l13 13" />
          <path d="M14 3l7 7" />
          <path d="M4 7l7 7" />
          <path d="M3 14l7 7" />
        </>
      );
    case "heart":
    case "heartRate":
      return <path d="M12 20s-7-4.5-9-8.8C1.6 8 3.7 5 6.9 5c2 0 3.3 1.1 5.1 3.2C13.8 6.1 15.1 5 17.1 5 20.3 5 22.4 8 21 11.2 19 15.5 12 20 12 20z" />;
    case "thermometer":
      return (
        <>
          <path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z" />
        </>
      );
    case "weight":
      return (
        <>
          <path d="M5 20h14l-1.3-8.5A3.5 3.5 0 0 0 14.2 8h-4.4a3.5 3.5 0 0 0-3.5 3.5L5 20z" />
          <path d="M12 11v3" />
        </>
      );
    case "phone":
      return <path d="M6 4h4l2 5-2 2a14 14 0 0 0 3 3l2-2 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z" />;
    case "email":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M4 7l8 6 8-6" />
        </>
      );
    case "address":
      return (
        <>
          <path d="M12 21s6-6 6-11a6 6 0 1 0-12 0c0 5 6 11 6 11z" />
          <circle cx="12" cy="10" r="2.2" />
        </>
      );
    case "signature":
      return <path d="M4 16c2-3 4-5 6-5 1.7 0 1.5 3 .4 4.8m3.6-2.8 2-2c1.3-1.3 3-1.3 4.2 0M4 20h16" />;
    case "qr-scan":
      return (
        <>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </>
      );
    case "loading":
      return <circle cx="12" cy="12" r="8" strokeDasharray="28" strokeDashoffset="10" />;
    default:
      return <circle cx="12" cy="12" r="3" />;
  }
}

const toneByName = {
  dashboard: "text-blue-600",
  patients: "text-emerald-600",
  appointments: "text-amber-600",
  consultations: "text-indigo-600",
  reports: "text-fuchsia-600",
  profile: "text-cyan-600",
  logout: "text-rose-600",
};

const AppIcon = ({ name, className = "", variant = "default" }) => {
  const toneClass =
    variant === "colorful"
      ? toneByName[name] || "text-sky-600"
      : "text-current";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      role="img"
      aria-label={name || "icon"}
      className={`${className || "h-5 w-5"} ${toneClass}`}
    >
      {iconPaths(name)}
    </svg>
  );
};

export default AppIcon;
