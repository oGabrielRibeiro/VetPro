import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("vetpro_dark_mode");
    if (saved !== null) {
      return saved === "true";
    }
    if (typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("vetpro_dark_mode", String(isDark));
  }, [isDark]);

  const toggleDarkMode = () => setIsDark((prev) => !prev);

  return { isDark, toggleDarkMode };
}

export default useDarkMode;
