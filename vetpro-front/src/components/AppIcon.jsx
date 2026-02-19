import React from "react";

const iconClass = "h-5 w-5";

const IconPath = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={iconClass}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const AppIcon = ({ name, className = "" }) => {
  const wrapperClass = className ? className : iconClass;

  switch (name) {
    case "dashboard":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M3 13h8V3H3z" />
            <path d="M13 21h8V11h-8z" />
            <path d="M13 3h8v6h-8z" />
            <path d="M3 21h8v-6H3z" />
          </IconPath>
        </div>
      );
    case "patients":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M6 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M3 21v-1a4 4 0 0 1 4-4h3" />
            <path d="M13 21v-2a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v2" />
          </IconPath>
        </div>
      );
    case "appointments":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M3 10h18" />
          </IconPath>
        </div>
      );
    case "consultations":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
            <path d="M14 2v5h5" />
            <path d="M9 13h6" />
            <path d="M9 17h6" />
            <path d="M9 9h2" />
          </IconPath>
        </div>
      );
    case "reports":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M4 19V5" />
            <path d="M10 19V9" />
            <path d="M16 19V13" />
            <path d="M22 19V3" />
          </IconPath>
        </div>
      );
    case "profile":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </IconPath>
        </div>
      );
    case "logout":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </IconPath>
        </div>
      );
    case "refresh":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </IconPath>
        </div>
      );
    case "vaccine":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M14.5 4.5l5 5" />
            <path d="M7 17l7.5-7.5" />
            <path d="M5 19l2 2" />
            <path d="M3 21l4-4" />
            <path d="M16 3l5 5" />
          </IconPath>
        </div>
      );
    case "plus":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </IconPath>
        </div>
      );
    case "search":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </IconPath>
        </div>
      );
    case "paperclip":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="m21.44 11.05-8.49 8.49a5 5 0 0 1-7.07-7.07l9.2-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.2a2 2 0 1 1-2.83-2.83l8.48-8.48" />
          </IconPath>
        </div>
      );
    case "print":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M7 8V3h10v5" />
            <rect x="5" y="14" width="14" height="7" rx="1" />
            <rect x="3" y="8" width="18" height="6" rx="2" />
          </IconPath>
        </div>
      );
    case "dog":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M6 11V7l3-2 3 2v4" />
            <path d="M6 11c0 4 2 7 6 7s6-3 6-7" />
            <path d="M12 14v4" />
          </IconPath>
        </div>
      );
    case "cat":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="m7 7 2-3 3 2 3-2 2 3" />
            <path d="M6 11a6 6 0 1 0 12 0" />
            <path d="M9 13h.01" />
            <path d="M15 13h.01" />
          </IconPath>
        </div>
      );
    case "bird":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M3 12c3-6 12-8 18-5-2 2-5 3-8 3" />
            <path d="M3 12c2 5 9 8 14 7" />
            <path d="M10 13l-2 3" />
          </IconPath>
        </div>
      );
    case "fish":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M3 12c3-4 6-5 10-5 2 0 4 1 6 2-2 1-3 2-3 3s1 2 3 3c-2 1-4 2-6 2-4 0-7-1-10-5Z" />
            <circle cx="10" cy="11" r="0.7" fill="currentColor" />
          </IconPath>
        </div>
      );
    case "reptile":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <path d="M4 14c3-5 7-7 12-6 2 1 3 3 3 5-1 3-4 5-8 5-3 0-5-1-7-4Z" />
            <path d="M9 13h.01" />
          </IconPath>
        </div>
      );
    case "paw":
      return (
        <div className={wrapperClass}>
          <IconPath>
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="12" cy="7" r="1.5" />
            <circle cx="16" cy="8" r="1.5" />
            <path d="M8 15c1.5-2 6.5-2 8 0 1.2 1.5.2 4-2 4H10c-2.2 0-3.2-2.5-2-4Z" />
          </IconPath>
        </div>
      );
    default:
      return (
        <div className={wrapperClass}>
          <IconPath>
            <circle cx="12" cy="12" r="9" />
          </IconPath>
        </div>
      );
  }
};

export default AppIcon;
