import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextProps {
  themePreference: "light" | "dark" | "system";
  activeTheme: "light" | "dark";
  switchTheme: (theme: "light" | "dark" | "system") => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [themePreference, setThemePreference] = useState<
    "light" | "dark" | "system"
  >("system");
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("light");

  const switchTheme = (theme: "light" | "dark" | "system") => {
    if (theme === "system") {
      localStorage.removeItem("theme");
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setActiveTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    } else {
      const isDark = theme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      localStorage.theme = theme;
      setActiveTheme(isDark ? "dark" : "light");
    }
    setThemePreference(theme);
  };

  useEffect(() => {
    if (!("theme" in localStorage)) {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
      setActiveTheme(isDark ? "dark" : "light");
      setThemePreference("system");
    } else {
      const isDark = localStorage.theme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      setActiveTheme(isDark ? "dark" : "light");
      setThemePreference(localStorage.theme as "light" | "dark");
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{ switchTheme, themePreference, activeTheme }}
    >
      {themePreference.length ? children : null}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
