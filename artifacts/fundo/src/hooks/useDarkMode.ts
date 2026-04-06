import { useState, useEffect } from "react";

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("fundo_dark_mode");
      if (stored !== null) return stored === "true";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("fundo_dark_mode", String(dark));
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
