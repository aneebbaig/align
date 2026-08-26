"use client";

import { createContext, useContext, useEffect, useState } from "react";

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

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("warm");

  useEffect(() => {
    const stored = localStorage.getItem("color-theme") as ColorTheme | null;
    const valid: ColorTheme[] = ["warm", "carbon", "dusk", "moss", "rose"];
    const theme = stored && valid.includes(stored) ? stored : "warm";
    setColorThemeState(theme);
    applyTheme(theme);
  }, []);

  function setColorTheme(theme: ColorTheme) {
    setColorThemeState(theme);
    localStorage.setItem("color-theme", theme);
    applyTheme(theme);
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
