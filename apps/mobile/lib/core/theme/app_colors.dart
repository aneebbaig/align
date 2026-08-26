import 'package:flutter/material.dart';

/// Dark warm theme - exact hex conversions from web app globals.css oklch values.
/// Web app default: dark mode, warm hue (60°).
abstract final class AppColors {
  // ── Backgrounds ──────────────────────────────────────────
  static const Color background = Color(0xFF040201);
  static const Color card = Color(0xFF100B07);
  static const Color popover = Color(0xFF150F0B);
  static const Color sidebar = Color(0xFF020101);

  // ── Foregrounds ───────────────────────────────────────────
  static const Color foreground = Color(0xFFF0EAE5);
  static const Color cardForeground = Color(0xFFF0EAE5);

  // ── Primary (warm gold) ───────────────────────────────────
  static const Color primary = Color(0xFFDFBE92);
  static const Color primaryForeground = Color(0xFFFFFDFB);

  // ── Secondary / Muted ─────────────────────────────────────
  static const Color secondary = Color(0xFF18120E);
  static const Color secondaryForeground = Color(0xFFF0EAE5);
  static const Color muted = Color(0xFF18120E);
  static const Color mutedForeground = Color(0xFF8C857F);

  // ── Accent ────────────────────────────────────────────────
  static const Color accent = Color(0xFF1B1510);
  static const Color accentForeground = Color(0xFFF0EAE5);

  // ── Semantic ──────────────────────────────────────────────
  static const Color destructive = Color(0xFFDF202E);
  static const Color destructiveForeground = Color(0xFFF0EAE5);
  static const Color success = Color(0xFF3DAA6E);
  static const Color warning = Color(0xFFD4842A);
  static const Color info = Color(0xFF3D7FBF);

  // ── Borders / Inputs ──────────────────────────────────────
  static const Color border = Color(0xFF2A221D);
  static const Color input = Color(0xFF150F0B);
  static const Color ring = Color(0xFFDFBE92);

  // ── Sidebar ───────────────────────────────────────────────
  static const Color sidebarAccent = Color(0xFF130E0A);
  static const Color sidebarBorder = Color(0xFF1B1510);
  static const Color sidebarForeground = Color(0xFFF0EAE5);

  // ── Transparent / Overlays ────────────────────────────────
  static const Color overlay = Color(0x99000000);
  static const Color shimmerBase = Color(0xFF130E0A);
  static const Color shimmerHighlight = Color(0xFF1B1510);
}
