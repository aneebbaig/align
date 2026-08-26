import type { Metadata } from "next";
import {
  Outfit, Syne, DM_Sans, Bricolage_Grotesque,
  Playfair_Display, Raleway, Manrope, Plus_Jakarta_Sans,
  Nunito, Cormorant_Garamond, Josefin_Sans, Work_Sans,
  JetBrains_Mono,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ColorThemeProvider } from "@/components/shared/color-theme-provider";
import { FontThemeProvider } from "@/components/shared/font-theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

const outfit            = Outfit({           variable: "--font-outfit",      subsets: ["latin"], display: "swap" });
const syne              = Syne({             variable: "--font-syne",        subsets: ["latin"], display: "swap" });
const dmSans            = DM_Sans({          variable: "--font-dmsans",      subsets: ["latin"], display: "swap" });
const bricolage         = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap" });
const playfair          = Playfair_Display({ variable: "--font-playfair",    subsets: ["latin"], display: "swap", weight: ["400", "700"] });
const raleway           = Raleway({          variable: "--font-raleway",     subsets: ["latin"], display: "swap" });
const manrope           = Manrope({          variable: "--font-manrope",     subsets: ["latin"], display: "swap" });
const jakarta           = Plus_Jakarta_Sans({ variable: "--font-jakarta",    subsets: ["latin"], display: "swap" });
const nunito            = Nunito({           variable: "--font-nunito",      subsets: ["latin"], display: "swap" });
const cormorant         = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], display: "swap", weight: ["400", "600"] });
const josefin           = Josefin_Sans({     variable: "--font-josefin",     subsets: ["latin"], display: "swap" });
const workSans          = Work_Sans({        variable: "--font-worksans",    subsets: ["latin"], display: "swap" });
const jetbrainsMono     = JetBrains_Mono({   variable: "--font-jetbrains",   subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} - Personal Finance`, template: `%s - ${APP_NAME}` },
  description: "Your private personal finance manager",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  icons: { apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [
    outfit.variable, syne.variable, dmSans.variable, bricolage.variable,
    playfair.variable, raleway.variable, manrope.variable, jakarta.variable,
    nunito.variable, cormorant.variable, josefin.variable, workSans.variable,
    jetbrainsMono.variable,
  ].join(" ");

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={fontVars}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ColorThemeProvider>
            <FontThemeProvider>
              {children}
              <Toaster richColors position="top-right" />
              <Analytics />
              <SpeedInsights />
            </FontThemeProvider>
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
