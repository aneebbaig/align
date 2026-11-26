"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

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

const FONT_KEY = "font-theme";
const fontListeners = new Set<() => void>();

function subscribeFont(cb: () => void) {
  fontListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    fontListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getFontSnapshot(): FontThemeId {
  const stored = localStorage.getItem(FONT_KEY);
  return stored && FONT_PAIRS.some((p) => p.id === stored) ? stored : "outfit";
}

export function FontThemeProvider({ children }: { children: React.ReactNode }) {
  const fontTheme = useSyncExternalStore<FontThemeId>(
    subscribeFont,
    getFontSnapshot,
    () => "outfit"
  );

  useEffect(() => {
    applyFontTheme(fontTheme);
  }, [fontTheme]);

  function setFontTheme(id: FontThemeId) {
    localStorage.setItem(FONT_KEY, id);
    fontListeners.forEach((l) => l());
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
