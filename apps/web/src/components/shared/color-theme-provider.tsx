"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

export type ColorTheme = "warm" | "carbon" | "dusk" | "moss" | "rose";

interface ColorThemeContextValue {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextValue>({
  colorTheme: "warm",
  setColorTheme: () => {},
});

export function useColorTheme() {
  return useContext(ColorThemeContext);
}

const COLOR_KEY = "color-theme";
const VALID_COLORS: ColorTheme[] = ["warm", "carbon", "dusk", "moss", "rose"];
const colorListeners = new Set<() => void>();

function subscribeColor(cb: () => void) {
  colorListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    colorListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getColorSnapshot(): ColorTheme {
  const stored = localStorage.getItem(COLOR_KEY) as ColorTheme | null;
  return stored && VALID_COLORS.includes(stored) ? stored : "warm";
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const colorTheme = useSyncExternalStore<ColorTheme>(
    subscribeColor,
    getColorSnapshot,
    () => "warm"
  );

  useEffect(() => {
    applyTheme(colorTheme);
  }, [colorTheme]);

  function setColorTheme(theme: ColorTheme) {
    localStorage.setItem(COLOR_KEY, theme);
    colorListeners.forEach((l) => l());
  }

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

function applyTheme(theme: ColorTheme) {
  if (theme === "warm") {
    delete document.documentElement.dataset.colorTheme;
  } else {
    document.documentElement.dataset.colorTheme = theme;
  }
}
