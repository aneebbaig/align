"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface FontPair {
  id: string;
  label: string;
  displayVar: string;
  sansVar: string;
  previewDisplay: string;
  previewSans: string;
}

export const FONT_PAIRS: FontPair[] = [
  { id: "outfit",           label: "Modern",     displayVar: "--font-outfit",    sansVar: "--font-outfit",    previewDisplay: "Outfit",              previewSans: "Outfit" },
  { id: "syne-dmsans",      label: "Sharp",      displayVar: "--font-syne",      sansVar: "--font-dmsans",    previewDisplay: "Syne",                previewSans: "DM Sans" },
  { id: "jakarta",          label: "Premium",    displayVar: "--font-jakarta",   sansVar: "--font-jakarta",   previewDisplay: "Plus Jakarta Sans",   previewSans: "Plus Jakarta Sans" },
  { id: "bricolage-dmsans", label: "Editorial",  displayVar: "--font-bricolage", sansVar: "--font-dmsans",    previewDisplay: "Bricolage Grotesque", previewSans: "DM Sans" },
  { id: "playfair-outfit",  label: "Classic",    displayVar: "--font-playfair",  sansVar: "--font-outfit",    previewDisplay: "Playfair Display",    previewSans: "Outfit" },
  { id: "raleway-manrope",  label: "Elegant",    displayVar: "--font-raleway",   sansVar: "--font-manrope",   previewDisplay: "Raleway",             previewSans: "Manrope" },
  { id: "cormorant-outfit", label: "Luxury",     displayVar: "--font-cormorant", sansVar: "--font-outfit",    previewDisplay: "Cormorant Garamond",  previewSans: "Outfit" },
  { id: "josefin-nunito",   label: "Geometric",  displayVar: "--font-josefin",   sansVar: "--font-nunito",    previewDisplay: "Josefin Sans",        previewSans: "Nunito" },
  { id: "nunito",           label: "Rounded",    displayVar: "--font-nunito",    sansVar: "--font-nunito",    previewDisplay: "Nunito",              previewSans: "Nunito" },
  { id: "worksans-manrope", label: "Corporate",  displayVar: "--font-worksans",  sansVar: "--font-manrope",   previewDisplay: "Work Sans",           previewSans: "Manrope" },
];

export type FontThemeId = typeof FONT_PAIRS[number]["id"];

interface FontThemeContextValue {
  fontTheme: FontThemeId;
  setFontTheme: (id: FontThemeId) => void;
  currentPair: FontPair;
}

const FontThemeContext = createContext<FontThemeContextValue>({
  fontTheme: "outfit",
  setFontTheme: () => {},
  currentPair: FONT_PAIRS[0],
});

export function useFontTheme() {
  return useContext(FontThemeContext);
}

export function FontThemeProvider({ children }: { children: React.ReactNode }) {
  const [fontTheme, setFontThemeState] = useState<FontThemeId>("outfit");

  useEffect(() => {
    const stored = localStorage.getItem("font-theme") as FontThemeId | null;
    const valid = FONT_PAIRS.map((p) => p.id);
    const id = stored && valid.includes(stored) ? stored : "outfit";
    setFontThemeState(id);
    applyFontTheme(id);
  }, []);

  function setFontTheme(id: FontThemeId) {
    setFontThemeState(id);
    localStorage.setItem("font-theme", id);
    applyFontTheme(id);
  }

  const currentPair = FONT_PAIRS.find((p) => p.id === fontTheme) ?? FONT_PAIRS[0];

  return (
    <FontThemeContext.Provider value={{ fontTheme, setFontTheme, currentPair }}>
      {children}
    </FontThemeContext.Provider>
  );
}

function applyFontTheme(id: FontThemeId) {
  const pair = FONT_PAIRS.find((p) => p.id === id) ?? FONT_PAIRS[0];
  const el = document.documentElement;
  el.style.setProperty("--font-sans",    `var(${pair.sansVar}), ui-sans-serif, system-ui, sans-serif`);
  el.style.setProperty("--font-display", `var(${pair.displayVar}), ui-sans-serif, system-ui, sans-serif`);
}
