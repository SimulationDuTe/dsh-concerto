/*
 * Concerto DSH Client Bundle (generated via esbuild from src/client/**).
 * Host React/ReactDOM stay external via __ModuleLoader__.load deps.
 */
window.__ModuleLoader__.load({
  id: 'dsh-concerto',
  deps: ['react', 'react-dom'],
  factory(require) {
    var __CONCERTO_HOST_REQUIRE__ = require;
    var module = { exports: {} };
    var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// dsh-host-dep:react
var require_react = __commonJS({
  "dsh-host-dep:react"(exports, module2) {
    module2.exports = __CONCERTO_HOST_REQUIRE__("react");
  }
});

// dsh-host-dep:react-dom
var require_react_dom = __commonJS({
  "dsh-host-dep:react-dom"(exports, module2) {
    module2.exports = __CONCERTO_HOST_REQUIRE__("react-dom");
  }
});

// packages/dsh-concerto/src/client/index.js
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// packages/dsh-concerto/src/client/api.js
var import_react = __toESM(require_react(), 1);

// packages/dsh-concerto/lib/domain/theme_contrast.mjs
var DEFAULT_LIGHT_THEME = Object.freeze({
  colorScheme: "light",
  isLight: true,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  codeFontFamily: '"SF Mono", "JetBrains Mono", Consolas, monospace',
  fontSize: 14,
  secondaryFontSize: 13,
  codeFontSize: 11,
  terminalFontSize: 13,
  bgBase: "#ffffff",
  bgLayer1: "#f9fafb",
  bgLayer2: "#f5f7fa",
  bgLayer3: "#edf0f4",
  textPrimary: "#0f1115",
  textSecondary: "#61666b",
  textTertiary: "#81858c",
  borderColor: "rgba(0, 0, 0, 0.10)",
  borderStrong: "rgba(0, 0, 0, 0.20)",
  accent: "#4176e6",
  accentBg: "#e4edfd",
  done: "#22c55e",
  warn: "#dd8629",
  error: "#ec1313",
  review: "#7c3aed"
});
var DEFAULT_DARK_THEME = Object.freeze({
  colorScheme: "dark",
  isLight: false,
  fontFamily: DEFAULT_LIGHT_THEME.fontFamily,
  codeFontFamily: DEFAULT_LIGHT_THEME.codeFontFamily,
  fontSize: 14,
  secondaryFontSize: 13,
  codeFontSize: 11,
  terminalFontSize: 13,
  bgBase: "#151517",
  bgLayer1: "#232324",
  bgLayer2: "#2c2c2e",
  bgLayer3: "#353638",
  textPrimary: "#f9fafb",
  textSecondary: "#cfd3d6",
  textTertiary: "#adb2b8",
  borderColor: "rgba(255, 255, 255, 0.12)",
  borderStrong: "rgba(255, 255, 255, 0.20)",
  accent: "#7aaaff",
  accentBg: "#34415b",
  done: "#22c55e",
  warn: "#f59e0b",
  error: "#f25a5a",
  review: "#a78bfa"
});
var HOST_FALLBACK_CSS_VARS = Object.freeze({
  "--cc-fb-bg-base": "#ffffff",
  "--cc-fb-bg-layer-1": "#f9fafb",
  "--cc-fb-bg-layer-2": "#f5f7fa",
  "--cc-fb-bg-layer-3": "#edf0f4",
  "--cc-fb-text-primary": "#0f1115",
  "--cc-fb-text-secondary": "#61666b",
  "--cc-fb-text-tertiary": "#81858c",
  "--cc-fb-text-inverted": "#ffffff",
  "--cc-fb-border-subtle": "rgba(0, 0, 0, 0.08)",
  "--cc-fb-border": "rgba(0, 0, 0, 0.12)",
  "--cc-fb-border-strong": "rgba(0, 0, 0, 0.18)",
  "--cc-fb-mask": "rgba(0, 0, 0, 0.45)",
  "--cc-fb-accent": "#4176e6",
  "--cc-fb-done": "#22c55e",
  "--cc-fb-warn": "#dd8629",
  "--cc-fb-error": "#ec1313",
  "--cc-fb-review": "#7c3aed",
  "--cc-fb-radius-sm": "8px",
  "--cc-fb-radius-md": "12px",
  "--cc-fb-radius-lg": "16px",
  "--cc-fb-radius-pill": "999px",
  "--cc-fb-shadow-soft": "0 1px 3px rgba(0, 0, 0, 0.06)",
  "--cc-fb-shadow-panel": "0 4px 16px rgba(0, 0, 0, 0.10)",
  "--cc-fb-shadow-prominent": "0 20px 64px rgba(0, 0, 0, 0.24)",
  "--cc-fb-member-1": "#38bdf8",
  "--cc-fb-member-2": "#a78bfa",
  "--cc-fb-member-3": "#34d399",
  "--cc-fb-member-4": "#f472b6",
  "--cc-fb-member-5": "#fbbf24",
  "--cc-fb-member-6": "#60a5fa",
  "--cc-fb-ink-dark": "#0f172a",
  "--cc-fb-ink-light": "#f8fafc",
  "--cc-fb-hat-fill": "#1e293b",
  "--cc-fb-gold-highlight": "#fde68a",
  "--cc-fb-gold-fill": "#b45309",
  "--cc-fb-gold-soft": "#fef3c7",
  "--cc-fb-sky-stroke": "#38bdf8",
  "--cc-fb-sky-soft": "#bae6fd",
  "--cc-fb-slate-stroke": "#e2e8f0",
  "--cc-fb-slate-muted": "#94a3b8"
});
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
function parseCssColor(input) {
  const raw = String(input || "").trim();
  if (!raw || raw === "none") return null;
  if (raw === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return { r, g, b, a };
    }
    return null;
  }
  const srgbMatch = /^color\(\s*srgb\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?)(?:\s*\/\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?))?\s*\)$/i.exec(raw);
  if (srgbMatch) {
    const parseUnit = (s) => s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s);
    return {
      r: clamp(parseUnit(srgbMatch[1]) * 255, 0, 255),
      g: clamp(parseUnit(srgbMatch[2]) * 255, 0, 255),
      b: clamp(parseUnit(srgbMatch[3]) * 255, 0, 255),
      a: srgbMatch[4] !== void 0 ? clamp(parseUnit(srgbMatch[4]), 0, 1) : 1
    };
  }
  const rgbMatch = /^rgba?\(\s*([+-]?\d+(?:\.\d+)?%?)(?:\s*,\s*|\s+)([+-]?\d+(?:\.\d+)?%?)(?:\s*,\s*|\s+)([+-]?\d+(?:\.\d+)?%?)(?:\s*(?:,|\/)\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?))?\s*\)$/i.exec(raw);
  if (rgbMatch) {
    const ch = (s) => clamp(s.endsWith("%") ? parseFloat(s) / 100 * 255 : parseFloat(s), 0, 255);
    let a = 1;
    if (rgbMatch[4] !== void 0) {
      a = rgbMatch[4].endsWith("%") ? parseFloat(rgbMatch[4]) / 100 : parseFloat(rgbMatch[4]);
    }
    return { r: ch(rgbMatch[1]), g: ch(rgbMatch[2]), b: ch(rgbMatch[3]), a: clamp(a, 0, 1) };
  }
  return null;
}
function formatCssColor(c) {
  if (!c) return "";
  const r = clamp(Math.round(c.r), 0, 255);
  const g = clamp(Math.round(c.g), 0, 255);
  const b = clamp(Math.round(c.b), 0, 255);
  const a = c.a === void 0 ? 1 : clamp(Number(c.a), 0, 1);
  if (a >= 0.995) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}
function relativeLuminance(color) {
  const c = typeof color === "string" ? parseCssColor(color) : color;
  if (!c) return null;
  const lin = (v) => {
    const s = clamp(v / 255, 0, 1);
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}
function compositeOver(fgInput, bgInput) {
  const fg = typeof fgInput === "string" ? parseCssColor(fgInput) : fgInput;
  const bg = typeof bgInput === "string" ? parseCssColor(bgInput) : bgInput;
  if (!fg && !bg) return null;
  if (!fg) return bg ? { ...bg, a: 1 } : null;
  if (!bg || fg.a >= 0.995) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  const a = clamp(fg.a ?? 1, 0, 1);
  const bgA = clamp(bg.a ?? 1, 0, 1);
  const outA = a + bgA * (1 - a);
  if (outA <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * a + bg.r * bgA * (1 - a)) / outA,
    g: (fg.g * a + bg.g * bgA * (1 - a)) / outA,
    b: (fg.b * a + bg.b * bgA * (1 - a)) / outA,
    a: outA
  };
}
function contrastRatio(fgInput, bgInput) {
  const bg = typeof bgInput === "string" ? parseCssColor(bgInput) : bgInput;
  const fgRaw = typeof fgInput === "string" ? parseCssColor(fgInput) : fgInput;
  if (!fgRaw || !bg) return 1;
  const fg = fgRaw.a < 0.995 ? compositeOver(fgRaw, bg) : fgRaw;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  if (l1 === null || l2 === null) return 1;
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}
function blendRgb(aInput, bInput, t) {
  const a = typeof aInput === "string" ? parseCssColor(aInput) : aInput;
  const b = typeof bInput === "string" ? parseCssColor(bInput) : bInput;
  if (!a || !b) return a || b;
  const k = clamp(t, 0, 1);
  return {
    r: a.r * (1 - k) + b.r * k,
    g: a.g * (1 - k) + b.g * k,
    b: a.b * (1 - k) + b.b * k,
    a: 1
  };
}
var DARK_INK = Object.freeze({ r: 15, g: 17, b: 21, a: 1 });
var LIGHT_INK = Object.freeze({ r: 255, g: 255, b: 255, a: 1 });
var DARK_PAPER = Object.freeze({ r: 24, g: 26, b: 32, a: 1 });
var LIGHT_PAPER = Object.freeze({ r: 249, g: 250, b: 251, a: 1 });
function pickHighContrastInk(bgInput, preferredInput = null, minRatio = 4.5) {
  const bg = typeof bgInput === "string" ? parseCssColor(bgInput) : bgInput;
  if (!bg) return LIGHT_INK;
  const pref = typeof preferredInput === "string" ? parseCssColor(preferredInput) : preferredInput;
  if (pref && pref.a >= 0.85 && contrastRatio(pref, bg) >= minRatio) {
    return { ...pref, a: 1 };
  }
  const cDark = contrastRatio(DARK_INK, bg);
  const cLight = contrastRatio(LIGHT_INK, bg);
  return cDark >= cLight ? { ...DARK_INK } : { ...LIGHT_INK };
}
function ensureInkContrast(fgInput, bgInput, minRatio = 4.5) {
  const fg = typeof fgInput === "string" ? parseCssColor(fgInput) : fgInput;
  const bg = typeof bgInput === "string" ? parseCssColor(bgInput) : bgInput;
  if (!bg) return fg || LIGHT_INK;
  const quantized = (c) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), a: c.a ?? 1 });
  if (fg && contrastRatio(quantized(fg), bg) >= minRatio) {
    return { ...fg, a: fg.a ?? 1 };
  }
  const targetInk = pickHighContrastInk(bg, null, minRatio);
  if (!fg) return targetInk;
  const targetMin = minRatio + 0.05;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const candidate = quantized(blendRgb(fg, targetInk, mid));
    if (contrastRatio(candidate, bg) >= targetMin) hi = mid;
    else lo = mid;
  }
  const resolved = quantized(blendRgb(fg, targetInk, hi));
  return contrastRatio(resolved, bg) >= minRatio ? resolved : targetInk;
}
function computeSafeSurfaceAlpha(surfaceColor, backdropColor, textColor, minRatio = 4.5) {
  const surf = typeof surfaceColor === "string" ? parseCssColor(surfaceColor) : surfaceColor;
  const back = typeof backdropColor === "string" ? parseCssColor(backdropColor) : backdropColor;
  const text = typeof textColor === "string" ? parseCssColor(textColor) : textColor;
  if (!surf || !back || !text) return null;
  if (surf.a >= 0.995) return null;
  if (contrastRatio(text, compositeOver(surf, back)) >= minRatio) return null;
  const opaqueTest = contrastRatio(text, { ...surf, a: 1 });
  if (opaqueTest < minRatio) return null;
  let lo = surf.a;
  let hi = 0.96;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const testBg = compositeOver({ ...surf, a: mid }, back);
    if (contrastRatio(text, testBg) >= minRatio) hi = mid;
    else lo = mid;
  }
  return { r: surf.r, g: surf.g, b: surf.b, a: clamp(Math.ceil(hi * 100) / 100, surf.a, 0.96) };
}
function resolveReadableSurfaceAndInk(input = {}) {
  const isLight = Boolean(input.isLight);
  const fb = isLight ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME;
  const isGlass = Boolean(input.isGlass);
  const parsedLayer1 = parseCssColor(input.bgLayer1) || parseCssColor(fb.bgLayer1);
  const parsedLayer2 = parseCssColor(input.bgLayer2) || parseCssColor(fb.bgLayer2);
  const parsedLayer3 = parseCssColor(input.bgLayer3) || parseCssColor(fb.bgLayer3);
  const parsedOverlay = parseCssColor(input.bgOverlay) || parsedLayer2;
  const parsedBase = parseCssColor(input.bgBase);
  const parsedText1 = parseCssColor(input.textPrimary) || parseCssColor(fb.textPrimary);
  const parsedText2 = parseCssColor(input.textSecondary) || parseCssColor(fb.textSecondary);
  const parsedText3 = parseCssColor(input.textTertiary) || parseCssColor(fb.textTertiary);
  const parsedAccent = parseCssColor(input.accent) || parseCssColor(fb.accent);
  const parsedAccentInk = parseCssColor(input.accentInk);
  const parsedDone = parseCssColor(input.done) || parseCssColor(fb.done);
  const parsedWarn = parseCssColor(input.warn) || parseCssColor(fb.warn);
  const parsedError = parseCssColor(input.error) || parseCssColor(fb.error);
  const parsedReview = parseCssColor(input.review) || parseCssColor(fb.review);
  const explicitUnderlay = parseCssColor(input.wallpaperUnderlay);
  const explicitReadabilityBase = parseCssColor(input.readabilityBase);
  const opaqueBase = parsedBase && parsedBase.a >= 0.9 ? parsedBase : null;
  const inferredBackdrop = explicitUnderlay || (explicitReadabilityBase && explicitReadabilityBase.a >= 0.9 ? explicitReadabilityBase : null) || opaqueBase || (relativeLuminance(parsedLayer1) < 0.35 ? { ...DARK_PAPER } : { ...LIGHT_PAPER });
  const effectiveBg1 = compositeOver(parsedLayer1, inferredBackdrop);
  const effectiveBg2 = compositeOver(parsedLayer2, inferredBackdrop);
  const effectiveOverlay = compositeOver(parsedOverlay, inferredBackdrop);
  let finalLayer1 = parsedLayer1;
  let finalLayer2 = parsedLayer2;
  let finalOverlay = parsedOverlay;
  let finalText1 = parsedText1;
  let surfaceRescued = false;
  let textRescued = false;
  const crPrimary = contrastRatio(parsedText1, effectiveBg1);
  if (crPrimary < 4.5) {
    const boosted1 = isGlass ? computeSafeSurfaceAlpha(parsedLayer1, inferredBackdrop, parsedText1, 4.5) : null;
    if (boosted1) {
      finalLayer1 = boosted1;
      finalLayer2 = computeSafeSurfaceAlpha(parsedLayer2, inferredBackdrop, parsedText1, 4.5) || { ...parsedLayer2, a: boosted1.a };
      finalOverlay = computeSafeSurfaceAlpha(parsedOverlay, inferredBackdrop, parsedText1, 4.5) || { ...parsedOverlay, a: boosted1.a };
      surfaceRescued = true;
    } else {
      finalText1 = pickHighContrastInk(effectiveBg1, parsedText1, 4.5);
      textRescued = true;
    }
  }
  const finalEffectiveBg1 = compositeOver(finalLayer1, inferredBackdrop);
  const finalEffectiveBg2 = compositeOver(finalLayer2, inferredBackdrop);
  const finalEffectiveOverlay = compositeOver(finalOverlay, inferredBackdrop);
  const finalText2 = ensureInkContrast(parsedText2, finalEffectiveBg1, 4.5);
  const finalText3 = ensureInkContrast(parsedText3, finalEffectiveBg1, 4.5);
  const text2Rescued = textRescued || contrastRatio(parsedText2, finalEffectiveBg1) < 4.5;
  const text3Rescued = textRescued || contrastRatio(parsedText3, finalEffectiveBg1) < 4.5;
  let finalAccentFill = parsedAccent;
  let finalOnAccent = pickHighContrastInk(parsedAccent, parsedAccentInk, 4.5);
  if (contrastRatio(finalOnAccent, parsedAccent) < 4.5) {
    finalOnAccent = { ...LIGHT_INK };
    finalAccentFill = ensureInkContrast(parsedAccent, LIGHT_INK, 4.55);
  }
  const finalAccentText = ensureInkContrast(parsedAccent, finalEffectiveBg1, 4.5);
  const finalAccentBorder = ensureInkContrast(parsedAccent, finalEffectiveBg1, 3);
  const finalDone = ensureInkContrast(parsedDone, finalEffectiveBg1, 4.5);
  const finalWarn = ensureInkContrast(parsedWarn, finalEffectiveBg1, 4.5);
  const finalError = ensureInkContrast(parsedError, finalEffectiveBg1, 4.5);
  const finalReview = ensureInkContrast(parsedReview, finalEffectiveBg1, 4.5);
  const cssVars = {};
  if (finalOnAccent) cssVars["--cc-on-accent"] = formatCssColor(finalOnAccent);
  if (finalAccentFill !== parsedAccent) cssVars["--cc-accent-fill"] = formatCssColor(finalAccentFill);
  if (contrastRatio(parsedAccent, finalEffectiveBg1) < 4.5) {
    cssVars["--cc-contrast-accent-text"] = formatCssColor(finalAccentText);
  }
  if (contrastRatio(parsedAccent, finalEffectiveBg1) < 3) {
    cssVars["--cc-contrast-accent-border"] = formatCssColor(finalAccentBorder);
  }
  if (surfaceRescued) {
    cssVars["--cc-contrast-card-bg"] = formatCssColor(finalLayer1);
    cssVars["--cc-contrast-nested-bg"] = formatCssColor(finalLayer2);
    cssVars["--cc-contrast-panel-bg"] = formatCssColor(finalLayer2);
    cssVars["--cc-contrast-canvas-bg"] = formatCssColor(finalLayer1);
    cssVars["--cc-contrast-overlay-bg"] = formatCssColor(finalOverlay);
  }
  if (textRescued) cssVars["--cc-contrast-text-primary"] = formatCssColor(finalText1);
  if (text2Rescued) cssVars["--cc-contrast-text-secondary"] = formatCssColor(finalText2);
  if (text3Rescued) cssVars["--cc-contrast-text-tertiary"] = formatCssColor(finalText3);
  if (contrastRatio(parsedDone, finalEffectiveBg1) < 4.5) cssVars["--cc-contrast-done"] = formatCssColor(finalDone);
  if (contrastRatio(parsedWarn, finalEffectiveBg1) < 4.5) cssVars["--cc-contrast-warn"] = formatCssColor(finalWarn);
  if (contrastRatio(parsedError, finalEffectiveBg1) < 4.5) cssVars["--cc-contrast-error"] = formatCssColor(finalError);
  if (contrastRatio(parsedReview, finalEffectiveBg1) < 4.5) cssVars["--cc-contrast-review"] = formatCssColor(finalReview);
  let exportBg1 = parsedLayer1.a >= 0.99 ? parsedLayer1 : finalEffectiveBg1;
  let exportBg2 = parsedLayer2.a >= 0.99 ? parsedLayer2 : finalEffectiveBg2;
  let exportText1 = finalText1;
  let exportText2 = finalText2;
  let exportText3 = finalText3;
  if (isLight && (parsedLayer1.a < 0.99 || relativeLuminance(exportBg1) < 0.5)) {
    exportBg1 = parseCssColor(DEFAULT_LIGHT_THEME.bgLayer1);
    exportBg2 = parseCssColor(DEFAULT_LIGHT_THEME.bgLayer2);
    exportText1 = parseCssColor(input.hostTextPrimary) || parseCssColor(DEFAULT_LIGHT_THEME.textPrimary);
    exportText2 = parseCssColor(input.hostTextSecondary) || parseCssColor(DEFAULT_LIGHT_THEME.textSecondary);
    exportText3 = parseCssColor(input.hostTextTertiary) || parseCssColor(DEFAULT_LIGHT_THEME.textTertiary);
    exportText1 = ensureInkContrast(exportText1, exportBg1, 4.5);
    exportText2 = ensureInkContrast(exportText2, exportBg1, 4.5);
    exportText3 = ensureInkContrast(exportText3, exportBg1, 4.5);
  } else if (!isLight && relativeLuminance(exportBg1) > 0.5) {
    exportBg1 = parseCssColor(DEFAULT_DARK_THEME.bgLayer1);
    exportBg2 = parseCssColor(DEFAULT_DARK_THEME.bgLayer2);
    exportText1 = pickHighContrastInk(exportBg1, parsedText1, 4.5);
    exportText2 = ensureInkContrast(parsedText2, exportBg1, 4.5);
    exportText3 = ensureInkContrast(parsedText3, exportBg1, 4.5);
  }
  const exportTheme = Object.freeze({
    colorScheme: isLight ? "light" : "dark",
    isLight,
    bgLayer1: formatCssColor(exportBg1),
    bgLayer2: formatCssColor(exportBg2),
    textPrimary: formatCssColor(exportText1),
    textSecondary: formatCssColor(exportText2),
    textTertiary: formatCssColor(exportText3),
    borderColor: isLight ? DEFAULT_LIGHT_THEME.borderColor : DEFAULT_DARK_THEME.borderColor,
    borderStrong: isLight ? DEFAULT_LIGHT_THEME.borderStrong : DEFAULT_DARK_THEME.borderStrong,
    accent: formatCssColor(ensureInkContrast(parsedAccent, exportBg1, 4.5)),
    onAccent: formatCssColor(finalOnAccent),
    done: formatCssColor(ensureInkContrast(parsedDone, exportBg1, 4.5)),
    warn: formatCssColor(ensureInkContrast(parsedWarn, exportBg1, 4.5)),
    error: formatCssColor(ensureInkContrast(parsedError, exportBg1, 4.5)),
    review: formatCssColor(ensureInkContrast(parsedReview, exportBg1, 4.5))
  });
  return {
    bgBase: parsedBase && parsedBase.a > 0 ? formatCssColor(parsedBase) : fb.bgBase,
    bgLayer1: formatCssColor(finalLayer1),
    bgLayer2: formatCssColor(finalLayer2),
    bgLayer3: formatCssColor(parsedLayer3),
    bgOverlay: formatCssColor(finalOverlay),
    compositedBg1: formatCssColor(finalEffectiveBg1),
    compositedBg2: formatCssColor(finalEffectiveBg2),
    compositedOverlay: formatCssColor(finalEffectiveOverlay),
    textPrimary: formatCssColor(finalText1),
    textSecondary: formatCssColor(finalText2),
    textTertiary: formatCssColor(finalText3),
    accent: formatCssColor(parsedAccent),
    accentFill: formatCssColor(finalAccentFill),
    accentText: formatCssColor(finalAccentText),
    accentBorder: formatCssColor(finalAccentBorder),
    onAccent: formatCssColor(finalOnAccent),
    done: formatCssColor(finalDone),
    warn: formatCssColor(finalWarn),
    error: formatCssColor(finalError),
    review: formatCssColor(finalReview),
    contrastMetrics: {
      surfaceRescued,
      textRescued,
      primaryRatio: Number(contrastRatio(finalText1, finalEffectiveBg1).toFixed(2)),
      secondaryRatio: Number(contrastRatio(finalText2, finalEffectiveBg1).toFixed(2)),
      tertiaryRatio: Number(contrastRatio(finalText3, finalEffectiveBg1).toFixed(2)),
      accentTextRatio: Number(contrastRatio(finalAccentText, finalEffectiveBg1).toFixed(2)),
      onAccentRatio: Number(contrastRatio(finalOnAccent, finalAccentFill).toFixed(2))
    },
    cssVars,
    exportTheme
  };
}

// packages/dsh-concerto/src/client/api.js
var h = import_react.default.createElement;
var NS = "concerto";
var API = "/concerto";
var TEAM_TOOLS = [
  "get_team_status",
  "submit_decision",
  "dispatch_task",
  "dispatch_review",
  "list_skills",
  "read_skill",
  "publish_project_skill",
  "manage_member_duties",
  "read_project_skill",
  "get_task",
  "report_progress",
  "submit_result",
  "submit_review",
  "publish_view_object",
  "patch_view_object",
  "list_view_objects",
  "read_view_object",
  "update_team_view"
];
function formatCapabilitySummary(cap) {
  if (!cap) return { badge: "\u672A\u6838\u9A8C", tone: "neutral", summary: "\u5C1A\u672A\u6536\u96C6\u80FD\u529B\u6E05\u5355", tools: [] };
  if (cap.coordinatorOnly || cap.profile === "none") {
    return { badge: "\u4EC5\u534F\u8C03", tone: "neutral", summary: "\u534F\u8C03\u89D2\u8272\uFF08\u65E0\u5DE5\u4F5C\u533A\u6587\u4EF6/Shell \u5DE5\u5177\uFF09", tools: [] };
  }
  switch (cap.verificationStatus) {
    case "preset_unreloaded":
      return { badge: "\u672A\u91CD\u8F7D", tone: "warn", summary: cap.detail || "\u9884\u8BBE\u672A\u6CE8\u518C\u5230\u5BBF\u4E3B\uFF0C\u8BF7\u5148\u91CD\u8F7D\u56E2\u961F", tools: [] };
    case "preset_stale":
      return { badge: "\u9700\u91CD\u8F7D", tone: "warn", summary: cap.detail || "\u9884\u8BBE\u5DE5\u5177\u63D2\u4EF6\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210\u5E76\u91CD\u8F7D", tools: [] };
    case "preset_broken":
      return { badge: "\u9884\u8BBE\u5F02\u5E38", tone: "danger", summary: cap.detail || "\u9884\u8BBE\u52A0\u8F7D\u5F02\u5E38", tools: [] };
    case "connector_missing":
      return { badge: "\u8FDE\u63A5\u5668\u7F3A\u5931", tone: "danger", summary: cap.detail || "\u5916\u90E8\u8FDE\u63A5\u5668\u672A\u6CE8\u518C", tools: [] };
    case "connector_registered":
      return { badge: `\u5916\u90E8 \xB7 ${cap.connector || "connector"}`, tone: "ok", summary: "\u7531\u5916\u90E8\u8FDE\u63A5\u5668\u6309\u6C99\u76D2\u4E0E\u5BA1\u6279\u7B56\u7565\u6267\u884C", tools: [] };
    default: {
      const tools = Array.isArray(cap.actualTools) && cap.actualTools.length > 0 ? cap.actualTools : cap.expectedTools || [];
      if (cap.profile === "readonly") {
        return {
          badge: cap.liveVerified ? "\u53EA\u8BFB \xB7 \u5DF2\u5B9E\u8BC1" : "\u53EA\u8BFB\u6587\u4EF6",
          tone: "ok",
          summary: "\u652F\u6301\u8BFB\u53D6\u4E0E\u4EE3\u7801\u641C\u7D22\uFF08\u7981\u5199\u5165\u4E0E\u547D\u4EE4\uFF09",
          tools
        };
      }
      return {
        badge: cap.liveVerified ? "\u7F16\u7801+Shell \xB7 \u5DF2\u5B9E\u8BC1" : "\u7F16\u7801+Shell",
        tone: "ok",
        summary: "\u652F\u6301\u5DE5\u4F5C\u533A\u8BFB\u5199\u3001\u4EE3\u7801\u641C\u7D22\u4E0E Shell \u547D\u4EE4\u6267\u884C",
        tools
      };
    }
  }
}
function toTeamId(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
var STATUS_LABEL = {
  pending: "\u5F85\u6D3E\u53D1",
  running: "\u6267\u884C\u4E2D",
  review: "\u5F85\u9A8C\u6536",
  completed: "\u5DF2\u9A8C\u6536",
  done: "\u5DF2\u9A8C\u6536",
  blocked: "\u963B\u585E",
  failed: "\u5931\u8D25",
  cancelled: "\u5DF2\u53D6\u6D88",
  waiting_input: "\u7B49\u5F85\u56DE\u7B54",
  waiting_approval: "\u7B49\u5F85\u5BA1\u6279",
  cancelling: "\u53D6\u6D88\u4E2D",
  unknown: "\u72B6\u6001\u672A\u77E5",
  finished: "\u672C\u8F6E\u5DF2\u7ED3\u675F",
  stopped: "\u5DF2\u505C\u6B62",
  idle: "\u7A7A\u95F2",
  attention: "\u7B49\u4F60\u5904\u7406",
  decided: "\u51B3\u5B9A\u5DF2\u4FDD\u5B58",
  delivered: "\u5DF2\u9001\u8FBE",
  delivery_failed: "\u9001\u8FBE\u5931\u8D25",
  expired: "\u5DF2\u5931\u6548",
  \u534F\u8C03: "\u6307\u6325\u4E2D"
};
var EVENT_LABEL = {
  "session.bound": "\u4F1A\u8BDD\u5DF2\u5173\u8054",
  "decision.applied": "\u8BA1\u5212\u5DF2\u66F4\u65B0",
  "execution.dispatched": "\u4EFB\u52A1\u5DF2\u6D3E\u53D1",
  "execution.started": "\u5F00\u59CB\u6267\u884C",
  "execution.phase": "\u6267\u884C\u9636\u6BB5",
  "execution.completed": "\u6267\u884C\u5B8C\u6210",
  "execution.failed": "\u6267\u884C\u5931\u8D25",
  "execution.unknown": "\u6267\u884C\u672A\u77E5",
  "output.message": "\u6210\u5458\u8F93\u51FA",
  "command.completed": "\u547D\u4EE4\u6267\u884C",
  "file.changed": "\u6587\u4EF6\u53D8\u66F4",
  "task.progress": "\u8FDB\u5EA6\u6C47\u62A5",
  "approval.requested": "\u8BF7\u6C42\u5BA1\u6279",
  "approval.decided": "\u5BA1\u6279\u5DF2\u51B3\u5B9A",
  "approval.delivered": "\u5BA1\u6279\u5DF2\u9001\u8FBE",
  "approval.delivery_failed": "\u5BA1\u6279\u9001\u8FBE\u5931\u8D25",
  "question.requested": "\u5411\u4F60\u63D0\u95EE",
  "question.decided": "\u5DF2\u63D0\u4EA4\u56DE\u7B54",
  "question.delivered": "\u56DE\u7B54\u5DF2\u9001\u8FBE",
  "question.delivery_failed": "\u56DE\u7B54\u9001\u8FBE\u5931\u8D25",
  "result.submitted": "\u63D0\u4EA4\u7ED3\u679C",
  "review.submitted": "\u9A8C\u6536\u7ED3\u8BBA",
  "review.feedback_created": "\u6DFB\u52A0\u5BA1\u67E5\u610F\u89C1",
  "review.feedback_reply": "\u8865\u4EA4\u4FEE\u8BA2\u8BC1\u636E",
  "review.feedback_close": "\u5173\u95ED\u5BA1\u67E5\u610F\u89C1",
  "review.feedback_reopen": "\u91CD\u65B0\u6253\u5F00\u5BA1\u67E5\u610F\u89C1",
  "execution.settled": "\u6267\u884C\u7ED3\u675F",
  "task.blocked": "\u4EFB\u52A1\u963B\u585E",
  "task.cancelled": "\u4EFB\u52A1\u53D6\u6D88",
  "task.unblocked": "\u4EFB\u52A1\u89E3\u9664\u963B\u585E",
  "worktree.prepared": "\u5DF2\u521B\u5EFA\u9694\u79BB Worktree",
  "worktree.dirty_detected": "\u68C0\u6D4B\u5230\u672A\u63D0\u4EA4\u5DE5\u4F5C\u533A\u53D8\u66F4",
  "worktree.fallback_shared": "\u56DE\u9000\u5171\u4EAB\u76EE\u5F55\u6267\u884C",
  "view.object.published": "\u53D1\u5E03\u5BF9\u8C61",
  "view.object.patched": "\u66F4\u65B0\u5BF9\u8C61",
  "checklist.edited": "\u7528\u6237\u7F16\u8F91\u9A8C\u6536\u6E05\u5355",
  "shared_artifact.edited": "\u7528\u6237\u7F16\u8F91\u5171\u7F16\u6210\u679C",
  "team.view.updated": "\u66F4\u65B0\u6307\u6325\u53F0",
  "project.skill.published": "\u53D1\u5E03\u9879\u76EE\u65B9\u6CD5",
  "skill.loaded": "\u52A0\u8F7D\u65B9\u6CD5",
  "skill.delivered": "\u6D3E\u53D1\u51BB\u7ED3\u65B9\u6CD5",
  "user.suggestion": "\u7528\u6237\u4E2D\u9014\u5EFA\u8BAE",
  "task.auto_cascaded": "\u26A1 \u81EA\u52A8\u7011\u5E03\u63A5\u529B",
  "race.started": "\u{1F3C1} \u542F\u52A8\u53CC\u89E3\u8D5B\u9A6C",
  "race.winner_selected": "\u{1F3C6} \u91C7\u7EB3\u8D5B\u9A6C\u80DC\u8005"
};
var STATE_META = {
  running: { cls: "concerto-state-running", icon: "\u27F3", label: "\u6267\u884C\u4E2D" },
  in_progress: { cls: "concerto-state-running", icon: "\u27F3", label: "\u8FDB\u884C\u4E2D" },
  waiting_input: { cls: "concerto-state-attention", icon: "\u25CF", label: "\u7B49\u5F85\u56DE\u7B54" },
  waiting_approval: { cls: "concerto-state-attention", icon: "\u25CF", label: "\u7B49\u5F85\u5BA1\u6279" },
  attention: { cls: "concerto-state-attention", icon: "\u25CF", label: "\u7B49\u4F60\u5904\u7406" },
  review: { cls: "concerto-state-review", icon: "\u25D0", label: "\u5F85\u9A8C\u6536" },
  completed: { cls: "concerto-state-done", icon: "\u2713", label: "\u5DF2\u9A8C\u6536" },
  done: { cls: "concerto-state-done", icon: "\u2713", label: "\u5DF2\u9A8C\u6536" },
  blocked: { cls: "concerto-state-blocked", icon: "!", label: "\u963B\u585E" },
  failed: { cls: "concerto-state-blocked", icon: "!", label: "\u5931\u8D25" },
  unknown: { cls: "concerto-state-unknown", icon: "?", label: "\u672A\u77E5" },
  idle: { cls: "concerto-state-idle", icon: "\u25CB", label: "\u7A7A\u95F2" },
  pending: { cls: "concerto-state-idle", icon: "\u25CB", label: "\u5F85\u6D3E\u53D1" },
  \u534F\u8C03: { cls: "concerto-state-running", icon: "\u266A", label: "\u6307\u6325\u4E2D" }
};
var label = (state) => STATUS_LABEL[state] || state;
var styles = {
  wrap: {
    padding: 12,
    border: "1px solid var(--cc-border)",
    borderRadius: "var(--cc-radius-card)",
    background: "var(--cc-card-bg)",
    backdropFilter: "var(--cc-backdrop-blur, none)",
    WebkitBackdropFilter: "var(--cc-backdrop-blur, none)",
    boxShadow: "var(--cc-shadow-soft)",
    color: "var(--cc-text-primary)",
    fontFamily: "var(--cc-font-sans)",
    fontSize: "var(--cc-font-size)",
    lineHeight: 1.6
  },
  title: { fontWeight: "var(--cc-fw-heading, 600)", marginBottom: 8 },
  row: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" },
  input: {
    padding: "6px 10px",
    borderRadius: "var(--cc-radius-ctrl)",
    border: "1px solid var(--cc-border)",
    background: "var(--cc-input-bg, var(--cc-card-nested-bg))",
    color: "var(--cc-text-primary)",
    minWidth: 160
  },
  button: {
    padding: "5px 12px",
    borderRadius: "var(--cc-radius-ctrl)",
    border: "1px solid var(--cc-border)",
    background: "var(--dsw-alias-button-elevated-fill, var(--cc-card-nested-bg))",
    color: "var(--cc-text-primary)",
    fontWeight: "var(--cc-fw-strong, 500)",
    cursor: "pointer"
  },
  primary: {
    padding: "5px 12px",
    borderRadius: "var(--cc-radius-ctrl)",
    border: "1px solid transparent",
    background: "var(--cc-primary-fill, var(--cc-accent-fill))",
    color: "var(--cc-on-primary, var(--cc-on-accent))",
    fontWeight: "var(--cc-fw-strong, 500)",
    cursor: "pointer"
  },
  item: { padding: "6px 8px", borderTop: "1px solid var(--cc-border-subtle)" },
  muted: { color: "var(--cc-text-muted)" },
  error: { color: "var(--cc-state-blocked)" },
  dock: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "4px 10px",
    fontSize: "var(--cc-font-size-secondary)",
    color: "var(--cc-text-muted)",
    flexWrap: "wrap"
  },
  inline: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
    fontSize: "var(--cc-fs-caption)",
    color: "var(--cc-text-muted)",
    cursor: "pointer"
  },
  inlineDot: { width: 6, height: 6, borderRadius: "var(--cc-radius-pill)", background: "var(--cc-state-done)", display: "inline-block" },
  inlineChip: { padding: "0 6px", borderRadius: "var(--cc-radius-pill)", border: "1px solid transparent", background: "var(--cc-accent-soft)", color: "var(--cc-accent-text)" },
  inlineCard: {
    marginTop: 4,
    padding: "6px 10px",
    borderRadius: "var(--cc-radius-ctrl)",
    border: "1px solid var(--cc-border-subtle)",
    background: "var(--cc-card-bg)",
    backdropFilter: "var(--cc-backdrop-blur, none)",
    WebkitBackdropFilter: "var(--cc-backdrop-blur, none)",
    boxShadow: "var(--cc-shadow-soft)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: "var(--cc-font-size-secondary)",
    color: "var(--cc-text-secondary)"
  },
  inlineRow: { display: "flex", gap: 6, alignItems: "center" },
  dockTeam: { color: "var(--cc-text-secondary)" },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 6px",
    borderRadius: "var(--cc-radius-pill)",
    border: "1px solid var(--cc-border)",
    background: "var(--cc-card-bg)",
    color: "var(--cc-text-secondary)"
  },
  chipCurrent: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 6px",
    borderRadius: "var(--cc-radius-pill)",
    border: "1px solid var(--cc-accent)",
    background: "var(--cc-accent-soft)",
    color: "var(--cc-accent-text)"
  },
  avatar: {
    width: "1.2em",
    height: "1.2em",
    borderRadius: "var(--cc-radius-pill)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "var(--cc-fs-micro)",
    fontWeight: 600,
    color: "var(--cc-on-accent)",
    background: "var(--cc-accent-fill, var(--cc-accent))"
  },
  avatarMember: {
    width: "1.2em",
    height: "1.2em",
    borderRadius: "var(--cc-radius-pill)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "var(--cc-fs-micro)",
    fontWeight: 600,
    color: "var(--cc-text-primary)",
    background: "var(--cc-card-nested-bg)"
  }
};
var cardStyle = {
  border: "1px solid var(--cc-border-subtle)",
  borderRadius: "var(--cc-radius-card)",
  padding: 12,
  marginTop: 8,
  background: "var(--cc-card-bg)",
  backdropFilter: "var(--cc-backdrop-blur, none)",
  WebkitBackdropFilter: "var(--cc-backdrop-blur, none)",
  boxShadow: "var(--cc-shadow-soft)"
};
var actionStyle = { ...styles.button, minHeight: 32, padding: "4px 10px" };
function resolveCssValue(property, expr, fallback = "", hostElement = null) {
  if (!expr) return fallback;
  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") return fallback || expr;
  try {
    const parent = (hostElement && hostElement.isConnected ? hostElement : null) || document.body || document.documentElement;
    if (!parent) return fallback || expr;
    const probe = document.createElement("span");
    probe.style.cssText = "position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;";
    const prop = property || "color";
    probe.style.setProperty(prop, expr);
    parent.appendChild(probe);
    const computed = getComputedStyle(probe).getPropertyValue(prop).trim();
    probe.remove();
    return computed || fallback || expr;
  } catch {
    return fallback || expr;
  }
}
function resolveCssExpression(expr, fallback = "", hostElement = null) {
  return resolveCssValue("color", expr, fallback, hostElement);
}
function buildStaticDefaultHostTheme() {
  const solved = resolveReadableSurfaceAndInk({ isLight: true, isGlass: false });
  return Object.freeze({
    colorScheme: "light",
    isLight: true,
    isGlass: false,
    hasWallpaper: false,
    backdropBlur: "none",
    fontFamily: DEFAULT_LIGHT_THEME.fontFamily,
    codeFontFamily: DEFAULT_LIGHT_THEME.codeFontFamily,
    terminalFontFamily: DEFAULT_LIGHT_THEME.codeFontFamily,
    fontSize: DEFAULT_LIGHT_THEME.fontSize,
    secondaryFontSize: DEFAULT_LIGHT_THEME.secondaryFontSize,
    codeFontSize: DEFAULT_LIGHT_THEME.codeFontSize,
    terminalFontSize: DEFAULT_LIGHT_THEME.terminalFontSize,
    bgBase: solved.bgBase,
    bgLayer1: solved.bgLayer1,
    bgLayer2: solved.bgLayer2,
    bgLayer3: solved.bgLayer3,
    bgOverlay: solved.bgOverlay,
    textPrimary: solved.textPrimary,
    textSecondary: solved.textSecondary,
    textTertiary: solved.textTertiary,
    borderColor: DEFAULT_LIGHT_THEME.borderColor,
    borderStrong: DEFAULT_LIGHT_THEME.borderStrong,
    accent: solved.accent,
    accentText: solved.accentText,
    accentBorder: solved.accentBorder,
    accentBg: DEFAULT_LIGHT_THEME.accentBg,
    onAccent: solved.onAccent,
    done: solved.done,
    warn: solved.warn,
    error: solved.error,
    review: solved.review,
    cssVars: solved.cssVars,
    contrastMetrics: solved.contrastMetrics,
    exportTheme: {
      ...solved.exportTheme,
      fontFamily: DEFAULT_LIGHT_THEME.fontFamily,
      codeFontFamily: DEFAULT_LIGHT_THEME.codeFontFamily,
      fontSize: DEFAULT_LIGHT_THEME.fontSize,
      secondaryFontSize: DEFAULT_LIGHT_THEME.secondaryFontSize,
      codeFontSize: DEFAULT_LIGHT_THEME.codeFontSize
    }
  });
}
function readResolvedHostTheme() {
  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") {
    return buildStaticDefaultHostTheme();
  }
  const hostEl = document.body || document.documentElement;
  const rootEl = document.documentElement;
  let serviceScheme = "";
  try {
    const svc = hostContext?.theme || (typeof hostContext?.get === "function" ? hostContext.get("theme") : null);
    const snap = typeof svc?.getTheme === "function" ? svc.getTheme() : null;
    if (snap?.active?.colorScheme === "dark" || snap?.active?.colorScheme === "light") {
      serviceScheme = snap.active.colorScheme;
    }
  } catch {
    serviceScheme = "";
  }
  const hasDarkBody = Boolean(document.body?.hasAttribute("data-ds-dark-theme"));
  const hasHostLight = Boolean(document.body?.hasAttribute("data-host-light"));
  const attrTheme = document.body?.getAttribute("data-theme") || rootEl?.getAttribute("data-theme") || "";
  const attrThemeSource = rootEl?.getAttribute("data-ds-theme-source") || "";
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:0;height:0;visibility:hidden;pointer-events:none;";
  (hostEl || rootEl).appendChild(probe);
  const readColor = (expr, fb) => {
    probe.style.color = "";
    probe.style.color = expr;
    return getComputedStyle(probe).color || fb;
  };
  const readSize = (expr, fb) => {
    probe.style.fontSize = "";
    probe.style.fontSize = expr;
    const px = Number.parseFloat(getComputedStyle(probe).fontSize);
    return Number.isFinite(px) && px > 0 ? px : fb;
  };
  let resolvedBgBase = "";
  let colorScheme = serviceScheme;
  try {
    const bodyCS = getComputedStyle(hostEl);
    const rootCS = rootEl ? getComputedStyle(rootEl) : bodyCS;
    resolvedBgBase = readColor("var(--dsw-alias-bg-base)", "");
    if (!colorScheme) {
      if (hasDarkBody) colorScheme = "dark";
      else if (hasHostLight || attrTheme === "light") colorScheme = "light";
      else if (attrTheme === "dark") colorScheme = "dark";
      else if (attrThemeSource === "dark") colorScheme = "dark";
      else if (attrThemeSource === "light") colorScheme = "light";
      else if (attrThemeSource === "system") {
        const prefersDark = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)")?.matches;
        colorScheme = prefersDark ? "dark" : "light";
      } else {
        const parsedBase = parseCssColor(resolvedBgBase);
        if (parsedBase && parsedBase.a > 0) {
          const lum = relativeLuminance(parsedBase);
          colorScheme = lum !== null && lum < 0.45 ? "dark" : "light";
        } else {
          colorScheme = "light";
        }
      }
    }
    const isLight = colorScheme !== "dark";
    const fb = isLight ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME;
    const fontSize = readSize("var(--dsh-content-font-size, 14px)", 14);
    const secondaryFontSize = readSize(
      "var(--dsh-content-font-size-secondary, 13px)",
      fontSize <= 14 ? Math.max(10, fontSize - 1) : Math.max(13, fontSize - 2)
    );
    const codeFontSize = readSize("var(--dsh-code-font-size, 11px)", 11);
    const terminalFontSize = readSize("var(--dsh-terminal-font-size, 13px)", 13);
    const textFamilyOverride = bodyCS.getPropertyValue("--dsh-font-family-text")?.trim();
    const codeFamilyOverride = bodyCS.getPropertyValue("--dsh-font-family-code")?.trim();
    const termFamilyOverride = bodyCS.getPropertyValue("--dsh-font-family-terminal")?.trim();
    probe.style.fontFamily = textFamilyOverride ? `var(--dsh-font-family-text), var(--dsh-font-family-text-default, ${fb.fontFamily})` : `var(--dsw-font-family, var(--dsh-font-family-text-default, ${fb.fontFamily}))`;
    const fontFamily = getComputedStyle(probe).fontFamily || fb.fontFamily;
    probe.style.fontFamily = codeFamilyOverride ? `var(--dsh-font-family-code), var(--dsh-font-family-code-default, ${fb.codeFontFamily})` : `var(--ds-font-family-code, var(--dsh-font-family-code-default, ${fb.codeFontFamily}))`;
    const codeFontFamily = getComputedStyle(probe).fontFamily || fb.codeFontFamily;
    probe.style.fontFamily = termFamilyOverride ? `var(--dsh-font-family-terminal), var(--ds-font-family-code, ${codeFontFamily})` : codeFontFamily;
    const terminalFontFamily = getComputedStyle(probe).fontFamily || codeFontFamily;
    const backdropBlur = bodyCS.getPropertyValue("--dsw-mask-blur")?.trim() || "none";
    const rawBgLayer1 = readColor(`var(--dsw-alias-bg-layer-1, ${fb.bgLayer1})`, fb.bgLayer1);
    const rawBgLayer2 = readColor(`var(--dsw-alias-bg-layer-2, ${fb.bgLayer2})`, fb.bgLayer2);
    const rawBgLayer3 = readColor(`var(--dsw-alias-bg-layer-3, ${fb.bgLayer3})`, fb.bgLayer3);
    const rawBgOverlay = rawBgLayer2;
    const glassAttr = document.body?.getAttribute("data-we-glass-page") === "on";
    const isGlass = glassAttr || backdropBlur !== "none" && backdropBlur !== "";
    const wallpaperUnderlay = rootCS.getPropertyValue("--we-wallpaper-underlay")?.trim() || bodyCS.getPropertyValue("--we-wallpaper-underlay")?.trim() || "";
    const hasWallpaper = Boolean(document.body?.getAttribute("data-we-wallpaper") === "on" || wallpaperUnderlay);
    const readabilityBase = bodyCS.getPropertyValue("--we-readability-base")?.trim() || "";
    const solved = resolveReadableSurfaceAndInk({
      isLight,
      isGlass,
      bgBase: resolvedBgBase,
      bgLayer1: rawBgLayer1,
      bgLayer2: rawBgLayer2,
      bgLayer3: rawBgLayer3,
      bgOverlay: rawBgOverlay,
      wallpaperUnderlay: wallpaperUnderlay ? readColor("var(--we-wallpaper-underlay)", wallpaperUnderlay) : "",
      readabilityBase: readabilityBase ? readColor("var(--we-readability-base)", readabilityBase) : "",
      textPrimary: readColor(`var(--dsw-alias-label-primary, ${fb.textPrimary})`, fb.textPrimary),
      textSecondary: readColor(`var(--dsw-alias-label-secondary, ${fb.textSecondary})`, fb.textSecondary),
      textTertiary: readColor(`var(--dsw-alias-label-tertiary, ${fb.textTertiary})`, fb.textTertiary),
      hostTextPrimary: rootCS.getPropertyValue("--we-host-dsw-alias-label-primary")?.trim() || "",
      hostTextSecondary: rootCS.getPropertyValue("--we-host-dsw-alias-label-secondary")?.trim() || "",
      hostTextTertiary: rootCS.getPropertyValue("--we-host-dsw-alias-label-tertiary")?.trim() || "",
      accent: readColor(`var(--dsw-alias-state-business-primary, var(--we-accent, var(--dsw-alias-link, ${fb.accent})))`, fb.accent),
      accentInk: readColor(`var(--we-accent-ink, var(--dsw-alias-label-primary-foreground, ${fb.textPrimary}))`, ""),
      done: readColor(`var(--dsw-alias-state-success-primary, ${fb.done})`, fb.done),
      warn: readColor(`var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary, ${fb.warn}))`, fb.warn),
      error: readColor(`var(--dsw-alias-state-error-primary, ${fb.error})`, fb.error),
      review: readColor(`var(--dsw-alias-state-done-primary, ${fb.review})`, fb.review)
    });
    return Object.freeze({
      colorScheme: isLight ? "light" : "dark",
      isLight,
      isGlass,
      hasWallpaper,
      backdropBlur,
      fontFamily,
      codeFontFamily,
      terminalFontFamily,
      fontSize,
      secondaryFontSize,
      codeFontSize,
      terminalFontSize,
      bgBase: solved.bgBase,
      bgLayer1: solved.bgLayer1,
      bgLayer2: solved.bgLayer2,
      bgLayer3: solved.bgLayer3,
      bgOverlay: solved.bgOverlay,
      textPrimary: solved.textPrimary,
      textSecondary: solved.textSecondary,
      textTertiary: solved.textTertiary,
      borderColor: readColor(`var(--dsw-alias-border-l2, ${fb.borderColor})`, fb.borderColor),
      borderStrong: readColor(`var(--dsw-alias-border-l3, ${fb.borderStrong})`, fb.borderStrong),
      accent: solved.accent,
      accentText: solved.accentText,
      accentBorder: solved.accentBorder,
      accentBg: readColor(`var(--dsw-alias-state-business-tertiary, ${fb.accentBg})`, fb.accentBg),
      onAccent: solved.onAccent,
      done: solved.done,
      warn: solved.warn,
      error: solved.error,
      review: solved.review,
      cssVars: solved.cssVars,
      contrastMetrics: solved.contrastMetrics,
      exportTheme: {
        ...solved.exportTheme,
        fontFamily,
        codeFontFamily,
        fontSize,
        secondaryFontSize,
        codeFontSize
      }
    });
  } finally {
    probe.remove();
  }
}
function useHostTheme() {
  if (typeof import_react.default.useState !== "function" || typeof import_react.default.useEffect !== "function") {
    return readResolvedHostTheme();
  }
  const [theme, setTheme] = import_react.default.useState(() => readResolvedHostTheme());
  import_react.default.useEffect(() => {
    if (typeof document === "undefined") return;
    let raf = 0;
    const apply = () => {
      const next = readResolvedHostTheme();
      setTheme((prev) => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
    };
    const refresh = () => {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
      if (typeof requestAnimationFrame === "function") raf = requestAnimationFrame(apply);
      else apply();
    };
    refresh();
    const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(refresh) : null;
    if (observer && document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-ds-theme-source", "data-theme", "data-input-modality", "style", "class"]
      });
    }
    if (observer && document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: [
          "data-ds-dark-theme",
          "data-theme",
          "data-host-light",
          "data-we-glass-page",
          "data-we-glass-chat",
          "data-we-glass-window",
          "data-we-wallpaper",
          "style",
          "class"
        ]
      });
    }
    let unsubTheme = null;
    if (typeof hostContext?.on === "function") {
      try {
        unsubTheme = hostContext.on("theme/change", refresh);
      } catch {
      }
    }
    const media = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
    media?.addEventListener?.("change", refresh);
    if (typeof window !== "undefined") window?.addEventListener?.("storage", refresh);
    return () => {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
      observer?.disconnect();
      if (typeof unsubTheme === "function") unsubTheme();
      media?.removeEventListener?.("change", refresh);
      if (typeof window !== "undefined") window?.removeEventListener?.("storage", refresh);
    };
  }, []);
  return theme;
}
var hostContext = null;
function setHostContext(ctx) {
  hostContext = ctx || null;
}
function getHostContext() {
  return hostContext;
}
var pendingDrawerOpen = /* @__PURE__ */ new Map();
var drawerListeners = /* @__PURE__ */ new Set();
function requestMemberDrawerOpen(sessionId, memberId, extra = {}) {
  pendingDrawerOpen.set(sessionId, { memberId, ...extra, at: Date.now() });
  drawerListeners.forEach((fn2) => fn2(sessionId));
}
function consumeMemberDrawerOpen(sessionId) {
  const val = pendingDrawerOpen.get(sessionId) || null;
  if (val) pendingDrawerOpen.delete(sessionId);
  return val;
}
function onMemberDrawerRequest(listener) {
  drawerListeners.add(listener);
  return () => drawerListeners.delete(listener);
}
async function request2(path, init) {
  const res = await fetch(API + path, {
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    ...init
  });
  const text = await res.text();
  const body = text === "" ? null : JSON.parse(text);
  if (!res.ok) {
    const detail = body && body.detail ? body.detail : res.status;
    throw Object.assign(new Error(typeof detail === "string" ? detail : JSON.stringify(detail)), { status: res.status });
  }
  return body;
}
async function fetchMemberActivity(sessionId, memberId, { before = null, limit = 30 } = {}) {
  const params = new URLSearchParams({ sessionId, limit: String(limit) });
  if (memberId) params.set("memberId", memberId);
  if (before !== null && before !== void 0 && String(before) !== "") params.set("before", String(before));
  return await request2("/members/activity?" + params.toString());
}
function fetchMemberDuties(sessionId, memberId) {
  return request2("/members/duties?" + new URLSearchParams({ sessionId, memberId }));
}
function updateMemberDuties(sessionId, memberId, change) {
  return request2("/members/duties", {
    method: "POST",
    body: JSON.stringify({ sessionId, memberId, ...change })
  });
}
async function saveViewObjectUserLayout(sessionId, payload) {
  return await request2("/view-objects/user-layout", {
    method: "POST",
    body: JSON.stringify({ ...payload, sessionId })
  });
}
async function importExcalidrawBoard(sessionId, file) {
  const params = new URLSearchParams({ sessionId, filename: file.name });
  return await request2("/view-objects/import-excalidraw?" + params.toString(), {
    method: "POST",
    body: file
  });
}
async function saveUserViewPreferences(sessionId, payload) {
  return await request2("/view-preferences", {
    method: "POST",
    body: JSON.stringify({ ...payload, sessionId })
  });
}
async function fetchRuns() {
  return await request2("/runs");
}
async function launchTeamSession(payload) {
  return await request2("/teams/launch", {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
}
async function revealSession(payload) {
  return await request2("/sessions/reveal", {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
}
async function fetchUnknownExecutions() {
  return await request2("/recovery/unknown");
}
async function reconcileUnknownExecution(payload) {
  return await request2("/recovery/reconcile", {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
}
async function adjudicateRecoveryExecution(payload) {
  return await request2("/recovery/adjudicate", {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
}
async function openHostSession(sessionId, { teamSessionId = "", openTeamTab = true } = {}) {
  const revealed = await revealSession({ sessionId, teamSessionId });
  const targetSid = revealed?.sessionId || sessionId;
  const hostCtx = getHostContext();
  let uiWs = null;
  try {
    uiWs = hostCtx?.get?.("uiWorkspace") ?? null;
  } catch {
    uiWs = null;
  }
  let navigated = false;
  if (uiWs && typeof uiWs.openSession === "function") {
    await uiWs.openSession(targetSid);
    navigated = true;
  }
  if (typeof document !== "undefined") {
    const settingsCloseBtn = [...document.querySelectorAll(".AnXs9G_overlay button")].find((btn) => /关闭|Close/i.test(`${btn.getAttribute("aria-label") || ""} ${btn.getAttribute("title") || ""} ${btn.textContent || ""}`));
    if (settingsCloseBtn) settingsCloseBtn.click();
  }
  if (openTeamTab && typeof document !== "undefined" && targetSid) {
    setTimeout(() => {
      selectHostTeamTab(targetSid, true);
    }, 160);
    setTimeout(() => {
      selectHostTeamTab(targetSid, true);
    }, 480);
  }
  return { ...revealed, navigated };
}
var sessionViewStates = /* @__PURE__ */ new Map();
var VIEW_STATE_KEY_PREFIX = "concerto.viewState.";
function defaultViewState() {
  return {
    activeTab: "overview",
    selectedTaskId: "",
    artifactFilters: { taskId: "all", memberId: "all", type: "all" },
    scrollTop: 0,
    canvasViewports: {}
  };
}
function selectedTaskFromState(state) {
  if (typeof state?.selectedTaskId === "string") return state.selectedTaskId;
  return Array.isArray(state?.expandedTaskIds) && state.expandedTaskIds.length > 0 ? String(state.expandedTaskIds.at(-1)) : "";
}
function readSessionViewState(sessionId) {
  const key = String(sessionId || "");
  if (!key) return defaultViewState();
  if (sessionViewStates.has(key)) {
    const cached = sessionViewStates.get(key);
    return {
      ...defaultViewState(),
      ...cached,
      selectedTaskId: selectedTaskFromState(cached),
      artifactFilters: { ...defaultViewState().artifactFilters, ...cached.artifactFilters || {} },
      canvasViewports: { ...cached.canvasViewports || {} }
    };
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(VIEW_STATE_KEY_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const merged = {
            ...defaultViewState(),
            ...parsed,
            selectedTaskId: selectedTaskFromState(parsed),
            artifactFilters: { ...defaultViewState().artifactFilters, ...parsed.artifactFilters || {} },
            canvasViewports: parsed.canvasViewports && typeof parsed.canvasViewports === "object" ? parsed.canvasViewports : {}
          };
          sessionViewStates.set(key, merged);
          return merged;
        }
      }
    }
  } catch {
  }
  const init = defaultViewState();
  sessionViewStates.set(key, init);
  return init;
}
function writeSessionViewState(sessionId, patch = {}) {
  const key = String(sessionId || "");
  if (!key || !patch || typeof patch !== "object") return defaultViewState();
  const cur = readSessionViewState(key);
  const next = {
    ...cur,
    ...patch,
    ...typeof patch.selectedTaskId === "string" ? { selectedTaskId: patch.selectedTaskId } : {},
    ...patch.artifactFilters ? { artifactFilters: { ...cur.artifactFilters, ...patch.artifactFilters } } : {},
    ...patch.canvasViewports ? { canvasViewports: { ...cur.canvasViewports, ...patch.canvasViewports } } : {}
  };
  sessionViewStates.set(key, next);
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(VIEW_STATE_KEY_PREFIX + key, JSON.stringify(next));
    }
  } catch {
  }
  return next;
}
function readCanvasViewport(sessionId, objectId) {
  if (!sessionId || !objectId) return { scale: 1, panX: 0, panY: 0, collapsedIds: [], modalTransform: null };
  const vs = readSessionViewState(sessionId);
  const vp = vs.canvasViewports?.[objectId];
  const mt = vp?.modalTransform;
  return {
    scale: typeof vp?.scale === "number" && Number.isFinite(vp.scale) ? vp.scale : 1,
    panX: typeof vp?.panX === "number" && Number.isFinite(vp.panX) ? vp.panX : 0,
    panY: typeof vp?.panY === "number" && Number.isFinite(vp.panY) ? vp.panY : 0,
    collapsedIds: Array.isArray(vp?.collapsedIds) ? [...vp.collapsedIds] : null,
    modalTransform: mt && typeof mt === "object" && Number.isFinite(mt.k) && mt.k > 0 ? { k: mt.k, x: Number.isFinite(mt.x) ? mt.x : 0, y: Number.isFinite(mt.y) ? mt.y : 0 } : null
  };
}
function writeCanvasViewport(sessionId, objectId, patch) {
  if (!sessionId || !objectId) return null;
  const prev = readCanvasViewport(sessionId, objectId);
  const next = {
    ...prev,
    ...patch,
    ...patch.collapsedIds !== void 0 ? { collapsedIds: Array.isArray(patch.collapsedIds) ? [...patch.collapsedIds] : null } : {}
  };
  writeSessionViewState(sessionId, {
    canvasViewports: { [objectId]: next }
  });
  return next;
}
function readHostChatMessages(sessionId) {
  try {
    const uiConv = hostContext?.uiConversation;
    if (!uiConv || typeof uiConv.binding !== "function") return { supported: false, messages: [] };
    const binding = uiConv.binding(sessionId);
    const chatTarget = typeof binding?.target === "function" ? binding.target("chat") : null;
    if (!chatTarget) return { supported: false, messages: [] };
    const rawTurns = Array.isArray(chatTarget.turns) ? chatTarget.turns : typeof chatTarget.getSnapshot === "function" ? chatTarget.getSnapshot()?.turns ?? [] : [];
    if (!Array.isArray(rawTurns)) return { supported: true, messages: [] };
    const messages = [];
    for (const turn of rawTurns) {
      if (!turn) continue;
      const steps = Array.isArray(turn.steps) ? turn.steps : [turn];
      for (const step of steps) {
        const text = typeof step?.text === "string" ? step.text : Array.isArray(step?.content) ? step.content.filter((b) => b?.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n") : "";
        if (text && text.trim()) {
          messages.push({
            id: step.id || turn.id || `turn-${messages.length}`,
            role: step.role || "assistant",
            text: text.trim(),
            recordedAt: step.createdAt || turn.createdAt || null
          });
        }
      }
    }
    return { supported: true, messages };
  } catch {
    return { supported: false, messages: [] };
  }
}
var sessionReaders = /* @__PURE__ */ new Map();
function sessionReader(sessionId) {
  if (sessionReaders.has(sessionId)) return sessionReaders.get(sessionId);
  let value = { info: null, error: "", loaded: false };
  const listeners = /* @__PURE__ */ new Set();
  let stop;
  let refresh = () => {
  };
  const publish = (next) => {
    value = next;
    listeners.forEach((notify) => notify());
  };
  function start() {
    let disposed = false;
    let timer;
    let sseTimer;
    let sseConnected = false;
    let eventSource = null;
    let inFlight = false;
    const controller = new AbortController();
    async function load() {
      if (disposed || inFlight) return;
      inFlight = true;
      try {
        const info = await request2("/session?sessionId=" + encodeURIComponent(sessionId), { signal: controller.signal });
        if (!disposed) {
          publish({
            info: value.info && value.info.snapshot?.serverTime > info.snapshot?.serverTime ? value.info : info,
            error: "",
            loaded: true
          });
        }
      } catch (error) {
        if (!disposed) {
          publish(error.status === 404 ? { info: null, error: "", loaded: true } : { ...value, error: "\u540C\u6B65\u5931\u8D25\uFF1A" + error.message, loaded: true });
        }
      } finally {
        inFlight = false;
        if (!disposed) {
          const fallbackDelay = typeof document !== "undefined" && document.hidden ? 15e3 : sseConnected ? 12e3 : 2e3;
          timer = setTimeout(load, fallbackDelay);
        }
      }
    }
    refresh = () => {
      clearTimeout(timer);
      load();
    };
    if (typeof EventSource === "function" && sessionId) {
      try {
        eventSource = new EventSource(API + "/events?sessionId=" + encodeURIComponent(sessionId));
        eventSource.addEventListener("ready", () => {
          sseConnected = true;
        });
        eventSource.addEventListener("update", () => {
          sseConnected = true;
          clearTimeout(sseTimer);
          sseTimer = setTimeout(refresh, 40);
        });
        eventSource.onerror = () => {
          sseConnected = false;
        };
      } catch {
        sseConnected = false;
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", refresh);
    }
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("online", refresh);
    }
    load();
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(sseTimer);
      try {
        eventSource?.close();
      } catch {
      }
      controller.abort();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", refresh);
      }
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("online", refresh);
      }
    };
  }
  const reader = {
    getSnapshot: () => value,
    refresh: () => refresh(),
    subscribe(notify) {
      listeners.add(notify);
      if (listeners.size === 1) stop = start();
      return () => {
        listeners.delete(notify);
        if (listeners.size === 0) stop?.();
      };
    }
  };
  sessionReaders.set(sessionId, reader);
  return reader;
}
function useTeamSession(sessionId) {
  const reader = import_react.default.useMemo(() => sessionReader(sessionId), [sessionId]);
  return { ...import_react.default.useSyncExternalStore(reader.subscribe, reader.getSnapshot), refresh: reader.refresh };
}
var roster = (snapshot) => {
  if (!snapshot?.metadata) return [];
  return [{ ...snapshot.metadata.commander, roleKind: "commander" }, ...snapshot.metadata.members || []];
};
var pendingRequests = (snapshot) => (snapshot?.requests || []).filter((r) => ["pending", "decided", "delivery_failed"].includes(r.status));
function memberState(snapshot, member) {
  if (!snapshot || !member) return "idle";
  const execution = (snapshot.executions || []).filter((e) => e.memberId === member.id).at(-1);
  const task = execution && (snapshot.tasks || []).find((t) => t.executionId === execution.executionId);
  if (execution?.state === "unknown") return "unknown";
  if (execution?.kind === "review") {
    if (execution.state === "running" || execution.state === "waiting_input" || execution.state === "waiting_approval") {
      return execution.state;
    }
    if (execution.state === "interrupting") return "cancelling";
    return "idle";
  }
  if (task?.viewState) return task.viewState;
  return member.roleKind === "commander" ? "\u534F\u8C03" : "idle";
}
async function fetchViewObjectVersion(sessionId, id, version) {
  const params = new URLSearchParams({ sessionId: String(sessionId || ""), id: String(id || "") });
  if (Number.isInteger(version)) params.set("version", String(version));
  return request2("/view-objects/read?" + params.toString());
}
var autoOpenedSessions = /* @__PURE__ */ new Set();
function findTeamTab() {
  if (typeof document === "undefined") return null;
  const tabs = [...document.querySelectorAll('[data-conversation-tabs] [role="tab"]')];
  return tabs.find((el) => /团队|Team/i.test(el.textContent || "")) || null;
}
function syncHostTeamTabVisibility(visible) {
  if (typeof document === "undefined") return;
  const tab = findTeamTab();
  if (!tab) return;
  if (visible) {
    tab.hidden = false;
    if (tab.style.display === "none") tab.style.display = "";
    return;
  }
  tab.hidden = true;
  tab.style.display = "none";
  if (tab.getAttribute("aria-selected") === "true") {
    const tabs = [...document.querySelectorAll('[data-conversation-tabs] [role="tab"]')];
    const chatTab = tabs.find((el) => el !== tab && !el.hidden && el.style.display !== "none");
    if (chatTab) chatTab.click();
  }
}
function selectHostTeamTab(sessionId, force = false) {
  if (typeof document === "undefined" || !sessionId) return false;
  if (!force && autoOpenedSessions.has(sessionId)) return false;
  let saved = null;
  try {
    saved = localStorage.getItem("dsh.conversation." + sessionId);
  } catch {
    saved = null;
  }
  if (!force && saved && !saved.includes('"chat"')) return false;
  const tab = findTeamTab();
  if (!tab) return false;
  autoOpenedSessions.add(sessionId);
  if (tab.getAttribute("aria-selected") !== "true") {
    tab.click();
  }
  return true;
}

// packages/dsh-concerto/src/client/components/Panels.js
var import_react5 = __toESM(require_react(), 1);

// packages/dsh-concerto/src/client/styles.js
var import_react2 = __toESM(require_react(), 1);
var BASELINE_ROOT_CSS = `:where(:root){${Object.entries(HOST_FALLBACK_CSS_VARS).map(([k, v]) => `${k}:${v};`).join("")}}`;
var TEAM_CSS = `
  ${BASELINE_ROOT_CSS}
  .concerto-surface {
    box-sizing: border-box;
    --cc-radius-xs: var(--dsw-radius-xs, 4px);
    --cc-radius-card: var(--dsw-radius-md, var(--cc-fb-radius-md));
    --cc-radius-ctrl: var(--dsw-radius-sm, var(--cc-fb-radius-sm));
    --cc-radius-lg: var(--dsw-radius-lg, var(--cc-fb-radius-lg));
    --cc-radius-xl: var(--dsw-radius-xl, var(--dsw-radius-lg, var(--cc-fb-radius-lg)));
    --cc-radius-pill: var(--cc-fb-radius-pill);
    --cc-corner-shape: var(--dsw-corner-shape, round);

    /* DSH motion language */
    --cc-ease: var(--ds-ease-in-out, cubic-bezier(.4, 0, .2, 1));
    --cc-dur-fast: var(--ds-transition-duration-fast, .1s);
    --cc-dur: var(--ds-transition-duration, .2s);
    --cc-dur-slow: var(--ds-transition-duration-slow, .3s);

    --cc-font-sans: var(--dsw-font-family, var(--dsh-font-family-text-default, system-ui, sans-serif));
    --cc-font-mono: var(--ds-font-family-code, var(--dsh-font-family-code-default, ui-monospace, monospace));
    --cc-font-size: var(--dsh-content-font-size, 1em);
    --cc-font-size-secondary: var(--dsh-content-font-size-secondary, 0.92em);

    /* DSH type ramp (11/12/13/14/16/20/24) shifted by the host content-size setting,
       the same way DSH applies --dsh-content-font-delta to its own UI. */
    --cc-fs-delta: calc(var(--cc-font-size) - 14px);
    --cc-fs-display: calc(20px + var(--cc-fs-delta));
    --cc-fs-title: calc(16px + var(--cc-fs-delta));
    --cc-fs-body: var(--cc-font-size);
    --cc-fs-meta: var(--cc-font-size-secondary);
    --cc-fs-caption: calc(12px + var(--cc-fs-delta));
    --cc-fs-micro: calc(11px + var(--cc-fs-delta));
    --cc-fs-code: var(--dsh-code-font-size, 0.85em);
    --cc-fs-terminal: var(--dsh-terminal-font-size, 0.92em);
    --cc-fw-strong: 500;
    --cc-fw-heading: 600;

    /* 4px spacing ladder */
    --cc-space-1: 4px;
    --cc-space-2: 8px;
    --cc-space-3: 12px;
    --cc-space-4: 16px;
    --cc-space-5: 20px;
    --cc-space-6: 24px;

    /* Host surfaces, glass material, hairline borders & elevations */
    --cc-card-bg: var(--cc-contrast-card-bg, var(--dsw-alias-bg-layer-1, var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-base, var(--cc-fb-bg-layer-1)))));
    --cc-card-nested-bg: var(--cc-contrast-nested-bg, var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-2, var(--cc-fb-bg-layer-2))));
    --cc-panel-bg: var(--cc-contrast-panel-bg, var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, var(--cc-fb-bg-layer-2))));
    --cc-canvas-bg: var(--cc-contrast-canvas-bg, var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base, var(--cc-fb-bg-layer-1))));
    /* Floating surfaces follow DSH popovers (layer-2). --dsw-alias-bg-overlay is a mid-grey
       hover/press fill in DSH, not a surface, so it is only used for pressed states. */
    --cc-overlay-bg: var(--cc-contrast-overlay-bg, var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, var(--cc-fb-bg-layer-2))));
    --cc-pressed-bg: var(--dsw-alias-bg-overlay, var(--cc-card-nested-bg));
    --cc-menu-bg: var(--cc-contrast-overlay-bg, var(--dsw-specific-menu, var(--cc-overlay-bg)));
    --cc-menu-blur: var(--dsw-menu-backdrop-filter, var(--cc-backdrop-blur));
    --cc-input-bg: var(--dsw-specific-input-major, var(--cc-card-nested-bg));
    --cc-skeleton: var(--dsw-alias-bg-skeleton, var(--cc-card-nested-bg));
    --cc-hover: var(--dsw-alias-interactive-bg-hover, var(--cc-accent-soft));
    --cc-active: var(--dsw-alias-interactive-bg-active, var(--cc-accent-hover));
    --cc-backdrop-blur: var(--dsw-mask-blur, none);

    --cc-border: var(--dsw-alias-border-l2, var(--cc-fb-border));
    --cc-border-subtle: var(--dsw-alias-border-l1, var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l2, var(--cc-fb-border-subtle))));
    --cc-border-strong: var(--dsw-alias-border-l3, var(--cc-fb-border-strong));
    --cc-shadow-soft: var(--dsw-elevation-soft, var(--dsw-shadow-lv1, var(--cc-fb-shadow-soft)));
    --cc-shadow-panel: var(--dsw-elevation-panel, var(--dsw-shadow-lv1, var(--cc-fb-shadow-panel)));
    --cc-shadow-prominent: var(--dsw-elevation-prominent, var(--dsw-shadow-lv3, var(--cc-fb-shadow-prominent)));
    --cc-shadow-pop: var(--dsw-shadow-lv3, var(--cc-shadow-prominent));
    --cc-focus-ring: var(--dsw-focus-ring-color, var(--cc-accent));

    /* Contrast-checked ink hierarchy */
    --cc-text-primary: var(--cc-contrast-text-primary, var(--dsw-alias-label-primary, var(--cc-fb-text-primary)));
    --cc-text-secondary: var(--cc-contrast-text-secondary, var(--dsw-alias-label-secondary, var(--cc-fb-text-secondary)));
    --cc-text-muted: var(--cc-contrast-text-tertiary, var(--dsw-alias-label-tertiary, var(--cc-fb-text-tertiary)));

    /* Host foreground accent & interactive derivatives */
    --cc-accent: var(--dsw-alias-state-business-primary, var(--we-accent, var(--dsw-alias-link, var(--dsw-alias-brand-primary, var(--cc-fb-accent)))));
    --cc-accent-fill: var(--cc-accent);
    --cc-accent-text: var(--cc-contrast-accent-text, var(--cc-accent));
    --cc-on-accent: var(--we-accent-ink, var(--dsw-alias-label-primary-foreground, var(--cc-fb-text-inverted)));
    --cc-accent-soft: color-mix(in srgb, var(--cc-accent) 16%, transparent);
    --cc-accent-hover: var(--dsw-alias-interactive-bg-hover-accent, color-mix(in srgb, var(--cc-accent) 24%, transparent));
    --cc-accent-border: var(--cc-contrast-accent-border, color-mix(in srgb, var(--cc-accent) 48%, transparent));
    --cc-accent-tint: var(--dsw-alias-state-business-tertiary, var(--cc-accent-soft));

    /* DSH primary buttons are the neutral brand ink (black on light, white on dark);
       the business accent stays for links, selection and live state. */
    --cc-primary-fill: var(--dsw-alias-button-primary-fill, var(--cc-accent-fill));
    --cc-primary-hover: var(--dsw-alias-button-primary-hover, var(--cc-accent-fill));
    --cc-on-primary: var(--dsw-alias-label-primary-foreground, var(--cc-on-accent));

    /* Semantic status tokens (independent of accent hue, translucent tints safe in both polarities) */
    --cc-state-running: var(--cc-accent-text);
    --cc-state-running-bg: var(--cc-accent-soft);
    --cc-state-attention: var(--cc-contrast-warn, var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary, var(--cc-fb-warn))));
    --cc-state-attention-bg: color-mix(in srgb, var(--cc-state-attention) 16%, transparent);
    --cc-state-review: var(--cc-contrast-review, var(--dsw-alias-state-done-primary, var(--cc-fb-review)));
    --cc-state-review-bg: color-mix(in srgb, var(--cc-state-review) 16%, transparent);
    --cc-state-done: var(--cc-contrast-done, var(--dsw-alias-state-success-primary, var(--cc-fb-done)));
    --cc-state-done-bg: color-mix(in srgb, var(--cc-state-done) 16%, transparent);
    --cc-state-blocked: var(--cc-contrast-error, var(--dsw-alias-state-error-primary, var(--cc-fb-error)));
    --cc-state-blocked-bg: color-mix(in srgb, var(--cc-state-blocked) 16%, transparent);
    --cc-state-unknown: var(--cc-text-muted);
    --cc-state-unknown-bg: color-mix(in srgb, var(--cc-state-unknown) 15%, transparent);
    --cc-state-idle: var(--dsw-alias-state-idle-primary, var(--cc-text-muted));

    /* Structure & mindmap branch intensity ramp */
    --cc-branch-1: var(--cc-accent-text);
    --cc-branch-2: color-mix(in srgb, var(--cc-accent-text) 72%, var(--cc-text-secondary));
    --cc-branch-3: color-mix(in srgb, var(--cc-accent-text) 52%, var(--cc-text-secondary));
    --cc-branch-4: color-mix(in srgb, var(--cc-accent-text) 36%, var(--cc-text-secondary));

    color: var(--cc-text-primary);
    font-family: var(--cc-font-sans);
    font-size: var(--cc-font-size);
    line-height: 1.6;
  }
  .concerto-surface *, .concerto-surface *::before, .concerto-surface *::after { box-sizing: border-box; }
  .concerto-surface :is(h2, h3) { font-family: var(--cc-font-sans); font-size: var(--cc-fs-title); font-weight: var(--cc-fw-heading); line-height: 1.5; color: var(--cc-text-primary); margin: 0; overflow-wrap: anywhere; }
  .concerto-surface strong { font-weight: var(--cc-fw-strong); }
  .concerto-surface { scrollbar-width: thin; scrollbar-color: var(--dsh-scrollbar-thumb, var(--dsw-alias-scrollbar-bg-l1, var(--cc-border-strong))) transparent; }
  .concerto-surface ::selection { background: var(--dsw-alias-bg-document-selection, var(--cc-accent-soft)); }
  .concerto-surface .concerto-dialog-title { font-size: var(--cc-fs-title); }
  .concerto-surface p { font: inherit; margin: var(--cc-space-1) 0; }
  .concerto-surface code, .concerto-surface pre { font-family: var(--cc-font-mono); font-size: var(--cc-fs-code); }
  .concerto-surface :where(button, textarea, select, input) { font-family: inherit; font-size: var(--cc-fs-meta); color: inherit; }
  .concerto-surface button:disabled { opacity: .45; cursor: not-allowed; }
  .concerto-surface :is(button, input, textarea, summary, [tabindex], select):focus-visible {
    outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--cc-accent));
    outline-offset: 2px;
  }
  .concerto-num { font-variant-numeric: tabular-nums; }
  .concerto-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
  .concerto-field { display: flex; flex-direction: column; gap: 6px; margin-block: var(--cc-space-3); min-width: 0; }
  .concerto-field > label { font-size: var(--cc-fs-meta); font-weight: var(--cc-fw-strong); }
  .concerto-field-hint { color: var(--cc-text-secondary); font-size: var(--cc-fs-caption) !important; margin: 0 !important; }
  .concerto-field-error { color: var(--cc-state-blocked); font-size: var(--cc-fs-meta); margin-block: 4px; }
  .concerto-input, .concerto-textarea {
    width: 100%; min-width: 0; min-height: 36px; padding: 7px 11px; font: inherit;
    border: 1px solid var(--cc-border); border-radius: var(--cc-radius-ctrl); corner-shape: var(--cc-corner-shape);
    background: var(--cc-input-bg); color: var(--cc-text-primary);
    transition: border-color var(--cc-dur-fast) var(--cc-ease), box-shadow var(--cc-dur-fast) var(--cc-ease);
  }
  .concerto-input::placeholder, .concerto-textarea::placeholder { color: var(--cc-text-muted); }
  .concerto-input:hover, .concerto-textarea:hover { border-color: var(--cc-border-strong); }
  .concerto-surface :is(.concerto-input, .concerto-textarea):focus-visible { outline: none; border-color: var(--cc-accent-border); box-shadow: 0 0 0 3px var(--cc-accent-soft); }
  .concerto-textarea { resize: vertical; min-height: 76px; line-height: 1.6; }
  .concerto-surface :is(.concerto-input, .concerto-textarea):user-invalid { border-color: var(--cc-state-blocked); }
  .concerto-feedback { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--cc-space-2); padding: var(--cc-space-2) var(--cc-space-3); border: 1px solid color-mix(in srgb, var(--cc-state-attention) 30%, transparent); border-radius: var(--cc-radius-ctrl); corner-shape: var(--cc-corner-shape); background: var(--cc-state-attention-bg); font-size: var(--cc-fs-meta); overflow-wrap: anywhere; }
  .concerto-feedback[data-tone="error"] { border-color: color-mix(in srgb, var(--cc-state-blocked) 30%, transparent); background: var(--cc-state-blocked-bg); }
  .concerto-plan-confirmation { margin-block-end: var(--cc-space-2); }
  .concerto-plan-confirmation[data-state="approved"] { border-color: var(--cc-border-subtle); background: var(--cc-card-bg); }
  .concerto-plan-actions { display: flex; flex-wrap: wrap; gap: var(--cc-space-2); }
  .concerto-inline-editor { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-block-end: 8px; }
  .concerto-inline-editor label { font-size: var(--cc-fs-meta); font-weight: var(--cc-fw-strong); }
  .concerto-inline-editor .concerto-input { flex: 1 1 180px; }
  .concerto-kpi-accent { color: var(--cc-text-primary); font-weight: var(--cc-fw-heading); font-variant-numeric: tabular-nums; }
  .concerto-id { font-family: var(--cc-font-mono); font-size: var(--cc-fs-caption); font-variant-numeric: tabular-nums; }
  .concerto-quiet { color: var(--cc-text-muted); font-size: var(--cc-fs-caption); font-weight: 400; }
  .concerto-icon { display: inline-block; flex: none; vertical-align: -2px; }
  .concerto-quiet .concerto-icon { margin-right: 4px; }
  .concerto-group-label { display: flex; align-items: center; gap: var(--cc-space-2); font-size: var(--cc-fs-caption); font-weight: var(--cc-fw-strong); color: var(--cc-text-muted); }

  /* Interactive grammar: btn / tag / badge / chip / link \u2014 mirrors DSH button tokens */
  .concerto-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 32px; padding: 4px var(--cc-space-3);
    border: 1px solid var(--cc-border); border-radius: var(--cc-radius-ctrl); corner-shape: var(--cc-corner-shape);
    background: var(--dsw-alias-button-elevated-fill, var(--cc-card-bg)); color: var(--cc-text-primary);
    font-size: var(--cc-fs-meta); font-weight: var(--cc-fw-strong); line-height: 1.4; cursor: pointer;
    transition: border-color var(--cc-dur-fast) var(--cc-ease), background-color var(--cc-dur-fast) var(--cc-ease), color var(--cc-dur-fast) var(--cc-ease), transform var(--cc-dur-fast) var(--cc-ease);
    white-space: nowrap;
  }
  .concerto-btn:hover:not(:disabled) { border-color: var(--cc-border-strong); background: var(--dsw-alias-interactive-bg-hover-solid, var(--cc-hover)); }
  .concerto-btn:active:not(:disabled) { background: var(--cc-active); transform: scale(.98); }
  .concerto-btn--primary { border-color: transparent; background: var(--cc-primary-fill); color: var(--cc-on-primary); }
  .concerto-btn--primary:hover:not(:disabled) { border-color: transparent; background: var(--cc-primary-hover); color: var(--cc-on-primary); }
  .concerto-btn--primary:active:not(:disabled) { background: var(--cc-primary-fill); }
  .concerto-btn--attn { border-color: transparent; background: var(--cc-state-attention-bg); color: var(--cc-state-attention); }
  .concerto-btn--attn:hover:not(:disabled) { border-color: transparent; background: color-mix(in srgb, var(--cc-state-attention) 22%, transparent); }
  .concerto-btn--ghost { border-color: transparent; background: transparent; color: var(--cc-text-secondary); }
  .concerto-btn--ghost:hover:not(:disabled) { border-color: transparent; background: var(--cc-hover); color: var(--cc-text-primary); }
  .concerto-btn--danger { border-color: transparent; background: transparent; color: var(--cc-state-blocked); }
  .concerto-btn--danger:hover:not(:disabled) { border-color: transparent; background: var(--dsw-alias-interactive-bg-hover-danger, var(--cc-state-blocked-bg)); }
  .concerto-btn--icon { width: 32px; min-width: 32px; padding: 0; }
  .concerto-btn[aria-pressed="true"] { border-color: var(--cc-accent-border); background: var(--cc-accent-soft); color: var(--cc-accent-text); }
  .concerto-btn--pin[aria-pressed="true"] { border-color: transparent; background: var(--cc-accent-soft); color: var(--cc-accent-text); }
  .concerto-canvas-btns .concerto-btn:focus-visible,
  .concerto-stage-tools .concerto-btn:focus-visible { outline-width: 1px; outline-offset: 1px; }
  @media (pointer: coarse) {
    .concerto-btn, button.concerto-chip { min-height: 44px; min-width: 44px; }
    .concerto-btn--icon { width: 44px; min-width: 44px; }
    .concerto-mm-hit { r: 22px; }
  }

  .concerto-tag, .concerto-chip, .concerto-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 1px 8px; border-radius: var(--cc-radius-pill); corner-shape: round;
    font-size: var(--cc-fs-caption); line-height: 1.5; white-space: nowrap;
  }
  .concerto-tag { background: var(--cc-card-nested-bg); color: var(--cc-text-secondary); border: 0; font-weight: 400; }
  .concerto-badge { background: var(--cc-accent-soft); color: var(--cc-accent-text); border: 0; font-weight: var(--cc-fw-strong); }
  .concerto-chip {
    background: var(--cc-accent-soft);
    color: var(--cc-accent-text);
    border: 1px solid transparent;
    cursor: pointer; font-weight: 400;
    transition: border-color var(--cc-dur-fast) var(--cc-ease), background-color var(--cc-dur-fast) var(--cc-ease);
  }
  .concerto-chip:hover { border-color: var(--cc-accent-border); background: var(--cc-accent-hover); }
  span.concerto-chip { cursor: default; }
  button.concerto-chip { min-height: 24px; }
  .concerto-link { border: 0; background: none; padding: 0; color: var(--cc-accent-text); font-size: var(--cc-fs-meta); font-weight: 400; cursor: pointer; text-underline-offset: 3px; }
  .concerto-link:hover { text-decoration: underline; }
  .concerto-panel {
    position: fixed;
    top: 72px;
    right: 20px;
    width: min(440px, calc(100vw - 32px));
    max-height: calc(100dvh - 320px);
    overflow: auto;
    z-index: 1000;
    padding: var(--cc-space-4) var(--cc-space-5);
    background: var(--cc-panel-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-lg);
    corner-shape: var(--cc-corner-shape);
    box-shadow: var(--cc-shadow-prominent);
  }
  .concerto-dock {
    display: flex;
    align-items: center;
    gap: var(--cc-space-2);
    flex-wrap: wrap;
    background: var(--cc-overlay-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-card);
    corner-shape: var(--cc-corner-shape);
    box-shadow: var(--cc-shadow-soft);
    padding: 6px 10px;
  }

  .concerto-sprite {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    min-height: 44px;
    border: 1px solid transparent;
    border-radius: var(--cc-radius-card);
    corner-shape: var(--cc-corner-shape);
    background: var(--cc-card-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    color: var(--cc-text-primary);
    cursor: pointer;
    text-align: left;
    flex: none;
    transition: border-color var(--cc-dur-fast) var(--cc-ease), background-color var(--cc-dur-fast) var(--cc-ease);
  }
  .concerto-sprite:hover {
    background: var(--cc-hover);
  }
  .concerto-sprite[aria-pressed="true"] {
    border-color: var(--cc-accent-border);
    background: var(--cc-accent-soft);
  }
  .concerto-sprite[aria-pressed="true"] .concerto-sprite-meta strong { color: var(--cc-accent-text); }
  .concerto-sprite-meta { min-width: 0; max-width: 190px; }
  .concerto-sprite-meta strong { display: block; font-size: var(--cc-fs-meta); font-weight: var(--cc-fw-strong); line-height: 1.45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .concerto-sprite small { display: block; color: var(--cc-text-muted); font-size: var(--cc-fs-caption); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .concerto-sprite svg { flex: none; }
  .concerto-sprite[data-state="running"] .concerto-halo-pulse { animation: concerto-pulse 2.1s ease-in-out infinite; }
  .concerto-sprite[data-state="attention"] svg { animation: concerto-float 2.4s ease-in-out infinite; }

  [data-concerto-member-row] { display: flex !important; flex-direction: row !important; align-items: flex-start; gap: 12px !important; }
  [data-concerto-member-row] > .we-avatar { display: none !important; }
  [data-concerto-member-row] > [data-slot="conversation.chat.node"] > * { flex: 1 1 auto; min-width: 0; }
  [data-concerto-member-row] > .concerto-message-avatar { order: -1; flex: 0 0 48px !important; width: 48px; }
  .concerto-message-avatar button {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 48px;
    min-height: 60px;
    padding: 4px 2px;
    background: var(--cc-card-nested-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    color: var(--cc-text-secondary);
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-card);
    corner-shape: var(--cc-corner-shape);
    font-family: var(--cc-font-sans);
    font-size: var(--cc-fs-micro);
    font-weight: var(--cc-fw-strong);
    line-height: 1.3;
    cursor: pointer;
    transition: background-color var(--cc-dur-fast) var(--cc-ease), border-color var(--cc-dur-fast) var(--cc-ease);
  }
  .concerto-message-avatar button:hover {
    border-color: var(--cc-border);
    background: var(--cc-hover);
    color: var(--cc-text-primary);
  }
  .concerto-message-avatar button[data-state="attention"] svg { animation: concerto-float 2.4s ease-in-out infinite; }
  .concerto-message-avatar small { font: inherit; max-width: 44px; overflow-wrap: anywhere; }

  .concerto-turn-anchor { display: contents; }
  .concerto-turn-card {
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-lg);
    corner-shape: var(--cc-corner-shape);
    background: var(--cc-card-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    box-shadow: var(--cc-shadow-soft);
    margin: 8px 0;
    padding: var(--cc-space-4);
    max-width: 100%;
    min-width: 0;
  }
  .concerto-tool-card {
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-card);
    corner-shape: var(--cc-corner-shape);
    background: var(--cc-card-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    box-shadow: var(--cc-shadow-soft);
    color: var(--cc-text-secondary);
  }
  .concerto-turn-heading { display: flex; gap: var(--cc-space-2); align-items: center; flex-wrap: wrap; }
  .concerto-turn-heading strong { flex: 1; font-weight: var(--cc-fw-heading); }
  .concerto-turn-heading small { color: var(--cc-text-muted); }
  .concerto-turn-members { display: flex; flex-wrap: wrap; gap: var(--cc-space-2); margin-top: var(--cc-space-3); }
  .concerto-turn-member {
    display: flex;
    flex: 1 1 140px;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 9px 10px;
    background: var(--cc-card-nested-bg);
    color: var(--cc-text-primary);
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-ctrl);
    text-align: left;
    cursor: pointer;
    transition: border-color .14s ease;
  }
  .concerto-turn-member:hover { border-color: var(--cc-accent-border); background: var(--cc-accent-soft); }
  .concerto-turn-member[aria-pressed="true"] {
    border-color: var(--cc-accent);
    background: var(--cc-accent-soft);
  }
  .concerto-turn-member[aria-pressed="true"] strong { color: var(--cc-accent-text); }
  .concerto-turn-member > span { min-width: 0; }
  .concerto-turn-member small { display: block; color: var(--cc-text-secondary); overflow-wrap: anywhere; }
  .concerto-turn-member svg { flex: none; }
  .concerto-turn-task { margin-top: 10px; padding: 10px 0 0; border-top: 1px solid var(--cc-border); overflow-wrap: anywhere; }
  .concerto-turn-events { margin: 10px 0 0; padding-left: 20px; color: var(--cc-text-secondary); }

  /* \u56E2\u961F\u4E3B\u9875\uFF08\u5E38\u9A7B\u7C98\u9876 + \u6982\u89C8 / \u4EFB\u52A1 / \u6210\u679C\uFF09 */
  .concerto-team-view {
    container: concerto / inline-size;
    overflow-anchor: none;
    height: 100%;
    overflow: auto;
    padding: 0 clamp(12px, 2%, 24px) 160px;
    border-radius: var(--cc-radius-card);
    background: var(--dsw-alias-bg-base, var(--cc-fb-bg-base));
    display: flex;
    flex-direction: column;
    gap: var(--cc-space-6);
  }
  .concerto-team-view > :is(.concerto-hero, .concerto-tab-content) { width: 100%; max-width: 1440px; margin-inline: auto; flex: none; min-width: 0; }
  .concerto-tab-content { display: flex; flex-direction: column; gap: var(--cc-space-6); }
  .concerto-tab-content[data-concerto-tabpanel="tasks"], .concerto-tab-content[data-concerto-tabpanel="artifacts"] { gap: var(--cc-space-4); }
  .concerto-tab-content, .concerto-tab-content [data-concerto-section], .concerto-task-module, .concerto-card { scroll-margin-block: 16px; }
  .concerto-tab-content, .concerto-tab-content :is([data-concerto-section], .concerto-task-module, .concerto-card, button, a, input, select, textarea, summary, [tabindex]) { scroll-margin-block-start: var(--cc-sticky-height, 16px); }
  .concerto-hero {
    position: relative;
    z-index: 5;
    margin-top: var(--cc-space-4);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-xl);
    corner-shape: var(--cc-corner-shape);
    padding: var(--cc-space-5) var(--cc-space-6) 0;
    background: var(--cc-card-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    box-shadow: var(--cc-shadow-soft);
    display: flex;
    flex-direction: column;
    gap: var(--cc-space-4);
  }
  .concerto-hero .concerto-sprite { background: transparent; border-color: transparent; box-shadow: none; padding: 4px 10px 4px 4px; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .concerto-hero .concerto-roster-strip { min-width: 0; width: 100%; margin-inline: -4px; }
  .concerto-hero .concerto-tabbar { width: 100%; justify-content: flex-start; border-bottom: 0; border-top: 1px solid var(--cc-border-subtle); margin-top: calc(var(--cc-space-1) * -1); }
  .concerto-hero .concerto-tabs { flex: 0 0 auto; justify-content: flex-start; gap: var(--cc-space-4); }
  .concerto-hero .concerto-tab-btn { padding: 12px 2px; border-radius: 0; }
  .concerto-hero .concerto-tab-btn:hover { background: transparent; }
  .concerto-hero .concerto-tab-btn[aria-selected="true"]::after { inset-inline: 0; }
  .concerto-hero .concerto-tab-btn[aria-selected="true"] { background: transparent; color: var(--cc-accent-text); }
  .concerto-hero .concerto-tabs .concerto-tab-btn .concerto-tag { background: transparent; color: var(--cc-text-muted); padding-inline: 0; border: 0; }
  .concerto-hero .concerto-sprite:hover { background: var(--cc-hover); }
  .concerto-hero .concerto-sprite[aria-pressed="true"] { border-color: transparent; background: var(--cc-accent-soft); }
  .concerto-hero[data-compact="true"] {
    position: sticky;
    top: 0;
    margin-top: 0;
    border-top-color: transparent;
    border-radius: 0 0 var(--cc-radius-lg) var(--cc-radius-lg);
    padding: var(--cc-space-2) var(--cc-space-4);
    gap: var(--cc-space-1);
    background: var(--cc-card-bg);
    background: color(from var(--cc-card-bg) srgb r g b / max(alpha, 0.86));
    box-shadow: var(--cc-shadow-panel);
  }
  .concerto-hero-compact { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-3); min-height: 40px; }
  .concerto-hero-compact-title, .concerto-hero-compact-actions { display: flex; align-items: center; gap: var(--cc-space-2); min-width: 0; }
  .concerto-hero-compact-title { flex: 1 1 auto; }
  .concerto-hero-compact-title > strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--cc-fs-title); font-weight: var(--cc-fw-heading); }
  .concerto-hero-compact-actions { flex: 0 1 auto; }
  .concerto-hero .concerto-compact-tabbar { width: auto; max-width: 100%; border-top: 0; margin-top: 0; overflow-x: auto; }
  .concerto-hero .concerto-compact-tabbar .concerto-tabs { gap: var(--cc-space-1); }
  .concerto-hero .concerto-compact-tabbar .concerto-tab-btn { padding: 6px 10px; border-radius: var(--cc-radius-ctrl); }
  .concerto-hero .concerto-compact-tabbar .concerto-tab-btn:hover { background: var(--cc-hover); }
  .concerto-hero .concerto-compact-tabbar .concerto-tab-btn[aria-selected="true"] { background: var(--cc-accent-soft); }
  .concerto-hero .concerto-compact-tabbar .concerto-tab-btn[aria-selected="true"]::after { display: none; }
  .concerto-hero .concerto-compact-tabbar .concerto-tag { display: none; }
  .concerto-compact-roster { display: flex; align-items: center; gap: 2px; max-width: 180px; overflow: hidden; }
  .concerto-compact-member { display: inline-flex; align-items: center; justify-content: center; padding: 2px; border: 1px solid transparent; border-radius: var(--cc-radius-pill); background: transparent; cursor: pointer; transition: background-color var(--cc-dur-fast) var(--cc-ease); }
  .concerto-compact-member:hover { background: var(--cc-hover); }
  .concerto-compact-member[aria-pressed="true"] { border-color: var(--cc-accent-border); background: var(--cc-accent-soft); }

  /* Floating menus & popovers use DSH menu material */
  .concerto-attention-anchor { position: relative; display: inline-flex; }
  .concerto-attention-popover { position: absolute; z-index: 60; inset: calc(100% + var(--cc-space-2)) 0 auto auto; width: min(520px, calc(100vw - 32px)); max-height: min(68dvh, 640px); overflow: auto; overscroll-behavior: contain; padding: var(--cc-space-4); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-lg); corner-shape: var(--cc-corner-shape); background: var(--cc-overlay-bg); box-shadow: var(--cc-shadow-pop); }
  .concerto-attention-popover-head, .concerto-attention-card-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); }
  .concerto-attention-popover-head { margin-bottom: var(--cc-space-3); }
  .concerto-attention-content { display: flex; flex-direction: column; gap: var(--cc-space-2); }
  .concerto-attention-pills { display: flex; flex-wrap: wrap; gap: var(--cc-space-2); }
  .concerto-attention-summary { margin: 0; font-size: var(--cc-fs-meta); color: var(--cc-text-secondary); }
  .concerto-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--cc-space-3); flex-wrap: wrap; }
  .concerto-hero-heading { min-width: 0; flex: 1 1 260px; display: flex; flex-direction: column; gap: var(--cc-space-1); }
  .concerto-hero-actions { display: flex; gap: var(--cc-space-2); align-items: center; flex-wrap: wrap; }
  .concerto-hero-actions-menu { position: relative; }
  .concerto-hero-actions-menu > summary { list-style: none; cursor: pointer; }
  .concerto-hero-actions-menu > summary::-webkit-details-marker { display: none; }
  .concerto-hero-menu-list { position: absolute; z-index: 30; inset: calc(100% + var(--cc-space-1)) 0 auto auto; display: flex; flex-direction: column; align-items: stretch; gap: 2px; min-width: 200px; padding: var(--cc-space-1); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); background: var(--cc-menu-bg); backdrop-filter: var(--cc-menu-blur); -webkit-backdrop-filter: var(--cc-menu-blur); box-shadow: var(--cc-shadow-pop); }
  .concerto-hero-menu-list > .concerto-tag { align-self: stretch; margin: 0; padding: 6px var(--cc-space-3) 4px; background: transparent; color: var(--cc-text-muted); border-radius: 0; }
  .concerto-hero-menu-list > .concerto-btn { justify-content: flex-start; color: var(--cc-text-primary); font-weight: 400; border-radius: var(--cc-radius-ctrl); }
  .concerto-hero-actions-menu[open] > summary { background: var(--cc-pressed-bg); color: var(--cc-text-primary); }
  .concerto-hero-title { margin: 0; font-size: var(--cc-fs-display); font-weight: var(--cc-fw-heading); line-height: 1.4; display: flex; align-items: center; gap: var(--cc-space-3); flex-wrap: wrap; }
  .concerto-hero-title h2 { font-size: inherit; line-height: inherit; }
  .concerto-hero[data-compact="true"] .concerto-hero-title { font-size: var(--cc-fs-title); }
  .concerto-hero-goal {
    margin: 0;
    font-size: var(--cc-fs-body);
    color: var(--cc-text-secondary);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .concerto-hero-status { display: flex; align-items: center; gap: var(--cc-space-2) var(--cc-space-5); flex-wrap: wrap; }
  .concerto-hero-legend { display: flex; align-items: center; flex-wrap: wrap; gap: var(--cc-space-1) var(--cc-space-4); margin: 0; padding: 0; list-style: none; }
  .concerto-legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: var(--cc-fs-caption); color: var(--cc-text-secondary); white-space: nowrap; }
  .concerto-legend-item::before { content: ''; width: 8px; height: 8px; border-radius: 2px; background: var(--cc-legend-color, var(--cc-text-muted)); }
  .concerto-legend-item > b { font-weight: var(--cc-fw-strong); color: var(--cc-text-primary); font-variant-numeric: tabular-nums; }
  .concerto-legend-item[data-status="done"] { --cc-legend-color: var(--cc-state-done); }
  .concerto-legend-item[data-status="review"] { --cc-legend-color: var(--cc-state-review); }
  .concerto-legend-item[data-status="running"] { --cc-legend-color: var(--cc-accent); }
  .concerto-legend-item[data-status="blocked"] { --cc-legend-color: var(--cc-state-blocked); }
  .concerto-legend-item[data-status="pending"] { --cc-legend-color: var(--cc-border-strong); }
  .concerto-live-dot { display: inline-flex; align-items: center; gap: 6px; font-size: var(--cc-fs-caption); color: var(--cc-text-muted); font-weight: 400; }
  .concerto-live-dot::before { content: ""; width: 6px; height: 6px; border-radius: var(--cc-radius-pill); corner-shape: round; background: var(--cc-state-done); box-shadow: 0 0 0 3px var(--cc-state-done-bg); }
  .concerto-live-dot:not([data-offline="true"])::before { animation: concerto-breathe 2.8s var(--cc-ease) infinite; }
  .concerto-live-dot[data-offline="true"] { color: var(--cc-state-blocked); }
  .concerto-live-dot[data-offline="true"]::before { background: var(--cc-state-blocked); box-shadow: 0 0 0 3px var(--cc-state-blocked-bg); }
  .concerto-progress-wrap { display: flex; align-items: center; gap: var(--cc-space-3); flex: 1 1 320px; min-width: 0; }
  .concerto-progress-bar { flex: 1 1 200px; min-width: 120px; height: 6px; border-radius: var(--cc-radius-pill); corner-shape: round; background: var(--cc-card-nested-bg); box-shadow: inset 0 0 0 1px var(--cc-border-subtle); overflow: hidden; display: flex; gap: 2px; }
  .concerto-progress-bar > div { border-radius: var(--cc-radius-pill); transition: width var(--cc-dur-slow) var(--cc-ease); }
  .concerto-progress-label { font-size: var(--cc-fs-caption); color: var(--cc-text-secondary); white-space: nowrap; }
  .concerto-seg-done { background: var(--cc-state-done); }
  .concerto-seg-review { background: var(--cc-state-review); }
  .concerto-seg-run { background: var(--cc-accent); }
  .concerto-seg-block { background: var(--cc-state-blocked); }

  .concerto-briefing-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: var(--cc-space-3); }
  .concerto-briefing-grid[data-has-issues="false"] { grid-template-columns: 1.4fr 1fr; }
  .concerto-empty-guide { display: flex; flex-direction: column; align-items: flex-start; gap: var(--cc-space-3); padding: var(--cc-space-6); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-xl); corner-shape: var(--cc-corner-shape); background: var(--cc-card-bg); box-shadow: var(--cc-shadow-soft); }
  .concerto-empty-guide p { margin: 0; color: var(--cc-text-secondary); }
  .concerto-empty-guide-readiness { font-size: var(--cc-fs-meta); }
  .concerto-empty-guide-examples { display: flex; flex-wrap: wrap; gap: var(--cc-space-2); }
  .concerto-briefing-cell {
    padding: var(--cc-space-4);
    border-radius: var(--cc-radius-card);
    corner-shape: var(--cc-corner-shape);
    background: var(--cc-card-nested-bg);
    border: 1px solid transparent;
    min-width: 0;
    line-height: 1.65;
  }
  .concerto-briefing-cell .concerto-group-label { margin-bottom: var(--cc-space-2); }
  .concerto-briefing-cell[data-tone="attention"] { background: var(--cc-state-attention-bg); border-color: color-mix(in srgb, var(--cc-state-attention) 22%, transparent); }
  .concerto-briefing-cell[data-tone="attention"] .concerto-group-label { color: var(--cc-state-attention); }
  .concerto-briefing-cell[data-tone="calm"] > :not(.concerto-group-label) { color: var(--cc-text-muted); }

  .concerto-key-tasks { display: flex; flex-direction: column; gap: 2px; padding: var(--cc-space-1); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-lg); corner-shape: var(--cc-corner-shape); background: var(--cc-card-bg); box-shadow: var(--cc-shadow-soft); }
  .concerto-key-task-row {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-3); flex-wrap: wrap;
    min-height: 48px; padding: var(--cc-space-2) var(--cc-space-3); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); border: 1px solid transparent;
    background: transparent;
    color: inherit; cursor: pointer; text-align: left;
    transition: background-color var(--cc-dur-fast) var(--cc-ease);
  }
  .concerto-key-task-row:hover { background: var(--cc-hover); }
  .concerto-key-task-row:active { background: var(--cc-active); }
  .concerto-key-task-row + .concerto-key-task-row { box-shadow: 0 -1px 0 0 var(--cc-border-subtle); }
  .concerto-key-task-main, .concerto-key-task-side { display: inline-flex; align-items: center; gap: var(--cc-space-2); min-width: 0; }
  .concerto-key-task-main > strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .concerto-key-task-member { font-size: var(--cc-fs-caption); color: var(--cc-text-muted); white-space: nowrap; }
  .concerto-key-task-side .concerto-id { color: var(--cc-text-muted); min-width: 52px; text-align: end; }

  .concerto-filter-bar {
    display: flex; align-items: center; gap: var(--cc-space-3); flex-wrap: wrap;
    padding: var(--cc-space-2) var(--cc-space-3);
    border: 1px solid var(--cc-border); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape);
    background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur);
    margin-bottom: 0;
  }
  .concerto-filter-bar label { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: var(--cc-fs-caption); color: var(--cc-text-secondary); }
  .concerto-filter-bar select { min-height: 32px; max-width: 100%; padding: 4px 8px; border-radius: var(--cc-radius-ctrl); corner-shape: var(--cc-corner-shape); border: 1px solid var(--cc-border); background: var(--cc-input-bg); color: var(--cc-text-primary); font: inherit; font-size: var(--cc-fs-meta); cursor: pointer; transition: border-color var(--cc-dur-fast) var(--cc-ease), background-color var(--cc-dur-fast) var(--cc-ease); }
  .concerto-filter-bar select:hover { border-color: var(--cc-border-strong); }
  .concerto-filter-bar select[data-active="true"] { border-color: var(--cc-accent-border); background: var(--cc-accent-soft); color: var(--cc-accent-text); font-weight: var(--cc-fw-strong); }
  .concerto-import-actions { display: inline-flex; align-items: center; gap: var(--cc-space-2); flex-wrap: wrap; justify-content: flex-end; min-width: 0; }
  .concerto-import-actions > .concerto-quiet:empty { display: none; }
  .concerto-req-views { display: flex; flex-direction: column; gap: 6px; }
  .concerto-req-view-list { display: flex; flex-wrap: wrap; gap: var(--cc-space-2); }
  .concerto-req-view-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: var(--cc-radius-pill); corner-shape: round; font-size: var(--cc-fs-caption); border: 1px solid var(--cc-border-subtle); background: var(--cc-card-nested-bg); }
  .concerto-req-view-pill[data-missing="true"] { border-color: color-mix(in srgb, var(--cc-state-attention) 40%, transparent); background: var(--cc-state-attention-bg); color: var(--cc-state-attention); font-weight: var(--cc-fw-strong); }
  .concerto-req-view-pill[data-suggested="true"] { border-color: var(--cc-border-subtle); background: var(--cc-card-nested-bg); color: var(--cc-text-secondary); }
  .concerto-jump-banner { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; padding: var(--cc-space-2) var(--cc-space-2) var(--cc-space-2) var(--cc-space-4); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); border: 1px solid transparent; background: var(--cc-accent-tint); font-size: var(--cc-fs-meta); animation: concerto-rise var(--cc-dur) var(--cc-ease); }
  .concerto-mindmap-outline { list-style: none; margin: 4px 0; padding-left: 18px; border-left: 1px solid var(--cc-border); display: flex; flex-direction: column; gap: 4px; }
  .concerto-mindmap-outline-root { padding-left: 0; border-left: none; }
  .concerto-mindmap-outline-node { padding: 4px 8px; border-radius: var(--cc-radius-ctrl); background: var(--cc-card-nested-bg); border: 1px solid var(--cc-border-subtle); display: inline-flex; align-items: center; flex-wrap: wrap; }
  .concerto-semantic-pill[data-semantic="live_execution"]::before { content: ""; width: 6px; height: 6px; border-radius: var(--cc-radius-pill); corner-shape: round; background: currentColor; animation: concerto-pulse 1.8s ease-in-out infinite; }

  .concerto-tabbar { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; border-bottom: 1px solid var(--cc-border-subtle); padding-bottom: 0; }
  .concerto-tabs { display: inline-flex; align-items: center; gap: var(--cc-space-1); flex-wrap: nowrap; overflow-x: auto; min-width: 0; scrollbar-width: none; }
  .concerto-tab-btn {
    display: inline-flex;
    position: relative;
    flex: none;
    white-space: nowrap;
    align-items: center;
    gap: 6px;
    padding: 7px var(--cc-space-3);
    border-radius: var(--cc-radius-ctrl) var(--cc-radius-ctrl) 0 0;
    border: 0;
    background: transparent;
    color: var(--cc-text-secondary);
    cursor: pointer;
    font-weight: var(--cc-fw-strong);
    font-size: var(--cc-fs-body);
    min-height: 40px;
    transition: color var(--cc-dur-fast) var(--cc-ease), background-color var(--cc-dur-fast) var(--cc-ease);
  }
  .concerto-tab-btn:hover { background: var(--cc-hover); color: var(--cc-text-primary); }
  .concerto-tab-btn[aria-selected="true"] {
    background: var(--cc-accent-soft);
    color: var(--cc-accent-text);
    font-weight: var(--cc-fw-strong);
  }
  .concerto-tab-btn[aria-selected="true"]::after { content: ''; position: absolute; inset: auto 10px 0; border-block-end: 2px solid var(--cc-accent); border-radius: 2px 2px 0 0; animation: concerto-tab-in var(--cc-dur) var(--cc-ease); }
  .concerto-tab-btn[aria-selected="true"] .concerto-tag {
    background: var(--cc-accent-fill);
    color: var(--cc-on-accent);
    font-weight: var(--cc-fw-strong);
  }

  .concerto-tab-attention { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding-inline: 5px; border-radius: var(--cc-radius-pill); background: var(--cc-state-attention-bg); color: var(--cc-state-attention); font-size: var(--cc-fs-micro); font-weight: var(--cc-fw-heading); font-variant-numeric: tabular-nums; }
  .concerto-section-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); margin-bottom: var(--cc-space-3); flex-wrap: wrap; }
  .concerto-section-title { font-size: var(--cc-fs-title); font-weight: var(--cc-fw-heading); display: flex; align-items: center; gap: var(--cc-space-2); color: var(--cc-text-primary); }
  .concerto-section-title > .concerto-tag { font-variant-numeric: tabular-nums; }
  .concerto-count-pill { font-size: var(--cc-fs-caption); font-weight: var(--cc-fw-strong); padding: 1px 8px; border-radius: var(--cc-radius-pill); corner-shape: round; background: var(--cc-card-nested-bg); color: var(--cc-text-secondary); border: 0; }

  .concerto-state-chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px 1px 6px; border-radius: var(--cc-radius-pill); corner-shape: round; font-size: var(--cc-fs-caption); font-weight: var(--cc-fw-strong); line-height: 1.5; white-space: nowrap; }
  .concerto-state-running { background: var(--cc-state-running-bg); color: var(--cc-state-running); }
  .concerto-state-attention { background: var(--cc-state-attention-bg); color: var(--cc-state-attention); }
  .concerto-state-review { background: var(--cc-state-review-bg); color: var(--cc-state-review); }
  .concerto-state-done { background: var(--cc-state-done-bg); color: var(--cc-state-done); }
  .concerto-state-blocked { background: var(--cc-state-blocked-bg); color: var(--cc-state-blocked); }
  .concerto-state-unknown { background: var(--cc-state-unknown-bg); color: var(--cc-state-unknown); }
  .concerto-state-idle { background: var(--cc-card-nested-bg); color: var(--cc-text-secondary); }

  /* \u5F85\u5904\u7406\u533A */
  .concerto-attn-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(290px, 100%), 1fr)); gap: var(--cc-space-3); }
  .concerto-attn-card { border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); padding: var(--cc-space-4) var(--cc-space-4) var(--cc-space-4) calc(var(--cc-space-4) + 3px); background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur); border: 1px solid var(--cc-border); box-shadow: var(--cc-shadow-soft); position: relative; overflow: hidden; display: flex; flex-direction: column; gap: var(--cc-space-2); }
  .concerto-attn-card::before { content: ""; position: absolute; left: 0; top: var(--cc-space-3); bottom: var(--cc-space-3); width: 3px; border-radius: 0 3px 3px 0; background: var(--cc-state-attention); }
  .concerto-attn-card[data-kind="unknown"]::before { background: var(--cc-state-unknown); }
  .concerto-attn-card[data-kind="blocked"]::before, .concerto-attn-card[data-kind="failed"]::before { background: var(--cc-state-blocked); }
  .concerto-attn-card[data-kind="review"]::before { background: var(--cc-state-review); }
  .concerto-attn-card[data-kind="unknown"] { background-image: repeating-linear-gradient(-45deg, transparent, transparent 10px, var(--cc-state-unknown-bg) 10px, var(--cc-state-unknown-bg) 20px); }
  .concerto-attention-popover .concerto-attn-card { box-shadow: none; background: var(--cc-card-bg); }

  /* \u540D\u518C */
  .concerto-roster-strip { display: flex; gap: var(--cc-space-1); flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; padding-bottom: 2px; }
  .concerto-roster-strip::-webkit-scrollbar { display: none; }
  .concerto-roster-strip > * { flex: none; scroll-snap-align: start; }

  /* \u56FA\u5B9A\u770B\u677F\uFF1A\u5217\u662F\u5E26\u5E95\u8272\u7684\u6CF3\u9053\uFF0C\u5361\u7247\u4FDD\u7559\u4E00\u5C42\u5BBF\u4E3B\u6750\u8D28\u3002 */
  .concerto-board-cols { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--cc-space-3); align-items: start; }
  .concerto-board-col { min-width: 0; display: flex; flex-direction: column; gap: var(--cc-space-2); padding: var(--cc-space-2); border-radius: var(--cc-radius-lg); corner-shape: var(--cc-corner-shape); background: color-mix(in srgb, var(--cc-hover) 70%, transparent); }
  .concerto-board-col-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); padding: var(--cc-space-1) var(--cc-space-2); font-size: var(--cc-fs-meta); color: var(--cc-text-secondary); --cc-col-color: var(--cc-text-muted); }
  .concerto-board-col-head[data-state="pending"] { --cc-col-color: var(--cc-border-strong); }
  .concerto-board-col-head[data-state="running"] { --cc-col-color: var(--cc-state-running); }
  .concerto-board-col-head[data-state="review"] { --cc-col-color: var(--cc-state-review); }
  .concerto-board-col-head[data-state="done"] { --cc-col-color: var(--cc-state-done); }
  .concerto-board-col-head h3 { display: inline-flex; align-items: center; gap: var(--cc-space-2); margin: 0; font: inherit; font-weight: var(--cc-fw-strong); color: var(--cc-text-primary); }
  .concerto-board-col-head h3::before { content: ''; width: 8px; height: 8px; flex: none; border-radius: var(--cc-radius-pill); background: var(--cc-col-color); }
  .concerto-board-col-head > span { font-size: var(--cc-fs-caption); color: var(--cc-text-muted); }
  .concerto-kanban-attention-summary { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 0; border-radius: var(--cc-radius-pill); background: var(--cc-state-attention-bg); color: var(--cc-state-attention); font: inherit; font-size: var(--cc-fs-caption); font-weight: var(--cc-fw-strong); cursor: pointer; transition: background-color var(--cc-dur-fast) var(--cc-ease); }
  .concerto-kanban-attention-summary:hover { background: color-mix(in srgb, var(--cc-state-attention) 22%, transparent); }
  .concerto-board-jump { display: none; }
  .concerto-board-empty { margin: 0; padding: var(--cc-space-4) var(--cc-space-2); border: 1px dashed var(--cc-border); border-radius: var(--cc-radius-card); color: var(--cc-text-muted); text-align: center; font-size: var(--cc-fs-caption); }
  .concerto-kcard { position: relative; border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); padding: var(--cc-space-3); background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur); border: 1px solid var(--cc-border-subtle); box-shadow: var(--dsw-shadow-lv1, none); display: flex; flex-direction: column; gap: var(--cc-space-2); text-align: start; color: inherit; transition: border-color var(--cc-dur-fast) var(--cc-ease), box-shadow var(--cc-dur) var(--cc-ease), transform var(--cc-dur) var(--cc-ease); min-width: 0; }
  .concerto-kcard:hover { border-color: var(--cc-border-strong); box-shadow: var(--cc-shadow-panel); transform: translateY(-1px); }
  .concerto-kcard:has(.concerto-kcard-title:focus-visible) { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--cc-accent)); outline-offset: 2px; }
  .concerto-kcard h4 { margin: 0; font-size: var(--cc-fs-body); font-weight: var(--cc-fw-strong); line-height: 1.5; overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
  .concerto-kcard-title { padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer; }
  .concerto-kcard-title::after { content: ''; position: absolute; inset: 0; border-radius: var(--cc-radius-card); }
  .concerto-kcard .concerto-kcard-title:focus-visible { outline: none; }
  .concerto-kcard > .concerto-kcard-summary { margin: 0; font-size: var(--cc-fs-meta); line-height: 1.55; color: var(--cc-text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-clamp: 2; overflow: clip; overflow-wrap: anywhere; }
  .concerto-kcard[data-blocked="true"] { border-color: color-mix(in srgb, var(--cc-state-blocked) 55%, var(--cc-border-subtle)); }
  .concerto-kcard[data-blocked="true"] > .concerto-kcard-summary { color: var(--cc-state-blocked); }
  .concerto-kcard[data-unknown="true"] { border-color: var(--cc-state-unknown); border-style: dashed; }
  .concerto-kcard-deps { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: var(--cc-space-1); }
  .concerto-dependency-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; padding: 1px var(--cc-space-2); border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-pill); background: var(--cc-card-nested-bg); color: var(--cc-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; transition: border-color var(--cc-dur-fast) var(--cc-ease); }
  .concerto-dependency-chip:hover { border-color: var(--cc-border-strong); color: var(--cc-text-primary); }
  .concerto-kcard-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; padding-top: var(--cc-space-2); border-top: 1px solid var(--cc-border-subtle); font-size: var(--cc-fs-caption); color: var(--cc-text-secondary); }
  .concerto-kcard-member { display: inline-flex; align-items: center; gap: 6px; min-width: 0; overflow-wrap: anywhere; }
  .concerto-kcard-id { margin-left: auto; color: var(--cc-text-muted); font-size: var(--cc-fs-caption); }
  .concerto-board-card-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--cc-space-2); }
  .concerto-board-card-list > li { min-width: 0; animation: concerto-rise var(--cc-dur) var(--cc-ease) both; }
  .concerto-kcard[data-attention="true"]::before { content: ''; position: absolute; inset: var(--cc-space-3) auto var(--cc-space-3) -1px; width: 3px; border-radius: 0 3px 3px 0; background: var(--cc-state-attention); }
  .concerto-kcard[data-blocked="true"]::before { background: var(--cc-state-blocked); }
  .concerto-kcard-action { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); }
  .concerto-kcard-context { color: var(--cc-text-muted); font-size: var(--cc-fs-caption); }
  .concerto-empty-avatar { width: 20px; height: 20px; flex: none; border: 1px dashed var(--cc-border-strong); border-radius: 50%; }
  .concerto-diagram-node[role="button"] { cursor: pointer; }
  .concerto-diagram-node[role="button"]:focus-visible { outline: none; }
  .concerto-diagram-node[role="button"]:focus-visible > rect:first-of-type { stroke: var(--cc-focus-ring); stroke-width: 2; }

  /* Bento & \u5361\u7247 */
  .concerto-bento-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-flow: row; gap: var(--cc-space-4); }
  .concerto-bento-item { grid-column: span var(--cc-span, 6); min-width: 0; display: flex; }
  .concerto-bento-item[data-size="s"] { grid-column: span var(--cc-span, 4); }
  .concerto-bento-item[data-size="m"] { grid-column: span var(--cc-span, 6); }
  .concerto-bento-item[data-size="l"] { grid-column: span var(--cc-span, 12); }
  .concerto-bento-item > .concerto-card { flex: 1; display: flex; flex-direction: column; }
  .concerto-bento-item > .concerto-card > [data-concerto-renderer-root] { flex: 1; display: flex; flex-direction: column; }
  .concerto-stage-group + .concerto-stage-group { margin-top: var(--cc-space-6); }
  .concerto-stage-group > .concerto-group-label { margin-bottom: var(--cc-space-2); }

  .concerto-card {
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-lg);
    corner-shape: var(--cc-corner-shape);
    padding: var(--cc-space-4);
    background: var(--cc-card-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    box-shadow: var(--cc-shadow-soft);
    min-width: 0;
    position: relative;
    transition: border-color var(--cc-dur) var(--cc-ease), box-shadow var(--cc-dur) var(--cc-ease);
  }
  .concerto-bento-item > .concerto-card:hover { border-color: var(--cc-border-strong); }
  @keyframes concerto-flash {
    0%, 35% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--cc-accent) 45%, transparent); }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  .concerto-card-highlight, .concerto-task-highlight { border-color: var(--cc-accent) !important; animation: concerto-flash 2.4s ease-out; }
  .concerto-card-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: nowrap; margin-bottom: var(--cc-space-3); }
  .concerto-card-head-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .concerto-card-title-row { display: flex; align-items: center; gap: var(--cc-space-2); min-width: 0; }
  .concerto-card-title-row :is(strong, h3) { font-size: var(--cc-fs-body); font-weight: var(--cc-fw-heading); min-width: 0; overflow-wrap: anywhere; }
  .concerto-card-caption { font-size: var(--cc-fs-caption); color: var(--cc-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .concerto-hover-tools { display: inline-flex; gap: 2px; align-items: center; flex: none; }
  .concerto-hover-tools .concerto-btn--icon { color: var(--cc-text-muted); }
  .concerto-hover-tools .concerto-btn--icon:hover:not(:disabled) { color: var(--cc-text-primary); }
  .concerto-info-pop { position: absolute; z-index: 40; top: 52px; right: var(--cc-space-4); width: min(420px, calc(100% - 32px)); max-height: 360px; overflow: auto; margin: 0; padding: var(--cc-space-3); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); background: var(--cc-menu-bg); backdrop-filter: var(--cc-menu-blur); -webkit-backdrop-filter: var(--cc-menu-blur); border: 1px solid var(--cc-border); box-shadow: var(--cc-shadow-pop); font-size: var(--cc-fs-caption); color: var(--cc-text-secondary); }
  .concerto-card:has(.concerto-info-pop) .concerto-stage-tools { opacity: 1; }
  .concerto-info-pop[data-native-popover="true"], .concerto-attention-popover[data-native-popover="true"] { position: fixed; inset: auto; margin: 0; }

  .concerto-table-wrap { overflow-x: auto; border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); }
  .concerto-table { width: 100%; border-collapse: collapse; font-size: var(--cc-fs-meta); }
  .concerto-table th, .concerto-table td { border-bottom: 1px solid var(--cc-border-subtle); padding: 8px 12px; text-align: left; }
  .concerto-table tr:last-child :is(th, td) { border-bottom: 0; }
  .concerto-table th { background: var(--cc-card-nested-bg); color: var(--cc-text-secondary); font-size: var(--cc-fs-caption); font-weight: var(--cc-fw-strong); }
  .concerto-table tbody tr { transition: background-color var(--cc-dur-fast) var(--cc-ease); }
  .concerto-table tbody tr:hover { background: var(--cc-hover); }
  .concerto-shared-checklist .concerto-table tbody th { background: transparent; color: var(--cc-text-primary); font-weight: var(--cc-fw-strong); }
  .concerto-shared-cell { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); }
  .concerto-checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
  .concerto-checklist li { display: flex; align-items: flex-start; gap: var(--cc-space-2); padding: 8px 10px; border-radius: var(--cc-radius-ctrl); background: transparent; border: 1px solid transparent; transition: background-color var(--cc-dur-fast) var(--cc-ease); }
  .concerto-checklist li:hover { background: var(--cc-hover); }

  /* \u4EFB\u52A1\u8BE6\u60C5\u6298\u53E0/\u5217\u8868 */
  .concerto-task-module { border: 1px solid var(--cc-border); border-radius: var(--cc-radius-lg); corner-shape: var(--cc-corner-shape); padding: var(--cc-space-4); background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur); box-shadow: var(--cc-shadow-soft); margin-top: var(--cc-space-2); transition: border-color var(--cc-dur-slow) var(--cc-ease); }
  .concerto-task-summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .concerto-acc-cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--cc-space-3); margin-top: 10px; }
  .concerto-acc-box { padding: var(--cc-space-3); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); background: var(--cc-card-nested-bg); border: 1px solid transparent; }
  .concerto-review-feedback, .concerto-shared-checklist { margin-block: var(--cc-space-3); display: grid; gap: var(--cc-space-2); overflow-wrap: anywhere; }
  :is(.concerto-review-feedback, .concerto-shared-checklist) [role="status"]:empty { position: absolute; }
  .concerto-shared-checklist .concerto-input { display: block; inline-size: 100%; }
  .concerto-review-threads, .concerto-review-updates { margin-block: var(--cc-space-2); padding-inline-start: var(--cc-space-4); }
  .concerto-review-thread { padding-block: var(--cc-space-2); border-block-end: 1px solid var(--cc-border-subtle); }
  .concerto-review-heading { display: flex; flex-wrap: wrap; align-items: center; gap: var(--cc-space-2); }
  .concerto-review-text { margin-block: var(--cc-space-2); white-space: pre-wrap; }
  .concerto-review-feedback :is(select, textarea) { display: block; inline-size: 100%; }
  .concerto-task-workspace { min-width: 0; }
  .concerto-task-workspace[data-has-inspector="true"] { display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, 420px); gap: var(--cc-space-4); align-items: start; }
  .concerto-task-workspace[data-has-inspector="true"] .concerto-board-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--cc-space-3); }
  .concerto-task-inspector--inline { position: sticky; top: var(--cc-sticky-height, 16px); max-height: calc(100dvh - var(--cc-sticky-height, 32px) - 16px); overflow: auto; overscroll-behavior: contain; min-width: 0; }
  .concerto-task-inspector--inline > .concerto-task-module, .concerto-task-inspector-dialog .concerto-task-module { margin-top: 0; }
  .concerto-task-inspector-body .concerto-acc-cols { grid-template-columns: minmax(0, 1fr); }
  .concerto-inspector-actions { display: flex; flex-direction: column; align-items: stretch; gap: var(--cc-space-2); margin-top: var(--cc-space-3); padding: var(--cc-space-3); border: 1px solid color-mix(in srgb, var(--cc-state-attention) 30%, transparent); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); background: var(--cc-state-attention-bg); }
  .concerto-inspector-actions > .concerto-btn { align-self: flex-start; }
  .concerto-kcard[data-selected="true"] { border-color: var(--cc-accent); box-shadow: 0 0 0 3px var(--cc-accent-soft); transform: none; }
  @container concerto (min-width: 1400px) {
    .concerto-task-workspace[data-has-inspector="true"] .concerto-board-cols { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }

  /* \u753B\u5E03\u3001\u6D6E\u52A8\u5DE5\u5177\u4E0E\u5168\u5C4F\u5F39\u7A97 */
  .concerto-canvas-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; margin-bottom: var(--cc-space-2); font-size: var(--cc-fs-caption); color: var(--cc-text-muted); }
  .concerto-canvas-btns { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .concerto-canvas-export { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .concerto-canvas-stage { position: relative; flex: 1; border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); background: var(--cc-canvas-bg); overflow: hidden; min-height: 190px; max-height: 320px; cursor: grab; user-select: none; }
  .concerto-canvas-stage:active { cursor: grabbing; }
  .concerto-graph-frame { position: relative; display: flex; flex-direction: column; min-width: 0; }
  .concerto-canvas-stage--readable { overflow: auto; overscroll-behavior: contain; min-height: 0; max-height: none; scrollbar-width: thin; scrollbar-color: var(--cc-border-strong) transparent; }
  .concerto-graph-content { display: grid; place-items: center; min-width: 100%; min-height: 100%; }
  .concerto-graph-content > svg { display: block; max-width: none; flex: none; }
  .concerto-graph-scroll-hint { position: absolute; inset: auto auto var(--cc-space-2) var(--cc-space-2); pointer-events: none; padding: 2px var(--cc-space-2); border-radius: var(--cc-radius-pill); background: var(--cc-menu-bg); backdrop-filter: var(--cc-menu-blur); color: var(--cc-text-secondary); font-size: var(--cc-fs-micro); box-shadow: var(--dsw-elevation-stroke, none); }
  .concerto-canvas-modal .concerto-canvas-stage--readable { min-height: 0; }
  .concerto-stage-tools {
    position: absolute; right: var(--cc-space-2); bottom: var(--cc-space-2); z-index: 2;
    display: inline-flex; gap: 2px; padding: 2px; flex-wrap: wrap; max-width: calc(100% - 16px);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-card);
    corner-shape: var(--cc-corner-shape);
    background: var(--cc-menu-bg);
    backdrop-filter: var(--cc-menu-blur);
    -webkit-backdrop-filter: var(--cc-menu-blur);
    box-shadow: var(--cc-shadow-panel);
    opacity: 0; transform: translateY(4px); transition: opacity var(--cc-dur) var(--cc-ease), transform var(--cc-dur) var(--cc-ease);
  }
  .concerto-card:hover .concerto-stage-tools,
  .concerto-card:focus-within .concerto-stage-tools { opacity: 1; transform: none; }
  @media (pointer: coarse) { .concerto-stage-tools { opacity: 1; } }
  .concerto-canvas-foot { margin-top: var(--cc-space-2); font-size: var(--cc-fs-caption); color: var(--cc-text-muted); display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; }
  .concerto-diagram-foot { align-items: flex-start; }
  .concerto-diagram-status-summary, .concerto-diagram-edge-legend { display: flex; align-items: center; flex-wrap: wrap; gap: var(--cc-space-2); }
  .concerto-diagram-status-summary > span { display: inline-flex; align-items: center; gap: 4px; }
  .concerto-diagram-edge-legend > span { display: inline-flex; align-items: center; gap: 4px; }
  .concerto-diagram-edge-legend > span::before { content: ''; width: 16px; border-top: 2px solid var(--cc-border-strong); }
  .concerto-diagram-edge-legend > span[data-semantic="critical"]::before { border-top-color: var(--cc-accent); }
  .concerto-diagram-edge-legend > span:is([data-semantic="waiting"], [data-semantic="blocked"], [data-semantic="unknown"])::before { border-top-style: dashed; }
  .concerto-diagram-edge-legend > span[data-semantic="waiting"]::before { border-top-color: var(--cc-state-attention); }
  .concerto-diagram-edge-legend > span[data-semantic="blocked"]::before { border-top-color: var(--cc-state-blocked); }
  .concerto-diagram-edge-legend > span[data-semantic="unknown"]::before { border-top-color: var(--cc-state-unknown); }
  .concerto-card .concerto-canvas-stage--readable { border-color: transparent; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cc-border-subtle) 45%, transparent); }
  .concerto-canvas-modal .concerto-canvas-stage--readable { border-color: var(--cc-border-subtle); box-shadow: none; }
  .concerto-kcard h4, .concerto-briefing-cell, .concerto-hero-goal { text-wrap: pretty; }
  .concerto-surface :is(h2, h3) { text-wrap: balance; }
  .concerto-html-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 34px; pointer-events: none; background: linear-gradient(transparent, var(--cc-card-nested-bg)); }

  .concerto-surface:modal { overscroll-behavior: contain; }
  .concerto-surface::backdrop { background: var(--dsw-alias-bg-mask-1, var(--cc-fb-mask)); overflow: hidden; overscroll-behavior: contain; }
  .concerto-canvas-modal {
    position: fixed;
    inset: 0;
    margin: auto;
    width: min(1600px, 94vw);
    height: 86dvh;
    max-height: 86dvh;
    max-width: none;
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-xl);
    corner-shape: var(--cc-corner-shape);
    background: var(--cc-overlay-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    color: var(--cc-text-primary);
    padding: var(--cc-space-5);
    flex-direction: column;
    gap: var(--cc-space-3);
    box-shadow: var(--cc-shadow-prominent);
    min-width: 0;
    min-height: 0;
  }
  .concerto-canvas-modal[open] { display: flex; }
  .concerto-canvas-modal .concerto-canvas-stage { flex: 1; max-height: none; min-height: 320px; }
  .concerto-canvas-modal > [data-concerto-renderer-root="markmap"], .concerto-canvas-modal > [data-concerto-renderer-root="svg"] { display: grid !important; grid-template-columns: minmax(0, 1fr) 240px; flex: 1; min-height: 0; gap: var(--cc-space-3); }
  .concerto-canvas-modal > [data-concerto-renderer-root="markmap"] > .concerto-canvas-bar, .concerto-canvas-modal > [data-concerto-renderer-root="svg"] > .concerto-canvas-bar { grid-column: 2; grid-row: 1; flex-direction: column; align-items: stretch; justify-content: flex-start; flex-wrap: nowrap; min-height: 0; margin: 0; overflow: auto; }
  .concerto-canvas-modal > [data-concerto-renderer-root="markmap"] > .concerto-canvas-bar :is(.concerto-canvas-btns, .concerto-canvas-export), .concerto-canvas-modal > [data-concerto-renderer-root="svg"] > .concerto-canvas-bar :is(.concerto-canvas-btns, .concerto-canvas-export) { flex-direction: column; align-items: stretch; flex-wrap: nowrap; }
  .concerto-canvas-modal > [data-concerto-renderer-root="markmap"] > .concerto-canvas-bar .concerto-btn, .concerto-canvas-modal > [data-concerto-renderer-root="svg"] > .concerto-canvas-bar .concerto-btn { width: 100%; }
  .concerto-canvas-modal > [data-concerto-renderer-root="markmap"] > .concerto-canvas-bar .concerto-canvas-export, .concerto-canvas-modal > [data-concerto-renderer-root="svg"] > .concerto-canvas-bar .concerto-canvas-export { margin-top: auto; padding-top: var(--cc-space-3); }
  .concerto-canvas-modal > [data-concerto-renderer-root="markmap"] > :is(.concerto-canvas-stage, .concerto-graph-frame), .concerto-canvas-modal > [data-concerto-renderer-root="svg"] > .concerto-graph-frame { grid-column: 1; grid-row: 1; min-width: 0; min-height: 0; }
  .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] { display: block !important; position: relative; flex: 1; min-height: 0; padding-right: 252px; overflow: auto; }
  .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] > .concerto-canvas-bar { position: absolute; inset: 0 0 0 auto; width: 240px; height: 100%; flex-direction: column; align-items: stretch; justify-content: flex-start; flex-wrap: nowrap; margin: 0; overflow: auto; }
  .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] > .concerto-canvas-bar :is(.concerto-canvas-btns, .concerto-canvas-export) { flex-direction: column; align-items: stretch; flex-wrap: nowrap; }
  .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] > .concerto-canvas-bar .concerto-btn { width: 100%; }
  .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] > .concerto-canvas-bar .concerto-canvas-export { margin-top: auto; padding-top: var(--cc-space-3); }
  @media (max-width: 900px) {
    .concerto-canvas-modal > [data-concerto-renderer-root="markmap"], .concerto-canvas-modal > [data-concerto-renderer-root="svg"] { display: flex !important; }
    .concerto-canvas-modal > [data-concerto-renderer-root="markmap"] > .concerto-canvas-bar, .concerto-canvas-modal > [data-concerto-renderer-root="svg"] > .concerto-canvas-bar { flex-direction: row; flex-wrap: wrap; overflow: visible; }
    .concerto-canvas-modal > [data-concerto-renderer-root="markmap"] > .concerto-canvas-bar :is(.concerto-canvas-btns, .concerto-canvas-export), .concerto-canvas-modal > [data-concerto-renderer-root="svg"] > .concerto-canvas-bar :is(.concerto-canvas-btns, .concerto-canvas-export) { flex-direction: row; flex-wrap: wrap; }
    .concerto-canvas-modal > [data-concerto-renderer-root="markmap"] > .concerto-canvas-bar .concerto-btn, .concerto-canvas-modal > [data-concerto-renderer-root="svg"] > .concerto-canvas-bar .concerto-btn { width: auto; }
    .concerto-canvas-modal > [data-concerto-renderer-root="markmap"] > .concerto-canvas-bar .concerto-canvas-export, .concerto-canvas-modal > [data-concerto-renderer-root="svg"] > .concerto-canvas-bar .concerto-canvas-export { margin-top: 0; padding-top: 0; }
    .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] { display: flex !important; padding-right: 0; overflow: visible; }
    .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] > .concerto-canvas-bar { position: static; width: auto; height: auto; flex-direction: row; flex-wrap: wrap; overflow: visible; }
    .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] > .concerto-canvas-bar :is(.concerto-canvas-btns, .concerto-canvas-export) { flex-direction: row; flex-wrap: wrap; }
    .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] > .concerto-canvas-bar .concerto-btn { width: auto; }
    .concerto-canvas-modal > [data-concerto-renderer-root="excalidraw"] > .concerto-canvas-bar .concerto-canvas-export { margin-top: 0; padding-top: 0; }
  }

  /* \u53F3\u4FA7\u6210\u5458\u8BE6\u60C5\u62BD\u5C49 */
  .concerto-drawer {
    container: concerto-drawer / inline-size;
    position: fixed;
    inset: 0 0 0 auto;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    width: min(520px, 100%);
    max-width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    flex-direction: column;
    background: var(--cc-overlay-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    color: var(--cc-text-primary);
    border-left: 1px solid var(--cc-border);
    box-shadow: var(--cc-shadow-prominent);
  }
  .concerto-drawer[open] { display: flex; animation: concerto-drawer-in var(--cc-dur-slow) var(--cc-ease); }
  .concerto-canvas-modal[open] { animation: concerto-pop-in var(--cc-dur) var(--cc-ease); }
  .concerto-drawer::backdrop, .concerto-canvas-modal::backdrop { animation: concerto-fade-in var(--cc-dur) var(--cc-ease); }
  .concerto-drawer-head { padding: var(--cc-space-5) var(--cc-space-5) var(--cc-space-4); border-bottom: 1px solid var(--cc-border-subtle); display: flex; align-items: flex-start; justify-content: space-between; gap: var(--cc-space-3); }
  .concerto-drawer-tabs { display: flex; gap: var(--cc-space-1); padding: 0 var(--cc-space-4); flex: none; border-bottom: 1px solid var(--cc-border-subtle); flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .concerto-drawer-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: var(--cc-space-4) var(--cc-space-5); display: flex; flex-direction: column; gap: var(--cc-space-3); }
  .concerto-bubble { padding: var(--cc-space-3) var(--cc-space-4); border-radius: var(--cc-radius-lg); corner-shape: var(--cc-corner-shape); background: var(--cc-card-nested-bg); border: 1px solid transparent; line-height: 1.65; display: flex; flex-direction: column; gap: 6px; }
  .concerto-activity-line { font-size: var(--cc-fs-meta); color: var(--cc-text-secondary); padding: 6px 12px; border-left: 2px solid var(--cc-border); background: transparent; border-radius: 0; }
  .concerto-empty { display: grid; justify-items: center; text-align: center; gap: var(--cc-space-2); padding: var(--cc-space-6) var(--cc-space-4); border: 1px dashed var(--cc-border); border-radius: var(--cc-radius-lg); corner-shape: var(--cc-corner-shape); color: var(--cc-text-muted); font-size: var(--cc-fs-meta); }
  .concerto-empty-icon { font-size: var(--cc-fs-display); line-height: 1; filter: grayscale(.4); opacity: .8; }

  /* ===== \u8BBE\u7F6E\u9875\uFF1A\u88C5\u914D\u56E2\u961F / \u8FD0\u884C\u5B9E\u4F8B / \u5F02\u5E38\u6062\u590D ===== */
  .concerto-settings { container: concerto-set / inline-size; display: flex; flex-direction: column; gap: var(--cc-space-4); min-width: 0; padding-block: var(--cc-space-1); }
  .concerto-set-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--cc-space-3); flex-wrap: wrap; }
  .concerto-set-head-main { min-width: 0; display: flex; flex-direction: column; gap: var(--cc-space-1); }
  .concerto-settings .concerto-set-head h2 { font-size: var(--cc-fs-display); line-height: 1.4; }
  .concerto-settings .concerto-set-lead { margin: 0; color: var(--cc-text-secondary); font-size: var(--cc-fs-meta); }
  .concerto-set-status { position: sticky; top: var(--cc-space-2); z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); padding: var(--cc-space-1) var(--cc-space-1) var(--cc-space-1) var(--cc-space-4); border: 1px solid var(--cc-border); border-left: 3px solid var(--cc-accent); border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); background: var(--cc-menu-bg); backdrop-filter: var(--cc-menu-blur); -webkit-backdrop-filter: var(--cc-menu-blur); box-shadow: var(--cc-shadow-panel); font-size: var(--cc-fs-meta); overflow-wrap: anywhere; animation: concerto-rise var(--cc-dur) var(--cc-ease); }
  .concerto-set-status[data-tone="error"] { border-left-color: var(--cc-state-blocked); }
  .concerto-set-status[data-tone="busy"] { border-left-color: var(--cc-state-attention); }
  .concerto-set-card { display: flex; flex-direction: column; gap: var(--cc-space-4); min-width: 0; padding: var(--cc-space-5); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-lg); corner-shape: var(--cc-corner-shape); background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur); box-shadow: var(--cc-shadow-soft); }
  .concerto-set-card[data-tone="attention"] { border-color: color-mix(in srgb, var(--cc-state-attention) 40%, var(--cc-border)); }
  .concerto-set-card-head { display: flex; flex-direction: column; gap: 2px; }
  .concerto-set-card-head h3 { display: flex; align-items: center; gap: var(--cc-space-2); }
  .concerto-settings .concerto-set-hint { margin: 0; color: var(--cc-text-muted); font-size: var(--cc-fs-caption); }
  .concerto-set-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: var(--cc-space-3); }
  .concerto-set-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .concerto-set-label { font-size: var(--cc-fs-caption); font-weight: var(--cc-fw-strong); color: var(--cc-text-secondary); }
  .concerto-set-field select.concerto-input { cursor: pointer; }
  .concerto-set-block { display: flex; flex-direction: column; gap: var(--cc-space-3); padding-top: var(--cc-space-4); border-top: 1px solid var(--cc-border-subtle); }
  .concerto-set-block-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; }
  .concerto-set-members { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--cc-space-2); }
  .concerto-set-member { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) auto; gap: var(--cc-space-3); align-items: end; padding: var(--cc-space-3) var(--cc-space-4); border: 1px solid transparent; border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); background: var(--cc-card-nested-bg); animation: concerto-rise var(--cc-dur) var(--cc-ease); }
  .concerto-set-member-remove { justify-self: end; align-self: end; }
  .concerto-set-member-model { grid-column: 1 / -1; }
  .concerto-team-delete-dialog { width: min(30rem, calc(100% - 2rem)); }
  .concerto-set-connection { grid-column: 1 / -1; display: flex; align-items: center; flex-wrap: wrap; gap: var(--cc-space-2); overflow-wrap: anywhere; }
  .concerto-settings .concerto-set-empty { margin: 0; padding: var(--cc-space-4); border: 1px dashed var(--cc-border); border-radius: var(--cc-radius-card); color: var(--cc-text-muted); font-size: var(--cc-fs-meta); text-align: center; }
  .concerto-set-actions { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-3); flex-wrap: wrap; padding-top: var(--cc-space-4); border-top: 1px solid var(--cc-border-subtle); }
  .concerto-set-actions-hint { display: inline-flex; align-items: center; gap: 6px; font-size: var(--cc-fs-caption); color: var(--cc-text-muted); }
  .concerto-set-actions-hint .concerto-icon { color: var(--cc-state-done); }
  .concerto-set-actions-buttons { display: flex; align-items: center; justify-content: flex-end; gap: var(--cc-space-2); flex-wrap: wrap; margin-left: auto; }
  .concerto-set-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--cc-space-2); }
  .concerto-set-item { display: flex; flex-direction: column; gap: var(--cc-space-2); min-width: 0; padding: var(--cc-space-3) var(--cc-space-4); border: 1px solid transparent; border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); background: var(--cc-card-nested-bg); transition: border-color var(--cc-dur-fast) var(--cc-ease); }
  .concerto-set-list > .concerto-set-item:hover { border-color: var(--cc-border); }
  .concerto-set-item-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-3); flex-wrap: wrap; }
  .concerto-set-item-title { display: flex; align-items: center; gap: var(--cc-space-2); flex-wrap: wrap; min-width: 0; }
  .concerto-set-item-title > strong { font-weight: var(--cc-fw-heading); overflow-wrap: anywhere; }
  .concerto-set-meta { display: flex; align-items: center; gap: var(--cc-space-1) var(--cc-space-4); flex-wrap: wrap; min-width: 0; font-size: var(--cc-fs-caption); color: var(--cc-text-secondary); }
  .concerto-set-path { min-width: 0; overflow-wrap: anywhere; font-family: var(--cc-font-mono); font-size: var(--cc-fs-code); color: var(--cc-text-muted); }
  .concerto-set-caps { display: flex; flex-wrap: wrap; gap: var(--cc-space-1) var(--cc-space-2); }
  .concerto-set-caps .concerto-chip { cursor: default; background: var(--cc-card-bg); color: var(--cc-text-secondary); border-color: var(--cc-border-subtle); }
  .concerto-set-caps .concerto-chip[data-tone="ok"] { color: var(--cc-state-done); }
  .concerto-set-caps .concerto-chip[data-tone="warn"] { color: var(--cc-state-attention); background: var(--cc-state-attention-bg); border-color: transparent; }
  .concerto-set-caps .concerto-chip[data-tone="danger"] { color: var(--cc-state-blocked); background: var(--cc-state-blocked-bg); border-color: transparent; }
  .concerto-set-recovery { border-color: color-mix(in srgb, var(--cc-state-attention) 30%, transparent); background: var(--cc-card-bg); }
  .concerto-set-reason { padding: var(--cc-space-2) var(--cc-space-3); border-radius: var(--cc-radius-ctrl); background: var(--cc-state-blocked-bg); color: var(--cc-state-blocked); font-size: var(--cc-fs-meta); overflow-wrap: anywhere; }
  .concerto-set-result { padding: var(--cc-space-2) var(--cc-space-3); border-radius: var(--cc-radius-ctrl); background: var(--cc-state-attention-bg); color: var(--cc-state-attention); font-size: var(--cc-fs-caption); overflow-wrap: anywhere; }
  .concerto-set-result[data-ok="true"] { background: var(--cc-state-done-bg); color: var(--cc-state-done); }
  .concerto-set-check { display: flex; align-items: flex-start; gap: var(--cc-space-2); font-size: var(--cc-fs-caption); color: var(--cc-text-secondary); cursor: pointer; }
  .concerto-set-check > input { margin-top: 3px; accent-color: var(--cc-accent); }
  .concerto-set-fold > summary { cursor: pointer; padding: var(--cc-space-2) 0; color: var(--cc-text-muted); font-size: var(--cc-fs-caption); }
  .concerto-set-fold[open] > summary { margin-bottom: var(--cc-space-2); }
  .concerto-set-fold > .concerto-set-item + .concerto-set-item { margin-top: var(--cc-space-2); }
  /* Orchestra Stage Builder (Team Creator / Editor) */
  .concerto-stage { position: relative; display: flex; flex-direction: column; align-items: center; gap: var(--cc-space-3); padding: var(--cc-space-5) var(--cc-space-4) var(--cc-space-4); border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-lg); corner-shape: var(--cc-corner-shape); background: radial-gradient(ellipse 70% 55% at 50% 18%, color-mix(in srgb, var(--cc-accent) 12%, transparent), transparent 72%), var(--cc-card-nested-bg); overflow: hidden; }
  .concerto-stage-title-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 6px; max-width: 100%; padding: 4px 12px; border-radius: var(--cc-radius-pill); border: 1px solid transparent; transition: border-color var(--cc-dur-fast) var(--cc-ease), background var(--cc-dur-fast) var(--cc-ease); }
  .concerto-stage-title-wrap:hover, .concerto-stage-title-wrap:focus-within { border-color: color-mix(in srgb, var(--cc-accent) 45%, var(--cc-border)); background: var(--cc-card-bg); }
  .concerto-stage-title-input { appearance: none; border: none; background: transparent; color: var(--cc-text-primary); font-size: var(--cc-fs-h2, 1.25rem); font-weight: var(--cc-fw-heading); text-align: center; min-width: 120px; max-width: 320px; padding: 2px 4px; outline: none; }
  .concerto-stage-title-pen { font-size: var(--cc-fs-caption); color: var(--cc-text-muted); pointer-events: none; transition: color var(--cc-dur-fast) var(--cc-ease); }
  .concerto-stage-title-wrap:hover .concerto-stage-title-pen, .concerto-stage-title-wrap:focus-within .concerto-stage-title-pen { color: var(--cc-accent); }
  .concerto-stage-commander-zone { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
  .concerto-stage-svg { width: 100%; max-width: 520px; height: 52px; margin: -6px 0 -8px; pointer-events: none; overflow: visible; }
  .concerto-stage-arc { fill: none; stroke: color-mix(in srgb, var(--cc-accent) 45%, var(--cc-border)); stroke-width: 2; stroke-dasharray: 5 5; stroke-linecap: round; animation: concerto-stage-flow 1.8s linear infinite; }
  .concerto-stage-arc[data-active="true"] { stroke: var(--cc-accent); stroke-width: 2.5; }
  .concerto-stage-lanes { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--cc-space-3); width: 100%; }
  .concerto-stage-lane { display: flex; flex-direction: column; align-items: center; gap: var(--cc-space-2); padding: var(--cc-space-3); border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-card); background: color-mix(in srgb, var(--cc-card-bg) 72%, transparent); min-height: 118px; }
  .concerto-stage-lane-head { display: flex; align-items: center; gap: 6px; font-size: var(--cc-fs-caption); font-weight: var(--cc-fw-strong); color: var(--cc-text-secondary); }
  .concerto-stage-roster { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: center; gap: var(--cc-space-2); width: 100%; }
  .concerto-stage-node { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 10px; min-width: 84px; max-width: 148px; border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-card); background: var(--cc-card-bg); color: var(--cc-text-primary); cursor: pointer; transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), border-color var(--cc-dur-fast) var(--cc-ease), box-shadow 0.22s var(--cc-ease); }
  .concerto-stage-node:hover { transform: translateY(-4px) scale(1.03); border-color: color-mix(in srgb, var(--cc-accent) 55%, var(--cc-border)); box-shadow: 0 8px 20px color-mix(in srgb, var(--cc-accent) 16%, transparent); }
  .concerto-stage-node[data-selected="true"] { border-color: var(--cc-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--cc-accent) 32%, transparent), 0 10px 24px color-mix(in srgb, var(--cc-accent) 20%, transparent); transform: translateY(-2px); }
  .concerto-stage-node--commander { min-width: 148px; padding: 10px 16px; border-radius: var(--cc-radius-lg); }
  .concerto-stage-node--commander .concerto-pixel { animation: concerto-float 3.2s ease-in-out infinite; }
  .concerto-stage-node-name { font-size: var(--cc-fs-caption); font-weight: var(--cc-fw-strong); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .concerto-stage-node-sub { font-size: var(--cc-fs-micro); color: var(--cc-text-muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .concerto-stage-add { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 76px; min-height: 86px; padding: 8px; border: 1.5px dashed var(--cc-border); border-radius: var(--cc-radius-card); background: transparent; color: var(--cc-text-muted); font-size: var(--cc-fs-caption); cursor: pointer; transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), border-color var(--cc-dur-fast) var(--cc-ease), color var(--cc-dur-fast) var(--cc-ease), background var(--cc-dur-fast) var(--cc-ease); }
  .concerto-stage-add:hover { transform: translateY(-3px) scale(1.03); border-color: var(--cc-accent); color: var(--cc-accent); background: color-mix(in srgb, var(--cc-accent) 8%, transparent); }
  .concerto-stage-add-plus { font-size: var(--cc-fs-h2); line-height: 1; font-weight: 400; }
  .concerto-stage-inspector { width: 100%; padding: var(--cc-space-4); border: 1px solid color-mix(in srgb, var(--cc-accent) 35%, var(--cc-border)); border-radius: var(--cc-radius-card); background: var(--cc-card-bg); box-shadow: var(--cc-shadow-soft); animation: concerto-stage-expand 0.24s cubic-bezier(0.22, 1, 0.36, 1); display: flex; flex-direction: column; gap: var(--cc-space-3); }
  .concerto-stage-inspector-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); padding-bottom: var(--cc-space-2); border-bottom: 1px solid var(--cc-border-subtle); }
  .concerto-stage-inspector-title { display: flex; align-items: center; gap: var(--cc-space-2); font-weight: var(--cc-fw-heading); font-size: var(--cc-fs-meta); }
  @keyframes concerto-stage-flow { to { stroke-dashoffset: -20; } }
  @keyframes concerto-stage-expand { from { opacity: 0; transform: translateY(-6px) scale(0.985); } to { opacity: 1; transform: none; } }
  /* TeamHome Live Orchestra Performance Stage */
  .concerto-live-stage { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: var(--cc-space-3) var(--cc-space-3) var(--cc-space-2); border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-card); background: radial-gradient(ellipse 60% 55% at 50% 15%, color-mix(in srgb, var(--cc-accent) 9%, transparent), transparent 72%), var(--cc-card-nested-bg); }
  .concerto-live-stage-svg { width: 100%; max-width: 460px; height: 30px; margin: -4px 0 -4px; pointer-events: none; overflow: visible; }
  .concerto-live-stage-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--cc-space-2); width: 100%; }
  .concerto-live-stage-wings { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--cc-space-3); width: 100%; }
  .concerto-live-stage-wing { flex: 1 1 180px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--cc-space-2); }
  /* A/B Compare Race Board */
  .concerto-race-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--cc-space-3); width: 100%; }
  .concerto-race-col { display: flex; flex-direction: column; gap: var(--cc-space-2); padding: var(--cc-space-3); border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-card); background: var(--cc-card-bg); min-width: 0; }
  .concerto-race-col[data-winner="true"] { border-color: var(--cc-state-done); box-shadow: 0 0 0 2px var(--cc-state-done-bg); }
  @container concerto-set (max-width: 540px) { .concerto-stage-lanes { grid-template-columns: minmax(0, 1fr); } .concerto-stage-svg { display: none; } }
  @container concerto-set (max-width: 720px) { .concerto-set-member { grid-template-columns: repeat(2, minmax(0, 1fr)); } .concerto-set-member-remove { grid-column: 1 / -1; justify-self: start; } }
  @container concerto-set (max-width: 640px) { .concerto-set-card { padding: var(--cc-space-4); } }
  @container concerto-set (max-width: 440px) { .concerto-set-member { grid-template-columns: minmax(0, 1fr); } .concerto-set-actions-buttons { width: 100%; } .concerto-set-actions-buttons > .concerto-btn { flex: 1 1 0; } }
  /* Host Wallpaper Glass edge highlight parity */
  body[data-we-glass-page="on"] .concerto-surface :is(.concerto-card, .concerto-turn-card, .concerto-tool-card, .concerto-hero, .concerto-attn-card, .concerto-task-module, .concerto-kcard, .concerto-briefing-cell, .concerto-filter-bar, .concerto-sprite),
  body[data-we-glass-page="on"] .concerto-panel,
  body[data-we-glass-page="on"] .concerto-dock,
  body[data-we-glass-page="on"] .concerto-drawer,
  body[data-we-glass-page="on"] .concerto-canvas-modal {
    border-color: var(--dsw-alias-settings-card-stroke, var(--cc-border-subtle));
  }

  @keyframes concerto-float { 50% { transform: translateY(-3px); } }
  @keyframes concerto-pulse { 50% { opacity: 0.45; } }
  @keyframes concerto-breathe { 0%, 100% { box-shadow: 0 0 0 3px var(--cc-state-done-bg); } 50% { box-shadow: 0 0 0 5px transparent; } }
  @keyframes concerto-rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  @keyframes concerto-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes concerto-tab-in { from { transform: scaleX(.4); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes concerto-drawer-in { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes concerto-pop-in { from { transform: scale(.98); opacity: 0; } to { transform: none; opacity: 1; } }
  .concerto-tab-content { animation: concerto-fade-in var(--cc-dur) var(--cc-ease); }
  .concerto-attention-popover, .concerto-hero-menu-list { animation: concerto-rise var(--cc-dur-fast) var(--cc-ease); }
  @media (prefers-reduced-motion: reduce) {
    .concerto-surface *, .concerto-surface *::before, .concerto-surface *::after { transition: none !important; }
    .concerto-sprite svg, .concerto-message-avatar svg, .concerto-sprite .concerto-halo-pulse, .concerto-semantic-pill::before, .concerto-stage-arc, .concerto-stage-node--commander .concerto-pixel, .concerto-stage-inspector { animation: none !important; }
    .concerto-live-dot::before, .concerto-tab-btn::after, .concerto-tab-content, .concerto-board-card-list > li, .concerto-jump-banner, .concerto-attention-popover, .concerto-hero-menu-list, .concerto-drawer[open], .concerto-canvas-modal[open], .concerto-drawer::backdrop, .concerto-canvas-modal::backdrop { animation: none !important; }
    .concerto-kcard:hover, .concerto-btn:active:not(:disabled) { transform: none; }
    .concerto-task-highlight, .concerto-card-highlight { animation: none !important; outline: 2px solid var(--cc-accent); }
  }
  @media (forced-colors: active) {
    .concerto-tab-btn[aria-selected="true"] { color: Highlight; }
    .concerto-tab-btn[aria-selected="true"]::after { border-color: Highlight; }
    .concerto-surface :is(button, input, textarea, summary, [tabindex], select):focus-visible { outline-color: Highlight; }
    .concerto-btn--pin[aria-pressed="true"] { border-color: Highlight; }
  }
  @container concerto (max-width: 900px) {
    .concerto-board-cols { display: flex; overflow-x: auto; gap: var(--cc-space-3); scroll-snap-type: inline proximity; overscroll-behavior-inline: contain; padding: 4px 4px 12px; margin-inline: -4px; }
    .concerto-board-col { flex: 0 0 260px; min-width: 0; scroll-snap-align: start; }
    .concerto-bento-item,
    .concerto-bento-item[data-size="l"],
    .concerto-bento-item[data-size="m"],
    .concerto-bento-item[data-size="s"] { grid-column: span 12 !important; }
    .concerto-briefing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .concerto-briefing-cell:first-child { grid-column: 1 / -1; }
  }
  @container concerto (max-width: 640px) {
    .concerto-hero { padding: var(--cc-space-3) var(--cc-space-3) 0; gap: var(--cc-space-2); border-radius: var(--cc-radius-lg); }
    .concerto-hero .concerto-tabs { gap: 0; }
    .concerto-hero[data-compact="true"] { padding-inline: var(--cc-space-3); }
    .concerto-hero-compact { flex-wrap: wrap; row-gap: var(--cc-space-1); }
    .concerto-hero-compact-title { flex: 1 1 100%; }
    .concerto-hero-compact-actions { width: 100%; justify-content: space-between; }
    .concerto-compact-roster, .concerto-hero-compact-title .concerto-live-dot { display: none; }
    .concerto-hero-top { gap: var(--cc-space-2); }
    .concerto-hero-title { flex-wrap: nowrap; font-size: var(--cc-fs-title); }
    .concerto-hero-title h2 { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .concerto-hero-title > .concerto-badge { display: none; }
    .concerto-hero-goal { max-width: 100%; }
    .concerto-hero .concerto-sprite small { display: none; }
    .concerto-hero .concerto-sprite { min-height: 34px; }
    .concerto-hero .concerto-sprite svg { width: 26px; height: 26px; }
    .concerto-pending-unit { display: none; }
    .concerto-briefing-grid { grid-template-columns: 1fr; }
    .concerto-board-cols { display: flex; overflow: auto; gap: var(--cc-space-3); scroll-snap-type: inline proximity; overscroll-behavior-inline: contain; padding: 4px 4px 12px; margin-inline: -4px; }
    .concerto-board-col { flex: 0 0 min(260px, 85cqi); min-width: 0; scroll-snap-align: start; }
    .concerto-board-jump { position: sticky; top: var(--cc-sticky-height, 0); z-index: 4; display: flex; gap: var(--cc-space-1); overflow-x: auto; padding: var(--cc-space-2); border: 1px solid var(--cc-border); border-radius: var(--cc-radius-pill); background: var(--cc-menu-bg); backdrop-filter: var(--cc-menu-blur); -webkit-backdrop-filter: var(--cc-menu-blur); }
    .concerto-board-jump-btn { flex: none; padding: 4px var(--cc-space-2); border: 1px solid transparent; border-radius: var(--cc-radius-pill); background: transparent; color: var(--cc-text-secondary); font: inherit; font-size: var(--cc-fs-caption); cursor: pointer; }
    .concerto-board-jump-btn[aria-pressed="true"] { border-color: var(--cc-accent-border); background: var(--cc-accent-soft); color: var(--cc-accent-text); }
    .concerto-acc-cols { grid-template-columns: 1fr; }
    .concerto-stage-tools { opacity: 1; }
    .concerto-filter-bar { display: grid; grid-template-columns: 1fr 1fr; }
    .concerto-filter-bar label { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .concerto-filter-bar label:first-child { grid-column: 1 / -1; }
    .concerto-filter-bar select { width: 100%; text-overflow: ellipsis; }
    .concerto-tabs { width: 100%; }
    .concerto-tab-btn { flex: 1; justify-content: center; }
    .concerto-key-task-row { flex-direction: column; align-items: flex-start; gap: var(--cc-space-1); }
    .concerto-hero-status { gap: var(--cc-space-2); }
    .concerto-sprite-meta { max-width: 150px; }
  }
  @container concerto (max-width: 380px) {
    .concerto-hero-title .concerto-live-dot { font-size: 0; gap: 0; }
    .concerto-progress-bar { min-width: 70px; }
  }
  @container concerto-drawer (max-width: 400px) {
    .concerto-drawer-head { padding: var(--cc-space-3); }
    .concerto-drawer-tabs { padding-inline: var(--cc-space-3); }
    .concerto-card-head { align-items: flex-start; }
  }
  @media (max-width: 600px) {
    .concerto-canvas-modal { width: 100%; max-width: 100%; height: 100dvh; max-height: 100dvh; border: 0; border-radius: 0; }
  }
  @media (max-width: 600px) { .concerto-panel { top: 56px; right: 16px; max-height: calc(100dvh - 280px); } }
`;
var teamCssRefs = 0;
function useTeamCss() {
  if (typeof import_react2.default.useEffect !== "function") return;
  import_react2.default.useEffect(() => {
    if (typeof document === "undefined" || !document.head) return;
    if (teamCssRefs === 0 && !document.getElementById("concerto-team-css")) {
      const styleEl = document.createElement("style");
      styleEl.id = "concerto-team-css";
      styleEl.textContent = TEAM_CSS;
      document.head.appendChild(styleEl);
    }
    teamCssRefs += 1;
    return () => {
      teamCssRefs = Math.max(0, teamCssRefs - 1);
      if (teamCssRefs === 0) {
        document.getElementById("concerto-team-css")?.remove();
      }
    };
  }, []);
}

// packages/dsh-concerto/src/client/components/UiIcon.js
var STATUS_ICON = {
  running: "refresh",
  in_progress: "refresh",
  waiting_input: "attention",
  waiting_approval: "attention",
  attention: "attention",
  review: "review",
  completed: "check",
  done: "check",
  blocked: "blocked",
  failed: "blocked",
  unknown: "unknown",
  idle: "idle",
  pending: "idle",
  \u534F\u8C03: "music"
};
function iconChildren(name, filled) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "close":
      return [h("path", { key: "p", ...stroke, d: "M4 4l8 8M12 4l-8 8" })];
    case "check":
      return [h("path", { key: "p", ...stroke, d: "M3 8.5l3 3L13 4.5" })];
    case "refresh":
      return [
        h("path", { key: "a", ...stroke, d: "M13 5V2l-2 2a5.5 5.5 0 1 0 1.4 6" }),
        h("path", { key: "b", ...stroke, d: "M10.5 2H13v2.5" })
      ];
    case "expand":
      return [h("path", { key: "p", ...stroke, d: "M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4M2 6l4-4M14 6l-4-4M2 10l4 4M14 10l-4 4" })];
    case "pin":
      return [h("path", { key: "p", ...stroke, fill: filled ? "currentColor" : "none", d: "M5 2h6l-1 5 2.5 2.5v1h-9v-1L6 7V2zm3 8.5V14" })];
    case "info":
      return [
        h("circle", { key: "c", ...stroke, cx: 8, cy: 8, r: 6 }),
        h("path", { key: "p", ...stroke, d: "M8 7v4M8 4.5v.5" })
      ];
    case "attention":
      return [h("circle", { key: "c", cx: 8, cy: 8, r: 4, fill: "currentColor" })];
    case "review":
      return [
        h("circle", { key: "c", ...stroke, cx: 8, cy: 8, r: 6 }),
        h("path", { key: "p", d: "M8 2a6 6 0 0 1 0 12z", fill: "currentColor" })
      ];
    case "blocked":
      return [
        h("circle", { key: "c", ...stroke, cx: 8, cy: 8, r: 6 }),
        h("path", { key: "p", ...stroke, d: "M8 4v5M8 11.5v.5" })
      ];
    case "unknown":
      return [
        h("circle", { key: "c", ...stroke, cx: 8, cy: 8, r: 6 }),
        h("path", { key: "p", ...stroke, d: "M6 6a2 2 0 0 1 4 0c0 1.5-2 1.5-2 3M8 11v.5" })
      ];
    case "idle":
      return [h("circle", { key: "c", ...stroke, cx: 8, cy: 8, r: 5 })];
    case "music":
      return [h("path", { key: "p", ...stroke, d: "M6 11V3l7-1v8M6 6l7-1" }), h("circle", { key: "a", ...stroke, cx: 4.5, cy: 11.5, r: 1.5 }), h("circle", { key: "b", ...stroke, cx: 11.5, cy: 10.5, r: 1.5 })];
    case "checkbox":
      return [h("rect", { key: "r", ...stroke, x: 2.5, y: 2.5, width: 11, height: 11, rx: 2 })];
    case "checkbox-checked":
    case "checklist":
      return [h("rect", { key: "r", ...stroke, x: 2.5, y: 2.5, width: 11, height: 11, rx: 2 }), h("path", { key: "p", ...stroke, d: "M5 8l2 2 4-5" })];
    case "table":
      return [h("rect", { key: "r", ...stroke, x: 2, y: 3, width: 12, height: 10, rx: 1 }), h("path", { key: "p", ...stroke, d: "M2 7h12M6 3v10M10 3v10" })];
    case "mindmap":
      return [h("circle", { key: "a", ...stroke, cx: 4, cy: 8, r: 2 }), h("circle", { key: "b", ...stroke, cx: 12, cy: 4, r: 2 }), h("circle", { key: "c", ...stroke, cx: 12, cy: 12, r: 2 }), h("path", { key: "p", ...stroke, d: "M6 8h2a2 2 0 0 0 2-2M6 8h2a2 2 0 0 1 2 2" })];
    case "diagram":
      return [h("path", { key: "p", ...stroke, d: "M2 8h10M9 4l4 4-4 4" })];
    case "board":
      return [h("path", { key: "p", ...stroke, d: "M3 11l8-8 2 2-8 8H3v-2zm7-7 2 2M3 14h10" })];
    case "html":
      return [h("rect", { key: "r", ...stroke, x: 2, y: 2, width: 12, height: 12, rx: 2 }), h("path", { key: "p", ...stroke, d: "M6 6L4 8l2 2M10 6l2 2-2 2" })];
    default:
      return [h("circle", { key: "c", ...stroke, cx: 8, cy: 8, r: 5 })];
  }
}
function UiIcon({ name, size = 16, filled = false, className = "" }) {
  return h("svg", {
    className: `concerto-icon ${className}`.trim(),
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    "aria-hidden": "true",
    focusable: "false"
  }, iconChildren(name, filled));
}
function StatusIcon({ status, size = 16 }) {
  return h(UiIcon, { name: STATUS_ICON[status] || "idle", size });
}
function StateChip({ status, text, className = "" }) {
  const meta = STATE_META[status] || STATE_META.idle;
  return h(
    "span",
    { className: `concerto-state-chip ${meta.cls} ${className}`.trim() },
    h(StatusIcon, { status }),
    h("span", null, text || meta.label)
  );
}

// packages/dsh-concerto/src/client/components/TaskInspectorDialog.js
var import_react4 = __toESM(require_react(), 1);
var import_react_dom = __toESM(require_react_dom(), 1);

// packages/dsh-concerto/src/client/components/overlay.js
var import_react3 = __toESM(require_react(), 1);
function useModalDialog(dialogRef, onClose, active = true) {
  const closeRef = import_react3.default.useRef(onClose);
  closeRef.current = onClose;
  import_react3.default.useEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    const closed = () => {
      if (!dialog.open) closeRef.current?.();
    };
    dialog.addEventListener("close", closed);
    const outside = (event) => {
      const r = dialog.getBoundingClientRect();
      return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
    };
    let pressedOutside = false;
    const pointerDown = (event) => {
      pressedOutside = outside(event);
    };
    const pointerUp = (event) => {
      if (pressedOutside && outside(event)) dialog.close();
    };
    if (!("closedBy" in dialog)) {
      dialog.addEventListener("pointerdown", pointerDown);
      dialog.addEventListener("pointerup", pointerUp);
    }
    dialog.showModal();
    return () => {
      dialog.removeEventListener("close", closed);
      dialog.removeEventListener("pointerdown", pointerDown);
      dialog.removeEventListener("pointerup", pointerUp);
      dialog.close();
    };
  }, [active]);
}

// packages/dsh-concerto/src/client/components/TaskInspectorDialog.js
function InspectorDialog({ title, onClose, className = "", dialogProps = {}, children }) {
  useTeamCss();
  const hostTheme = useHostTheme();
  const dialogRef = import_react4.default.useRef(null);
  useModalDialog(dialogRef, onClose);
  const dialog = h("dialog", {
    ref: dialogRef,
    className: `concerto-drawer concerto-surface ${className}`.trim(),
    "data-concerto-theme": hostTheme.colorScheme,
    closedby: "any",
    ...dialogProps,
    "aria-label": title,
    style: hostTheme.cssVars
  }, children);
  return typeof document !== "undefined" && document.body ? (0, import_react_dom.createPortal)(dialog, document.body) : dialog;
}
function TaskInspectorDialog({ title, onClose, children }) {
  return h(InspectorDialog, {
    title: `\u4EFB\u52A1\u8BE6\u60C5\uFF1A${title}`,
    onClose,
    className: "concerto-task-inspector-dialog",
    dialogProps: { "data-concerto-task-inspector-dialog": "true" }
  }, h("div", { className: "concerto-drawer-body" }, children));
}

// packages/dsh-concerto/src/client/components/MemberSprite.js
var MEMBER_PALETTE = [
  "var(--dsw-static-blue-400, var(--cc-fb-member-1))",
  "var(--dsw-static-violet-400, var(--cc-fb-member-2))",
  "var(--dsw-static-green-400, var(--cc-fb-member-3))",
  "var(--dsw-static-red-400, var(--cc-fb-member-4))",
  "var(--dsw-static-amber-400, var(--cc-fb-member-5))",
  "var(--dsw-static-blue-500, var(--cc-fb-member-6))"
];
function memberColor(id) {
  let hash = 0;
  for (const ch of String(id || "m")) {
    hash = hash * 31 + ch.codePointAt(0) >>> 0;
  }
  return MEMBER_PALETTE[hash % MEMBER_PALETTE.length];
}
function stateRingColor(state) {
  if (state === "running" || state === "\u534F\u8C03") return "var(--cc-state-running)";
  if (state === "waiting_input" || state === "waiting_approval" || state === "attention") return "var(--cc-state-attention)";
  if (state === "review") return "var(--cc-state-review)";
  if (state === "blocked" || state === "failed") return "var(--cc-state-blocked)";
  if (state === "completed" || state === "done") return "var(--cc-state-done)";
  if (state === "unknown") return "var(--cc-state-unknown)";
  return "var(--cc-border)";
}
function resolveInstrument(member) {
  if (member?.instrument) return member.instrument;
  if (member?.roleKind === "reviewer") return "magnifier";
  if (member?.roleKind === "writer" || /writer|author|doc/i.test(String(member?.role || member?.id || ""))) return "quill";
  const hash = Array.from(String(member?.id || "w")).reduce((s, ch) => s + ch.codePointAt(0), 0);
  const instruments = ["keyboard", "violin", "quill"];
  return instruments[hash % instruments.length];
}
function MemberGlyph({ member, state = "idle", size = 32 }) {
  const color = member?.roleKind === "commander" ? "var(--cc-accent)" : memberColor(member?.id);
  const ring = stateRingColor(state);
  const instrument = resolveInstrument(member);
  const isRunning = state === "running" || state === "\u534F\u8C03";
  const CONNECTOR_BADGE = { antigravity: "A", claude: "C", codex: "C", gemini: "G", opencode: "O" };
  const sourceBadge = member?.connector ? CONNECTOR_BADGE[member.connector] || "W" : member?.source === "hosted" ? "D" : "W";
  return h(
    "svg",
    {
      className: "concerto-pixel",
      width: size,
      height: size,
      viewBox: "0 0 64 64",
      "aria-hidden": true,
      style: { flex: "none" }
    },
    h("circle", {
      cx: 32,
      cy: 32,
      r: 28,
      fill: "none",
      stroke: ring,
      strokeWidth: 2.5,
      className: isRunning ? "concerto-halo-pulse" : void 0,
      strokeDasharray: state === "unknown" ? "4 3" : void 0
    }),
    h("circle", { cx: 32, cy: 34, r: 16, fill: color }),
    h("circle", { cx: 26.5, cy: 32, r: 2.8, fill: "var(--cc-fb-ink-dark)" }),
    h("circle", { cx: 27.2, cy: 31.2, r: 1, fill: "var(--cc-fb-ink-light)" }),
    h("circle", { cx: 37.5, cy: 32, r: 2.8, fill: "var(--cc-fb-ink-dark)" }),
    h("circle", { cx: 38.2, cy: 31.2, r: 1, fill: "var(--cc-fb-ink-light)" }),
    h("path", {
      d: "M28 38.5 Q32 41.5 36 38.5",
      fill: "none",
      stroke: "var(--cc-fb-ink-dark)",
      strokeWidth: 1.8,
      strokeLinecap: "round"
    }),
    member?.roleKind === "commander" ? h(
      "g",
      null,
      h("path", { d: "M21 20 L43 20 L40 12 L24 12 Z", fill: "var(--cc-fb-hat-fill)", stroke: color, strokeWidth: 1.5 }),
      h("line", { x1: 48, y1: 36, x2: 57, y2: 20, stroke: "var(--cc-fb-gold-highlight)", strokeWidth: 2, strokeLinecap: "round" }),
      h("circle", { cx: 57.5, cy: 19.5, r: 2, fill: "var(--cc-fb-ink-light)" })
    ) : instrument === "keyboard" ? h(
      "g",
      null,
      h("rect", { x: 14, y: 45, width: 24, height: 9, rx: 2, fill: "var(--cc-fb-ink-dark)", stroke: "var(--cc-fb-slate-stroke)", strokeWidth: 1.2 }),
      h("line", { x1: 18, y1: 49.5, x2: 34, y2: 49.5, stroke: "var(--cc-fb-slate-muted)", strokeDasharray: "2 2", strokeWidth: 2 })
    ) : instrument === "violin" ? h(
      "g",
      null,
      h("ellipse", { cx: 47, cy: 40, rx: 5, ry: 8, transform: "rotate(-20 47 40)", fill: "var(--cc-fb-gold-fill)", stroke: "var(--cc-fb-gold-highlight)", strokeWidth: 1.2 }),
      h("line", { x1: 42, y1: 30, x2: 54, y2: 46, stroke: "var(--cc-fb-gold-soft)", strokeWidth: 1.4 })
    ) : instrument === "quill" ? h(
      "g",
      null,
      h("path", { d: "M43 47 C45 36, 52 28, 57 25 C55 33, 50 41, 43 47 Z", fill: "var(--cc-fb-ink-light)", stroke: "var(--cc-fb-sky-stroke)", strokeWidth: 1.3 }),
      h("line", { x1: 41, y1: 49, x2: 55, y2: 27, stroke: "var(--cc-fb-sky-soft)", strokeWidth: 1.4, strokeLinecap: "round" })
    ) : h(
      "g",
      null,
      h("circle", { cx: 48, cy: 40, r: 6, fill: "none", stroke: "var(--cc-fb-slate-stroke)", strokeWidth: 1.8 }),
      h("line", { x1: 52, y1: 45, x2: 57, y2: 50, stroke: "var(--cc-fb-slate-stroke)", strokeWidth: 2, strokeLinecap: "round" })
    ),
    h(
      "g",
      { transform: "translate(45,45)" },
      h("circle", { cx: 8, cy: 8, r: 8, fill: "var(--cc-fb-ink-dark)", stroke: ring, strokeWidth: 1.5 }),
      h("text", { x: 8, y: 11, textAnchor: "middle", fontSize: 9, fontWeight: 700, fill: "var(--cc-fb-ink-light)" }, sourceBadge)
    )
  );
}
function MemberSprite({ member, state, activityLine, count = 0, selected = false, onClick }) {
  const subtitle = activityLine || label(state);
  return h(
    "button",
    {
      type: "button",
      className: "concerto-sprite",
      "data-state": state,
      "data-concerto-member-id": member.id,
      "aria-pressed": selected,
      "aria-label": member.id + " \xB7 " + label(state) + (count ? " \xB7 " + count + " \u9879\u5F85\u529E" : ""),
      onClick
    },
    h(MemberGlyph, { member, state, size: 32 }),
    h(
      "span",
      { className: "concerto-sprite-meta" },
      h("strong", null, member.id + (member.roleKind === "commander" ? " \xB7 \u6307\u6325\u8005" : "")),
      h("small", { title: subtitle }, subtitle)
    ),
    count > 0 && h("span", {
      className: "concerto-count-pill",
      style: { background: "var(--cc-state-attention-bg)", color: "var(--cc-state-attention)" }
    }, count)
  );
}

// packages/dsh-concerto/src/client/components/Panels.js
var ADJUDICATION_NOTES = {
  confirm_failed: "\u7528\u6237\u9009\u62E9\uFF1A\u786E\u8BA4\u6267\u884C\u5DF2\u505C\u6B62",
  retry_isolated: "\u7528\u6237\u9009\u62E9\uFF1A\u5728\u9694\u79BB\u5DE5\u4F5C\u533A\u91CD\u8BD5",
  accept: "\u7528\u6237\u9009\u62E9\uFF1A\u63A5\u6536\u5DF2\u9A8C\u8BC1\u4EA4\u4ED8",
  force_release: "\u7528\u6237\u786E\u8BA4\u98CE\u9669\u5E76\u5F3A\u5236\u89E3\u9664\u5DE5\u4F5C\u76EE\u5F55\u5360\u7528\uFF08\u672A\u53D6\u5F97\u540E\u7AEF\u505C\u6B62\u8BC1\u636E\uFF09"
};
function ForceReleaseDialog({ row, busy, onClose, onConfirm }) {
  const descriptionId = import_react5.default.useId();
  const [riskAccepted, setRiskAccepted] = import_react5.default.useState(false);
  const cancelRef = import_react5.default.useRef(null);
  import_react5.default.useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  return h(InspectorDialog, {
    title: `\u5F3A\u5236\u89E3\u9664\u76EE\u5F55\u5360\u7528 \xB7 ${row.executionId}`,
    onClose: () => {
      if (!busy) onClose();
    },
    className: "concerto-force-release-dialog",
    dialogProps: { "aria-describedby": descriptionId }
  }, h(
    "div",
    { className: "concerto-drawer-body" },
    h("h3", null, `\u786E\u8BA4\u5F3A\u5236\u89E3\u9664 ${row.executionId} \u7684\u76EE\u5F55\u5360\u7528\uFF1F`),
    h(
      "p",
      { id: descriptionId },
      `\u6240\u5C5E\u56E2\u961F\uFF1A${row.teamName || row.teamSessionId}\uFF08${row.teamSessionId}\uFF09`,
      row.writeScope ? ` \xB7 \u5DE5\u4F5C\u76EE\u5F55\uFF1A${row.writeScope}` : "",
      "\u3002\u8BE5\u64CD\u4F5C\u4E0D\u4F1A\u7B49\u5F85\u540E\u7AEF\u505C\u6B62\u8BC1\u636E\uFF1B\u5982\u679C\u539F\u6267\u884C\u4ECD\u5728\u8FD0\u884C\uFF0C\u53EF\u80FD\u5BFC\u81F4\u6587\u4EF6\u5E76\u53D1\u5199\u5165\u51B2\u7A81\u3002\u82E5\u6838\u5BF9\u53D1\u73B0\u4EE3\u7406\u4ECD\u5904\u4E8E\u6D3B\u8DC3\u72B6\u6001\uFF0C\u7CFB\u7EDF\u4ECD\u4F1A\u62D2\u7EDD\u91CA\u653E\u3002"
    ),
    h(
      "label",
      { className: "concerto-set-check" },
      h("input", {
        type: "checkbox",
        checked: riskAccepted,
        disabled: busy,
        onChange: (e) => setRiskAccepted(e.target.checked)
      }),
      h("span", null, "\u6211\u5DF2\u786E\u8BA4\u539F\u4EFB\u52A1\u4E0D\u518D\u8FD0\u884C\u6216\u81EA\u884C\u627F\u62C5\u5E76\u53D1\u5199\u5165\u98CE\u9669\uFF0C\u5F3A\u5236\u91CA\u653E\u5DE5\u4F5C\u76EE\u5F55\u9501\u5B9A")
    ),
    h(
      "div",
      { className: "concerto-set-actions-buttons" },
      h("button", { ref: cancelRef, type: "button", className: "concerto-btn", autoFocus: true, disabled: busy, onClick: onClose }, "\u53D6\u6D88"),
      h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--danger",
        disabled: busy || !riskAccepted,
        onClick: onConfirm
      }, "\u786E\u8BA4\u98CE\u9669\u5E76\u5F3A\u5236\u91CA\u653E")
    )
  ));
}
function DeliveryRecoveryNote({ delivery }) {
  return h(
    "p",
    { className: "concerto-field-hint" },
    `\u5DF2\u9A8C\u8BC1\u4EA4\u4ED8\uFF1A${delivery.artifactRefs.join("\u3001")}\u3002\u63A5\u6536\u540E\u539F\u5DE5\u4F5C\u533A\u7EE7\u7EED\u4FDD\u7559\u5360\u7528\uFF0C\u76F4\u5230\u6838\u5BF9\u5E76\u786E\u8BA4\u539F\u6267\u884C\u5DF2\u505C\u6B62\u3002`,
    delivery.requiresReview && "\u786E\u8BA4\u505C\u6B62\u540E\u53EF\u7EE7\u7EED\u72EC\u7ACB\u5BA1\u67E5\u3002"
  );
}
function RecoveryExecutionRow({ row, busy, onBusy, onDone, onError }) {
  const [reviewed, setReviewed] = import_react5.default.useState(false);
  const [forceOpen, setForceOpen] = import_react5.default.useState(false);
  const [recResult, setRecResult] = import_react5.default.useState(row.lastReconcile || null);
  const isCrossRestart = row.isCurrentHostBoot === false;
  async function onReconcile() {
    onBusy(true);
    try {
      const out = await reconcileUnknownExecution({
        teamSessionId: row.teamSessionId,
        taskId: row.taskId,
        executionId: row.executionId
      });
      setRecResult(out);
      onDone(`\u540E\u7AEF\u6838\u5BF9\u7ED3\u679C\uFF1A${out.reason || (out.confirmedStopped ? "\u5DF2\u786E\u8BA4\u505C\u6B62" : "\u672A\u786E\u8BA4\u505C\u6B62")}`);
    } catch (e) {
      onError("\u540E\u7AEF\u6838\u5BF9\u5931\u8D25\uFF1A" + e.message);
    } finally {
      onBusy(false);
    }
  }
  async function onAdjudicate(action) {
    onBusy(true);
    try {
      const out = await adjudicateRecoveryExecution({
        teamSessionId: row.teamSessionId,
        taskId: row.taskId,
        executionId: row.executionId,
        commandId: `rec-${row.executionId}-${action}-${Date.now()}`,
        action,
        reason: ADJUDICATION_NOTES[action],
        ...action === "retry_isolated" ? { externalEffectsReviewed: reviewed } : {},
        ...action === "accept" ? { resultId: row.recoverableDelivery.resultId } : {},
        ...action === "force_release" ? { confirmUnverifiedRelease: true } : {}
      });
      const messages = {
        retry_isolated: `\u5DF2\u5728\u9694\u79BB\u65B0\u76EE\u5F55\u5C31\u7EEA\uFF08\u539F\u5DE5\u4F5C\u533A\u4FDD\u7559\u6807\u8BB0\uFF09\uFF1A${out.retryCwd || ""}`,
        confirm_failed: `\u5DF2\u786E\u8BA4\u540E\u7AEF\u505C\u6B62\u5E76\u91CA\u653E\u539F\u5DE5\u4F5C\u533A\uFF08\u4EFB\u52A1\u72B6\u6001\uFF1A${out.state || "failed"}\uFF09`,
        accept: "\u5DF2\u63A5\u6536\u4EA4\u4ED8\u3002\u8BF7\u5728\u4FDD\u7559\u5360\u7528\u7684\u5217\u8868\u4E2D\u7EE7\u7EED\u6838\u5BF9\u539F\u6267\u884C\u3002",
        force_release: out.forcedUnverified === false ? `\u5DF2\u53D6\u5F97\u540E\u7AEF\u505C\u6B62\u8BC1\u636E\u5E76\u91CA\u653E\u539F\u5DE5\u4F5C\u533A\uFF08\u4EFB\u52A1\u72B6\u6001\uFF1A${out.state || "failed"}\uFF09` : `\u5DF2\u6309\u7528\u6237\u98CE\u9669\u786E\u8BA4\u5F3A\u5236\u89E3\u9664\u539F\u5DE5\u4F5C\u533A\u5360\u7528\uFF08\u4EFB\u52A1\u72B6\u6001\uFF1A${out.state || "failed"}\uFF09`
      };
      if (action === "force_release") setForceOpen(false);
      onDone(messages[action]);
    } catch (e) {
      onError("\u6062\u590D\u64CD\u4F5C\u88AB\u62D2\u7EDD\uFF1A" + e.message);
    } finally {
      onBusy(false);
    }
  }
  return h(
    "div",
    {
      key: row.executionId,
      className: "concerto-set-item concerto-set-recovery",
      "data-concerto-recovery-exec": row.executionId
    },
    h(
      "div",
      { className: "concerto-set-item-head" },
      h(
        "div",
        { className: "concerto-set-item-title" },
        h("strong", null, `${row.taskTitle || row.taskId}`),
        h("span", { className: "concerto-badge concerto-id" }, row.executionId),
        row.memberId && h("span", { className: "concerto-chip" }, row.memberId),
        row.connectorId && h("span", { className: "concerto-tag" }, row.connectorId),
        isCrossRestart && h("span", { className: "concerto-state-chip concerto-state-attention" }, "\u8DE8\u91CD\u542F\u5B64\u513F"),
        row.deliveryAccepted && h("span", { className: "concerto-tag" }, "\u5DF2\u63A5\u6536\u4EA4\u4ED8"),
        row.quarantined && h("span", { className: "concerto-tag" }, "\u539F\u5DE5\u4F5C\u533A\u5DF2\u9694\u79BB\u4FDD\u7559")
      ),
      h("button", { type: "button", className: "concerto-btn", disabled: busy, onClick: onReconcile }, "\u6838\u5BF9\u540E\u7AEF\u72B6\u6001")
    ),
    h(
      "div",
      { className: "concerto-set-meta" },
      h("span", null, `\u56E2\u961F\u8FD0\u884C\uFF1A${row.teamName || row.teamSessionId} (${row.teamSessionId})`),
      h("span", null, `\u539F\u6307\u6325\u4F1A\u8BDD\uFF1A${row.originalCommanderSessionAlive ? "\u5728\u7EBF" : "\u672A\u52A0\u8F7D\uFF08\u91CD\u542F/\u5173\u95ED\u540E\u4E0D\u963B\u65AD\u6062\u590D\uFF09"}`)
    ),
    row.writeScope && h(
      "div",
      { className: "concerto-set-meta" },
      h("span", { className: "concerto-set-path" }, `\u5360\u7528\u5DE5\u4F5C\u76EE\u5F55\uFF1A${row.writeScope}${row.sandbox ? ` \xB7 \u6C99\u76D2\uFF1A${row.sandbox}` : ""}`)
    ),
    row.retryCwd && h(
      "div",
      { className: "concerto-set-meta" },
      h("span", { className: "concerto-set-path" }, `\u9694\u79BB\u65B0\u76EE\u5F55\uFF1A${row.retryCwd}`)
    ),
    row.unknownReason && h("div", { className: "concerto-set-reason" }, `\u963B\u585E\u539F\u56E0\uFF1A${row.unknownReason}`),
    recResult && h("div", {
      role: "status",
      className: "concerto-set-result",
      "data-ok": recResult.confirmedStopped ? "true" : "false"
    }, `\u6838\u5BF9\u7ED3\u8BBA\uFF1A${recResult.confirmedStopped ? "\u5DF2\u53D6\u5F97\u540E\u7AEF\u505C\u6B62\u8BC1\u636E" : "\u672A\u786E\u8BA4\u540E\u7AEF\u505C\u6B62\uFF08\u4E0D\u53EF\u91CA\u653E\u539F\u5DE5\u4F5C\u533A\uFF09"} \xB7 ${recResult.reason || ""}`),
    row.recoverableDelivery && h(DeliveryRecoveryNote, { delivery: row.recoverableDelivery }),
    !row.quarantined && h(
      "label",
      { className: "concerto-set-check" },
      h("input", { type: "checkbox", checked: reviewed, disabled: busy, onChange: (e) => setReviewed(e.target.checked) }),
      h("span", null, "\u5DF2\u6838\u67E5\u5916\u90E8\u526F\u4F5C\u7528\uFF08\u9694\u79BB\u65B0\u76EE\u5F55\u6062\u590D\u5FC5\u586B\uFF1B\u9002\u7528\u4E8E\u5916\u90E8\u8FDE\u63A5\u5668\u53D7\u9650\u6C99\u76D2\u53CA Hosted \u975E\u5371\u9669\u6210\u5458\uFF09")
    ),
    h(
      "div",
      { className: "concerto-set-actions-buttons" },
      h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--ghost",
        disabled: busy,
        onClick: () => onAdjudicate("confirm_failed")
      }, "\u786E\u8BA4\u5DF2\u505C\u6B62\u5E76\u91CA\u653E"),
      row.recoverableDelivery && h("button", {
        type: "button",
        className: "concerto-btn",
        disabled: busy,
        onClick: () => onAdjudicate("accept")
      }, "\u63A5\u6536\u5DF2\u9A8C\u8BC1\u4EA4\u4ED8"),
      !row.quarantined && h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--primary",
        disabled: busy || !reviewed,
        onClick: () => onAdjudicate("retry_isolated")
      }, "\u9694\u79BB\u76EE\u5F55\u6062\u590D"),
      h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--danger",
        "data-concerto-force-release": row.executionId,
        disabled: busy,
        onClick: () => setForceOpen(true)
      }, "\u5F3A\u5236\u89E3\u9664\u76EE\u5F55\u5360\u7528\u2026")
    ),
    forceOpen && h(ForceReleaseDialog, {
      row,
      busy,
      onClose: () => {
        if (!busy) setForceOpen(false);
      },
      onConfirm: () => onAdjudicate("force_release")
    })
  );
}
function DispatchLimitFields({ limits, disabled = false }) {
  const id = import_react5.default.useId();
  return h(
    "div",
    null,
    h("p", { id, className: "concerto-field-hint" }, "\u6309\u4EFB\u52A1\u8BA1\u7B97\uFF0C\u7559\u7A7A\u65F6\u4E0D\u9650\u3002\u6267\u884C\u6B21\u6570\u5305\u542B\u9996\u6B21\u6267\u884C\u3002"),
    h(
      "div",
      { className: "concerto-set-grid" },
      [
        ["maxAttempts", "\u5355\u4EFB\u52A1\u6267\u884C\u4E0A\u9650", 1],
        ["maxReworks", "\u5355\u4EFB\u52A1\u8FD4\u5DE5\u4E0A\u9650", 0]
      ].map(([name, label2, min]) => h(
        "div",
        { key: name, className: "concerto-field" },
        h("label", { htmlFor: `${id}-${name}` }, label2),
        h("input", {
          id: `${id}-${name}`,
          name,
          type: "number",
          min,
          max: Number.MAX_SAFE_INTEGER,
          step: 1,
          defaultValue: limits?.[name] ?? "",
          disabled,
          className: "concerto-input",
          "aria-describedby": id
        })
      ))
    )
  );
}
function readDispatchLimitsForm(form) {
  const data = new FormData(form);
  const maxAttempts = data.get("maxAttempts");
  const maxReworks = data.get("maxReworks");
  return { maxAttempts: maxAttempts ? Number(maxAttempts) : null, maxReworks: maxReworks ? Number(maxReworks) : null };
}
var CONNECTION_MESSAGES = {
  connector_missing: "\u8FDE\u63A5\u5668\u672A\u6CE8\u518C",
  connector_unavailable: "\u8FDE\u63A5\u5668\u63E1\u624B\u5931\u8D25",
  version_mismatch: "\u8FDE\u63A5\u5668\u63E1\u624B\u534F\u8BAE\u4E0D\u517C\u5BB9",
  model_config_missing: "\u8BF7\u586B\u5199 provider \u548C model",
  provider_missing: "DSH \u672A\u6CE8\u518C\u6B64 provider",
  model_missing: "DSH \u6A21\u578B\u76EE\u5F55\u6CA1\u6709\u6B64 model",
  host_catalog_unavailable: "\u6682\u65F6\u65E0\u6CD5\u68C0\u67E5 DSH \u6A21\u578B\u76EE\u5F55"
};
function ConnectionCheck({ label: label2, member, disabled }) {
  const [check, setCheck] = import_react5.default.useState(null);
  const key = JSON.stringify(member);
  async function runCheck() {
    setCheck({ key, pending: true, message: `${label2}\u68C0\u6D4B\u4E2D\u2026` });
    try {
      const result = await request2("/connection/check", { method: "POST", body: JSON.stringify({ member }) });
      const summary = result.state === "reachable" ? "\u63E1\u624B\u6210\u529F" : result.state === "configured" ? "\u6A21\u578B\u5DF2\u767B\u8BB0\uFF0C\u5B9E\u9645\u8C03\u7528\u5F85\u9A8C\u8BC1" : CONNECTION_MESSAGES[result.reason] || "\u65E0\u6CD5\u786E\u8BA4\u8FDE\u63A5";
      const detail = result.version || result.detail;
      setCheck({ key, message: `${label2}\uFF1A${detail ? `${summary} \xB7 ${detail}` : summary}` });
    } catch (error) {
      setCheck({ key, message: `${label2}\u68C0\u6D4B\u5931\u8D25\uFF1A${error.message}` });
    }
  }
  return h(
    "div",
    { className: "concerto-set-connection" },
    h("button", {
      type: "button",
      className: "concerto-btn",
      disabled: disabled || check?.pending,
      "aria-label": `\u68C0\u6D4B\u8FDE\u63A5\uFF1A${label2}`,
      onClick: runCheck
    }, "\u68C0\u6D4B\u8FDE\u63A5"),
    h("span", { className: "concerto-field-hint", role: "status", "aria-atomic": "true" }, check?.key === key ? check.message : "")
  );
}
function requiredViewRef(view) {
  return typeof view === "string" ? view : `${view.type}:${view.id}`;
}
function TeamDeleteDialog({ team, onClose, onConfirm }) {
  const descriptionId = import_react5.default.useId();
  return h(InspectorDialog, {
    title: `\u5220\u9664\u56E2\u961F ${team.name}`,
    onClose,
    className: "concerto-team-delete-dialog",
    dialogProps: { "aria-describedby": descriptionId }
  }, h(
    "div",
    { className: "concerto-drawer-body" },
    h("h3", null, `\u5220\u9664\u56E2\u961F\u300C${team.name}\u300D\uFF1F`),
    h("p", { id: descriptionId }, "\u8FD0\u884C\u5386\u53F2\u4ECD\u53EF\u67E5\u770B\u3002\u70B9\u51FB\u300C\u91CD\u8F7D\u56E2\u961F\u300D\u540E\u5E94\u7528\u9884\u8BBE\u53D8\u66F4\u3002"),
    h(
      "div",
      { className: "concerto-set-actions-buttons" },
      h("button", { type: "button", className: "concerto-btn", autoFocus: true, onClick: onClose }, "\u53D6\u6D88"),
      h("button", { type: "button", className: "concerto-btn concerto-btn--danger", onClick: onConfirm }, "\u786E\u8BA4\u5220\u9664")
    )
  ));
}
function ConcertoPanel() {
  useTeamCss();
  const hostTheme = useHostTheme();
  const [teams, setTeams] = import_react5.default.useState([]);
  const [connectors, setConnectors] = import_react5.default.useState([]);
  const [llmProviders, setLlmProviders] = import_react5.default.useState([]);
  const [runs, setRuns] = import_react5.default.useState([]);
  const [projects, setProjects] = import_react5.default.useState([]);
  const [projectId, setProjectId] = import_react5.default.useState("");
  const [continuationTeamId, setContinuationTeamId] = import_react5.default.useState("");
  const [unknowns, setUnknowns] = import_react5.default.useState([]);
  const [editing, setEditing] = import_react5.default.useState(null);
  const [deleteTarget, setDeleteTarget] = import_react5.default.useState(null);
  const [draftRevision, setDraftRevision] = import_react5.default.useState(0);
  const [name, setName] = import_react5.default.useState("My Team");
  const [description, setDescription] = import_react5.default.useState("");
  const [commanderSource, setCommanderSource] = import_react5.default.useState("hosted");
  const [provider, setProvider] = import_react5.default.useState("x-ds");
  const [model, setModel] = import_react5.default.useState("deepseek-v4.1-flash");
  const [commanderBaseUrl, setCommanderBaseUrl] = import_react5.default.useState("");
  const [commanderApiKey, setCommanderApiKey] = import_react5.default.useState("");
  const [commanderConnector, setCommanderConnector] = import_react5.default.useState("antigravity");
  const [requiredViewsInput, setRequiredViewsInput] = import_react5.default.useState("");
  const [launchCwd, setLaunchCwd] = import_react5.default.useState("");
  const [membersDraft, setMembersDraft] = import_react5.default.useState([]);
  const [selectedStageNode, setSelectedStageNode] = import_react5.default.useState(null);
  const [hash, setHash] = import_react5.default.useState("");
  const [status, setStatus] = import_react5.default.useState("");
  const [busy, setBusy] = import_react5.default.useState(false);
  const nameInput = import_react5.default.useRef(null);
  const focusName = import_react5.default.useRef(false);
  const unnamedTeamId = import_react5.default.useRef(null);
  const pendingWrite = import_react5.default.useRef(null);
  const refresh = import_react5.default.useCallback(async () => {
    try {
      const [teamsRes, runsRes, unkRes, connRes, llmRes] = await Promise.allSettled([
        request2("/teams"),
        fetchRuns(),
        fetchUnknownExecutions(),
        request2("/connectors"),
        request2("/llm/catalog")
      ]);
      if (teamsRes.status === "fulfilled") setTeams(teamsRes.value?.teams ?? []);
      else setStatus("\u8BFB\u53D6\u56E2\u961F\u5931\u8D25\uFF1A" + teamsRes.reason?.message);
      if (runsRes.status === "fulfilled") {
        setRuns(runsRes.value?.runs ?? []);
        setProjects(runsRes.value?.projects ?? []);
      } else if (teamsRes.status === "fulfilled") setStatus("\u8BFB\u53D6\u9879\u76EE\u548C\u8FD0\u884C\u5931\u8D25\uFF1A" + runsRes.reason?.message);
      if (unkRes.status === "fulfilled") setUnknowns(unkRes.value?.runs ?? []);
      if (connRes.status === "fulfilled" && Array.isArray(connRes.value?.connectors)) {
        setConnectors(connRes.value.connectors);
        request2("/connectors?probe=1").then((probed) => {
          if (Array.isArray(probed?.connectors)) setConnectors(probed.connectors);
        }).catch(() => {
        });
      }
      if (llmRes.status === "fulfilled" && Array.isArray(llmRes.value?.providers)) {
        setLlmProviders(llmRes.value.providers);
      }
    } catch (e) {
      setStatus("\u8BFB\u53D6\u5931\u8D25\uFF1A" + e.message);
    }
  }, []);
  import_react5.default.useEffect(() => {
    refresh();
  }, [refresh]);
  import_react5.default.useEffect(() => {
    if (!busy && focusName.current) {
      focusName.current = false;
      nameInput.current?.focus();
    }
  }, [busy, draftRevision]);
  function loadDraft(record) {
    const team = record?.team;
    const cmd = team?.commander;
    setEditing(record);
    setName(team?.name ?? "My Team");
    setDescription(team?.description ?? "");
    setCommanderSource(cmd?.source || "hosted");
    setProvider(cmd ? cmd.provider ?? "" : "x-ds");
    setModel(cmd ? cmd.model ?? "" : "deepseek-v4.1-flash");
    setCommanderBaseUrl(cmd?.baseUrl ?? "");
    setCommanderApiKey(cmd?.apiKey ?? "");
    setCommanderConnector(cmd?.connector || connectors[0]?.id || "antigravity");
    setMembersDraft(team?.members ?? []);
    setSelectedStageNode(null);
    setRequiredViewsInput((team?.requiredViews ?? []).map(requiredViewRef).join(", "));
    setDraftRevision((version) => version + 1);
    unnamedTeamId.current = null;
    pendingWrite.current = null;
  }
  async function onEditTeam(teamId) {
    setBusy(true);
    setStatus("\u8BFB\u53D6\u56E2\u961F\u914D\u7F6E\u4E2D\u2026");
    try {
      const params = new URLSearchParams({ teamId });
      const record = await request2(`/teams?${params}`);
      focusName.current = true;
      loadDraft(record);
      setStatus("");
    } catch (error) {
      setStatus("\u8BFB\u53D6\u56E2\u961F\u914D\u7F6E\u5931\u8D25\uFF1A" + error.message);
    } finally {
      setBusy(false);
    }
  }
  async function writeTeam(method, payload) {
    const key = JSON.stringify([method, payload]);
    if (pendingWrite.current?.key !== key) pendingWrite.current = { key, id: crypto.randomUUID() };
    const response = await request2("/teams", {
      method,
      body: JSON.stringify({ ...payload, requestId: pendingWrite.current.id })
    });
    pendingWrite.current = null;
    return response;
  }
  function showWriteResult(result, message) {
    setHash(result.generatedHash || result.expectedHash || "");
    if (result.generationError?.length) {
      const detail = result.generationError.map((error) => error.detail || error.code).join("\uFF1B");
      setStatus(`${message}\uFF0C\u9884\u8BBE\u751F\u6210\u5931\u8D25\uFF1A${detail}${result.expectedHash ? "\u3002\u53EF\u70B9\u51FB\u300C\u91CD\u8F7D\u56E2\u961F\u300D\u91CD\u8BD5\u3002" : ""}`);
    } else {
      setStatus(result.generatedHash ? `${message}\uFF0C\u70B9\u51FB\u300C\u91CD\u8F7D\u56E2\u961F\u300D\u5E94\u7528\u9884\u8BBE\u53D8\u66F4` : message);
    }
  }
  async function onWriteError(error, message) {
    if (error.status === 409 || error.status === 404) {
      setStatus(`${message}\uFF1A\u56E2\u961F\u914D\u7F6E\u5DF2\u53D8\u5316\u3002\u8349\u7A3F\u5DF2\u4FDD\u7559\uFF0C\u8BF7\u4ECE\u5217\u8868\u91CD\u65B0\u8BFB\u53D6\u6700\u65B0\u914D\u7F6E\u3002`);
      await refresh();
    } else {
      setStatus(`${message}\uFF1A${error.message}`);
    }
  }
  import_react5.default.useEffect(() => {
    if (!selectedStageNode) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedStageNode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedStageNode]);
  function applyStageTemplate(kind) {
    const readyExternal = connectors.find((c) => c.protocol !== "web" && c.probe?.ok)?.id || connectors[0]?.id || "antigravity";
    if (kind === "solo") {
      setName((cur) => cur && cur !== "My Team" ? cur : "Solo Strike");
      setMembersDraft([
        { id: "worker-1", source: "external", connector: readyExternal, roleKind: "worker", toolProfile: "coding", provider, model }
      ]);
      setSelectedStageNode("member:0");
    } else if (kind === "duo") {
      setName((cur) => cur && cur !== "My Team" ? cur : "Dual Core Team");
      setMembersDraft([
        { id: "worker-1", source: "hosted", connector: readyExternal, roleKind: "worker", toolProfile: "coding", provider, model },
        { id: "worker-2", source: "external", connector: readyExternal, roleKind: "worker", toolProfile: "coding", provider, model },
        { id: "reviewer-1", source: "hosted", connector: readyExternal, roleKind: "reviewer", toolProfile: "readonly", provider, model }
      ]);
      setSelectedStageNode("commander");
    } else if (kind === "hetero") {
      setName((cur) => cur && cur !== "My Team" ? cur : "Heterogeneous Orchestra");
      setMembersDraft([
        { id: "worker-agy", source: "external", connector: "antigravity", roleKind: "worker", toolProfile: "coding", provider, model },
        { id: "worker-claude", source: "external", connector: "claude", roleKind: "worker", toolProfile: "coding", provider, model },
        { id: "reviewer-1", source: "hosted", connector: readyExternal, roleKind: "reviewer", toolProfile: "readonly", provider, model }
      ]);
      setSelectedStageNode("commander");
    }
  }
  function addMemberDraft(roleKind = "worker") {
    const prefix = roleKind === "reviewer" ? "reviewer" : "worker";
    const ids = new Set(membersDraft.map((member) => member.id));
    let idx = membersDraft.filter((m) => m.roleKind === roleKind).length + 1;
    while (ids.has(`${prefix}-${idx}`)) idx++;
    const defaultConnector = connectors[0]?.id || "antigravity";
    const nextIdx = membersDraft.length;
    setMembersDraft([
      ...membersDraft,
      {
        id: `${prefix}-${idx}`,
        source: "hosted",
        connector: defaultConnector,
        roleKind,
        toolProfile: roleKind === "reviewer" ? "readonly" : "coding",
        provider,
        model
      }
    ]);
    setSelectedStageNode(`member:${nextIdx}`);
  }
  function updateMemberDraft(index, patch) {
    setMembersDraft(membersDraft.map((m, i) => i === index ? { ...m, ...patch } : m));
  }
  function removeMemberDraft(index) {
    setMembersDraft(membersDraft.filter((_, i) => i !== index));
    setSelectedStageNode(null);
  }
  function cloneMemberDraft(index) {
    const src = membersDraft[index];
    if (!src) return;
    const prefix = src.roleKind === "reviewer" ? "reviewer" : "worker";
    const ids = new Set(membersDraft.map((m) => m.id));
    let n = membersDraft.filter((m) => m.roleKind === src.roleKind).length + 1;
    while (ids.has(`${prefix}-${n}`)) n++;
    const copy = { ...src, id: `${prefix}-${n}` };
    const next = [...membersDraft];
    next.splice(index + 1, 0, copy);
    setMembersDraft(next);
    setSelectedStageNode(`member:${index + 1}`);
  }
  async function onSave(event) {
    event.preventDefault();
    const dispatchLimits = readDispatchLimitsForm(event.currentTarget);
    setBusy(true);
    setStatus("\u4FDD\u5B58\u4E2D\u2026");
    try {
      const previous = editing?.team;
      const draftId = toTeamId(name).slice(0, 64).replace(/-$/, "");
      const teamId = previous?.id || draftId || (unnamedTeamId.current ??= `team-${crypto.randomUUID()}`);
      const savedViews = new Map((previous?.requiredViews ?? []).map((view) => [requiredViewRef(view), view]));
      const parsedRequiredViews = requiredViewsInput.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean).map((ref) => savedViews.get(ref) ?? ref);
      const normalizedMembers = membersDraft.filter((m) => typeof m.id === "string" && m.id.trim() !== "").map(({ provider: workerProvider, model: workerModel, connector, toolProfile, baseUrl, apiKey, ...member }) => ({
        ...member,
        id: member.id.trim(),
        ...member.source === "hosted" ? { provider: workerProvider?.trim() || void 0, model: workerModel?.trim() || void 0, toolProfile } : member.source === "api" ? { baseUrl: (baseUrl || "").trim(), apiKey: (apiKey || "").trim() || void 0, model: (workerModel || "").trim() } : { connector: (connector || "antigravity").trim() }
      }));
      const commanderConfig = commanderSource === "api" ? {
        id: previous?.commander?.id || "commander",
        source: "api",
        baseUrl: commanderBaseUrl.trim(),
        apiKey: commanderApiKey.trim() || void 0,
        model: model.trim()
      } : commanderSource === "external" ? {
        id: previous?.commander?.id || "commander",
        source: "external",
        connector: (commanderConnector || connectors[0]?.id || "antigravity").trim()
      } : {
        id: "commander",
        ...previous?.commander,
        source: "hosted",
        provider: provider.trim() || void 0,
        model: model.trim() || void 0
      };
      const team = {
        ...previous,
        id: teamId,
        name: name.trim(),
        description: description.trim() || void 0,
        commander: commanderConfig,
        members: normalizedMembers,
        requiredViews: parsedRequiredViews.length > 0 ? parsedRequiredViews : void 0,
        dispatchLimits: dispatchLimits.maxAttempts !== null || dispatchLimits.maxReworks !== null ? dispatchLimits : void 0
      };
      const body = await writeTeam("POST", { team, expectedConfigVersion: editing?.configVersion ?? 0 });
      loadDraft({ team, configVersion: body.configVersion });
      showWriteResult(body, `\u5DF2\u4FDD\u5B58 ${team.name} v${body.configVersion}`);
      await refresh();
    } catch (error) {
      await onWriteError(error, "\u4FDD\u5B58\u5931\u8D25");
    } finally {
      setBusy(false);
    }
  }
  async function onDeleteTeam(target) {
    setDeleteTarget(null);
    setBusy(true);
    setStatus("\u5220\u9664\u56E2\u961F\u914D\u7F6E\u4E2D\u2026");
    try {
      const body = await writeTeam("DELETE", { teamId: target.id, expectedConfigVersion: target.configVersion });
      if (editing?.team.id === target.id) loadDraft(null);
      showWriteResult(body, `\u5DF2\u5220\u9664\u56E2\u961F\u914D\u7F6E ${target.name}`);
      await refresh();
      focusName.current = true;
    } catch (error) {
      await onWriteError(error, "\u5220\u9664\u5931\u8D25");
    } finally {
      setBusy(false);
    }
  }
  async function onReload() {
    if (!hash) {
      setStatus("\u5148\u4FDD\u5B58\uFF0C\u518D\u91CD\u8F7D");
      return;
    }
    setBusy(true);
    setStatus("\u91CD\u8F7D\u4E2D\u2026");
    try {
      const body = await request2("/teams/reload", {
        method: "POST",
        body: JSON.stringify({ expectedHash: hash })
      });
      setStatus("\u91CD\u8F7D\u7ED3\u679C\uFF1A" + body.application);
      await refresh();
    } catch (e) {
      setStatus("\u91CD\u8F7D\u5931\u8D25\uFF1A" + e.message);
    } finally {
      setBusy(false);
    }
  }
  async function onLaunchTeam(teamId, selectedProjectId) {
    setBusy(true);
    setStatus(selectedProjectId ? "\u6B63\u5728\u6253\u5F00\u9879\u76EE\u2026" : "\u6B63\u5728\u542F\u52A8\u65B0\u9879\u76EE\u2026");
    try {
      const launched = await launchTeamSession({
        teamId,
        ...selectedProjectId ? { projectId: selectedProjectId } : {},
        ...launchCwd.trim() ? { cwd: launchCwd.trim() } : {}
      });
      const opened = await openHostSession(launched.sessionId, {
        teamSessionId: launched.teamSessionId,
        openTeamTab: true
      });
      setStatus(opened.navigated ? `\u5DF2\u6253\u5F00\u56E2\u961F\u4F1A\u8BDD ${launched.sessionId}\uFF08\u5DE5\u4F5C\u76EE\u5F55\uFF1A${launched.cwd || "\u9ED8\u8BA4\u5DE5\u4F5C\u533A"}\uFF09` : `\u56E2\u961F\u4F1A\u8BDD ${launched.sessionId}\uFF08\u8FD0\u884C ${launched.teamSessionId}\uFF09\u53EF\u4ECE\u4FA7\u680F\u5DE5\u4F5C\u533A\u6253\u5F00`);
      await refresh();
    } catch (e) {
      setStatus("\u542F\u52A8\u56E2\u961F\u4F1A\u8BDD\u5931\u8D25\uFF1A" + e.message);
    } finally {
      setBusy(false);
    }
  }
  async function onOpenRun(run) {
    if (!run?.commanderSessionId) {
      setStatus("\u8BE5\u8FD0\u884C\u7F3A\u5C11\u5173\u8054\u7684\u684C\u9762\u4F1A\u8BDD ID");
      return;
    }
    setBusy(true);
    try {
      const opened = await openHostSession(run.commanderSessionId, {
        teamSessionId: run.teamSessionId,
        openTeamTab: true
      });
      setStatus(opened.navigated ? `\u5DF2\u5207\u6362\u5230\u56E2\u961F\u4F1A\u8BDD ${run.commanderSessionId}` : `\u5DF2\u786E\u4FDD\u5DE5\u4F5C\u533A\u5173\u8054\u4F1A\u8BDD ${run.commanderSessionId}\uFF08live=${opened.live}\uFF09\uFF0C\u8BF7\u4ECE\u4FA7\u680F\u67E5\u770B`);
      await refresh();
    } catch (e) {
      setStatus("\u5B9A\u4F4D\u4F1A\u8BDD\u5931\u8D25\uFF1A" + e.message);
    } finally {
      setBusy(false);
    }
  }
  const pendingUnknowns = unknowns.filter((r) => !r.quarantined);
  const quarantinedUnknowns = unknowns.filter((r) => r.quarantined);
  const recoveryRow = (row) => h(RecoveryExecutionRow, {
    key: row.executionId,
    row,
    busy,
    onBusy: setBusy,
    onDone: async (msg) => {
      setStatus(msg);
      await refresh();
    },
    onError: setStatus
  });
  const statusTone = /失败|被拒绝|错误|缺少/.test(status) ? "error" : /中…$/.test(status) ? "busy" : "info";
  const visibleRuns = runs.slice().reverse().slice(0, 8);
  const selectedProject = projects.find((project) => project.projectId === projectId);
  const needsTeam = selectedProject?.completed && !teams.some((team) => team.id === selectedProject.teamId);
  const teamForContinuation = needsTeam ? teams.find((team) => team.id === continuationTeamId)?.id : selectedProject?.teamId;
  return h(
    "div",
    {
      className: "concerto-surface concerto-settings",
      "data-concerto-theme": hostTheme.colorScheme,
      style: hostTheme.cssVars || void 0
    },
    h(
      "header",
      { className: "concerto-set-head" },
      h(
        "div",
        { className: "concerto-set-head-main" },
        h("h2", null, "Concerto \u56E2\u961F"),
        h("p", { className: "concerto-set-lead" }, "\u914D\u7F6E\u6307\u6325\u8005\u4E0E\u6210\u5458\uFF0C\u4FDD\u5B58\u540E\u91CD\u8F7D\u4F7F\u5176\u751F\u6548\uFF0C\u518D\u4ECE\u4E0B\u65B9\u542F\u52A8\u684C\u9762\u4F1A\u8BDD\u3002")
      ),
      h(
        "button",
        { type: "button", className: "concerto-btn concerto-btn--ghost", disabled: busy, onClick: refresh },
        h(UiIcon, { name: "refresh" }),
        "\u5237\u65B0\u72B6\u6001"
      )
    ),
    deleteTarget && h(TeamDeleteDialog, {
      team: deleteTarget,
      onClose: () => setDeleteTarget(null),
      onConfirm: () => onDeleteTeam(deleteTarget)
    }),
    status !== "" && h(
      "div",
      { className: "concerto-set-status", role: "status", "data-tone": statusTone },
      h("span", null, status),
      h(
        "button",
        { type: "button", className: "concerto-btn concerto-btn--ghost concerto-btn--icon", "aria-label": "\u5173\u95ED\u63D0\u793A", onClick: () => setStatus("") },
        h(UiIcon, { name: "close" })
      )
    ),
    // ① 乐团编排舞台（新建 / 编辑团队）
    h(
      SettingsSection,
      {
        as: "form",
        onSubmit: onSave,
        method: "post",
        action: "/concerto/teams",
        title: editing ? "\u7F16\u8F91\u56E2\u961F" : "\u65B0\u5EFA\u56E2\u961F",
        hint: editing ? `\u914D\u7F6E\u7248\u672C v${editing.configVersion} \xB7 ${editing.team.id}` : "\u70B9\u51FB\u5C0F\u7CBE\u7075\u5C55\u5F00\u914D\u7F6E\uFF0C\u70B9\u51FB\u300C+\u300D\u6DFB\u52A0\u6267\u884C\u8005\u6216\u5BA1\u67E5\u8005\u3002"
      },
      (() => {
        const connectorOptions = connectors.length > 0 ? connectors : [
          { id: "antigravity", displayName: "Antigravity (agy)", protocol: "acp" },
          { id: "claude", displayName: "Claude Code", protocol: "stream-json" },
          { id: "codex", displayName: "Codex", protocol: "native" },
          { id: "gemini", displayName: "Gemini CLI", protocol: "acp" },
          { id: "opencode", displayName: "OpenCode", protocol: "acp" }
        ];
        const formatConnOption = (c) => {
          const proto = c.protocol && c.protocol !== "native" ? ` (${c.protocol.toUpperCase()})` : "";
          const badge = c.probe ? c.probe.ok ? " \xB7 \u2713 \u5DF2\u5C31\u7EEA" : " \xB7 \u25CB \u672A\u5B89\u88C5" : "";
          return `${c.displayName || c.id}${proto}${badge}`;
        };
        const connStatusMark = (id) => {
          const c = connectorOptions.find((x) => x.id === id);
          if (!c?.probe) return "";
          return c.probe.ok ? " \u2713" : " \u25CB";
        };
        const commanderPreview = {
          id: "commander",
          roleKind: "commander",
          source: commanderSource,
          connector: commanderSource === "external" ? commanderConnector || connectorOptions[0]?.id || "antigravity" : null
        };
        const commanderSub = commanderSource === "api" ? `API \xB7 ${model || "\u672A\u586B\u6A21\u578B"}` : commanderSource === "external" ? `${connectorOptions.find((c) => c.id === commanderConnector)?.displayName || commanderConnector || "\u5916\u90E8 Agent"}${connStatusMark(commanderConnector)}` : model || provider || "DSH \u6258\u7BA1";
        const workerEntries = membersDraft.map((m, idx) => ({ m, idx })).filter(({ m }) => m.roleKind !== "reviewer");
        const reviewerEntries = membersDraft.map((m, idx) => ({ m, idx })).filter(({ m }) => m.roleKind === "reviewer");
        const selectedMemberIdx = typeof selectedStageNode === "string" && selectedStageNode.startsWith("member:") ? Number(selectedStageNode.slice(7)) : -1;
        const selectedMember = selectedMemberIdx >= 0 ? membersDraft[selectedMemberIdx] : null;
        const memberSub = (m) => m.source === "hosted" ? m.model || m.provider || "DSH \u6258\u7BA1" : m.source === "api" ? `API \xB7 ${m.model || "\u672A\u586B\u6A21\u578B"}` : `${connectorOptions.find((c) => c.id === m.connector)?.displayName || m.connector || "\u5916\u90E8"}${connStatusMark(m.connector)}`;
        const toggleNode = (key) => setSelectedStageNode((cur) => cur === key ? null : key);
        return h(
          import_react5.default.Fragment,
          null,
          // 一键预设编排模板条
          !editing && h(
            "div",
            { style: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }, "data-concerto-stage-templates": "true" },
            h("span", { className: "concerto-field-hint" }, "\u4E00\u952E\u6A21\u677F\uFF1A"),
            h("button", { type: "button", className: "concerto-btn", disabled: busy, onClick: () => applyStageTemplate("solo") }, "\u26A1 \u5355\u5175\u7A81\u51FB\uFF081+1\uFF09"),
            h("button", { type: "button", className: "concerto-btn", disabled: busy, onClick: () => applyStageTemplate("duo") }, "\u{1F3B8} \u53CC\u6838\u5F00\u53D1\uFF081+2+1\u5BA1\uFF09"),
            h("button", { type: "button", className: "concerto-btn", disabled: busy, onClick: () => applyStageTemplate("hetero") }, "\u{1F310} \u5F02\u6784\u8054\u519B\uFF08Agy + Claude\uFF09")
          ),
          h(
            "div",
            { className: "concerto-stage", "data-concerto-orchestra-stage": "true" },
            // 最顶部：可替换团队名
            h(
              "div",
              { className: "concerto-stage-title-wrap" },
              h("input", {
                ref: nameInput,
                required: true,
                disabled: busy,
                "aria-label": "\u56E2\u961F\u540D",
                className: "concerto-stage-title-input",
                value: name,
                onChange: (e) => setName(e.target.value),
                placeholder: "\u8F93\u5165\u56E2\u961F\u540D"
              }),
              h("span", { className: "concerto-stage-title-pen", "aria-hidden": true }, "\u270E")
            ),
            // 居中：指挥者小精灵
            h(
              "div",
              { className: "concerto-stage-commander-zone" },
              h(
                "button",
                {
                  type: "button",
                  className: "concerto-stage-node concerto-stage-node--commander",
                  "data-selected": selectedStageNode === "commander" ? "true" : void 0,
                  "aria-expanded": selectedStageNode === "commander",
                  onClick: () => toggleNode("commander")
                },
                h(MemberGlyph, { member: commanderPreview, state: selectedStageNode === "commander" ? "\u534F\u8C03" : "idle", size: 64 }),
                h("span", { className: "concerto-stage-node-name" }, "\u6307\u6325\u8005 \xB7 Commander"),
                h("span", { className: "concerto-stage-node-sub" }, commanderSub)
              )
            ),
            // 发光弧形连线（指挥者 → 左下执行者 / 右下审查者）
            h(
              "svg",
              { className: "concerto-stage-svg", viewBox: "0 0 400 52", preserveAspectRatio: "none", "aria-hidden": true },
              h("path", {
                className: "concerto-stage-arc",
                "data-active": selectedStageNode === "commander" || selectedMember && selectedMember.roleKind !== "reviewer" ? "true" : void 0,
                d: "M 200 2 C 200 28, 100 22, 100 50"
              }),
              h("path", {
                className: "concerto-stage-arc",
                "data-active": selectedStageNode === "commander" || selectedMember && selectedMember.roleKind === "reviewer" ? "true" : void 0,
                d: "M 200 2 C 200 28, 300 22, 300 50"
              })
            ),
            // 左下 Worker / 右下 Reviewer 双区
            h(
              "div",
              { className: "concerto-stage-lanes" },
              // 左下：执行者 Worker
              h(
                "div",
                { className: "concerto-stage-lane", "data-stage-lane": "worker" },
                h(
                  "div",
                  { className: "concerto-stage-lane-head" },
                  h("span", null, "\u6267\u884C\u8005 \xB7 Worker"),
                  h("span", { className: "concerto-count-pill concerto-num" }, String(workerEntries.length))
                ),
                h(
                  "div",
                  { className: "concerto-stage-roster" },
                  workerEntries.map(({ m, idx }) => h(
                    "button",
                    {
                      key: idx,
                      type: "button",
                      className: "concerto-stage-node",
                      "data-selected": selectedStageNode === `member:${idx}` ? "true" : void 0,
                      "aria-expanded": selectedStageNode === `member:${idx}`,
                      onClick: () => toggleNode(`member:${idx}`)
                    },
                    h(MemberGlyph, { member: m, state: selectedStageNode === `member:${idx}` ? "running" : "idle", size: 46 }),
                    h("span", { className: "concerto-stage-node-name" }, m.id || `worker-${idx + 1}`),
                    h("span", { className: "concerto-stage-node-sub" }, memberSub(m))
                  )),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "concerto-stage-add",
                      disabled: busy,
                      onClick: () => addMemberDraft("worker")
                    },
                    h("span", { className: "concerto-stage-add-plus", "aria-hidden": true }, "+"),
                    h("span", null, "\u6DFB\u52A0\u6267\u884C\u8005")
                  )
                )
              ),
              // 右下：审查者 Reviewer
              h(
                "div",
                { className: "concerto-stage-lane", "data-stage-lane": "reviewer" },
                h(
                  "div",
                  { className: "concerto-stage-lane-head" },
                  h("span", null, "\u5BA1\u67E5\u8005 \xB7 Reviewer"),
                  h("span", { className: "concerto-count-pill concerto-num" }, String(reviewerEntries.length))
                ),
                h(
                  "div",
                  { className: "concerto-stage-roster" },
                  reviewerEntries.map(({ m, idx }) => h(
                    "button",
                    {
                      key: idx,
                      type: "button",
                      className: "concerto-stage-node",
                      "data-selected": selectedStageNode === `member:${idx}` ? "true" : void 0,
                      "aria-expanded": selectedStageNode === `member:${idx}`,
                      onClick: () => toggleNode(`member:${idx}`)
                    },
                    h(MemberGlyph, { member: m, state: selectedStageNode === `member:${idx}` ? "review" : "idle", size: 46 }),
                    h("span", { className: "concerto-stage-node-name" }, m.id || `reviewer-${idx + 1}`),
                    h("span", { className: "concerto-stage-node-sub" }, memberSub(m))
                  )),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "concerto-stage-add",
                      disabled: busy,
                      onClick: () => addMemberDraft("reviewer")
                    },
                    h("span", { className: "concerto-stage-add-plus", "aria-hidden": true }, "+"),
                    h("span", null, "\u6DFB\u52A0\u5BA1\u67E5\u8005")
                  )
                )
              )
            )
          ),
          // 点击小精灵后平滑展开的配置面板：指挥者
          selectedStageNode === "commander" && h(
            "div",
            { key: "insp-commander", className: "concerto-stage-inspector" },
            h(
              "div",
              { className: "concerto-stage-inspector-head" },
              h(
                "div",
                { className: "concerto-stage-inspector-title" },
                h(MemberGlyph, { member: commanderPreview, state: "\u534F\u8C03", size: 28 }),
                h("span", null, "\u6307\u6325\u8005\u914D\u7F6E")
              ),
              h(
                "button",
                { type: "button", className: "concerto-btn concerto-btn--ghost concerto-btn--icon", "aria-label": "\u6536\u8D77\u914D\u7F6E", onClick: () => setSelectedStageNode(null) },
                h(UiIcon, { name: "close" })
              )
            ),
            h(
              "div",
              { className: "concerto-set-grid" },
              h(
                SettingsField,
                { label: "\u6307\u6325\u8005\u6765\u6E90" },
                h(
                  "select",
                  {
                    disabled: busy,
                    className: "concerto-input",
                    value: commanderSource,
                    onChange: (e) => setCommanderSource(e.target.value)
                  },
                  h("option", { value: "hosted" }, "DSH \u6258\u7BA1\u6A21\u578B"),
                  h("option", { value: "api" }, "\u81EA\u5B9A\u4E49 API\uFF08OpenAI \u517C\u5BB9\uFF09"),
                  h("option", { value: "external" }, "\u5916\u90E8 Agent\uFF08Connector\uFF09")
                )
              ),
              commanderSource === "hosted" && h(ProviderModelFields, {
                disabled: busy,
                providers: llmProviders,
                provider,
                model,
                providerLabel: "\u6307\u6325\u8005 provider",
                modelLabel: "\u6307\u6325\u8005 model",
                onChangeProvider: setProvider,
                onChangeModel: setModel
              }),
              commanderSource === "api" && h(ApiEndpointFields, {
                disabled: busy,
                baseUrl: commanderBaseUrl,
                apiKey: commanderApiKey,
                model,
                onChangeBaseUrl: setCommanderBaseUrl,
                onChangeApiKey: setCommanderApiKey,
                onChangeModel: setModel
              }),
              commanderSource === "external" && h(
                SettingsField,
                { label: "\u6307\u6325\u8005 Connector" },
                (() => {
                  const currentVal = commanderConnector || connectorOptions[0]?.id || "antigravity";
                  const hasCurrent = connectorOptions.some((c) => c.id === currentVal);
                  return h(
                    "select",
                    {
                      disabled: busy,
                      className: "concerto-input concerto-id",
                      value: currentVal,
                      onChange: (e) => setCommanderConnector(e.target.value)
                    },
                    connectorOptions.map((c) => h("option", { key: c.id, value: c.id }, formatConnOption(c))),
                    !hasCurrent && h("option", { value: currentVal }, `${currentVal} (\u81EA\u5B9A\u4E49)`)
                  );
                })()
              )
            ),
            h(ConnectionCheck, {
              label: "\u6307\u6325\u8005",
              member: commanderSource === "api" ? { source: "api", baseUrl: commanderBaseUrl, apiKey: commanderApiKey, model } : commanderSource === "external" ? { source: "external", connector: commanderConnector || connectorOptions[0]?.id || "antigravity" } : { source: "hosted", provider, model },
              disabled: busy
            })
          ),
          // 点击小精灵后平滑展开的配置面板：执行者 / 审查者
          selectedMember && h(
            "div",
            { key: `insp-member-${selectedMemberIdx}`, className: "concerto-stage-inspector" },
            h(
              "div",
              { className: "concerto-stage-inspector-head" },
              h(
                "div",
                { className: "concerto-stage-inspector-title" },
                h(MemberGlyph, { member: selectedMember, state: "idle", size: 28 }),
                h("span", null, `${selectedMember.id || "\u6210\u5458"} \xB7 ${selectedMember.roleKind === "reviewer" ? "\u5BA1\u67E5\u8005\u914D\u7F6E" : "\u6267\u884C\u8005\u914D\u7F6E"}`)
              ),
              h(
                "div",
                { style: { display: "flex", gap: 6, alignItems: "center" } },
                h("button", {
                  type: "button",
                  className: "concerto-btn",
                  disabled: busy,
                  onClick: () => cloneMemberDraft(selectedMemberIdx)
                }, "\u590D\u5236\u6210\u5458"),
                h("button", {
                  type: "button",
                  className: "concerto-btn concerto-btn--danger",
                  disabled: busy,
                  "aria-label": `\u79FB\u9664\u6210\u5458 ${selectedMember.id || selectedMemberIdx + 1}`,
                  onClick: () => removeMemberDraft(selectedMemberIdx)
                }, "\u79FB\u9664"),
                h(
                  "button",
                  { type: "button", className: "concerto-btn concerto-btn--ghost concerto-btn--icon", "aria-label": "\u6536\u8D77\u914D\u7F6E", onClick: () => setSelectedStageNode(null) },
                  h(UiIcon, { name: "close" })
                )
              )
            ),
            h(
              "div",
              { className: "concerto-set-grid" },
              h(
                SettingsField,
                { label: "\u6210\u5458 ID" },
                h("input", { disabled: busy, className: "concerto-input concerto-id", value: selectedMember.id, placeholder: "worker-1", onChange: (e) => updateMemberDraft(selectedMemberIdx, { id: e.target.value }) })
              ),
              h(
                SettingsField,
                { label: "\u6765\u6E90" },
                h(
                  "select",
                  { disabled: busy, className: "concerto-input", value: selectedMember.source, onChange: (e) => updateMemberDraft(selectedMemberIdx, { source: e.target.value }) },
                  h("option", { value: "hosted" }, "DSH Hosted"),
                  h("option", { value: "api" }, "\u81EA\u5B9A\u4E49 API\uFF08OpenAI \u517C\u5BB9\uFF09"),
                  h("option", { value: "external" }, "External Connector"),
                  h("option", { value: "web" }, "Web Connector\uFF08\u7F51\u9875\u7248 Agent\uFF09")
                )
              ),
              h(
                SettingsField,
                { label: "\u89D2\u8272" },
                h(
                  "select",
                  { disabled: busy, className: "concerto-input", value: selectedMember.roleKind, onChange: (e) => updateMemberDraft(selectedMemberIdx, { roleKind: e.target.value }) },
                  h("option", { value: "worker" }, "\u6267\u884C\u8005 worker"),
                  h("option", { value: "reviewer" }, "\u5BA1\u67E5\u8005 reviewer")
                )
              ),
              selectedMember.source === "hosted" ? h(
                SettingsField,
                { label: "\u5DE5\u5177\u6743\u9650" },
                h(
                  "select",
                  { disabled: busy, className: "concerto-input", value: selectedMember.toolProfile ?? (selectedMember.roleKind === "reviewer" ? "readonly" : "coding"), onChange: (e) => updateMemberDraft(selectedMemberIdx, { toolProfile: e.target.value }) },
                  h("option", { value: "coding" }, "\u7F16\u7801+Shell (coding)"),
                  h("option", { value: "readonly" }, "\u53EA\u8BFB\u6587\u4EF6 (readonly)"),
                  h("option", { value: "none" }, "\u4EC5\u534F\u8C03 (none)")
                )
              ) : selectedMember.source === "api" ? h(ApiEndpointFields, {
                disabled: busy,
                baseUrl: selectedMember.baseUrl ?? "",
                apiKey: selectedMember.apiKey ?? "",
                model: selectedMember.model ?? "",
                onChangeBaseUrl: (val) => updateMemberDraft(selectedMemberIdx, { baseUrl: val }),
                onChangeApiKey: (val) => updateMemberDraft(selectedMemberIdx, { apiKey: val }),
                onChangeModel: (val) => updateMemberDraft(selectedMemberIdx, { model: val })
              }) : h(
                SettingsField,
                { label: "Connector" },
                (() => {
                  const filtered = selectedMember.source === "web" ? connectorOptions.filter((c) => c.protocol === "web" || String(c.id).startsWith("web-")) : connectorOptions.filter((c) => c.protocol !== "web" && !String(c.id).startsWith("web-"));
                  const list = filtered.length > 0 ? filtered : connectorOptions;
                  const currentVal = selectedMember.connector || list[0]?.id || (selectedMember.source === "web" ? "web-chatgpt" : "antigravity");
                  const hasCurrent = list.some((c) => c.id === currentVal);
                  return h(
                    "select",
                    {
                      disabled: busy,
                      className: "concerto-input concerto-id",
                      value: currentVal,
                      onChange: (e) => updateMemberDraft(selectedMemberIdx, { connector: e.target.value })
                    },
                    list.map((c) => h("option", { key: c.id, value: c.id }, formatConnOption(c))),
                    !hasCurrent && h("option", { value: currentVal }, `${currentVal} (\u81EA\u5B9A\u4E49)`)
                  );
                })()
              ),
              selectedMember.source === "hosted" && h(ProviderModelFields, {
                disabled: busy,
                providers: llmProviders,
                provider: selectedMember.provider ?? "",
                model: selectedMember.model ?? "",
                providerLabel: "\u6210\u5458 provider",
                modelLabel: "\u6210\u5458 model",
                allowEmpty: true,
                onChangeProvider: (val) => updateMemberDraft(selectedMemberIdx, { provider: val }),
                onChangeModel: (val) => updateMemberDraft(selectedMemberIdx, { model: val })
              })
            ),
            h(
              SettingsField,
              { label: "\u4E13\u957F / \u4EBA\u8BBE\uFF08\u4F9B\u6307\u6325\u8005\u667A\u80FD\u5206\u5DE5\uFF09" },
              h("input", {
                disabled: busy,
                className: "concerto-input",
                value: selectedMember.persona ?? "",
                placeholder: "\u4F8B\u5982\uFF1A\u524D\u7AEF UI \u4E13\u5BB6\u3001\u4E25\u683C\u5355\u6D4B\u5BA1\u67E5\u5458\u3001\u53EA\u8D1F\u8D23\u6587\u6863\u6574\u7406",
                onChange: (e) => updateMemberDraft(selectedMemberIdx, { persona: e.target.value })
              }),
              h(
                "div",
                { style: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 } },
                ["\u524D\u7AEF UI \u4E13\u5BB6", "\u540E\u7AEF\u903B\u8F91\u5F00\u53D1", "\u4E25\u683C\u6D4B\u8BD5\u9A8C\u6536", "\u67B6\u6784\u4E0E\u4EE3\u7801\u5BA1\u67E5", "\u6587\u6863\u4E0E\u603B\u7ED3"].map((tag) => h("button", {
                  key: tag,
                  type: "button",
                  className: "concerto-chip",
                  disabled: busy,
                  onClick: () => updateMemberDraft(selectedMemberIdx, { persona: tag })
                }, tag))
              )
            ),
            h(ConnectionCheck, {
              label: selectedMember.id || `\u6210\u5458 ${selectedMemberIdx + 1}`,
              disabled: busy,
              member: selectedMember.source === "hosted" ? { source: "hosted", provider: selectedMember.provider ?? "", model: selectedMember.model ?? "" } : selectedMember.source === "api" ? { source: "api", baseUrl: selectedMember.baseUrl ?? "", apiKey: selectedMember.apiKey ?? "", model: selectedMember.model ?? "" } : { source: selectedMember.source, connector: selectedMember.connector || connectorOptions[0]?.id || "antigravity" }
            })
          ),
          // 折叠的高级团队选项，让舞台成为视觉主角
          h(
            "details",
            { className: "concerto-set-fold" },
            h("summary", null, "\u66F4\u591A\u56E2\u961F\u9009\u9879\uFF08\u7B80\u4ECB\u3001\u56FA\u5B9A\u89C6\u56FE\u3001\u6D3E\u53D1\u4E0A\u9650\uFF09"),
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "var(--cc-space-3)", marginTop: 6 } },
              h(
                SettingsField,
                { label: "\u56E2\u961F\u7B80\u4ECB" },
                h("input", { disabled: busy, className: "concerto-input", value: description, onChange: (e) => setDescription(e.target.value) })
              ),
              h(SettingsField, {
                label: "\u56FA\u5B9A\u89C6\u56FE\u8981\u6C42",
                hint: "\u53EF\u9009\u3002\u5199\u6CD5\u4E3A\u300C\u7C7B\u578B:ID\u300D\uFF0C\u591A\u4E2A\u7528\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 mindmap:plan, checklist:accept"
              }, h("input", { disabled: busy, className: "concerto-input concerto-id", value: requiredViewsInput, onChange: (e) => setRequiredViewsInput(e.target.value), placeholder: "mindmap:plan, checklist:accept" })),
              h(DispatchLimitFields, { key: draftRevision, limits: editing?.team.dispatchLimits, disabled: busy })
            )
          )
        );
      })(),
      h(
        "footer",
        { className: "concerto-set-actions" },
        h("span", { className: "concerto-set-actions-hint" }, hash ? "\u9884\u8BBE\u53D8\u66F4\u53EF\u901A\u8FC7\u300C\u91CD\u8F7D\u56E2\u961F\u300D\u5E94\u7528\u3002" : ""),
        h(
          "div",
          { className: "concerto-set-actions-buttons" },
          editing && h("button", { type: "button", className: "concerto-btn", disabled: busy, onClick: () => {
            focusName.current = true;
            loadDraft(null);
            setStatus("");
          } }, "\u65B0\u5EFA\u56E2\u961F"),
          h("button", { type: "button", className: "concerto-btn", disabled: busy || !hash, onClick: onReload }, "\u91CD\u8F7D\u56E2\u961F"),
          h("button", { type: "submit", className: "concerto-btn concerto-btn--primary", disabled: busy }, "\u4FDD\u5B58\u914D\u7F6E")
        )
      )
    ),
    // ② 已保存的团队
    h(
      SettingsSection,
      { title: "\u5DF2\u4FDD\u5B58\u7684\u56E2\u961F", count: teams.length },
      h(
        SettingsField,
        { label: "\u684C\u9762\u542F\u52A8\u76EE\u5F55", hint: "\u7EED\u5F00\u4E00\u8F6E\u65F6\u7559\u7A7A\u6CBF\u7528\u9879\u76EE\u6700\u8FD1\u76EE\u5F55\u3002" },
        h("input", { className: "concerto-input", value: launchCwd, onChange: (e) => setLaunchCwd(e.target.value), placeholder: "\u4F8B\u5982 D:\\projects\\my-app" })
      ),
      projects.length > 0 && h(
        "div",
        { className: "concerto-set-actions" },
        h(
          SettingsField,
          { label: "\u7EE7\u7EED\u5DF2\u6709\u9879\u76EE" },
          h(
            "select",
            {
              className: "concerto-input",
              value: selectedProject ? projectId : "",
              disabled: busy,
              onChange: (e) => {
                setProjectId(e.target.value);
                setContinuationTeamId("");
              }
            },
            h("option", { value: "", disabled: true }, "\u8BF7\u9009\u62E9\u9879\u76EE"),
            projects.map((project) => h(
              "option",
              { key: project.projectId, value: project.projectId },
              `${project.objective || project.teamName} \xB7 ${project.projectId.slice(-8)} \xB7 ${project.completed ? "\u5DF2\u6536\u5C3E" : "\u8FDB\u884C\u4E2D"}`
            ))
          )
        ),
        needsTeam && h(
          SettingsField,
          { label: "\u7EED\u5F00\u4F7F\u7528\u7684\u56E2\u961F", hint: teams.length === 0 ? "\u8BF7\u5148\u4FDD\u5B58\u4E00\u4E2A\u56E2\u961F\u3002" : "\u539F\u56E2\u961F\u914D\u7F6E\u5DF2\u79FB\u9664\u3002" },
          h(
            "select",
            {
              className: "concerto-input",
              value: teamForContinuation ?? "",
              disabled: busy || teams.length === 0,
              onChange: (e) => setContinuationTeamId(e.target.value)
            },
            h("option", { value: "", disabled: true }, "\u8BF7\u9009\u62E9\u56E2\u961F"),
            teams.map((team) => h("option", { key: team.id, value: team.id }, team.name))
          )
        ),
        h("button", {
          type: "button",
          className: "concerto-btn",
          disabled: busy || !teamForContinuation,
          onClick: () => onLaunchTeam(teamForContinuation, projectId)
        }, "\u7EE7\u7EED\u9879\u76EE")
      ),
      teams.length === 0 ? h("p", { className: "concerto-set-empty" }, "\u8FD8\u6CA1\u6709\u56E2\u961F\u3002\u5728\u4E0A\u65B9\u914D\u7F6E\u5E76\u4FDD\u5B58\u540E\uFF0C\u56E2\u961F\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002") : h("ul", { className: "concerto-set-list" }, teams.map((t) => {
        const caps = Array.isArray(t.memberCapabilities) ? t.memberCapabilities : [];
        return h(
          "li",
          { key: t.id, className: "concerto-set-item", "data-concerto-team-row": t.id },
          h(
            "div",
            { className: "concerto-set-item-head" },
            h(
              "div",
              { className: "concerto-set-item-title" },
              h("strong", null, t.name),
              h("span", { className: "concerto-badge concerto-id" }, t.id),
              h("span", { className: "concerto-quiet concerto-num" }, `v${t.configVersion} \xB7 ${t.memberCount} \u540D\u6210\u5458`)
            ),
            h(
              "div",
              { className: "concerto-set-actions-buttons" },
              h("button", {
                type: "button",
                className: "concerto-btn",
                disabled: busy,
                "aria-label": `\u7F16\u8F91\u56E2\u961F ${t.name}`,
                onClick: () => onEditTeam(t.id)
              }, "\u7F16\u8F91"),
              h("button", {
                type: "button",
                className: "concerto-btn concerto-btn--danger",
                disabled: busy,
                "aria-label": `\u5220\u9664\u56E2\u961F ${t.name}`,
                onClick: () => setDeleteTarget(t)
              }, "\u5220\u9664"),
              h("button", {
                type: "button",
                className: "concerto-btn concerto-btn--primary",
                disabled: busy,
                "data-concerto-launch-team": t.id,
                onClick: () => onLaunchTeam(t.id)
              }, "\u65B0\u5EFA\u9879\u76EE")
            )
          ),
          caps.length > 0 && h("div", { className: "concerto-set-caps", "aria-label": "\u6210\u5458\u80FD\u529B" }, caps.map((cap) => {
            const cs = formatCapabilitySummary(cap);
            return h("span", {
              key: cap.memberId,
              className: "concerto-chip",
              "data-tone": cs.tone || "neutral",
              title: `${cs.summary}${cs.tools.length ? ` \xB7 \u5DE5\u5177\uFF1A${cs.tools.join(", ")}` : ""}`
            }, `${cap.memberId} \xB7 ${cs.badge}`);
          }))
        );
      }))
    ),
    // ②½ 自定义外部 Agent（极简 3 字段 + 一键测试，保存即刻生效）
    h(CustomConnectorsSection, {
      connectors,
      disabled: busy,
      onChange: (nextList) => setConnectors(Array.isArray(nextList) ? nextList : connectors)
    }),
    // ④ 孤儿 / 阻塞执行恢复
    h(
      SettingsSection,
      {
        title: "\u5F02\u5E38\u6267\u884C\u6062\u590D",
        count: pendingUnknowns.length,
        tone: pendingUnknowns.length > 0 ? "attention" : void 0,
        hint: "\u5B64\u513F\u6216\u72B6\u6001\u672A\u77E5\u7684\u6267\u884C\uFF0C\u4E0D\u4F9D\u8D56\u539F\u6307\u6325\u4F1A\u8BDD\u5373\u53EF\u6838\u5BF9\u4E0E\u5904\u7406\u3002",
        "data-concerto-recovery-section": "true"
      },
      pendingUnknowns.length === 0 ? h("p", { className: "concerto-set-empty" }, "\u5F53\u524D\u6CA1\u6709\u9700\u8981\u6062\u590D\u7684 unknown \u6267\u884C\u3002") : pendingUnknowns.map(recoveryRow),
      quarantinedUnknowns.length > 0 && h(
        "details",
        { className: "concerto-set-fold" },
        h("summary", null, `\u539F\u5DE5\u4F5C\u533A\u4ECD\u4FDD\u7559\u5360\u7528\uFF08${quarantinedUnknowns.length} \u6761\uFF09`),
        quarantinedUnknowns.map(recoveryRow)
      )
    )
  );
}
function ApiEndpointFields({
  disabled = false,
  baseUrl = "",
  apiKey = "",
  model = "",
  onChangeBaseUrl,
  onChangeApiKey,
  onChangeModel
}) {
  const listId = import_react5.default.useId();
  const [models, setModels] = import_react5.default.useState([]);
  const [loading, setLoading] = import_react5.default.useState(false);
  const [hint, setHint] = import_react5.default.useState("");
  async function fetchModels() {
    if (!baseUrl.trim() || loading) return;
    setLoading(true);
    setHint("");
    try {
      const res = await request2("/api/models", {
        method: "POST",
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() })
      });
      const list = Array.isArray(res?.models) ? res.models : [];
      setModels(list);
      if (list.length > 0 && !model.trim()) onChangeModel?.(list[0]);
      setHint(list.length > 0 ? `\u5DF2\u62C9\u53D6 ${list.length} \u4E2A\u6A21\u578B` : "\u7AEF\u70B9\u672A\u8FD4\u56DE\u6A21\u578B\u5217\u8868\uFF0C\u53EF\u624B\u52A8\u8F93\u5165");
    } catch (error) {
      setHint(error.message || "\u62C9\u53D6\u5931\u8D25");
    } finally {
      setLoading(false);
    }
  }
  return h(
    import_react5.default.Fragment,
    null,
    h(
      SettingsField,
      { label: "API Base URL" },
      h("input", {
        disabled,
        className: "concerto-input concerto-id",
        value: baseUrl,
        placeholder: "https://api.deepseek.com/v1",
        onChange: (e) => onChangeBaseUrl?.(e.target.value)
      })
    ),
    h(
      SettingsField,
      { label: "API Key" },
      h("input", {
        type: "password",
        disabled,
        className: "concerto-input concerto-id",
        value: apiKey,
        placeholder: "sk-...\uFF08\u672C\u5730 Ollama \u53EF\u7559\u7A7A\uFF09",
        onChange: (e) => onChangeApiKey?.(e.target.value)
      })
    ),
    h(
      SettingsField,
      { label: "Model", hint: hint || void 0 },
      h(
        "div",
        { style: { display: "flex", gap: 6, alignItems: "center" } },
        h("input", {
          disabled,
          list: models.length > 0 ? listId : void 0,
          className: "concerto-input concerto-id",
          style: { flex: 1, minWidth: 0 },
          value: model,
          placeholder: "deepseek-chat / gpt-4o",
          onChange: (e) => onChangeModel?.(e.target.value)
        }),
        h("button", {
          type: "button",
          className: "concerto-btn",
          disabled: disabled || loading || !baseUrl.trim(),
          onClick: fetchModels
        }, loading ? "\u62C9\u53D6\u4E2D\u2026" : "\u62C9\u53D6\u6A21\u578B")
      ),
      models.length > 0 && h(
        "datalist",
        { id: listId },
        models.map((m) => h("option", { key: m, value: m }))
      )
    )
  );
}
function ProviderModelFields({
  disabled = false,
  providers = [],
  provider = "",
  model = "",
  providerLabel = "provider",
  modelLabel = "model",
  allowEmpty = false,
  onChangeProvider,
  onChangeModel
}) {
  const hasCatalog = Array.isArray(providers) && providers.length > 0;
  const selectedProvider = hasCatalog ? providers.find((p) => p.id === provider) : null;
  const models = selectedProvider?.models ?? [];
  const hasModelList = models.length > 0;
  function handleProviderChange(nextProvider) {
    onChangeProvider?.(nextProvider);
    if (hasCatalog && nextProvider) {
      const target = providers.find((p) => p.id === nextProvider);
      if (target?.models?.length > 0 && !target.models.some((m) => m.id === model)) {
        onChangeModel?.(target.models[0].id);
      }
    }
  }
  return h(
    import_react5.default.Fragment,
    null,
    h(
      SettingsField,
      { label: providerLabel },
      hasCatalog ? h(
        "select",
        {
          disabled,
          className: "concerto-input concerto-id",
          value: provider,
          onChange: (e) => handleProviderChange(e.target.value)
        },
        allowEmpty && h("option", { value: "" }, "DSH \u9ED8\u8BA4"),
        providers.map((p) => h("option", { key: p.id, value: p.id }, p.name && p.name !== p.id ? `${p.name} (${p.id})` : p.id)),
        provider && !providers.some((p) => p.id === provider) && h("option", { value: provider }, `${provider} (\u5F53\u524D)`)
      ) : h("input", {
        disabled,
        className: "concerto-input concerto-id",
        value: provider,
        placeholder: allowEmpty ? "DSH \u9ED8\u8BA4" : "x-ds",
        onChange: (e) => onChangeProvider?.(e.target.value)
      })
    ),
    h(
      SettingsField,
      { label: modelLabel },
      hasModelList ? h(
        "select",
        {
          disabled,
          className: "concerto-input concerto-id",
          value: model,
          onChange: (e) => onChangeModel?.(e.target.value)
        },
        allowEmpty && h("option", { value: "" }, "DSH \u9ED8\u8BA4"),
        models.map((m) => h("option", { key: m.id, value: m.id }, m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id)),
        model && !models.some((m) => m.id === model) && h("option", { value: model }, `${model} (\u5F53\u524D)`)
      ) : h("input", {
        disabled,
        className: "concerto-input concerto-id",
        value: model,
        placeholder: allowEmpty ? "DSH \u9ED8\u8BA4" : "deepseek-v4.1-flash",
        onChange: (e) => onChangeModel?.(e.target.value)
      })
    )
  );
}
function CustomConnectorsSection({ connectors = [], disabled = false, onChange }) {
  const [displayName, setDisplayName] = import_react5.default.useState("");
  const [mode, setMode] = import_react5.default.useState("acp");
  const [command, setCommand] = import_react5.default.useState("");
  const [probeState, setProbeState] = import_react5.default.useState(null);
  const [saving, setSaving] = import_react5.default.useState(false);
  const [testingId, setTestingId] = import_react5.default.useState("");
  const [rowProbes, setRowProbes] = import_react5.default.useState({});
  const customList = connectors.filter((c) => c.custom);
  const busy = disabled || saving;
  async function onTestDraft() {
    if (!command.trim()) {
      setProbeState({ ok: false, text: "\u8BF7\u5148\u586B\u5199\u542F\u52A8\u547D\u4EE4" });
      return;
    }
    setProbeState({ pending: true, text: "\u6D4B\u8BD5\u8FDE\u63A5\u4E2D\u2026" });
    try {
      const res = await request2("/connectors/probe", {
        method: "POST",
        body: JSON.stringify({ displayName: displayName.trim() || "\u6D4B\u8BD5 Agent", mode, command: command.trim() })
      });
      setProbeState({ ok: Boolean(res?.ok), text: res?.ok ? `\u5DF2\u5C31\u7EEA\uFF1A${res.userAgent || res.bin || "OK"}` : `\u672A\u8FDE\u901A\uFF1A${res?.detail || res?.code || "\u5931\u8D25"}` });
    } catch (error) {
      setProbeState({ ok: false, text: `\u672A\u8FDE\u901A\uFF1A${error.message}` });
    }
  }
  async function onAdd(event) {
    event?.preventDefault?.();
    if (!displayName.trim() || !command.trim()) {
      setProbeState({ ok: false, text: "\u8BF7\u586B\u5199\u540D\u79F0\u548C\u542F\u52A8\u547D\u4EE4" });
      return;
    }
    setSaving(true);
    try {
      const res = await request2("/connectors/custom", {
        method: "POST",
        body: JSON.stringify({ displayName: displayName.trim(), mode, command: command.trim() })
      });
      if (res?.connectors) onChange?.(res.connectors);
      setDisplayName("");
      setCommand("");
      setProbeState({ ok: true, text: `\u5DF2\u6DFB\u52A0\u300C${res?.connector?.displayName || displayName}\u300D\uFF0C\u73B0\u5728\u53EF\u4EE5\u76F4\u63A5\u5728\u4E0A\u65B9\u6210\u5458\u5217\u8868\u9009\u7528` });
    } catch (error) {
      setProbeState({ ok: false, text: `\u4FDD\u5B58\u5931\u8D25\uFF1A${error.message}` });
    } finally {
      setSaving(false);
    }
  }
  async function onTestSaved(id) {
    setTestingId(id);
    try {
      const res = await request2("/connectors/probe", {
        method: "POST",
        body: JSON.stringify({ connector: id })
      });
      setRowProbes((prev) => ({
        ...prev,
        [id]: { ok: Boolean(res?.ok), text: res?.ok ? `\u5DF2\u5C31\u7EEA \xB7 ${res.userAgent || "OK"}` : `\u672A\u8FDE\u901A \xB7 ${res?.detail || res?.code || "\u5931\u8D25"}` }
      }));
    } catch (error) {
      setRowProbes((prev) => ({ ...prev, [id]: { ok: false, text: `\u672A\u8FDE\u901A \xB7 ${error.message}` } }));
    } finally {
      setTestingId("");
    }
  }
  async function onDelete(id) {
    setSaving(true);
    try {
      const res = await request2(`/connectors/custom?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res?.connectors) onChange?.(res.connectors);
      setRowProbes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      setProbeState({ ok: false, text: `\u5220\u9664\u5931\u8D25\uFF1A${error.message}` });
    } finally {
      setSaving(false);
    }
  }
  return h(
    SettingsSection,
    {
      title: "\u81EA\u5B9A\u4E49\u5916\u90E8 Agent",
      count: customList.length,
      hint: "\u586B\u540D\u79F0\u548C\u542F\u52A8\u547D\u4EE4\u5373\u53EF\u63A5\u5165\u4EFB\u610F CLI Agent\uFF0C\u4FDD\u5B58\u540E\u7ACB\u5373\u751F\u6548\u3001\u65E0\u9700\u91CD\u542F DSH\u3002",
      "data-concerto-custom-connectors": "true"
    },
    h(
      "div",
      { className: "concerto-set-grid" },
      h(
        SettingsField,
        { label: "\u540D\u79F0" },
        h("input", {
          className: "concerto-input",
          disabled: busy,
          value: displayName,
          placeholder: mode === "acp" ? "\u4F8B\u5982\uFF1AMy ACP Agent" : "\u4F8B\u5982\uFF1AAider",
          onChange: (e) => setDisplayName(e.target.value)
        })
      ),
      h(
        SettingsField,
        { label: "\u63A5\u5165\u65B9\u5F0F" },
        h(
          "select",
          {
            className: "concerto-input",
            disabled: busy,
            value: mode,
            onChange: (e) => {
              setMode(e.target.value);
              setProbeState(null);
            }
          },
          h("option", { value: "acp" }, "ACP \u534F\u8BAE\uFF08\u63A8\u8350\uFF0C\u652F\u6301\u56E2\u961F\u5DE5\u5177\u4E0E\u5BA1\u6279\uFF09"),
          h("option", { value: "cli" }, "\u666E\u901A\u547D\u4EE4\u884C\uFF08\u901A\u7528\u515C\u5E95\uFF09")
        )
      )
    ),
    h(
      SettingsField,
      {
        label: "\u542F\u52A8\u547D\u4EE4",
        hint: mode === "acp" ? '\u4F8B\u5982\uFF1Amy-agent acp \u6216 "C:\\path\\to\\agent.exe" acp' : "\u4F8B\u5982\uFF1Aaider --yes --message {{prompt}}\uFF08\u4E0D\u5199 {{prompt}} \u65F6\u81EA\u52A8\u901A\u8FC7\u6807\u51C6\u8F93\u5165\u4F20\u5165\u4EFB\u52A1\uFF09"
      },
      h("input", {
        className: "concerto-input concerto-id",
        disabled: busy,
        value: command,
        placeholder: mode === "acp" ? "my-agent acp" : "aider --yes --message {{prompt}}",
        onChange: (e) => {
          setCommand(e.target.value);
          setProbeState(null);
        }
      })
    ),
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 } },
      h("button", {
        type: "button",
        className: "concerto-btn",
        disabled: busy || !command.trim(),
        onClick: onTestDraft
      }, probeState?.pending ? "\u6D4B\u8BD5\u4E2D\u2026" : "\u6D4B\u8BD5\u8FDE\u63A5"),
      h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--primary",
        disabled: busy || !displayName.trim() || !command.trim(),
        onClick: onAdd
      }, "\u6DFB\u52A0\u8FDE\u63A5\u5668"),
      probeState && h("span", {
        className: "concerto-field-hint",
        style: { color: probeState.pending ? "var(--cc-text-secondary)" : probeState.ok ? "var(--cc-ok)" : "var(--cc-danger)" }
      }, probeState.text)
    ),
    customList.length > 0 && h(
      "ul",
      { className: "concerto-set-list", style: { marginTop: 10 } },
      customList.map((item) => {
        const rowProbe = rowProbes[item.id];
        return h(
          "li",
          { key: item.id, className: "concerto-set-item" },
          h(
            "div",
            { className: "concerto-set-item-head" },
            h(
              "div",
              { className: "concerto-set-item-title" },
              h("strong", null, item.displayName || item.id),
              h("span", { className: "concerto-badge concerto-id" }, item.id),
              h("span", { className: "concerto-tag" }, (item.protocol || item.mode || "cli").toUpperCase())
            ),
            h(
              "div",
              { style: { display: "flex", gap: 6 } },
              h("button", {
                type: "button",
                className: "concerto-btn",
                disabled: busy || testingId === item.id,
                onClick: () => onTestSaved(item.id)
              }, testingId === item.id ? "\u6D4B\u8BD5\u4E2D\u2026" : "\u6D4B\u8BD5"),
              h("button", {
                type: "button",
                className: "concerto-btn concerto-btn--danger",
                disabled: busy,
                onClick: () => onDelete(item.id)
              }, "\u5220\u9664")
            )
          ),
          h(
            "div",
            { className: "concerto-set-meta" },
            h("span", { className: "concerto-id" }, item.command || ""),
            rowProbe && h("span", {
              style: { color: rowProbe.ok ? "var(--cc-ok)" : "var(--cc-danger)" }
            }, rowProbe.text)
          )
        );
      })
    )
  );
}
function SettingsSection({ as = "section", title, hint, count, tone, children, ...rest }) {
  return h(
    as,
    { className: "concerto-set-card", "data-tone": tone, ...rest },
    h(
      "div",
      { className: "concerto-set-card-head" },
      h("h3", null, title, count != null && h("span", { className: "concerto-count-pill concerto-num" }, String(count))),
      hint && h("p", { className: "concerto-set-hint" }, hint)
    ),
    children
  );
}
function SettingsField({ label: fieldLabel, hint, children }) {
  return h(
    "label",
    { className: "concerto-set-field" },
    h("span", { className: "concerto-set-label" }, fieldLabel),
    children,
    hint && h("span", { className: "concerto-field-hint" }, hint)
  );
}
var APPROVAL_METHOD_LABEL = {
  "item/commandExecution/requestApproval": "\u547D\u4EE4\u6267\u884C\u5BA1\u6279",
  "item/fileChange/requestApproval": "\u6587\u4EF6\u4FEE\u6539\u5BA1\u6279"
};
function RequiredReasonField({ label: fieldLabel, value, onChange, disabled, hint, maxLength }) {
  const id = import_react5.default.useId();
  const [invalid, setInvalid] = import_react5.default.useState(false);
  return h(
    "div",
    { className: "concerto-field" },
    h("label", { htmlFor: id }, fieldLabel, h("span", { className: "concerto-quiet" }, " \xB7 \u5FC5\u586B")),
    hint && h("p", { id: `${id}-hint`, className: "concerto-field-hint" }, hint),
    h("textarea", {
      id,
      value,
      disabled,
      required: true,
      rows: 2,
      maxLength,
      "aria-invalid": invalid || void 0,
      "aria-describedby": [hint && `${id}-hint`, invalid && `${id}-error`].filter(Boolean).join(" ") || void 0,
      onInvalid: () => setInvalid(true),
      onChange: (event) => {
        const text = event.target.value;
        event.target.setCustomValidity(text.trim() ? "" : `\u8BF7\u586B\u5199${fieldLabel}\u3002`);
        if (text.trim()) setInvalid(false);
        onChange(text);
      },
      className: "concerto-textarea"
    }),
    invalid && h("p", { id: `${id}-error`, className: "concerto-field-error" }, `\u8BF7\u586B\u5199${fieldLabel}\u3002`)
  );
}
function UnblockTaskForm({ task, disabled, onSubmit }) {
  const [reason, setReason] = import_react5.default.useState("");
  const [expectedUpdatedAt] = import_react5.default.useState(task.updatedAt);
  const stale = task.updatedAt !== expectedUpdatedAt;
  return h(
    "form",
    {
      "aria-label": "\u89E3\u9664\u4EFB\u52A1\u963B\u585E",
      onSubmit: (event) => {
        event.preventDefault();
        if (disabled || stale || !reason.trim()) return;
        onSubmit({ taskId: task.taskId, expectedUpdatedAt, reason: reason.trim() });
      }
    },
    h(RequiredReasonField, {
      label: "\u963B\u585E\u89E3\u9664\u4F9D\u636E",
      value: reason,
      onChange: setReason,
      disabled,
      maxLength: 1200,
      hint: "\u8BF4\u660E\u963B\u585E\u5982\u4F55\u89E3\u9664\u3002\u63D0\u4EA4\u540E\u4EFB\u52A1\u56DE\u5230\u5F85\u6D3E\u53D1\u3002"
    }),
    stale && h("p", { role: "status" }, "\u4EFB\u52A1\u5DF2\u66F4\u65B0\u3002\u91CD\u65B0\u6253\u5F00\u8BE6\u60C5\u540E\u518D\u63D0\u4EA4\u3002"),
    h("button", { type: "submit", className: "concerto-btn", disabled: disabled || stale }, "\u89E3\u9664\u963B\u585E")
  );
}
function RequestCard({ item, disabled, onAnswer, bare = false }) {
  const [draft, setDraft] = import_react5.default.useState({});
  const inputId = import_react5.default.useId();
  const [invalidQuestions, setInvalidQuestions] = import_react5.default.useState({});
  const questions = item.payload?.questions || [];
  const answerOf = (q2) => draft[q2.id] ?? "";
  const set = (id, value) => setDraft({ ...draft, [id]: value });
  const rawSeq = item.sequenceIndex ?? item.payload?.sequenceIndex;
  const seq = Number.isInteger(rawSeq) ? rawSeq : null;
  const methodLabel = APPROVAL_METHOD_LABEL[item.payload?.method] || item.payload?.method || "";
  const files = Array.isArray(item.payload?.files) ? item.payload.files : [];
  const rawDiff = item.diffFromPrevious ?? item.payload?.diffFromPrevious;
  const diffText = Array.isArray(rawDiff) ? rawDiff.join(" \xB7 ") : rawDiff ? String(rawDiff) : "";
  const isDuplicate = Boolean(item.duplicateOfRequestId ?? item.payload?.duplicateOfRequestId);
  const questionMode = item.responseMode === "next_turn" ? "\u672C\u8F6E\u7ED3\u675F\u540E\uFF0C\u6210\u5458\u5C06\u5728\u4E0B\u4E00\u8F6E\u6536\u5230\u7B54\u590D\u3002" : item.responseMode === "same_turn" ? "\u7B54\u590D\u5C06\u9001\u56DE\u6210\u5458\u5F53\u524D\u8F6E\u3002" : "";
  return h(
    "div",
    { style: bare ? void 0 : cardStyle },
    !bare && h("strong", null, (item.kind === "approval" ? "\u8BF7\u6C42\u6279\u51C6" : "\u5411\u4F60\u63D0\u95EE") + " \xB7 " + (item.memberId || "\u6210\u5458")),
    !bare && h("div", { style: styles.muted }, item.taskId + " \xB7 " + label(item.status)),
    item.kind === "approval" && (seq || methodLabel || diffText) && h(
      "div",
      {
        style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 4 },
        "data-concerto-approval-meta": item.requestId
      },
      seq && h("span", { className: "concerto-badge concerto-num" }, `\u7B2C ${seq} \u6B21\u5BA1\u6279`),
      methodLabel && h("span", { className: "concerto-chip" }, methodLabel),
      diffText && h("span", {
        className: "concerto-tag",
        style: { color: isDuplicate ? "var(--cc-state-blocked)" : "var(--cc-accent)" }
      }, isDuplicate ? `\u91CD\u590D\u8B66\u544A\uFF1A${diffText}` : `\u4E0E\u524D\u6B21\u5DEE\u5F02\uFF1A${diffText}`)
    ),
    item.detail && h("p", { role: "status" }, item.detail),
    item.payload?.command && h("pre", {
      style: {
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        margin: "4px 0",
        padding: "6px 10px",
        borderRadius: "var(--cc-radius-ctrl)",
        background: "var(--cc-card-nested-bg)"
      }
    }, item.payload.command),
    files.length > 0 && h(
      "div",
      { style: { ...styles.muted, fontSize: "var(--cc-fs-caption)", marginTop: 2, overflowWrap: "anywhere" } },
      "\u6D89\u53CA\u6587\u4EF6\uFF1A" + files.join("\u3001")
    ),
    item.payload?.cwd && h("div", { style: { ...styles.muted, fontSize: "var(--cc-fs-caption)", overflowWrap: "anywhere" } }, "\u5DE5\u4F5C\u76EE\u5F55\uFF1A" + item.payload.cwd),
    item.payload?.decisionScope && h("div", { style: { ...styles.muted, fontSize: "var(--cc-fs-caption)" } }, "\u51B3\u7B56\u8303\u56F4\uFF1A" + String(item.payload.decisionScope)),
    item.payload?.reason && h("p", { style: { fontSize: "var(--cc-fs-meta)", margin: "2px 0" } }, item.payload.reason),
    item.kind === "approval" && h(
      "div",
      { style: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "flex-end" } },
      h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--ghost",
        disabled: disabled || item.status !== "pending",
        onClick: () => onAnswer(item, { decision: "decline" })
      }, "\u62D2\u7EDD"),
      h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--primary",
        disabled: disabled || item.status !== "pending",
        onClick: () => onAnswer(item, { decision: "accept" })
      }, "\u6279\u51C6\u8FD9\u6B21")
    ),
    item.kind === "question" && h(
      "form",
      {
        "aria-label": `\u56DE\u7B54 ${item.memberId || "\u6210\u5458"} \u7684\u95EE\u9898`,
        "aria-describedby": questionMode ? `${inputId}-mode` : void 0,
        onSubmit: (event) => {
          event.preventDefault();
          if (disabled || item.status !== "pending") return;
          onAnswer(item, { answers: Object.fromEntries(questions.map((q2) => [q2.id, { answers: [answerOf(q2).trim()] }])) });
        }
      },
      questionMode && h("p", { id: `${inputId}-mode`, className: "concerto-field-hint" }, questionMode),
      questions.map((q2, index) => h(
        "div",
        { key: q2.id, className: "concerto-field" },
        h("label", { htmlFor: `${inputId}-${index}` }, q2.question, h("span", { className: "concerto-quiet" }, " \xB7 \u5FC5\u586B")),
        q2.options?.length > 0 && h(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 } },
          q2.options.map((opt) => h("button", {
            key: opt.label,
            type: "button",
            className: "concerto-btn",
            "aria-pressed": answerOf(q2) === opt.label,
            disabled: disabled || item.status !== "pending",
            onClick: () => set(q2.id, opt.label)
          }, opt.label))
        ),
        h("input", {
          id: `${inputId}-${index}`,
          value: answerOf(q2),
          disabled: disabled || item.status !== "pending",
          required: true,
          pattern: ".*\\S.*",
          "aria-invalid": invalidQuestions[q2.id] && !answerOf(q2).trim() || void 0,
          "aria-describedby": invalidQuestions[q2.id] && !answerOf(q2).trim() ? `${inputId}-${index}-error` : void 0,
          onInvalid: () => setInvalidQuestions((prev) => ({ ...prev, [q2.id]: true })),
          onChange: (event) => set(q2.id, event.target.value),
          placeholder: "\u9009\u62E9\u4E0A\u65B9\u9009\u9879\uFF0C\u6216\u8F93\u5165\u56DE\u7B54",
          className: "concerto-input"
        }),
        invalidQuestions[q2.id] && !answerOf(q2).trim() && h("p", { id: `${inputId}-${index}-error`, className: "concerto-field-error" }, "\u8BF7\u586B\u5199\u56DE\u7B54\u6216\u9009\u62E9\u4E00\u4E2A\u9009\u9879\u3002")
      )),
      h(
        "div",
        { style: { display: "flex", justifyContent: "flex-end", marginTop: 8 } },
        h("button", { type: "submit", className: "concerto-btn concerto-btn--primary", disabled: disabled || item.status !== "pending" || questions.length === 0 }, "\u63D0\u4EA4\u56DE\u7B54")
      )
    )
  );
}
function ReviewCard({ task, disabled, onReview, bare = false }) {
  const [reason, setReason] = import_react5.default.useState("");
  const [failError, setFailError] = import_react5.default.useState("");
  const reasonRef = import_react5.default.useRef(null);
  const inputId = import_react5.default.useId();
  return h(
    "form",
    {
      style: { marginTop: bare ? 4 : 8 },
      "aria-label": `\u9A8C\u6536 ${task.title || task.taskId}`,
      onSubmit: (event) => {
        event.preventDefault();
        if (disabled) return;
        const verdict = event.nativeEvent.submitter?.value;
        if (!["pass", "fail"].includes(verdict)) return;
        const trimmed = reason.trim();
        if (verdict === "fail" && !trimmed) {
          setFailError("\u9000\u56DE\u91CD\u505A\u65F6\u8BF7\u586B\u5199\u4FEE\u6539\u539F\u56E0\u3002");
          reasonRef.current?.focus();
          return;
        }
        setFailError("");
        onReview(task, verdict, trimmed || "\u7528\u6237\u786E\u8BA4\u9A8C\u6536\u901A\u8FC7");
      }
    },
    h(
      "div",
      { className: "concerto-field" },
      h("label", { htmlFor: inputId }, "\u9A8C\u6536\u8BF4\u660E", h("span", { className: "concerto-quiet" }, " \xB7 \u901A\u8FC7\u9009\u586B\uFF0C\u9000\u56DE\u91CD\u505A\u5FC5\u586B")),
      h("textarea", {
        ref: reasonRef,
        id: inputId,
        className: "concerto-input",
        rows: 2,
        value: reason,
        disabled,
        placeholder: "\u76F4\u63A5\u70B9\u51FB\u201C\u9A8C\u6536\u901A\u8FC7\u201D\u5373\u53EF\uFF1B\u5982\u9700\u9000\u56DE\u91CD\u505A\uFF0C\u8BF7\u8BF4\u660E\u539F\u56E0\u3002",
        "aria-invalid": Boolean(failError) || void 0,
        "aria-describedby": failError ? `${inputId}-error` : void 0,
        onChange: (event) => {
          setReason(event.target.value);
          if (failError && event.target.value.trim()) setFailError("");
        }
      }),
      failError && h("p", { id: `${inputId}-error`, className: "concerto-field-error", role: "alert" }, failError)
    ),
    h(
      "div",
      { style: { display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "flex-end" } },
      h("button", { type: "submit", value: "fail", className: "concerto-btn concerto-btn--ghost", disabled }, "\u9000\u56DE\u91CD\u505A"),
      h("button", { type: "submit", value: "pass", className: "concerto-btn concerto-btn--primary", disabled }, "\u9A8C\u6536\u901A\u8FC7")
    )
  );
}
function AdjudicationCard({ execution, disabled, onSubmit, bare = false }) {
  const [reviewed, setReviewed] = import_react5.default.useState(false);
  const delivery = execution.recoverableDelivery;
  return h(
    "form",
    {
      style: bare ? void 0 : cardStyle,
      "aria-label": `\u88C1\u51B3 ${execution.taskId}`,
      onSubmit: (event) => {
        event.preventDefault();
        if (disabled) return;
        const action = event.nativeEvent.submitter?.value;
        if (!action || action === "retry_isolated" && !reviewed || action === "accept" && !delivery) return;
        onSubmit({
          taskId: execution.taskId,
          executionId: execution.executionId,
          action,
          reason: ADJUDICATION_NOTES[action],
          ...action === "retry_isolated" ? { externalEffectsReviewed: true } : {},
          ...action === "accept" ? { resultId: delivery.resultId } : {}
        });
      }
    },
    !bare && h("strong", null, "\u9700\u8981\u4F60\u88C1\u51B3 \xB7 " + execution.taskId),
    h("div", { style: { ...styles.muted, fontSize: "var(--cc-fs-meta)" } }, (execution.memberId || "") + " \xB7 \u72B6\u6001\u672A\u77E5\uFF08\u4E0A\u6B21\u8FD0\u884C\u7ED3\u679C\u5C1A\u672A\u786E\u8BA4\uFF09"),
    execution.writeScope && h("p", { style: { ...styles.muted, fontSize: "var(--cc-fs-caption)", overflowWrap: "anywhere" } }, "\u5DE5\u4F5C\u76EE\u5F55\u88AB\u4E0A\u6B21\u672A\u786E\u8BA4\u7684\u8FD0\u884C\u5360\u7528\uFF1A" + execution.writeScope),
    delivery && h(DeliveryRecoveryNote, { delivery }),
    h(
      "label",
      { style: { display: "flex", gap: 6, alignItems: "center", marginTop: 6, fontSize: "var(--cc-fs-meta)" } },
      h("input", { type: "checkbox", checked: reviewed, disabled, onChange: (e) => setReviewed(e.target.checked) }),
      "\u5DF2\u6838\u67E5\u4E0A\u6B21\u8FD0\u884C\u7684\u5916\u90E8\u6539\u52A8\uFF0C\u5141\u8BB8\u5728\u9694\u79BB\u5DE5\u4F5C\u533A\u91CD\u8BD5"
    ),
    h(
      "div",
      { style: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "flex-end" } },
      h("button", { type: "submit", value: "confirm_failed", className: "concerto-btn concerto-btn--ghost", disabled }, "\u786E\u8BA4\u5DF2\u505C\u6B62\u5E76\u6539\u6D3E"),
      delivery && h("button", { type: "submit", value: "accept", className: "concerto-btn", disabled }, "\u63A5\u6536\u5DF2\u9A8C\u8BC1\u4EA4\u4ED8"),
      h("button", { type: "submit", value: "retry_isolated", className: "concerto-btn concerto-btn--primary", disabled: disabled || !reviewed }, "\u5E26\u9694\u79BB\u91CD\u8BD5")
    )
  );
}

// packages/dsh-concerto/src/client/components/TeamHome.js
var import_react20 = __toESM(require_react(), 1);

// packages/dsh-concerto/src/client/components/ExcalidrawImport.js
var import_react6 = __toESM(require_react(), 1);

// packages/dsh-concerto/lib/domain/excalidraw_import.mjs
var EXCALIDRAW_IMPORT_MAX_BYTES = 1024 * 1024;
var SHAPES = ["rectangle", "ellipse", "diamond"];
var LINES = ["arrow", "line"];
var SUPPORTED = [...SHAPES, "text", ...LINES];

// packages/dsh-concerto/src/client/components/ExcalidrawImport.js
function ExcalidrawImport({ sessionId, disabled, viewObjects, refresh, onLocate }) {
  const picker = import_react6.default.useRef(null);
  const [status, setStatus] = import_react6.default.useState(null);
  const busy = status?.kind === "busy";
  const imported = status?.id && viewObjects.find((object) => object.id === status.id);
  async function handleFile(event) {
    const input = event.currentTarget;
    const file = input.files[0];
    if (!file) return;
    input.value = "";
    if (file.size > EXCALIDRAW_IMPORT_MAX_BYTES) {
      setStatus({ kind: "error", message: "\u8BF7\u9009\u62E9\u4E0D\u8D85\u8FC7 1 MiB \u7684 .excalidraw \u6587\u4EF6\u3002" });
      return;
    }
    setStatus({ kind: "busy", message: "\u6B63\u5728\u5BFC\u5165\u767D\u677F\u2026" });
    try {
      const result = await importExcalidrawBoard(sessionId, file);
      const omitted = result.omittedCount ? `\uFF0C\u5DF2\u8DF3\u8FC7 ${result.omittedCount} \u4E2A\u4E0D\u652F\u6301\u7684\u5143\u7D20` : "";
      setStatus({ kind: "success", id: result.id, message: `\u5DF2\u5BFC\u5165\u300C${result.title}\u300D${omitted}\u3002` });
      refresh();
    } catch (error) {
      setStatus({ kind: "error", message: `\u5BFC\u5165\u5931\u8D25\uFF1A${error.message}` });
    }
  }
  return h(
    "div",
    { className: "concerto-import-actions" },
    h("button", {
      type: "button",
      className: "concerto-btn",
      disabled: disabled || busy,
      onClick: () => picker.current.click()
    }, "\u5BFC\u5165 .excalidraw"),
    h("input", { ref: picker, type: "file", accept: ".excalidraw", hidden: true, onChange: handleFile }),
    h("span", { role: "status", className: "concerto-quiet", style: { overflowWrap: "anywhere" } }, status?.message),
    imported && h("button", {
      type: "button",
      className: "concerto-link",
      onClick: () => onLocate(imported)
    }, "\u67E5\u770B\u767D\u677F")
  );
}

// packages/dsh-concerto/node_modules/@dagrejs/dagre/dist/dagre.esm.js
var Te = Object.defineProperty;
var Sn = (e, n, t) => n in e ? Te(e, n, { enumerable: true, configurable: true, writable: true, value: t }) : e[n] = t;
var Mn = (e, n) => {
  for (var t in n) Te(e, t, { get: n[t], enumerable: true });
};
var je = (e, n, t) => Sn(e, typeof n != "symbol" ? n + "" : n, t);
var ie = {};
Mn(ie, { Graph: () => T, alg: () => H });
var Pn = Object.defineProperty;
var Se = (e, n) => {
  for (var t in n) Pn(e, t, { get: n[t], enumerable: true });
};
var Q = class {
  constructor(e) {
    this._isDirected = true, this._isMultigraph = false, this._isCompound = false, this._nodes = {}, this._in = {}, this._preds = {}, this._out = {}, this._sucs = {}, this._edgeObjs = {}, this._edgeLabels = {}, this._nodeCount = 0, this._edgeCount = 0, this._defaultNodeLabelFn = () => {
    }, this._defaultEdgeLabelFn = () => {
    }, e && (this._isDirected = "directed" in e ? e.directed : true, this._isMultigraph = "multigraph" in e ? e.multigraph : false, this._isCompound = "compound" in e ? e.compound : false), this._isCompound && (this._parent = {}, this._children = {}, this._children["\0"] = {});
  }
  isDirected() {
    return this._isDirected;
  }
  isMultigraph() {
    return this._isMultigraph;
  }
  isCompound() {
    return this._isCompound;
  }
  setGraph(e) {
    return this._label = e, this;
  }
  graph() {
    return this._label;
  }
  setDefaultNodeLabel(e) {
    return typeof e != "function" ? this._defaultNodeLabelFn = () => e : this._defaultNodeLabelFn = e, this;
  }
  nodeCount() {
    return this._nodeCount;
  }
  nodes() {
    return Object.keys(this._nodes);
  }
  sources() {
    return this.nodes().filter((e) => Object.keys(this._in[e]).length === 0);
  }
  sinks() {
    return this.nodes().filter((e) => Object.keys(this._out[e]).length === 0);
  }
  setNodes(e, n) {
    return e.forEach((t) => {
      n !== void 0 ? this.setNode(t, n) : this.setNode(t);
    }), this;
  }
  setNode(e, n) {
    return e in this._nodes ? (arguments.length > 1 && (this._nodes[e] = n), this) : (this._nodes[e] = arguments.length > 1 ? n : this._defaultNodeLabelFn(e), this._isCompound && (this._parent[e] = "\0", this._children[e] = {}, this._children["\0"][e] = true), this._in[e] = {}, this._preds[e] = {}, this._out[e] = {}, this._sucs[e] = {}, ++this._nodeCount, this);
  }
  node(e) {
    return this._nodes[e];
  }
  hasNode(e) {
    return e in this._nodes;
  }
  removeNode(e) {
    if (e in this._nodes) {
      let n = (t) => this.removeEdge(this._edgeObjs[t]);
      delete this._nodes[e], this._isCompound && (this._removeFromParentsChildList(e), delete this._parent[e], this.children(e).forEach((t) => {
        this.setParent(t);
      }), delete this._children[e]), Object.keys(this._in[e]).forEach(n), delete this._in[e], delete this._preds[e], Object.keys(this._out[e]).forEach(n), delete this._out[e], delete this._sucs[e], --this._nodeCount;
    }
    return this;
  }
  setParent(e, n) {
    if (!this._isCompound) throw new Error("Cannot set parent in a non-compound graph");
    if (n === void 0) n = "\0";
    else {
      n += "";
      for (let t = n; t !== void 0; t = this.parent(t)) if (t === e) throw new Error("Setting " + n + " as parent of " + e + " would create a cycle");
      this.setNode(n);
    }
    return this.setNode(e), this._removeFromParentsChildList(e), this._parent[e] = n, this._children[n][e] = true, this;
  }
  parent(e) {
    if (this._isCompound) {
      let n = this._parent[e];
      if (n !== "\0") return n;
    }
  }
  children(e = "\0") {
    if (this._isCompound) {
      let n = this._children[e];
      if (n) return Object.keys(n);
    } else {
      if (e === "\0") return this.nodes();
      if (this.hasNode(e)) return [];
    }
    return [];
  }
  predecessors(e) {
    let n = this._preds[e];
    if (n) return Object.keys(n);
  }
  successors(e) {
    let n = this._sucs[e];
    if (n) return Object.keys(n);
  }
  neighbors(e) {
    let n = this.predecessors(e);
    if (n) {
      let t = new Set(n), r = this.successors(e);
      if (r) for (let o of r) t.add(o);
      return Array.from(t.values());
    }
  }
  isLeaf(e) {
    var n;
    let t;
    return this.isDirected() ? t = this.successors(e) : t = this.neighbors(e), ((n = t == null ? void 0 : t.length) != null ? n : 0) === 0;
  }
  filterNodes(e) {
    let n = new this.constructor({ directed: this._isDirected, multigraph: this._isMultigraph, compound: this._isCompound });
    n.setGraph(this.graph()), Object.entries(this._nodes).forEach(([o, i]) => {
      e(o) && n.setNode(o, i);
    }), Object.values(this._edgeObjs).forEach((o) => {
      n.hasNode(o.v) && n.hasNode(o.w) && n.setEdge(o, this.edge(o));
    });
    let t = {}, r = (o) => {
      let i = this.parent(o);
      return !i || n.hasNode(i) ? (t[o] = i, i) : i in t ? t[i] : r(i);
    };
    return this._isCompound && n.nodes().forEach((o) => n.setParent(o, r(o))), n;
  }
  setDefaultEdgeLabel(e) {
    return typeof e != "function" ? this._defaultEdgeLabelFn = () => e : this._defaultEdgeLabelFn = e, this;
  }
  edgeCount() {
    return this._edgeCount;
  }
  edges() {
    return Object.values(this._edgeObjs);
  }
  setPath(e, n) {
    return e.reduce((t, r) => (n !== void 0 ? this.setEdge(t, r, n) : this.setEdge(t, r), r)), this;
  }
  setEdge(e, n, t, r) {
    let o, i, s, a, l = false;
    typeof e == "object" && e !== null && "v" in e ? (o = e.v, i = e.w, s = e.name, arguments.length === 2 && (a = n, l = true)) : (o = e, i = n, s = r, arguments.length > 2 && (a = t, l = true)), o = "" + o, i = "" + i, s !== void 0 && (s = "" + s);
    let u = z(this._isDirected, o, i, s);
    if (u in this._edgeLabels) return l && (this._edgeLabels[u] = a), this;
    if (s !== void 0 && !this._isMultigraph) throw new Error("Cannot set a named edge when isMultigraph = false");
    this.setNode(o), this.setNode(i), this._edgeLabels[u] = l ? a : this._defaultEdgeLabelFn(o, i, s);
    let d = Fn(this._isDirected, o, i, s);
    return o = d.v, i = d.w, Object.freeze(d), this._edgeObjs[u] = d, Re(this._preds[i], o), Re(this._sucs[o], i), this._in[i][u] = d, this._out[o][u] = d, this._edgeCount++, this;
  }
  edge(e, n, t) {
    let r = arguments.length === 1 ? oe(this._isDirected, e) : z(this._isDirected, e, n, t);
    return this._edgeLabels[r];
  }
  edgeAsObj(e, n, t) {
    let r = arguments.length === 1 ? this.edge(e) : this.edge(e, n, t);
    return typeof r != "object" || r === null ? { label: r } : r;
  }
  hasEdge(e, n, t) {
    return (arguments.length === 1 ? oe(this._isDirected, e) : z(this._isDirected, e, n, t)) in this._edgeLabels;
  }
  removeEdge(e, n, t) {
    let r = arguments.length === 1 ? oe(this._isDirected, e) : z(this._isDirected, e, n, t), o = this._edgeObjs[r];
    if (o) {
      let i = o.v, s = o.w;
      delete this._edgeLabels[r], delete this._edgeObjs[r], Ie(this._preds[s], i), Ie(this._sucs[i], s), delete this._in[s][r], delete this._out[i][r], this._edgeCount--;
    }
    return this;
  }
  inEdges(e, n) {
    return this.isDirected() ? this.filterEdges(this._in[e], e, n) : this.nodeEdges(e, n);
  }
  outEdges(e, n) {
    return this.isDirected() ? this.filterEdges(this._out[e], e, n) : this.nodeEdges(e, n);
  }
  nodeEdges(e, n) {
    if (e in this._nodes) return this.filterEdges({ ...this._in[e], ...this._out[e] }, e, n);
  }
  _removeFromParentsChildList(e) {
    delete this._children[this._parent[e]][e];
  }
  filterEdges(e, n, t) {
    if (!e) return;
    let r = Object.values(e);
    return t ? r.filter((o) => o.v === n && o.w === t || o.v === t && o.w === n) : r;
  }
};
function Re(e, n) {
  e[n] ? e[n]++ : e[n] = 1;
}
function Ie(e, n) {
  e[n] !== void 0 && !--e[n] && delete e[n];
}
function z(e, n, t, r) {
  let o = "" + n, i = "" + t;
  if (!e && o > i) {
    let s = o;
    o = i, i = s;
  }
  return o + "" + i + "" + (r === void 0 ? "\0" : r);
}
function Fn(e, n, t, r) {
  let o = "" + n, i = "" + t;
  if (!e && o > i) {
    let a = o;
    o = i, i = a;
  }
  let s = { v: o, w: i };
  return r && (s.name = r), s;
}
function oe(e, n) {
  return z(e, n.v, n.w, n.name);
}
var Dn = {};
Se(Dn, { read: () => Bn, write: () => An });
function An(e) {
  let n = { options: { directed: e.isDirected(), multigraph: e.isMultigraph(), compound: e.isCompound() }, nodes: Vn(e), edges: Yn(e) }, t = e.graph();
  return t !== void 0 && (n.value = structuredClone(t)), n;
}
function Vn(e) {
  return e.nodes().map((n) => {
    let t = e.node(n), r = e.parent(n), o = { v: n };
    return t !== void 0 && (o.value = t), r !== void 0 && (o.parent = r), o;
  });
}
function Yn(e) {
  return e.edges().map((n) => {
    let t = e.edge(n), r = { v: n.v, w: n.w };
    return n.name !== void 0 && (r.name = n.name), t !== void 0 && (r.value = t), r;
  });
}
function Bn(e) {
  let n = new Q(e.options);
  return e.value !== void 0 && n.setGraph(e.value), e.nodes.forEach((t) => {
    n.setNode(t.v, t.value), t.parent && n.setParent(t.v, t.parent);
  }), e.edges.forEach((t) => {
    n.setEdge({ v: t.v, w: t.w, name: t.name }, t.value);
  }), n;
}
var H = {};
Se(H, { CycleException: () => K, bellmanFord: () => Me, components: () => zn, dijkstra: () => J, dijkstraAll: () => $n, findCycles: () => Un, floydWarshall: () => Kn, isAcyclic: () => Zn, postorder: () => nt, preorder: () => tt, prim: () => rt, shortestPaths: () => ot, tarjan: () => Fe, topsort: () => De });
var Wn = () => 1;
function Me(e, n, t, r) {
  return Xn(e, String(n), t || Wn, r || function(o) {
    var i;
    return (i = e.outEdges(o)) != null ? i : [];
  });
}
function Xn(e, n, t, r) {
  let o = {}, i, s = 0, a = e.nodes(), l = function(c) {
    let f = o[c.v], h2 = o[c.w];
    if (!f || !h2) return;
    let g = t(c);
    f.distance + g < h2.distance && (o[c.w] = { distance: f.distance + g, predecessor: c.v }, i = true);
  }, u = function() {
    a.forEach(function(c) {
      r(c).forEach(function(f) {
        let h2 = f.v === c ? f.v : f.w, g = h2 === f.v ? f.w : f.v;
        l({ v: h2, w: g });
      });
    });
  };
  a.forEach(function(c) {
    let f = c === n ? 0 : Number.POSITIVE_INFINITY;
    o[c] = { distance: f, predecessor: "" };
  });
  let d = a.length;
  for (let c = 1; c < d && (i = false, s++, u(), !!i); c++) ;
  if (s === d - 1 && (i = false, u(), i)) throw new Error("The graph contains a negative weight cycle");
  return o;
}
function zn(e) {
  let n = {}, t = [], r;
  function o(i) {
    var s, a;
    i in n || (n[i] = true, r.push(i), (s = e.successors(i)) == null || s.forEach(o), (a = e.predecessors(i)) == null || a.forEach(o));
  }
  return e.nodes().forEach(function(i) {
    r = [], o(i), r.length && t.push(r);
  }), t;
}
var Pe = class {
  constructor() {
    this._arr = [], this._keyIndices = {};
  }
  size() {
    return this._arr.length;
  }
  keys() {
    return this._arr.map((e) => e.key);
  }
  has(e) {
    return e in this._keyIndices;
  }
  priority(e) {
    let n = this._keyIndices[e];
    if (n !== void 0) return this._arr[n].priority;
  }
  min() {
    if (this.size() === 0) throw new Error("Queue underflow");
    return this._arr[0].key;
  }
  add(e, n) {
    let t = this._keyIndices, r = String(e);
    if (!(r in t)) {
      let o = this._arr, i = o.length;
      return t[r] = i, o.push({ key: r, priority: n }), this._decrease(i), true;
    }
    return false;
  }
  removeMin() {
    if (this.size() === 0) throw new Error("Queue underflow");
    this._swap(0, this._arr.length - 1);
    let e = this._arr.pop();
    return delete this._keyIndices[e.key], this._heapify(0), e.key;
  }
  decrease(e, n) {
    let t = this._keyIndices[e];
    if (t === void 0) throw new Error(`Key not found: ${e}`);
    let r = this._arr[t].priority;
    if (n > r) throw new Error(`New priority is greater than current priority. Key: ${e} Old: ${r} New: ${n}`);
    this._arr[t].priority = n, this._decrease(t);
  }
  _heapify(e) {
    let n = this._arr, t = 2 * e, r = t + 1, o = e;
    t < n.length && (o = n[t].priority < n[o].priority ? t : o, r < n.length && (o = n[r].priority < n[o].priority ? r : o), o !== e && (this._swap(e, o), this._heapify(o)));
  }
  _decrease(e) {
    let n = this._arr, t = n[e].priority, r;
    for (; e !== 0 && (r = e >> 1, !(n[r].priority < t)); ) this._swap(e, r), e = r;
  }
  _swap(e, n) {
    let t = this._arr, r = this._keyIndices, o = t[e], i = t[n];
    t[e] = i, t[n] = o, r[i.key] = e, r[o.key] = n;
  }
};
var Hn = () => 1;
function J(e, n, t, r) {
  let o = function(i) {
    var s;
    return (s = e.outEdges(i)) != null ? s : [];
  };
  return qn(e, String(n), t || Hn, r || o);
}
function qn(e, n, t, r) {
  let o = {}, i = new Pe(), s, a, l = function(u) {
    let d = u.v !== s ? u.v : u.w, c = o[d];
    if (!c) return;
    let f = t(u), h2 = a.distance + f;
    if (f < 0) throw new Error("dijkstra does not allow negative edge weights. Bad edge: " + u + " Weight: " + f);
    h2 < c.distance && (c.distance = h2, c.predecessor = s, i.decrease(d, h2));
  };
  for (e.nodes().forEach(function(u) {
    let d = u === n ? 0 : Number.POSITIVE_INFINITY;
    o[u] = { distance: d, predecessor: "" }, i.add(u, d);
  }); i.size() > 0; ) {
    s = i.removeMin();
    let u = o[s];
    if (!u || u.distance === Number.POSITIVE_INFINITY) break;
    a = u, r(s).forEach(l);
  }
  return o;
}
function $n(e, n, t) {
  return e.nodes().reduce(function(r, o) {
    return r[o] = J(e, o, n, t), r;
  }, {});
}
function Fe(e) {
  let n = 0, t = [], r = {}, o = [];
  function i(s) {
    var a;
    let l = r[s] = { onStack: true, lowlink: n, index: n++ };
    if (t.push(s), (a = e.successors(s)) == null || a.forEach(function(u) {
      if (u in r) {
        let d = r[u];
        d != null && d.onStack && (l.lowlink = Math.min(l.lowlink, d.index));
      } else {
        i(u);
        let d = r[u];
        d && (l.lowlink = Math.min(l.lowlink, d.lowlink));
      }
    }), l.lowlink === l.index) {
      let u = [], d;
      do {
        d = t.pop();
        let c = r[d];
        c && (c.onStack = false), u.push(d);
      } while (s !== d);
      o.push(u);
    }
  }
  return e.nodes().forEach(function(s) {
    s in r || i(s);
  }), o;
}
function Un(e) {
  return Fe(e).filter(function(n) {
    var t;
    let r = n[0];
    return r ? n.length > 1 || n.length === 1 && ((t = e.outEdges(r, r)) != null ? t : []).length > 0 : false;
  });
}
var Jn = () => 1;
function Kn(e, n, t) {
  return Qn(e, n || Jn, t || function(r) {
    var o;
    return (o = e.outEdges(r)) != null ? o : [];
  });
}
function Qn(e, n, t) {
  let r = {}, o = e.nodes();
  return o.forEach(function(i) {
    let s = {};
    r[i] = s, s[i] = { distance: 0, predecessor: "" }, o.forEach(function(a) {
      i !== a && (s[a] = { distance: Number.POSITIVE_INFINITY, predecessor: "" });
    }), t(i).forEach(function(a) {
      let l = a.v === i ? a.w : a.v, u = n(a);
      s[l] = { distance: u, predecessor: i };
    });
  }), o.forEach(function(i) {
    let s = r[i];
    s && o.forEach(function(a) {
      let l = r[a];
      l && o.forEach(function(u) {
        let d = l[i], c = s[u], f = l[u];
        if (d && c && f) {
          let h2 = d.distance + c.distance;
          h2 < f.distance && (f.distance = h2, f.predecessor = c.predecessor);
        }
      });
    });
  }), r;
}
var K = class extends Error {
  constructor(e) {
    super(e), this.name = "CycleException";
  }
};
function De(e) {
  let n = {}, t = {}, r = [];
  function o(i) {
    var s;
    if (i in t) throw new K();
    i in n || (t[i] = true, n[i] = true, (s = e.predecessors(i)) == null || s.forEach(o), delete t[i], r.push(i));
  }
  if (e.sinks().forEach(o), Object.keys(n).length !== e.nodeCount()) throw new K();
  return r;
}
function Zn(e) {
  try {
    De(e);
  } catch (n) {
    if (n instanceof K) return false;
    throw n;
  }
  return true;
}
function et(e, n, t, r, o) {
  Array.isArray(n) || (n = [n]);
  let i = ((a) => {
    var l;
    return (l = e.isDirected() ? e.successors(a) : e.neighbors(a)) != null ? l : [];
  }), s = {};
  return n.forEach(function(a) {
    if (!e.hasNode(a)) throw new Error("Graph does not have node: " + a);
    o = Ae(e, a, t === "post", s, i, r, o);
  }), o;
}
function Ae(e, n, t, r, o, i, s) {
  return n in r || (r[n] = true, t || (s = i(s, n)), o(n).forEach(function(a) {
    s = Ae(e, a, t, r, o, i, s);
  }), t && (s = i(s, n))), s;
}
function Ve(e, n, t) {
  return et(e, n, t, function(r, o) {
    return r.push(o), r;
  }, []);
}
function nt(e, n) {
  return Ve(e, n, "post");
}
function tt(e, n) {
  return Ve(e, n, "pre");
}
function rt(e, n) {
  var t;
  let r = new Q(), o = {}, i = new Pe(), s;
  function a(d) {
    let c = d.v === s ? d.w : d.v, f = i.priority(c);
    if (f !== void 0) {
      let h2 = n(d);
      h2 < f && (o[c] = s, i.decrease(c, h2));
    }
  }
  if (e.nodeCount() === 0) return r;
  e.nodes().forEach(function(d) {
    i.add(d, Number.POSITIVE_INFINITY), r.setNode(d);
  });
  let l = e.nodes()[0];
  l !== void 0 && i.decrease(l, 0);
  let u = false;
  for (; i.size() > 0; ) {
    if (s = i.removeMin(), s in o) r.setEdge(s, o[s]);
    else {
      if (u) throw new Error("Input graph is not connected: " + e);
      u = true;
    }
    (t = e.nodeEdges(s)) == null || t.forEach(a);
  }
  return r;
}
function ot(e, n, t, r) {
  return it(e, n, t, r != null ? r : ((o) => {
    var i;
    return (i = e.outEdges(o)) != null ? i : [];
  }));
}
function it(e, n, t, r) {
  if (t === void 0) return J(e, n, t, r);
  let o = false, i = e.nodes();
  for (let s = 0; s < i.length; s++) {
    let a = i[s];
    if (a === void 0) continue;
    let l = r(a);
    for (let u = 0; u < l.length; u++) {
      let d = l[u];
      if (!d) continue;
      let c = d.v === a ? d.v : d.w, f = c === d.v ? d.w : d.v;
      t({ v: c, w: f }) < 0 && (o = true);
    }
    if (o) return Me(e, n, t, r);
  }
  return J(e, n, t, r);
}
var T = Q;
function M(e, n, t, r) {
  let o = r;
  for (; e.hasNode(o); ) o = $(r);
  return t.dummy = n, e.setNode(o, t), o;
}
function Ye(e) {
  let n = new T().setGraph(e.graph());
  return e.nodes().forEach((t) => n.setNode(t, e.node(t))), e.edges().forEach((t) => {
    let r = n.edge(t.v, t.w) || { weight: 0, minlen: 1 }, o = e.edge(t);
    n.setEdge(t.v, t.w, { weight: r.weight + o.weight, minlen: Math.max(r.minlen, o.minlen) });
  }), n;
}
function Z(e) {
  let n = new T({ multigraph: e.isMultigraph() }).setGraph(e.graph());
  return e.nodes().forEach((t) => {
    e.children(t).length || n.setNode(t, e.node(t));
  }), e.edges().forEach((t) => {
    n.setEdge(t, e.edge(t));
  }), n;
}
function se(e, n) {
  let t = e.x, r = e.y, o = n.x - t, i = n.y - r, s = e.width / 2, a = e.height / 2;
  if (!o && !i) throw new Error("Not possible to find intersection inside of the rectangle");
  let l, u;
  return o === 0 || Math.abs(i) * s > Math.abs(o) * a ? (i < 0 && (a = -a), l = a * o / i, u = a) : (o < 0 && (s = -s), l = s, u = s * i / o), { x: t + l, y: r + u };
}
function P(e) {
  let n = D(de(e) + 1).map(() => []);
  return e.nodes().forEach((t) => {
    let r = e.node(t), o = r.rank;
    o !== void 0 && (n[o] || (n[o] = []), n[o][r.order] = t);
  }), n;
}
function Be(e) {
  let n = e.nodes().map((r) => {
    let o = e.node(r).rank;
    return o === void 0 ? Number.MAX_VALUE : o;
  }), t = S(Math.min, n);
  e.nodes().forEach((r) => {
    let o = e.node(r);
    Object.hasOwn(o, "rank") && (o.rank -= t);
  });
}
function We(e) {
  let n = e.nodes().map((s) => e.node(s).rank).filter((s) => s !== void 0), t = S(Math.min, n), r = [];
  e.nodes().forEach((s) => {
    let a = e.node(s).rank - t;
    r[a] || (r[a] = []), r[a].push(s);
  });
  let o = 0, i = e.graph().nodeRankFactor;
  Array.from(r).forEach((s, a) => {
    s === void 0 && a % i !== 0 ? --o : s !== void 0 && o && s.forEach((l) => e.node(l).rank += o);
  });
}
function ae(e, n, t, r) {
  let o = { width: 0, height: 0 };
  return arguments.length >= 4 && (o.rank = t, o.order = r), M(e, "border", o, n);
}
function st(e, n = Xe) {
  let t = [];
  for (let r = 0; r < e.length; r += n) {
    let o = e.slice(r, r + n);
    t.push(o);
  }
  return t;
}
var Xe = 65535;
function S(e, n) {
  if (n.length > Xe) {
    let t = st(n);
    return e(...t.map((r) => e(...r)));
  } else return e(...n);
}
function de(e) {
  let t = e.nodes().map((r) => {
    let o = e.node(r).rank;
    return o === void 0 ? Number.MIN_VALUE : o;
  });
  return S(Math.max, t);
}
function ze(e, n) {
  let t = { lhs: [], rhs: [] };
  return e.forEach((r) => {
    n(r) ? t.lhs.push(r) : t.rhs.push(r);
  }), t;
}
function le(e, n) {
  let t = Date.now();
  try {
    return n();
  } finally {
    console.log(e + " time: " + (Date.now() - t) + "ms");
  }
}
function q(e, n) {
  return n();
}
var at = 0;
function $(e) {
  let n = ++at;
  return e + ("" + n);
}
function D(e, n, t = 1) {
  n == null && (n = e, e = 0);
  let r = (i) => i < n;
  t < 0 && (r = (i) => n < i);
  let o = [];
  for (let i = e; r(i); i += t) o.push(i);
  return o;
}
function W(e, n) {
  let t = {};
  for (let r of n) e[r] !== void 0 && (t[r] = e[r]);
  return t;
}
function X(e, n) {
  let t;
  return typeof n == "string" ? t = (r) => r[n] : t = n, Object.entries(e).reduce((r, [o, i]) => (r[o] = t(i, o), r), {});
}
function He(e, n) {
  return e.reduce((t, r, o) => (t[r] = n[o], t), {});
}
var V = "\0";
function ee(e, n, t) {
  var u, d, c, f, h2, g;
  if (!(e && n && t && n.dummy === "edge" && t.dummy === "edge" && n.edgeObj && t.edgeObj && e[n.edgeObj.v] && e[t.edgeObj.v] && e[n.edgeObj.w] && e[t.edgeObj.w])) return 0;
  let r = true;
  n.edgeObj.w === t.edgeObj.w && (r = false);
  let o = r ? (d = (u = e[n.edgeObj.v]) == null ? void 0 : u.rank) != null ? d : NaN + 1 : (f = (c = e[n.edgeObj.w]) == null ? void 0 : c.rank) != null ? f : NaN - 1, i = Object.entries(e).find((m) => {
    var L, y;
    return ((L = m[1].edgeObj) == null ? void 0 : L.v) === n.edgeObj.v && ((y = m[1].edgeObj) == null ? void 0 : y.w) === n.edgeObj.w && m[1].rank === o;
  }), s = Object.entries(e).find((m) => {
    var L, y;
    return ((L = m[1].edgeObj) == null ? void 0 : L.v) === t.edgeObj.v && ((y = m[1].edgeObj) == null ? void 0 : y.w) === t.edgeObj.w && m[1].rank === o;
  });
  if (!i || !s) return 0;
  let a = (h2 = i[1].order) != null ? h2 : NaN, l = (g = s[1].order) != null ? g : NaN;
  return isNaN(a - l) ? 0 : a - l;
}
var ue = "3.1.3";
var ce = class {
  constructor() {
    je(this, "_sentinel");
    let n = {};
    n._next = n._prev = n, this._sentinel = n;
  }
  dequeue() {
    let n = this._sentinel, t = n._prev;
    if (t !== n) return qe(t), t;
  }
  enqueue(n) {
    let t = this._sentinel;
    n._prev && n._next && qe(n), n._next = t._next, t._next._prev = n, t._next = n, n._prev = t;
  }
  toString() {
    let n = [], t = this._sentinel, r = t._prev;
    for (; r !== t; ) n.push(JSON.stringify(r, dt)), r = r._prev;
    return "[" + n.join(", ") + "]";
  }
};
function qe(e) {
  e._prev._next = e._next, e._next._prev = e._prev, delete e._next, delete e._prev;
}
function dt(e, n) {
  if (e !== "_next" && e !== "_prev") return n;
}
var $e = ce;
var lt = () => 1;
function be(e, n) {
  if (e.nodeCount() <= 1) return [];
  let t = ct(e, n || lt);
  return ut(t.graph, t.buckets, t.zeroIdx).flatMap((o) => e.outEdges(o.v, o.w) || []);
}
function ut(e, n, t) {
  var a;
  let r = [], o = n[n.length - 1], i = n[0], s;
  for (; e.nodeCount(); ) {
    for (; s = i.dequeue(); ) fe(e, n, t, s);
    for (; s = o.dequeue(); ) fe(e, n, t, s);
    if (e.nodeCount()) {
      for (let l = n.length - 2; l > 0; --l) if (s = (a = n[l]) == null ? void 0 : a.dequeue(), s) {
        r = r.concat(fe(e, n, t, s, true) || []);
        break;
      }
    }
  }
  return r;
}
function fe(e, n, t, r, o) {
  let i = [], s = o ? i : void 0;
  return (e.inEdges(r.v) || []).forEach((a) => {
    let l = e.edge(a), u = e.node(a.v);
    o && i.push({ v: a.v, w: a.w }), u.out -= l, he(n, t, u);
  }), (e.outEdges(r.v) || []).forEach((a) => {
    let l = e.edge(a), u = a.w, d = e.node(u);
    d.in -= l, he(n, t, d);
  }), e.removeNode(r.v), s;
}
function ct(e, n) {
  let t = new T(), r = 0, o = 0;
  e.nodes().forEach((a) => {
    t.setNode(a, { v: a, in: 0, out: 0 });
  }), e.edges().forEach((a) => {
    let l = t.edge(a.v, a.w) || 0, u = n(a), d = l + u;
    t.setEdge(a.v, a.w, d);
    let c = t.node(a.v), f = t.node(a.w);
    o = Math.max(o, c.out += u), r = Math.max(r, f.in += u);
  });
  let i = ft(o + r + 3).map(() => new $e()), s = r + 1;
  return t.nodes().forEach((a) => {
    he(i, s, t.node(a));
  }), { graph: t, buckets: i, zeroIdx: s };
}
function he(e, n, t) {
  var r, o, i;
  t.out ? t.in ? (i = e[t.out - t.in + n]) == null || i.enqueue(t) : (o = e[e.length - 1]) == null || o.enqueue(t) : (r = e[0]) == null || r.enqueue(t);
}
function ft(e) {
  let n = [];
  for (let t = 0; t < e; t++) n.push(t);
  return n;
}
function Ue(e, n) {
  (e.graph().acyclicer === "greedy" ? be(e, r(e)) : ht(e, n != null ? n : null)).forEach((o) => {
    let i = e.edge(o);
    e.removeEdge(o), i.forwardName = o.name, i.reversed = true, e.setEdge(o.w, o.v, i, $("rev"));
  });
  function r(o) {
    return (i) => o.edge(i).weight;
  }
}
function ht(e, n) {
  let t = [], r = {}, o = {};
  function i(l) {
    Object.hasOwn(o, l) || (o[l] = true, r[l] = true, e.outEdges(l).forEach((u) => {
      Object.hasOwn(r, u.w) ? t.push(u) : i(u.w);
    }), delete r[l]);
  }
  function s(l) {
    var u;
    Object.hasOwn(o, l) || (o[l] = true, r[l] = true, (u = e.outEdges(l)) == null || u.forEach((d) => {
      var c, f;
      Object.hasOwn(r, d.w) || ((c = n.node(l)) == null ? void 0 : c.rank) > ((f = n.node(d.w)) == null ? void 0 : f.rank) && bt(e, d.w, d) ? t.push(d) : s(d.w);
    }), delete r[l]);
  }
  let a = i;
  return n && typeof n.node == "function" && (a = s), e.sources().forEach(a), e.nodes().forEach(a), t;
}
function Je(e) {
  e.edges().forEach((n) => {
    let t = e.edge(n);
    if (t.reversed) {
      e.removeEdge(n);
      let r = t.forwardName;
      delete t.reversed, delete t.forwardName, e.setEdge(n.w, n.v, t, r);
    }
  });
}
function bt(e, n, t) {
  let r = /* @__PURE__ */ new Set();
  function o(i) {
    var s;
    if (e.sources().includes(i)) return true;
    r.add(i);
    for (let a of (s = e.inEdges(i)) != null ? s : []) if (!(a.v === t.v && a.w === t.w) && !r.has(a.v) && o(a.v)) return true;
    return false;
  }
  return o(n);
}
function Ke(e) {
  e.graph().dummyChains = [], e.edges().forEach((n) => pt(e, n));
}
function pt(e, n) {
  let t = n.v, r = e.node(t).rank, o = n.w, i = e.node(o).rank, s = n.name, a = e.edge(n), l = a.labelRank;
  if (i === r + 1) return;
  e.removeEdge(n);
  let u, d, c;
  for (c = 0, ++r; r < i; ++c, ++r) a.points = [], d = { width: 0, height: 0, edgeLabel: a, edgeObj: n, rank: r }, u = M(e, "edge", d, "_d"), r === l && (d.width = a.width, d.height = a.height, d.dummy = "edge-label", d.labelpos = a.labelpos), e.setEdge(t, u, { weight: a.weight }, s), c === 0 && e.graph().dummyChains.push(u), t = u;
  e.setEdge(t, o, { weight: a.weight }, s);
}
function Qe(e) {
  e.graph().dummyChains.forEach((n) => {
    let t = e.node(n), r = t.edgeLabel, o;
    for (e.setEdge(t.edgeObj, r); t.dummy; ) o = e.successors(n)[0], e.removeNode(n), r.points.push({ x: t.x, y: t.y }), t.dummy === "edge-label" && (r.x = t.x, r.y = t.y, r.width = t.width, r.height = t.height), n = o, t = e.node(n);
  });
}
function U(e) {
  let n = {};
  function t(r) {
    let o = e.node(r);
    if (Object.hasOwn(n, r)) return o.rank;
    n[r] = true;
    let i = e.outEdges(r), s = i ? i.map((l) => l == null ? Number.POSITIVE_INFINITY : t(l.w) - e.edge(l).minlen) : [], a = S(Math.min, s);
    return a === Number.POSITIVE_INFINITY && (a = 0), o.rank = a;
  }
  e.sources().forEach(t);
}
function A(e, n) {
  return e.node(n.w).rank - e.node(n.v).rank - e.edge(n).minlen;
}
var ne = Et;
function Et(e) {
  let n = new T({ directed: false }), t = e.nodes();
  if (t.length === 0) throw new Error("Graph must have at least one node");
  let r = t[0], o = e.nodeCount();
  n.setNode(r, {});
  let i, s;
  for (; Lt(n, e) < o && (i = yt(n, e), !!i); ) s = n.hasNode(i.v) ? A(e, i) : -A(e, i), wt(n, e, s);
  return n;
}
function Lt(e, n) {
  function t(r) {
    let o = n.nodeEdges(r);
    o && o.forEach((i) => {
      let s = i.v, a = r === s ? i.w : s;
      !e.hasNode(a) && !A(n, i) && (e.setNode(a, {}), e.setEdge(r, a, {}), t(a));
    });
  }
  return e.nodes().forEach(t), e.nodeCount();
}
function yt(e, n) {
  return n.edges().reduce((r, o) => {
    let i = Number.POSITIVE_INFINITY;
    return e.hasNode(o.v) !== e.hasNode(o.w) && (i = A(n, o)), i < r[0] ? [i, o] : r;
  }, [Number.POSITIVE_INFINITY, null])[1];
}
function wt(e, n, t) {
  e.nodes().forEach((r) => n.node(r).rank += t);
}
var { preorder: Nt, postorder: Gt } = H;
var en = Y;
Y.initLowLimValues = pe;
Y.initCutValues = ge;
Y.calcCutValue = nn;
Y.leaveEdge = rn;
Y.enterEdge = on;
Y.exchangeEdges = sn;
function Y(e) {
  e = Ye(e), U(e);
  let n = ne(e);
  pe(n), ge(n, e);
  let t, r;
  for (; t = rn(n); ) r = on(n, e, t), sn(n, e, t, r);
}
function ge(e, n) {
  let t = Gt(e, e.nodes());
  t = t.slice(0, t.length - 1), t.forEach((r) => vt(e, n, r));
}
function vt(e, n, t) {
  let o = e.node(t).parent, i = e.edge(t, o);
  i.cutvalue = nn(e, n, t);
}
function nn(e, n, t) {
  let o = e.node(t).parent, i = true, s = n.edge(t, o), a = 0;
  s || (i = false, s = n.edge(o, t)), a = s.weight;
  let l = n.nodeEdges(t);
  return l && l.forEach((u) => {
    let d = u.v === t, c = d ? u.w : u.v;
    if (c !== o) {
      let f = d === i, h2 = n.edge(u).weight;
      if (a += f ? h2 : -h2, xt(e, t, c)) {
        let m = e.edge(t, c).cutvalue;
        a += f ? -m : m;
      }
    }
  }), a;
}
function pe(e, n) {
  arguments.length < 2 && (n = e.nodes()[0]), tn(e, {}, 1, n);
}
function tn(e, n, t, r, o) {
  let i = t, s = e.node(r);
  n[r] = true;
  let a = e.neighbors(r);
  return a && a.forEach((l) => {
    Object.hasOwn(n, l) || (t = tn(e, n, t, l, r));
  }), s.low = i, s.lim = t++, o ? s.parent = o : delete s.parent, t;
}
function rn(e) {
  return e.edges().find((n) => e.edge(n).cutvalue < 0);
}
function on(e, n, t) {
  let r = t.v, o = t.w;
  n.hasEdge(r, o) || (r = t.w, o = t.v);
  let i = e.node(r), s = e.node(o), a = i, l = false;
  return i.lim > s.lim && (a = s, l = true), n.edges().filter((d) => l === Ze(e, e.node(d.v), a) && l !== Ze(e, e.node(d.w), a)).reduce((d, c) => A(n, c) < A(n, d) ? c : d);
}
function sn(e, n, t, r) {
  let o = t.v, i = t.w;
  e.removeEdge(o, i), e.setEdge(r.v, r.w, {}), pe(e), ge(e, n), kt(e, n);
}
function kt(e, n) {
  let t = e.nodes().find((o) => !e.node(o).parent);
  if (!t) return;
  let r = Nt(e, [t]);
  r = r.slice(1), r.forEach((o) => {
    let s = e.node(o).parent, a = n.edge(o, s), l = false;
    a || (a = n.edge(s, o), l = true), n.node(o).rank = n.node(s).rank + (l ? a.minlen : -a.minlen);
  });
}
function xt(e, n, t) {
  return e.hasEdge(n, t);
}
function Ze(e, n, t) {
  return t.low <= n.lim && n.lim <= t.lim;
}
var dn = _t;
function _t(e) {
  let n = e.graph().ranker;
  if (typeof n == "function") return n(e);
  switch (n) {
    case "network-simplex":
      an(e);
      break;
    case "tight-tree":
      Ct(e);
      break;
    case "longest-path":
      Ot(e);
      break;
    case "none":
      break;
    default:
      an(e);
  }
}
var Ot = U;
function Ct(e) {
  U(e), ne(e);
}
function an(e) {
  en(e);
}
var ln = Tt;
function Tt(e) {
  let n = Rt(e), t = e.graph();
  if (!Array.isArray(t.dummyChains)) return;
  t.dummyChains.forEach((o) => {
    let i = e.node(o), s = i.edgeObj, a = jt(e, n, s.v, s.w), l = a.path, u = a.lca, d = 0, c = l[d], f = true;
    for (; o !== s.w; ) {
      if (i = e.node(o), f) {
        for (; (c = l[d]) !== u && e.node(c).maxRank < i.rank; ) d++;
        c === u && (f = false);
      }
      if (!f) {
        for (; d < l.length - 1 && e.node(l[d + 1]).minRank <= i.rank; ) d++;
        c = l[d];
      }
      c !== void 0 && e.setParent(o, c), o = e.successors(o)[0];
    }
  });
}
function jt(e, n, t, r) {
  let o = [], i = [], s = Math.min(n[t].low, n[r].low), a = Math.max(n[t].lim, n[r].lim), l;
  l = t;
  do
    l = e.parent(l), o.push(l);
  while (l && (n[l].low > s || a > n[l].lim));
  let u = l, d = r;
  for (; (d = e.parent(d)) !== u; ) i.push(d);
  return { path: o.concat(i.reverse()), lca: u };
}
function Rt(e) {
  let n = {}, t = 0;
  function r(o) {
    let i = t;
    e.children(o).forEach(r), n[o] = { low: i, lim: t++ };
  }
  return e.children(V).forEach(r), n;
}
function un(e) {
  let n = M(e, "root", {}, "_root"), t = It(e), r = Object.values(t), o = S(Math.max, r) - 1, i = 2 * o + 1;
  e.graph().nestingRoot = n, e.edges().forEach((a) => e.edge(a).minlen *= i);
  let s = St(e) + 1;
  e.children(V).forEach((a) => {
    cn(e, n, i, s, o, t, a);
  }), e.graph().nodeRankFactor = i;
}
function cn(e, n, t, r, o, i, s) {
  var c;
  let a = e.children(s);
  if (!a.length) {
    s !== n && e.setEdge(n, s, { weight: 0, minlen: t });
    return;
  }
  let l = ae(e, "_bt"), u = ae(e, "_bb"), d = e.node(s);
  e.setParent(l, s), d.borderTop = l, e.setParent(u, s), d.borderBottom = u, a.forEach((f) => {
    var b;
    cn(e, n, t, r, o, i, f);
    let h2 = e.node(f), g = h2.borderTop ? h2.borderTop : f, m = h2.borderBottom ? h2.borderBottom : f, L = h2.borderTop ? r : 2 * r, y = g !== m ? 1 : o - ((b = i[s]) != null ? b : 0) + 1;
    e.setEdge(l, g, { weight: L, minlen: y, nestingEdge: true }), e.setEdge(m, u, { weight: L, minlen: y, nestingEdge: true });
  }), e.parent(s) || e.setEdge(n, l, { weight: 0, minlen: o + ((c = i[s]) != null ? c : 0) });
}
function It(e) {
  let n = {};
  function t(r, o) {
    let i = e.children(r);
    i && i.length && i.forEach((s) => t(s, o + 1)), n[r] = o;
  }
  return e.children(V).forEach((r) => t(r, 1)), n;
}
function St(e) {
  return e.edges().reduce((n, t) => n + e.edge(t).weight, 0);
}
function fn(e) {
  let n = e.graph();
  e.removeNode(n.nestingRoot), delete n.nestingRoot, e.edges().forEach((t) => {
    e.edge(t).nestingEdge && e.removeEdge(t);
  });
}
var bn = Pt;
function Pt(e) {
  function n(t) {
    let r = e.children(t), o = e.node(t);
    if (r.length && r.forEach(n), o && Object.hasOwn(o, "minRank")) {
      o.borderLeft = [], o.borderRight = [];
      for (let i = o.minRank, s = o.maxRank + 1; i < s; ++i) hn(e, "borderLeft", "_bl", t, o, i), hn(e, "borderRight", "_br", t, o, i);
    }
  }
  e.children(V).forEach(n);
}
function hn(e, n, t, r, o, i) {
  let s = { width: 0, height: 0, rank: i, borderType: n }, a = o[n][i - 1], l = M(e, "border", s, t);
  o[n][i] = l, e.setParent(l, r), a && e.setEdge(a, l, { weight: 1 });
}
function pn(e) {
  var t;
  let n = (t = e.graph().rankdir) == null ? void 0 : t.toLowerCase();
  (n === "lr" || n === "rl") && En(e);
}
function mn(e) {
  var t;
  let n = (t = e.graph().rankdir) == null ? void 0 : t.toLowerCase();
  (n === "bt" || n === "rl") && Ft(e), (n === "lr" || n === "rl") && (Dt(e), En(e));
}
function En(e) {
  e.nodes().forEach((n) => gn(e.node(n))), e.edges().forEach((n) => gn(e.edge(n)));
}
function gn(e) {
  let n = e.width;
  e.width = e.height, e.height = n;
}
function Ft(e) {
  e.nodes().forEach((n) => me(e.node(n))), e.edges().forEach((n) => {
    var r;
    let t = e.edge(n);
    (r = t.points) == null || r.forEach(me), Object.hasOwn(t, "y") && me(t);
  });
}
function me(e) {
  e.y = -e.y;
}
function Dt(e) {
  e.nodes().forEach((n) => Ee(e.node(n))), e.edges().forEach((n) => {
    var r;
    let t = e.edge(n);
    (r = t.points) == null || r.forEach(Ee), Object.hasOwn(t, "x") && Ee(t);
  });
}
function Ee(e) {
  let n = e.x;
  e.x = e.y, e.y = n;
}
function Le(e, n = null) {
  let t = {}, r = e.nodes().filter((d) => !e.children(d).length), o = r.map((d) => e.node(d).rank), i = S(Math.max, o), s = D(i + 1).map(() => []);
  function a(d) {
    if (t[d]) return;
    t[d] = true;
    let c = e.node(d);
    s[c.rank].push(d);
    let f = e.successors(d);
    f && [...f].sort((g, m) => u(g, m)).forEach(a);
  }
  r.sort((d, c) => e.node(d).rank - e.node(c).rank).forEach(a);
  function u(d, c) {
    let f = e.node(d), h2 = e.node(c);
    return ee(n, f, h2);
  }
  return s;
}
function ye(e, n) {
  let t = 0;
  for (let r = 1; r < n.length; ++r) t += Vt(e, n[r - 1], n[r]);
  return t;
}
function Vt(e, n, t) {
  let r = He(t, t.map((u, d) => d)), o = n.flatMap((u) => {
    let d = e.outEdges(u);
    return d ? d.map((c) => ({ pos: r[c.w], weight: e.edge(c).weight })).sort((c, f) => c.pos - f.pos) : [];
  }), i = 1;
  for (; i < t.length; ) i <<= 1;
  let s = 2 * i - 1;
  i -= 1;
  let a = new Array(s).fill(0), l = 0;
  return o.forEach((u) => {
    let d = u.pos + i;
    a[d] += u.weight;
    let c = 0;
    for (; d > 0; ) d % 2 && (c += a[d + 1]), d = d - 1 >> 1, a[d] += u.weight;
    l += u.weight * c;
  }), l;
}
function we(e, n = []) {
  return n.map((t) => {
    let r = e.inEdges(t);
    if (!r || !r.length) return { v: t };
    {
      let o = r.reduce((i, s) => {
        let a = e.edge(s), l = e.node(s.v);
        return { sum: i.sum + a.weight * l.order, weight: i.weight + a.weight };
      }, { sum: 0, weight: 0 });
      return { v: t, barycenter: o.sum / o.weight, weight: o.weight };
    }
  });
}
function Ne(e, n) {
  let t = {};
  e.forEach((o, i) => {
    let s = { indegree: 0, in: [], out: [], vs: [o.v], i };
    o.barycenter !== void 0 && (s.barycenter = o.barycenter, s.weight = o.weight), t[o.v] = s;
  }), n.edges().forEach((o) => {
    let i = t[o.v], s = t[o.w];
    i !== void 0 && s !== void 0 && (s.indegree++, i.out.push(s));
  });
  let r = Object.values(t).filter((o) => !o.indegree);
  return Yt(r);
}
function Yt(e) {
  let n = [];
  function t(o) {
    return (i) => {
      i.merged || (i.barycenter === void 0 || o.barycenter === void 0 || i.barycenter >= o.barycenter) && Bt(o, i);
    };
  }
  function r(o) {
    return (i) => {
      i.in.push(o), --i.indegree === 0 && e.push(i);
    };
  }
  for (; e.length; ) {
    let o = e.pop();
    n.push(o), o.in.reverse().forEach(t(o)), o.out.forEach(r(o));
  }
  return n.filter((o) => !o.merged).map((o) => W(o, ["vs", "i", "barycenter", "weight"]));
}
function Bt(e, n) {
  let t = 0, r = 0;
  e.weight && (t += e.barycenter * e.weight, r += e.weight), n.weight && (t += n.barycenter * n.weight, r += n.weight), e.vs = n.vs.concat(e.vs), e.barycenter = t / r, e.weight = r, e.i = Math.min(n.i, e.i), n.merged = true;
}
function Ge(e, n, t, r, o) {
  let i = {}, s = null, a = null, l = o;
  typeof n == "boolean" ? (l = n, i = {}) : n && (i = n, s = t != null ? t : null, a = r != null ? r : null);
  let u = ze(e, (y) => Object.hasOwn(y, "barycenter")), d = u.lhs, c = u.rhs.sort((y, b) => b.i - y.i), f = [], h2 = 0, g = 0, m = 0;
  d.sort(Wt(a, s, !!l));
  for (let [y, b] of Object.entries(i)) {
    let p = d.findIndex((E) => E.vs[0] === y);
    d.splice(p + 1, 0, b);
  }
  m = Ln(f, c, m), d.forEach((y) => {
    m += y.vs.length, f.push(y.vs), h2 += y.barycenter * y.weight, g += y.weight, m = Ln(f, c, m);
  });
  let L = { vs: f.flat(1) };
  return g && (L.barycenter = h2 / g, L.weight = g), L;
}
function Ln(e, n, t) {
  let r;
  for (; n.length && (r = n[n.length - 1]).i <= t; ) n.pop(), e.push(r.vs), t++;
  return t;
}
function Wt(e, n, t) {
  return (r, o) => {
    if (r.barycenter < o.barycenter) return -1;
    if (r.barycenter > o.barycenter) return 1;
    if (e && (typeof r.vs[0] == "string" || typeof o.vs[0] == "string")) {
      let i = e.node(r.vs[0]), s = e.node(o.vs[0]), a = ee(n, i, s);
      if (a !== 0) return a;
    }
    return t ? o.i - r.i : r.i - o.i;
  };
}
function te(e, n, t, r, o) {
  var y, b, p, E, w, k, _, O, j, R, I;
  let i = null, s = o;
  typeof r == "boolean" ? (s = r, i = null) : r !== void 0 && (i = r);
  let a = e.children(n), l = e.node(n), u = l ? l.borderLeft : void 0, d = l ? l.borderRight : void 0, c = {};
  u && (a = a.filter((v) => v !== u && v !== d));
  let f = we(e, a);
  f.forEach((v) => {
    if (e.children(v.v).length) {
      let { result: x } = te(e, v.v, t, i, s);
      c[v.v] = x, Object.hasOwn(x, "barycenter") && zt(v, x);
    }
  });
  let h2 = Ne(f, t);
  Xt(h2, c);
  let g = {}, m = false;
  for (let v = 0; v < h2.length; v++) for (let x = v + 1; x < h2.length; x++) if (!(!h2[v] || !h2[x] || !((y = h2[v]) != null && y.barycenter) || !((b = h2[x]) != null && b.barycenter)) && ((p = h2[v]) == null ? void 0 : p.barycenter) === h2[x].barycenter) {
    let G = (w = (E = h2[v]) == null ? void 0 : E.vs[0]) != null ? w : "", N = (_ = (k = h2[x]) == null ? void 0 : k.vs[0]) != null ? _ : "", C = e.node(G), B = e.node(N);
    if (C.dummy === "edge" && B.dummy === "edge" && ((O = C.edgeObj) == null ? void 0 : O.v) === ((j = B.edgeObj) == null ? void 0 : j.v) && ((R = C.edgeObj) == null ? void 0 : R.w) === ((I = B.edgeObj) == null ? void 0 : I.w)) if (C.edgeLabel.reversed) {
      g[N] = h2[v], h2.splice(v, 1), v--;
      break;
    } else g[G] || (g[G] = h2[x], h2.splice(x, 1), x--);
    else m = true;
  }
  let L = Ge(h2, g, i, e, s);
  if (u && d) {
    L.vs = [u, L.vs, d].flat(1);
    let v = e.predecessors(u);
    if (v && v.length) {
      let x = e.node(v[0]), G = e.predecessors(d), N = e.node(G[0]);
      Object.hasOwn(L, "barycenter") || (L.barycenter = 0, L.weight = 0), L.barycenter = (L.barycenter * L.weight + x.order + N.order) / (L.weight + 2), L.weight += 2;
    }
  }
  return Object.defineProperty(L, "result", { value: L, enumerable: false, configurable: true, writable: true }), Object.defineProperty(L, "usedBias", { value: m, enumerable: false, configurable: true, writable: true }), L;
}
function Xt(e, n) {
  e.forEach((t) => {
    t.vs = t.vs.flatMap((r) => n[r] ? n[r].vs : r);
  });
}
function zt(e, n) {
  e.barycenter !== void 0 ? (e.barycenter = (e.barycenter * e.weight + n.barycenter * n.weight) / (e.weight + n.weight), e.weight += n.weight) : (e.barycenter = n.barycenter, e.weight = n.weight);
}
function ve(e, n, t, r) {
  r || (r = e.nodes());
  let o = Ht(e), i = new T({ compound: true }).setGraph({ root: o }).setDefaultNodeLabel((s) => e.node(s));
  return r.forEach((s) => {
    let a = e.node(s), l = e.parent(s);
    if (a.rank === n || a.minRank <= n && n <= a.maxRank) {
      i.setNode(s), i.setParent(s, l || o);
      let u = e[t](s);
      u && u.forEach((d) => {
        let c = d.v === s ? d.w : d.v, f = i.edge(c, s), h2 = f !== void 0 ? f.weight : 0;
        i.setEdge(c, s, { weight: e.edge(d).weight + h2 });
      }), Object.hasOwn(a, "minRank") && i.setNode(s, { borderLeft: a.borderLeft[n], borderRight: a.borderRight[n] });
    }
  }), i;
}
function Ht(e) {
  let n;
  for (; e.hasNode(n = $("_root")); ) ;
  return n;
}
function ke(e, n, t) {
  let r = {}, o;
  t.forEach((i) => {
    let s = e.parent(i), a, l;
    for (; s; ) {
      if (a = e.parent(s), a ? (l = r[a], r[a] = s) : (l = o, o = s), l && l !== s) {
        n.setEdge(l, s);
        return;
      }
      s = a;
    }
  });
}
function re(e, n = {}, t = null) {
  if (typeof n.customOrder == "function") {
    n.customOrder(e, re);
    return;
  }
  let r = de(e), o = yn(e, D(1, r + 1), "inEdges"), i = yn(e, D(r - 1, -1, -1), "outEdges"), s = Le(e, t);
  if (wn(e, s), n.disableOptimalOrderHeuristic) return;
  let a = Number.POSITIVE_INFINITY, l, u = n.constraints || [];
  for (let d = 0, c = 0; c < 4; ++d, ++c) {
    qt(d % 2 ? o : i, d % 4 >= 2, u, t), s = P(e);
    let f = ye(e, s);
    f < a ? (c = 0, l = Object.assign({}, s), a = f) : f === a && (l = structuredClone(s));
  }
  wn(e, l);
}
function yn(e, n, t) {
  let r = /* @__PURE__ */ new Map(), o = (i, s) => {
    r.has(i) || r.set(i, []), r.get(i).push(s);
  };
  for (let i of e.nodes()) {
    let s = e.node(i);
    if (typeof s.rank == "number" && o(s.rank, i), typeof s.minRank == "number" && typeof s.maxRank == "number") for (let a = s.minRank; a <= s.maxRank; a++) a !== s.rank && o(a, i);
  }
  return n.map(function(i) {
    return ve(e, i, t, r.get(i) || []);
  });
}
function qt(e, n, t, r) {
  let o = true, i = new T();
  e.forEach(function(s) {
    t.forEach((d) => i.setEdge(d.left, d.right));
    let a = s.graph().root, { result: l, usedBias: u } = te(s, a, i, r, o);
    n && u && (o = !o), l.vs.forEach((d, c) => s.node(d).order = c), ke(s, i, l.vs);
  });
}
function wn(e, n) {
  Object.values(n).forEach((t) => t.forEach((r, o) => e.node(r).order = o));
}
function $t(e, n) {
  let t = {};
  function r(o, i) {
    let s = 0, a = 0, l = o.length, u = i[i.length - 1];
    return i.forEach((d, c) => {
      let f = Jt(e, d), h2 = f ? e.node(f).order : l;
      (f || d === u) && (i.slice(a, c + 1).forEach((g) => {
        let m = e.predecessors(g);
        m && m.forEach((L) => {
          let y = e.node(L), b = y.order;
          (b < s || h2 < b) && !(y.dummy && e.node(g).dummy) && Gn(t, L, g);
        });
      }), a = c + 1, s = h2);
    }), i;
  }
  return n.length && n.reduce(r), t;
}
function Ut(e, n) {
  let t = {};
  function r(a) {
    var l;
    return ((l = e.node(a)) == null ? void 0 : l.dummy) === "border";
  }
  if (!e.nodes().some(r)) return t;
  function i(a, l, u, d, c) {
    D(l, u).forEach((f) => {
      let h2 = a[f];
      if (h2 !== void 0 && e.node(h2).dummy) {
        let g = e.predecessors(h2);
        g && g.forEach((m) => {
          if (m === void 0) return;
          let L = e.node(m);
          L.dummy && (L.order < d || L.order > c) && Gn(t, m, h2);
        });
      }
    });
  }
  function s(a, l) {
    let u = -1, d = -1, c = 0;
    return l.forEach((f, h2) => {
      if (r(f)) {
        let g = e.predecessors(f);
        if (g && g.length) {
          let m = g[0];
          if (m === void 0) return;
          d = e.node(m).order, i(l, c, h2, u, d), c = h2, u = d;
        }
      }
      i(l, c, l.length, d, a.length);
    }), l;
  }
  return n.length && n.reduce(s), t;
}
function Jt(e, n) {
  if (e.node(n).dummy) {
    let t = e.predecessors(n);
    if (t) return t.find((r) => e.node(r).dummy);
  }
}
function Gn(e, n, t) {
  if (n > t) {
    let o = n;
    n = t, t = o;
  }
  let r = e[n];
  r || (e[n] = r = {}), r[t] = true;
}
function Kt(e, n, t) {
  if (n > t) {
    let o = n;
    n = t, t = o;
  }
  let r = e[n];
  return r !== void 0 && Object.hasOwn(r, t);
}
function Qt(e, n, t, r, o) {
  let i = {}, s = {}, a = {};
  return n.forEach((l) => {
    l.forEach((u, d) => {
      i[u] = u, s[u] = u, a[u] = d;
    });
  }), n.forEach((l) => {
    let u = -1, d = -1, c = false, f = l, h2 = l.findIndex((g) => (o == null ? void 0 : o.includes(g)) || Nn(g, e, o));
    h2 > 0 && (f = [l[h2], ...l.slice(0, h2), ...l.slice(h2 + 1)], c = true), f.forEach((g) => {
      var L;
      let m = r(g);
      if (m && m.length) {
        o != null && o.includes(g) && (m = m.filter((p) => Nn(p, e, o)));
        let y = m.sort((p, E) => {
          let w = a[p], k = a[E];
          return (w !== void 0 ? w : 0) - (k !== void 0 ? k : 0);
        }), b = (y.length - 1) / 2;
        for (let p = Math.floor(b), E = Math.ceil(b); p <= E; ++p) {
          let w = y[p];
          if (w === void 0) continue;
          let k = a[w];
          if (k !== void 0 && s[g] === g && u < k && a[w] !== d && !Kt(t, g, w)) {
            let _ = i[w];
            _ !== void 0 && (s[w] = g, s[g] = i[g] = _, u = k, c && (u = -1, d = (L = a[w]) != null ? L : -1, c = false));
          }
        }
      }
    });
  }), { root: i, align: s };
}
function Zt(e, n, t, r, o = false) {
  let i = {}, s = er(e, n, t, o), a = o ? "borderLeft" : "borderRight";
  function l(h2, g) {
    let m = s.nodes().slice(), L = {}, y = m.pop();
    for (; y; ) {
      if (L[y]) h2(y);
      else {
        L[y] = true, m.push(y);
        for (let b of g(y)) m.push(b);
      }
      y = m.pop();
    }
  }
  function u(h2) {
    let g = s.inEdges(h2);
    g ? i[h2] = g.reduce((m, L) => {
      var p;
      let y = (p = i[L.v]) != null ? p : 0, b = s.edge(L);
      return Math.max(m, y + (b !== void 0 ? b : 0));
    }, 0) : i[h2] = 0;
  }
  function d(h2) {
    let g = s.outEdges(h2), m = Number.POSITIVE_INFINITY;
    g && (m = g.reduce((y, b) => {
      let p = i[b.w], E = s.edge(b);
      return Math.min(y, (p !== void 0 ? p : 0) - (E !== void 0 ? E : 0));
    }, Number.POSITIVE_INFINITY));
    let L = e.node(h2);
    m !== Number.POSITIVE_INFINITY && L.borderType !== a && (i[h2] = Math.max(i[h2] !== void 0 ? i[h2] : 0, m));
  }
  function c(h2) {
    return s.predecessors(h2) || [];
  }
  function f(h2) {
    return s.successors(h2) || [];
  }
  return l(u, c), l(d, f), Object.keys(r).forEach((h2) => {
    var m;
    let g = t[h2];
    g !== void 0 && (i[h2] = (m = i[g]) != null ? m : 0);
  }), i;
}
function er(e, n, t, r) {
  let o = new T(), i = e.graph(), s = or(i.nodesep, i.edgesep, r);
  return n.forEach((a) => {
    let l;
    a.forEach((u) => {
      let d = t[u];
      if (d !== void 0) {
        if (o.setNode(d), l !== void 0) {
          let c = t[l];
          if (c !== void 0) {
            let f = o.edge(c, d);
            o.setEdge(c, d, Math.max(s(e, u, l), f || 0));
          }
        }
        l = u;
      }
    });
  }), o;
}
function nr(e, n) {
  return Object.values(n).reduce((t, r) => {
    let o = Number.NEGATIVE_INFINITY, i = Number.POSITIVE_INFINITY;
    Object.entries(r).forEach(([a, l]) => {
      let u = ir(e, a) / 2;
      o = Math.max(l + u, o), i = Math.min(l - u, i);
    });
    let s = o - i;
    return s < t[0] && (t = [s, r]), t;
  }, [Number.POSITIVE_INFINITY, null])[1];
}
function tr(e, n) {
  let t = Object.values(n), r = S(Math.min, t), o = S(Math.max, t);
  ["u", "d"].forEach((i) => {
    ["l", "r"].forEach((s) => {
      let a = i + s, l = e[a];
      if (!l || l === n) return;
      let u = Object.values(l), d = r - S(Math.min, u);
      s !== "l" && (d = o - S(Math.max, u)), d && (e[a] = X(l, (c) => c + d));
    });
  });
}
function rr(e, n = void 0) {
  let t = e.ul;
  return t ? X(t, (r, o) => {
    var s, a;
    if (n) {
      let l = n.toLowerCase(), u = e[l];
      if (u && u[o] !== void 0) return u[o];
    }
    let i = Object.values(e).map((l) => {
      let u = l[o];
      return u !== void 0 ? u : 0;
    }).sort((l, u) => l - u);
    return (((s = i[1]) != null ? s : 0) + ((a = i[2]) != null ? a : 0)) / 2;
  }) : {};
}
function vn(e, n) {
  let t = P(e), r = Object.assign($t(e, t), Ut(e, t)), o = {}, i;
  ["u", "d"].forEach((a) => {
    i = a === "u" ? t : Object.values(t).reverse(), ["l", "r"].forEach((l) => {
      l === "r" && (i = i.map((f) => Object.values(f).reverse()));
      let d = Qt(e, i, r, (f) => (a === "u" ? e.predecessors(f) : e.successors(f)) || [], n), c = Zt(e, i, d.root, d.align, l === "r");
      l === "r" && (c = X(c, (f) => -f)), o[a + l] = c;
    });
  });
  let s = nr(e, o);
  return tr(o, s), rr(o, e.graph().align);
}
function or(e, n, t) {
  return (r, o, i) => {
    let s = r.node(o), a = r.node(i), l = 0, u;
    if (l += s.width / 2, Object.hasOwn(s, "labelpos")) switch (s.labelpos.toLowerCase()) {
      case "l":
        u = -s.width / 2;
        break;
      case "r":
        u = s.width / 2;
        break;
    }
    if (u && (l += t ? u : -u), u = void 0, l += (s.dummy ? n : e) / 2, l += (a.dummy ? n : e) / 2, l += a.width / 2, Object.hasOwn(a, "labelpos")) switch (a.labelpos.toLowerCase()) {
      case "l":
        u = a.width / 2;
        break;
      case "r":
        u = -a.width / 2;
        break;
    }
    return u && (l += t ? u : -u), l;
  };
}
function ir(e, n) {
  return e.node(n).width;
}
function Nn(e, n, t) {
  var s;
  if (!t) return false;
  let r = (s = n.node(e)) == null ? void 0 : s.edgeObj;
  if (!r || n.node(e).edgeLabel.reversed) return false;
  let o = t.indexOf(r == null ? void 0 : r.v), i = t.indexOf(r == null ? void 0 : r.w);
  return o !== -1 && i !== -1 && o === (i + 1) % t.length || o === (i - 1) % t.length;
}
function kn(e, n) {
  e = Z(e), sr(e), Object.entries(vn(e, n)).forEach(([t, r]) => e.node(t).x = r);
}
function sr(e) {
  let n = P(e), t = e.graph(), r = t.ranksep, o = t.rankalign, i = 0;
  n.forEach((s) => {
    let a = s.reduce((l, u) => {
      var c;
      let d = (c = e.node(u).height) != null ? c : 0;
      return l > d ? l : d;
    }, 0);
    s.forEach((l) => {
      let u = e.node(l);
      o === "top" ? u.y = i + u.height / 2 : o === "bottom" ? u.y = i + a - u.height / 2 : u.y = i + a / 2;
    }), i += a + r;
  });
}
var xn = /* @__PURE__ */ new WeakMap();
function Oe(e, n = {}) {
  return In(e, q, n), e;
}
function _n(e, n, t) {
  let r = n;
  for (; r !== void 0; ) {
    let o = e.parent(r);
    if (o === t) return r;
    r = o;
  }
}
function In(e, n, t) {
  var y;
  let r = e.nodes().filter((b) => e.children(b).length), o = {};
  r.forEach((b) => {
    let p = e.node(b);
    if (p && p.rankdir) {
      let E = new T({ multigraph: true, compound: true });
      E.setGraph({ rankdir: p.rankdir });
      let w = e.children(b);
      w.forEach((G) => {
        let N = { ...e.node(G) };
        E.setNode(G, N);
        let C = e.parent(G);
        C && C !== b && w.includes(C) && E.setParent(G, C);
      });
      let k = /* @__PURE__ */ new Set();
      e.edges().forEach((G) => {
        let N = _n(e, G.v, b), C = _n(e, G.w, b);
        if (N === G.v && C === G.w) E.setEdge(G, { ...e.edge(G) });
        else if (N && C && N !== C) {
          let B = `${N}\0${C}`;
          k.has(B) || (k.add(B), E.setEdge(N, C, { ...e.edge(G) }));
        }
      }), In(E, n, t);
      let _ = Rn(E);
      Cn(_, n, t, null), Tn(E, _);
      let O = 1 / 0, j = 1 / 0, R = -1 / 0, I = -1 / 0;
      E.nodes().forEach((G) => {
        if (G === b) return;
        let N = E.node(G);
        N && typeof N.x == "number" && typeof N.y == "number" && typeof N.width == "number" && typeof N.height == "number" && (O = Math.min(O, N.x - N.width / 2), R = Math.max(R, N.x + N.width / 2), j = Math.min(j, N.y - N.height / 2), I = Math.max(I, N.y + N.height / 2));
      }), (!isFinite(O) || !isFinite(j) || !isFinite(R) || !isFinite(I)) && (O = j = 0, R = I = 0);
      let v = R - O, x = I - j;
      o[b] = { minX: O, minY: j, maxX: R, maxY: I, width: v, height: x, offsetX: O, offsetY: j }, p._dagreClusterSubgraph = E;
    }
  });
  let i = [], s = (b) => {
    let p = [], E = (e.children(b) || []).filter((w) => w !== b);
    for (; E.length > 0; ) {
      let w = E.shift();
      p.push(w), (e.children(w) || []).filter((k) => k !== w).forEach((k) => E.push(k));
    }
    return p;
  }, a = /* @__PURE__ */ new Map();
  r.forEach((b) => {
    let p = e.node(b);
    p && p.rankdir && o[b] && a.set(b, (e.children(b) || []).filter((E) => E !== b));
  });
  let l = new Set([...a.values()].flat()), u = /* @__PURE__ */ new Map();
  a.forEach((b, p) => {
    l.has(p) || u.set(p, s(p));
  });
  let d = new Set([...u.values()].flat()), c = (b) => {
    for (let [p, E] of u) if (E.includes(b)) return p;
    return b;
  }, f = [];
  e.edges().forEach((b) => {
    (d.has(b.v) || d.has(b.w)) && f.push({ edge: b, label: e.edge(b) });
  });
  let h2 = /* @__PURE__ */ new Map();
  d.forEach((b) => {
    let p = e.parent(b);
    h2.set(b, typeof p == "string" ? p : void 0);
  }), u.forEach((b, p) => {
    let E = e.node(p), w = [];
    b.forEach((O) => {
      let j = e.node(O);
      j && (w.push({ id: O, node: j, parent: h2.get(O) }), e.removeNode(O));
    });
    let k = f.filter(({ edge: O }) => b.includes(O.v) || b.includes(O.w)), _ = o[p];
    E && (i.push({ clusterId: p, subgraph: E._dagreClusterSubgraph, bounds: _, children: b, removedNodes: w, removedEdges: k }), E.width = _.width, E.height = _.height);
  });
  let g = /* @__PURE__ */ new Set();
  f.forEach(({ edge: b, label: p }) => {
    let E = c(b.v), w = c(b.w);
    if (E !== w && e.hasNode(E) && e.hasNode(w)) {
      let k = `${E}\0${w}`;
      g.has(k) || (g.add(k), e.setEdge(E, w, { ...p, width: 0, height: 0 }));
    }
  });
  let m = Rn(e), L = Cn(m, n, t, (y = xn.get(e)) != null ? y : null);
  xn.set(e, L), Tn(e, m), g.forEach((b) => {
    let p = b.indexOf("\0"), E = b.slice(0, p), w = b.slice(p + 1);
    e.hasEdge(E, w) && e.removeEdge(E, w);
  }), i.forEach(({ clusterId: b, subgraph: p, bounds: E, removedNodes: w, removedEdges: k }) => {
    var v, x;
    let _ = e.node(b), O = (v = _ == null ? void 0 : _.x) != null ? v : 0, j = (x = _ == null ? void 0 : _.y) != null ? x : 0, R = (E.minX + E.maxX) / 2, I = (E.minY + E.maxY) / 2;
    w.forEach(({ id: G, node: N, parent: C }) => {
      e.setNode(G, N), C !== void 0 && e.setParent(G, C);
    }), k.forEach(({ edge: G, label: N }) => {
      e.setEdge(G, N);
    }), p.nodes().forEach((G) => {
      if (G === b) return;
      let N = p.node(G), C = e.node(G);
      C && N && typeof N.x == "number" && typeof N.y == "number" && (C.x = O + (N.x - R), C.y = j + (N.y - I));
    }), On(e, p, O - R, j - I), delete _._dagreClusterSubgraph;
  }), r.forEach((b) => {
    var w, k;
    let p = e.node(b), E = o[b];
    if (p && p.rankdir && p._dagreClusterSubgraph && E) {
      let _ = p._dagreClusterSubgraph, O = (w = p.x) != null ? w : 0, j = (k = p.y) != null ? k : 0, R = (E.minX + E.maxX) / 2, I = (E.minY + E.maxY) / 2;
      _.nodes().forEach((v) => {
        if (v === b) return;
        let x = _.node(v), G = e.node(v);
        if (G && x && typeof x.x == "number" && typeof x.y == "number") {
          let N = x.x - R, C = x.y - I;
          G.x = O + N, G.y = j + C;
        }
      }), On(e, _, O - R, j - I), delete p._dagreClusterSubgraph;
    }
  });
}
function On(e, n, t, r) {
  n.edges().forEach((o) => {
    if (!e.hasEdge(o)) return;
    let i = n.edge(o), s = e.edge(o);
    s.points = i.points.map((a) => ({ x: a.x + t, y: a.y + r })), Object.hasOwn(i, "x") && (s.x = i.x + t, s.y = i.y + r);
  });
}
function Cn(e, n, t, r = null) {
  var l, u;
  let o = (t == null ? void 0 : t.useDynamic) !== false, i = o && (l = r == null ? void 0 : r.graph) != null ? l : null, s = o && (u = r == null ? void 0 : r.rawNodes) != null ? u : null;
  n("    makeSpaceForEdgeLabels", () => br(e)), n("    removeSelfEdges", () => Gr(e)), n("    acyclic", () => Ue(e, i)), n("    nestingGraph.run", () => un(e)), n("    rank", () => dn(Z(e))), n("    injectEdgeLabelProxies", () => gr(e)), n("    removeEmptyRanks", () => We(e)), n("    nestingGraph.cleanup", () => fn(e)), n("    normalizeRanks", () => Be(e)), n("    assignRankMinMax", () => pr(e)), n("    removeEdgeLabelProxies", () => mr(e)), n("    normalize.run", () => Ke(e)), n("    parentDummyChains", () => ln(e)), n("    addBorderSegments", () => bn(e)), n("    order", () => re(e, t, s)), n("    insertSelfEdges", () => vr(e)), n("    adjustCoordinateSystem", () => pn(e)), n("    position", () => kn(e, t.corePath)), n("    positionSelfEdges", () => kr(e));
  let a = JSON.parse(JSON.stringify(e._nodes));
  return n("    removeBorderNodes", () => Nr(e)), n("    normalize.undo", () => Qe(e)), n("    fixupEdgeLabelCoords", () => yr(e)), n("    undoCoordinateSystem", () => mn(e)), n("    translateGraph", () => Er(e)), n("    assignNodeIntersects", () => Lr(e)), n("    reversePoints", () => wr(e)), n("    acyclic.undo", () => Je(e)), { graph: e, rawNodes: a };
}
function Tn(e, n) {
  e.nodes().forEach((t) => {
    let r = e.node(t), o = n.node(t);
    r && (r.x = o.x, r.y = o.y, r.order = o.order, r.rank = o.rank, n.children(t).length && (r.width = o.width, r.height = o.height));
  }), e.edges().forEach((t) => {
    let r = e.edge(t), o = n.edge(t);
    r.points = o.points, Object.hasOwn(o, "x") && (r.x = o.x, r.y = o.y);
  }), e.graph().width = n.graph().width, e.graph().height = n.graph().height;
}
var ar = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
var dr = { ranksep: 50, edgesep: 20, nodesep: 50, rankdir: "TB", rankalign: "center" };
var lr = ["acyclicer", "ranker", "rankdir", "align", "rankalign"];
var ur = ["width", "height", "rank"];
var jn = { width: 0, height: 0 };
var cr = ["minlen", "weight", "width", "height", "labeloffset"];
var fr = { minlen: 1, weight: 1, width: 0, height: 0, labeloffset: 10, labelpos: "r" };
var hr = ["labelpos"];
function Rn(e) {
  let n = new T({ multigraph: true, compound: true }), t = _e(e.graph());
  return n.setGraph(Object.assign({}, dr, xe(t, ar), W(t, lr))), e.nodes().forEach((r) => {
    let o = _e(e.node(r)), i = xe(o, ur);
    Object.keys(jn).forEach((a) => {
      i[a] === void 0 && (i[a] = jn[a]);
    }), n.setNode(r, i);
    let s = e.parent(r);
    s !== void 0 && n.setParent(r, s);
  }), e.edges().forEach((r) => {
    let o = _e(e.edge(r));
    n.setEdge(r, Object.assign({}, fr, xe(o, cr), W(o, hr)));
  }), n;
}
function br(e) {
  let n = e.graph();
  n.ranksep /= 2, e.edges().forEach((t) => {
    var o;
    let r = e.edge(t);
    r.minlen *= 2, ((o = r.labelpos) != null ? o : "r").toLowerCase() !== "c" && (n.rankdir === "TB" || n.rankdir === "BT" ? r.width += r.labeloffset : r.height += r.labeloffset);
  });
}
function gr(e) {
  e.edges().forEach((n) => {
    let t = e.edge(n);
    if (t.width && t.height) {
      let r = e.node(n.v), i = { rank: (e.node(n.w).rank - r.rank) / 2 + r.rank, e: n };
      M(e, "edge-proxy", i, "_ep");
    }
  });
}
function pr(e) {
  let n = 0;
  e.nodes().forEach((t) => {
    let r = e.node(t);
    r.borderTop && (r.minRank = e.node(r.borderTop).rank, r.maxRank = e.node(r.borderBottom).rank, n = Math.max(n, r.maxRank));
  }), e.graph().maxRank = n;
}
function mr(e) {
  e.nodes().forEach((n) => {
    let t = e.node(n);
    if (t.dummy === "edge-proxy") {
      let r = t;
      e.edge(r.e).labelRank = t.rank, e.removeNode(n);
    }
  });
}
function Er(e) {
  let n = Number.POSITIVE_INFINITY, t = 0, r = Number.POSITIVE_INFINITY, o = 0, i = e.graph(), s = i.marginx || 0, a = i.marginy || 0;
  function l(u) {
    let d = u.x, c = u.y, f = u.width, h2 = u.height;
    n = Math.min(n, d - f / 2), t = Math.max(t, d + f / 2), r = Math.min(r, c - h2 / 2), o = Math.max(o, c + h2 / 2);
  }
  e.nodes().forEach((u) => l(e.node(u))), e.edges().forEach((u) => {
    let d = e.edge(u);
    Object.hasOwn(d, "x") && l(d);
  }), n -= s, r -= a, e.nodes().forEach((u) => {
    let d = e.node(u);
    d.x -= n, d.y -= r;
  }), e.edges().forEach((u) => {
    let d = e.edge(u);
    d.points.forEach((c) => {
      c.x -= n, c.y -= r;
    }), Object.hasOwn(d, "x") && (d.x -= n), Object.hasOwn(d, "y") && (d.y -= r);
  }), i.width = t - n + s, i.height = o - r + a;
}
function Lr(e) {
  e.edges().forEach((n) => {
    if (n.v === n.w) return;
    let t = e.edge(n), r = e.node(n.v), o = e.node(n.w), i, s;
    t.points ? (i = t.points[0], s = t.points[t.points.length - 1]) : (t.points = [], i = o, s = r), t.points.unshift(se(r, i)), t.points.push(se(o, s));
  });
}
function yr(e) {
  e.edges().forEach((n) => {
    let t = e.edge(n);
    if (Object.hasOwn(t, "x")) switch ((t.labelpos === "l" || t.labelpos === "r") && (t.width -= t.labeloffset), t.labelpos) {
      case "l":
        t.x -= t.width / 2 + t.labeloffset;
        break;
      case "r":
        t.x += t.width / 2 + t.labeloffset;
        break;
    }
  });
}
function wr(e) {
  e.edges().forEach((n) => {
    let t = e.edge(n);
    t.reversed && t.points.reverse();
  });
}
function Nr(e) {
  e.nodes().forEach((n) => {
    if (e.children(n).length) {
      let t = e.node(n), r = e.node(t.borderTop), o = e.node(t.borderBottom), i = e.node(t.borderLeft[t.borderLeft.length - 1]), s = e.node(t.borderRight[t.borderRight.length - 1]);
      t.width = Math.abs(s.x - i.x), t.height = Math.abs(o.y - r.y), t.x = i.x + t.width / 2, t.y = r.y + t.height / 2;
    }
  }), e.nodes().forEach((n) => {
    e.node(n).dummy === "border" && e.removeNode(n);
  });
}
function Gr(e) {
  e.edges().forEach((n) => {
    if (n.v === n.w) {
      let t = e.node(n.v);
      t.selfEdges || (t.selfEdges = []), t.selfEdges.push({ e: n, label: e.edge(n) }), e.removeEdge(n);
    }
  });
}
function vr(e) {
  P(e).forEach((t) => {
    let r = 0;
    t.forEach((o, i) => {
      let s = e.node(o);
      typeof s.rank != "number" && (s.rank = 0), s.order = i + r, (s.selfEdges || []).forEach((a) => {
        M(e, "selfedge", { width: a.label.width, height: a.label.height, rank: s.rank, order: i + ++r, e: a.e, edgeLabel: a.label }, "_se"), (!Array.isArray(a.label.points) || a.label.points.length !== 7) && (a.label.points = [{ x: 0, y: -10 }, { x: 0, y: -10 }, { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
      }), delete s.selfEdges;
    });
  });
}
function kr(e) {
  e.nodes().forEach((n) => {
    let t = e.node(n), r = (o) => typeof o == "number" && isFinite(o);
    if (t.dummy === "selfedge") {
      let o = t, i = e.node(o.e.v), s = r(i == null ? void 0 : i.x) ? i.x : 0, a = r(i == null ? void 0 : i.y) ? i.y : 0, l = r(i == null ? void 0 : i.width) ? i.width : 0, u = r(i == null ? void 0 : i.height) ? i.height : 0, d = r(t.x) ? t.x : s, c = r(t.y) ? t.y : a, f = l / 2, h2 = u / 2;
      o.edgeLabel.points = [{ x: d + f, y: c - h2 }, { x: d + f, y: c - h2 }, { x: d, y: c }, { x: d - f, y: c + h2 }, { x: d - f, y: c + h2 }, { x: d, y: c }, { x: d, y: c }], o.edgeLabel.x = d, o.edgeLabel.y = c, e.setEdge(o.e, o.edgeLabel), e.removeNode(n);
    } else t && Array.isArray(t.selfEdges) && t.selfEdges.forEach((o) => {
      if (!Array.isArray(o.label.points) || o.label.points.length !== 7) {
        let i = r(t.x) ? t.x : 0, s = r(t.y) ? t.y : 0, a = r(t.width) ? t.width : 0, l = r(t.height) ? t.height : 0, u = a / 2, d = l / 2;
        o.label.points = [{ x: i + u, y: s - d }, { x: i + u, y: s - d }, { x: i, y: s }, { x: i - u, y: s + d }, { x: i - u, y: s + d }, { x: i, y: s }, { x: i, y: s }];
      }
    });
  });
}
function xe(e, n) {
  return X(W(e, n), Number);
}
function _e(e) {
  let n = {};
  return e && Object.entries(e).forEach(([t, r]) => {
    typeof t == "string" && (t = t.toLowerCase()), n[t] = r;
  }), n;
}
function Ce(e) {
  let n = P(e), t = new T({ compound: true, multigraph: true }).setGraph({});
  return e.nodes().forEach((r) => {
    t.setNode(r, { label: r }), t.setParent(r, "layer" + e.node(r).rank);
  }), e.edges().forEach((r) => t.setEdge(r.v, r.w, {}, r.name)), n.forEach((r, o) => {
    let i = "layer" + o;
    t.setNode(i, { rank: "same" }), r.reduce((s, a) => (t.setEdge(s, a, { style: "invis" }), a));
  }), t;
}
var xr = { graphlib: ie, version: ue, layout: Oe, debug: Ce, util: { time: le, notime: q } };
var Uo = xr;

// packages/dsh-concerto/lib/domain/view_layout.mjs
var DEPTH_PALETTE = Object.freeze(["#2563eb", "#0d9488", "#d97706", "#7c3aed", "#db2777"]);
var STATUS_TOKENS = Object.freeze({
  done: Object.freeze({ color: "#34d399", label: "\u5DF2\u5B8C\u6210", icon: "\u2713" }),
  completed: Object.freeze({ color: "#34d399", label: "\u5DF2\u5B8C\u6210", icon: "\u2713" }),
  running: Object.freeze({ color: "#2dd4bf", label: "\u8FDB\u884C\u4E2D", icon: "\u27F3" }),
  in_progress: Object.freeze({ color: "#2dd4bf", label: "\u8FDB\u884C\u4E2D", icon: "\u27F3" }),
  attention: Object.freeze({ color: "#f59e0b", label: "\u5F85\u5904\u7406", icon: "\u25CF" }),
  waiting_approval: Object.freeze({ color: "#f59e0b", label: "\u7B49\u5F85\u5BA1\u6279", icon: "\u25CF" }),
  waiting_input: Object.freeze({ color: "#f59e0b", label: "\u7B49\u5F85\u56DE\u7B54", icon: "\u25CF" }),
  cancelling: Object.freeze({ color: "#f59e0b", label: "\u53D6\u6D88\u4E2D", icon: "\u25CC" }),
  review: Object.freeze({ color: "#a78bfa", label: "\u5F85\u9A8C\u6536", icon: "\u25D0" }),
  blocked: Object.freeze({ color: "#fb7185", label: "\u963B\u585E", icon: "!" }),
  failed: Object.freeze({ color: "#fb7185", label: "\u5931\u8D25", icon: "!" }),
  unknown: Object.freeze({ color: "#94a3b8", label: "\u672A\u77E5", icon: "?" }),
  pending: Object.freeze({ color: "#64748b", label: "\u5F85\u529E", icon: "\u25CB" }),
  idle: Object.freeze({ color: "#64748b", label: "\u7A7A\u95F2", icon: "\u25CB" })
});
function wrapLabel(text, maxChars = 16, maxLines = 3) {
  const s = String(text ?? "").trim();
  if (!s) return [""];
  const lines = [];
  let line = "";
  for (const ch of s) {
    if (line.length >= maxChars) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = last.length > 1 ? last.slice(0, maxChars - 1) + "\u2026" : "\u2026";
  return kept;
}
function approxLineWidth(line, fontSize = 13) {
  const fs = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 13;
  let width = 0;
  for (const ch of String(line ?? "")) {
    const code = ch.charCodeAt(0);
    if (code > 255) width += fs * 1.04;
    else if (/[A-Z0-9MW@#%&]/.test(ch)) width += fs * 0.68;
    else width += fs * 0.56;
  }
  return width;
}
function assignDeterministicIds(node, pathId = "root") {
  if (!node || typeof node !== "object") return null;
  const id = node.id || pathId;
  const children = Array.isArray(node.children) ? node.children.map((c, idx) => assignDeterministicIds(c, `${id}.${idx}`)).filter(Boolean) : [];
  return { ...node, id, children };
}
function normalizeMindmapTree(root) {
  return assignDeterministicIds(root, "root");
}
function mindmapToDiagramData(data, fallbackTitle = "\u601D\u7EF4\u5BFC\u56FE") {
  const raw = data?.root ? data.root : typeof data?.markdown === "string" && data.markdown.trim() !== "" ? parseMarkdownToMindmap(data.markdown) : null;
  const norm = normalizeMindmapTree(raw || { id: "root", label: String(fallbackTitle || "\u601D\u7EF4\u5BFC\u56FE"), children: [] });
  const nodes = [];
  const edges = [];
  const usedIds = /* @__PURE__ */ new Set();
  function allocId(preferred) {
    let candidate = String(preferred || "n");
    let n = 1;
    while (usedIds.has(candidate)) {
      candidate = `${preferred}-${++n}`;
    }
    usedIds.add(candidate);
    return candidate;
  }
  function walk(node, parentId, depth) {
    const id = allocId(node.id || "root");
    nodes.push({
      id,
      label: String(node.label ?? id),
      ...node.status ? { status: node.status } : {},
      ...node.taskId ? { taskId: node.taskId } : {},
      ...node.executionId ? { executionId: node.executionId } : {},
      ...node.memberId ? { memberId: node.memberId } : {},
      ...depth === 0 ? { critical: true } : {}
    });
    if (parentId) {
      edges.push({ from: parentId, to: id });
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child, id, depth + 1);
    }
  }
  walk(norm, null, 0);
  return { layout: data?.layout || "dag", nodes, edges };
}
function countSubtreeDescendants(node) {
  if (!node || !Array.isArray(node.children) || node.children.length === 0) return 0;
  let total = 0;
  for (const c of node.children) {
    total += 1 + countSubtreeDescendants(c);
  }
  return total;
}
function countMindmapNodes(root) {
  if (!root || typeof root !== "object") return 0;
  return 1 + countSubtreeDescendants(root);
}
function defaultPreviewCollapsedIds(root, thresholdNodes = 8, maxOpenDepth = 1) {
  const norm = normalizeMindmapTree(root);
  if (!norm || countMindmapNodes(norm) <= thresholdNodes) return [];
  const folded = [];
  function walk(node, depth) {
    if (!Array.isArray(node.children) || node.children.length === 0) return;
    if (depth >= maxOpenDepth) {
      folded.push(node.id);
      return;
    }
    for (const c of node.children) walk(c, depth + 1);
  }
  walk(norm, 0);
  return folded;
}
function defaultPreviewCollapsedIdsWithinBudget(root, options = {}) {
  const norm = normalizeMindmapTree(root);
  if (!norm) return [];
  const fontSize = Number.isFinite(options.fontSize) && options.fontSize > 0 ? options.fontSize : 12.5;
  const maxHeight = Number.isFinite(options.maxHeight) && options.maxHeight > 0 ? options.maxHeight : 356;
  const collapsed = /* @__PURE__ */ new Set();
  function foldDeepBranches(node, depth) {
    const children = Array.isArray(node.children) ? node.children : [];
    if (depth >= 2 && children.length > 0) {
      collapsed.add(node.id);
      return;
    }
    for (const child of children) foldDeepBranches(child, depth + 1);
  }
  foldDeepBranches(norm, 0);
  const fits = () => layoutMindmapTree(norm, collapsed, { fontSize }).height <= maxHeight;
  if (fits()) return [...collapsed];
  while (true) {
    let collect = function(node, depth) {
      if (collapsed.has(node.id)) return;
      const children = Array.isArray(node.children) ? node.children : [];
      if (depth > 0 && children.length > 0) {
        candidates.push({ id: node.id, depth, descendants: countSubtreeDescendants(node) });
      }
      for (const child of children) collect(child, depth + 1);
    };
    const candidates = [];
    collect(norm, 0);
    if (candidates.length === 0 && !collapsed.has(norm.id) && Array.isArray(norm.children) && norm.children.length > 0) {
      candidates.push({ id: norm.id, depth: 0, descendants: countSubtreeDescendants(norm) });
    }
    if (candidates.length === 0) break;
    candidates.sort((a, b) => b.descendants - a.descendants || b.depth - a.depth || a.id.localeCompare(b.id));
    collapsed.add(candidates[0].id);
    if (fits()) break;
  }
  return [...collapsed];
}
function parseMarkdownToMindmap(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/).map((l) => l.replace(/\t/g, "  ")).filter((l) => l.trim() !== "");
  if (lines.length === 0) return null;
  const root = { id: "root", label: "\u4E2D\u5FC3\u4E3B\u9898", children: [] };
  const headingStack = [{ depth: 0, node: root }];
  const bulletStack = [];
  let autoId = 0;
  for (const raw of lines) {
    const trimmed = raw.trim();
    const hMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (hMatch) {
      const level = hMatch[1].length;
      const label2 = hMatch[2].trim();
      if (level === 1 && root.children.length === 0 && root.label === "\u4E2D\u5FC3\u4E3B\u9898") {
        root.label = label2;
        headingStack.length = 1;
        headingStack[0] = { depth: 1, node: root };
        bulletStack.length = 0;
        continue;
      }
      while (headingStack.length > 1 && headingStack[headingStack.length - 1].depth >= level) {
        headingStack.pop();
      }
      const parent = headingStack[headingStack.length - 1].node;
      const node = { id: `n-${++autoId}`, label: label2, children: [] };
      parent.children.push(node);
      headingStack.push({ depth: level, node });
      bulletStack.length = 0;
      continue;
    }
    const bMatch = /^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/.exec(raw);
    if (bMatch) {
      const indent = bMatch[1].length;
      const label2 = bMatch[2].trim();
      while (bulletStack.length > 0 && bulletStack[bulletStack.length - 1].indent >= indent) {
        bulletStack.pop();
      }
      const parent = bulletStack.length > 0 ? bulletStack[bulletStack.length - 1].node : headingStack[headingStack.length - 1].node;
      const node = { id: `n-${++autoId}`, label: label2, children: [] };
      parent.children.push(node);
      bulletStack.push({ indent, node });
      continue;
    }
    if (root.children.length === 0 && root.label === "\u4E2D\u5FC3\u4E3B\u9898") {
      root.label = trimmed;
    } else {
      const parent = headingStack[headingStack.length - 1].node;
      parent.children.push({ id: `n-${++autoId}`, label: trimmed, children: [] });
    }
  }
  return root;
}
function layoutMindmapTree(root, collapsedIds = /* @__PURE__ */ new Set(), options = {}) {
  const normRoot = normalizeMindmapTree(root);
  if (!normRoot) return { nodes: [], edges: [], width: 0, height: 0, hiddenDescendantTotal: 0 };
  const fontSize = Number.isFinite(options.fontSize) && options.fontSize > 0 ? options.fontSize : 12.5;
  const lineHeight = Math.round(fontSize * 1.5);
  const X_GAP = 80;
  const Y_GAP = 24;
  const depthWidths = [];
  const nodes = [];
  const edges = [];
  let hiddenDescendantTotal = 0;
  function measure(node, depth, branchHueIdx) {
    const id = node.id;
    const fullLabel = String(node.label ?? id);
    const rawChildren = Array.isArray(node.children) ? node.children : [];
    const isLeaf = depth > 0 && rawChildren.length === 0;
    const collapsed = rawChildren.length > 0 && collapsedIds.has(id);
    const hiddenCount = collapsed ? countSubtreeDescendants(node) : 0;
    if (collapsed) hiddenDescendantTotal += hiddenCount;
    const badgeSpace = collapsed ? 36 : 0;
    const maxChars = Math.max(1, Math.min(18, Math.floor((320 - 40 - badgeSpace) / ((fontSize + 0.5) * 1.04))));
    const lines = wrapLabel(fullLabel, maxChars, 3);
    const textW = Math.max(48, ...lines.map((l) => approxLineWidth(l, depth === 0 ? fontSize + 0.5 : fontSize)));
    const width = Math.max(136, Math.min(320, Math.round(textW + 40 + badgeSpace)));
    depthWidths[depth] = Math.max(depthWidths[depth] || 0, width);
    const height = isLeaf ? Math.max(28, lines.length * lineHeight + 8) : Math.max(54, lines.length * lineHeight + 26);
    const children = collapsed ? [] : rawChildren.map((c, idx) => measure(c, depth + 1, depth === 0 ? idx : branchHueIdx));
    const childGap = children.length > 0 && children.every((child) => child.isLeaf) ? 8 : Y_GAP;
    const childrenHeight = children.reduce((sum, c) => sum + c.subtreeHeight, 0) + Math.max(0, children.length - 1) * childGap;
    const subtreeHeight = Math.max(height, childrenHeight);
    return {
      id,
      label: fullLabel,
      fullLabel,
      lines,
      depth,
      isLeaf,
      branchIndex: depth === 0 ? 0 : branchHueIdx,
      width,
      height,
      subtreeHeight,
      collapsed,
      hasChildren: rawChildren.length > 0,
      childCount: rawChildren.length,
      hiddenCount,
      status: node.status,
      taskId: node.taskId,
      executionId: node.executionId,
      memberId: node.memberId,
      children
    };
  }
  const measured = measure(normRoot, 0, 0);
  function place(item, x, topY) {
    const width = depthWidths[item.depth];
    const centerY = topY + item.subtreeHeight / 2;
    const y = centerY - item.height / 2;
    nodes.push({
      id: item.id,
      label: item.label,
      fullLabel: item.fullLabel,
      lines: item.lines,
      depth: item.depth,
      isLeaf: item.isLeaf,
      branchIndex: item.branchIndex,
      x,
      y,
      width,
      height: item.height,
      centerY,
      collapsed: item.collapsed,
      hasChildren: item.hasChildren,
      childCount: item.childCount,
      hiddenCount: item.hiddenCount,
      status: item.status,
      taskId: item.taskId,
      executionId: item.executionId,
      memberId: item.memberId
    });
    if (item.children.length > 0) {
      const childX = x + width + X_GAP;
      const childGap = item.children.every((child) => child.isLeaf) ? 8 : Y_GAP;
      const totalH = item.children.reduce((s, c) => s + c.subtreeHeight, 0) + (item.children.length - 1) * childGap;
      let childTop = centerY - totalH / 2;
      for (const child of item.children) {
        const childCenterY = childTop + child.subtreeHeight / 2;
        edges.push({
          from: item.id,
          to: child.id,
          x1: x + width,
          y1: centerY,
          x2: childX,
          y2: childCenterY,
          depth: child.depth,
          branchIndex: child.branchIndex,
          status: child.status
        });
        place(child, childX, childTop);
        childTop += child.subtreeHeight + childGap;
      }
    }
  }
  place(measured, 28, 28);
  const maxX = Math.max(280, ...nodes.map((n) => n.x + n.width + 32));
  const maxY = Math.max(140, ...nodes.map((n) => n.y + n.height + 24));
  return { nodes, edges, width: maxX, height: maxY, hiddenDescendantTotal, lineHeight, fontSize };
}
function buildRoundedOrthogonalPath(x1, y1, x2, y2, direction = "LR") {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dy) < 2 && direction !== "TB") {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  if (Math.abs(dx) < 2 && direction === "TB") {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const r = 8;
  if (direction === "TB") {
    const midY = (y1 + y2) / 2;
    const sx2 = dx >= 0 ? 1 : -1;
    const sy2 = dy >= 0 ? 1 : -1;
    const rx2 = Math.min(r, Math.abs(dx) / 2);
    const ry2 = Math.min(r, Math.abs(dy) / 2);
    return [
      `M ${x1} ${y1}`,
      `L ${x1} ${midY - sy2 * ry2}`,
      `Q ${x1} ${midY} ${x1 + sx2 * rx2} ${midY}`,
      `L ${x2 - sx2 * rx2} ${midY}`,
      `Q ${x2} ${midY} ${x2} ${midY + sy2 * ry2}`,
      `L ${x2} ${y2}`
    ].join(" ");
  }
  const midX = (x1 + x2) / 2;
  const sx = dx >= 0 ? 1 : -1;
  const sy = dy >= 0 ? 1 : -1;
  const rx = Math.min(r, Math.abs(dx) / 2);
  const ry = Math.min(r, Math.abs(dy) / 2);
  return [
    `M ${x1} ${y1}`,
    `L ${midX - sx * rx} ${y1}`,
    `Q ${midX} ${y1} ${midX} ${y1 + sy * ry}`,
    `L ${midX} ${y2 - sy * ry}`,
    `Q ${midX} ${y2} ${midX + sx * rx} ${y2}`,
    `L ${x2} ${y2}`
  ].join(" ");
}
function topologicalLayers(nodeSpecs, rawEdges) {
  const inDeg = new Map(nodeSpecs.map((n) => [n.id, 0]));
  const adj = new Map(nodeSpecs.map((n) => [n.id, []]));
  for (const e of rawEdges) {
    if (adj.has(e.from) && inDeg.has(e.to)) {
      adj.get(e.from).push(e.to);
      inDeg.set(e.to, inDeg.get(e.to) + 1);
    }
  }
  const layerOf = new Map(nodeSpecs.map((n) => [n.id, 0]));
  const queue = [...inDeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const visited = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const curr = queue.shift();
    visited.add(curr);
    const baseLayer = layerOf.get(curr) ?? 0;
    for (const next of adj.get(curr) || []) {
      layerOf.set(next, Math.max(layerOf.get(next) ?? 0, baseLayer + 1));
      inDeg.set(next, inDeg.get(next) - 1);
      if (inDeg.get(next) <= 0 && !visited.has(next)) queue.push(next);
    }
  }
  return layerOf;
}
function classifyEdgeSemantic(edge, fromNode, toNode, isCrit, semanticKind) {
  const errStates = /* @__PURE__ */ new Set(["blocked", "failed", "error"]);
  const waitingStates = /* @__PURE__ */ new Set(["waiting_approval", "waiting_input", "attention"]);
  const useModelKind = semanticKind !== "live_execution";
  if (useModelKind && edge.kind === "error" || errStates.has(edge.status) || errStates.has(fromNode?.status) || errStates.has(toNode?.status)) {
    return "blocked";
  }
  if (useModelKind && edge.kind === "unknown" || edge.status === "unknown" || toNode?.status === "unknown") {
    return "unknown";
  }
  if (useModelKind && edge.kind === "waiting" || waitingStates.has(edge.status) || waitingStates.has(toNode?.status)) {
    return "waiting";
  }
  if (isCrit || useModelKind && edge.kind === "critical" || toNode?.status === "running" || toNode?.status === "in_progress") {
    return "critical";
  }
  return "default";
}
function layoutDiagram(data, options = {}) {
  const rawNodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const rawEdges = Array.isArray(data?.edges) ? data.edges : [];
  const layout = options.layout || data?.layout || "dag";
  const direction = options.direction || data?.layoutHints?.direction || "LR";
  const userOffsets = options.userOffsets && typeof options.userOffsets === "object" ? options.userOffsets : {};
  const criticalNodes = new Set(Array.isArray(options.criticalPath) ? options.criticalPath : []);
  const fontSize = Number.isFinite(options.fontSize) && options.fontSize > 0 ? options.fontSize : 12.5;
  const lineHeight = Math.round(fontSize * 1.5);
  const maxChars = Math.max(1, Math.min(16, Math.floor(248 / (fontSize * 1.04))));
  const labelFontSize = Math.max(11, Math.round(fontSize * 0.85));
  const labelHeight = Math.ceil(labelFontSize * 1.6);
  if (rawNodes.length === 0) return { nodes: [], edges: [], lanes: [], width: 320, height: 180, direction, fontSize, lineHeight };
  const hasEdgeLabels = rawEdges.some((e) => typeof e?.label === "string" && e.label.trim() !== "");
  const maxEdgeLabelW = hasEdgeLabels ? Math.max(0, ...rawEdges.map((e) => e?.label ? approxLineWidth(e.label, labelFontSize) + 20 : 0)) : 0;
  const nodeSpecs = rawNodes.map((n) => {
    const fullLabel = String(n.label ?? n.id);
    const lines = wrapLabel(fullLabel, maxChars, 3);
    const maxW = Math.max(52, ...lines.map((l) => approxLineWidth(l, fontSize)));
    const statusSpace = n.status ? 46 : 10;
    const width2 = Math.max(164, Math.min(300, Math.round(Math.max(maxW + 40, maxW + statusSpace * 0.5 + 28))));
    const height2 = Math.max(60, lines.length * lineHeight + (n.status ? 50 : 28));
    return {
      ...n,
      fullLabel,
      lines,
      width: width2,
      height: height2,
      critical: Boolean(n.critical) || criticalNodes.has(n.id)
    };
  });
  const positioned = /* @__PURE__ */ new Map();
  const lanes = [];
  if (layout === "timeline") {
    let cursorX = 28;
    const yBase = 48;
    const stepGap = Math.max(58, Math.round(maxEdgeLabelW + 18));
    for (let i = 0; i < nodeSpecs.length; i += 1) {
      const n = nodeSpecs[i];
      positioned.set(n.id, { ...n, x: cursorX, y: yBase + (i % 2 === 0 ? 0 : 14) });
      cursorX += n.width + stepGap;
    }
  } else if (layout === "radial") {
    const [center, ...outer] = nodeSpecs;
    const cx = 260;
    const cy = 200;
    positioned.set(center.id, { ...center, x: cx - center.width / 2, y: cy - center.height / 2 });
    const radius = Math.max(145, outer.length * 26);
    outer.forEach((n, idx) => {
      const angle = Math.PI * 2 * idx / Math.max(1, outer.length) - Math.PI / 2;
      const nx = cx + Math.cos(angle) * radius - n.width / 2;
      const ny = cy + Math.sin(angle) * radius - n.height / 2;
      positioned.set(n.id, { ...n, x: nx, y: ny });
    });
  } else if (layout === "swimlane") {
    const layerOf = topologicalLayers(nodeSpecs, rawEdges);
    const laneNames = [];
    const byLane = /* @__PURE__ */ new Map();
    for (const n of nodeSpecs) {
      const laneKey = String(n.lane || n.memberId || n.assignee || "\u5171\u4EAB\u6CF3\u9053");
      if (!byLane.has(laneKey)) {
        laneNames.push(laneKey);
        byLane.set(laneKey, []);
      }
      byLane.get(laneKey).push(n);
    }
    const colWidths = /* @__PURE__ */ new Map();
    for (const n of nodeSpecs) {
      const col = Number.isInteger(n.stage) ? n.stage : layerOf.get(n.id) ?? 0;
      colWidths.set(col, Math.max(colWidths.get(col) ?? 120, n.width));
    }
    const sortedCols = [...colWidths.keys()].sort((a, b) => a - b);
    const colX = /* @__PURE__ */ new Map();
    const colGap = Math.max(60, Math.round(maxEdgeLabelW + 16));
    let curX = 160;
    for (const col of sortedCols) {
      colX.set(col, curX);
      curX += (colWidths.get(col) ?? 120) + colGap;
    }
    let curY = 24;
    const LANE_PAD = 18;
    for (let li = 0; li < laneNames.length; li += 1) {
      const laneId = laneNames[li];
      const laneNodes = byLane.get(laneId);
      const byCol = /* @__PURE__ */ new Map();
      for (const n of laneNodes) {
        const col = Number.isInteger(n.stage) ? n.stage : layerOf.get(n.id) ?? 0;
        if (!byCol.has(col)) byCol.set(col, []);
        byCol.get(col).push(n);
      }
      let maxStackH = 56;
      for (const stack of byCol.values()) {
        const stackH = stack.reduce((s, item) => s + item.height, 0) + Math.max(0, stack.length - 1) * 16;
        maxStackH = Math.max(maxStackH, stackH);
      }
      const laneH = maxStackH + LANE_PAD * 2;
      const firstMember = laneNodes.find((n) => n.memberId)?.memberId || null;
      lanes.push({ id: laneId, label: laneId, memberId: firstMember, index: li, y: curY, height: laneH, width: Math.max(420, curX + 28) });
      for (const [col, stack] of byCol.entries()) {
        let itemY = curY + LANE_PAD;
        const xBase = colX.get(col) ?? 160;
        for (const n of stack) {
          positioned.set(n.id, { ...n, x: xBase, y: itemY });
          itemY += n.height + 16;
        }
      }
      curY += laneH + 10;
    }
  } else {
    let usedDagre = false;
    const ranksep = Math.max(hasEdgeLabels ? 98 : 72, Math.round(maxEdgeLabelW + 34));
    const nodesep = hasEdgeLabels ? 42 : 32;
    if (Uo && typeof Uo.layout === "function" && Uo.graphlib?.Graph) {
      try {
        const g = new Uo.graphlib.Graph({ multigraph: false });
        g.setGraph({ rankdir: direction === "TB" ? "TB" : "LR", nodesep, ranksep, marginx: 28, marginy: 28 });
        g.setDefaultEdgeLabel(() => ({}));
        for (const n of nodeSpecs) {
          g.setNode(n.id, { width: n.width, height: n.height });
        }
        for (const e of rawEdges) {
          if (positioned.has(e.from) || nodeSpecs.some((n) => n.id === e.from)) {
            if (nodeSpecs.some((n) => n.id === e.to)) g.setEdge(e.from, e.to, e.label ? { width: approxLineWidth(e.label, labelFontSize) + 20, height: labelHeight, labelpos: "c" } : {});
          }
        }
        Uo.layout(g);
        for (const n of nodeSpecs) {
          const layoutNode = g.node(n.id);
          if (layoutNode && Number.isFinite(layoutNode.x) && Number.isFinite(layoutNode.y)) {
            positioned.set(n.id, {
              ...n,
              x: Math.round(layoutNode.x - n.width / 2),
              y: Math.round(layoutNode.y - n.height / 2)
            });
          }
        }
        usedDagre = positioned.size === nodeSpecs.length;
      } catch {
        usedDagre = false;
      }
    }
    if (!usedDagre) {
      const layerOf = topologicalLayers(nodeSpecs, rawEdges);
      const layers = /* @__PURE__ */ new Map();
      for (const n of nodeSpecs) {
        const l = layerOf.get(n.id) ?? 0;
        if (!layers.has(l)) layers.set(l, []);
        layers.get(l).push(n);
      }
      let cursorX = 28;
      const sortedLayers = [...layers.keys()].sort((a, b) => a - b);
      for (const l of sortedLayers) {
        const col = layers.get(l);
        const colWidth = Math.max(...col.map((n) => n.width));
        let cursorY = 28;
        for (const n of col) {
          positioned.set(n.id, { ...n, x: cursorX, y: cursorY });
          cursorY += n.height + 26;
        }
        cursorX += colWidth + Math.max(72, Math.round(maxEdgeLabelW + 24));
      }
    }
  }
  for (const [id, node] of positioned.entries()) {
    const off = userOffsets[id];
    if (off && Number.isFinite(off.dx) && Number.isFinite(off.dy)) {
      node.x += off.dx;
      node.y += off.dy;
    }
  }
  const nodes = [...positioned.values()];
  const minX = Math.min(0, ...nodes.map((n) => n.x - 24));
  const minY = Math.min(0, ...nodes.map((n) => n.y - 24));
  if (minX < 0 || minY < 0) {
    for (const n of nodes) {
      n.x -= minX;
      n.y -= minY;
    }
    for (const lane of lanes) lane.y -= minY;
  }
  const edges = rawEdges.map((e) => {
    const from = positioned.get(e.from);
    const to = positioned.get(e.to);
    if (!from || !to) return null;
    const rightToLeft = from.x + from.width <= to.x;
    const downFlow = direction === "TB" && from.y + from.height <= to.y;
    let x1, y1, x2, y2;
    if (downFlow) {
      x1 = from.x + from.width / 2;
      y1 = from.y + from.height;
      x2 = to.x + to.width / 2;
      y2 = to.y;
    } else if (rightToLeft) {
      x1 = from.x + from.width;
      y1 = from.y + from.height / 2;
      x2 = to.x;
      y2 = to.y + to.height / 2;
    } else {
      x1 = from.x + from.width / 2;
      y1 = from.y + from.height;
      x2 = to.x + to.width / 2;
      y2 = to.y;
    }
    const path = buildRoundedOrthogonalPath(x1, y1, x2, y2, downFlow ? "TB" : "LR");
    const channelX = (x1 + x2) / 2;
    const isCrit = Boolean(e.critical) || Boolean(from.critical) && Boolean(to.critical);
    const semantic = classifyEdgeSemantic(e, from, to, isCrit, options.semanticKind);
    const labelWidth = e.label ? Math.ceil(approxLineWidth(e.label, labelFontSize) + 20) : 0;
    return {
      ...e,
      x1: Math.round(x1),
      y1: Math.round(y1),
      x2: Math.round(x2),
      y2: Math.round(y2),
      path,
      midX: Math.round(downFlow ? channelX : (channelX + x2) / 2),
      midY: Math.round(downFlow ? (y1 + y2) / 2 : y2),
      critical: isCrit,
      semantic,
      labelWidth,
      labelHeight,
      labelFontSize
    };
  }).filter(Boolean);
  const width = Math.max(340, ...nodes.map((n) => n.x + n.width + 32), ...lanes.map((l) => l.width));
  const height = Math.max(190, ...nodes.map((n) => n.y + n.height + 32), ...lanes.map((l) => l.y + l.height + 16));
  return { nodes, edges, lanes, width, height, direction, fontSize, lineHeight };
}
function objectToExcalidrawScene(obj, options = {}) {
  const userOffsets = options.userOffsets ?? obj?.userLayout?.offsets ?? {};
  if ((obj?.type === "board" || obj?.type === "diagram") && obj?.data?.excalidrawScene && Array.isArray(obj.data.excalidrawScene.elements)) {
    return structuredClone({
      type: "excalidraw",
      version: 2,
      source: "https://concerto.local/excalidraw",
      appState: { viewBackgroundColor: "#ffffff", gridSize: 20, ...obj.data.excalidrawScene.appState ?? {} },
      files: obj.data.excalidrawScene.files ?? {},
      ...obj.data.excalidrawScene
    });
  }
  let nodes = [];
  let edges = [];
  if (obj?.type === "mindmap") {
    const mm = layoutMindmapTree(obj.data?.root || parseMarkdownToMindmap(obj.data?.markdown));
    nodes = mm.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      x: n.x + (userOffsets[n.id]?.dx || 0),
      y: n.y + (userOffsets[n.id]?.dy || 0),
      width: n.width,
      height: n.height
    }));
    edges = mm.edges.map((e) => ({ from: e.from, to: e.to, x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 }));
  } else {
    const diag = layoutDiagram(obj?.data, { userOffsets });
    nodes = diag.nodes;
    edges = diag.edges;
  }
  const elements = [];
  const now = Date.now();
  const rectByNodeId = /* @__PURE__ */ new Map();
  const rectBound = /* @__PURE__ */ new Map();
  nodes.forEach((n, idx) => {
    const rectId = `node-${n.id}`;
    const textId = `label-${n.id}`;
    rectByNodeId.set(n.id, rectId);
    rectBound.set(rectId, [{ id: textId, type: "text" }]);
    const fillMap = {
      done: "#dcfce7",
      completed: "#dcfce7",
      in_progress: "#ccfbf1",
      running: "#ccfbf1",
      blocked: "#ffe4e6",
      failed: "#ffe4e6",
      review: "#ede9fe",
      attention: "#fef3c7"
    };
    elements.push({
      id: rectId,
      type: "rectangle",
      x: Math.round(n.x),
      y: Math.round(n.y),
      width: Math.round(n.width),
      height: Math.round(n.height),
      angle: 0,
      strokeColor: "#1e293b",
      backgroundColor: fillMap[n.status] || "#e0f2fe",
      fillStyle: "hachure",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      seed: 100 + idx,
      version: 1,
      versionNonce: 100 + idx,
      isDeleted: false,
      boundElements: rectBound.get(rectId),
      updated: now,
      roundness: { type: 3 },
      customData: { nodeId: n.id, status: n.status || "pending" }
    });
    elements.push({
      id: textId,
      type: "text",
      x: Math.round(n.x + 10),
      y: Math.round(n.y + n.height / 2 - 9),
      width: Math.max(40, Math.round(n.width - 20)),
      height: 18,
      angle: 0,
      strokeColor: "#0f172a",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      seed: 500 + idx,
      version: 1,
      versionNonce: 500 + idx,
      isDeleted: false,
      containerId: rectId,
      text: String(n.label),
      originalText: String(n.label),
      fontSize: 14,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      updated: now
    });
  });
  edges.forEach((e, idx) => {
    const arrowId = `edge-${idx}-${e.from}-${e.to}`;
    const fromRectId = rectByNodeId.get(e.from) || null;
    const toRectId = rectByNodeId.get(e.to) || null;
    if (fromRectId) rectBound.get(fromRectId)?.push({ id: arrowId, type: "arrow" });
    if (toRectId) rectBound.get(toRectId)?.push({ id: arrowId, type: "arrow" });
    elements.push({
      id: arrowId,
      type: "arrow",
      x: Math.round(e.x1),
      y: Math.round(e.y1),
      width: Math.abs(Math.round(e.x2 - e.x1)),
      height: Math.abs(Math.round(e.y2 - e.y1)),
      angle: 0,
      strokeColor: "#475569",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1.5,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      seed: 900 + idx,
      version: 1,
      versionNonce: 900 + idx,
      isDeleted: false,
      points: [[0, 0], [Math.round(e.x2 - e.x1), Math.round(e.y2 - e.y1)]],
      startBinding: fromRectId ? { elementId: fromRectId, focus: 0, gap: 4 } : null,
      endBinding: toRectId ? { elementId: toRectId, focus: 0, gap: 4 } : null,
      endArrowhead: "arrow",
      startArrowhead: null,
      updated: now,
      customData: e.label ? { label: String(e.label) } : void 0
    });
  });
  return {
    type: "excalidraw",
    version: 2,
    source: "https://concerto.local/excalidraw",
    elements,
    appState: { viewBackgroundColor: "#ffffff", gridSize: 20 },
    files: {}
  };
}

// packages/dsh-concerto/lib/domain/view_objects.mjs
var VIEW_OBJECT_TYPES = Object.freeze(["table", "checklist", "mindmap", "diagram", "board", "html"]);
var VIEW_RENDERERS = Object.freeze(["html", "markmap", "svg", "excalidraw", "sandbox-iframe"]);
var VIEW_OBJECT_SIZES = Object.freeze(["s", "m", "l"]);
var VIEW_SEMANTIC_KINDS = Object.freeze(["blueprint", "snapshot", "live_execution"]);
var DEFAULT_RENDERER = Object.freeze({
  table: "html",
  checklist: "html",
  mindmap: "markmap",
  diagram: "svg",
  board: "excalidraw",
  html: "sandbox-iframe"
});
var ALLOWED_RENDERERS = Object.freeze({
  table: Object.freeze(["html"]),
  checklist: Object.freeze(["html"]),
  mindmap: Object.freeze(["markmap", "svg", "html", "excalidraw"]),
  diagram: Object.freeze(["svg", "excalidraw"]),
  board: Object.freeze(["excalidraw"]),
  html: Object.freeze(["sandbox-iframe"])
});
var CONCERTO_HTML_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:;";
var ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
var isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
var isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";
function fail(code, detail) {
  return { ok: false, code, detail };
}
function hasLiveTaskLinksInMindmap(node) {
  if (!node || typeof node !== "object") return false;
  if (isNonEmptyString(node.taskId) || isNonEmptyString(node.executionId)) return true;
  return Array.isArray(node.children) && node.children.some((c) => hasLiveTaskLinksInMindmap(c));
}
function resolveSemanticKind(input, normalizedData = null) {
  const explicit = input?.semanticKind ?? normalizedData?.semanticKind ?? input?.data?.semanticKind;
  if (explicit !== void 0) {
    if (!VIEW_SEMANTIC_KINDS.includes(explicit)) {
      return fail("invalid", `semanticKind must be ${VIEW_SEMANTIC_KINDS.join(" | ")}`);
    }
    return { ok: true, semanticKind: explicit };
  }
  const d = normalizedData || input?.data || {};
  const hasLinks = Array.isArray(d.nodes) && d.nodes.some((n) => isNonEmptyString(n?.taskId) || isNonEmptyString(n?.executionId)) || Array.isArray(d.items) && d.items.some((it2) => isNonEmptyString(it2?.taskId)) || hasLiveTaskLinksInMindmap(d.root);
  if (hasLinks) return { ok: true, semanticKind: "live_execution" };
  if (input?.snapshotAt) return { ok: true, semanticKind: "snapshot" };
  return { ok: true, semanticKind: "blueprint" };
}
function normalizePublicView(publicView) {
  const summary = typeof publicView?.summary === "string" ? publicView.summary : "";
  const pinnedRefs = Array.isArray(publicView?.pinnedRefs) ? publicView.pinnedRefs : [];
  const sections = Array.isArray(publicView?.sections) ? publicView.sections : pinnedRefs.length > 0 ? [{ title: "", refs: pinnedRefs }] : [];
  const resolvedPinned = pinnedRefs.length > 0 ? pinnedRefs : sections.flatMap((s) => Array.isArray(s?.refs) ? s.refs : []);
  return {
    summary,
    pinnedRefs: resolvedPinned,
    sections,
    updatedAt: publicView?.updatedAt ?? null,
    updatedBy: publicView?.updatedBy ?? null
  };
}
function normalizeRequiredViewEntry(entry, defaults = {}) {
  if (typeof entry === "string") {
    const m = /^(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})$/.exec(entry.trim());
    if (!m) return null;
    return {
      type: m[1],
      id: m[2],
      title: `${m[1]}:${m[2]}`,
      taskId: defaults.taskId ?? null,
      requiredForAcceptance: Boolean(defaults.requiredForAcceptance),
      source: defaults.source || "template"
    };
  }
  if (!isPlainObject(entry) || !VIEW_OBJECT_TYPES.includes(entry.type) || typeof entry.id !== "string" || !ID_PATTERN.test(entry.id)) {
    return null;
  }
  return {
    type: entry.type,
    id: entry.id,
    title: isNonEmptyString(entry.title) ? entry.title.trim() : `${entry.type}:${entry.id}`,
    taskId: entry.taskId ?? defaults.taskId ?? null,
    requiredForAcceptance: Boolean(entry.requiredForAcceptance ?? defaults.requiredForAcceptance),
    source: defaults.source || entry.source || (entry.taskId || defaults.taskId ? "task" : "template")
  };
}
function extractRequiredViewsFromTask(task) {
  const specs = [];
  if (Array.isArray(task?.requiredViews)) {
    for (const raw of task.requiredViews) {
      const norm = normalizeRequiredViewEntry(raw, {
        taskId: task.taskId,
        requiredForAcceptance: raw?.requiredForAcceptance === true,
        source: "task"
      });
      if (norm) specs.push(norm);
    }
  }
  return specs;
}
var SHARED_TASK_ARTIFACT_TYPES = Object.freeze(["checklist", "table", "diagram", "mindmap"]);
function isSharedTaskArtifact(task, object) {
  return SHARED_TASK_ARTIFACT_TYPES.includes(object?.type) && (object.semanticKind ?? resolveSemanticKind(object, object.data).semanticKind) === "blueprint" && object.taskId === task?.taskId && object.layer !== "review" && object.roleKind !== "reviewer" && extractRequiredViewsFromTask(task).some((view) => view.type === object.type && view.id === object.id);
}
function parseViewObjectReferences(text) {
  const source = String(text ?? "");
  if (!source) return [];
  const lines = source.split(/\r?\n/);
  const tokens = [];
  let textBuf = [];
  const flushText = () => {
    if (textBuf.length > 0) {
      tokens.push({ kind: "text", text: textBuf.join("\n") });
      textBuf = [];
    }
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^```\s*concerto\b/i.test(trimmed)) {
      const endIdx = lines.findIndex((l, idx) => idx > i && /^```\s*$/.test(l.trim()));
      if (endIdx > i) {
        flushText();
        const bodyLines = lines.slice(i + 1, endIdx);
        const parsed = parseConcertoBlock(bodyLines);
        tokens.push(parsed);
        i = endIdx;
        continue;
      }
    }
    const lineMatch = /^(table|checklist|mindmap|diagram|html|board):([A-Za-z0-9._-]+)$/.exec(trimmed);
    if (lineMatch) {
      flushText();
      tokens.push({
        kind: "ref",
        type: lineMatch[1],
        id: lineMatch[2],
        raw: trimmed
      });
      continue;
    }
    textBuf.push(line);
  }
  flushText();
  return tokens;
}
function parseConcertoBlock(lines) {
  const raw = "```concerto\n" + lines.join("\n") + "\n```";
  const fields = {};
  for (const l of lines) {
    const m = /^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/.exec(l);
    if (m) fields[m[1]] = m[2];
  }
  const refMatch = /^(table|checklist|mindmap|diagram|html|board):([A-Za-z0-9._-]+)$/.exec(fields.ref || "");
  if (!refMatch) {
    return { kind: "ref_error", reason: "\u7F3A\u5C11\u6709\u6548\u7684 ref: <type>:<id> \u5B57\u6BB5", raw };
  }
  const type = refMatch[1];
  const id = refMatch[2];
  const renderer = fields.renderer || void 0;
  const size = VIEW_OBJECT_SIZES.includes(fields.size) ? fields.size : void 0;
  if (renderer && !ALLOWED_RENDERERS[type]?.includes(renderer)) {
    return { kind: "ref_error", type, id, renderer, reason: `${type} \u4E0D\u652F\u6301 renderer=${renderer}`, raw };
  }
  return {
    kind: "ref",
    type,
    id,
    ...renderer ? { renderer } : {},
    ...size ? { size } : {},
    ...fields.caption ? { caption: fields.caption } : {},
    raw
  };
}
function resolveViewObjectRef(viewObjects, ref, context = {}) {
  if (!Array.isArray(viewObjects) || !ref?.id || !ref?.type) {
    return { ok: false, code: "invalid_ref", reason: "\u65E0\u6548\u5F15\u7528\u683C\u5F0F" };
  }
  const byId = viewObjects.filter((o) => o.id === ref.id);
  if (byId.length === 0) {
    return { ok: false, code: "not_found", reason: `\u672A\u627E\u5230\u5BF9\u8C61 ${ref.type}:${ref.id}` };
  }
  const typed = byId.filter((o) => o.type === ref.type);
  if (typed.length === 0) {
    return {
      ok: false,
      code: "type_mismatch",
      reason: `\u7C7B\u578B\u4E0D\u5339\u914D\uFF1A\u5F15\u7528\u4E3A ${ref.type}\uFF0C\u5B9E\u9645\u5BF9\u8C61 ${ref.id} \u4E3A ${byId[0].type}`
    };
  }
  if (typed.length === 1) return { ok: true, object: typed[0] };
  if (context.taskId) {
    const taskMatch = typed.find((o) => o.taskId === context.taskId);
    if (taskMatch) return { ok: true, object: taskMatch };
  }
  if (context.authorId) {
    const authorMatch = typed.find((o) => o.authorId === context.authorId);
    if (authorMatch) return { ok: true, object: authorMatch };
  }
  if (Array.isArray(context.pinnedRefs)) {
    const isPinned = context.pinnedRefs.some((p) => p.id === ref.id && p.type === ref.type);
    if (isPinned) return { ok: true, object: typed[0] };
  }
  return { ok: true, ambiguous: true, object: typed[0] };
}
function reviewTargetItems({ type, data }) {
  if (type === "table") {
    return (data.rows ?? []).map((row, index) => ({
      id: `row-${index + 1}`,
      label: `\u7B2C ${index + 1} \u884C \xB7 ${row.map((cell) => String(cell ?? "")).join(" / ").slice(0, 100)}`
    }));
  }
  const items = [];
  const addItem = (item) => {
    if (item.id) items.push({ id: item.id, label: item.label || item.text || item.id });
  };
  if (type === "mindmap" && data.root) {
    const walk = (node) => {
      addItem(node);
      for (const child of node.children ?? []) walk(child);
    };
    walk(data.root);
  } else if (type === "checklist") {
    for (const item of data.items) addItem(item);
  } else if (type === "diagram" || type === "board") {
    for (const item of data.nodes ?? data.excalidrawScene?.elements ?? []) addItem(item);
  }
  return items;
}

// packages/dsh-concerto/src/client/components/StructuredObjectCard.js
var import_react14 = __toESM(require_react(), 1);
var import_react_dom2 = __toESM(require_react_dom(), 1);

// packages/dsh-concerto/src/client/components/renderers/useCanvasSession.js
var import_react7 = __toESM(require_react(), 1);
function normalizeViewport(value) {
  return {
    scale: Number.isFinite(value?.scale) && value.scale > 0 ? value.scale : 1,
    panX: Number.isFinite(value?.panX) ? value.panX : 0,
    panY: Number.isFinite(value?.panY) ? value.panY : 0
  };
}
function initialViewports(saved) {
  return {
    preview: normalizeViewport(saved),
    modal: saved.modalTransform ? normalizeViewport({ scale: saved.modalTransform.k, panX: saved.modalTransform.x, panY: saved.modalTransform.y }) : null
  };
}
function useCanvasSession(sessionId, objectId, defaultCollapsedIds = []) {
  const defaultsRef = import_react7.default.useRef(defaultCollapsedIds);
  defaultsRef.current = defaultCollapsedIds;
  const saved = import_react7.default.useMemo(() => readCanvasViewport(sessionId, objectId), [sessionId, objectId]);
  const [collapsedIds, setCollapsedIdsState] = import_react7.default.useState(() => Array.isArray(saved.collapsedIds) ? new Set(saved.collapsedIds) : new Set(defaultsRef.current));
  const [viewports, setViewports] = import_react7.default.useState(() => initialViewports(saved));
  import_react7.default.useEffect(() => {
    setCollapsedIdsState(Array.isArray(saved.collapsedIds) ? new Set(saved.collapsedIds) : new Set(defaultsRef.current));
    setViewports(initialViewports(saved));
  }, [saved]);
  const setCollapsedIds = import_react7.default.useCallback((nextValue) => {
    setCollapsedIdsState((current) => {
      const candidate = typeof nextValue === "function" ? nextValue(current) : nextValue;
      const next = new Set(candidate || []);
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current;
      writeCanvasViewport(sessionId, objectId, { collapsedIds: [...next].sort() });
      return next;
    });
  }, [sessionId, objectId]);
  const setViewport = import_react7.default.useCallback((mode, value) => {
    if (mode !== "preview" && mode !== "modal") return;
    setViewports((current) => {
      const nextViewport = value == null ? null : normalizeViewport(value);
      if (mode === "modal") {
        writeCanvasViewport(sessionId, objectId, {
          modalTransform: nextViewport ? { k: nextViewport.scale, x: nextViewport.panX, y: nextViewport.panY } : null
        });
      } else {
        const next = nextViewport || normalizeViewport();
        writeCanvasViewport(sessionId, objectId, { scale: next.scale, panX: next.panX, panY: next.panY });
      }
      return { ...current, [mode]: nextViewport };
    });
  }, [sessionId, objectId]);
  return import_react7.default.useMemo(() => ({ collapsedIds, viewports, setCollapsedIds, setViewport }), [collapsedIds, viewports, setCollapsedIds, setViewport]);
}

// packages/dsh-concerto/src/client/components/renderers/MarkmapRenderer.js
var import_react10 = __toESM(require_react(), 1);

// packages/dsh-concerto/src/client/components/renderers/exportUtils.js
function downloadTextFile(filename, content, mime = "text/plain;charset=utf-8") {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
function findMatchingVarEnd(text, openParenIndex) {
  let depth = 0;
  let quote = "";
  for (let i = openParenIndex; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function parseVarInner(inner) {
  let depth = 0;
  let quote = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      return {
        varName: inner.slice(0, i).trim(),
        fallbackExpr: inner.slice(i + 1).trim()
      };
    }
  }
  return { varName: inner.trim(), fallbackExpr: "" };
}
function replaceBalancedCssVars(text, resolver) {
  let cur = String(text ?? "");
  for (let pass = 0; pass < 4 && cur.includes("var(--"); pass++) {
    let out = "";
    let idx = 0;
    let changed = false;
    while (idx < cur.length) {
      const hit = cur.indexOf("var(--", idx);
      if (hit < 0) {
        out += cur.slice(idx);
        break;
      }
      const openIdx = hit + 3;
      const closeIdx = findMatchingVarEnd(cur, openIdx);
      if (closeIdx < 0) {
        out += cur.slice(idx);
        break;
      }
      out += cur.slice(idx, hit);
      const fullExpr = cur.slice(hit, closeIdx + 1);
      const { varName, fallbackExpr } = parseVarInner(cur.slice(openIdx + 1, closeIdx));
      const replacement = resolver(varName, fullExpr, fallbackExpr, hit, cur);
      if (typeof replacement === "string" && replacement !== fullExpr) {
        out += replacement;
        changed = true;
      } else {
        out += fullExpr;
      }
      idx = closeIdx + 1;
    }
    cur = out;
    if (!changed) break;
  }
  return cur;
}
function extractCssPropertyContext(text, varStartIndex) {
  const before = text.slice(Math.max(0, varStartIndex - 220), varStartIndex);
  const sepIdx = Math.max(before.lastIndexOf(";"), before.lastIndexOf("{"));
  const stmt = sepIdx >= 0 ? before.slice(sepIdx + 1) : before;
  const colonIdx = stmt.indexOf(":");
  if (colonIdx < 0) return "";
  return stmt.slice(0, colonIdx).trim().toLowerCase();
}
function buildExportTypographyMap(theme) {
  const px = (n) => `${Number(Number(n).toFixed(2))}px`;
  const baseFs = Number(theme?.fontSize) > 0 ? Number(theme.fontSize) : 14;
  const metaFs = Number(theme?.secondaryFontSize) > 0 ? Number(theme.secondaryFontSize) : Math.max(12, baseFs - 1);
  const codeFs = Number(theme?.codeFontSize) > 0 ? Number(theme.codeFontSize) : Math.max(11, baseFs - 3);
  const termFs = Number(theme?.terminalFontSize) > 0 ? Number(theme.terminalFontSize) : metaFs;
  const sans = theme?.fontFamily || "system-ui, sans-serif";
  const mono = theme?.codeFontFamily || "ui-monospace, monospace";
  return {
    "--cc-font-sans": sans,
    "--dsw-font-family": sans,
    "--dsh-font-family-text-default": sans,
    "--cc-font-mono": mono,
    "--ds-font-family-code": mono,
    "--dsh-font-family-code-default": mono,
    "--cc-font-size": px(baseFs),
    "--cc-fs-body": px(baseFs),
    "--dsh-content-font-size": px(baseFs),
    "--cc-font-size-secondary": px(metaFs),
    "--cc-fs-meta": px(metaFs),
    "--dsh-content-font-size-secondary": px(metaFs),
    "--cc-fs-caption": px(baseFs * 0.85),
    "--cc-fs-micro": px(baseFs * 0.72),
    "--cc-fs-title": px(baseFs * 1.07),
    "--cc-fs-display": px(baseFs * 1.25),
    "--cc-fs-code": px(codeFs),
    "--dsh-code-font-size": px(codeFs),
    "--cc-fs-terminal": px(termFs),
    "--dsh-terminal-font-size": px(termFs)
  };
}
function isColorPropertyOrToken(propName, varName) {
  if (/^(?:color|background|background-color|fill|stroke|stop-color|border-color|border-top-color|border-right-color|border-bottom-color|border-left-color|outline-color|text-decoration-color)$/.test(propName)) {
    return true;
  }
  if (/^--(?:markmap-.*(?:color|bg)|cc-(?:card|panel|canvas|overlay|text|border|accent|on-accent|state|branch)|dsw-alias-(?:bg|label|border|state|brand|link))/.test(propName)) {
    return true;
  }
  if (/^--(?:cc-(?:card|panel|canvas|overlay|text|border|accent|on-accent|state|branch)|dsw-alias-(?:bg|label|border|state|brand|link))/.test(varName)) {
    return true;
  }
  return false;
}
function extractDeclaredCustomProps(cssText, typoMap, hostEl, exp) {
  const locals = {};
  const re2 = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;}{]+?)\s*(?=[;}])/g;
  let m;
  while ((m = re2.exec(cssText)) !== null) {
    const [, prop, rawVal] = m;
    if (!rawVal.includes("var(--")) {
      locals[prop] = rawVal.trim();
      continue;
    }
    const resolvedVal = replaceBalancedCssVars(rawVal, (varName, fullExpr, fallbackExpr) => {
      if (Object.prototype.hasOwnProperty.call(typoMap, varName)) return typoMap[varName];
      if (Object.prototype.hasOwnProperty.call(locals, varName)) return locals[varName];
      if (/font|sans|mono|size|width|border|table/.test(prop)) {
        if (varName.includes("mono") || varName.includes("code")) return typoMap["--cc-font-mono"];
        if (varName.includes("sans") || varName.includes("family")) return typoMap["--cc-font-sans"];
        if (varName.includes("size") || varName.includes("fs-")) return resolveCssValue("font-size", fullExpr, typoMap["--cc-font-size"], hostEl);
        return fallbackExpr || fullExpr;
      }
      return resolveCssExpression(fullExpr, exp.textPrimary, hostEl);
    });
    locals[prop] = resolvedVal;
  }
  return locals;
}
function resolveCssVarsInDeclarations(cssText, theme, exp, hostEl) {
  const typoMap = buildExportTypographyMap(theme);
  const localProps = cssText.includes("--") ? extractDeclaredCustomProps(cssText, typoMap, hostEl, exp) : {};
  return replaceBalancedCssVars(cssText, (varName, fullExpr, fallbackExpr, hitIndex, currentText) => {
    if (Object.prototype.hasOwnProperty.call(typoMap, varName)) {
      return typoMap[varName];
    }
    const propName = extractCssPropertyContext(currentText, hitIndex);
    if (Object.prototype.hasOwnProperty.call(localProps, varName) && propName !== varName) {
      return localProps[varName];
    }
    if (propName === "font-family") {
      return varName.includes("mono") || varName.includes("code") ? theme.codeFontFamily : theme.fontFamily;
    }
    if (/^(?:font-size|line-height|stroke-width|border-radius|width|height|padding|margin|gap|letter-spacing)/.test(propName)) {
      const probeProp = propName === "stroke-width" || propName === "gap" ? "width" : propName;
      return resolveCssValue(probeProp, fullExpr, fallbackExpr || fullExpr, hostEl);
    }
    if (propName === "font") {
      if (varName.includes("mono") || varName.includes("code")) return theme.codeFontFamily;
      if (varName.includes("sans") || varName.includes("family")) return theme.fontFamily;
      if (varName.includes("size") || varName.includes("fs-")) {
        return resolveCssValue("font-size", fullExpr, `${theme.fontSize}px`, hostEl);
      }
      return fallbackExpr || `${typoMap["--cc-font-size"]}/1.45 ${theme.fontFamily}`;
    }
    if (isColorPropertyOrToken(propName, varName)) {
      return resolveCssExpression(fullExpr, exp.textPrimary, hostEl);
    }
    return fallbackExpr || resolveCssExpression(fullExpr, exp.textPrimary, hostEl);
  });
}
function replaceVarExpressions(value, hostEl, fallback = "") {
  const str = String(value ?? "");
  if (!str.includes("var(--")) return str;
  const trimmed = str.trim();
  if (/^(?:var|color-mix)\(/.test(trimmed)) {
    const resolved = resolveCssExpression(trimmed, fallback, hostEl);
    if (resolved && !resolved.includes("var(--")) return resolved;
  }
  return replaceBalancedCssVars(str, (_varName, full) => {
    const resolved = resolveCssExpression(full, fallback, hostEl);
    return resolved && !resolved.includes("var(--") ? resolved : full;
  });
}
function createExportResolutionHost(theme, fallbackParent) {
  if (!fallbackParent || typeof document === "undefined") return null;
  const exp = theme?.exportTheme || theme;
  const typoMap = buildExportTypographyMap(theme);
  const host = document.createElement("span");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:0;height:0;visibility:hidden;pointer-events:none;";
  const vars = {
    ...typoMap,
    "--cc-card-bg": exp.bgLayer1,
    "--cc-card-nested-bg": exp.bgLayer2,
    "--cc-panel-bg": exp.bgLayer2,
    "--cc-canvas-bg": exp.bgLayer1,
    "--cc-overlay-bg": exp.bgLayer2,
    "--cc-text-primary": exp.textPrimary,
    "--cc-text-secondary": exp.textSecondary,
    "--cc-text-muted": exp.textTertiary,
    "--cc-border": exp.borderColor,
    "--cc-border-subtle": exp.borderColor,
    "--cc-border-strong": exp.borderStrong,
    "--cc-accent": exp.accent,
    "--cc-accent-text": exp.accent,
    "--cc-on-accent": exp.onAccent || exp.textPrimary,
    "--cc-state-running": exp.accent,
    "--cc-state-attention": exp.warn,
    "--cc-state-review": exp.review,
    "--cc-state-done": exp.done,
    "--cc-state-blocked": exp.error,
    "--cc-state-unknown": exp.textTertiary,
    "--cc-branch-1": exp.accent,
    "--cc-branch-2": `color-mix(in srgb, ${exp.accent} 72%, ${exp.textSecondary})`,
    "--cc-branch-3": `color-mix(in srgb, ${exp.accent} 52%, ${exp.textSecondary})`,
    "--cc-branch-4": `color-mix(in srgb, ${exp.accent} 36%, ${exp.textSecondary})`,
    "--dsw-alias-bg-base": exp.bgLayer1,
    "--dsw-alias-bg-layer-1": exp.bgLayer1,
    "--dsw-alias-bg-layer-2": exp.bgLayer2,
    "--dsw-alias-label-primary": exp.textPrimary,
    "--dsw-alias-label-secondary": exp.textSecondary,
    "--dsw-alias-label-tertiary": exp.textTertiary,
    "--dsw-alias-state-business-primary": exp.accent,
    "--dsw-alias-border-l1": exp.borderColor,
    "--dsw-alias-border-l2": exp.borderColor,
    "--dsw-alias-border-l3": exp.borderStrong
  };
  for (const [k, v] of Object.entries(vars)) {
    if (v) host.style.setProperty(k, v);
  }
  fallbackParent.appendChild(host);
  return host;
}
function resolveSvgStylesForExport(svgClone, sourceSvg = null) {
  if (!svgClone || typeof document === "undefined") return svgClone;
  const fallbackParent = sourceSvg?.parentElement || document.body || document.documentElement;
  const theme = readResolvedHostTheme();
  const exp = theme.exportTheme || theme;
  const hostEl = createExportResolutionHost(theme, fallbackParent) || fallbackParent;
  try {
    svgClone.setAttribute("font-family", theme.fontFamily);
    svgClone.setAttribute("font-size", `${theme.fontSize}px`);
    if (!svgClone.style.fontFamily) svgClone.style.fontFamily = theme.fontFamily;
    if (!svgClone.style.fontSize) svgClone.style.fontSize = `${theme.fontSize}px`;
    if (!svgClone.style.color) svgClone.style.color = exp.textPrimary;
    svgClone.style.backgroundColor = exp.bgLayer1;
    svgClone.setAttribute("data-concerto-export-bg", exp.bgLayer1);
    svgClone.setAttribute("data-concerto-export-scheme", exp.colorScheme || theme.colorScheme);
    if (!svgClone.querySelector("[data-concerto-export-backdrop]")) {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("data-concerto-export-backdrop", "1");
      rect.setAttribute("x", "0");
      rect.setAttribute("y", "0");
      rect.setAttribute("width", "100%");
      rect.setAttribute("height", "100%");
      rect.setAttribute("fill", exp.bgLayer1);
      const insertRef = [...svgClone.children].find((c) => c.tagName?.toLowerCase() !== "defs" && c.tagName?.toLowerCase() !== "style") || null;
      svgClone.insertBefore(rect, insertRef);
    }
    const COLOR_ATTRS = ["fill", "stroke", "color", "stop-color"];
    const allNodes = [svgClone, ...svgClone.querySelectorAll("*")];
    for (const node of allNodes) {
      if (node.tagName?.toLowerCase() === "style" && node.textContent?.includes("var(--")) {
        node.textContent = resolveCssVarsInDeclarations(node.textContent, theme, exp, hostEl);
        continue;
      }
      for (const attr of COLOR_ATTRS) {
        const val = node.getAttribute?.(attr);
        if (val && val.includes("var(--")) {
          node.setAttribute(attr, replaceVarExpressions(val, hostEl, exp.textPrimary));
        } else if (attr === "fill" && val && val !== "none" && val !== "transparent" && node.closest?.("[data-concerto-rough-layer]")) {
          node.setAttribute("fill", exp.bgLayer2);
        }
      }
      const inlineStyle = node.getAttribute?.("style");
      if (inlineStyle && inlineStyle.includes("var(--")) {
        node.setAttribute("style", resolveCssVarsInDeclarations(inlineStyle, theme, exp, hostEl));
      }
      if (node.tagName?.toLowerCase() === "text") {
        if (!node.getAttribute("font-family")) node.setAttribute("font-family", theme.fontFamily);
        const fs = node.getAttribute("font-size");
        if (!fs || fs.includes("var(--")) {
          node.setAttribute("font-size", String(theme.secondaryFontSize || theme.fontSize));
        }
      }
    }
    return svgClone;
  } finally {
    if (hostEl !== fallbackParent) hostEl?.remove?.();
  }
}
function serializeSvgElement(svgEl, width = 800, height = 500) {
  if (!svgEl) return "";
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  resolveSvgStylesForExport(clone, svgEl);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}
function exportSvgElement(svgEl, filename, width, height) {
  const xml = serializeSvgElement(svgEl, width, height);
  if (xml) downloadTextFile(filename, xml, "image/svg+xml;charset=utf-8");
}
function exportPngFromSvgElement(svgEl, filename, width = 960, height = 600) {
  if (!svgEl || typeof document === "undefined") return;
  const theme = readResolvedHostTheme();
  const fillBg = theme.exportTheme?.bgLayer1 || theme.bgLayer1 || theme.bgBase;
  const xml = serializeSvgElement(svgEl, width, height);
  if (!xml) return;
  const img = new Image();
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    try {
      const vb = svgEl.viewBox?.baseVal;
      const w = Math.max(320, Math.round(vb?.width || width || 960));
      const hPx = Math.max(200, Math.round(vb?.height || height || 600));
      const canvas = document.createElement("canvas");
      canvas.width = w * 2;
      canvas.height = hPx * 2;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = fillBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, w, hPx);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1e3);
      }, "image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

// packages/dsh-concerto/src/client/components/renderers/SvgViewport.js
var import_react8 = __toESM(require_react(), 1);
function SvgViewport({ width, height, zoom, pan, onViewportChange, inModal, label: label2, tools, children }) {
  const stageRef = import_react8.default.useRef(null);
  const dragRef = import_react8.default.useRef(null);
  const [overflowing, setOverflowing] = import_react8.default.useState(false);
  const [hintVisible, setHintVisible] = import_react8.default.useState(false);
  const wasOverflowing = import_react8.default.useRef(false);
  import_react8.default.useEffect(() => {
    if (overflowing && !wasOverflowing.current) {
      setHintVisible(true);
      const timer = setTimeout(() => setHintVisible(false), 3e3);
      wasOverflowing.current = true;
      return () => clearTimeout(timer);
    }
    if (!overflowing) {
      setHintVisible(false);
      wasOverflowing.current = false;
    }
  }, [overflowing]);
  import_react8.default.useLayoutEffect(() => {
    const stage = stageRef.current;
    stage.scrollLeft = -pan.x;
    stage.scrollTop = -pan.y;
  }, [pan.x, pan.y, zoom, width, height]);
  import_react8.default.useLayoutEffect(() => {
    const stage = stageRef.current;
    const update = () => setOverflowing(stage.scrollWidth > stage.clientWidth + 1 || stage.scrollHeight > stage.clientHeight + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [zoom, width, height]);
  return h(
    "div",
    {
      className: "concerto-graph-frame",
      style: inModal ? { flex: 1, minHeight: 0 } : { height: Math.min(380, Math.max(160, height + 24)) }
    },
    h(
      "div",
      {
        ref: stageRef,
        className: "concerto-canvas-stage concerto-canvas-stage--readable",
        tabIndex: 0,
        role: "region",
        "aria-label": label2 + "\uFF0C\u53EF\u6EDA\u52A8\u67E5\u770B",
        onScroll: (event) => {
          const { scrollLeft, scrollTop } = event.currentTarget;
          if (Math.abs(pan.x + scrollLeft) > 1 || Math.abs(pan.y + scrollTop) > 1) {
            onViewportChange(zoom, { x: -scrollLeft, y: -scrollTop });
          }
        },
        onPointerDown: (event) => {
          if (event.pointerType !== "mouse" || event.button !== 0 || event.target.closest('button, [role="button"]')) return;
          const stage = event.currentTarget;
          dragRef.current = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop };
          stage.focus({ preventScroll: true });
          stage.setPointerCapture(event.pointerId);
          event.preventDefault();
        },
        onPointerMove: (event) => {
          const drag = dragRef.current;
          if (!drag) return;
          event.currentTarget.scrollLeft = drag.left + drag.x - event.clientX;
          event.currentTarget.scrollTop = drag.top + drag.y - event.clientY;
        },
        onPointerUp: () => {
          dragRef.current = null;
        },
        onPointerCancel: () => {
          dragRef.current = null;
        },
        onLostPointerCapture: () => {
          dragRef.current = null;
        }
      },
      h("div", {
        className: "concerto-graph-content",
        style: { width: Math.ceil(width * zoom), height: Math.ceil(height * zoom) }
      }, children)
    ),
    overflowing && hintVisible && h("span", { className: "concerto-graph-scroll-hint", "aria-hidden": true }, "\u6EDA\u52A8\u753B\u5E03\u67E5\u770B\u66F4\u591A"),
    tools && h("div", { className: "concerto-stage-tools" }, tools)
  );
}

// packages/dsh-concerto/src/client/components/renderers/MarkmapSvgDocument.js
var import_react9 = __toESM(require_react(), 1);
function branchStroke(branchIndex) {
  return `var(--cc-branch-${Math.abs(branchIndex || 0) % 4 + 1})`;
}
function nodeStrokeColor(node) {
  if (node.status === "blocked" || node.status === "failed") return "var(--cc-state-blocked)";
  if (node.status === "unknown") return "var(--cc-state-unknown)";
  return node.depth === 0 ? "var(--cc-border-strong)" : branchStroke(node.branchIndex);
}
function MarkmapSvgDocument({ layout, title, svgRef, onToggleNode }) {
  return h(
    "svg",
    {
      ref: svgRef,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      width: Math.ceil(layout.width * (layout.zoom || 1)),
      height: Math.ceil(layout.height * (layout.zoom || 1)),
      role: "group",
      "aria-label": title,
      style: { fontFamily: "var(--cc-font-sans)" }
    },
    h(
      "g",
      null,
      layout.edges.map((edge, index) => {
        const cx1 = edge.x1 + (edge.x2 - edge.x1) * 0.5;
        const d = `M ${edge.x1} ${edge.y1} C ${cx1} ${edge.y1}, ${cx1} ${edge.y2}, ${edge.x2} ${edge.y2}`;
        const isError = edge.status === "blocked" || edge.status === "failed";
        const isUnknown = edge.status === "unknown";
        const isWaiting = ["waiting_approval", "waiting_input", "attention"].includes(edge.status);
        const target = layout.nodes.find((node) => node.id === edge.targetId);
        const stroke = isError ? "var(--cc-state-blocked)" : isUnknown ? "var(--cc-state-unknown)" : isWaiting ? "var(--cc-state-attention)" : branchStroke(edge.branchIndex);
        return h("path", {
          key: index,
          d,
          fill: "none",
          stroke,
          strokeDasharray: isError || isUnknown || isWaiting ? "5 4" : void 0,
          strokeOpacity: 0.9,
          strokeWidth: Math.max(1.1, 2.2 - Math.max(0, (target?.depth || 1) - 1) * 0.4)
        });
      }),
      layout.nodes.map((node) => {
        const stroke = nodeStrokeColor(node);
        const isRoot = node.depth === 0;
        const boxed = !node.isLeaf && (isRoot || node.depth === 1);
        const fontSize = layout.fontSize;
        const lineHeight = layout.lineHeight || Math.round(fontSize * 1.4);
        const toggleWidth = node.collapsed ? Math.max(32, String(node.hiddenCount || 0).length * 10 + 18) : 24;
        return h(
          "g",
          {
            key: node.id,
            "data-concerto-mm-node": node.id,
            transform: `translate(${node.x}, ${node.y})`
          },
          h("title", null, node.fullLabel || node.label),
          h("rect", {
            x: 0,
            y: 0,
            width: node.width,
            height: node.height,
            rx: 8,
            fill: boxed ? isRoot ? "var(--cc-accent-soft)" : "var(--cc-card-bg)" : "transparent",
            stroke: boxed ? stroke : "none",
            strokeWidth: boxed ? 1.2 : 0
          }),
          !isRoot && h("rect", { x: 0, y: 4, width: 3, height: Math.max(0, node.height - 8), rx: 1.5, fill: stroke }),
          node.isLeaf && h("line", { x1: -10, y1: node.height / 2, x2: 0, y2: node.height / 2, stroke, strokeWidth: 1.2 }),
          node.lines.map((line, lineIndex) => h("text", {
            key: lineIndex,
            x: node.isLeaf ? 8 : 18,
            y: Math.round((node.height - node.lines.length * lineHeight) / 2 + fontSize + lineIndex * lineHeight),
            fill: isRoot ? "var(--cc-accent-text)" : "var(--cc-text-primary)",
            fontSize,
            fontWeight: isRoot ? 600 : 500
          }, line)),
          node.hasChildren && h(
            "g",
            {
              "data-concerto-mm-toggle": node.id,
              transform: `translate(${node.width}, ${node.height / 2})`,
              style: { cursor: "pointer" },
              role: "button",
              tabIndex: 0,
              "aria-label": `${node.collapsed ? "\u5C55\u5F00" : "\u6536\u8D77"}\uFF1A${node.fullLabel || node.label}`,
              "aria-expanded": !node.collapsed,
              onKeyDown: (event) => {
                if (event.key === " ") event.preventDefault();
                if (event.key === "Enter") onToggleNode(node.id, event);
              },
              onKeyUp: (event) => {
                if (event.key === " ") onToggleNode(node.id, event);
              },
              onClick: (event) => onToggleNode(node.id, event)
            },
            h("circle", { className: "concerto-mm-hit", cx: 0, cy: 0, r: 12, fill: "transparent", stroke: "none" }),
            h("rect", {
              x: -toggleWidth / 2,
              y: -12,
              width: toggleWidth,
              height: 24,
              rx: 12,
              fill: "var(--cc-card-nested-bg)",
              stroke,
              strokeWidth: 1
            }),
            h("text", {
              x: 0,
              y: 3.5,
              textAnchor: "middle",
              fill: "var(--cc-text-secondary)",
              fontSize: Math.max(10, Math.round(fontSize - 1)),
              fontWeight: 500
            }, node.collapsed ? `+${node.hiddenCount}` : "\u2212")
          )
        );
      })
    )
  );
}

// packages/dsh-concerto/src/client/components/renderers/MarkmapRenderer.js
function MarkmapRenderer({ object, sessionId = "", inModal = false, canvasSession: providedCanvasSession, onExpand = null }) {
  const hostTheme = useHostTheme();
  const dataSig = import_react10.default.useMemo(() => JSON.stringify(object?.data || null), [object?.data]);
  const root = import_react10.default.useMemo(() => {
    const raw = object?.data?.root ? object.data.root : object?.data?.markdown ? parseMarkdownToMindmap(object.data.markdown) : null;
    return raw ? normalizeMindmapTree(raw) : null;
  }, [dataSig, object?.title]);
  const defaultCollapsedIds = import_react10.default.useMemo(
    () => root ? defaultPreviewCollapsedIdsWithinBudget(root, { fontSize: hostTheme.fontSize }) : [],
    [root, hostTheme.fontSize]
  );
  const ownCanvasSession = useCanvasSession(sessionId, object?.id, defaultCollapsedIds);
  const canvasSession = providedCanvasSession || ownCanvasSession;
  const { collapsedIds, viewports, setCollapsedIds, setViewport } = canvasSession;
  const mode = inModal ? "modal" : "preview";
  const viewport = viewports[mode] || { scale: 1, panX: 0, panY: 0 };
  const zoom = viewport.scale;
  const pan = { x: viewport.panX, y: viewport.panY };
  const svgRef = import_react10.default.useRef(null);
  const totalNodes = import_react10.default.useMemo(() => root ? countMindmapNodes(root) : 0, [root]);
  const layout = import_react10.default.useMemo(
    () => root ? layoutMindmapTree(root, collapsedIds, { fontSize: hostTheme.fontSize }) : { nodes: [], edges: [], width: 0, height: 0, hiddenDescendantTotal: 0 },
    [root, collapsedIds, hostTheme.fontSize]
  );
  import_react10.default.useEffect(() => {
    if (!root) return;
    const validIds = /* @__PURE__ */ new Set();
    const walk = (node) => {
      validIds.add(node.id);
      for (const child of node.children || []) walk(child);
    };
    walk(root);
    setCollapsedIds((current) => {
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [root, setCollapsedIds]);
  const updateViewport = import_react10.default.useCallback((nextZoom, nextPan) => {
    setViewport(mode, { scale: nextZoom, panX: nextPan.x, panY: nextPan.y });
  }, [mode, setViewport]);
  const fitView = import_react10.default.useCallback(() => {
    const stage = svgRef.current?.closest(".concerto-canvas-stage");
    if (!stage || !layout.width || !layout.height) return;
    const nextZoom = Math.max(0.1, Math.min(1, stage.clientWidth / layout.width, stage.clientHeight / layout.height));
    updateViewport(nextZoom, { x: 0, y: 0 });
  }, [layout.width, layout.height, updateViewport]);
  import_react10.default.useLayoutEffect(() => {
    if (!inModal || viewports.modal) return;
    const frame = requestAnimationFrame(fitView);
    return () => cancelAnimationFrame(frame);
  }, [inModal, object?.id, viewports.modal, fitView]);
  if (!root) return h("p", { style: styles.muted }, "\u601D\u7EF4\u5BFC\u56FE\u5185\u5BB9\u4E3A\u7A7A\u3002");
  function updateCollapsed(nextSet) {
    setCollapsedIds(nextSet);
  }
  function toggleNode(id, event) {
    event.stopPropagation();
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const hiddenCount = layout.hiddenDescendantTotal || 0;
  const canFoldMore = totalNodes > 8 && collapsedIds.size === 0;
  const branchCount = root.children?.length || 0;
  const summaryText = inModal ? `\u5171 ${totalNodes} \u8282\u70B9` + (hiddenCount > 0 ? ` \xB7 \u5F53\u524D\u5C55\u793A ${layout.nodes.length} \u9879\uFF08\u5DF2\u6298\u53E0 ${hiddenCount} \u9879\uFF09` : " \xB7 \u5DF2\u5C55\u5F00\u5168\u90E8") : `${branchCount} \u4E2A\u5206\u652F \xB7 ${totalNodes} \u9879` + (hiddenCount > 0 ? ` \xB7 \u6298\u53E0 ${hiddenCount} \u9879` : "");
  const zoomOutBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost concerto-btn--icon" : "concerto-btn",
    "aria-label": "\u7F29\u5C0F",
    title: "\u7F29\u5C0F",
    onClick: () => updateViewport(Math.max(0.1, Number((zoom - 0.15).toFixed(2))), pan)
  }, iconOnly ? "\u2212" : "\u7F29\u5C0F");
  const zoomInBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost concerto-btn--icon" : "concerto-btn",
    "aria-label": "\u653E\u5927",
    title: "\u653E\u5927",
    onClick: () => updateViewport(Math.min(2.4, Number((zoom + 0.15).toFixed(2))), pan)
  }, iconOnly ? "+" : "\u653E\u5927");
  const fitBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost concerto-btn--icon" : "concerto-btn",
    "aria-label": "\u9002\u5E94\u7A97\u53E3",
    title: "\u9002\u5E94\u7A97\u53E3",
    onClick: fitView
  }, iconOnly ? h(UiIcon, { name: "expand" }) : "\u9002\u5E94\u7A97\u53E3");
  const actualSizeBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost" : "concerto-btn",
    "aria-label": "\u539F\u59CB\u5B57\u53F7",
    title: "\u6309\u5BBF\u4E3B\u539F\u59CB\u5B57\u53F7\u663E\u793A",
    onClick: () => updateViewport(1, { x: 0, y: 0 })
  }, iconOnly ? "100%" : "\u539F\u59CB\u5B57\u53F7");
  return h(
    "div",
    {
      "data-concerto-renderer-root": "markmap",
      style: inModal ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : void 0
    },
    inModal && h(
      "div",
      { className: "concerto-canvas-bar" },
      h("span", { className: "concerto-num" }, summaryText),
      h(
        "div",
        { className: "concerto-canvas-btns" },
        hiddenCount > 0 && h("button", {
          type: "button",
          className: "concerto-btn",
          "data-concerto-mm-expand-all": "true",
          onClick: () => updateCollapsed(/* @__PURE__ */ new Set())
        }, "\u5C55\u5F00\u5168\u90E8"),
        canFoldMore && h("button", {
          type: "button",
          className: "concerto-btn",
          onClick: () => updateCollapsed(new Set(defaultPreviewCollapsedIds(root, 8, 1)))
        }, "\u6536\u8D77\u6DF1\u5C42"),
        zoomOutBtn(false),
        zoomInBtn(false),
        actualSizeBtn(false),
        fitBtn(false)
      ),
      h(
        "div",
        { className: "concerto-canvas-export" },
        h("button", { type: "button", className: "concerto-btn", onClick: () => exportSvgElement(svgRef.current, `${object.id}.svg`, layout.width, layout.height) }, "\u5BFC\u51FA SVG"),
        h("button", { type: "button", className: "concerto-btn", onClick: () => exportPngFromSvgElement(svgRef.current, `${object.id}.png`, layout.width, layout.height) }, "\u5BFC\u51FA PNG")
      )
    ),
    h(SvgViewport, {
      width: layout.width,
      height: layout.height,
      zoom,
      pan,
      onViewportChange: updateViewport,
      inModal,
      label: object.title || "\u8BA1\u5212\u5BFC\u56FE",
      tools: !inModal && h(import_react10.default.Fragment, null, zoomOutBtn(true), zoomInBtn(true), actualSizeBtn(true), fitBtn(true))
    }, h(MarkmapSvgDocument, {
      layout: { ...layout, zoom },
      title: object.title || "\u8BA1\u5212\u5BFC\u56FE",
      svgRef,
      onToggleNode: toggleNode
    })),
    !inModal && h(
      "div",
      { className: "concerto-canvas-foot" },
      h("span", { className: "concerto-num" }, summaryText),
      h(
        "span",
        { style: { display: "inline-flex", gap: 10, alignItems: "center" } },
        hiddenCount > 0 && h("button", {
          type: "button",
          className: "concerto-link",
          "data-concerto-mm-expand-all": "true",
          onClick: () => updateCollapsed(/* @__PURE__ */ new Set())
        }, "\u5C55\u5F00\u5168\u90E8"),
        canFoldMore && h("button", {
          type: "button",
          className: "concerto-link",
          onClick: () => updateCollapsed(new Set(defaultPreviewCollapsedIds(root, 8, 1)))
        }, "\u6536\u8D77\u6DF1\u5C42"),
        onExpand && h("button", {
          type: "button",
          className: "concerto-link",
          "aria-label": "\u5168\u5C4F\u67E5\u770B",
          onClick: onExpand
        }, h(UiIcon, { name: "expand", size: 12 }), "\u5168\u5C4F")
      )
    )
  );
}

// packages/dsh-concerto/src/client/components/renderers/SvgDiagramRenderer.js
var import_react11 = __toESM(require_react(), 1);
var LAYOUT_LABELS = { dag: "\u4F9D\u8D56 DAG", timeline: "\u65F6\u95F4\u7EBF", radial: "\u4E2D\u5FC3\u8F90\u5C04", swimlane: "\u6210\u5458\u6CF3\u9053" };
function statusCssVar(status) {
  switch (status) {
    case "done":
    case "completed":
      return "var(--cc-state-done)";
    case "running":
    case "in_progress":
      return "var(--cc-state-running)";
    case "attention":
    case "waiting_approval":
    case "waiting_input":
    case "cancelling":
      return "var(--cc-state-attention)";
    case "review":
      return "var(--cc-state-review)";
    case "blocked":
    case "failed":
      return "var(--cc-state-blocked)";
    case "unknown":
      return "var(--cc-state-unknown)";
    default:
      return "var(--cc-text-muted)";
  }
}
function statusGroup(status) {
  if (status === "done" || status === "completed") return ["completed", "\u5B8C\u6210"];
  if (["waiting_approval", "waiting_input", "attention"].includes(status)) return ["waiting_approval", "\u7B49\u5F85"];
  if (status === "running" || status === "in_progress") return ["running", "\u8FDB\u884C\u4E2D"];
  if (status === "review") return ["review", "\u5F85\u9A8C\u6536"];
  if (status === "blocked" || status === "failed") return ["blocked", "\u963B\u585E"];
  if (status === "unknown") return ["unknown", "\u672A\u77E5"];
  return ["pending", "\u5F85\u529E"];
}
function edgeAppearance(semantic, highlightCritical) {
  if (semantic === "blocked") {
    return { stroke: "var(--cc-state-blocked)", width: 1.8, dash: "6 4", markerSuffix: "-blocked" };
  }
  if (semantic === "unknown") {
    return { stroke: "var(--cc-state-unknown)", width: 1.8, dash: "6 4", markerSuffix: "-unknown" };
  }
  if (semantic === "waiting") {
    return { stroke: "var(--cc-state-attention)", width: 1.8, dash: "6 4", markerSuffix: "-waiting" };
  }
  if (semantic === "critical" && highlightCritical) {
    return { stroke: "var(--cc-accent)", width: 2.2, dash: void 0, markerSuffix: "-crit" };
  }
  return { stroke: "var(--cc-border-strong)", width: 1.5, dash: void 0, markerSuffix: "" };
}
function SvgDiagramRenderer({ object, sessionId = "", inModal = false, onJumpTask = null }) {
  const hostTheme = useHostTheme();
  const initialVp = import_react11.default.useMemo(() => readCanvasViewport(sessionId, object?.id), [sessionId, object?.id]);
  const [zoom, setZoom] = import_react11.default.useState(() => initialVp.scale || 1);
  const [pan, setPan] = import_react11.default.useState(() => ({ x: initialVp.panX || 0, y: initialVp.panY || 0 }));
  const [highlightCritical, setHighlightCritical] = import_react11.default.useState(true);
  const svgRef = import_react11.default.useRef(null);
  import_react11.default.useEffect(() => {
    const vp = readCanvasViewport(sessionId, object?.id);
    setZoom(vp.scale || 1);
    setPan({ x: vp.panX || 0, y: vp.panY || 0 });
  }, [sessionId, object?.id]);
  const updateViewport = import_react11.default.useCallback((nextZoom, nextPan) => {
    setZoom(nextZoom);
    setPan(nextPan);
    writeCanvasViewport(sessionId, object?.id, { scale: nextZoom, panX: nextPan.x, panY: nextPan.y });
  }, [sessionId, object?.id]);
  const rawData = object?.data || {};
  const layoutMode = rawData.layout || "dag";
  const layout = import_react11.default.useMemo(() => layoutDiagram(rawData, {
    direction: object?.layoutHints?.direction,
    criticalPath: highlightCritical ? object?.layoutHints?.criticalPath : [],
    userOffsets: object?.userLayout?.offsets,
    fontSize: hostTheme.fontSize,
    semanticKind: object?.semanticKind
  }), [rawData, object?.layoutHints, object?.userLayout?.offsets, object?.semanticKind, highlightCritical, hostTheme.fontSize]);
  const markerId = "concerto-arrow-" + import_react11.default.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!layout.nodes.length) return h("p", { style: styles.muted }, "\u56FE\u8C31\u6682\u65E0\u8282\u70B9\u3002");
  const hasCritical = layout.nodes.some((n) => n.critical) || layout.edges.some((e) => e.critical || e.semantic === "critical");
  const fs = Math.max(12, layout.fontSize || 12.5);
  const lh = layout.lineHeight || Math.round(fs * 1.38);
  const summaryText = (LAYOUT_LABELS[layoutMode] || layoutMode) + " \xB7 " + layout.nodes.length + " \u8282\u70B9 / " + layout.edges.length + " \u8FDE\u7EBF";
  const statusCounts = /* @__PURE__ */ new Map();
  for (const node of layout.nodes) {
    const [status, text] = statusGroup(node.status);
    const current = statusCounts.get(status) || { status, text, count: 0 };
    current.count += 1;
    statusCounts.set(status, current);
  }
  const edgeLegend = [...new Set(layout.edges.map((edge) => edge.semantic).filter((semantic) => semantic && semantic !== "default"))];
  const edgeLegendLabels = { critical: "\u5173\u952E\u8DEF\u5F84", waiting: "\u7B49\u5F85", blocked: "\u963B\u585E", unknown: "\u672A\u77E5" };
  const zoomOutBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost concerto-btn--icon" : "concerto-btn",
    "aria-label": "\u7F29\u5C0F",
    title: "\u7F29\u5C0F",
    onClick: () => updateViewport(Math.max(0.1, Number((zoom - 0.15).toFixed(2))), pan)
  }, iconOnly ? "\u2212" : "\u7F29\u5C0F");
  const zoomInBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost concerto-btn--icon" : "concerto-btn",
    "aria-label": "\u653E\u5927",
    title: "\u653E\u5927",
    onClick: () => updateViewport(Math.min(2.4, Number((zoom + 0.15).toFixed(2))), pan)
  }, iconOnly ? "+" : "\u653E\u5927");
  const fitBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost concerto-btn--icon" : "concerto-btn",
    "aria-label": "\u9002\u5E94\u7A97\u53E3",
    title: "\u9002\u5E94\u7A97\u53E3",
    onClick: () => {
      const stage = svgRef.current.closest(".concerto-canvas-stage");
      updateViewport(Math.min(1, stage.clientWidth / layout.width, stage.clientHeight / layout.height), { x: 0, y: 0 });
    }
  }, iconOnly ? h(UiIcon, { name: "expand" }) : "\u9002\u5E94\u7A97\u53E3");
  const actualSizeBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost" : "concerto-btn",
    "aria-label": "\u539F\u59CB\u5B57\u53F7",
    title: "\u6309\u5BBF\u4E3B\u539F\u59CB\u5B57\u53F7\u663E\u793A",
    onClick: () => updateViewport(1, { x: 0, y: 0 })
  }, iconOnly ? "100%" : "\u539F\u59CB\u5B57\u53F7");
  return h(
    "div",
    {
      "data-concerto-renderer-root": "svg",
      style: inModal ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : void 0
    },
    inModal && h(
      "div",
      { className: "concerto-canvas-bar" },
      h("span", { className: "concerto-num" }, summaryText),
      h(
        "div",
        { className: "concerto-canvas-btns" },
        hasCritical && h("button", { type: "button", className: "concerto-btn", onClick: () => setHighlightCritical((v) => !v) }, highlightCritical ? "\u9690\u85CF\u5F3A\u8C03\u8DEF\u5F84" : "\u5F3A\u8C03\u8DEF\u5F84"),
        zoomOutBtn(false),
        zoomInBtn(false),
        actualSizeBtn(false),
        fitBtn(false)
      ),
      h(
        "div",
        { className: "concerto-canvas-export" },
        h("button", { type: "button", className: "concerto-btn", onClick: () => exportSvgElement(svgRef.current, `${object.id}.svg`, layout.width, layout.height) }, "\u5BFC\u51FA SVG"),
        h("button", { type: "button", className: "concerto-btn", onClick: () => exportPngFromSvgElement(svgRef.current, `${object.id}.png`, layout.width, layout.height) }, "\u5BFC\u51FA PNG")
      )
    ),
    h(
      SvgViewport,
      {
        width: layout.width,
        height: layout.height,
        zoom,
        pan,
        onViewportChange: updateViewport,
        inModal,
        label: object.title || "\u4EFB\u52A1\u4F9D\u8D56\u56FE",
        tools: !inModal && h(import_react11.default.Fragment, null, zoomOutBtn(true), zoomInBtn(true), actualSizeBtn(true), fitBtn(true))
      },
      h(
        "svg",
        {
          ref: svgRef,
          viewBox: `0 0 ${layout.width} ${layout.height}`,
          width: Math.ceil(layout.width * zoom),
          height: Math.ceil(layout.height * zoom),
          role: "img",
          "aria-label": object.title || "\u4EFB\u52A1\u4F9D\u8D56\u56FE",
          "aria-describedby": markerId + "-description",
          style: { fontFamily: "var(--cc-font-sans)" }
        },
        h(
          "desc",
          { id: markerId + "-description" },
          layout.nodes.map((node) => `${node.fullLabel}\uFF1A${(STATUS_TOKENS[node.status] || STATUS_TOKENS.pending).label}`).join("\uFF1B") + "\u3002\u5173\u7CFB\uFF1A" + layout.edges.map((edge) => `${layout.nodes.find((node) => node.id === edge.from).fullLabel} \u2192 ${layout.nodes.find((node) => node.id === edge.to).fullLabel}`).join("\uFF1B")
        ),
        h(
          "defs",
          null,
          h(
            "marker",
            { id: markerId, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
            h("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: "var(--cc-border-strong)" })
          ),
          h(
            "marker",
            { id: markerId + "-crit", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
            h("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: "var(--cc-accent)" })
          ),
          h(
            "marker",
            { id: markerId + "-blocked", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: "auto-start-reverse" },
            h("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: "var(--cc-state-blocked)" })
          ),
          h(
            "marker",
            { id: markerId + "-unknown", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: "auto-start-reverse" },
            h("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: "var(--cc-state-unknown)" })
          ),
          h(
            "marker",
            { id: markerId + "-waiting", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: "auto-start-reverse" },
            h("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: "var(--cc-state-attention)" })
          )
        ),
        h(
          "g",
          null,
          (layout.lanes || []).map((lane) => {
            const laneText = lane.memberId ? `@${lane.memberId}` : lane.label;
            const laneBoxW = Math.max(96, Math.round(approxLineWidth(laneText, fs) + 24));
            return h(
              "g",
              { key: lane.id },
              h("rect", {
                x: 8,
                y: lane.y,
                width: layout.width - 16,
                height: lane.height,
                rx: 8,
                fill: lane.index % 2 === 0 ? "var(--cc-card-nested-bg)" : "transparent",
                stroke: "var(--cc-border)",
                strokeDasharray: "4 4"
              }),
              h("rect", {
                x: 16,
                y: lane.y + 12,
                width: laneBoxW,
                height: 28,
                rx: 8,
                fill: "var(--cc-card-bg)",
                stroke: "var(--cc-border)"
              }),
              h("text", {
                x: 26,
                y: lane.y + 30,
                fill: "var(--cc-text-primary)",
                fontSize: Math.max(11, Math.round(fs - 0.5)),
                fontWeight: 600
              }, laneText)
            );
          }),
          layout.edges.map((e, idx) => {
            const app = edgeAppearance(e.semantic, highlightCritical);
            const labelW = e.labelWidth;
            return h(
              "g",
              { key: idx, "data-concerto-edge-semantic": e.semantic || "default" },
              h("path", {
                d: e.path || `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`,
                fill: "none",
                stroke: app.stroke,
                strokeWidth: app.width,
                strokeDasharray: app.dash,
                strokeOpacity: e.semantic === "default" ? 0.85 : 0.95,
                markerEnd: `url(#${markerId + app.markerSuffix})`
              }),
              e.label && h(
                "g",
                null,
                h("rect", {
                  x: e.midX - Math.round(labelW / 2),
                  y: e.midY - e.labelHeight / 2,
                  width: labelW,
                  height: e.labelHeight,
                  rx: 6,
                  fill: "var(--cc-canvas-bg)",
                  stroke: "var(--cc-border-subtle)"
                }),
                h("text", {
                  x: e.midX,
                  y: e.midY + e.labelFontSize * 0.35,
                  textAnchor: "middle",
                  fill: e.semantic === "default" ? "var(--cc-text-secondary)" : app.stroke,
                  fontSize: e.labelFontSize,
                  fontWeight: 500
                }, e.label)
              )
            );
          }),
          layout.nodes.map((n) => {
            const st2 = STATUS_TOKENS[n.status] || STATUS_TOKENS.pending;
            const stColor = statusCssVar(n.status);
            const completed = n.status === "done" || n.status === "completed";
            const interactive = object.semanticKind === "live_execution" && n.taskId && typeof onJumpTask === "function";
            const activate = (event) => {
              if (!interactive) return;
              event.stopPropagation();
              onJumpTask(n.taskId);
            };
            return h(
              "g",
              {
                key: n.id,
                className: "concerto-diagram-node",
                "data-concerto-diag-node": n.id,
                "data-status": n.status || "pending",
                "data-task-id": interactive ? n.taskId : void 0,
                transform: `translate(${n.x}, ${n.y})`,
                role: interactive ? "button" : void 0,
                tabIndex: interactive ? 0 : void 0,
                "aria-label": interactive ? `\u6253\u5F00\u4EFB\u52A1 ${n.taskId}\uFF1A${n.fullLabel || n.label}` : void 0,
                onClick: interactive ? activate : void 0,
                onKeyDown: interactive ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate(event);
                  }
                } : void 0
              },
              h("title", null, (n.fullLabel || n.label) + (n.status ? " \xB7 " + st2.label : "")),
              h("rect", {
                x: 0,
                y: 0,
                width: n.width,
                height: n.height,
                rx: 8,
                fill: completed ? "var(--cc-card-nested-bg)" : "var(--cc-card-bg)",
                stroke: n.status === "blocked" || n.status === "failed" ? "var(--cc-state-blocked)" : n.status === "unknown" ? "var(--cc-state-unknown)" : "var(--cc-border-subtle)",
                strokeDasharray: n.status === "unknown" ? "5 3" : void 0,
                strokeWidth: 1.2
              }),
              h("rect", { x: 0, y: 0, width: 4, height: n.height, rx: 2, fill: stColor }),
              n.lines.map((line, li) => h("text", {
                key: li,
                x: 18,
                y: Math.round(fs + 12 + li * lh),
                fill: completed ? "var(--cc-text-secondary)" : "var(--cc-text-primary)",
                fontSize: fs,
                fontWeight: 600
              }, line)),
              n.status && h("text", {
                x: 18,
                y: n.height - 12,
                fill: stColor,
                fontSize: Math.max(11, Math.round(fs - 0.5)),
                fontWeight: 600
              }, `${st2.icon} ${st2.label}`)
            );
          })
        )
      )
    ),
    !inModal && h(
      "div",
      { className: "concerto-canvas-foot concerto-diagram-foot" },
      h(
        "div",
        { className: "concerto-diagram-status-summary", "aria-label": "\u8282\u70B9\u72B6\u6001\u7EDF\u8BA1" },
        [...statusCounts.values()].map((item) => h(
          "span",
          { key: item.status },
          h(StatusIcon, { status: item.status, size: 12 }),
          `${item.count} ${item.text}`
        ))
      ),
      edgeLegend.length > 0 && h(
        "div",
        { className: "concerto-diagram-edge-legend", "aria-label": "\u8FDE\u7EBF\u56FE\u4F8B" },
        edgeLegend.map((semantic) => h("span", { key: semantic, "data-semantic": semantic }, edgeLegendLabels[semantic] || semantic))
      )
    )
  );
}

// packages/dsh-concerto/src/client/components/renderers/ExcalidrawRenderer.js
var import_react12 = __toESM(require_react(), 1);
var cachedRoughPromise = null;
function loadRoughModule() {
  if (!cachedRoughPromise) {
    cachedRoughPromise = import(
      /* webpackIgnore: true */
      API + "/assets/rough.js"
    ).then((mod) => mod?.default || mod?.rough || mod).catch(() => null);
  }
  return cachedRoughPromise;
}
function buildSketchySvgBox(x, y, w, hBox) {
  return `M ${x + 3} ${y + 1} C ${x + w * 0.35} ${y - 1}, ${x + w * 0.7} ${y + 2}, ${x + w - 2} ${y + 1} C ${x + w + 1} ${y + hBox * 0.4}, ${x + w - 1} ${y + hBox * 0.7}, ${x + w - 2} ${y + hBox - 1} C ${x + w * 0.65} ${y + hBox + 1}, ${x + w * 0.3} ${y + hBox - 1}, ${x + 2} ${y + hBox} C ${x - 1} ${y + hBox * 0.65}, ${x + 1} ${y + hBox * 0.3}, ${x + 3} ${y + 1}`;
}
function resolvedStatusColor(status, theme) {
  switch (status) {
    case "done":
    case "completed":
      return theme.done;
    case "running":
    case "in_progress":
      return theme.accent;
    case "attention":
    case "waiting_approval":
    case "waiting_input":
    case "cancelling":
      return theme.warn;
    case "review":
      return theme.review;
    case "blocked":
    case "failed":
      return theme.error;
    case "unknown":
      return theme.textSecondary;
    default:
      return theme.borderStrong;
  }
}
function statusCssVar2(status) {
  switch (status) {
    case "done":
    case "completed":
      return "var(--cc-state-done)";
    case "running":
    case "in_progress":
      return "var(--cc-state-running)";
    case "attention":
    case "waiting_approval":
    case "waiting_input":
    case "cancelling":
      return "var(--cc-state-attention)";
    case "review":
      return "var(--cc-state-review)";
    case "blocked":
    case "failed":
      return "var(--cc-state-blocked)";
    case "unknown":
      return "var(--cc-state-unknown)";
    default:
      return "var(--cc-border-strong)";
  }
}
function edgeAppearance2(semantic) {
  if (semantic === "blocked") return { stroke: "var(--cc-state-blocked)", width: 1.8, dash: "6 4", markerSuffix: "-blocked" };
  if (semantic === "unknown") return { stroke: "var(--cc-state-unknown)", width: 1.8, dash: "6 4", markerSuffix: "-unknown" };
  if (semantic === "critical") return { stroke: "var(--cc-accent)", width: 2.2, dash: void 0, markerSuffix: "-crit" };
  return { stroke: "var(--cc-border-strong)", width: 1.5, dash: void 0, markerSuffix: "" };
}
var EXCALIDRAW_SYNC_EVENT = "concerto:excalidraw-user-layout";
function ExcalidrawRenderer({ object, sessionId, inModal = false }) {
  const hostTheme = useHostTheme();
  const persistedOffsets = object?.userLayout?.offsets || {};
  const persistedLabels = object?.userLayout?.labelOverrides || {};
  const persistedNotes = Array.isArray(object?.userLayout?.annotations) ? object.userLayout.annotations : [];
  const initialVp = import_react12.default.useMemo(() => readCanvasViewport(sessionId, object?.id), [sessionId, object?.id]);
  const [userOffsets, setUserOffsets] = import_react12.default.useState(() => persistedOffsets);
  const [labelOverrides, setLabelOverrides] = import_react12.default.useState(() => persistedLabels);
  const [annotations, setAnnotations] = import_react12.default.useState(() => persistedNotes);
  const [userLayoutVer, setUserLayoutVer] = import_react12.default.useState(() => object?.userLayout?.version ?? 0);
  const [editingNodeId, setEditingNodeId] = import_react12.default.useState("");
  const [editingDraft, setEditingDraft] = import_react12.default.useState("");
  const [addingNote, setAddingNote] = import_react12.default.useState(false);
  const [noteDraft, setNoteDraft] = import_react12.default.useState("");
  const [pendingMergeObj, setPendingMergeObj] = import_react12.default.useState(null);
  const [appliedObj, setAppliedObj] = import_react12.default.useState(object);
  const [zoom, setZoom] = import_react12.default.useState(() => initialVp.scale || 1);
  const [pan, setPan] = import_react12.default.useState(() => ({ x: initialVp.panX || 0, y: initialVp.panY || 0 }));
  const [roughApi, setRoughApi] = import_react12.default.useState(null);
  const [saveNote, setSaveNote] = import_react12.default.useState("");
  const [saving, setSaving] = import_react12.default.useState(false);
  const [failedSave, setFailedSave] = import_react12.default.useState(null);
  const savingRef = import_react12.default.useRef(false);
  const userVersionRef = import_react12.default.useRef(userLayoutVer);
  const editId = import_react12.default.useId();
  const noteId = import_react12.default.useId();
  const activeDragRef = import_react12.default.useRef(null);
  const svgRef = import_react12.default.useRef(null);
  const roughOverlayRef = import_react12.default.useRef(null);
  const editInputRef = import_react12.default.useRef(null);
  const instanceIdRef = import_react12.default.useRef(Math.random().toString(36).slice(2));
  const isActivelyEditing = Boolean(editingNodeId) || addingNote || inModal;
  import_react12.default.useEffect(() => {
    if (editingNodeId) editInputRef.current?.focus();
  }, [editingNodeId]);
  const broadcastUserLayer = import_react12.default.useCallback((nextOffsets, nextLabels, nextNotes, version, viewport, saveStatus) => {
    if (typeof window === "undefined" || !object?.id) return;
    try {
      window.dispatchEvent(new CustomEvent(EXCALIDRAW_SYNC_EVENT, {
        detail: {
          source: instanceIdRef.current,
          sessionId: sessionId || "",
          objectId: object.id,
          offsets: nextOffsets,
          labelOverrides: nextLabels,
          annotations: nextNotes,
          version,
          viewport,
          saveStatus
        }
      }));
    } catch {
    }
  }, [sessionId, object?.id]);
  import_react12.default.useEffect(() => {
    if (typeof window === "undefined" || !object?.id) return;
    const onSync = (ev) => {
      const d = ev?.detail;
      if (!d || d.source === instanceIdRef.current) return;
      if (d.sessionId !== (sessionId || "") || d.objectId !== object.id) return;
      if (d.offsets) setUserOffsets(d.offsets);
      if (d.labelOverrides) setLabelOverrides(d.labelOverrides);
      if (Array.isArray(d.annotations)) setAnnotations(d.annotations);
      if (typeof d.version === "number") {
        userVersionRef.current = d.version;
        setUserLayoutVer(d.version);
      }
      if (d.saveStatus) {
        savingRef.current = d.saveStatus.phase === "saving";
        setSaving(savingRef.current);
        setSaveNote(d.saveStatus.note);
        setFailedSave(d.saveStatus.failure || null);
      }
      if (d.viewport) {
        setZoom(d.viewport.scale || 1);
        setPan({ x: d.viewport.panX || 0, y: d.viewport.panY || 0 });
      }
    };
    window.addEventListener(EXCALIDRAW_SYNC_EVENT, onSync);
    return () => window.removeEventListener(EXCALIDRAW_SYNC_EVENT, onSync);
  }, [sessionId, object?.id]);
  import_react12.default.useEffect(() => {
    const vp = readCanvasViewport(sessionId, object?.id);
    setZoom(vp.scale || 1);
    setPan({ x: vp.panX || 0, y: vp.panY || 0 });
  }, [sessionId, object?.id]);
  const updateViewport = import_react12.default.useCallback((nextZoom, nextPan) => {
    setZoom(nextZoom);
    setPan(nextPan);
    writeCanvasViewport(sessionId, object?.id, { scale: nextZoom, panX: nextPan.x, panY: nextPan.y });
  }, [sessionId, object?.id]);
  import_react12.default.useEffect(() => {
    if (!object) return;
    if (object.id !== appliedObj?.id) {
      setAppliedObj(object);
      setPendingMergeObj(null);
      setUserOffsets(object.userLayout?.offsets || {});
      setLabelOverrides(object.userLayout?.labelOverrides || {});
      setAnnotations(Array.isArray(object.userLayout?.annotations) ? object.userLayout.annotations : []);
      setUserLayoutVer(object.userLayout?.version ?? 0);
      userVersionRef.current = object.userLayout?.version ?? 0;
      setFailedSave(null);
      return;
    }
    if (object.version !== appliedObj?.version) {
      if (isActivelyEditing) {
        setPendingMergeObj(object);
      } else {
        setAppliedObj(object);
      }
    }
    const serverUserVer = object.userLayout?.version ?? 0;
    if (serverUserVer > userLayoutVer && !isActivelyEditing && !failedSave && !saving) {
      setUserOffsets(object.userLayout?.offsets || {});
      setLabelOverrides(object.userLayout?.labelOverrides || {});
      setAnnotations(Array.isArray(object.userLayout?.annotations) ? object.userLayout.annotations : []);
      setUserLayoutVer(serverUserVer);
      userVersionRef.current = serverUserVer;
    }
  }, [object?.id, object?.version, object?.userLayout?.version, isActivelyEditing, failedSave, saving]);
  import_react12.default.useEffect(() => {
    if (typeof document === "undefined") return;
    let cancelled = false;
    loadRoughModule().then((mod) => {
      if (!cancelled && mod?.svg) setRoughApi(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const currentObj = appliedObj || object;
  const sceneElements = currentObj?.data?.excalidrawScene?.elements;
  const layout = import_react12.default.useMemo(() => {
    const fontSize = Math.max(12, hostTheme.fontSize - 1);
    if (Array.isArray(sceneElements)) {
      const visible = sceneElements.filter((el) => el && !el.isDeleted);
      const rects = visible.filter((el) => el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond");
      const texts = visible.filter((el) => el.type === "text");
      const arrows = visible.filter((el) => el.type === "arrow" || el.type === "line");
      const supportedTypes = /* @__PURE__ */ new Set(["rectangle", "ellipse", "diamond", "text", "arrow", "line"]);
      const omittedTypes = visible.filter((el) => !supportedTypes.has(el.type)).map((el) => String(el.type || "unknown"));
      const nodes2 = rects.map((r, idx) => {
        const boundText = texts.find((t) => t.containerId === r.id);
        const baseLabel = boundText?.text || r.customData?.label || r.id;
        const off = userOffsets[r.id] || { dx: 0, dy: 0 };
        return {
          id: r.id,
          shape: r.type,
          label: labelOverrides[r.id] || baseLabel,
          lines: [labelOverrides[r.id] || baseLabel],
          x: Math.round((r.x ?? 40 * (idx + 1)) + (off.dx || 0)),
          y: Math.round((r.y ?? 40) + (off.dy || 0)),
          width: Math.max(84, Math.round(r.width || 136)),
          height: Math.max(38, Math.round(r.height || 52)),
          status: r.customData?.status,
          critical: Boolean(r.customData?.critical)
        };
      });
      const freeTexts = texts.filter((t) => !t.containerId && typeof t.text === "string" && t.text.trim()).map((t, idx) => ({
        id: t.id || "ft-" + idx,
        x: Math.round(t.x ?? 24),
        y: Math.round((t.y ?? 24) + 14),
        text: t.text
      }));
      const edges2 = arrows.map((a) => {
        const fromNode = nodes2.find((n) => n.id === a.startBinding?.elementId);
        const toNode = nodes2.find((n) => n.id === a.endBinding?.elementId);
        const pts = Array.isArray(a.points) && a.points.length >= 2 ? a.points : [[0, 0], [80, 0]];
        const x1 = fromNode ? fromNode.x + fromNode.width : Math.round((a.x || 0) + pts[0][0]);
        const y1 = fromNode ? fromNode.y + fromNode.height / 2 : Math.round((a.y || 0) + pts[0][1]);
        const x2 = toNode ? toNode.x : Math.round((a.x || 0) + pts[pts.length - 1][0]);
        const y2 = toNode ? toNode.y + toNode.height / 2 : Math.round((a.y || 0) + pts[pts.length - 1][1]);
        const isErr = a.customData?.kind === "error" || toNode?.status === "blocked" || toNode?.status === "failed";
        const isUnk = a.customData?.kind === "unknown" || toNode?.status === "unknown";
        const semantic = isErr ? "blocked" : isUnk ? "unknown" : a.customData?.critical || toNode?.critical ? "critical" : "default";
        return { x1, y1, x2, y2, midX: Math.round((x1 + x2) / 2), midY: Math.round((y1 + y2) / 2), label: a.customData?.label, semantic };
      });
      const width = Math.max(
        360,
        ...nodes2.map((n) => n.x + n.width + 40),
        ...freeTexts.map((t) => t.x + approxLineWidth(t.text, fontSize) + 40),
        ...edges2.map((e) => Math.max(e.x1, e.x2) + 40)
      );
      const height = Math.max(
        200,
        ...nodes2.map((n) => n.y + n.height + 40),
        ...freeTexts.map((t) => t.y + 40),
        ...edges2.map((e) => Math.max(e.y1, e.y2) + 40)
      );
      return { nodes: nodes2, edges: edges2, freeTexts, omittedTypes, width, height };
    }
    if (currentObj?.type === "mindmap") {
      const mm = layoutMindmapTree(currentObj.data?.root || parseMarkdownToMindmap(currentObj.data?.markdown), /* @__PURE__ */ new Set(), { fontSize });
      return {
        nodes: mm.nodes.map((n) => {
          const off = userOffsets[n.id] || { dx: 0, dy: 0 };
          return { ...n, label: labelOverrides[n.id] || n.label, x: n.x + (off.dx || 0), y: n.y + (off.dy || 0) };
        }),
        edges: mm.edges.map((e) => ({ ...e, semantic: e.status === "blocked" || e.status === "failed" ? "blocked" : e.status === "unknown" ? "unknown" : "default" })),
        freeTexts: [],
        omittedTypes: [],
        width: mm.width,
        height: mm.height
      };
    }
    const base = layoutDiagram(currentObj?.data, { fontSize });
    const positioned = /* @__PURE__ */ new Map();
    const nodes = base.nodes.map((n) => {
      const off = userOffsets[n.id] || { dx: 0, dy: 0 };
      const item = { ...n, label: labelOverrides[n.id] || n.label, x: n.x + (off.dx || 0), y: n.y + (off.dy || 0) };
      positioned.set(item.id, item);
      return item;
    });
    const edges = base.edges.map((e) => {
      const from = positioned.get(e.from);
      const to = positioned.get(e.to);
      if (!from || !to) return e;
      const x1 = from.x + from.width;
      const y1 = from.y + from.height / 2;
      const x2 = to.x;
      const y2 = to.y + to.height / 2;
      return { ...e, x1, y1, x2, y2, midX: Math.round((x1 + x2) / 2), midY: Math.round((y1 + y2) / 2) };
    });
    return {
      nodes,
      edges,
      freeTexts: [],
      omittedTypes: [],
      width: Math.max(340, ...nodes.map((n) => n.x + n.width + 40)),
      height: Math.max(190, ...nodes.map((n) => n.y + n.height + 40))
    };
  }, [currentObj, sceneElements, userOffsets, labelOverrides, hostTheme.fontSize]);
  import_react12.default.useEffect(() => {
    const group = roughOverlayRef.current;
    const svg = svgRef.current;
    if (!group || !svg || !roughApi?.svg) return;
    while (group.firstChild) group.removeChild(group.firstChild);
    const rc = roughApi.svg(svg);
    for (const n of layout.nodes) {
      const strokeColor = n.critical ? hostTheme.accent : resolvedStatusColor(n.status, hostTheme);
      const opts = {
        roughness: 1.05,
        stroke: strokeColor,
        strokeWidth: n.critical ? 2 : 1.5,
        fill: hostTheme.bgLayer2,
        fillStyle: "solid",
        seed: (String(n.id).length * 17 + 7) % 997
      };
      let sketchShape;
      if (n.shape === "ellipse") {
        sketchShape = rc.ellipse(n.x + n.width / 2, n.y + n.height / 2, n.width, n.height, opts);
      } else if (n.shape === "diamond") {
        sketchShape = rc.polygon([
          [n.x + n.width / 2, n.y],
          [n.x + n.width, n.y + n.height / 2],
          [n.x + n.width / 2, n.y + n.height],
          [n.x, n.y + n.height / 2]
        ], opts);
      } else {
        sketchShape = rc.rectangle(n.x, n.y, n.width, n.height, opts);
      }
      group.appendChild(sketchShape);
    }
  }, [roughApi, layout.nodes, hostTheme]);
  async function persistUserLayer(nextOffsets, nextLabels, nextNotes, reset = false, nextViewport = null, expectedVersion = userVersionRef.current) {
    if (savingRef.current) return;
    broadcastUserLayer(nextOffsets, nextLabels, nextNotes, void 0, nextViewport);
    if (!sessionId || !currentObj?.id) return;
    savingRef.current = true;
    setSaving(true);
    setFailedSave(null);
    setSaveNote("\u6B63\u5728\u4FDD\u5B58\u2026");
    broadcastUserLayer(nextOffsets, nextLabels, nextNotes, void 0, nextViewport, { phase: "saving", note: "\u6B63\u5728\u4FDD\u5B58\u2026" });
    try {
      const res = await saveViewObjectUserLayout(sessionId, {
        id: currentObj.id,
        expectedUserVersion: expectedVersion,
        offsets: nextOffsets,
        labelOverrides: nextLabels,
        annotations: nextNotes,
        reset
      });
      if (!res?.ok || !res.userLayout) throw new Error("\u672A\u53D6\u5F97\u670D\u52A1\u5668\u4FDD\u5B58\u7ED3\u679C");
      userVersionRef.current = res.userLayout.version;
      setUserLayoutVer(res.userLayout.version);
      setSaveNote("\u5DF2\u4FDD\u5B58\u5E03\u5C40 v" + res.userLayout.version);
      broadcastUserLayer(nextOffsets, nextLabels, nextNotes, res.userLayout.version, nextViewport, { phase: "saved", note: "\u5DF2\u4FDD\u5B58\u5E03\u5C40 v" + res.userLayout.version });
    } catch (err) {
      setSaveNote("\u4FEE\u6539\u5C1A\u672A\u4FDD\u5B58");
      const failure = { offsets: nextOffsets, labels: nextLabels, notes: nextNotes, reset, viewport: nextViewport, conflict: err.status === 409, message: err.message };
      setFailedSave(failure);
      broadcastUserLayer(nextOffsets, nextLabels, nextNotes, void 0, nextViewport, { phase: "failed", note: "\u4FEE\u6539\u5C1A\u672A\u4FDD\u5B58", failure });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  function startNodeDrag(node, e) {
    e.stopPropagation();
    if (savingRef.current) return;
    const baseOff = userOffsets[node.id] || { dx: 0, dy: 0 };
    activeDragRef.current = { kind: "node", id: node.id, startX: e.clientX, startY: e.clientY, dx0: baseOff.dx, dy0: baseOff.dy };
  }
  function startPanDrag(e) {
    activeDragRef.current = { kind: "pan", x0: e.clientX - pan.x, y0: e.clientY - pan.y };
  }
  function onMouseMove(e) {
    const drag = activeDragRef.current;
    if (!drag) return;
    if (drag.kind === "node") {
      const dx = drag.dx0 + Math.round((e.clientX - drag.startX) / zoom);
      const dy = drag.dy0 + Math.round((e.clientY - drag.startY) / zoom);
      setUserOffsets((prev) => ({ ...prev, [drag.id]: { dx, dy } }));
    } else if (drag.kind === "pan") {
      updateViewport(zoom, { x: e.clientX - drag.x0, y: e.clientY - drag.y0 });
    }
  }
  function onMouseUp() {
    const drag = activeDragRef.current;
    activeDragRef.current = null;
    if (drag?.kind === "node") {
      persistUserLayer(userOffsets, labelOverrides, annotations);
    }
  }
  function fitView() {
    updateViewport(1, { x: 0, y: 0 });
  }
  function resetLayout() {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (!window.confirm("\u5C06\u6E05\u9664\u4F60\u62D6\u52A8\u7684\u4F4D\u7F6E\u3001\u6539\u5B57\u548C\u6279\u6CE8\uFF0C\u786E\u5B9A\u91CD\u7F6E\uFF1F")) return;
    }
    setUserOffsets({});
    setLabelOverrides({});
    setAnnotations([]);
    updateViewport(1, { x: 0, y: 0 });
    persistUserLayer({}, {}, [], true, { scale: 1, panX: 0, panY: 0 });
  }
  function commitNodeLabel() {
    if (!editingNodeId) return;
    const trimmed = editingDraft.trim();
    const nextLabels = trimmed ? { ...labelOverrides, [editingNodeId]: trimmed } : labelOverrides;
    setLabelOverrides(nextLabels);
    closeNodeEditor();
    persistUserLayer(userOffsets, nextLabels, annotations);
  }
  function closeNodeEditor() {
    svgRef.current?.querySelector(`[data-concerto-excalidraw-node="${CSS.escape(editingNodeId)}"]`)?.focus();
    setEditingNodeId("");
  }
  function commitAnnotation() {
    const text = noteDraft.trim();
    if (!text) return;
    const nextNotes = [...annotations, { id: "note-" + Date.now(), x: 24 + annotations.length * 30 % 160, y: Math.max(20, layout.height - 56), text }];
    setAnnotations(nextNotes);
    setAddingNote(false);
    setNoteDraft("");
    persistUserLayer(userOffsets, labelOverrides, nextNotes);
  }
  function exportExcalidraw() {
    const exported = objectToExcalidrawScene(currentObj, { userOffsets });
    downloadTextFile(`${currentObj.id || "whiteboard"}.excalidraw`, JSON.stringify(exported, null, 2), "application/json");
  }
  const markerId = "excalidraw-arrow-" + String(currentObj.id || "board").replace(/[^a-zA-Z0-9_-]/g, "") + (inModal ? "-m" : "");
  const nodeCount = layout.nodes.length;
  const omittedUnique = [...new Set(layout.omittedTypes || [])];
  const summaryText = `${nodeCount} \u5143\u7D20 \xB7 ${layout.edges.length} \u8FDE\u7EBF` + (saveNote ? " \xB7 " + saveNote : "");
  const zoomOutBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost concerto-btn--icon" : "concerto-btn",
    "aria-label": "\u7F29\u5C0F",
    title: "\u7F29\u5C0F",
    onClick: () => updateViewport(Math.max(0.5, Number((zoom - 0.15).toFixed(2))), pan)
  }, iconOnly ? "\u2212" : "\u7F29\u5C0F");
  const zoomInBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost concerto-btn--icon" : "concerto-btn",
    "aria-label": "\u653E\u5927",
    title: "\u653E\u5927",
    onClick: () => updateViewport(Math.min(2.4, Number((zoom + 0.15).toFixed(2))), pan)
  }, iconOnly ? "+" : "\u653E\u5927");
  const fitBtn = (iconOnly) => h("button", {
    type: "button",
    className: iconOnly ? "concerto-btn concerto-btn--ghost concerto-btn--icon" : "concerto-btn",
    "aria-label": "\u9002\u5E94\u7A97\u53E3",
    title: "\u9002\u5E94\u7A97\u53E3",
    onClick: fitView
  }, iconOnly ? h(UiIcon, { name: "expand" }) : "\u9002\u5E94\u7A97\u53E3");
  return h(
    "div",
    {
      "data-concerto-renderer-root": "excalidraw",
      style: inModal ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : void 0
    },
    inModal && h(
      "div",
      { className: "concerto-canvas-bar" },
      h("span", { className: "concerto-num" }, summaryText),
      h(
        "div",
        { className: "concerto-canvas-btns" },
        h("button", { type: "button", className: "concerto-btn", disabled: saving, onClick: () => {
          setAddingNote(true);
          setNoteDraft("\u5F85\u786E\u8BA4\u8FB9\u754C");
        } }, "\u6DFB\u52A0\u6279\u6CE8"),
        zoomOutBtn(false),
        zoomInBtn(false),
        fitBtn(false),
        h("button", { type: "button", className: "concerto-btn concerto-btn--ghost", disabled: saving, onClick: resetLayout }, "\u91CD\u7F6E\u5E03\u5C40")
      ),
      h(
        "div",
        { className: "concerto-canvas-export" },
        h("button", { type: "button", className: "concerto-btn", onClick: exportExcalidraw }, "\u5BFC\u51FA .excalidraw"),
        h("button", { type: "button", className: "concerto-btn", onClick: () => exportSvgElement(svgRef.current, `${currentObj.id}.svg`, layout.width, layout.height) }, "\u5BFC\u51FA SVG"),
        h("button", { type: "button", className: "concerto-btn", onClick: () => exportPngFromSvgElement(svgRef.current, `${currentObj.id}.png`, layout.width, layout.height) }, "\u5BFC\u51FA PNG")
      )
    ),
    omittedUnique.length > 0 && h("div", {
      role: "status",
      "data-concerto-excalidraw-omitted": String(layout.omittedTypes.length),
      style: { marginBottom: 8, padding: "6px 10px", borderRadius: "var(--cc-radius-ctrl)", background: "var(--cc-state-attention-bg)", fontSize: "var(--cc-fs-caption)" }
    }, `\u63D0\u793A\uFF1A\u5BFC\u5165\u573A\u666F\u542B ${layout.omittedTypes.length} \u4E2A\u672A\u652F\u6301\u56FE\u5143\uFF08${omittedUnique.join(", ")}\uFF09\uFF0C\u5DF2\u6E32\u67D3\u57FA\u7840\u56FE\u5F62\u3001\u8FDE\u7EBF\u4E0E\u6587\u672C\u5B50\u96C6\u3002`),
    pendingMergeObj && h(
      "div",
      { role: "status", style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8, padding: "6px 10px", borderRadius: "var(--cc-radius-ctrl)", background: "var(--cc-state-attention-bg)", fontSize: "var(--cc-fs-caption)" } },
      h("span", null, "\u540E\u53F0\u8BED\u4E49\u5185\u5BB9\u5DF2\u66F4\u65B0\u81F3 v" + pendingMergeObj.version + "\uFF08\u7F16\u8F91\u671F\u95F4\u5DF2\u6682\u505C\u8986\u76D6\uFF09"),
      h("button", { type: "button", className: "concerto-btn concerto-btn--primary", onClick: () => {
        setAppliedObj(pendingMergeObj);
        setPendingMergeObj(null);
      } }, "\u5408\u5E76\u4FDD\u7559\u6211\u7684\u4F4D\u7F6E"),
      h("button", { type: "button", className: "concerto-btn concerto-btn--ghost", onClick: () => setPendingMergeObj(null) }, "\u5FFD\u7565")
    ),
    failedSave && h(
      "div",
      { role: "status", className: "concerto-feedback", "data-tone": "error" },
      h("span", null, failedSave.conflict ? "\u670D\u52A1\u5668\u5E03\u5C40\u5DF2\u66F4\u65B0\u3002\u4F60\u7684\u4FEE\u6539\u5C1A\u672A\u4FDD\u5B58\uFF0C\u91CD\u65B0\u4FDD\u5B58\u5C06\u8986\u76D6\u5F53\u524D\u5DF2\u77E5\u5E03\u5C40\u3002" : `\u5E03\u5C40\u4FDD\u5B58\u5931\u8D25\uFF1A${failedSave.message}\u3002\u4F60\u7684\u4FEE\u6539\u4ECD\u4FDD\u7559\u5728\u5F53\u524D\u753B\u5E03\u3002`),
      h("button", {
        type: "button",
        className: "concerto-btn",
        disabled: saving || failedSave.conflict && (object?.userLayout?.version ?? 0) <= userLayoutVer,
        onClick: () => persistUserLayer(failedSave.offsets, failedSave.labels, failedSave.notes, failedSave.reset, failedSave.viewport, failedSave.conflict ? object.userLayout.version : userVersionRef.current)
      }, failedSave.conflict ? "\u7528\u6211\u7684\u5E03\u5C40\u91CD\u65B0\u4FDD\u5B58" : "\u91CD\u8BD5\u4FDD\u5B58")
    ),
    saving && h("p", { role: "status", className: "concerto-quiet" }, "\u6B63\u5728\u4FDD\u5B58\u5E03\u5C40\u2026"),
    editingNodeId && h(
      "div",
      { className: "concerto-inline-editor" },
      h("label", { htmlFor: editId }, "\u8282\u70B9\u6587\u5B57"),
      h("input", { ref: editInputRef, id: editId, value: editingDraft, disabled: saving, onChange: (e) => setEditingDraft(e.target.value), className: "concerto-input" }),
      h("button", { type: "button", className: "concerto-btn concerto-btn--primary", disabled: saving, onClick: commitNodeLabel }, "\u786E\u5B9A"),
      h("button", { type: "button", className: "concerto-btn concerto-btn--ghost", onClick: closeNodeEditor }, "\u53D6\u6D88")
    ),
    addingNote && h(
      "div",
      { className: "concerto-inline-editor" },
      h("label", { htmlFor: noteId }, "\u767D\u677F\u6279\u6CE8"),
      h("input", { id: noteId, value: noteDraft, disabled: saving, onChange: (e) => setNoteDraft(e.target.value), className: "concerto-input" }),
      h("button", { type: "button", className: "concerto-btn concerto-btn--primary", disabled: saving || !noteDraft.trim(), onClick: commitAnnotation }, "\u6DFB\u52A0"),
      h("button", { type: "button", className: "concerto-btn concerto-btn--ghost", onClick: () => {
        setAddingNote(false);
        setNoteDraft("");
      } }, "\u53D6\u6D88")
    ),
    h(
      "div",
      {
        className: "concerto-canvas-stage",
        style: { height: inModal ? "100%" : Math.min(280, Math.max(185, layout.height + 24)) },
        onMouseDown: startPanDrag,
        onMouseMove,
        onMouseUp,
        onMouseLeave: onMouseUp
      },
      !inModal && h(
        "div",
        { className: "concerto-stage-tools", onMouseDown: (e) => e.stopPropagation() },
        zoomOutBtn(true),
        zoomInBtn(true),
        fitBtn(true)
      ),
      h(
        "svg",
        {
          ref: svgRef,
          viewBox: `0 0 ${layout.width} ${layout.height}`,
          width: "100%",
          height: "100%",
          style: { display: "block", minHeight: 180 }
        },
        h(
          "defs",
          null,
          h(
            "marker",
            { id: markerId, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
            h("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: "var(--cc-border-strong)" })
          ),
          h(
            "marker",
            { id: markerId + "-crit", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
            h("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: "var(--cc-accent)" })
          ),
          h(
            "marker",
            { id: markerId + "-blocked", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: "auto-start-reverse" },
            h("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: "var(--cc-state-blocked)" })
          ),
          h(
            "marker",
            { id: markerId + "-unknown", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: "auto-start-reverse" },
            h("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: "var(--cc-state-unknown)" })
          )
        ),
        h(
          "g",
          { transform: `translate(${pan.x}, ${pan.y}) scale(${zoom})` },
          layout.edges.map((e, i) => {
            const app = edgeAppearance2(e.semantic);
            const labelW = e.label ? Math.max(40, Math.round(approxLineWidth(e.label, 12) + 16)) : 0;
            return h(
              "g",
              { key: i, "data-concerto-edge-semantic": e.semantic || "default" },
              h("line", {
                x1: e.x1,
                y1: e.y1,
                x2: e.x2,
                y2: e.y2,
                stroke: app.stroke,
                strokeWidth: app.width,
                strokeDasharray: app.dash,
                markerEnd: `url(#${markerId + app.markerSuffix})`
              }),
              e.label && h(
                "g",
                null,
                h("rect", {
                  x: e.midX - Math.round(labelW / 2),
                  y: e.midY - 12,
                  width: labelW,
                  height: 18,
                  rx: 6,
                  fill: "var(--cc-canvas-bg)",
                  stroke: "var(--cc-border-subtle)"
                }),
                h("text", {
                  x: e.midX,
                  y: e.midY + 1,
                  textAnchor: "middle",
                  fill: e.semantic === "default" ? "var(--cc-text-secondary)" : app.stroke,
                  fontSize: Math.max(11, hostTheme.secondaryFontSize - 1),
                  fontWeight: 500
                }, e.label)
              )
            );
          }),
          layout.nodes.map((n) => {
            if (n.shape === "ellipse") {
              return h("ellipse", {
                key: "bg-" + n.id,
                cx: n.x + n.width / 2,
                cy: n.y + n.height / 2,
                rx: n.width / 2,
                ry: n.height / 2,
                fill: "var(--cc-card-nested-bg)"
              });
            }
            if (n.shape === "diamond") {
              return h("polygon", {
                key: "bg-" + n.id,
                points: `${n.x + n.width / 2},${n.y} ${n.x + n.width},${n.y + n.height / 2} ${n.x + n.width / 2},${n.y + n.height} ${n.x},${n.y + n.height / 2}`,
                fill: "var(--cc-card-nested-bg)"
              });
            }
            return h("rect", {
              key: "bg-" + n.id,
              x: n.x,
              y: n.y,
              width: n.width,
              height: n.height,
              rx: 8,
              fill: "var(--cc-card-nested-bg)"
            });
          }),
          roughApi && h("g", { ref: roughOverlayRef, "data-concerto-rough-layer": "true" }),
          layout.nodes.map((n) => {
            const stroke = n.critical ? "var(--cc-accent)" : statusCssVar2(n.status);
            const stInfo = STATUS_TOKENS[n.status];
            return h(
              "g",
              {
                key: n.id,
                "data-concerto-excalidraw-node": n.id,
                "data-x": n.x,
                "data-y": n.y,
                style: { cursor: "move" },
                onMouseDown: (e) => startNodeDrag(n, e),
                role: "button",
                tabIndex: 0,
                "aria-label": `\u7F16\u8F91\u8282\u70B9\uFF1A${n.label}`,
                "aria-disabled": saving || void 0,
                onKeyDown: (e) => {
                  if (e.key === " ") e.preventDefault();
                  if (e.key === "Enter" && !savingRef.current) {
                    setEditingNodeId(n.id);
                    setEditingDraft(n.label);
                  }
                },
                onKeyUp: (e) => {
                  if (e.key === " " && !savingRef.current) {
                    setEditingNodeId(n.id);
                    setEditingDraft(n.label);
                  }
                },
                onDoubleClick: (e) => {
                  e.stopPropagation();
                  if (!savingRef.current) {
                    setEditingNodeId(n.id);
                    setEditingDraft(n.label);
                  }
                }
              },
              h("title", null, `${n.label}${stInfo ? " \xB7 " + stInfo.label : ""}\uFF08\u62D6\u62FD\u79FB\u52A8\uFF0C\u53CC\u51FB\u6539\u5B57\uFF09`),
              !roughApi && (n.shape === "ellipse" ? h("ellipse", {
                cx: n.x + n.width / 2,
                cy: n.y + n.height / 2,
                rx: n.width / 2,
                ry: n.height / 2,
                fill: "var(--cc-card-nested-bg)",
                stroke,
                strokeWidth: n.critical ? 2 : 1.5
              }) : n.shape === "diamond" ? h("polygon", {
                points: `${n.x + n.width / 2},${n.y} ${n.x + n.width},${n.y + n.height / 2} ${n.x + n.width / 2},${n.y + n.height} ${n.x},${n.y + n.height / 2}`,
                fill: "var(--cc-card-nested-bg)",
                stroke,
                strokeWidth: n.critical ? 2 : 1.5
              }) : h("path", {
                d: buildSketchySvgBox(n.x, n.y, n.width, n.height),
                fill: "var(--cc-card-nested-bg)",
                stroke,
                strokeWidth: n.critical ? 2 : 1.5
              })),
              roughApi && h("rect", {
                x: n.x,
                y: n.y,
                width: n.width,
                height: n.height,
                rx: 8,
                fill: "transparent"
              }),
              n.status && n.shape !== "ellipse" && n.shape !== "diamond" && h("rect", {
                x: n.x,
                y: n.y,
                width: 4,
                height: n.height,
                rx: 2,
                fill: stroke
              }),
              h("text", {
                x: n.x + n.width / 2,
                y: n.y + n.height / 2 + 4,
                textAnchor: "middle",
                fill: "var(--cc-text-primary)",
                fontSize: Math.max(12, hostTheme.fontSize - 1),
                fontFamily: "var(--cc-font-sans)",
                fontWeight: 600
              }, n.label)
            );
          }),
          (layout.freeTexts || []).map((t) => h("text", {
            key: t.id,
            x: t.x,
            y: t.y,
            fill: "var(--cc-text-secondary)",
            fontSize: Math.max(12, hostTheme.fontSize - 1),
            fontFamily: "var(--cc-font-sans)"
          }, t.text)),
          annotations.map((note) => h(
            "g",
            { key: note.id, transform: `translate(${note.x}, ${note.y})` },
            h("rect", { x: 0, y: 0, width: 164, height: 28, rx: 6, fill: "var(--cc-state-attention-bg)", stroke: "var(--cc-state-attention)", strokeWidth: 1.2 }),
            h("text", { x: 8, y: 18, fill: "var(--cc-text-primary)", fontSize: Math.max(11, hostTheme.secondaryFontSize - 1) }, "\u6279\u6CE8\uFF1A" + note.text)
          ))
        )
      )
    ),
    !inModal && h(
      "div",
      { className: "concerto-canvas-foot" },
      h("span", { className: "concerto-num" }, summaryText)
    )
  );
}

// packages/dsh-concerto/src/client/components/renderers/HtmlSandboxRenderer.js
var import_react13 = __toESM(require_react(), 1);
function buildSrcDoc(data, hostTheme) {
  const colorScheme = hostTheme?.colorScheme === "dark" ? "dark" : "light";
  const vars = [
    `color-scheme:${colorScheme}`,
    `--bg-base:${hostTheme.bgBase}`,
    `--bg-layer:${hostTheme.bgLayer1}`,
    `--bg-layer-2:${hostTheme.bgLayer2}`,
    `--text-primary:${hostTheme.textPrimary}`,
    `--text-secondary:${hostTheme.textSecondary}`,
    `--text-tertiary:${hostTheme.textTertiary}`,
    `--border-color:${hostTheme.borderColor}`,
    `--brand:${hostTheme.accent}`,
    `--brand-text:${hostTheme.accentText || hostTheme.accent}`,
    `--on-brand:${hostTheme.onAccent || hostTheme.textPrimary}`,
    `--font-sans:${hostTheme.fontFamily}`,
    `--font-mono:${hostTheme.codeFontFamily}`,
    `--font-size:${hostTheme.fontSize}px`,
    `--code-font-size:${hostTheme.codeFontSize}px`,
    `--terminal-font-size:${hostTheme.terminalFontSize || hostTheme.codeFontSize}px`
  ].join(";") + ";";
  const baseCss = `
    :root { ${vars} }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: transparent; color: var(--text-primary); }
    body { padding: 12px; font-family: var(--font-sans); font-size: var(--font-size); line-height: 1.55; }
    a { color: var(--brand-text); }
    code, pre { font-family: var(--font-mono); font-size: var(--code-font-size); }
  `;
  return [
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>Concerto \u7ED3\u6784\u5316 HTML \u89C6\u56FE</title>',
    `<meta http-equiv="Content-Security-Policy" content="${CONCERTO_HTML_CSP}">`,
    `<style>${baseCss}
${data?.css || ""}</style></head>`,
    `<body>${data?.html || ""}</body></html>`
  ].join("");
}
function estimateHtmlHeight(data) {
  if (Number.isFinite(Number(data?.height)) && Number(data.height) > 0) {
    return Math.min(480, Math.max(88, Math.round(Number(data.height))));
  }
  const html = String(data?.html || "");
  const blockCount = (html.match(/<\s*(?:div|p|li|tr|h[1-6]|section|article|br)\b/gi) || []).length;
  const textLen = html.replace(/<[^>]+>/g, "").trim().length;
  const estimated = 44 + Math.max(1, blockCount) * 22 + Math.floor(textLen / 48) * 18;
  return Math.min(360, Math.max(96, estimated));
}
function HtmlSandboxRenderer({ object, inModal = false }) {
  const hostTheme = useHostTheme();
  const srcDoc = import_react13.default.useMemo(() => buildSrcDoc(object?.data, hostTheme), [object?.data, hostTheme]);
  if (!object?.data?.html) return h("p", { style: styles.muted }, "HTML \u5361\u7247\u5185\u5BB9\u4E3A\u7A7A\u3002");
  const cardH = estimateHtmlHeight(object?.data);
  const cappedH = Math.min(240, cardH);
  const clipped = !inModal && cardH > 220;
  return h(
    "div",
    {
      "data-concerto-renderer-root": "sandbox-iframe",
      style: inModal ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : void 0
    },
    h(
      "div",
      {
        style: {
          position: "relative",
          flex: inModal ? 1 : void 0,
          borderRadius: "var(--cc-radius-ctrl)",
          background: "var(--cc-card-nested-bg)",
          overflow: "hidden",
          minHeight: inModal ? 420 : cappedH
        }
      },
      h("iframe", {
        sandbox: "",
        title: object.title || "Concerto \u6C99\u7BB1 HTML \u89C6\u56FE",
        srcDoc,
        style: {
          width: "100%",
          height: inModal ? "100%" : cappedH,
          minHeight: inModal ? 420 : cappedH,
          border: 0,
          background: "transparent",
          display: "block"
        }
      }),
      clipped && h("div", { className: "concerto-html-fade", "aria-hidden": true })
    ),
    !inModal && h(
      "div",
      { className: "concerto-canvas-foot" },
      h("span", null, clipped ? "\u53EF\u6EDA\u52A8\u67E5\u770B\u9884\u89C8 \xB7 \u5C55\u5F00\u753B\u5E03\u9605\u8BFB\u5B8C\u6574\u5185\u5BB9" : "\u6C99\u7BB1\u5185\u5BB9\u9884\u89C8 \xB7 \u53EF\u6EDA\u52A8\u67E5\u770B")
    )
  );
}

// packages/dsh-concerto/src/client/components/popover.js
function showAnchoredPopover(trigger, panel, { width = 420, maxHeight = 360 } = {}) {
  if (!trigger || !panel || typeof panel.showPopover !== "function") return false;
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = window.innerHeight;
  const actualWidth = Math.min(width, Math.max(240, viewportWidth - 32));
  const rect = trigger.getBoundingClientRect();
  const left = Math.max(16, Math.min(rect.right - actualWidth, viewportWidth - actualWidth - 16));
  const estimatedHeight = Math.min(maxHeight, panel.scrollHeight || maxHeight);
  let top = rect.bottom + 8;
  let availableHeight = viewportHeight - top - 16;
  if (availableHeight < 180 && rect.top > viewportHeight / 2) {
    top = Math.max(16, rect.top - estimatedHeight - 8);
    availableHeight = rect.top - 24;
  }
  panel.style.width = `${actualWidth}px`;
  panel.style.maxHeight = `${Math.max(120, Math.min(maxHeight, availableHeight))}px`;
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.showPopover();
  return true;
}
function hideAnchoredPopover(panel) {
  if (panel && typeof panel.hidePopover === "function") panel.hidePopover();
}

// packages/dsh-concerto/src/client/components/StructuredObjectCard.js
var RENDERER_LABELS = {
  html: "HTML \u8868\u683C / \u9A8C\u6536\u6E05\u5355",
  markmap: "SVG \u5BFC\u56FE",
  svg: "SVG \u56FE\u8C31",
  excalidraw: "\u624B\u7ED8\u767D\u677F",
  "sandbox-iframe": "\u6C99\u7BB1 HTML"
};
var ENGINE_DETAILS = {
  html: "HTML \u7ED3\u6784\u5316\u8868\u683C / \u9A8C\u6536\u6E05\u5355\uFF08\u5B9E\u65F6\u6267\u884C\u53EA\u8BFB\u540C\u6B65\u4EFB\u52A1\u72B6\u6001\uFF0C\u5FEB\u7167\u51BB\u7ED3\u5386\u53F2\u72B6\u6001\uFF09",
  markmap: "\u81EA\u7ED8 SVG \u5BFC\u56FE\uFF08\u9884\u89C8\u4E0E\u5168\u5C4F\u5171\u7528\u786E\u5B9A\u6027\u5E03\u5C40\u3001\u6298\u53E0\u72B6\u6001\u548C SVG/PNG \u5BFC\u51FA\uFF09",
  svg: "Dagre + SVG \u77E2\u91CF\u5E03\u5C40\uFF08\u968F\u5BBF\u4E3B\u5B57\u53F7\u6D4B\u91CF\u4E2D\u6587\u5BBD\u5EA6\uFF0C\u533A\u5206 3 \u79CD\u8FDE\u7EBF\u8BED\u4E49\uFF09",
  excalidraw: "Excalidraw v2 + Rough.js \u767D\u677F\u5F15\u64CE\uFF08\u7528\u6237\u5E03\u5C40\u72EC\u7ACB\u7248\u672C\u4FDD\u5B58\uFF09",
  "sandbox-iframe": "\u6C99\u7BB1 iframe\uFF08\u663E\u5F0F\u63A5\u6536\u5BBF\u4E3B\u6DF1\u6D45\u8272\u3001\u5B57\u4F53\u4E0E\u5B57\u53F7\u53D8\u91CF\uFF09"
};
var SEMANTIC_META = {
  blueprint: { label: "\u65B9\u6848\u793A\u610F", cls: "concerto-state-idle" },
  snapshot: { label: "\u5386\u53F2\u5FEB\u7167", cls: "concerto-state-review" },
  live_execution: { label: "\u5B9E\u65F6\u6267\u884C", cls: "concerto-state-running" }
};
function resolveObjectRenderer(object, overrideRenderer) {
  if (!object) return "html";
  const allowed = ALLOWED_RENDERERS[object.type] || [];
  if (overrideRenderer && allowed.includes(overrideRenderer)) return overrideRenderer;
  if (object.renderer && allowed.includes(object.renderer)) return object.renderer;
  return DEFAULT_RENDERER[object.type] || "html";
}
function CanvasModal({ title, onClose, children }) {
  useTeamCss();
  const hostTheme = useHostTheme();
  const dialogRef = import_react14.default.useRef(null);
  const titleId = import_react14.default.useId();
  useModalDialog(dialogRef, onClose);
  const dialog = h(
    "dialog",
    {
      ref: dialogRef,
      className: "concerto-canvas-modal concerto-surface",
      "data-concerto-theme": hostTheme.colorScheme,
      "data-concerto-modal": "true",
      "aria-labelledby": titleId,
      closedby: "any",
      style: hostTheme.cssVars
    },
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 } },
      h("h2", { id: titleId, className: "concerto-dialog-title" }, title),
      h("button", {
        ref: (node) => node?.setAttribute("autofocus", ""),
        type: "button",
        className: "concerto-btn concerto-btn--ghost concerto-btn--icon",
        "aria-label": "\u5173\u95ED\u753B\u5E03",
        title: "\u5173\u95ED\u753B\u5E03",
        onClick: onClose
      }, h(UiIcon, { name: "close" }))
    ),
    children
  );
  return typeof document !== "undefined" && document.body ? (0, import_react_dom2.createPortal)(dialog, document.body) : dialog;
}
function isNumericCell(val) {
  if (typeof val === "number") return true;
  if (typeof val !== "string") return false;
  return /^-?\d+(?:\.\d+)?%?$/.test(val.trim());
}
function tableCellTone(colName, val) {
  const col = String(colName || "").toLowerCase();
  const txt = String(val || "").trim();
  if (/状态|status|risk|风险|结论/.test(col) || /^(done|completed|pass|通过|高|低|阻塞|blocked|running|进行中)$/i.test(txt)) {
    if (/通过|done|completed|低|已完成|已验收/i.test(txt)) return "concerto-state-done";
    if (/阻塞|高|fail|blocked|失败/i.test(txt)) return "concerto-state-blocked";
    if (/进行|running|in_progress/i.test(txt)) return "concerto-state-running";
    if (/待|review|中等/i.test(txt)) return "concerto-state-review";
  }
  return "";
}
function StructuredObjectCard({
  object,
  tasks = [],
  missingRef = null,
  errorReason = "",
  ambiguousNote = "",
  rendererOverride = "",
  sizeHint = "",
  sessionId = "",
  onJumpTask = null,
  onOpenMember = null,
  highlighted = false,
  userPinned = false,
  onTogglePin = null,
  pinBusy = false,
  badgeLabel = "",
  isApprovedPlan = false,
  goalCompleted = false
}) {
  const [modalOpen, setModalOpen] = import_react14.default.useState(false);
  const [infoOpen, setInfoOpen] = import_react14.default.useState(false);
  const cardRef = import_react14.default.useRef(null);
  const infoButtonRef = import_react14.default.useRef(null);
  const infoPanelRef = import_react14.default.useRef(null);
  const hostTheme = useHostTheme();
  import_react14.default.useEffect(() => {
    if (!infoOpen || typeof document === "undefined") return;
    const native = showAnchoredPopover(infoButtonRef.current, infoPanelRef.current, { width: 420, maxHeight: 360 });
    infoPanelRef.current.dataset.nativePopover = String(native);
    const handleToggle = (event) => {
      if (event.newState === "closed") setInfoOpen(false);
    };
    const handlePointer = (event) => {
      if (!cardRef.current?.contains(event.target)) setInfoOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setInfoOpen(false);
        infoButtonRef.current?.focus({ preventScroll: true });
      }
    };
    if (native) {
      infoPanelRef.current.addEventListener("toggle", handleToggle);
    } else {
      document.addEventListener("pointerdown", handlePointer, true);
      document.addEventListener("keydown", handleKey, true);
    }
    return () => {
      if (native) {
        infoPanelRef.current?.removeEventListener("toggle", handleToggle);
        hideAnchoredPopover(infoPanelRef.current);
      } else {
        document.removeEventListener("pointerdown", handlePointer, true);
        document.removeEventListener("keydown", handleKey, true);
      }
    };
  }, [infoOpen]);
  const defaultCollapsedIds = import_react14.default.useMemo(() => {
    if (object?.type !== "mindmap") return [];
    const raw = object.data?.root ? object.data.root : object.data?.markdown ? parseMarkdownToMindmap(object.data.markdown) : null;
    const root = raw ? normalizeMindmapTree(raw) : null;
    return root ? defaultPreviewCollapsedIdsWithinBudget(root, { fontSize: hostTheme.fontSize }) : [];
  }, [object?.id, object?.version, object?.data, hostTheme.fontSize]);
  const canvasSession = useCanvasSession(sessionId, object?.id, defaultCollapsedIds);
  if (!object) {
    return h(
      "div",
      {
        className: "concerto-card",
        "data-concerto-object-id": missingRef?.id || "missing",
        "data-concerto-object-missing": "true"
      },
      h(
        "div",
        { className: "concerto-card-head" },
        h("strong", null, "\u7ED3\u6784\u5316\u5BF9\u8C61\u4E0D\u53EF\u7528"),
        missingRef && h("span", { className: "concerto-tag concerto-id" }, missingRef.type + ":" + missingRef.id)
      ),
      h("p", { role: "status", style: styles.muted }, errorReason || "\u5F15\u7528\u6307\u5411\u7684\u5BF9\u8C61\u5728\u5F53\u524D\u56E2\u961F\u4F1A\u8BDD\u4E2D\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u79FB\u9664\u3002"),
      missingRef?.raw && h(
        "details",
        null,
        h("summary", { style: { cursor: "pointer", fontSize: "var(--cc-fs-caption)", color: "var(--cc-text-muted)" } }, "\u67E5\u770B\u539F\u6587"),
        h("pre", { style: { whiteSpace: "pre-wrap", fontSize: "var(--cc-fs-code)" } }, missingRef.raw)
      )
    );
  }
  const renderer = resolveObjectRenderer(object, rendererOverride);
  const effectiveSize = sizeHint || object.size || (renderer === "markmap" || object.type === "board" ? "l" : "m");
  let content = null;
  let modalBody = null;
  let renderError = null;
  try {
    if (object.type === "table") {
      const cols = Array.isArray(object.data?.columns) ? object.data.columns : [];
      const rows = Array.isArray(object.data?.rows) ? object.data.rows : [];
      content = h(
        "div",
        { className: "concerto-table-wrap" },
        h(
          "table",
          { className: "concerto-table", "aria-label": object.title || "\u6570\u636E\u8868\u683C" },
          h("thead", null, h("tr", null, cols.map((col, idx) => h("th", { key: idx, scope: "col" }, String(col))))),
          h("tbody", null, rows.map((row, rIdx) => h("tr", { key: rIdx }, cols.map((col, cIdx) => {
            const cell = row[cIdx];
            const tone = tableCellTone(col, cell);
            const numeric = isNumericCell(cell);
            return h("td", {
              key: cIdx,
              className: numeric ? "concerto-num" : void 0,
              style: numeric ? { textAlign: "right" } : void 0
            }, tone ? h("span", { className: "concerto-state-chip " + tone }, String(cell ?? "")) : String(cell ?? ""));
          }))))
        )
      );
    } else if (object.type === "checklist") {
      const items = Array.isArray(object.data?.items) ? object.data.items : [];
      const isLiveChecklist = object.semanticKind === "live_execution";
      content = h("ul", { className: "concerto-checklist" }, items.map((item, idx) => {
        const linkedTask = item.taskId ? tasks.find((t) => t.taskId === item.taskId) : null;
        const checked = isLiveChecklist && linkedTask ? linkedTask.state === "completed" : item.checked === true;
        const subHint = isLiveChecklist && linkedTask ? "\u53EA\u8BFB\u5B9E\u65F6\u4EFB\u52A1\u72B6\u6001\uFF1A" + label(linkedTask.viewState) + "\uFF08" + linkedTask.taskId + "\uFF09" : object.semanticKind === "snapshot" && item.taskId ? "\u5386\u53F2\u5FEB\u7167\uFF08\u5173\u8054 " + item.taskId + "\uFF09" : item.taskId ? "\u5173\u8054\u4EFB\u52A1 " + item.taskId : "";
        return h(
          "li",
          { key: item.id || idx },
          h("span", {
            "aria-hidden": true,
            className: "concerto-state-chip " + (checked ? "concerto-state-done" : "concerto-state-idle")
          }, h(UiIcon, { name: checked ? "checkbox-checked" : "checkbox" })),
          h(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            h("div", null, item.label),
            h("span", { className: "concerto-sr-only" }, checked ? "\u5DF2\u5B8C\u6210" : "\u672A\u5B8C\u6210"),
            (subHint || item.note) && h(
              "div",
              { style: { ...styles.muted, fontSize: "var(--cc-fs-caption)" } },
              subHint,
              subHint && item.note ? " \xB7 " : "",
              item.note || ""
            )
          )
        );
      }));
    } else if (object.type === "mindmap") {
      if (renderer === "excalidraw") {
        content = h(ExcalidrawRenderer, { object, sessionId, inModal: false });
        modalBody = h(ExcalidrawRenderer, { object, sessionId, inModal: true });
      } else if (renderer === "svg") {
        const diagObj = { ...object, type: "diagram", data: mindmapToDiagramData(object.data, object.title) };
        content = h(SvgDiagramRenderer, { object: diagObj, sessionId, inModal: false, onJumpTask });
        modalBody = h(SvgDiagramRenderer, { object: diagObj, sessionId, inModal: true, onJumpTask });
      } else if (renderer === "html") {
        const treeRoot = normalizeMindmapTree(object.data?.root || parseMarkdownToMindmap(object.data?.markdown));
        const renderOutlineNode = (node, depth = 0) => h(
          "li",
          { key: node.id || depth },
          h(
            "div",
            { className: "concerto-mindmap-outline-node" },
            h("span", null, node.label),
            node.status && h("span", { className: "concerto-tag", style: { marginLeft: 6 } }, label(node.status))
          ),
          Array.isArray(node.children) && node.children.length > 0 && h(
            "ul",
            { className: "concerto-mindmap-outline" },
            node.children.map((child) => renderOutlineNode(child, depth + 1))
          )
        );
        const outlineEl = treeRoot ? h(
          "div",
          { "data-concerto-renderer-root": "html-outline" },
          h("ul", { className: "concerto-mindmap-outline concerto-mindmap-outline-root" }, renderOutlineNode(treeRoot, 0))
        ) : h("p", { style: styles.muted }, "\u601D\u7EF4\u5BFC\u56FE\u5185\u5BB9\u4E3A\u7A7A\u3002");
        content = outlineEl;
        modalBody = outlineEl;
      } else {
        content = h(MarkmapRenderer, { object, sessionId, inModal: false, canvasSession, onExpand: () => setModalOpen(true) });
        modalBody = h(MarkmapRenderer, { object, sessionId, inModal: true, canvasSession });
      }
    } else if (object.type === "board" || object.type === "diagram" && renderer === "excalidraw") {
      content = h(ExcalidrawRenderer, { object, sessionId, inModal: false });
      modalBody = h(ExcalidrawRenderer, { object, sessionId, inModal: true });
    } else if (object.type === "diagram") {
      content = h(SvgDiagramRenderer, { object, sessionId, inModal: false, onJumpTask });
      modalBody = h(SvgDiagramRenderer, { object, sessionId, inModal: true, onJumpTask });
    } else if (object.type === "html") {
      content = h(HtmlSandboxRenderer, { object, sessionId, inModal: false });
      modalBody = h(HtmlSandboxRenderer, { object, sessionId, inModal: true });
    } else {
      renderError = "\u672A\u77E5\u7ED3\u6784\u5316\u5BF9\u8C61\u7C7B\u578B\uFF1A" + object.type;
    }
  } catch (err) {
    renderError = err?.message || String(err);
  }
  const semantic = SEMANTIC_META[object.semanticKind || "blueprint"] || SEMANTIC_META.blueprint;
  const showInlineSemantic = object.semanticKind === "live_execution" || object.semanticKind === "snapshot";
  const semanticText = object.title?.includes(semantic.label) ? object.semanticKind === "live_execution" ? "\u5B9E\u65F6" : "\u5FEB\u7167" : semantic.label;
  const layerLabel = object.layer === "review" || object.roleKind === "reviewer" ? "\u5BA1\u67E5\u7EA7" : object.layer === "team" || !object.taskId && object.roleKind === "commander" ? "\u56E2\u961F\u7EA7" : "\u4EFB\u52A1\u7EA7";
  return h(
    "article",
    {
      ref: cardRef,
      className: "concerto-card" + (highlighted ? " concerto-card-highlight" : ""),
      "data-concerto-object-id": object.id,
      "data-concerto-object-version": object.version,
      "data-concerto-renderer": renderer,
      "data-concerto-semantic": object.semanticKind || "blueprint",
      "data-size": effectiveSize,
      tabIndex: -1,
      id: `concerto-stage-obj-${object.type}-${object.id}`
    },
    h(
      "div",
      { className: "concerto-card-head" },
      h(
        "div",
        { className: "concerto-card-head-main" },
        h(
          "div",
          { className: "concerto-card-title-row" },
          h("h3", { title: object.title || `${object.type}:${object.id}` }, object.title || object.type + ":" + object.id),
          showInlineSemantic && h("span", {
            className: "concerto-state-chip concerto-semantic-pill " + semantic.cls,
            "data-semantic": object.semanticKind,
            title: object.snapshotAt ? "\u5FEB\u7167\u65F6\u95F4\uFF1A" + new Date(object.snapshotAt).toLocaleString() : semantic.label
          }, semanticText),
          isApprovedPlan && h("span", {
            className: "concerto-state-chip concerto-semantic-pill " + (goalCompleted ? "concerto-state-done" : "concerto-state-idle"),
            "data-concerto-plan-status": goalCompleted ? "completed" : "approved",
            title: goalCompleted ? "\u56E2\u961F\u76EE\u6807\u5DF2\u7ED3\u9879\uFF0C\u8BE5\u8BA1\u5212\u5DF2\u5B8C\u6210\u6267\u884C" : "\u5F53\u524D\u5DF2\u6279\u51C6\u7684\u56E2\u961F\u8BA1\u5212\u57FA\u7EBF"
          }, goalCompleted ? "\u76EE\u6807\u5DF2\u7ED3\u9879" : "\u5DF2\u6279\u51C6\u8BA1\u5212")
        ),
        object.caption && h("div", { className: "concerto-card-caption", title: object.caption }, object.caption)
      ),
      h(
        "div",
        { className: "concerto-hover-tools" },
        onTogglePin && h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--ghost concerto-btn--icon concerto-btn--pin",
          "aria-pressed": userPinned,
          disabled: pinBusy,
          "data-concerto-pin": `${object.type}:${object.id}`,
          "aria-label": userPinned ? "\u5DF2\u7F6E\u9876\uFF08\u70B9\u51FB\u53D6\u6D88\uFF09" : "\u7F6E\u9876\u5230\u6982\u89C8\u9884\u89C8",
          title: userPinned ? "\u53D6\u6D88\u4E2A\u4EBA\u7F6E\u9876" : "\u4E2A\u4EBA\u7F6E\u9876\u5230\u6982\u89C8\u9884\u89C8\uFF08\u6A21\u578B\u66F4\u65B0\u4E0D\u8986\u76D6\uFF09",
          onClick: () => onTogglePin(object)
        }, h(UiIcon, { name: "pin", filled: userPinned })),
        modalBody && h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--ghost concerto-btn--icon",
          "aria-label": "\u5C55\u5F00\u753B\u5E03",
          title: "\u5168\u5C4F\u67E5\u770B",
          onClick: () => setModalOpen(true)
        }, h(UiIcon, { name: "expand" })),
        h("button", {
          ref: infoButtonRef,
          type: "button",
          className: "concerto-btn concerto-btn--ghost concerto-btn--icon",
          title: "\u67E5\u770B\u6E32\u67D3\u5F15\u64CE\u3001\u6765\u6E90\u4E0E\u7248\u672C\u5143\u6570\u636E",
          "aria-expanded": infoOpen,
          "aria-label": `\u67E5\u770B ${object.title || object.id} \u5143\u6570\u636E`,
          onPointerDown: (event) => {
            if (infoOpen) event.preventDefault();
          },
          onClick: () => setInfoOpen((v) => !v)
        }, h(UiIcon, { name: "info" }))
      )
    ),
    infoOpen && h(
      "div",
      {
        ref: infoPanelRef,
        popover: "auto",
        role: "dialog",
        "aria-label": `${object.title || object.id} \u5143\u6570\u636E`,
        className: "concerto-info-pop"
      },
      h(
        "div",
        null,
        "\u5F15\u7528\uFF1A",
        h("code", { className: "concerto-id" }, `${object.type}:${object.id}`),
        " \xB7 \u8BED\u4E49\uFF1A",
        h("strong", null, semantic.label),
        object.snapshotAt ? "\uFF08" + new Date(object.snapshotAt).toLocaleString() + "\uFF09" : "",
        badgeLabel ? " \xB7 " : "",
        badgeLabel && h("span", { className: "concerto-tag" }, badgeLabel)
      ),
      h(
        "div",
        { style: { marginTop: 4 } },
        "\u6E32\u67D3\u5F15\u64CE\uFF1A",
        RENDERER_LABELS[renderer] || renderer,
        ENGINE_DETAILS[renderer] ? " \u2014 " + ENGINE_DETAILS[renderer] : ""
      ),
      h(
        "div",
        { style: { marginTop: 4 } },
        "\u6240\u6709\u8005\uFF1A",
        object.source === "user_import" ? "\u672C\u673A\u7528\u6237" : onOpenMember && object.authorId ? h("button", { type: "button", className: "concerto-chip", onClick: () => onOpenMember(object.authorId) }, object.authorId) : object.ownerId || object.authorId || "\u672A\u77E5",
        " \xB7 \u5C42\u7EA7\uFF1A",
        h("span", { className: "concerto-tag" }, layerLabel),
        " \xB7 \u7248\u672C\uFF1A",
        h("span", { className: "concerto-id" }, "v" + object.version)
      ),
      object.source === "user_import" && h("div", { style: { marginTop: 4 } }, "\u6765\u6E90\uFF1A\u7528\u6237\u5BFC\u5165"),
      Array.isArray(object.editableBy) && object.editableBy.length > 0 && h(
        "div",
        { style: { marginTop: 4 } },
        "\u7F16\u8F91\u6743\u9650\uFF1A",
        h("span", { className: "concerto-id" }, object.editableBy.join(", "))
      ),
      object.taskId && h(
        "div",
        { style: { marginTop: 4 } },
        "\u5173\u8054\u4EFB\u52A1\uFF1A",
        onJumpTask ? h("button", { type: "button", className: "concerto-chip concerto-id", onClick: () => onJumpTask(object.taskId) }, object.taskId) : h("span", { className: "concerto-id" }, object.taskId)
      ),
      object.updatedAt && h("div", { style: { marginTop: 4, color: "var(--dsw-alias-label-tertiary)" } }, "\u66F4\u65B0\u65F6\u95F4\uFF1A" + new Date(object.updatedAt).toLocaleString()),
      h(
        "details",
        { style: { marginTop: 4 } },
        h("summary", { style: { cursor: "pointer" } }, "\u67E5\u770B\u539F\u59CB\u6570\u636E JSON"),
        h("pre", { style: { whiteSpace: "pre-wrap", maxHeight: 180, overflow: "auto", fontSize: "var(--cc-fs-code)" } }, JSON.stringify(object.data, null, 2))
      )
    ),
    ambiguousNote && h("p", { style: { ...styles.muted, fontSize: "var(--cc-fs-caption)", marginTop: 0 } }, ambiguousNote),
    renderError ? h(
      "div",
      { role: "alert", style: { padding: 10, borderRadius: "var(--cc-radius-ctrl)", background: "var(--cc-state-blocked-bg)" } },
      h("strong", null, "\u6E32\u67D3\u964D\u7EA7\uFF1A"),
      renderError,
      h("pre", { style: { whiteSpace: "pre-wrap", fontSize: "var(--cc-fs-code)" } }, JSON.stringify(object.data, null, 2))
    ) : content,
    modalOpen && modalBody && h(CanvasModal, {
      title: object.title || `${object.type}:${object.id}`,
      onClose: () => setModalOpen(false)
    }, modalBody)
  );
}

// packages/dsh-concerto/src/client/components/ReferenceText.js
function scrollToInlineObjectRef(type, id) {
  if (typeof document === "undefined") return;
  const normType = type === "canvas" ? "board" : type;
  const el = document.getElementById(`concerto-stage-obj-${normType}-${id}`) || document.querySelector(`[data-concerto-object-id="${CSS.escape ? CSS.escape(id) : id}"]`);
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
function renderInlineSpans(line, onJumpObject, viewObjects = [], onViewAllArtifacts = null) {
  const parts = [];
  const re2 = /(`[^`]+`|\*\*[^*]+\*\*|\b(?:table|checklist|mindmap|diagram|board|canvas|html):[a-zA-Z0-9][a-zA-Z0-9._-]{0,63})/g;
  const rawRefs = line.match(/\b(?:table|checklist|mindmap|diagram|board|canvas|html):[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}/g) || [];
  const collapseThreshold = rawRefs.length > 3 ? 2 : Infinity;
  let shownRefCount = 0;
  let skippedCollapsed = 0;
  let last = 0;
  let m;
  while ((m = re2.exec(line)) !== null) {
    if (m.index > last) {
      const gap = line.slice(last, m.index);
      if (!(shownRefCount >= collapseThreshold && /^[\s、,，;；与和]+$/.test(gap))) {
        parts.push(gap);
      }
    }
    const tok = m[0];
    if (tok.startsWith("`")) {
      parts.push(h("code", {
        key: parts.length,
        style: { fontFamily: "var(--cc-font-mono)", fontSize: "var(--cc-fs-code)", padding: "1px 5px", borderRadius: "var(--cc-radius-ctrl)", background: "var(--cc-card-nested-bg)" }
      }, tok.slice(1, -1)));
    } else if (tok.startsWith("**")) {
      parts.push(h("strong", { key: parts.length }, tok.slice(2, -2)));
    } else {
      const colonIdx = tok.indexOf(":");
      const rawType = tok.slice(0, colonIdx);
      const normType = rawType === "canvas" ? "board" : rawType;
      const refId = tok.slice(colonIdx + 1);
      if (shownRefCount < collapseThreshold) {
        shownRefCount += 1;
        const obj = (viewObjects || []).find((o) => o.type === normType && o.id === refId);
        const displayLabel = obj?.title || refId;
        parts.push(h("button", {
          key: parts.length,
          type: "button",
          className: "concerto-chip",
          title: tok,
          "data-concerto-inline-ref": `${normType}:${refId}`,
          style: { margin: "0 2px", verticalAlign: "baseline" },
          onClick: () => onJumpObject ? onJumpObject({ type: normType, id: refId }) : scrollToInlineObjectRef(normType, refId)
        }, h(UiIcon, { name: normType }), displayLabel));
      } else {
        skippedCollapsed += 1;
      }
    }
    last = m.index + tok.length;
  }
  if (skippedCollapsed > 0) {
    parts.push(" ");
    parts.push(h("button", {
      key: "more-" + parts.length,
      type: "button",
      className: "concerto-link",
      onClick: () => onViewAllArtifacts ? onViewAllArtifacts() : onJumpObject?.({ id: "" })
    }, `+${skippedCollapsed} \u4EFD\u4EA7\u7269 \u203A`));
  }
  if (last < line.length) {
    const tail = line.slice(last);
    if (!(skippedCollapsed > 0 && /^[\s。.,，、]+$/.test(tail))) {
      parts.push(tail);
    }
  }
  return parts;
}
function InlineTextWithRefs({ text, onJumpObject = null, viewObjects = [], onViewAllArtifacts = null }) {
  return h("span", null, ...renderInlineSpans(String(text ?? ""), onJumpObject, viewObjects, onViewAllArtifacts));
}
function SimpleMarkdownBlock({ text, onJumpObject, viewObjects, onViewAllArtifacts }) {
  const lines = String(text ?? "").split(/\r?\n/);
  const nodes = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith("```")) {
      const end = lines.findIndex((l, idx) => idx > i && l.trim().startsWith("```"));
      const codeLines = end > i ? lines.slice(i + 1, end) : lines.slice(i + 1);
      nodes.push(h("pre", {
        key: nodes.length,
        style: { margin: "6px 0", padding: "8px 10px", borderRadius: "var(--cc-radius-ctrl)", background: "var(--cc-card-nested-bg)", border: "1px solid var(--cc-border-subtle)", overflowX: "auto", fontSize: "var(--cc-fs-code)" }
      }, h("code", null, codeLines.join("\n"))));
      i = end > i ? end + 1 : lines.length;
      continue;
    }
    const hMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (hMatch) {
      nodes.push(h("div", { key: nodes.length, style: { fontWeight: 600, fontSize: hMatch[1].length <= 2 ? "var(--cc-fs-title)" : "var(--cc-fs-body)", marginTop: 6 } }, ...renderInlineSpans(hMatch[2], onJumpObject, viewObjects, onViewAllArtifacts)));
      i += 1;
      continue;
    }
    if (/^[-*+]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i += 1;
      }
      nodes.push(h(
        "ul",
        { key: nodes.length, style: { margin: "4px 0", paddingLeft: 18 } },
        items.map((it2, idx) => h("li", { key: idx }, ...renderInlineSpans(it2, onJumpObject, viewObjects, onViewAllArtifacts)))
      ));
      continue;
    }
    nodes.push(h("p", { key: nodes.length, style: { margin: "4px 0", whiteSpace: "pre-wrap" } }, ...renderInlineSpans(line, onJumpObject, viewObjects, onViewAllArtifacts)));
    i += 1;
  }
  return h("div", null, nodes);
}
function ReferenceText({
  text,
  viewObjects = [],
  tasks = [],
  pinnedRefs = [],
  context = {},
  sessionId = "",
  skipPinnedIds = null,
  onJumpTask = null,
  onOpenMember = null,
  onJumpObject = null,
  onViewAllArtifacts = null,
  isLight = false
}) {
  const tokens = parseViewObjectReferences(text);
  if (tokens.length === 0) return null;
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 8 } },
    tokens.map((tok, idx) => {
      if (tok.kind === "text") {
        return h(SimpleMarkdownBlock, { key: "t-" + idx, text: tok.text, onJumpObject, viewObjects, onViewAllArtifacts });
      }
      if (tok.kind === "ref_error") {
        return h(StructuredObjectCard, {
          key: "err-" + idx,
          object: null,
          missingRef: tok,
          errorReason: tok.reason
        });
      }
      const obj = resolveViewObjectRef(viewObjects, tok, { ...context, pinnedRefs });
      if (skipPinnedIds && skipPinnedIds.has(`${tok.type}:${tok.id}`)) {
        const displayTitle = obj.ok ? obj.object.title || `${tok.type}:${tok.id}` : `${tok.type}:${tok.id}`;
        return h(
          "div",
          { key: "skip-" + idx },
          h("button", {
            type: "button",
            className: "concerto-chip",
            title: `${tok.type}:${tok.id}`,
            "data-concerto-inline-ref": `${tok.type}:${tok.id}`,
            onClick: () => onJumpObject ? onJumpObject({ type: tok.type, id: tok.id }) : scrollToInlineObjectRef(tok.type, tok.id)
          }, h(UiIcon, { name: tok.type }), displayTitle + " \u203A")
        );
      }
      if (!obj.ok) {
        return h(StructuredObjectCard, {
          key: "miss-" + idx,
          object: null,
          missingRef: tok,
          errorReason: obj.reason
        });
      }
      return h(StructuredObjectCard, {
        key: `ref-${obj.object.id}-${idx}`,
        object: obj.object,
        tasks,
        rendererOverride: tok.renderer || "",
        sizeHint: tok.size || "",
        ambiguousNote: obj.ambiguous ? "\u5F53\u524D\u8FD0\u884C\u5185\u5B58\u5728\u591A\u4E2A\u540C\u540D\u5BF9\u8C61\uFF0C\u5DF2\u6309\u540C\u4EFB\u52A1/\u540C\u4F5C\u8005/\u7F6E\u9876\u4F18\u5148\u7EA7\u89E3\u6790\u3002" : "",
        sessionId,
        onJumpTask,
        onOpenMember,
        isLight
      });
    })
  );
}

// packages/dsh-concerto/src/client/components/MemberDrawer.js
var import_react16 = __toESM(require_react(), 1);

// packages/dsh-concerto/src/client/components/Tabs.js
var import_react15 = __toESM(require_react(), 1);
function TabList({ id, label: label2, tabs, value, onChange, className = "concerto-tabs" }) {
  const nativeFocusGroup = typeof HTMLElement !== "undefined" && Object.hasOwn(HTMLElement.prototype, "focusGroup");
  const groupRef = import_react15.default.useRef(null);
  const [polyfilled, setPolyfilled] = import_react15.default.useState(false);
  import_react15.default.useEffect(() => {
    if (nativeFocusGroup) return;
    let cancelled = false;
    import("/concerto/assets/focusgroup.js").then(({ polyfill }) => {
      if (cancelled) return;
      polyfill(groupRef.current);
      setPolyfilled(true);
    }).catch((err) => console.error("[Concerto] focusgroup unavailable; keeping keyboard fallback", err));
    return () => {
      cancelled = true;
    };
  }, [nativeFocusGroup]);
  return h("div", {
    ref: groupRef,
    className,
    role: "tablist",
    "aria-label": label2,
    focusgroup: "tablist nomemory",
    onKeyDown: (event) => {
      if (nativeFocusGroup || polyfilled || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = [...event.currentTarget.querySelectorAll('[role="tab"]')];
      const index = buttons.indexOf(document.activeElement);
      const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
      const step = event.key === "ArrowRight" ? direction : -direction;
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
      event.preventDefault();
      buttons[next].focus();
    }
  }, tabs.map((tab) => h(
    "button",
    {
      key: tab.value,
      id: `${id}-tab-${tab.value}`,
      type: "button",
      role: "tab",
      className: "concerto-tab-btn",
      "data-concerto-tab": tab.value,
      "aria-selected": value === tab.value,
      "aria-label": tab.attentionCount > 0 ? `${tab.label}\uFF0C${tab.attentionCount} \u9879\u5F85\u5904\u7406` : void 0,
      focusgroupstart: value === tab.value ? "" : void 0,
      tabIndex: nativeFocusGroup || polyfilled ? void 0 : value === tab.value ? 0 : -1,
      onClick: () => onChange(tab.value)
    },
    tab.label,
    tab.count > 0 && h("span", { className: "concerto-tag concerto-num" }, String(tab.count)),
    tab.attentionCount > 0 && h("span", { className: "concerto-tab-attention concerto-num", "aria-hidden": "true" }, String(tab.attentionCount))
  )));
}
function tabPanelProps(id, value) {
  return { id: `${id}-panel-${value}`, role: "tabpanel", "aria-labelledby": `${id}-tab-${value}`, tabIndex: 0 };
}
function focusAndReveal(element, block = "center") {
  if (!element) return;
  element.focus({ preventScroll: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block });
}

// packages/dsh-concerto/src/client/components/MemberDrawer.js
var HISTORY_SOURCE_DESC = {
  codex_normalized: "Codex app-server \xB7 \u6D88\u606F\u4E0E\u5DE5\u5177\u6D3B\u52A8\u8BB0\u5F55",
  connector_normalized: "\u5916\u90E8\u8FDE\u63A5\u5668 \xB7 \u5F52\u4E00\u5316\u6D88\u606F\u4E0E\u5DE5\u5177\u6D3B\u52A8\u8BB0\u5F55",
  hosted_session: "DSH Hosted \xB7 \u5BBF\u4E3B session \u4E8B\u4EF6\u6295\u5F71 + Runtime \u8BB0\u5F55\uFF08\u5B8C\u6574\u5EA6\u5F85\u771F\u5B9E\u5BBF\u4E3B\u9A8C\u8BC1\uFF09",
  hosted_partial: "DSH Hosted \xB7 \u4EC5 Runtime \u8BB0\u5F55\u4E0E\u51B3\u7B56\u6458\u8981\uFF08\u672A\u8BFB\u53D6\u5230\u5BBF\u4E3B\u4F1A\u8BDD\u4E8B\u4EF6\uFF09",
  runtime_only: "\u8BE5\u540E\u7AEF\u4EC5\u63D0\u4F9B Runtime \u751F\u547D\u5468\u671F\u8BB0\u5F55"
};
function EmptyState({ icon, text, action = null }) {
  return h(
    "div",
    { className: "concerto-empty" },
    h("span", { "aria-hidden": true, style: { fontSize: "var(--cc-fs-display)" } }, icon),
    h("p", { style: { margin: 0 } }, text),
    action
  );
}
function dutyAuthor(record) {
  return record.author.kind === "user" ? "\u7528\u6237" : `\u6307\u6325\u8005 ${record.author.id}`;
}
function MemberDutiesPanel({ sessionId, memberId }) {
  const fieldId = import_react16.default.useId();
  const [data, setData] = import_react16.default.useState(null);
  const [draft, setDraft] = import_react16.default.useState(null);
  const [pending, setPending] = import_react16.default.useState(false);
  const [message, setMessage] = import_react16.default.useState("");
  const [needsReload, setNeedsReload] = import_react16.default.useState(false);
  const [reload, setReload] = import_react16.default.useState(0);
  import_react16.default.useEffect(() => {
    let active = true;
    fetchMemberDuties(sessionId, memberId).then((result) => {
      if (!active) return;
      setData(result);
      setNeedsReload(false);
    }, (error) => {
      if (!active) return;
      setMessage(`\u8BFB\u53D6\u5931\u8D25\uFF1A${error.message}`);
      setNeedsReload(true);
    });
    return () => {
      active = false;
    };
  }, [sessionId, memberId, reload]);
  const current = data?.current;
  const save = async (event) => {
    event.preventDefault();
    const action = event.nativeEvent.submitter?.value || "save";
    const body = new FormData(event.currentTarget).get("body");
    setPending(true);
    setMessage("");
    try {
      const updated = await updateMemberDuties(sessionId, memberId, {
        action,
        ...action === "save" ? { body } : {},
        expectedVersion: current?.version ?? 0
      });
      setData(updated);
      setDraft(null);
      setMessage(action === "save" ? `\u5DF2\u4FDD\u5B58 v${updated.current.version}\u3002` : "\u5DF2\u64A4\u9500\u3002");
    } catch (error) {
      setMessage(error.message);
      setNeedsReload(error.status === 409);
    } finally {
      setPending(false);
    }
  };
  return h(
    "div",
    { className: "concerto-card" },
    data && h(
      "form",
      { action: `${API}/members/duties`, method: "post", onSubmit: save },
      h(
        "div",
        { style: styles.muted },
        current ? `v${current.version} \xB7 ${dutyAuthor(current)} \xB7 ${current.active ? "\u751F\u6548\u4E2D" : "\u5DF2\u64A4\u9500"}` : "\u6682\u65E0\u804C\u8D23\u8865\u5145"
      ),
      h(
        "div",
        { className: "concerto-field" },
        h("label", { htmlFor: fieldId }, "\u9879\u76EE\u6210\u5458\u804C\u8D23\u8865\u5145\uFF08\u5FC5\u586B\uFF09"),
        h("textarea", {
          id: fieldId,
          name: "body",
          className: "concerto-textarea",
          rows: 4,
          value: draft ?? current?.body ?? "",
          required: true,
          maxLength: data.maxLength,
          disabled: pending,
          "aria-describedby": fieldId + "-hint",
          onChange: (event) => setDraft(event.target.value)
        }),
        h("p", { id: fieldId + "-hint", className: "concerto-field-hint" }, "\u7528\u4E8E\u8BE5\u6210\u5458\u540E\u7EED\u6D3E\u53D1\u3002\u53EF\u586B\u5199\u804C\u8D23\u91CD\u70B9\u3001\u9879\u76EE\u7EA6\u5B9A\u548C\u4EA4\u4ED8\u8981\u6C42\u3002")
      ),
      h(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
        h("button", { type: "submit", value: "save", className: "concerto-btn concerto-btn--primary", disabled: pending || needsReload }, "\u4FDD\u5B58\u804C\u8D23"),
        current?.active && h("button", {
          type: "submit",
          value: "revoke",
          className: "concerto-btn concerto-btn--ghost",
          formNoValidate: true,
          disabled: pending || needsReload
        }, "\u64A4\u9500\u804C\u8D23")
      )
    ),
    h("div", { role: "status", style: styles.muted }, message || (!data ? "\u6B63\u5728\u8BFB\u53D6\u804C\u8D23\u8865\u5145\u2026" : "")),
    needsReload && h("button", {
      type: "button",
      className: "concerto-btn concerto-btn--ghost",
      onClick: () => {
        setMessage("");
        setReload((value) => value + 1);
      }
    }, "\u91CD\u65B0\u8BFB\u53D6"),
    data?.versions.length > 0 && h(
      "details",
      { style: { marginTop: 8 } },
      h("summary", null, "\u7248\u672C\u5386\u53F2"),
      h("ol", null, data.versions.slice().reverse().map((record) => h(
        "li",
        { key: record.version },
        `v${record.version} \xB7 ${dutyAuthor(record)} \xB7 ${new Date(record.updatedAt).toLocaleString()} ${record.active ? "" : "\xB7 \u5DF2\u64A4\u9500"}`,
        record.active && h("p", { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" } }, record.body)
      )))
    )
  );
}
function activityFromSnapshotEvents(snapshot, memberId) {
  const memberExecs = (snapshot?.executions || []).filter((e) => e.memberId === memberId);
  const items = [];
  for (const ev of snapshot?.events || []) {
    const owned = ev.actor?.id === memberId || memberExecs.some((x) => x.executionId === ev.executionId);
    if (!owned) continue;
    if (ev.type === "output.message") {
      items.push({
        activityId: ev.eventId,
        kind: "message",
        taskId: ev.taskId,
        executionId: ev.executionId,
        summary: (ev.payload?.text || "").slice(0, 100),
        text: ev.payload?.text || "",
        recordedAt: ev.recordedAt
      });
    } else {
      items.push({
        activityId: ev.eventId,
        kind: ev.type.includes("approval") || ev.type.includes("question") ? "request" : "result",
        taskId: ev.taskId,
        executionId: ev.executionId,
        summary: (EVENT_LABEL[ev.type] || ev.type) + (ev.payload?.note ? " \xB7 " + ev.payload.note : ""),
        detail: ev.payload,
        recordedAt: ev.recordedAt
      });
    }
  }
  return items;
}
function mergeLatestActivities(prev, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return prev || [];
  const byId = /* @__PURE__ */ new Map();
  for (const item of incoming) {
    if (item?.activityId) byId.set(item.activityId, item);
  }
  const seen = /* @__PURE__ */ new Set();
  const updated = [];
  for (const item of prev || []) {
    const id = item?.activityId;
    if (!id) continue;
    seen.add(id);
    updated.push(byId.get(id) || item);
  }
  const additions = [];
  for (const item of incoming) {
    if (!item?.activityId || seen.has(item.activityId)) continue;
    seen.add(item.activityId);
    additions.push(item);
  }
  if (additions.length === 0 && updated.every((item, i) => item === (prev || [])[i])) {
    return prev || [];
  }
  return [...updated, ...additions];
}
function prependOlderActivities(prev, olderItems) {
  if (!Array.isArray(olderItems) || olderItems.length === 0) return prev || [];
  const existingIds = new Set((prev || []).map((item) => item.activityId));
  const uniqueOlder = olderItems.filter((item) => item?.activityId && !existingIds.has(item.activityId));
  return [...uniqueOlder, ...prev || []];
}
function MemberDrawer({
  member,
  state,
  sessionId,
  snapshot,
  canManageDuties = false,
  initialTab = "messages",
  onClose,
  onJumpTask,
  onOpenMember,
  onJumpObject,
  returnTaskId = "",
  onBack = null
}) {
  const [tab, setTab] = import_react16.default.useState(initialTab);
  const [activities, setActivities] = import_react16.default.useState([]);
  const [hasMore, setHasMore] = import_react16.default.useState(false);
  const [nextBefore, setNextBefore] = import_react16.default.useState(null);
  const [historyMode, setHistoryMode] = import_react16.default.useState("runtime_only");
  const [loading, setLoading] = import_react16.default.useState(false);
  const [loadingOlder, setLoadingOlder] = import_react16.default.useState(false);
  const [historyError, setHistoryError] = import_react16.default.useState("");
  const [olderError, setOlderError] = import_react16.default.useState("");
  const [historyRetry, setHistoryRetry] = import_react16.default.useState(0);
  const tabsId = import_react16.default.useId();
  const bodyRef = import_react16.default.useRef(null);
  const hasLoadedInitialRef = import_react16.default.useRef(false);
  const pagedOlderRef = import_react16.default.useRef(false);
  const loadingOlderRef = import_react16.default.useRef(false);
  const requestGenRef = import_react16.default.useRef(0);
  const pendingScrollAnchorRef = import_react16.default.useRef(null);
  import_react16.default.useEffect(() => {
    setTab(initialTab || "messages");
  }, [member?.id, initialTab]);
  import_react16.default.useEffect(() => {
    requestGenRef.current += 1;
    hasLoadedInitialRef.current = false;
    pagedOlderRef.current = false;
    loadingOlderRef.current = false;
    pendingScrollAnchorRef.current = null;
    setActivities([]);
    setHasMore(false);
    setNextBefore(null);
    setLoadingOlder(false);
    setHistoryError("");
    setOlderError("");
  }, [member?.id, sessionId]);
  import_react16.default.useLayoutEffect(() => {
    const anchor = pendingScrollAnchorRef.current;
    const body = bodyRef.current;
    if (!anchor || !body) return;
    pendingScrollAnchorRef.current = null;
    const delta = body.scrollHeight - anchor.prevScrollHeight;
    if (delta > 0) body.scrollTop = anchor.prevScrollTop + delta;
  }, [activities]);
  import_react16.default.useEffect(() => {
    if (!member?.id || !sessionId) return;
    const isInitial = !hasLoadedInitialRef.current;
    const gen = requestGenRef.current;
    let cancelled = false;
    if (isInitial) setLoading(true);
    fetchMemberActivity(sessionId, member.id, { limit: 30 }).then((res) => {
      if (cancelled || requestGenRef.current !== gen) return;
      const incoming = Array.isArray(res.items) ? res.items : [];
      setHistoryError("");
      const firstApply = !hasLoadedInitialRef.current;
      hasLoadedInitialRef.current = true;
      setActivities((prev) => firstApply ? incoming : mergeLatestActivities(prev, incoming));
      if (firstApply || !pagedOlderRef.current) {
        setHasMore(Boolean(res.hasMore));
        setNextBefore(res.nextBefore ?? null);
      }
      setHistoryMode(res.backendHistoryMode || (member.connector === "codex" ? "codex_normalized" : "hosted_partial"));
    }).catch((err) => {
      if (cancelled || requestGenRef.current !== gen) return;
      const fallback = activityFromSnapshotEvents(snapshot, member.id);
      const firstApply = !hasLoadedInitialRef.current;
      hasLoadedInitialRef.current = true;
      setActivities((prev) => firstApply ? fallback : mergeLatestActivities(prev, fallback));
      if (firstApply) {
        setHasMore(false);
        setNextBefore(null);
      }
      if (firstApply) setHistoryMode("runtime_only");
      setHistoryError(`\u5386\u53F2\u540C\u6B65\u5931\u8D25\uFF1A${err.message}\u3002${firstApply ? "\u5F53\u524D\u4EC5\u663E\u793A Runtime \u8BB0\u5F55\u3002" : "\u5DF2\u4FDD\u7559\u52A0\u8F7D\u8FC7\u7684\u8BB0\u5F55\u3002"}`);
    }).finally(() => {
      if (!cancelled && isInitial) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [member?.id, sessionId, snapshot?.serverTime, historyRetry]);
  async function loadOlder() {
    if (!nextBefore || loadingOlderRef.current) return;
    const gen = requestGenRef.current;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setOlderError("");
    try {
      const res = await fetchMemberActivity(sessionId, member.id, { before: nextBefore, limit: 30 });
      if (requestGenRef.current !== gen) return;
      if (Array.isArray(res.items) && res.items.length > 0) {
        const body = bodyRef.current;
        if (body) {
          pendingScrollAnchorRef.current = {
            prevScrollHeight: body.scrollHeight,
            prevScrollTop: body.scrollTop
          };
        }
        pagedOlderRef.current = true;
        setActivities((prev) => prependOlderActivities(prev, res.items));
        setHasMore(Boolean(res.hasMore));
        setNextBefore(res.nextBefore ?? null);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      if (requestGenRef.current === gen) setOlderError("\u66F4\u65E9\u6D88\u606F\u52A0\u8F7D\u5931\u8D25\uFF1A" + err.message);
    } finally {
      if (requestGenRef.current === gen) {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      }
    }
  }
  if (!member) return null;
  const viewObjects = Array.isArray(snapshot?.viewObjects) ? snapshot.viewObjects : [];
  const pinnedRefs = snapshot?.publicView?.pinnedRefs || [];
  const userPinnedSet = new Set(Array.isArray(snapshot?.userPinnedRefs) ? snapshot.userPinnedRefs : []);
  const memberExecs = (snapshot?.executions || []).filter((e) => e.memberId === member.id);
  const memberTasks = member.roleKind === "commander" ? snapshot?.tasks || [] : (snapshot?.tasks || []).filter((t) => t.memberId === member.id || t.review?.actor?.id === member.id || memberExecs.some((e) => e.taskId === t.taskId));
  const memberObjects = viewObjects.filter((o) => o.authorId === member.id || Array.isArray(o.editableBy) && o.editableBy.includes(member.id));
  const currentTask = memberTasks.find((t) => !["completed", "cancelled"].includes(t.state)) || memberTasks.at(-1);
  const memberCap = (snapshot?.metadata?.memberCapabilities || []).find((c) => c.memberId === member.id) || null;
  const capSummary = memberCap ? formatCapabilitySummary(memberCap) : null;
  const hostChat = member.roleKind === "commander" ? readHostChatMessages(sessionId) : { supported: false, messages: [] };
  const mergedMessages = activities.length > 0 ? activities : activityFromSnapshotEvents(snapshot, member.id);
  return h(
    InspectorDialog,
    {
      title: `\u6210\u5458\u8BE6\u60C5\uFF1A${member.id}`,
      onClose,
      className: "concerto-member-inspector-dialog",
      dialogProps: { "data-concerto-member-drawer": member.id }
    },
    h(
      "div",
      { className: "concerto-drawer-head" },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 } },
        returnTaskId && h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--ghost",
          "aria-label": `\u8FD4\u56DE ${returnTaskId}`,
          onClick: onBack || onClose
        }, `\u2190 ${returnTaskId}`),
        h(MemberGlyph, { member, state, size: 56 }),
        h(
          "div",
          { style: { minWidth: 0, flex: 1 } },
          h(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" } },
            h("h2", { className: "concerto-dialog-title" }, member.id + (member.roleKind === "commander" ? " \xB7 \u6307\u6325\u8005" : member.roleKind === "reviewer" ? " \xB7 \u5BA1\u67E5\u8005" : " \xB7 \u6267\u884C\u8005")),
            h(StateChip, { status: state, text: label(state) }),
            h("span", { className: "concerto-tag" }, member.connector ? member.connector === "codex" ? "codex \xB7 app-server" : `\u5916\u90E8\u8FDE\u63A5\u5668 \xB7 ${member.connector}` : member.source === "hosted" ? "DSH Hosted" : "\u5916\u90E8\u540E\u7AEF"),
            capSummary && h("span", {
              className: "concerto-chip",
              "data-concerto-capability-status": memberCap?.verificationStatus || "unknown",
              title: capSummary.summary
            }, capSummary.badge)
          ),
          capSummary && h(
            "div",
            { style: { fontSize: "var(--cc-fs-caption)", color: "var(--cc-text-secondary)", marginTop: 4 } },
            capSummary.summary + (capSummary.tools.length > 0 ? `\uFF08\u5DE5\u5177\uFF1A${capSummary.tools.join(", ")}\uFF09` : "")
          ),
          currentTask && h(
            "div",
            { style: { fontSize: "var(--cc-fs-meta)", color: "var(--cc-text-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("span", null, "\u5F53\u524D\u4EFB\u52A1\uFF1A" + currentTask.title),
            onJumpTask && h("button", {
              type: "button",
              className: "concerto-link concerto-id",
              onClick: () => {
                onClose?.(false);
                onJumpTask(currentTask.taskId, { memberId: member.id, label: currentTask.taskId });
              }
            }, `\u5B9A\u4F4D ${currentTask.taskId} \u203A`)
          )
        )
      ),
      h("button", {
        ref: (node) => node?.setAttribute("autofocus", ""),
        type: "button",
        className: "concerto-btn concerto-btn--ghost concerto-btn--icon",
        "aria-label": "\u5173\u95ED",
        title: "\u5173\u95ED\u6210\u5458\u8BE6\u60C5",
        onClick: onClose
      }, h(UiIcon, { name: "close" }))
    ),
    h(TabList, { id: tabsId, label: `${member.id} \u6210\u5458\u8BE6\u60C5`, className: "concerto-drawer-tabs", value: tab, onChange: setTab, tabs: [
      { value: "messages", label: "\u6D88\u606F\u4E0E\u6D3B\u52A8" },
      { value: "tasks", label: "\u4EFB\u52A1", count: memberTasks.length },
      { value: "objects", label: "\u4EA7\u7269", count: memberObjects.length },
      { value: "executions", label: "\u6267\u884C\u8BB0\u5F55", count: memberExecs.length },
      ...canManageDuties && member.roleKind !== "commander" ? [{ value: "duties", label: "\u9879\u76EE\u804C\u8D23" }] : []
    ] }),
    h(
      "div",
      { ...tabPanelProps(tabsId, tab), ref: bodyRef, className: "concerto-drawer-body" },
      tab === "duties" && h(MemberDutiesPanel, { sessionId, memberId: member.id }),
      tab === "messages" && h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 10 } },
        h(
          "div",
          { className: "concerto-tag", style: { alignSelf: "flex-start" } },
          member.roleKind === "commander" ? hostChat.supported ? "DSH \u4F1A\u8BDD\u6D88\u606F + Runtime \u51B3\u7B56" : historyMode === "hosted_session" ? HISTORY_SOURCE_DESC.hosted_session : "\u5BF9\u8BDD\u6B63\u6587\u8BF7\u770B\u5BF9\u8BDD\u9875\u7B7E \xB7 \u5F53\u524D\u5C55\u793A Commander Runtime \u51B3\u7B56\u8BB0\u5F55" : HISTORY_SOURCE_DESC[historyMode] || "\u8BE5\u540E\u7AEF\u672A\u63D0\u4F9B\u5B8C\u6574\u5BF9\u8BDD\u5386\u53F2\uFF0C\u4EC5\u663E\u793A Runtime \u8BB0\u5F55"
        ),
        historyError && h(
          "div",
          { className: "concerto-feedback", role: "status" },
          h("span", null, historyError),
          h("button", { type: "button", className: "concerto-btn", onClick: () => setHistoryRetry((n) => n + 1) }, "\u91CD\u8BD5\u540C\u6B65")
        ),
        olderError && h("p", { role: "status", className: "concerto-field-error" }, olderError),
        hasMore && h("button", { type: "button", className: "concerto-btn", disabled: loading || loadingOlder, onClick: loadOlder }, loadingOlder ? "\u52A0\u8F7D\u4E2D\u2026" : olderError ? "\u91CD\u8BD5\u52A0\u8F7D\u66F4\u65E9\u6D88\u606F" : "\u52A0\u8F7D\u66F4\u65E9\u6D88\u606F"),
        member.roleKind === "commander" && hostChat.messages.map((msg) => h(
          "div",
          { key: "hc-" + msg.id, className: "concerto-bubble" },
          h(
            "div",
            { style: { fontSize: "var(--cc-fs-caption)", color: "var(--cc-text-muted)" } },
            (msg.role === "user" ? "\u7528\u6237" : member.id) + (msg.recordedAt ? " \xB7 " + new Date(msg.recordedAt).toLocaleTimeString() : "")
          ),
          h(ReferenceText, {
            text: msg.text,
            viewObjects,
            tasks: snapshot?.tasks || [],
            pinnedRefs,
            context: { authorId: member.id },
            sessionId,
            onJumpTask: (tid) => {
              onClose?.(false);
              onJumpTask?.(tid, { memberId: member.id, label: tid });
            },
            onOpenMember,
            onJumpObject: (ref) => {
              onClose?.();
              onJumpObject?.(ref, { memberId: member.id });
            }
          })
        )),
        mergedMessages.length === 0 && hostChat.messages.length === 0 && memberTasks.length === 0 ? h(EmptyState, {
          icon: "\u{1F4AC}",
          text: "\u6682\u65E0 " + member.id + " \u7684\u6D88\u606F\u6216\u6267\u884C\u8BB0\u5F55\u3002",
          action: currentTask && onJumpTask && h("button", { type: "button", className: "concerto-link", onClick: () => {
            onClose?.(false);
            onJumpTask(currentTask.taskId, { memberId: member.id });
          } }, "\u67E5\u770B\u5173\u8054\u4EFB\u52A1 \u2192")
        }) : mergedMessages.map((act) => {
          if (act.kind === "message") {
            const speaker = act.role === "user" ? "\u7528\u6237" : member.id;
            return h(
              "div",
              { key: act.activityId, className: "concerto-bubble" },
              h(
                "div",
                { style: { fontSize: "var(--cc-fs-caption)", color: "var(--cc-text-muted)" } },
                speaker + (act.recordedAt ? " \xB7 " + new Date(act.recordedAt).toLocaleTimeString() : "") + (act.taskId ? " \xB7 " + act.taskId : "")
              ),
              h(ReferenceText, {
                text: act.text || act.summary,
                viewObjects,
                tasks: snapshot?.tasks || [],
                pinnedRefs,
                context: { taskId: act.taskId, authorId: member.id },
                sessionId,
                onJumpTask: (tid) => {
                  onClose?.(false);
                  onJumpTask?.(tid, { memberId: member.id, label: tid });
                },
                onOpenMember,
                onJumpObject: (ref) => {
                  onClose?.();
                  onJumpObject?.(ref, { memberId: member.id });
                }
              }),
              act.truncated && h(
                "div",
                { style: { fontSize: "var(--cc-fs-caption)", color: "var(--cc-text-muted)" } },
                `\u5DF2\u622A\u65AD\u81F3 4000 \u5B57\u7B26\uFF08\u539F\u59CB ${act.fullLength} \u5B57\u7B26\uFF09`
              )
            );
          }
          return h(
            "details",
            { key: act.activityId, className: "concerto-activity-line" },
            h(
              "summary",
              { style: { cursor: "pointer" } },
              (act.recordedAt ? new Date(act.recordedAt).toLocaleTimeString() + " \xB7 " : "") + act.summary
            ),
            (act.text || act.detail) && h("pre", {
              style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "var(--cc-fs-code)", marginTop: 6, maxHeight: 200, overflow: "auto" }
            }, act.text || JSON.stringify(act.detail, null, 2))
          );
        })
      ),
      tab === "tasks" && (memberTasks.length === 0 ? h(EmptyState, { icon: "\u{1F4CB}", text: member.id + " \u6682\u65E0\u5173\u8054\u4EFB\u52A1\u3002" }) : memberTasks.map((tk) => {
        const tMeta = STATE_META[tk.viewState] || STATE_META[tk.state] || STATE_META.pending;
        return h(
          "div",
          { key: tk.taskId, className: "concerto-card" },
          h(
            "div",
            { className: "concerto-card-head" },
            h(
              "div",
              { className: "concerto-card-head-main" },
              h(
                "div",
                { className: "concerto-card-title-row" },
                h("strong", null, tk.title)
              )
            ),
            h(StateChip, { status: tk.viewState || tk.state, text: tMeta.label })
          ),
          tk.objective && h("div", { style: { fontSize: "var(--cc-fs-meta)", color: "var(--cc-text-secondary)", marginBottom: 6 } }, tk.objective),
          (tk.blockedReason || tk.progress?.at(-1)?.note) && h("div", {
            style: { fontSize: "var(--cc-fs-caption)", color: tk.blockedReason ? "var(--cc-state-blocked)" : "var(--cc-text-muted)", marginBottom: 6 }
          }, tk.blockedReason ? "\u963B\u585E\uFF1A" + tk.blockedReason : "\u6700\u65B0\u8FDB\u5C55\uFF1A" + tk.progress.at(-1).note),
          h(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("span", { className: "concerto-id", style: { color: "var(--cc-text-muted)" } }, tk.taskId + " \xB7 \u7B2C " + tk.attempt + " \u6B21"),
            onJumpTask && h("button", {
              type: "button",
              className: "concerto-chip",
              onClick: () => {
                onClose?.(false);
                onJumpTask(tk.taskId, { memberId: member.id, label: tk.taskId });
              }
            }, "\u8DF3\u8F6C\u67E5\u770B\u4EFB\u52A1 \u203A")
          )
        );
      })),
      tab === "objects" && (memberObjects.length === 0 ? h(EmptyState, { icon: "\u{1F9E9}", text: member.id + " \u6682\u672A\u53D1\u5E03\u7ED3\u6784\u5316\u8F93\u51FA\u3002" }) : memberObjects.map((obj) => {
        const isCmdPinned = pinnedRefs.some((p) => p.id === obj.id && p.type === obj.type);
        const isUserPinned = userPinnedSet.has(`${obj.type}:${obj.id}`);
        return h(
          "div",
          { key: obj.id, style: { display: "flex", flexDirection: "column", gap: 6 } },
          h(StructuredObjectCard, {
            object: obj,
            tasks: snapshot?.tasks || [],
            sessionId,
            onJumpTask: (tid) => {
              onClose?.(false);
              onJumpTask?.(tid, { memberId: member.id, label: tid });
            },
            onOpenMember,
            userPinned: isUserPinned,
            badgeLabel: isCmdPinned ? "\u6307\u6325\u8005\u63A8\u8350" : ""
          })
        );
      })),
      tab === "executions" && (memberExecs.length === 0 ? h(EmptyState, { icon: "\u2699\uFE0F", text: member.id + " \u6682\u65E0\u6267\u884C\u8BB0\u5F55\u3002" }) : memberExecs.slice().reverse().map((exec) => h(
        "div",
        { key: exec.executionId, className: "concerto-card" },
        h(
          "div",
          { className: "concerto-card-head" },
          h(
            "div",
            { className: "concerto-card-head-main" },
            h(
              "div",
              { className: "concerto-card-title-row" },
              h("strong", null, exec.taskId + (exec.kind === "review" ? " \xB7 \u72EC\u7ACB\u5BA1\u67E5" : ` \xB7 \u7B2C ${exec.attempt} \u6B21\u5C1D\u8BD5`))
            )
          ),
          h("span", { className: "concerto-tag" }, label(exec.state))
        ),
        h(
          "div",
          { style: { ...styles.muted, fontSize: "var(--cc-fs-caption)" } },
          (exec.connectorId || "unknown") + (exec.nativeSessionRef?.sessionId ? " \xB7 Session " + exec.nativeSessionRef.sessionId : "")
        ),
        exec.writeScope && h("div", { style: { ...styles.muted, fontSize: "var(--cc-fs-caption)", overflowWrap: "anywhere" } }, "\u5DE5\u4F5C\u76EE\u5F55\uFF1A" + exec.writeScope),
        exec.worktree && h(
          "div",
          { style: { ...styles.muted, fontSize: "var(--cc-fs-caption)", overflowWrap: "anywhere" } },
          `Worktree \u5206\u652F\uFF1A${exec.worktree.branch || ""} \xB7 \u57FA\u7EBF ${String(exec.worktree.baseCommit || "").slice(0, 7)}${exec.worktree.headCommit && exec.worktree.headCommit !== exec.worktree.baseCommit ? `..${String(exec.worktree.headCommit).slice(0, 7)}` : ""}`
        ),
        exec.taskContext && h(
          "div",
          { style: { fontSize: "var(--cc-fs-caption)", marginTop: 4 } },
          h("strong", null, "\u4E34\u65F6\u4EFB\u52A1\u8BF4\u660E\uFF1A"),
          exec.taskContext
        ),
        exec.memberDuties && h(
          "details",
          { style: { marginTop: 6 } },
          h("summary", null, `\u6D3E\u53D1\u804C\u8D23 v${exec.memberDuties.version} \xB7 ${dutyAuthor(exec.memberDuties)}`),
          h("p", { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" } }, exec.memberDuties.body)
        ),
        Array.isArray(exec.skillDeliveries) && exec.skillDeliveries.length > 0 && h(
          "div",
          { style: { marginTop: 6, fontSize: "var(--cc-fs-caption)" } },
          h("strong", null, "\u6D3E\u53D1\u51BB\u7ED3\u65B9\u6CD5\uFF1A"),
          exec.skillDeliveries.map((d) => {
            const fb = (exec.skillFeedback || []).find((f) => f.id === d.id);
            const acc = exec.skillAcceptanceEvidence;
            return h(
              "div",
              { key: `${d.id}@${d.version}`, style: { marginTop: 2 } },
              h("span", { className: "concerto-id" }, `${d.id}@v${d.version}`),
              ` (${d.source} \xB7 \u5DF2\u4EA4\u4ED8`,
              fb ? ` \xB7 \u6210\u5458\u81EA\u8FF0:${fb.outcome}` : "",
              acc ? ` \xB7 \u9A8C\u6536\u8BC1\u636E:${acc.status === "verified_with_task_acceptance" ? acc.reviewId || "pass" : "fail"}` : "",
              ")"
            );
          })
        ),
        exec.metrics && Object.keys(exec.metrics).length > 0 && h(
          "details",
          { style: { marginTop: 6 } },
          h("summary", { style: { cursor: "pointer", fontSize: "var(--cc-fs-caption)" } }, "\u9636\u6BB5\u8017\u65F6\u6307\u6807"),
          h("pre", { style: { fontSize: "var(--cc-fs-code)", whiteSpace: "pre-wrap" } }, JSON.stringify(exec.metrics, null, 2))
        )
      )))
    )
  );
}

// packages/dsh-concerto/src/client/components/AttentionPopover.js
var import_react17 = __toESM(require_react(), 1);
function AttentionPopover({ open, onClose, count, trigger, children }) {
  const rootRef = import_react17.default.useRef(null);
  const closeRef = import_react17.default.useRef(null);
  const panelRef = import_react17.default.useRef(null);
  const panelId = import_react17.default.useId();
  import_react17.default.useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const native = showAnchoredPopover(rootRef.current, panelRef.current, { width: 520, maxHeight: 640 });
    panelRef.current.dataset.nativePopover = String(native);
    const handleToggle = (event) => {
      if (event.newState === "closed") onClose();
    };
    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) onClose();
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    if (native) {
      panelRef.current.addEventListener("toggle", handleToggle);
    } else {
      document.addEventListener("pointerdown", handlePointer, true);
      document.addEventListener("keydown", handleKey, true);
    }
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (native) {
        panelRef.current?.removeEventListener("toggle", handleToggle);
        hideAnchoredPopover(panelRef.current);
      } else {
        document.removeEventListener("pointerdown", handlePointer, true);
        document.removeEventListener("keydown", handleKey, true);
      }
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);
  return h(
    "div",
    { className: "concerto-attention-anchor", ref: rootRef },
    import_react17.default.cloneElement(trigger, {
      "aria-expanded": open,
      "aria-controls": panelId,
      "aria-haspopup": "dialog",
      onPointerDown: (event) => {
        trigger.props.onPointerDown?.(event);
        if (open) event.preventDefault();
      }
    }),
    open && h(
      "div",
      {
        ref: panelRef,
        id: panelId,
        popover: "auto",
        className: "concerto-attention-popover concerto-surface",
        role: "dialog",
        "aria-modal": "false",
        "aria-label": `\u5F85\u5904\u7406\u4E8B\u9879\uFF0C\u5171 ${count} \u9879`,
        "data-concerto-section": "attention"
      },
      h(
        "div",
        { className: "concerto-attention-popover-head" },
        h("strong", null, `\u5F85\u5904\u7406 ${count} \u9879`),
        h("button", {
          ref: closeRef,
          type: "button",
          className: "concerto-btn concerto-btn--ghost concerto-btn--icon",
          "aria-label": "\u5173\u95ED\u5F85\u5904\u7406\u4E8B\u9879",
          onClick: onClose
        }, h(UiIcon, { name: "close" }))
      ),
      children
    )
  );
}
function AttentionContent({
  attentionItems,
  blockingMissing,
  pending,
  unknownExecs,
  tasks,
  executions,
  canAct,
  command,
  jumpToTask,
  openMemberDrawer
}) {
  return h(
    "div",
    { className: "concerto-attention-content" },
    blockingMissing.length > 0 && h(
      "div",
      { className: "concerto-attn-card", "data-concerto-missing-required": "true" },
      h("strong", null, `\u7F3A\u5C11\u9A8C\u6536\u5FC5\u9700\u89C6\u56FE\uFF08${blockingMissing.length}\uFF09`),
      h(
        "div",
        { className: "concerto-attention-pills" },
        blockingMissing.map((rv) => h(
          "span",
          {
            key: `${rv.taskId || "team"}:${rv.type}:${rv.id}`,
            className: "concerto-req-view-pill",
            "data-missing": "true"
          },
          h("span", { className: "concerto-id" }, `${rv.type}:${rv.id}`),
          rv.taskId && h("button", {
            type: "button",
            className: "concerto-chip concerto-id",
            onClick: () => jumpToTask(rv.taskId)
          }, rv.taskId)
        ))
      )
    ),
    attentionItems.map((item) => {
      if (item.kind === "request" || item.kind === "approval" || item.kind === "question") {
        const req = pending.find((r) => r.requestId === item.requestId);
        if (!req) return null;
        return h(
          "div",
          { key: item.id, className: "concerto-attn-card", "data-kind": item.kind },
          h(
            "div",
            { className: "concerto-attention-card-head" },
            h("strong", null, (req.kind === "approval" ? "\u8BF7\u6C42\u6279\u51C6" : "\u5411\u4F60\u63D0\u95EE") + " \xB7 " + (req.memberId || "\u6210\u5458")),
            req.taskId && h("span", { className: "concerto-tag concerto-id" }, req.taskId)
          ),
          h(RequestCard, {
            item: req,
            bare: true,
            disabled: !canAct,
            onAnswer: (it2, ans) => command("/requests/respond", { requestId: it2.requestId, answer: ans })
          })
        );
      }
      if (item.kind === "unknown") {
        const exec = unknownExecs.find((e) => e.executionId === item.executionId);
        if (!exec) return null;
        return h(
          "div",
          { key: item.id, className: "concerto-attn-card", "data-kind": "unknown" },
          h(
            "div",
            { className: "concerto-attention-card-head" },
            h("strong", null, "\u9700\u8981\u4F60\u88C1\u51B3 \xB7 " + exec.taskId),
            h("button", { type: "button", className: "concerto-link concerto-id", onClick: () => jumpToTask(exec.taskId) }, `\u5B9A\u4F4D ${exec.taskId} \u203A`)
          ),
          h(AdjudicationCard, {
            execution: exec,
            bare: true,
            disabled: !canAct,
            onSubmit: (input) => command("/executions/adjudicate", input)
          })
        );
      }
      if (item.kind === "review") {
        const task = tasks.find((t) => t.taskId === item.taskId);
        if (!task) return null;
        const execSettled = executions.some((e) => e.executionId === task.executionId && ["finished", "stopped"].includes(e.state));
        return h(
          "div",
          { key: item.id, className: "concerto-attn-card", "data-kind": "review" },
          h(
            "div",
            { className: "concerto-attention-card-head" },
            h("strong", null, "\u5F85\u4F60\u9A8C\u6536 \xB7 " + task.title),
            h("button", { type: "button", className: "concerto-link concerto-id", onClick: () => jumpToTask(task.taskId) }, `\u5B9A\u4F4D ${task.taskId} \u203A`)
          ),
          task.result?.summary && h("p", { className: "concerto-attention-summary" }, task.result.summary),
          task.result && h(ReviewCard, {
            task,
            bare: true,
            disabled: !canAct || !execSettled,
            onReview: (tk, verdict, reason) => command("/tasks/review", {
              taskId: tk.taskId,
              executionId: tk.executionId,
              resultId: tk.result.resultId,
              verdict,
              reason
            })
          })
        );
      }
      return h(
        "div",
        { key: item.id, className: "concerto-attn-card", "data-kind": item.kind || "blocked" },
        h(
          "div",
          { className: "concerto-attention-card-head" },
          h("strong", null, item.title),
          item.taskId && h("button", { type: "button", className: "concerto-link concerto-id", onClick: () => jumpToTask(item.taskId) }, `\u5B9A\u4F4D ${item.taskId} \u203A`)
        ),
        item.detail && h("p", { className: "concerto-attention-summary" }, item.detail),
        item.memberId && h(
          "div",
          null,
          h(
            "button",
            { type: "button", className: "concerto-chip", onClick: () => openMemberDrawer(item.memberId, "messages") },
            "\u67E5\u770B " + item.memberId + " \u8BE6\u60C5 \u203A"
          )
        )
      );
    })
  );
}

// packages/dsh-concerto/src/client/components/TaskReviewFeedback.js
var import_react18 = __toESM(require_react(), 1);
var STATUS = { open: "\u5F85\u5904\u7406", replied: "\u5F85\u590D\u6838", closed: "\u5DF2\u5173\u95ED" };
var ACTION = { reply: "\u63D0\u4EA4\u4FEE\u8BA2", close: "\u5173\u95ED\u610F\u89C1", reopen: "\u91CD\u65B0\u6253\u5F00" };
var viewRef = (obj) => `${obj.type}:${obj.id}@v${obj.version}`;
var actorName = (actor) => actor?.kind === "user" ? "\u7528\u6237" : actor?.id || "Concerto";
function TaskReviewFeedback({ task, taskObjects, executions, canWrite, disabled, onSave, onOpenVersion }) {
  const [target, setTarget] = import_react18.default.useState(null);
  const [error, setError] = import_react18.default.useState("");
  const [message, setMessage] = import_react18.default.useState("");
  const feedback = task.reviewFeedback ?? [];
  const history = task.deliveryHistory ?? [];
  const taskExecutions = executions.filter((entry) => entry.taskId === task.taskId);
  const targetOptions = target && !taskObjects.some((item) => viewRef(item) === viewRef(target)) ? [...taskObjects, target] : taskObjects;
  const items = target ? reviewTargetItems(target) : [];
  function versionButton(obj) {
    return h("button", {
      type: "button",
      className: "concerto-link",
      onClick: () => onOpenVersion(obj.id, obj.version, viewRef(obj))
    }, `${obj.title || obj.id} v${obj.version}${obj.itemLabel ? ` \xB7 ${obj.itemLabel}` : ""}`);
  }
  async function save(input, successText) {
    setError("");
    setMessage("");
    const ok = await onSave({ ...input, taskId: task.taskId }, setError);
    if (ok) setMessage(successText);
    return ok;
  }
  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const text = fields.get("text").trim();
    if (!text) {
      setError("\u8BF7\u8F93\u5165\u5BA1\u67E5\u610F\u89C1\u3002");
      form.elements.namedItem("text").focus();
      return;
    }
    const itemId = fields.get("itemId");
    const ok = await save({
      action: "create",
      text,
      targetExecutionId: task.result?.executionId ?? task.executionId ?? null,
      targetResultId: task.result?.resultId ?? null,
      ...target ? { targetRef: viewRef(target) } : {},
      ...itemId ? { itemId } : {}
    }, "\u5BA1\u67E5\u610F\u89C1\u5DF2\u4FDD\u5B58\u3002");
    if (ok) {
      form.reset();
      setTarget(null);
    }
  }
  return h(
    "section",
    { className: "concerto-acc-box concerto-review-feedback", "aria-label": "\u5BA1\u67E5\u610F\u89C1\u548C\u5386\u53F2" },
    h("strong", null, "\u5BA1\u67E5\u610F\u89C1"),
    feedback.length > 0 && h("ol", { className: "concerto-review-threads" }, feedback.map((thread) => {
      const original = taskExecutions.find(({ executionId }) => executionId === thread.target.executionId);
      const action = thread.status === "closed" ? "reopen" : "close";
      return h(
        "li",
        { key: thread.feedbackId, className: "concerto-review-thread" },
        h(
          "header",
          { className: "concerto-review-heading" },
          h("strong", null, actorName(thread.author)),
          h("span", { className: "concerto-tag" }, STATUS[thread.status]),
          h("time", { dateTime: thread.createdAt, className: "concerto-quiet" }, new Date(thread.createdAt).toLocaleString())
        ),
        h("p", { className: "concerto-review-text" }, thread.text),
        h(
          "div",
          { className: "concerto-review-heading concerto-quiet" },
          thread.target.resultId ? original ? `\u7B2C ${original.attempt} \u6B21\u4EA4\u4ED8` : "\u5DF2\u63D0\u4EA4\u4EA4\u4ED8" : original ? `\u7B2C ${original.attempt} \u6B21\u6267\u884C` : "\u4EFB\u52A1",
          thread.target.artifact && versionButton(thread.target.artifact)
        ),
        thread.updates.length > 0 && h("ul", { className: "concerto-review-updates" }, thread.updates.map((update) => h(
          "li",
          { key: update.version },
          h(
            "span",
            { className: "concerto-quiet" },
            `${actorName(update.author)} \xB7 ${ACTION[update.action]} \xB7 ${new Date(update.at).toLocaleString()}`
          ),
          update.text && h("p", { className: "concerto-review-text" }, update.text),
          update.evidence?.map((entry, index) => h("div", { key: index }, entry.artifact ? versionButton(entry.artifact) : entry.ref))
        ))),
        canWrite && h("button", {
          type: "button",
          className: "concerto-btn",
          disabled,
          onClick: () => save(
            { action, feedbackId: thread.feedbackId, expectedVersion: thread.version },
            action === "close" ? "\u610F\u89C1\u5DF2\u5173\u95ED\u3002" : "\u610F\u89C1\u5DF2\u91CD\u65B0\u6253\u5F00\u3002"
          )
        }, ACTION[action])
      );
    })),
    canWrite && h(
      "details",
      null,
      h("summary", null, "\u6DFB\u52A0\u5BA1\u67E5\u610F\u89C1"),
      h(
        "form",
        { onSubmit: create },
        h(
          "div",
          { className: "concerto-field" },
          h(
            "label",
            null,
            "\u9488\u5BF9\u5BF9\u8C61",
            h(
              "select",
              {
                className: "concerto-input",
                value: target ? viewRef(target) : "",
                disabled,
                onChange: (event) => setTarget(targetOptions.find((obj) => viewRef(obj) === event.target.value) ?? null)
              },
              h("option", { value: "" }, task.result ? "\u672C\u6B21\u4EA4\u4ED8" : "\u4EFB\u52A1"),
              targetOptions.map((obj) => h("option", { key: viewRef(obj), value: viewRef(obj) }, `${obj.title || obj.id} v${obj.version}`))
            )
          )
        ),
        target && versionButton(target),
        items.length > 0 && h(
          "div",
          { className: "concerto-field" },
          h(
            "label",
            null,
            "\u6210\u679C\u6761\u76EE",
            h(
              "select",
              { key: viewRef(target), className: "concerto-input", name: "itemId", disabled },
              h("option", { value: "" }, "\u6574\u4E2A\u6210\u679C"),
              items.map(({ id, label: title }, index) => h("option", { key: `${id}-${index}`, value: id }, title))
            )
          )
        ),
        h(
          "div",
          { className: "concerto-field" },
          h(
            "label",
            null,
            "\u610F\u89C1\u5185\u5BB9",
            h("textarea", { name: "text", className: "concerto-textarea", required: true, maxLength: 4e3, rows: 3, disabled })
          )
        ),
        h("button", { type: "submit", className: "concerto-btn concerto-btn--primary", disabled }, "\u4FDD\u5B58\u610F\u89C1")
      )
    ),
    error && h("p", { role: "alert", className: "concerto-field-error" }, error),
    h("span", { role: "status", className: "concerto-quiet" }, message),
    (taskExecutions.length > 0 || history.length > 0) && h(
      "details",
      null,
      h("summary", null, "\u5386\u6B21\u6267\u884C\u4E0E\u9A8C\u6536"),
      taskExecutions.length > 0 && h("ul", { className: "concerto-review-updates" }, taskExecutions.map((entry) => h("li", { key: entry.executionId }, `${entry.kind === "review" ? "\u5BA1\u67E5" : "\u6267\u884C"} \xB7 \u7B2C ${entry.attempt} \u6B21 \xB7 ${entry.memberId || "\u672A\u5206\u914D"} \xB7 ${label(entry.state)}`))),
      history.length > 0 && h("ol", { className: "concerto-review-updates" }, history.map((event) => {
        const content = event.type === "review.submitted" ? event.payload.review ?? event.payload.input : event.payload.result ?? event.payload.input;
        if (!content) return null;
        const recordTitle = event.type === "review.submitted" ? content.verdict === "pass" ? "\u9A8C\u6536\u901A\u8FC7" : "\u9000\u56DE\u8FD4\u5DE5" : "\u63D0\u4EA4\u4EA4\u4ED8";
        return h(
          "li",
          { key: event.eventId },
          h("strong", null, `${recordTitle} \xB7 ${actorName(event.actor)}`),
          h("span", { className: "concerto-quiet" }, ` \xB7 ${new Date(event.recordedAt).toLocaleString()}`),
          h("p", { className: "concerto-review-text" }, content.reason ?? content.summary),
          (content.artifactRefs ?? content.evidenceRefs)?.join(" \xB7 "),
          content.pinnedObjectVersions?.map((obj) => h("div", { key: viewRef(obj) }, versionButton(obj)))
        );
      }))
    )
  );
}

// packages/dsh-concerto/src/client/components/SharedAcceptanceChecklist.js
var import_react19 = __toESM(require_react(), 1);

// packages/dsh-concerto/lib/domain/state_machine.mjs
var TASK_STATE = Object.freeze({
  pending: "pending",
  // 待派发
  running: "running",
  // 运行中
  review: "review",
  // 待评审
  completed: "completed",
  blocked: "blocked",
  // 已阻塞
  cancelled: "cancelled",
  // 已取消
  failed: "failed"
  // 已失败
});
var EXEC_STATE = Object.freeze({
  running: "running",
  // 执行中
  waiting_input: "waiting_input",
  // 等待用户输入
  waiting_approval: "waiting_approval",
  // 等待审批
  interrupting: "interrupting",
  // 正在中断
  stopped: "stopped",
  // 已停止
  finished: "finished",
  // 已结束
  unknown: "unknown"
  // 状态未知
});
var TERMINAL_TASK = /* @__PURE__ */ new Set([TASK_STATE.completed, TASK_STATE.cancelled, TASK_STATE.failed]);
var REJECT = Object.freeze({
  invalidTransition: "invalid_transition",
  // 非法状态转移
  preconditionFailed: "precondition_failed",
  // 前置条件不满足
  missingEvidence: "missing_evidence",
  // 缺少必要证据
  unsafeRetry: "unsafe_retry"
  // 不安全重试
});
function isTerminalTask(state) {
  return TERMINAL_TASK.has(state);
}
var TASK_VIEW = Object.freeze({
  waiting_approval: "waiting_approval",
  waiting_input: "waiting_input",
  cancelling: "cancelling",
  unknown: "unknown"
});

// packages/dsh-concerto/src/client/components/SharedAcceptanceChecklist.js
var TYPE_LABEL = {
  checklist: "\u6E05\u5355",
  table: "\u8868\u683C",
  diagram: "\u5173\u7CFB\u56FE",
  mindmap: "\u5BFC\u56FE"
};
function flattenMindmap(node, depth = 0, out = []) {
  if (!node || typeof node !== "object") return out;
  if (node.id && node.label) out.push({ id: node.id, label: node.label, depth });
  for (const child of node.children ?? []) flattenMindmap(child, depth + 1, out);
  return out;
}
function imeSafeKeyDown(event) {
  if (event.key === "Enter" && (event.isComposing || event.nativeEvent?.isComposing)) {
    event.preventDefault();
  }
}
function SharedAcceptanceChecklist({ task, taskObjects, canWrite, disabled, onSave, onOpenVersion }) {
  const [draft, setDraft] = import_react19.default.useState(null);
  const [error, setError] = import_react19.default.useState("");
  const [message, setMessage] = import_react19.default.useState("");
  const sharedObjects = taskObjects.filter((object) => isSharedTaskArtifact(task, object));
  const changes = task.checklistChanges ?? [];
  if (sharedObjects.length === 0 && changes.length === 0) return null;
  const editable = canWrite && !isTerminalTask(task.state);
  const draftObject = draft && sharedObjects.find((object) => object.id === draft.id);
  const hasNonChecklist = sharedObjects.some((object) => object.type !== "checklist") || changes.some((change) => change.viewType && change.viewType !== "checklist");
  function startChecklist(object, item) {
    setError("");
    setMessage("");
    setDraft({ kind: "checklist", id: object.id, expectedVersion: object.version, itemId: item?.id, label: item?.label ?? "" });
  }
  function startTableCell(object, rowIndex, row, column, value) {
    setError("");
    setMessage("");
    setDraft({
      kind: "table_cell",
      id: object.id,
      expectedVersion: object.version,
      rowIndex,
      rowKey: String(row?.[0] ?? ""),
      column,
      value: value == null ? "" : String(value)
    });
  }
  function startTableRow(object) {
    setError("");
    setMessage("");
    const cols = Array.isArray(object.data?.columns) ? object.data.columns : [];
    setDraft({ kind: "table_row", id: object.id, expectedVersion: object.version, columns: cols, cells: cols.map(() => "") });
  }
  function startGraphNode(object, node = null) {
    setError("");
    setMessage("");
    setDraft({
      kind: "graph_node",
      id: object.id,
      viewType: object.type,
      expectedVersion: object.version,
      itemId: node?.id,
      parentId: object.type === "mindmap" ? object.data?.root?.id || "root" : "",
      label: node?.label ?? ""
    });
  }
  function startDiagramEdge(object, edge = null) {
    setError("");
    setMessage("");
    const firstNode = object.data?.nodes?.[0]?.id ?? "";
    const secondNode = object.data?.nodes?.[1]?.id ?? firstNode;
    setDraft({
      kind: "diagram_edge",
      id: object.id,
      expectedVersion: object.version,
      isEdit: Boolean(edge),
      from: edge?.from ?? firstNode,
      to: edge?.to ?? secondNode,
      label: edge?.label ?? "",
      edgeKind: edge?.kind ?? "normal"
    });
  }
  async function save(event) {
    event.preventDefault();
    if (!editable || disabled || !draft) return;
    let payload;
    let successText = "\u6539\u52A8\u5DF2\u4FDD\u5B58\u3002";
    if (draft.kind === "checklist") {
      if (!draft.label.trim()) {
        setError("\u8BF7\u8F93\u5165\u6761\u76EE\u5185\u5BB9\u3002");
        return;
      }
      payload = { id: draft.id, expectedVersion: draft.expectedVersion, ...draft.itemId ? { itemId: draft.itemId } : {}, label: draft.label };
      successText = "\u6E05\u5355\u5DF2\u4FDD\u5B58\u3002";
    } else if (draft.kind === "table_cell") {
      if (!draft.value.trim()) {
        setError("\u8BF7\u8F93\u5165\u5355\u5143\u683C\u5185\u5BB9\u3002");
        return;
      }
      payload = {
        id: draft.id,
        expectedVersion: draft.expectedVersion,
        rowIndex: draft.rowIndex,
        rowKey: draft.rowKey,
        column: draft.column,
        value: draft.value
      };
      successText = "\u8868\u683C\u5355\u5143\u683C\u5DF2\u4FDD\u5B58\u3002";
    } else if (draft.kind === "table_row") {
      if (draft.cells.every((cell) => !cell.trim())) {
        setError("\u8BF7\u81F3\u5C11\u586B\u5199\u4E00\u5217\u5185\u5BB9\u3002");
        return;
      }
      payload = { id: draft.id, expectedVersion: draft.expectedVersion, cells: draft.cells };
      successText = "\u8868\u683C\u884C\u5DF2\u4FDD\u5B58\u3002";
    } else if (draft.kind === "graph_node") {
      if (!draft.label.trim()) {
        setError("\u8BF7\u8F93\u5165\u8282\u70B9\u540D\u79F0\u3002");
        return;
      }
      payload = {
        id: draft.id,
        expectedVersion: draft.expectedVersion,
        ...draft.itemId ? { itemId: draft.itemId } : {},
        ...draft.parentId ? { parentId: draft.parentId } : {},
        label: draft.label
      };
      successText = "\u56FE\u8282\u70B9\u5DF2\u4FDD\u5B58\u3002";
    } else if (draft.kind === "diagram_edge") {
      if (!draft.from || !draft.to) {
        setError("\u8BF7\u9009\u62E9\u8D77\u70B9\u4E0E\u7EC8\u70B9\u8282\u70B9\u3002");
        return;
      }
      payload = {
        id: draft.id,
        expectedVersion: draft.expectedVersion,
        targetKind: "edge",
        from: draft.from,
        to: draft.to,
        label: draft.label,
        edgeKind: draft.edgeKind
      };
      successText = "\u56FE\u5173\u7CFB\u5DF2\u4FDD\u5B58\u3002";
    } else {
      return;
    }
    setError("");
    setMessage("");
    if (await onSave({ ...payload, taskId: task.taskId }, setError)) {
      setMessage(successText);
      setDraft(null);
    }
  }
  function versionButton(id, version, text, typeLabel = "\u9A8C\u6536\u6E05\u5355") {
    return h("button", {
      type: "button",
      className: "concerto-link",
      onClick: () => onOpenVersion(id, version, text, typeLabel)
    }, text);
  }
  function renderStaleNotice(noun) {
    if (!draftObject || draftObject.version === draft.expectedVersion) return null;
    return h(
      "p",
      { className: "concerto-quiet" },
      `${noun}\u5DF2\u6709\u65B0\u7248\u3002`,
      versionButton(draftObject.id, draftObject.version, `\u67E5\u770B v${draftObject.version}`, TYPE_LABEL[draftObject.type] || "\u5171\u7F16\u6210\u679C"),
      " ",
      h("button", {
        type: "button",
        className: "concerto-link",
        disabled,
        onClick: () => setDraft({ ...draft, expectedVersion: draftObject.version })
      }, "\u6309\u65B0\u7248\u91CD\u65B0\u7F16\u8F91")
    );
  }
  function renderFormActions(submitLabel) {
    return h(
      "div",
      { className: "concerto-review-heading" },
      h("button", { type: "submit", className: "concerto-btn concerto-btn--primary", disabled: disabled || !draftObject }, submitLabel),
      h("button", { type: "button", className: "concerto-btn", onClick: () => {
        setDraft(null);
        setError("");
      } }, "\u53D6\u6D88")
    );
  }
  function renderSharedObject(object) {
    const typeLabel = TYPE_LABEL[object.type] || object.type;
    if (object.type === "checklist") {
      return h(
        "div",
        { key: object.id, "data-concerto-shared-object": `${object.type}:${object.id}` },
        h(
          "div",
          { className: "concerto-review-heading" },
          h("strong", null, object.title),
          versionButton(object.id, object.version, `v${object.version}`, typeLabel),
          editable && h("button", { type: "button", className: "concerto-btn", disabled, onClick: () => startChecklist(object) }, "\u65B0\u589E\u6761\u76EE")
        ),
        h("ul", { className: "concerto-review-updates" }, object.data.items.map((item, index) => h(
          "li",
          { key: `${item.id}-${index}` },
          h(
            "div",
            { className: "concerto-review-heading" },
            h("span", null, item.label),
            editable && h("button", {
              type: "button",
              className: "concerto-link",
              disabled,
              "aria-label": `\u7F16\u8F91\u6761\u76EE ${item.label}`,
              onClick: () => startChecklist(object, item)
            }, "\u7F16\u8F91")
          )
        )))
      );
    }
    if (object.type === "table") {
      const cols = Array.isArray(object.data?.columns) ? object.data.columns : [];
      const rows = Array.isArray(object.data?.rows) ? object.data.rows : [];
      return h(
        "div",
        { key: object.id, "data-concerto-shared-object": `${object.type}:${object.id}` },
        h(
          "div",
          { className: "concerto-review-heading" },
          h("strong", null, object.title),
          h("span", { className: "concerto-tag" }, typeLabel),
          versionButton(object.id, object.version, `v${object.version}`, typeLabel),
          editable && h("button", { type: "button", className: "concerto-btn", disabled, onClick: () => startTableRow(object) }, "\u65B0\u589E\u884C")
        ),
        h(
          "div",
          { className: "concerto-table-wrap", tabIndex: 0, role: "region", "aria-label": `${object.title} \u5171\u7F16\u8868\u683C` },
          h(
            "table",
            { className: "concerto-table" },
            h("thead", null, h("tr", null, cols.map((col, cIdx) => h("th", { key: cIdx, scope: "col" }, String(col))))),
            h("tbody", null, rows.map((row, rIdx) => h("tr", { key: rIdx }, cols.map((col, cIdx) => {
              const val = row[cIdx];
              const CellTag = cIdx === 0 ? "th" : "td";
              return h(
                CellTag,
                { key: cIdx, ...cIdx === 0 ? { scope: "row" } : {} },
                h(
                  "div",
                  { className: "concerto-shared-cell" },
                  h("span", null, String(val ?? "")),
                  editable && h("button", {
                    type: "button",
                    className: "concerto-link",
                    disabled,
                    "aria-label": `\u7F16\u8F91\u5355\u5143\u683C \u7B2C ${rIdx + 1} \u884C ${col}`,
                    onClick: () => startTableCell(object, rIdx, row, col, val)
                  }, "\u7F16\u8F91")
                )
              );
            }))))
          )
        )
      );
    }
    const nodes = object.type === "diagram" ? Array.isArray(object.data?.nodes) ? object.data.nodes : [] : flattenMindmap(object.data?.root);
    const edges = object.type === "diagram" && Array.isArray(object.data?.edges) ? object.data.edges : [];
    return h(
      "div",
      { key: object.id, "data-concerto-shared-object": `${object.type}:${object.id}` },
      h(
        "div",
        { className: "concerto-review-heading" },
        h("strong", null, object.title),
        h("span", { className: "concerto-tag" }, typeLabel),
        versionButton(object.id, object.version, `v${object.version}`, typeLabel),
        editable && h("button", { type: "button", className: "concerto-btn", disabled, onClick: () => startGraphNode(object) }, "\u65B0\u589E\u8282\u70B9"),
        editable && object.type === "diagram" && nodes.length > 0 && h("button", {
          type: "button",
          className: "concerto-btn",
          disabled,
          onClick: () => startDiagramEdge(object)
        }, "\u65B0\u589E\u5173\u7CFB")
      ),
      h("ul", { className: "concerto-review-updates" }, nodes.map((node, index) => h(
        "li",
        { key: `${node.id}-${index}` },
        h(
          "div",
          { className: "concerto-review-heading" },
          h("span", null, node.depth ? `${"\xB7 ".repeat(node.depth)}${node.label}` : `${node.label} (${node.id})`),
          editable && h("button", {
            type: "button",
            className: "concerto-link",
            disabled,
            "aria-label": `\u7F16\u8F91\u8282\u70B9 ${node.label}`,
            onClick: () => startGraphNode(object, node)
          }, "\u7F16\u8F91")
        )
      ))),
      edges.length > 0 && h("ul", { className: "concerto-review-updates" }, edges.map((edge, index) => h(
        "li",
        { key: `${edge.from}-${edge.to}-${index}` },
        h(
          "div",
          { className: "concerto-review-heading" },
          h("span", null, `${edge.from} \u2192 ${edge.to}${edge.label ? `\uFF1A${edge.label}` : ""}`),
          editable && h("button", {
            type: "button",
            className: "concerto-link",
            disabled,
            "aria-label": `\u7F16\u8F91\u5173\u7CFB ${edge.from} \u5230 ${edge.to}`,
            onClick: () => startDiagramEdge(object, edge)
          }, "\u7F16\u8F91\u5173\u7CFB")
        )
      )))
    );
  }
  function renderDraftForm() {
    if (!draft || !editable) return null;
    if (draft.kind === "checklist") {
      return h(
        "form",
        { onSubmit: save, "aria-label": draft.itemId ? "\u7F16\u8F91\u9A8C\u6536\u6761\u76EE" : "\u65B0\u589E\u9A8C\u6536\u6761\u76EE" },
        h(
          "div",
          { className: "concerto-field" },
          h(
            "label",
            null,
            `${draft.itemId ? "\u4FEE\u6539" : "\u65B0\u589E"}\u6761\u76EE \xB7 \u57FA\u4E8E v${draft.expectedVersion}`,
            h("input", {
              className: "concerto-input",
              autoFocus: true,
              disabled,
              value: draft.label,
              required: true,
              maxLength: 500,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => setDraft({ ...draft, label: event.target.value })
            })
          )
        ),
        renderStaleNotice("\u6E05\u5355"),
        renderFormActions("\u4FDD\u5B58\u6761\u76EE")
      );
    }
    if (draft.kind === "table_cell") {
      return h(
        "form",
        { onSubmit: save, "aria-label": "\u7F16\u8F91\u8868\u683C\u5355\u5143\u683C" },
        h(
          "div",
          { className: "concerto-field" },
          h(
            "label",
            null,
            `\u7B2C ${draft.rowIndex + 1} \u884C \xB7 ${draft.column} \xB7 \u57FA\u4E8E v${draft.expectedVersion}`,
            h("input", {
              className: "concerto-input",
              autoFocus: true,
              disabled,
              value: draft.value,
              required: true,
              maxLength: 500,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => setDraft({ ...draft, value: event.target.value })
            })
          )
        ),
        renderStaleNotice("\u8868\u683C"),
        renderFormActions("\u4FDD\u5B58\u5355\u5143\u683C")
      );
    }
    if (draft.kind === "table_row") {
      return h(
        "form",
        { onSubmit: save, "aria-label": "\u65B0\u589E\u8868\u683C\u884C" },
        h("p", { className: "concerto-quiet" }, `\u65B0\u589E\u884C \xB7 \u57FA\u4E8E v${draft.expectedVersion}`),
        draft.columns.map((col, idx) => h(
          "div",
          { key: col, className: "concerto-field" },
          h(
            "label",
            null,
            String(col),
            h("input", {
              className: "concerto-input",
              autoFocus: idx === 0,
              disabled,
              value: draft.cells[idx] ?? "",
              maxLength: 500,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => {
                const nextCells = [...draft.cells];
                nextCells[idx] = event.target.value;
                setDraft({ ...draft, cells: nextCells });
              }
            })
          )
        )),
        renderStaleNotice("\u8868\u683C"),
        renderFormActions("\u4FDD\u5B58\u65B0\u884C")
      );
    }
    if (draft.kind === "graph_node") {
      const mmNodes = draftObject?.type === "mindmap" ? flattenMindmap(draftObject.data?.root) : [];
      return h(
        "form",
        { onSubmit: save, "aria-label": draft.itemId ? "\u7F16\u8F91\u56FE\u8282\u70B9" : "\u65B0\u589E\u56FE\u8282\u70B9" },
        !draft.itemId && draftObject?.type === "mindmap" && mmNodes.length > 0 && h(
          "div",
          { className: "concerto-field" },
          h(
            "label",
            null,
            "\u7236\u8282\u70B9",
            h("select", {
              className: "concerto-input",
              disabled,
              value: draft.parentId,
              onChange: (event) => setDraft({ ...draft, parentId: event.target.value })
            }, mmNodes.map((n) => h("option", { key: n.id, value: n.id }, n.label)))
          )
        ),
        h(
          "div",
          { className: "concerto-field" },
          h(
            "label",
            null,
            `${draft.itemId ? "\u4FEE\u6539" : "\u65B0\u589E"}\u8282\u70B9 \xB7 \u57FA\u4E8E v${draft.expectedVersion}`,
            h("input", {
              className: "concerto-input",
              autoFocus: true,
              disabled,
              value: draft.label,
              required: true,
              maxLength: 500,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => setDraft({ ...draft, label: event.target.value })
            })
          )
        ),
        renderStaleNotice("\u56FE\u8868"),
        renderFormActions("\u4FDD\u5B58\u8282\u70B9")
      );
    }
    if (draft.kind === "diagram_edge") {
      const dgNodes = draftObject?.type === "diagram" ? draftObject.data?.nodes ?? [] : [];
      return h(
        "form",
        { onSubmit: save, "aria-label": "\u7F16\u8F91\u56FE\u5173\u7CFB" },
        !draft.isEdit && dgNodes.length > 0 && h(
          import_react19.default.Fragment,
          null,
          h(
            "div",
            { className: "concerto-field" },
            h(
              "label",
              null,
              "\u8D77\u70B9\u8282\u70B9",
              h("select", {
                className: "concerto-input",
                disabled,
                value: draft.from,
                onChange: (event) => setDraft({ ...draft, from: event.target.value })
              }, dgNodes.map((n) => h("option", { key: n.id, value: n.id }, `${n.label} (${n.id})`)))
            )
          ),
          h(
            "div",
            { className: "concerto-field" },
            h(
              "label",
              null,
              "\u7EC8\u70B9\u8282\u70B9",
              h("select", {
                className: "concerto-input",
                disabled,
                value: draft.to,
                onChange: (event) => setDraft({ ...draft, to: event.target.value })
              }, dgNodes.map((n) => h("option", { key: n.id, value: n.id }, `${n.label} (${n.id})`)))
            )
          )
        ),
        h(
          "div",
          { className: "concerto-field" },
          h(
            "label",
            null,
            `\u5173\u7CFB\u8BF4\u660E (${draft.from} \u2192 ${draft.to}) \xB7 \u57FA\u4E8E v${draft.expectedVersion}`,
            h("input", {
              className: "concerto-input",
              autoFocus: true,
              disabled,
              value: draft.label,
              maxLength: 240,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => setDraft({ ...draft, label: event.target.value })
            })
          )
        ),
        h(
          "div",
          { className: "concerto-field" },
          h(
            "label",
            null,
            "\u5173\u7CFB\u8BED\u4E49",
            h(
              "select",
              {
                className: "concerto-input",
                disabled,
                value: draft.edgeKind,
                onChange: (event) => setDraft({ ...draft, edgeKind: event.target.value })
              },
              h("option", { value: "normal" }, "\u666E\u901A\u5173\u7CFB"),
              h("option", { value: "critical" }, "\u5F3A\u8C03\u8DEF\u5F84"),
              h("option", { value: "error" }, "\u5F02\u5E38\u963B\u65AD")
            )
          )
        ),
        renderStaleNotice("\u56FE\u8868"),
        renderFormActions("\u4FDD\u5B58\u5173\u7CFB")
      );
    }
    return null;
  }
  return h(
    "section",
    { className: "concerto-acc-box concerto-shared-checklist", "aria-label": "\u5171\u7F16\u9A8C\u6536\u6E05\u5355" },
    h("strong", null, hasNonChecklist ? "\u5171\u7F16\u9A8C\u6536\u6E05\u5355\u4E0E\u4EA4\u4ED8\u6210\u679C" : "\u5171\u7F16\u9A8C\u6536\u6E05\u5355"),
    sharedObjects.map(renderSharedObject),
    renderDraftForm(),
    error && h("p", { role: "alert", className: "concerto-field-error" }, error),
    h("span", { role: "status", className: "concerto-quiet" }, message),
    changes.length > 0 && h("ol", { className: "concerto-review-threads", "aria-label": "\u6E05\u5355\u6539\u52A8" }, changes.slice().reverse().map((change) => {
      const reader = change.reads.at(-1);
      const report = change.reports.at(-1);
      const typeLabel = TYPE_LABEL[change.viewType] || "\u6E05\u5355";
      const status = !change.current ? "\u5386\u53F2\u6539\u52A8" : report?.verification ? "\u5DF2\u9A8C\u8BC1" : report ? "\u5DF2\u63D0\u4EA4\u8BC1\u636E" : reader ? "\u6210\u5458\u5DF2\u8BFB\u53D6" : "\u5DF2\u4FDD\u5B58";
      return h(
        "li",
        { key: change.changeId, className: "concerto-review-thread" },
        h(
          "div",
          { className: "concerto-review-heading" },
          h("strong", null, change.label),
          h("span", { className: "concerto-tag" }, status)
        ),
        h(
          "div",
          { className: "concerto-review-heading concerto-quiet" },
          h("time", { dateTime: change.at }, `\u7528\u6237 \xB7 ${new Date(change.at).toLocaleString()}`),
          versionButton(change.viewId, change.fromVersion, `v${change.fromVersion}`, typeLabel),
          "\u2192",
          versionButton(change.viewId, change.version, `v${change.version}`, typeLabel)
        ),
        change.previousLabel && h(
          "p",
          { className: "concerto-review-text concerto-quiet" },
          `${change.viewType && change.viewType !== "checklist" ? "\u539F\u5185\u5BB9" : "\u539F\u6761\u76EE"} \xB7 `,
          change.previousLabel
        ),
        reader && h("div", { className: "concerto-quiet" }, `${reader.memberId} \xB7 ${new Date(reader.at).toLocaleString()} \u8BFB\u53D6`),
        report && h(
          "div",
          { className: "concerto-review-heading" },
          h("span", { className: "concerto-quiet" }, `${report.memberId} \u63D0\u4EA4\u8BC1\u636E`),
          versionButton(report.viewId, report.version, `${typeLabel} v${report.version}`, typeLabel),
          report.evidence.map((entry, index) => h(
            "span",
            { key: index },
            entry.artifact ? versionButton(entry.artifact.id, entry.artifact.version, `${entry.artifact.title} v${entry.artifact.version}`) : entry.ref
          )),
          report.verification && h("span", { className: "concerto-quiet" }, `\u9A8C\u6536 ${report.verification.reviewId}`)
        )
      );
    }))
  );
}

// packages/dsh-concerto/src/client/components/renderers/layoutSize.js
function preferredRendererSize(object, renderer, options = {}) {
  const fontSize = Number.isFinite(options.fontSize) && options.fontSize > 0 ? options.fontSize : void 0;
  try {
    let width = 0;
    if (renderer === "markmap") {
      const raw = object?.data?.root ? object.data.root : object?.data?.markdown ? parseMarkdownToMindmap(object.data.markdown) : null;
      const root = raw ? normalizeMindmapTree(raw) : null;
      if (!root) return "";
      const collapsed = new Set(defaultPreviewCollapsedIdsWithinBudget(root, { fontSize }));
      width = layoutMindmapTree(root, collapsed, { fontSize }).width;
    } else if (renderer === "svg") {
      const data = object?.type === "mindmap" ? mindmapToDiagramData(object.data, object.title) : object?.data;
      width = layoutDiagram(data, { fontSize, semanticKind: object?.semanticKind }).width;
    } else {
      return "";
    }
    if (width <= 560) return "s";
    if (width <= 900) return "m";
    return "l";
  } catch {
    return "";
  }
}

// packages/dsh-concerto/src/client/components/TeamHome.js
var KANBAN_COLUMNS = [
  { id: "pending", title: "\u5F85\u6D3E\u53D1", cls: "concerto-state-idle" },
  { id: "running", title: "\u8FDB\u884C\u4E2D", cls: "concerto-state-running" },
  { id: "review", title: "\u5F85\u9A8C\u6536", cls: "concerto-state-review" },
  { id: "done", title: "\u5DF2\u5B8C\u6210", cls: "concerto-state-done" }
];
var ARTIFACT_TYPE_OPTIONS = [
  { value: "all", label: "\u5168\u90E8\u7C7B\u578B" },
  { value: "table", label: "\u8868\u683C" },
  { value: "checklist", label: "\u6E05\u5355" },
  { value: "mindmap", label: "\u5BFC\u56FE" },
  { value: "diagram", label: "\u56FE\u8C31" },
  { value: "board", label: "\u767D\u677F" },
  { value: "html", label: "HTML \u5361\u7247" }
];
var BENTO_SPAN = { s: 4, m: 6, l: 12 };
var HERO_COMPACT_ENTER_TOP = 96;
var HERO_COMPACT_EXIT_TOP = 32;
var HERO_COMPACT_MIN_HEADROOM = 16;
var HERO_COMPACT_FALLBACK_HEIGHT = 60;
function computeNextHeroCompact({ currentCompact, scrollTop, scrollHeight, clientHeight, expandedHeight, compactHeight }) {
  if (currentCompact) {
    return scrollTop > HERO_COMPACT_EXIT_TOP;
  }
  if (scrollTop <= HERO_COMPACT_ENTER_TOP) return false;
  if (clientHeight > 0 && scrollHeight > clientHeight && expandedHeight > 0) {
    const shrinkDelta = Math.max(0, expandedHeight - (compactHeight || HERO_COMPACT_FALLBACK_HEIGHT));
    const postCollapseMaxScroll = scrollHeight - clientHeight - shrinkDelta;
    if (postCollapseMaxScroll < HERO_COMPACT_EXIT_TOP + HERO_COMPACT_MIN_HEADROOM) {
      return false;
    }
  }
  return true;
}
function balanceBentoSpans(sizes, preserveSize = []) {
  const spans = sizes.map((s) => BENTO_SPAN[s] || 6);
  let rowUsed = 0;
  for (const sp of spans) {
    rowUsed = rowUsed + sp > 12 ? sp : rowUsed + sp;
  }
  const remainder = 12 - rowUsed;
  if (remainder > 0 && remainder < 12 && spans.length > 0) {
    let fillIndex = -1;
    for (let idx = spans.length - 1; idx >= 0; idx -= 1) {
      if (!preserveSize[idx] && spans[idx] < 12) {
        fillIndex = idx;
        break;
      }
    }
    if (fillIndex >= 0) spans[fillIndex] += remainder;
  }
  return spans;
}
function bucketTaskColumn(task) {
  if (task.state === "completed" || task.state === "cancelled") return "done";
  if (task.viewState === "review" || task.state === "review") return "review";
  if (task.viewState === "pending" && !task.blockedReason && task.state !== "failed") return "pending";
  return "running";
}
function isTaskException(task) {
  return task.viewState === "blocked" || task.viewState === "failed" || task.viewState === "unknown" || task.state === "failed" || Boolean(task.blockedReason);
}
function taskPriorityRank(task) {
  if (task.viewState === "unknown") return 0;
  if (isTaskException(task)) return 1;
  if (task.viewState === "review" || task.state === "review") return 2;
  if (task.viewState === "running" || task.state === "running") return 3;
  if (task.state === "pending") return 4;
  return 5;
}
function humanizeActivityText(text) {
  return String(text || "").replace(/\b(table|checklist|mindmap|diagram|board|canvas|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})(?:\s*\(v(\d+)\))?/g, (match, type, id, version) => {
    const ref = parseRefString(`${type}:${id}`);
    const typeLabel = ARTIFACT_TYPE_OPTIONS.find((option) => option.value === ref.type)?.label || ref.type;
    return `${typeLabel}${ref.id}${version ? ` v${version}` : ""}`;
  }).replace(/^发布\s*/, "\u53D1\u5E03\u4E86");
}
function deriveMemberActivity(member, snapshot) {
  const tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : [];
  const activeTask = tasks.find((t) => t.memberId === member.id && !["completed", "cancelled"].includes(t.state));
  if (activeTask) {
    const latestNote = Array.isArray(activeTask.progress) && activeTask.progress.length > 0 ? activeTask.progress.at(-1).note : "";
    return humanizeActivityText(activeTask.blockedReason || latestNote || activeTask.title);
  }
  const actList = snapshot?.memberActivitySummary?.[member.id];
  if (Array.isArray(actList) && actList.length > 0 && actList[0].summary) {
    return humanizeActivityText(actList[0].summary);
  }
  if (member.roleKind === "commander") {
    const first = String(snapshot?.publicView?.summary || "").split(/\r?\n/).find((l) => l.trim());
    return first ? humanizeActivityText(first.trim()) : "\u7EDF\u7B79\u4E50\u56E2\u5206\u5DE5\u4E0E\u516C\u5171\u7B80\u62A5";
  }
  return label(memberState(snapshot, member));
}
function synthesizeAttention(snapshot) {
  if (Array.isArray(snapshot?.attention)) return snapshot.attention;
  const items = [];
  for (const req of pendingRequests(snapshot)) {
    items.push({
      id: "req:" + req.requestId,
      kind: "request",
      urgency: req.kind === "approval" ? 1 : 2,
      title: (req.kind === "approval" ? "\u8BF7\u6C42\u6279\u51C6" : "\u5411\u4F60\u63D0\u95EE") + " \xB7 " + (req.memberId || "\u6210\u5458"),
      detail: req.detail || req.payload?.reason || "",
      requestId: req.requestId,
      taskId: req.taskId,
      memberId: req.memberId
    });
  }
  for (const exec of (snapshot?.executions || []).filter((e) => e.state === "unknown" && !e.quarantined)) {
    items.push({
      id: "exec:" + exec.executionId,
      kind: "unknown",
      urgency: 2,
      title: "\u6267\u884C\u72B6\u6001\u672A\u77E5 \xB7 " + exec.taskId,
      detail: "\u4E0A\u6B21\u8FD0\u884C\u7ED3\u679C\u5C1A\u672A\u786E\u8BA4\uFF0C\u9700\u8981\u4F60\u88C1\u51B3",
      executionId: exec.executionId,
      taskId: exec.taskId,
      memberId: exec.memberId
    });
  }
  for (const task of snapshot?.tasks || []) {
    const manualReviewNeeded = (task.viewState === "review" || task.state === "review") && Boolean(task.reviewPolicy?.requiresReview && task.reviewDispatch?.status === "needs_assignment");
    if (manualReviewNeeded) {
      items.push({
        id: "review:" + task.taskId,
        kind: "review",
        urgency: 3,
        title: "\u5F85\u4F60\u9A8C\u6536 \xB7 " + task.title,
        detail: task.result?.summary || "\u6210\u5458\u5DF2\u63D0\u4EA4\u7ED3\u679C\uFF0C\u7B49\u5F85\u5BA1\u67E5",
        taskId: task.taskId,
        memberId: task.memberId
      });
    } else if (isTaskException(task)) {
      items.push({
        id: "blocked:" + task.taskId,
        kind: task.state === "failed" ? "failed" : "blocked",
        urgency: 4,
        title: (task.state === "failed" ? "\u4EFB\u52A1\u5931\u8D25 \xB7 " : "\u4EFB\u52A1\u963B\u585E \xB7 ") + task.title,
        detail: task.blockedReason || "\u8BF7\u67E5\u770B\u8BE6\u60C5\u5E76\u5904\u7406",
        taskId: task.taskId,
        memberId: task.memberId
      });
    }
  }
  return items.sort((a, b) => a.urgency - b.urgency);
}
function buildTaskProgressStats(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  let done = 0;
  let review = 0;
  let block = 0;
  let run = 0;
  let pending = 0;
  for (const t of list) {
    if (t.state === "completed") done += 1;
    else if (t.state === "cancelled") continue;
    else if (t.viewState === "review" || t.state === "review") review += 1;
    else if (isTaskException(t)) block += 1;
    else if (t.viewState !== "pending") run += 1;
    else pending += 1;
  }
  const activeTotal = list.filter((t) => t.state !== "cancelled").length;
  const total = Math.max(activeTotal, 1);
  return {
    total: activeTotal,
    done,
    review,
    block,
    run,
    pending,
    donePct: Math.round(done / total * 100),
    reviewPct: Math.round(review / total * 100),
    runPct: Math.round(run / total * 100),
    blockPct: Math.round(block / total * 100)
  };
}
function matchesArtifactFilters(obj, filters) {
  if (!obj || !filters) return true;
  if (filters.taskId && filters.taskId !== "all" && obj.taskId !== filters.taskId) return false;
  if (filters.memberId && filters.memberId !== "all" && obj.authorId !== filters.memberId) return false;
  if (filters.type && filters.type !== "all" && obj.type !== filters.type) return false;
  return true;
}
function parseRefString(str) {
  const m = /^(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})$/.exec(String(str || "").trim());
  return m ? { type: m[1], id: m[2] } : null;
}
function parseCommanderBriefing(summary, stats, attentionItems, dispatchPaused) {
  const lines = String(summary || "").split(/\r?\n/);
  let progress = "";
  let issues = "";
  let nextStep = "";
  const extraLines = [];
  let consumedFirstProse = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const mProg = /^当前进展[：:]\s*(.+)$/.exec(line);
    const mIss = /^关键问题[：:]\s*(.+)$/.exec(line);
    const mNext = /^下一步[：:]\s*(.+)$/.exec(line);
    if (mProg) {
      progress = mProg[1];
    } else if (mIss) {
      issues = mIss[1];
    } else if (mNext) {
      nextStep = mNext[1];
    } else {
      if (!progress && !consumedFirstProse && !/^(table|checklist|mindmap|diagram|board|html):/.test(line)) {
        progress = line;
        consumedFirstProse = true;
      } else {
        extraLines.push(raw);
      }
    }
  }
  if (!progress) {
    progress = stats.total === 0 ? "\u5C1A\u672A\u62C6\u89E3\u4EFB\u52A1\uFF0C\u7B49\u5F85\u6307\u6325\u8005\u5206\u6790\u76EE\u6807\u6216\u76F4\u63A5\u5BF9\u8BDD\u3002" : `\u5DF2\u5B8C\u6210 ${stats.done}/${stats.total} \u9879\u4EFB\u52A1` + (stats.run ? `\uFF0C${stats.run} \u9879\u6267\u884C\u4E2D` : "");
  }
  if (!issues) {
    if (attentionItems.length > 0) {
      issues = `${attentionItems.length} \u9879\u5F85\u4F60\u5904\u7406\uFF08${attentionItems.slice(0, 2).map((a) => a.title).join("\uFF1B")}\uFF09`;
    } else {
      issues = "\u6682\u65E0\u963B\u585E\u6216\u5F85\u5904\u7406\u5F02\u5E38\u3002";
    }
  }
  if (!nextStep) {
    if (stats.review > 0) nextStep = `\u4F18\u5148\u9A8C\u6536 ${stats.review} \u9879\u5DF2\u63D0\u4EA4\u7ED3\u679C\u7684\u4EFB\u52A1\u3002`;
    else if (stats.pending > 0) nextStep = dispatchPaused ? `\u6062\u590D\u6D3E\u53D1\u540E\u7EE7\u7EED\u5904\u7406 ${stats.pending} \u9879\u5F85\u6D3E\u53D1\u4EFB\u52A1\u3002` : `\u6D3E\u53D1\u6216\u7EE7\u7EED\u63A8\u8FDB ${stats.pending} \u9879\u5F85\u6D3E\u53D1\u4EFB\u52A1\u3002`;
    else if (stats.run > 0) nextStep = "\u5173\u6CE8\u6267\u884C\u4E2D\u7684\u6210\u5458\u4EA7\u51FA\u5E76\u6309\u9700\u68C0\u9605\u4EA7\u7269\u3002";
    else nextStep = stats.total === 0 ? "\u5728\u5E95\u90E8\u8F93\u5165\u6846\u4E0B\u8FBE\u5177\u4F53\u76EE\u6807\u3002" : "\u5168\u90E8\u4EFB\u52A1\u5DF2\u6536\u53E3\uFF0C\u53EF\u5F52\u6863\u6216\u5F00\u542F\u4E0B\u4E00\u9636\u6BB5\u3002";
  }
  return { progress, issues, nextStep, extraText: extraLines.join("\n").trim() };
}
function relativeTimeLabel(value, nowValue) {
  const timestamp = Date.parse(value || "");
  const now = Date.parse(nowValue || "") || Date.now();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((now - timestamp) / 6e4));
  if (minutes < 1) return "\u521A\u521A";
  if (minutes < 60) return `${minutes} \u5206\u949F\u524D`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} \u5C0F\u65F6\u524D`;
  return `${Math.floor(hours / 24)} \u5929\u524D`;
}
function EmptyState2({ icon, text, action = null }) {
  return h(
    "div",
    { className: "concerto-empty" },
    h("span", { "aria-hidden": true, className: "concerto-empty-icon" }, icon),
    h("p", { style: { margin: 0 } }, text),
    action
  );
}
function ConcertoTeamView({ sessionId, openView }) {
  useTeamCss();
  const { info, error, refresh } = useTeamSession(sessionId);
  const snapshot = info?.snapshot;
  const initialView = import_react20.default.useMemo(() => readSessionViewState(sessionId), [sessionId]);
  const containerRef = import_react20.default.useRef(null);
  const taskRefs = import_react20.default.useRef(/* @__PURE__ */ new Map());
  const taskCardRefs = import_react20.default.useRef(/* @__PURE__ */ new Map());
  const boardColumnRefs = import_react20.default.useRef(/* @__PURE__ */ new Map());
  const boardScrollRef = import_react20.default.useRef(null);
  const restoredScrollRef = import_react20.default.useRef(false);
  const compactRef = import_react20.default.useRef(false);
  const expandedHeroHeightRef = import_react20.default.useRef(0);
  const compactHeroHeightRef = import_react20.default.useRef(0);
  const lastCommand = import_react20.default.useRef(null);
  const tabsId = import_react20.default.useId();
  const pinRequestRef = import_react20.default.useRef(null);
  const [drawerState, setDrawerState] = import_react20.default.useState({ memberId: "", tab: "messages", returnTaskId: "" });
  const [inspectorStack, setInspectorStack] = import_react20.default.useState([]);
  const [activeTab, setActiveTab] = import_react20.default.useState(initialView.activeTab || "overview");
  const [selectedTaskId, setSelectedTaskId] = import_react20.default.useState(initialView.selectedTaskId || "");
  const [inspectorWide, setInspectorWide] = import_react20.default.useState(false);
  const [artifactFilters, setArtifactFilters] = import_react20.default.useState(initialView.artifactFilters || { taskId: "all", memberId: "all", type: "all" });
  const [savedFilterBeforeJump, setSavedFilterBeforeJump] = import_react20.default.useState(null);
  const [jumpOrigin, setJumpOrigin] = import_react20.default.useState(null);
  const [compact, setCompact] = import_react20.default.useState(false);
  const [attentionOpen, setAttentionOpen] = import_react20.default.useState(false);
  const [activeBoardColumn, setActiveBoardColumn] = import_react20.default.useState("pending");
  const [optimisticUserPins, setOptimisticUserPins] = import_react20.default.useState(null);
  const [pinningRef, setPinningRef] = import_react20.default.useState("");
  const [pinFailure, setPinFailure] = import_react20.default.useState(null);
  const [highlightTaskId, setHighlightTaskId] = import_react20.default.useState("");
  const [highlightObjectId, setHighlightObjectId] = import_react20.default.useState("");
  const [pinnedPreview, setPinnedPreview] = import_react20.default.useState(null);
  const [filePreview, setFilePreview] = import_react20.default.useState(null);
  const [busy, setBusy] = import_react20.default.useState(false);
  const [actionError, setActionError] = import_react20.default.useState("");
  const [runLimitsOpen, setRunLimitsOpen] = import_react20.default.useState(false);
  const [runLimitsError, setRunLimitsError] = import_react20.default.useState("");
  const hostTheme = useHostTheme();
  const isLight = hostTheme.isLight;
  const effectiveTheme = hostTheme.colorScheme;
  const snapshotViewObjectsRef = import_react20.default.useRef([]);
  snapshotViewObjectsRef.current = Array.isArray(snapshot?.viewObjects) ? snapshot.viewObjects : [];
  const artifactFiltersRef = import_react20.default.useRef(artifactFilters);
  artifactFiltersRef.current = artifactFilters;
  const activeTabRef = import_react20.default.useRef(activeTab);
  activeTabRef.current = activeTab;
  const selectedTaskIdRef = import_react20.default.useRef(selectedTaskId);
  selectedTaskIdRef.current = selectedTaskId;
  const drawerStateRef = import_react20.default.useRef(drawerState);
  drawerStateRef.current = drawerState;
  const inspectorStackRef = import_react20.default.useRef(inspectorStack);
  inspectorStackRef.current = inspectorStack;
  import_react20.default.useEffect(() => {
    const vs = readSessionViewState(sessionId);
    setDrawerState({ memberId: "", tab: "messages", returnTaskId: "" });
    setInspectorStack([]);
    setActiveTab(vs.activeTab || "overview");
    setSelectedTaskId(vs.selectedTaskId || "");
    setArtifactFilters(vs.artifactFilters || { taskId: "all", memberId: "all", type: "all" });
    setSavedFilterBeforeJump(null);
    setJumpOrigin(null);
    compactRef.current = false;
    expandedHeroHeightRef.current = 0;
    compactHeroHeightRef.current = 0;
    setCompact(false);
    setOptimisticUserPins(null);
    setPinningRef("");
    setPinFailure(null);
    pinRequestRef.current = null;
    setHighlightTaskId("");
    setHighlightObjectId("");
    setPinnedPreview(null);
    setActionError("");
    setRunLimitsOpen(false);
    setRunLimitsError("");
    restoredScrollRef.current = false;
    lastCommand.current = null;
  }, [sessionId]);
  import_react20.default.useEffect(() => {
    if (optimisticUserPins && JSON.stringify(snapshot?.userPinnedRefs || []) === JSON.stringify(optimisticUserPins)) {
      setOptimisticUserPins(null);
    }
  }, [snapshot?.userPinnedRefs, optimisticUserPins]);
  import_react20.default.useEffect(() => {
    const consumePending = () => {
      const pending2 = consumeMemberDrawerOpen(sessionId);
      if (pending2?.memberId) {
        setDrawerState({ memberId: pending2.memberId, tab: pending2.tab || "messages" });
      }
    };
    consumePending();
    return onMemberDrawerRequest((targetSessionId) => {
      if (targetSessionId === sessionId) consumePending();
    });
  }, [sessionId]);
  import_react20.default.useLayoutEffect(() => {
    if (restoredScrollRef.current || !snapshot || !containerRef.current) return;
    const el = containerRef.current;
    const savedTop = readSessionViewState(sessionId).scrollTop;
    if (typeof savedTop === "number" && savedTop > 0) {
      const header = el.querySelector("header");
      if (header && header.getAttribute("data-compact") !== "true") {
        const headerHeight = header.getBoundingClientRect().height;
        if (headerHeight > 0) expandedHeroHeightRef.current = headerHeight;
      }
      el.scrollTop = savedTop;
      const isCompact = computeNextHeroCompact({
        currentCompact: false,
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        expandedHeight: expandedHeroHeightRef.current,
        compactHeight: compactHeroHeightRef.current
      });
      compactRef.current = isCompact;
      setCompact(isCompact);
    }
    restoredScrollRef.current = true;
  }, [sessionId, snapshot]);
  import_react20.default.useLayoutEffect(() => {
    const root = containerRef.current;
    const header = root?.querySelector("header");
    if (!header) return;
    const update = () => {
      const headerHeight = header.getBoundingClientRect().height;
      if (headerHeight > 0) {
        if (header.getAttribute("data-compact") === "true") {
          compactHeroHeightRef.current = headerHeight;
        } else {
          expandedHeroHeightRef.current = headerHeight;
        }
      }
      root.style.setProperty("--cc-sticky-height", `${headerHeight + 16}px`);
      setInspectorWide(root.clientWidth >= 1100);
      if (compactRef.current && root.scrollTop <= HERO_COMPACT_EXIT_TOP) {
        compactRef.current = false;
        setAttentionOpen(false);
        setCompact(false);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    observer.observe(root);
    return () => observer.disconnect();
  }, [sessionId, Boolean(snapshot)]);
  import_react20.default.useEffect(() => {
    const root = boardScrollRef.current;
    if (activeTab !== "tasks" || !root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.dataset?.concertoColumn) setActiveBoardColumn(visible.target.dataset.concertoColumn);
    }, { root, threshold: [0.4, 0.6, 0.8] });
    for (const element of boardColumnRefs.current.values()) observer.observe(element);
    return () => observer.disconnect();
  }, [activeTab, snapshot?.tasks?.length, selectedTaskId, inspectorWide]);
  const closeAttention = import_react20.default.useCallback(() => setAttentionOpen(false), []);
  const changeTab = import_react20.default.useCallback((tab, keepJumpOrigin = false) => {
    setAttentionOpen(false);
    if (!keepJumpOrigin) setJumpOrigin(null);
    setActiveTab(tab);
    writeSessionViewState(sessionId, { activeTab: tab });
  }, [sessionId]);
  const updateFilters = import_react20.default.useCallback((patch) => {
    setSavedFilterBeforeJump(null);
    setArtifactFilters((prev) => {
      const next = { ...prev, ...patch };
      writeSessionViewState(sessionId, { artifactFilters: next });
      return next;
    });
  }, [sessionId]);
  const restoreSavedFilters = import_react20.default.useCallback(() => {
    if (!savedFilterBeforeJump?.filters) return;
    const prevFilters = { ...savedFilterBeforeJump.filters };
    setSavedFilterBeforeJump(null);
    setArtifactFilters(prevFilters);
    writeSessionViewState(sessionId, { artifactFilters: prevFilters });
  }, [sessionId, savedFilterBeforeJump]);
  const goInspectorBack = import_react20.default.useCallback(() => {
    const stack = [...inspectorStackRef.current];
    const previous = stack.pop();
    if (!previous) return false;
    setInspectorStack(stack);
    setJumpOrigin(null);
    setActiveTab(previous.activeTab || "tasks");
    if (previous.kind === "member") {
      setSelectedTaskId("");
      setDrawerState({ memberId: previous.id, tab: previous.tab || "messages", returnTaskId: "" });
      writeSessionViewState(sessionId, { activeTab: previous.activeTab || "tasks", selectedTaskId: "" });
      return true;
    }
    setDrawerState({ memberId: "", tab: "messages", returnTaskId: "" });
    setSelectedTaskId(previous.id);
    writeSessionViewState(sessionId, { activeTab: previous.activeTab || "tasks", selectedTaskId: previous.id });
    requestAnimationFrame(() => {
      const target = taskRefs.current.get(previous.id) || taskCardRefs.current.get(previous.id);
      focusAndReveal(target);
    });
    return true;
  }, [sessionId]);
  const openMemberDrawer = import_react20.default.useCallback((memberId, tab = "messages") => {
    if (!memberId) return;
    setAttentionOpen(false);
    const visibleTaskId = activeTabRef.current === "tasks" ? selectedTaskIdRef.current : "";
    const currentMemberId = drawerStateRef.current.memberId;
    const stack = [...inspectorStackRef.current];
    if (currentMemberId && currentMemberId !== memberId) {
      stack.push({ kind: "member", id: currentMemberId, tab: drawerStateRef.current.tab, activeTab: activeTabRef.current });
    } else if (visibleTaskId) {
      stack.push({ kind: "task", id: visibleTaskId, activeTab: "tasks" });
    }
    setInspectorStack(stack);
    if (visibleTaskId) {
      setSelectedTaskId("");
      writeSessionViewState(sessionId, { selectedTaskId: "" });
    }
    setDrawerState({ memberId, tab, returnTaskId: "" });
  }, [sessionId]);
  const closeMemberDrawer = import_react20.default.useCallback((restore = true) => {
    if (restore && goInspectorBack()) return;
    setDrawerState({ memberId: "", tab: "messages", returnTaskId: "" });
    if (restore) setInspectorStack([]);
  }, [goInspectorBack]);
  const closeTaskInspector = import_react20.default.useCallback(() => {
    const taskId = selectedTaskIdRef.current;
    setSelectedTaskId("");
    setInspectorStack([]);
    writeSessionViewState(sessionId, { selectedTaskId: "" });
    requestAnimationFrame(() => {
      if (typeof document !== "undefined" && document.querySelector("[data-concerto-member-drawer][open]")) return;
      taskCardRefs.current.get(taskId)?.focus({ preventScroll: true });
    });
  }, [sessionId]);
  const returnToJumpOrigin = import_react20.default.useCallback(() => {
    if (!jumpOrigin) return;
    const origin = jumpOrigin;
    setJumpOrigin(null);
    setActiveTab(origin.tab);
    writeSessionViewState(sessionId, { activeTab: origin.tab });
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          document.getElementById(`${tabsId}-panel-${origin.tab}`)?.focus({ preventScroll: true });
          containerRef.current.scrollTop = origin.scrollTop || 0;
        }
      });
    }
    if (origin.memberId) {
      openMemberDrawer(origin.memberId, "tasks");
    }
  }, [jumpOrigin, sessionId, openMemberDrawer, tabsId]);
  const jumpToTask = import_react20.default.useCallback((taskId, origin = null) => {
    if (!taskId) return;
    setAttentionOpen(false);
    const curTab = activeTabRef.current;
    if (curTab === "tasks" && selectedTaskIdRef.current === taskId && !origin?.memberId) {
      closeTaskInspector();
      return;
    }
    if (origin?.memberId) {
      setInspectorStack([
        ...inspectorStackRef.current,
        { kind: "member", id: origin.memberId, tab: origin.tab || "tasks", activeTab: curTab }
      ]);
    } else if (curTab === "tasks" && selectedTaskIdRef.current && selectedTaskIdRef.current !== taskId) {
      setInspectorStack([
        ...inspectorStackRef.current,
        { kind: "task", id: selectedTaskIdRef.current, activeTab: "tasks" }
      ]);
    } else if (curTab !== "tasks") {
      setInspectorStack([]);
    }
    if (curTab !== "tasks" || origin?.memberId) {
      setJumpOrigin({
        tab: curTab,
        scrollTop: containerRef.current?.scrollTop || 0,
        memberId: origin?.memberId || "",
        targetLabel: taskId
      });
    }
    setActiveTab("tasks");
    setSelectedTaskId(taskId);
    writeSessionViewState(sessionId, { activeTab: "tasks", selectedTaskId: taskId });
    setHighlightObjectId("");
    setHighlightTaskId(taskId);
    requestAnimationFrame(() => {
      const el = taskRefs.current.get(taskId) || (typeof document !== "undefined" ? document.querySelector(`[data-concerto-task-id="${taskId}"]`) : null);
      focusAndReveal(el);
    });
    setTimeout(() => {
      setHighlightTaskId((cur) => cur === taskId ? "" : cur);
    }, 2400);
  }, [sessionId, closeTaskInspector]);
  const jumpToStageObject = import_react20.default.useCallback((refOrObj, origin = null) => {
    setAttentionOpen(false);
    if (!refOrObj || !refOrObj.id) {
      changeTab("artifacts");
      return;
    }
    const curTab = activeTabRef.current;
    const targetId = refOrObj.id;
    const normType = refOrObj.type === "canvas" ? "board" : refOrObj.type;
    const allObjs = snapshotViewObjectsRef.current;
    const resolvedObj = allObjs.find((o) => o.id === targetId && (!normType || o.type === normType)) || allObjs.find((o) => o.id === targetId) || (normType ? refOrObj : null);
    const domId = resolvedObj ? `concerto-stage-obj-${resolvedObj.type}-${resolvedObj.id}` : "";
    const existsOnCurrentOverview = curTab === "overview" && typeof document !== "undefined" && Boolean(domId && document.getElementById(domId) || document.querySelector(`[data-concerto-object-id="${targetId}"]`));
    if (!existsOnCurrentOverview) {
      if (curTab !== "artifacts" || origin?.memberId) {
        setJumpOrigin({
          tab: curTab,
          scrollTop: containerRef.current?.scrollTop || 0,
          memberId: origin?.memberId || "",
          targetLabel: resolvedObj ? resolvedObj.title || `${resolvedObj.type}:${resolvedObj.id}` : targetId
        });
      }
      const curFilters = artifactFiltersRef.current;
      if (resolvedObj && !matchesArtifactFilters(resolvedObj, curFilters)) {
        const relaxedFilters = {
          taskId: curFilters.taskId !== "all" && resolvedObj.taskId !== curFilters.taskId ? "all" : curFilters.taskId,
          memberId: curFilters.memberId !== "all" && resolvedObj.authorId !== curFilters.memberId ? "all" : curFilters.memberId,
          type: curFilters.type !== "all" && resolvedObj.type !== curFilters.type ? "all" : curFilters.type
        };
        setSavedFilterBeforeJump({
          filters: { ...curFilters },
          targetLabel: `${resolvedObj.type}:${resolvedObj.id}`
        });
        setArtifactFilters(relaxedFilters);
        writeSessionViewState(sessionId, { artifactFilters: relaxedFilters, activeTab: "artifacts" });
      } else {
        writeSessionViewState(sessionId, { activeTab: "artifacts" });
      }
      setActiveTab("artifacts");
    }
    setHighlightTaskId("");
    setHighlightObjectId(targetId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = typeof document !== "undefined" ? domId && document.getElementById(domId) || document.querySelector(`[data-concerto-object-id="${targetId}"]`) : null;
        focusAndReveal(el);
      });
    });
    setTimeout(() => {
      setHighlightObjectId((cur) => cur === targetId ? "" : cur);
    }, 2400);
  }, [sessionId, changeTab]);
  async function openFilePreview(filePath, taskId = "") {
    if (!filePath) return;
    setFilePreview({ loading: true, error: "", relativePath: filePath, path: filePath, content: "", sizeBytes: 0, truncated: false });
    try {
      const res = await request("/files/preview", {
        method: "POST",
        body: JSON.stringify({ sessionId, path: filePath, ...taskId ? { taskId } : {} })
      });
      setFilePreview({
        loading: false,
        error: "",
        relativePath: res.relativePath || filePath,
        path: res.path || filePath,
        content: res.content ?? "",
        sizeBytes: res.sizeBytes ?? 0,
        truncated: Boolean(res.truncated)
      });
    } catch (err) {
      setFilePreview({
        loading: false,
        error: err?.message || "\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25",
        relativePath: filePath,
        path: filePath,
        content: "",
        sizeBytes: 0,
        truncated: false
      });
    }
  }
  async function openArtifactVersion(id, version, refTitle = "", label2 = "\u56FA\u5B9A\u8BC1\u636E") {
    const requestedRef = refTitle || `${id}@v${version}`;
    setPinnedPreview({ loading: true, error: "", object: null, requestedRef, label: label2 });
    try {
      const res = await fetchViewObjectVersion(sessionId, id, version);
      if (!res?.ok) throw new Error(res?.detail || "\u8BFB\u53D6\u56FA\u5B9A\u7248\u672C\u5931\u8D25");
      setPinnedPreview({ loading: false, error: "", object: res, requestedRef, label: label2 });
    } catch (err) {
      setPinnedPreview({ loading: false, error: err?.message || String(err), object: null, requestedRef, label: label2 });
    }
  }
  async function handleTogglePin(obj, desiredPinned) {
    if (!obj?.type || !obj?.id || pinRequestRef.current) return;
    const refStr = `${obj.type}:${obj.id}`;
    const operation = { sessionId, refStr };
    pinRequestRef.current = operation;
    setPinningRef(refStr);
    setPinFailure(null);
    const current = optimisticUserPins ?? (Array.isArray(snapshot?.userPinnedRefs) ? snapshot.userPinnedRefs : []);
    const shouldPin = desiredPinned ?? !current.includes(refStr);
    const nextLocal = shouldPin ? [.../* @__PURE__ */ new Set([...current, refStr])] : current.filter((r) => r !== refStr);
    setOptimisticUserPins(nextLocal);
    try {
      const res = await saveUserViewPreferences(sessionId, { pinnedRefs: nextLocal });
      if (pinRequestRef.current !== operation) return;
      if (!res?.ok || !Array.isArray(res.userPinnedRefs)) throw new Error("\u672A\u53D6\u5F97\u670D\u52A1\u5668\u4FDD\u5B58\u7ED3\u679C");
      setOptimisticUserPins(res.userPinnedRefs);
      refresh();
    } catch (err) {
      if (pinRequestRef.current !== operation) return;
      setOptimisticUserPins(null);
      setPinFailure({ object: obj, desiredPinned: shouldPin, message: `\u7F6E\u9876\u4FDD\u5B58\u672A\u786E\u8BA4\uFF1A${err.message}\u3002\u5DF2\u6062\u590D\u6700\u8FD1\u540C\u6B65\u7684\u72B6\u6001\u3002` });
      refresh();
    } finally {
      if (pinRequestRef.current === operation) {
        pinRequestRef.current = null;
        setPinningRef("");
      }
    }
  }
  function handleContainerScroll(e) {
    const el = e.currentTarget;
    const top = el.scrollTop;
    writeSessionViewState(sessionId, { scrollTop: top });
    const header = el.querySelector("header");
    if (header && header.getAttribute("data-compact") !== "true") {
      const headerHeight = header.getBoundingClientRect().height;
      if (headerHeight > 0) expandedHeroHeightRef.current = headerHeight;
    }
    const nextCompact = computeNextHeroCompact({
      currentCompact: compactRef.current,
      scrollTop: top,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      expandedHeight: expandedHeroHeightRef.current,
      compactHeight: compactHeroHeightRef.current
    });
    if (nextCompact !== compactRef.current) {
      compactRef.current = nextCompact;
      setAttentionOpen(false);
      setCompact(nextCompact);
    }
  }
  if (!info || !snapshot) {
    return h(
      "section",
      {
        className: "concerto-surface concerto-team-view",
        "data-concerto-team-view": "true",
        "data-conversation-composer-overlay": "",
        "data-concerto-theme": effectiveTheme,
        style: hostTheme.cssVars,
        "aria-label": "Concerto \u56E2\u961F\u4E3B\u9875"
      },
      h(
        "div",
        { className: "concerto-hero" },
        h(
          "div",
          { className: "concerto-hero-top" },
          h("strong", { style: { fontSize: "var(--cc-fs-title)" } }, "Concerto \u56E2\u961F\u89C6\u56FE"),
          openView && h("button", { type: "button", className: "concerto-btn", onClick: () => openView("chat") }, "\u8FD4\u56DE\u5BF9\u8BDD")
        ),
        h(
          "p",
          { style: { ...styles.muted, margin: 0 } },
          error || "\u5F53\u524D\u4F1A\u8BDD\u4E0D\u662F\u53D7\u7BA1\u56E2\u961F\u4F1A\u8BDD\uFF0C\u672A\u63A5\u7BA1\u666E\u901A\u5BF9\u8BDD\u3002\u8BF7\u5728 Concerto \u4FA7\u680F\u8BBE\u7F6E\u6216\u56E2\u961F Preset \u4E2D\u542F\u52A8\u56E2\u961F\u3002"
        )
      )
    );
  }
  const canAct = info.roleKind === "commander" && !busy && !error;
  const planGate = snapshot.planGate;
  const planBlocksDispatch = Boolean(planGate && planGate.status !== "approved");
  const dispatchPaused = snapshot.paused === true;
  const dispatchLimits = snapshot.dispatchLimits ?? {};
  async function command(path, input, onError = setActionError) {
    setBusy(true);
    setActionError("");
    const signature = JSON.stringify({ path, input, sessionId });
    if (lastCommand.current?.signature !== signature) {
      lastCommand.current = { signature, id: crypto.randomUUID() };
    }
    try {
      await fetch("/concerto" + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...input, sessionId, commandId: lastCommand.current.id })
      }).then(async (res) => {
        const text = await res.text();
        const body = text === "" ? null : JSON.parse(text);
        if (!res.ok) throw new Error(body?.detail || String(res.status));
        return body;
      });
      lastCommand.current = null;
      refresh();
      return true;
    } catch (err) {
      onError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openRunLimits() {
    setRunLimitsError("");
    setRunLimitsOpen(true);
  }
  async function saveRunLimits(event) {
    event.preventDefault();
    setRunLimitsError("");
    const values = readDispatchLimitsForm(event.currentTarget);
    if (await command("/runs/dispatch-limits", { dispatchLimits: values }, setRunLimitsError)) setRunLimitsOpen(false);
  }
  const members = roster(snapshot);
  const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
  const executions = Array.isArray(snapshot.executions) ? snapshot.executions : [];
  const events = Array.isArray(snapshot.events) ? snapshot.events : [];
  const viewObjects = Array.isArray(snapshot.viewObjects) ? snapshot.viewObjects : [];
  const requiredViews = Array.isArray(snapshot.requiredViews) ? snapshot.requiredViews : [];
  const missingRequiredViews = Array.isArray(snapshot.missingRequiredViews) ? snapshot.missingRequiredViews : [];
  const blockingMissing = missingRequiredViews.filter((m) => m.requiredForAcceptance);
  const suggestedMissing = missingRequiredViews.filter((m) => !m.requiredForAcceptance);
  const pending = pendingRequests(snapshot);
  const active = executions.filter((e) => ["running", "waiting_input", "waiting_approval", "interrupting"].includes(e.state));
  const unknownExecs = executions.filter((e) => e.state === "unknown" && !e.quarantined);
  const publicView = normalizePublicView(snapshot.publicView);
  const userPinnedRefs = optimisticUserPins ?? (Array.isArray(snapshot.userPinnedRefs) ? snapshot.userPinnedRefs : []);
  const userPinnedSet = new Set(userPinnedRefs);
  const stats = buildTaskProgressStats(tasks);
  const memberCapsList = Array.isArray(snapshot.metadata?.memberCapabilities) ? snapshot.metadata.memberCapabilities : [];
  const capByMemberId = new Map(memberCapsList.map((c) => [c.memberId, c]));
  const unreadyCaps = memberCapsList.filter((c) => ["preset_unreloaded", "preset_stale", "preset_broken", "connector_missing"].includes(c.verificationStatus));
  const attentionItems = synthesizeAttention(snapshot);
  const actionableCount = attentionItems.length + blockingMissing.length;
  const taskAttentionCount = new Set(attentionItems.filter((item) => item.taskId).map((item) => item.taskId)).size;
  const teamGoal = snapshot.metadata?.objective || snapshot.metadata?.goal || "";
  const briefing = parseCommanderBriefing(publicView.summary, stats, attentionItems, dispatchPaused);
  const userPinObjs = userPinnedRefs.map(parseRefString).filter(Boolean).map((ref) => ({ ref, resolved: resolveViewObjectRef(viewObjects, ref, { pinnedRefs: publicView.pinnedRefs }) }));
  const stageSections = Array.isArray(publicView.sections) ? publicView.sections : [];
  const commanderRenderedKeys = /* @__PURE__ */ new Set();
  for (const sec of stageSections) {
    for (const ref of sec.refs || []) {
      const k = `${ref.type}:${ref.id}`;
      if (!userPinnedSet.has(k)) commanderRenderedKeys.add(k);
    }
  }
  for (const ref of publicView.pinnedRefs || []) {
    const k = `${ref.type}:${ref.id}`;
    if (!userPinnedSet.has(k)) commanderRenderedKeys.add(k);
  }
  const overviewShownKeys = /* @__PURE__ */ new Set([...userPinnedSet, ...commanderRenderedKeys]);
  const unpinnedFallbackObjs = overviewShownKeys.size === 0 ? viewObjects.slice(0, 2) : [];
  const hiddenArtifactsCount = Math.max(0, viewObjects.length - overviewShownKeys.size - unpinnedFallbackObjs.length);
  const prioritizedTasks = tasks.slice().sort((a, b) => taskPriorityRank(a) - taskPriorityRank(b));
  const keyTasks = prioritizedTasks.slice(0, 4);
  const kanbanMap = { pending: [], running: [], review: [], done: [] };
  for (const t of tasks) kanbanMap[bucketTaskColumn(t)].push(t);
  kanbanMap.running.sort((a, b) => Number(isTaskException(b)) - Number(isTaskException(a)));
  const filteredArtifacts = viewObjects.filter((o) => matchesArtifactFilters(o, artifactFilters));
  const drawerMember = drawerState.memberId ? members.find((m) => m.id === drawerState.memberId) || null : null;
  const selectedTask = selectedTaskId ? tasks.find((task) => task.taskId === selectedTaskId) || null : null;
  const renderCountTag = (count) => count > 0 ? h("span", { className: "concerto-tag concerto-num" }, String(count)) : null;
  function renderTaskDetailModule(task, isDialog = false) {
    const meta = STATE_META[task.viewState] || STATE_META[task.state] || STATE_META.pending;
    const taskObjects = viewObjects.filter((o) => o.taskId === task.taskId);
    const taskReqViews = requiredViews.filter((v) => v.taskId === task.taskId);
    const taskEvents = events.filter((e) => e.taskId === task.taskId);
    const latestNote = task.blockedReason || task.progress?.at(-1)?.note || "";
    const execSettled = executions.some((e) => e.executionId === task.executionId && ["finished", "stopped"].includes(e.state));
    const taskRequests = pending.filter((req) => req.taskId === task.taskId);
    const taskUnknownExecs = unknownExecs.filter((exec) => exec.taskId === task.taskId);
    const pendingTask = task.state === "pending";
    const canUnblock = task.state === "blocked" && !task.needsAdjudication && taskUnknownExecs.length === 0;
    const previousInspector = inspectorStack.at(-1);
    return h(
      "article",
      {
        key: task.taskId,
        ref: (el) => {
          if (el) taskRefs.current.set(task.taskId, el);
          else taskRefs.current.delete(task.taskId);
        },
        className: "concerto-task-module" + (highlightTaskId === task.taskId ? " concerto-task-highlight" : ""),
        "data-concerto-task-id": task.taskId,
        tabIndex: -1
      },
      h(
        "div",
        { className: "concerto-task-summary" },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0, flex: "1 1 240px" } },
          previousInspector && h("button", {
            type: "button",
            className: "concerto-btn concerto-btn--ghost",
            "aria-label": `\u8FD4\u56DE ${previousInspector.id}`,
            onClick: goInspectorBack
          }, `\u2190 ${previousInspector.id}`),
          h("h3", null, task.title),
          h(StateChip, { status: task.viewState || task.state, text: meta.label }),
          task.memberId && h("button", {
            type: "button",
            className: "concerto-chip",
            onClick: () => openMemberDrawer(task.memberId, "tasks")
          }, task.memberId),
          h(
            "span",
            { className: "concerto-id", style: { color: "var(--dsw-alias-label-tertiary)" } },
            task.taskId + " \xB7 \u7B2C " + task.attempt + " \u6B21" + (latestNote ? " \xB7 " + latestNote.slice(0, 60) : "")
          )
        ),
        h("button", {
          type: "button",
          autoFocus: isDialog,
          className: "concerto-btn concerto-btn--ghost concerto-btn--icon",
          "aria-label": `\u5173\u95ED\u4EFB\u52A1\u8BE6\u60C5\uFF1A${task.title}`,
          title: "\u5173\u95ED\u4EFB\u52A1\u8BE6\u60C5",
          onClick: closeTaskInspector
        }, h(UiIcon, { name: "close" }))
      ),
      (taskRequests.length > 0 || taskUnknownExecs.length > 0 || pendingTask || canUnblock || task.state === "review" && task.result) && h(
        "section",
        {
          className: "concerto-inspector-actions",
          "aria-label": "\u4EFB\u52A1\u64CD\u4F5C"
        },
        taskRequests.map((req) => h(RequestCard, {
          key: req.requestId,
          item: req,
          bare: true,
          disabled: !canAct,
          onAnswer: (it2, ans) => command("/requests/respond", { requestId: it2.requestId, answer: ans })
        })),
        taskUnknownExecs.map((exec) => h(AdjudicationCard, {
          key: exec.executionId,
          execution: exec,
          bare: true,
          disabled: !canAct,
          onSubmit: (input) => command("/executions/adjudicate", input)
        })),
        pendingTask && !task.raceGroup && members.filter((m) => m.roleKind === "worker").length >= 2 && h(RaceLauncherBar, {
          sessionId,
          taskId: task.taskId,
          workers: members.filter((m) => m.roleKind === "worker"),
          disabled: !canAct || planBlocksDispatch || dispatchPaused,
          onStarted: () => refresh()
        }),
        canUnblock && h(UnblockTaskForm, {
          key: task.taskId,
          task,
          disabled: !canAct,
          onSubmit: (input) => command("/tasks/unblock", input)
        }),
        pendingTask && task.worktreeWarning && h(
          "section",
          {
            className: "concerto-acc-box",
            role: "status",
            "aria-label": "\u5DE5\u4F5C\u533A\u672A\u63D0\u4EA4\u53D8\u66F4\u63D0\u793A",
            style: { width: "100%", fontSize: "var(--cc-fs-caption)", borderColor: "var(--cc-state-attention)" }
          },
          h(
            "div",
            { style: { fontWeight: "var(--cc-fw-strong)", color: "var(--cc-state-attention)", marginBottom: 4 } },
            `\u6E90 Git \u5DE5\u4F5C\u533A\u5B58\u5728\u672A\u63D0\u4EA4/\u672A\u8DDF\u8E2A\u53D8\u66F4\uFF08\u5DF2\u6682\u5B58 ${task.worktreeWarning.stagedCount ?? 0} \xB7 \u5DF2\u4FEE\u6539 ${task.worktreeWarning.unstagedCount ?? 0} \xB7 \u672A\u8DDF\u8E2A ${task.worktreeWarning.untrackedCount ?? 0}\uFF09`
          ),
          h(
            "div",
            { style: { color: "var(--cc-text-secondary)", marginBottom: 6, overflowWrap: "anywhere" } },
            task.worktreeWarning.detail
          ),
          Array.isArray(task.worktreeWarning.dirtyFiles) && task.worktreeWarning.dirtyFiles.length > 0 && h(
            "div",
            { style: { color: "var(--cc-text-muted)", marginBottom: 6, overflowWrap: "anywhere" } },
            "\u6D89\u53CA\u6587\u4EF6\uFF1A",
            h("code", null, task.worktreeWarning.dirtyFiles.slice(0, 6).map((f) => f.path).join("\u3001") + ((task.worktreeWarning.totalDirtyCount || 0) > 6 ? ` \u7B49 ${task.worktreeWarning.totalDirtyCount} \u9879` : ""))
          ),
          h(
            "div",
            { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
            h("button", {
              type: "button",
              className: "concerto-btn concerto-btn--primary",
              disabled: !canAct || dispatchPaused || planBlocksDispatch || Boolean(task.dispatchBudget?.blockedReason) || active.length > 0 || unknownExecs.length > 0,
              onClick: () => command("/tasks/dispatch", { taskId: task.taskId, worktreeMode: "isolated_clean", callerKind: "ui" })
            }, "\u6309\u5E72\u51C0 Worktree \u6D3E\u53D1\uFF08\u4E0D\u590D\u5236\u672A\u63D0\u4EA4\u6587\u4EF6\uFF09"),
            h("button", {
              type: "button",
              className: "concerto-btn",
              disabled: !canAct || dispatchPaused || planBlocksDispatch || Boolean(task.dispatchBudget?.blockedReason) || active.length > 0 || unknownExecs.length > 0,
              onClick: () => command("/tasks/dispatch", { taskId: task.taskId, worktreeMode: "shared", callerKind: "ui" })
            }, "\u6539\u7528\u5171\u4EAB\u76EE\u5F55\u987A\u5E8F\u6D3E\u53D1")
          )
        ),
        pendingTask && h("button", {
          type: "button",
          className: "concerto-btn",
          disabled: !canAct || taskUnknownExecs.length > 0,
          onClick: () => command("/tasks/cancel", { taskId: task.taskId })
        }, "\u53D6\u6D88\u5F85\u6D3E\u4EFB\u52A1"),
        pendingTask && h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--primary",
          disabled: !canAct || dispatchPaused || planBlocksDispatch || Boolean(task.dispatchBudget?.blockedReason) || active.length > 0 || unknownExecs.length > 0,
          onClick: () => command("/tasks/dispatch", { taskId: task.taskId, callerKind: "ui" })
        }, "\u6D3E\u53D1\u4EFB\u52A1"),
        task.state === "review" && task.result && !task.reviewPolicy?.requiresReview && h("p", {
          className: "concerto-field-hint",
          style: { margin: "0 0 6px" }
        }, "\u666E\u901A\u4EFB\u52A1\u7531\u6307\u6325\u8005\u81EA\u52A8\u6838\u9A8C\u95ED\u73AF\uFF0C\u65E0\u9700\u624B\u52A8\u64CD\u4F5C\uFF08\u4F60\u4E5F\u53EF\u5728\u6B64\u76F4\u63A5\u4EBA\u5DE5\u786E\u8BA4\uFF09\uFF1A"),
        task.state === "review" && task.result && h(ReviewCard, {
          task,
          bare: true,
          disabled: !canAct || !execSettled,
          onReview: (tk, verdict, reason) => command("/tasks/review", {
            taskId: tk.taskId,
            executionId: tk.executionId,
            resultId: tk.result.resultId,
            verdict,
            reason,
            evidenceRefs: tk.result.artifactRefs ?? []
          })
        })
      ),
      h(
        "div",
        { className: "concerto-task-inspector-body", style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--cc-border-subtle)" } },
        task.dispatchBudget && h(
          "div",
          { style: { ...styles.muted, marginBottom: 8 } },
          `\u6267\u884C ${task.dispatchBudget.attempts} / ${dispatchLimits.maxAttempts ?? "\u4E0D\u9650"} \xB7 \u8FD4\u5DE5 ${task.dispatchBudget.reworks} / ${dispatchLimits.maxReworks ?? "\u4E0D\u9650"}`,
          task.dispatchBudget.blockedReason && info.roleKind === "commander" && h("button", {
            type: "button",
            className: "concerto-link",
            disabled: !canAct,
            onClick: openRunLimits
          }, "\u8C03\u6574\u672C\u6B21\u8FD0\u884C\u7684\u4E0A\u9650")
        ),
        h(
          "div",
          { className: "concerto-acc-cols" },
          h(
            "div",
            { className: "concerto-acc-box" },
            task.objective && h("p", { style: { marginTop: 0, fontSize: "var(--cc-fs-meta)" } }, h("strong", null, "\u76EE\u6807\u4E0E\u8FB9\u754C\uFF1A"), task.objective),
            Array.isArray(task.dependsOn) && task.dependsOn.length > 0 && h(
              "div",
              { style: { fontSize: "var(--cc-fs-caption)", marginBottom: 6 } },
              h("strong", null, "\u524D\u7F6E\u4F9D\u8D56\uFF1A"),
              h("span", { className: "concerto-id" }, task.dependsOn.join("\u3001"))
            ),
            task.writeScope && h(
              "div",
              { style: { fontSize: "var(--cc-fs-caption)", marginBottom: 6, overflowWrap: "anywhere" } },
              h("strong", null, "\u5199\u5165\u8303\u56F4\uFF1A"),
              h("code", null, task.writeScope)
            ),
            task.worktree && h(WorktreeActionBar, {
              sessionId,
              taskId: task.taskId,
              worktree: task.worktree,
              disabled: !canAct
            }),
            !task.worktree && task.worktreeFallback && h(
              "div",
              { style: { fontSize: "var(--cc-fs-caption)", marginBottom: 6, overflowWrap: "anywhere", color: "var(--cc-text-muted)" } },
              h("strong", null, "\u5DE5\u4F5C\u533A\u6A21\u5F0F\uFF1A"),
              `\u5171\u4EAB\u76EE\u5F55\u987A\u5E8F\u6267\u884C\uFF08\u672A\u542F\u7528 Git Worktree \u57FA\u7EBF \xB7 ${task.worktreeFallback.reason}\uFF09`
            ),
            Array.isArray(task.acceptance) && task.acceptance.length > 0 && h(
              "div",
              null,
              h("strong", { style: { fontSize: "var(--cc-fs-meta)" } }, "\u9A8C\u6536\u6807\u51C6\uFF1A"),
              h(
                "ul",
                { style: { margin: "4px 0", paddingLeft: 18, fontSize: "var(--cc-fs-meta)" } },
                task.acceptance.map((acc, i) => h("li", { key: i }, acc))
              )
            ),
            taskReqViews.length > 0 && h(
              "div",
              { style: { marginTop: 8 } },
              h("div", { className: "concerto-group-label", style: { marginBottom: 4 } }, "\u5FC5\u9700\u89C6\u56FE\u8981\u6C42"),
              h(
                "div",
                { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
                taskReqViews.map((rv) => h("span", {
                  key: `${rv.type}:${rv.id}`,
                  className: "concerto-req-view-pill",
                  "data-missing": rv.missing && rv.requiredForAcceptance ? "true" : void 0,
                  "data-suggested": rv.missing && !rv.requiredForAcceptance ? "true" : void 0
                }, `${rv.type}:${rv.id} \xB7 ${rv.missing ? rv.requiredForAcceptance ? "\u9A8C\u6536\u5FC5\u9700\xB7\u7F3A\u5931" : "\u5EFA\u8BAE\xB7\u672A\u63D0\u4EA4" : "\u5DF2\u5C31\u7EEA"}`))
              )
            )
          ),
          h(
            "div",
            { className: "concerto-acc-box" },
            h(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } },
              h("strong", { style: { fontSize: "var(--cc-fs-meta)" } }, "\u6700\u8FD1\u6D3B\u52A8 \xB7 " + taskEvents.length),
              task.memberId && h("button", {
                type: "button",
                className: "concerto-link",
                onClick: () => openMemberDrawer(task.memberId, "messages")
              }, "\u67E5\u770B " + task.memberId + " \u8BE6\u60C5 \u203A")
            ),
            taskEvents.length === 0 ? h("div", { style: { fontSize: "var(--cc-fs-caption)", color: "var(--cc-text-muted)" } }, "\u6682\u65E0\u4EFB\u52A1\u6D3B\u52A8\u4E8B\u4EF6\u3002") : h(
              "ul",
              { style: { margin: 0, paddingLeft: 16, fontSize: "var(--cc-fs-caption)" } },
              taskEvents.slice(-5).reverse().map((ev) => {
                let extra = ev.payload?.note ? " \xB7 " + ev.payload.note : "";
                if (ev.type === "approval.requested") {
                  const seqTxt = ev.payload?.sequenceIndex ? `\u7B2C ${ev.payload.sequenceIndex} \u6B21` : "";
                  const rawDiff = ev.payload?.diffFromPrevious;
                  const diffJoined = Array.isArray(rawDiff) ? rawDiff.join(" \xB7 ") : rawDiff ? String(rawDiff) : "";
                  const diffTxt = diffJoined ? `\uFF08${diffJoined}\uFF09` : "";
                  const cmdTxt = ev.payload?.payload?.command || ev.payload?.command ? `: ${String(ev.payload?.payload?.command || ev.payload?.command).slice(0, 48)}` : "";
                  extra = [seqTxt, diffTxt, cmdTxt].filter(Boolean).join(" ");
                  if (extra) extra = " \xB7 " + extra;
                } else if (ev.type === "execution.dispatched" && ev.payload?.dispatchedBy?.kind) {
                  extra = ` \xB7 \u6765\u6E90\uFF1A${ev.payload.dispatchedBy.kind}${ev.payload.memberId ? " \u2192 " + ev.payload.memberId : ""}`;
                }
                return h(
                  "li",
                  { key: ev.eventId, style: { marginTop: 4 } },
                  new Date(ev.recordedAt).toLocaleTimeString() + " \xB7 " + (EVENT_LABEL[ev.type] || ev.type) + extra
                );
              })
            )
          )
        ),
        task.blockedReason && h("p", { role: "status", style: { color: "var(--cc-state-blocked)", marginTop: 8 } }, "\u963B\u585E\u539F\u56E0\uFF1A" + task.blockedReason),
        task.result && h(
          "div",
          { style: { marginTop: 10 } },
          h("strong", { style: { fontSize: "var(--cc-fs-meta)" } }, "\u7ED3\u679C\u6458\u8981\uFF1A"),
          h(
            "div",
            { style: { marginTop: 4 } },
            h(ReferenceText, {
              text: task.result.summary,
              viewObjects,
              tasks,
              pinnedRefs: publicView.pinnedRefs,
              context: { taskId: task.taskId, authorId: task.memberId },
              sessionId,
              onJumpTask: jumpToTask,
              onOpenMember: (mid) => openMemberDrawer(mid, "messages"),
              onJumpObject: jumpToStageObject,
              onViewAllArtifacts: () => changeTab("artifacts"),
              isLight
            })
          ),
          Array.isArray(task.result.artifactRefs) && (() => {
            const fileRefs = task.result.artifactRefs.filter((r) => typeof r === "string" && r.trim() && !/^(table|checklist|mindmap|diagram|board|html):|^event-|^view-/i.test(r.trim()));
            if (fileRefs.length === 0) return null;
            return h(
              "div",
              { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" } },
              h("span", { className: "concerto-group-label" }, "\u4EA4\u4ED8\u6587\u4EF6\u9884\u89C8\uFF1A"),
              fileRefs.map((ref) => h("button", {
                key: ref,
                type: "button",
                className: "concerto-chip",
                "data-concerto-file-preview": ref,
                onClick: () => openFilePreview(ref, task.taskId)
              }, `\u{1F4C4} ${ref}`))
            );
          })()
        ),
        task.review && h(
          "div",
          { style: { marginTop: 6, fontSize: "var(--cc-fs-meta)" } },
          h(
            "p",
            { style: { margin: 0 } },
            h("strong", null, "\u5BA1\u67E5\u7ED3\u8BBA\uFF1A"),
            label(task.review.verdict),
            task.review.reviewId ? ` (${task.review.reviewId})` : "",
            task.review.actor?.id ? ` \xB7 \u5BA1\u67E5\u8005 ${task.review.actor.id}` : "",
            task.review.reason ? " \xB7 " + task.review.reason : ""
          ),
          Array.isArray(task.review.pinnedObjectVersions) && task.review.pinnedObjectVersions.length > 0 && h(
            "div",
            { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" } },
            h("span", { className: "concerto-group-label" }, "\u56FA\u5B9A\u8BC1\u636E\u7248\u672C\uFF1A"),
            task.review.pinnedObjectVersions.map((pv) => h("button", {
              key: `pin-${pv.id}-v${pv.version}`,
              type: "button",
              className: "concerto-chip",
              "data-concerto-pinned-evidence": `${pv.id}@v${pv.version}`,
              title: `\u67E5\u770B\u5BA1\u67E5\u65F6\u523B\u56FA\u5B9A\u7684 ${pv.type}:${pv.id} v${pv.version}`,
              onClick: () => openArtifactVersion(pv.id, pv.version, `${pv.type}:${pv.id}@v${pv.version}`)
            }, `${pv.title || pv.id} `, h("span", { className: "concerto-id" }, `v${pv.version} (\u56FA\u5B9A)`), h(UiIcon, { name: "expand" })))
          )
        ),
        h(SharedAcceptanceChecklist, {
          key: task.taskId,
          task,
          taskObjects,
          canWrite: info.roleKind === "commander",
          disabled: !canAct,
          onSave: (input, onError) => command("/view-objects/acceptance-checklist", input, onError),
          onOpenVersion: openArtifactVersion
        }),
        h(TaskReviewFeedback, {
          key: `${task.taskId}:${task.result?.resultId ?? task.executionId ?? ""}`,
          task,
          taskObjects,
          executions,
          canWrite: info.roleKind === "commander",
          disabled: !canAct,
          onSave: (input, onError) => command("/tasks/review-feedback", input, onError),
          onOpenVersion: openArtifactVersion
        }),
        taskObjects.length > 0 && h(
          "div",
          { style: { marginTop: 10 } },
          h(
            "div",
            { className: "concerto-group-label", style: { marginBottom: 6 } },
            "\u5173\u8054\u4EA7\u7269\uFF08\u70B9\u51FB\u524D\u5F80\u6210\u679C\u9875\u7B7E\u67E5\u770B\u5F53\u524D\u7248\u672C\uFF09"
          ),
          h(
            "div",
            { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
            taskObjects.map((obj) => {
              const roleTag = obj.layer === "review" || obj.roleKind === "reviewer" ? "\u5BA1\u67E5" : "\u4EFB\u52A1";
              return h("button", {
                key: "pill-" + obj.id,
                type: "button",
                className: "concerto-chip",
                "data-concerto-object-id": obj.id,
                "data-concerto-object-version": obj.version,
                title: `${obj.type}:${obj.id} \xB7 \u4F5C\u8005 ${obj.authorId || "\u672A\u77E5"}`,
                onClick: () => jumpToStageObject(obj)
              }, `[${roleTag}] ${obj.title || obj.id} \xB7 ${obj.authorId || ""} `, h("span", { className: "concerto-id" }, `v${obj.version}`), " \u203A");
            })
          )
        )
      )
    );
  }
  function renderHeroStatus() {
    const connection = error ? compact ? "\u8FDE\u63A5\u4E2D\u65AD" : "\u8FDE\u63A5\u4E2D\u65AD \xB7 \u4FDD\u7559\u4E0A\u6B21\u5FEB\u7167" : "\u5B9E\u65F6\u540C\u6B65";
    return h("span", {
      className: "concerto-live-dot",
      "data-offline": error ? "true" : void 0,
      role: "status",
      title: "\u6700\u540E\u540C\u6B65\uFF1A" + new Date(snapshot.serverTime).toLocaleString()
    }, connection, dispatchPaused && " \xB7 \u6D3E\u53D1\u5DF2\u6682\u505C");
  }
  function renderPlanConfirmation() {
    if (!planGate?.planRef || snapshot.goalCompletion) return null;
    const { planRef, proposalId, status, commanderWake } = planGate;
    const label2 = `${planRef.title} v${planRef.version}`;
    const message = status === "pending" ? "\u7B49\u5F85\u786E\u8BA4\u5F00\u5DE5" : status === "stale" ? "\u8BA1\u5212\u5DF2\u66F4\u65B0\uFF0C\u7B49\u5F85\u6307\u6325\u8005\u63D0\u4EA4\u65B0\u7248\u672C" : commanderWake === "accepted" ? "\u5DF2\u786E\u8BA4\u5F00\u5DE5\uFF0C\u7EED\u63A5\u6D88\u606F\u5DF2\u63D0\u4EA4" : commanderWake === "manual" ? "\u5DF2\u786E\u8BA4\u5F00\u5DE5\uFF0C\u8BF7\u5728\u5BF9\u8BDD\u4E2D\u624B\u52A8\u7EE7\u7EED" : "\u5DF2\u786E\u8BA4\u5F00\u5DE5";
    return h(
      "section",
      { className: "concerto-feedback concerto-plan-confirmation", "data-state": status, "aria-label": "\u5F00\u5DE5\u8BA1\u5212" },
      h("span", { role: "status" }, h("strong", null, label2), " \xB7 ", message),
      h(
        "div",
        { className: "concerto-plan-actions" },
        h("button", {
          type: "button",
          className: "concerto-btn",
          onClick: () => openArtifactVersion(planRef.id, planRef.version, label2, "\u5F00\u5DE5\u8BA1\u5212")
        }, `\u67E5\u770B\u8BA1\u5212 v${planRef.version}`),
        status === "pending" && info.roleKind === "commander" && h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--primary",
          disabled: !canAct,
          onClick: () => command("/runs/approve-plan", { proposalId })
        }, `\u786E\u8BA4\u5F00\u5DE5 v${planRef.version}`),
        status === "approved" && openView && h("button", {
          type: "button",
          className: "concerto-btn",
          onClick: () => openView("chat")
        }, commanderWake === "accepted" ? "\u67E5\u770B\u6307\u6325\u8005\u5BF9\u8BDD" : "\u56DE\u5230\u5BF9\u8BDD\u7EE7\u7EED")
      )
    );
  }
  function renderHeroActionsMenu() {
    return h(
      "details",
      { className: "concerto-hero-actions-menu" },
      h("summary", { className: "concerto-btn concerto-btn--ghost concerto-btn--icon", "aria-label": "\u66F4\u591A\u56E2\u961F\u64CD\u4F5C", title: "\u66F4\u591A\u56E2\u961F\u64CD\u4F5C" }, "\u22EF"),
      h(
        "div",
        { className: "concerto-hero-menu-list" },
        h("span", { className: "concerto-tag concerto-id", title: "\u8BA1\u5212\u4FEE\u8BA2\u7248\u672C" }, `plan v${snapshot.planRevision}`),
        info.roleKind === "commander" && h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--ghost",
          disabled: !canAct,
          onClick: (event) => {
            const menu = event.currentTarget.closest("details");
            menu.open = false;
            menu.querySelector("summary").focus();
            command("/runs/halt", { paused: !dispatchPaused });
          }
        }, dispatchPaused ? "\u6062\u590D\u6D3E\u53D1" : "\u6682\u505C\u6D3E\u53D1"),
        info.roleKind === "commander" && h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--ghost",
          disabled: !canAct,
          onClick: (event) => {
            const menu = event.currentTarget.closest("details");
            menu.open = false;
            menu.querySelector("summary").focus();
            openRunLimits();
          }
        }, "\u6D3E\u53D1\u6B21\u6570\u9650\u5236"),
        h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--ghost",
          onClick: (event) => {
            event.currentTarget.closest("details")?.removeAttribute("open");
            refresh();
          }
        }, h(UiIcon, { name: "refresh" }), "\u5237\u65B0\u5FEB\u7167"),
        openView && h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--ghost",
          onClick: (event) => {
            event.currentTarget.closest("details")?.removeAttribute("open");
            openView("chat");
          }
        }, "\u67E5\u770B\u5BF9\u8BDD")
      )
    );
  }
  function renderPrimaryTabs(className = "") {
    return h(
      "div",
      { className: `concerto-tabbar ${className}`.trim() },
      h(TabList, { id: tabsId, label: "\u56E2\u961F\u5DE5\u4F5C\u533A\u5BFC\u822A", value: activeTab, onChange: changeTab, tabs: [
        { value: "overview", label: "\u6982\u89C8" },
        { value: "tasks", label: "\u4EFB\u52A1", count: tasks.length, attentionCount: taskAttentionCount },
        { value: "artifacts", label: "\u6210\u679C", count: viewObjects.length }
      ] })
    );
  }
  function renderAttentionControl() {
    if (actionableCount === 0) {
      return h("span", {
        className: "concerto-quiet",
        "data-has-pending": "false",
        "data-concerto-pending-badge": "true"
      }, h(UiIcon, { name: "check" }), " \u65E0\u5F85\u5904\u7406");
    }
    return h(AttentionPopover, {
      open: attentionOpen && actionableCount > 0,
      onClose: closeAttention,
      count: actionableCount,
      trigger: h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--attn concerto-num",
        "data-has-pending": "true",
        "data-concerto-pending-badge": "true",
        onClick: () => setAttentionOpen((open) => !open)
      }, `\u5F85\u5904\u7406 ${actionableCount}`, h("span", { className: "concerto-pending-unit" }, "\u9879"))
    }, h(AttentionContent, {
      attentionItems,
      blockingMissing,
      pending,
      unknownExecs,
      tasks,
      executions,
      canAct,
      command,
      jumpToTask,
      openMemberDrawer
    }));
  }
  function renderBentoGroup(items, keyPrefix) {
    const preserveSize = [];
    const sizes = items.map((item, idx) => {
      const obj = item.cardProps.object;
      const renderer = item.cardProps.rendererOverride || obj?.renderer || DEFAULT_RENDERER[obj?.type];
      const graph = renderer === "markmap" || renderer === "svg";
      const preferred = obj && graph ? preferredRendererSize(obj, renderer, { fontSize: hostTheme.fontSize }) : "";
      preserveSize[idx] = Boolean(preferred);
      return preferred || (graph ? "l" : item.effSize);
    });
    const spans = balanceBentoSpans(sizes, preserveSize);
    return h(
      "div",
      { className: "concerto-bento-grid" },
      items.map((item, idx) => h("div", {
        key: keyPrefix + ":" + item.key,
        className: "concerto-bento-item",
        "data-size": sizes[idx],
        style: { "--cc-span": String(spans[idx]) }
      }, h(StructuredObjectCard, {
        ...item.cardProps,
        sizeHint: sizes[idx],
        pinBusy: Boolean(pinningRef),
        isApprovedPlan: Boolean(planGate?.planRef?.id && item.cardProps.object?.id === planGate.planRef.id && planGate.status === "approved"),
        goalCompleted: snapshot.goalCompletion?.state === "completed"
      })))
    );
  }
  return h(
    "section",
    {
      ref: containerRef,
      onScroll: handleContainerScroll,
      onPointerDown: (event) => {
        if (event.target.closest(".concerto-hero-actions-menu")) return;
        event.currentTarget.querySelectorAll(".concerto-hero-actions-menu[open]").forEach((menu) => menu.removeAttribute("open"));
      },
      className: "concerto-surface concerto-team-view",
      "data-concerto-team-view": "true",
      "data-conversation-composer-overlay": "",
      "data-concerto-theme": effectiveTheme,
      style: hostTheme.cssVars,
      "aria-label": "Concerto \u56E2\u961F\u4E3B\u9875"
    },
    // ① 常驻顶部（sticky + scroll compact）
    h(
      "header",
      { className: "concerto-hero", "data-concerto-section": "header", "data-compact": compact ? "true" : void 0 },
      !compact && h(
        import_react20.default.Fragment,
        null,
        h(
          "div",
          { className: "concerto-hero-top" },
          h(
            "div",
            { className: "concerto-hero-heading" },
            h(
              "div",
              { className: "concerto-hero-title" },
              h("h2", { title: info.teamName }, info.teamName),
              renderHeroStatus()
            ),
            teamGoal && h("p", { className: "concerto-hero-goal", title: teamGoal }, teamGoal)
          ),
          h(
            "div",
            { className: "concerto-hero-actions" },
            renderAttentionControl(),
            renderHeroActionsMenu()
          )
        ),
        stats.total > 0 && h(
          "div",
          { className: "concerto-hero-status" },
          h(
            "div",
            { className: "concerto-progress-wrap" },
            h(
              "div",
              { className: "concerto-progress-bar", role: "progressbar", "aria-label": "\u56E2\u961F\u4EFB\u52A1\u603B\u4F53\u8FDB\u5EA6", "aria-valuemin": 0, "aria-valuemax": stats.total, "aria-valuenow": stats.done, "aria-valuetext": `\u5DF2\u5B8C\u6210 ${stats.done} / ${stats.total} \u9879` },
              stats.donePct > 0 && h("div", { className: "concerto-seg-done", style: { width: stats.donePct + "%" } }),
              stats.reviewPct > 0 && h("div", { className: "concerto-seg-review", style: { width: stats.reviewPct + "%" } }),
              stats.runPct > 0 && h("div", { className: "concerto-seg-run", style: { width: stats.runPct + "%" } }),
              stats.blockPct > 0 && h("div", { className: "concerto-seg-block", style: { width: stats.blockPct + "%" } })
            ),
            h(
              "span",
              { className: "concerto-progress-label concerto-num" },
              "\u5DF2\u5B8C\u6210 ",
              h("span", { className: "concerto-kpi-accent" }, `${stats.done}/${stats.total}`)
            )
          ),
          h(
            "ul",
            { className: "concerto-hero-legend", "aria-label": "\u4EFB\u52A1\u72B6\u6001\u56FE\u4F8B" },
            [
              ["done", "\u5B8C\u6210", stats.done],
              ["running", "\u8FDB\u884C\u4E2D", stats.run],
              ["review", "\u5F85\u9A8C\u6536", stats.review],
              ["blocked", "\u963B\u585E", stats.block],
              ["pending", "\u5F85\u6D3E\u53D1", stats.pending]
            ].filter(([, , count]) => count > 0).map(([status, text, count]) => h("li", {
              key: status,
              className: "concerto-legend-item",
              "data-status": status
            }, text, " ", h("b", null, String(count))))
          )
        ),
        // 实时演奏乐团舞台（指挥者居中 + 发光协作连线 + 左执行者 / 右审查者）
        (() => {
          const renderSprite = (member) => {
            const st2 = memberState(snapshot, member);
            const count = pending.filter((r) => r.memberId === member.id).length;
            const capInfo = capByMemberId.get(member.id);
            const capBadge = capInfo ? formatCapabilitySummary(capInfo).badge : "";
            const actLine = deriveMemberActivity(member, snapshot) || capInfo?.persona || capBadge;
            return h(MemberSprite, {
              key: member.id,
              member,
              state: st2,
              activityLine: actLine,
              count,
              selected: drawerState.memberId === member.id,
              onClick: () => openMemberDrawer(member.id, "messages")
            });
          };
          const cmdMember = members.find((m) => m.roleKind === "commander") || null;
          const workerMembers = members.filter((m) => m.roleKind === "worker");
          const reviewerMembers = members.filter((m) => m.roleKind === "reviewer");
          if (!cmdMember || workerMembers.length === 0 && reviewerMembers.length === 0) {
            return h(
              "div",
              { className: "concerto-roster-strip", "data-concerto-section": "roster", "aria-label": "\u4E50\u56E2\u6210\u5458" },
              members.map(renderSprite)
            );
          }
          const workerActive = workerMembers.some((m) => ["running", "waiting_input", "waiting_approval"].includes(memberState(snapshot, m)));
          const reviewerActive = reviewerMembers.some((m) => ["running", "review", "waiting_input", "waiting_approval"].includes(memberState(snapshot, m))) || tasks.some((t) => t.state === "review");
          return h(
            "div",
            { className: "concerto-live-stage", "data-concerto-section": "roster", "data-concerto-live-stage": "true", "aria-label": "\u4E50\u56E2\u5B9E\u65F6\u6F14\u594F\u821E\u53F0" },
            h("div", { className: "concerto-live-stage-row" }, renderSprite(cmdMember)),
            h(
              "svg",
              { className: "concerto-live-stage-svg", viewBox: "0 0 400 30", preserveAspectRatio: "none", "aria-hidden": true },
              workerMembers.length > 0 && h("path", {
                className: "concerto-stage-arc",
                "data-active": workerActive ? "true" : void 0,
                d: reviewerMembers.length > 0 ? "M 200 2 C 200 18, 100 12, 100 28" : "M 200 2 L 200 28"
              }),
              reviewerMembers.length > 0 && h("path", {
                className: "concerto-stage-arc",
                "data-active": reviewerActive ? "true" : void 0,
                d: workerMembers.length > 0 ? "M 200 2 C 200 18, 300 12, 300 28" : "M 200 2 L 200 28"
              })
            ),
            h(
              "div",
              { className: "concerto-live-stage-wings" },
              workerMembers.length > 0 && h("div", { className: "concerto-live-stage-wing" }, workerMembers.map(renderSprite)),
              reviewerMembers.length > 0 && h("div", { className: "concerto-live-stage-wing" }, reviewerMembers.map(renderSprite))
            )
          );
        })(),
        renderPrimaryTabs()
      ),
      compact && h(
        "div",
        { className: "concerto-hero-compact" },
        h(
          "div",
          { className: "concerto-hero-compact-title" },
          h("strong", { title: info.teamName }, info.teamName),
          renderHeroStatus()
        ),
        h(
          "div",
          { className: "concerto-hero-compact-actions" },
          renderPrimaryTabs("concerto-compact-tabbar"),
          renderAttentionControl(),
          renderHeroActionsMenu(),
          h(
            "div",
            { className: "concerto-compact-roster", "data-concerto-section": "roster", "aria-label": "\u4E50\u56E2\u6210\u5458" },
            members.map((member) => h("button", {
              key: member.id,
              type: "button",
              className: "concerto-compact-member",
              "aria-label": `\u67E5\u770B\u6210\u5458 ${member.id}`,
              "aria-pressed": drawerState.memberId === member.id,
              title: member.id,
              onClick: () => openMemberDrawer(member.id, "messages")
            }, h(MemberGlyph, { member, state: memberState(snapshot, member), size: 24 })))
          )
        )
      ),
      actionError && h("p", { role: "alert", className: "concerto-field-error" }, actionError),
      renderPlanConfirmation(),
      ["api", "external"].includes(snapshot?.metadata?.commander?.source) ? h(NonHostedCommanderBar, {
        sessionId,
        commander: snapshot.metadata.commander,
        disabled: !canAct,
        onSent: () => refresh()
      }) : !snapshot?.goalCompletion && h(LiveSuggestionBar, {
        sessionId,
        disabled: !canAct,
        onSent: () => refresh()
      }),
      pinningRef && h("p", { role: "status", className: "concerto-quiet" }, "\u6B63\u5728\u4FDD\u5B58\u7F6E\u9876\u2026"),
      pinFailure && h(
        "div",
        { role: "alert", className: "concerto-feedback" },
        h("span", null, pinFailure.message),
        h("button", { type: "button", className: "concerto-btn", onClick: () => handleTogglePin(pinFailure.object, pinFailure.desiredPinned) }, "\u91CD\u8BD5\u4FDD\u5B58")
      )
    ),
    // ② 概览页签
    activeTab === "overview" && h(
      "div",
      { ...tabPanelProps(tabsId, "overview"), className: "concerto-tab-content", "data-concerto-tabpanel": "overview" },
      tasks.filter((t) => t.raceGroup?.role === "parent").map((parentTask) => h(RaceCompareBoard, {
        key: parentTask.raceGroup.raceId,
        sessionId,
        parentTask,
        tasks,
        members,
        disabled: !canAct,
        onOpenFilePreview: openFilePreview,
        onPicked: () => refresh()
      })),
      stats.total > 0 && unreadyCaps.length > 0 && h(
        "div",
        { className: "concerto-attn-card", "data-concerto-capability-warning": "true" },
        h("strong", null, `\u6210\u5458\u6267\u884C\u80FD\u529B\u5C1A\u672A\u5C31\u7EEA\uFF08${unreadyCaps.length}\uFF09`),
        h(
          "div",
          { style: { fontSize: "var(--cc-fs-meta)", color: "var(--cc-text-secondary)" } },
          unreadyCaps.map((c) => `${c.memberId}: ${formatCapabilitySummary(c).summary}`).join("\uFF1B") + "\uFF08\u8BF7\u524D\u5F80\u8BBE\u7F6E \u2192 Concerto \u751F\u6210\u5E76\u91CD\u8F7D\u56E2\u961F\uFF09"
        )
      ),
      stats.total === 0 && !planGate?.planRef && h(
        "section",
        { "aria-label": "\u65B0\u56E2\u961F\u5F15\u5BFC", "data-concerto-section": "briefing" },
        h(
          "div",
          { className: "concerto-empty-guide" },
          h("div", { className: "concerto-section-title" }, h("h2", null, "\u4ECE\u7B2C\u4E00\u4E2A\u56E2\u961F\u76EE\u6807\u5F00\u59CB")),
          h("p", null, info.goal || "\u544A\u8BC9\u6307\u6325\u8005\u4F60\u8981\u5B8C\u6210\u4EC0\u4E48\uFF0C\u56E2\u961F\u4F1A\u62C6\u89E3\u4EFB\u52A1\u3001\u540C\u6B65\u8FDB\u5C55\u5E76\u63D0\u4EA4\u7ED3\u6784\u5316\u6210\u679C\u3002"),
          h(
            "p",
            { className: "concerto-empty-guide-readiness" },
            `${members.length} \u540D\u6210\u5458 \xB7 ${unreadyCaps.length === 0 ? "\u6267\u884C\u80FD\u529B\u5DF2\u5C31\u7EEA" : `${unreadyCaps.length} \u540D\u6210\u5458\u80FD\u529B\u5C1A\u672A\u5C31\u7EEA`}`
          ),
          h(
            "div",
            { className: "concerto-empty-guide-examples", "aria-label": "\u76EE\u6807\u793A\u4F8B" },
            ["\u62C6\u89E3\u4E00\u6B21\u7248\u672C\u5347\u7EA7\u5E76\u9A8C\u8BC1\u7ED3\u679C", "\u534F\u8C03\u6210\u5458\u5B8C\u6210\u63A5\u53E3\u5951\u7EA6\u4E0E\u6D4B\u8BD5", "\u6C47\u603B\u98CE\u9669\u3001\u8BC1\u636E\u548C\u4E0B\u4E00\u6B65\u8BA1\u5212"].map((example) => h("span", { key: example, className: "concerto-chip" }, example))
          ),
          openView && h("button", { type: "button", className: "concerto-btn concerto-btn--primary", onClick: () => openView("chat") }, "\u524D\u5F80\u5E95\u90E8\u8F93\u5165\u6846\u4E0B\u8FBE\u76EE\u6807")
        )
      ),
      stats.total > 0 && h(
        "section",
        { "aria-label": "\u6307\u6325\u8005\u7B80\u62A5", "data-concerto-section": "briefing" },
        h(
          "div",
          { className: "concerto-section-head" },
          h(
            "div",
            { className: "concerto-section-title" },
            h("h2", null, "\u6307\u6325\u8005\u7B80\u62A5"),
            publicView.updatedBy && h("span", { className: "concerto-tag" }, "\u7531 " + publicView.updatedBy + " \u7EF4\u62A4")
          )
        ),
        h(
          "div",
          { className: "concerto-briefing-grid", "data-has-issues": actionableCount > 0 ? "true" : "false" },
          h(
            "div",
            { className: "concerto-briefing-cell" },
            h(
              "div",
              { className: "concerto-group-label" },
              "\u5F53\u524D\u8FDB\u5C55",
              actionableCount === 0 && h("span", { className: "concerto-state-chip concerto-state-done" }, h(UiIcon, { name: "check", size: 12 }), "\u65E0\u963B\u585E")
            ),
            h(InlineTextWithRefs, { text: briefing.progress, onJumpObject: jumpToStageObject, viewObjects, onViewAllArtifacts: () => changeTab("artifacts") })
          ),
          actionableCount > 0 && h(
            "div",
            { className: "concerto-briefing-cell", "data-tone": "attention" },
            h("div", { className: "concerto-group-label" }, "\u5173\u952E\u95EE\u9898"),
            h(InlineTextWithRefs, { text: briefing.issues, onJumpObject: jumpToStageObject, viewObjects, onViewAllArtifacts: () => changeTab("artifacts") })
          ),
          h(
            "div",
            { className: "concerto-briefing-cell" },
            h("div", { className: "concerto-group-label" }, "\u4E0B\u4E00\u6B65"),
            h(InlineTextWithRefs, { text: briefing.nextStep, onJumpObject: jumpToStageObject, viewObjects, onViewAllArtifacts: () => changeTab("artifacts") })
          )
        ),
        briefing.extraText && h(
          "div",
          { style: { marginTop: "var(--cc-space-2)" } },
          h(ReferenceText, {
            text: briefing.extraText,
            viewObjects,
            tasks,
            pinnedRefs: publicView.pinnedRefs,
            skipPinnedIds: overviewShownKeys,
            sessionId,
            onJumpTask: jumpToTask,
            onOpenMember: (mid) => openMemberDrawer(mid, "messages"),
            onJumpObject: jumpToStageObject,
            onViewAllArtifacts: () => changeTab("artifacts"),
            isLight
          })
        )
      ),
      stats.total > 0 && h(
        "section",
        { "aria-label": "\u91CD\u70B9\u4EFB\u52A1", "data-concerto-section": "key-tasks" },
        h(
          "div",
          { className: "concerto-section-head" },
          h(
            "div",
            { className: "concerto-section-title" },
            h("h2", null, "\u91CD\u70B9\u4EFB\u52A1"),
            renderCountTag(tasks.length)
          ),
          tasks.length > 0 && h("button", {
            type: "button",
            className: "concerto-link",
            onClick: () => changeTab("tasks")
          }, "\u67E5\u770B\u5168\u90E8\u4EFB\u52A1 \u2192")
        ),
        keyTasks.length === 0 ? h(EmptyState2, { icon: "\u{1F9ED}", text: "\u6682\u65E0\u4EFB\u52A1\uFF0C\u53EF\u901A\u8FC7\u5E95\u90E8\u8F93\u5165\u6846\u5411\u6307\u6325\u8005\u4E0B\u8FBE\u76EE\u6807\u3002" }) : h(
          "div",
          { className: "concerto-key-tasks" },
          keyTasks.map((tk) => {
            const meta = STATE_META[tk.viewState] || STATE_META[tk.state] || STATE_META.pending;
            return h(
              "button",
              {
                key: tk.taskId,
                type: "button",
                className: "concerto-key-task-row",
                "data-concerto-key-task": tk.taskId,
                onClick: () => jumpToTask(tk.taskId)
              },
              h(
                "span",
                { className: "concerto-key-task-main" },
                tk.memberId ? h(MemberGlyph, { member: members.find((m) => m.id === tk.memberId) || { id: tk.memberId, roleKind: "worker" }, state: tk.viewState || tk.state, size: 22 }) : h("span", { className: "concerto-empty-avatar", "aria-hidden": "true" }),
                h("strong", null, tk.title),
                h("span", { className: "concerto-key-task-member" }, tk.memberId || "\u5F85\u5206\u914D")
              ),
              h(
                "span",
                { className: "concerto-key-task-side" },
                h(StateChip, { status: tk.viewState || tk.state, text: meta.label }),
                h("span", { className: "concerto-id" }, tk.taskId)
              )
            );
          })
        )
      ),
      // 精选产物预览（等高与最后一行平衡填满）
      (viewObjects.length > 0 || stageSections.length > 0 || userPinObjs.length > 0) && h(
        "section",
        { "aria-label": "\u7CBE\u9009\u4EA7\u7269\u9884\u89C8", "data-concerto-section": "stage" },
        h(
          "div",
          { className: "concerto-section-head" },
          h(
            "div",
            { className: "concerto-section-title" },
            h("h2", null, "\u7CBE\u9009\u4EA7\u7269\u9884\u89C8"),
            renderCountTag(viewObjects.length)
          ),
          viewObjects.length > 0 && h("button", {
            type: "button",
            className: "concerto-link",
            "data-concerto-view-all-artifacts": "true",
            onClick: () => changeTab("artifacts")
          }, hiddenArtifactsCount > 0 ? `\u67E5\u770B\u5168\u90E8 ${viewObjects.length} \u4EFD\u4EA7\u7269\uFF08\u53E6\u6709 ${hiddenArtifactsCount} \u4EFD\uFF09\u2192` : `\u5728\u6210\u679C\u9875\u7B5B\u9009\uFF08${viewObjects.length}\uFF09\u2192`)
        ),
        userPinObjs.length > 0 && h(
          "div",
          { className: "concerto-stage-group", "data-concerto-stage-group": "user-pinned" },
          h("div", { className: "concerto-group-label" }, "\u6211\u7F6E\u9876\u7684\u4EA7\u7269"),
          renderBentoGroup(userPinObjs.map(({ ref, resolved }, idx) => {
            const obj = resolved.ok ? resolved.object : null;
            const defaultRend = obj ? obj.renderer || DEFAULT_RENDERER[obj.type] : "html";
            const effSize = obj?.size || (defaultRend === "markmap" || ref.type === "board" ? "l" : "m");
            return {
              key: `${ref.type}:${ref.id}:${idx}`,
              effSize,
              cardProps: {
                object: obj,
                tasks,
                missingRef: obj ? null : ref,
                errorReason: resolved.ok ? "" : resolved.reason,
                sizeHint: effSize,
                sessionId,
                onJumpTask: jumpToTask,
                onOpenMember: (mid) => openMemberDrawer(mid, "messages"),
                highlighted: obj && highlightObjectId === obj.id,
                userPinned: true,
                onTogglePin: handleTogglePin,
                badgeLabel: "\u7528\u6237\u7F6E\u9876"
              }
            };
          }), "upin")
        ),
        stageSections.map((sec, sIdx) => {
          const visibleRefs = (sec.refs || []).filter((ref) => !userPinnedSet.has(`${ref.type}:${ref.id}`));
          if (visibleRefs.length === 0) return null;
          return h(
            "div",
            { key: "sec-" + sIdx, className: "concerto-stage-group" },
            (sec.title || sec.subtitle) && h(
              "div",
              { className: "concerto-group-label" },
              sec.title || "",
              sec.subtitle ? ` \xB7 ${sec.subtitle}` : ""
            ),
            renderBentoGroup(visibleRefs.map((ref, rIdx) => {
              const resolved = resolveViewObjectRef(viewObjects, ref, { pinnedRefs: publicView.pinnedRefs });
              const obj = resolved.ok ? resolved.object : null;
              const defaultRend = obj ? obj.renderer || DEFAULT_RENDERER[obj.type] : "html";
              const effSize = ref.size || obj?.size || (defaultRend === "markmap" || ref.type === "board" ? "l" : "m");
              return {
                key: `${ref.type}:${ref.id}:${rIdx}`,
                effSize,
                cardProps: {
                  object: obj,
                  tasks,
                  missingRef: obj ? null : ref,
                  errorReason: resolved.ok ? "" : resolved.reason,
                  ambiguousNote: resolved.ambiguous ? "\u540C\u540D\u5BF9\u8C61\u6309\u6307\u6325\u53F0\u7F6E\u9876\u4F18\u5148\u5C55\u793A" : "",
                  sizeHint: effSize,
                  sessionId,
                  onJumpTask: jumpToTask,
                  onOpenMember: (mid) => openMemberDrawer(mid, "messages"),
                  highlighted: obj && highlightObjectId === obj.id,
                  userPinned: false,
                  onTogglePin: handleTogglePin,
                  badgeLabel: "\u6307\u6325\u8005\u63A8\u8350"
                }
              };
            }), "sec-" + sIdx)
          );
        }),
        unpinnedFallbackObjs.length > 0 && h(
          "div",
          { className: "concerto-stage-group" },
          h("div", { className: "concerto-group-label" }, "\u6700\u8FD1\u4EA7\u7269"),
          renderBentoGroup(unpinnedFallbackObjs.map((obj) => ({
            key: obj.id,
            effSize: obj.size || (obj.type === "mindmap" || obj.type === "board" ? "l" : "m"),
            cardProps: {
              object: obj,
              tasks,
              sizeHint: obj.size || (obj.type === "mindmap" || obj.type === "board" ? "l" : "m"),
              sessionId,
              onJumpTask: jumpToTask,
              onOpenMember: (mid) => openMemberDrawer(mid, "messages"),
              highlighted: highlightObjectId === obj.id,
              userPinned: userPinnedSet.has(`${obj.type}:${obj.id}`),
              onTogglePin: handleTogglePin
            }
          })), "fb")
        )
      )
    ),
    // ③ 任务页签：固定看板，仅在看板下呈现用户展开的任务详情
    activeTab === "tasks" && h(
      "div",
      { ...tabPanelProps(tabsId, "tasks"), className: "concerto-tab-content", "data-concerto-tabpanel": "tasks" },
      jumpOrigin && h(
        "div",
        { className: "concerto-jump-banner", "data-concerto-nav-banner": "true" },
        h("span", null, `\u5DF2\u5B9A\u4F4D\u5230\u4EFB\u52A1 ${jumpOrigin.targetLabel || ""}`),
        h(
          "button",
          { type: "button", className: "concerto-btn concerto-btn--ghost", onClick: returnToJumpOrigin },
          jumpOrigin.memberId ? `\u2190 \u8FD4\u56DE ${jumpOrigin.memberId}` : "\u2190 \u8FD4\u56DE\u6982\u89C8"
        )
      ),
      h(
        "div",
        { className: "concerto-section-head", style: { marginBottom: 0 } },
        h("h2", { className: "concerto-sr-only" }, "\u4EFB\u52A1\u7BA1\u7406"),
        taskAttentionCount > 0 && h("button", {
          type: "button",
          className: "concerto-kanban-attention-summary",
          onClick: () => setAttentionOpen(true)
        }, `${taskAttentionCount} \u9879\u5F85\u5904\u7406${stats.block > 0 ? ` \xB7 ${stats.block} \u9879\u963B\u585E` : ""}`)
      ),
      tasks.length === 0 ? h(EmptyState2, { icon: "\u{1F9ED}", text: "\u6682\u65E0\u4EFB\u52A1\uFF0C\u53EF\u901A\u8FC7\u5E95\u90E8\u8F93\u5165\u6846\u5411\u6307\u6325\u8005\u63D0\u51FA\u76EE\u6807\u3002" }) : h(
        import_react20.default.Fragment,
        null,
        h(
          "div",
          {
            className: "concerto-task-workspace",
            "data-has-inspector": selectedTask && inspectorWide ? "true" : void 0
          },
          h(
            "section",
            { "aria-label": "\u56E2\u961F\u8FDB\u5EA6\u770B\u677F", "data-concerto-section": "kanban" },
            h(
              "nav",
              { className: "concerto-board-jump", "aria-label": "\u770B\u677F\u5217\u8DF3\u8F6C" },
              KANBAN_COLUMNS.map((col) => h("button", {
                key: col.id,
                type: "button",
                className: "concerto-board-jump-btn",
                "data-column": col.id,
                "aria-pressed": activeBoardColumn === col.id,
                onClick: () => {
                  setActiveBoardColumn(col.id);
                  boardColumnRefs.current.get(col.id)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
                }
              }, `${col.title} ${kanbanMap[col.id].length}`))
            ),
            h(
              "div",
              {
                ref: boardScrollRef,
                className: "concerto-board-cols",
                style: !(selectedTask && inspectorWide) ? {
                  gridTemplateColumns: KANBAN_COLUMNS.map((col) => kanbanMap[col.id].length === 0 ? "minmax(104px, 120px)" : "minmax(0, 1fr)").join(" ")
                } : void 0,
                tabIndex: 0,
                role: "region",
                "aria-label": "\u4EFB\u52A1\u770B\u677F\uFF0C\u7A84\u7A97\u53E3\u53EF\u6A2A\u5411\u6EDA\u52A8"
              },
              KANBAN_COLUMNS.map((col) => {
                const list = kanbanMap[col.id];
                return h(
                  "section",
                  {
                    key: col.id,
                    ref: (element) => {
                      if (element) boardColumnRefs.current.set(col.id, element);
                      else boardColumnRefs.current.delete(col.id);
                    },
                    className: "concerto-board-col",
                    "data-concerto-column": col.id,
                    "data-empty": list.length === 0 ? "true" : void 0
                  },
                  h(
                    "div",
                    { className: "concerto-board-col-head", "data-state": col.id },
                    h("h3", null, `${col.title} ${list.length}`)
                  ),
                  list.length === 0 && h("p", { className: "concerto-board-empty" }, "\u6682\u65E0\u4EFB\u52A1"),
                  list.length > 0 && h("ol", { className: "concerto-board-card-list", "aria-label": `${col.title}\uFF0C${list.length} \u9879` }, list.map((task) => {
                    const blocked = task.viewState === "blocked" || task.viewState === "failed" || task.state === "failed" || Boolean(task.blockedReason);
                    const unknown = task.viewState === "unknown";
                    const latestProgress = task.progress?.at(-1);
                    const line = task.blockedReason || latestProgress?.note || task.objective || "";
                    const timeLabel = relativeTimeLabel(latestProgress?.at, snapshot.serverTime);
                    const sourceLabel = latestProgress?.memberId && latestProgress.memberId !== task.memberId ? latestProgress.memberId : "";
                    const progressContext = [sourceLabel, timeLabel].filter(Boolean).join(" \xB7 ");
                    const member = members.find((m) => m.id === task.memberId);
                    const needsAttention = attentionItems.some((item) => item.taskId === task.taskId) || blocked || unknown;
                    const meta = STATE_META[task.viewState] || STATE_META[task.state] || STATE_META.pending;
                    return h("li", { key: task.taskId }, h(
                      "article",
                      {
                        className: "concerto-kcard",
                        "data-concerto-kanban-task": task.taskId,
                        "data-status": col.id,
                        "data-attention": needsAttention ? "true" : void 0,
                        "data-selected": selectedTaskId === task.taskId ? "true" : void 0,
                        "data-blocked": blocked ? "true" : void 0,
                        "data-unknown": unknown ? "true" : void 0
                      },
                      h(
                        "h4",
                        null,
                        h("button", {
                          ref: (el) => {
                            if (el) taskCardRefs.current.set(task.taskId, el);
                            else taskCardRefs.current.delete(task.taskId);
                          },
                          type: "button",
                          className: "concerto-kcard-title",
                          "aria-pressed": selectedTaskId === task.taskId,
                          onClick: () => jumpToTask(task.taskId)
                        }, task.title)
                      ),
                      line && col.id !== "done" && h("p", { className: "concerto-kcard-summary" }, line),
                      progressContext && col.id !== "done" && h("span", { className: "concerto-kcard-context" }, progressContext),
                      needsAttention && h(
                        "div",
                        { className: "concerto-kcard-action" },
                        h(StateChip, { status: task.viewState || task.state, text: meta.label }),
                        h("button", { type: "button", className: "concerto-link", onClick: () => jumpToTask(task.taskId) }, "\u53BB\u5904\u7406")
                      ),
                      task.dependsOn?.length > 0 && h(
                        "div",
                        { className: "concerto-kcard-deps", "aria-label": "\u524D\u7F6E\u4F9D\u8D56" },
                        task.dependsOn.map((depId) => {
                          const dependency = tasks.find((item) => item.taskId === depId);
                          const satisfied = dependency?.state === "completed";
                          return h("button", {
                            key: depId,
                            type: "button",
                            className: "concerto-dependency-chip concerto-id",
                            title: `\u524D\u7F6E\u4F9D\u8D56\uFF1A${depId}${dependency?.title ? ` \xB7 ${dependency.title}` : ""}`,
                            onClick: () => jumpToTask(depId)
                          }, h(UiIcon, { name: satisfied ? "check" : "attention", size: 12 }), depId);
                        })
                      ),
                      h(
                        "footer",
                        { className: "concerto-kcard-foot" },
                        h(
                          "span",
                          { className: "concerto-kcard-member" },
                          task.memberId ? h(MemberGlyph, {
                            member: member || { id: task.memberId, roleKind: "worker" },
                            state: task.viewState || task.state,
                            size: 20
                          }) : h("span", { className: "concerto-empty-avatar", "aria-hidden": "true" }),
                          h("span", null, member?.name || task.memberId || "\u5F85\u5206\u914D")
                        ),
                        h("span", { className: "concerto-id concerto-kcard-id" }, task.taskId)
                      )
                    ));
                  }))
                );
              })
            )
          ),
          selectedTask && inspectorWide && h("aside", {
            className: "concerto-task-inspector concerto-task-inspector--inline",
            "aria-label": `\u4EFB\u52A1\u8BE6\u60C5\uFF1A${selectedTask.title}`,
            "data-concerto-section": "tasks",
            onKeyDown: (event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closeTaskInspector();
              }
            }
          }, renderTaskDetailModule(selectedTask))
        ),
        selectedTask && !inspectorWide && h(TaskInspectorDialog, {
          key: selectedTask.taskId,
          title: selectedTask.title,
          onClose: closeTaskInspector
        }, renderTaskDetailModule(selectedTask, true))
      )
    ),
    // ④ 成果页签：筛选栏 + 必需视图清单（含建议补充）+ Bento 网格 + 返回入口
    activeTab === "artifacts" && h(
      "div",
      { ...tabPanelProps(tabsId, "artifacts"), className: "concerto-tab-content", "data-concerto-tabpanel": "artifacts" },
      jumpOrigin && !savedFilterBeforeJump && h(
        "div",
        { className: "concerto-jump-banner", "data-concerto-nav-banner": "true" },
        h("span", null, `\u5DF2\u5B9A\u4F4D\u5230\u4EA7\u7269 ${jumpOrigin.targetLabel || ""}`),
        h(
          "button",
          { type: "button", className: "concerto-btn concerto-btn--ghost", onClick: returnToJumpOrigin },
          jumpOrigin.memberId ? `\u2190 \u8FD4\u56DE ${jumpOrigin.memberId}` : "\u2190 \u8FD4\u56DE\u6982\u89C8"
        )
      ),
      h(
        "div",
        { className: "concerto-section-head", style: { marginBottom: 0 } },
        h(
          "div",
          { className: "concerto-section-title" },
          h("h2", null, "\u5168\u90E8\u7ED3\u6784\u5316\u4EA7\u7269"),
          h("span", { className: "concerto-tag concerto-num" }, `${filteredArtifacts.length} / ${viewObjects.length}`)
        ),
        info.roleKind === "commander" && h(ExcalidrawImport, {
          key: sessionId,
          sessionId,
          disabled: !canAct,
          viewObjects,
          refresh,
          onLocate: jumpToStageObject
        })
      ),
      requiredViews.length > 0 && h(
        "div",
        { className: "concerto-req-views", "data-concerto-required-views": "true" },
        suggestedMissing.length > 0 && h("div", { className: "concerto-group-label" }, `\u5FC5\u9700\u89C6\u56FE\u68C0\u67E5\uFF08${suggestedMissing.length} \u9879\u5EFA\u8BAE\u8865\u5145\u672A\u963B\u585E\uFF09`),
        h(
          "div",
          { className: "concerto-req-view-list" },
          requiredViews.map((rv) => h(
            "span",
            {
              key: `${rv.taskId || "team"}:${rv.type}:${rv.id}`,
              className: "concerto-req-view-pill",
              "data-missing": rv.missing && rv.requiredForAcceptance ? "true" : void 0,
              "data-suggested": rv.missing && !rv.requiredForAcceptance ? "true" : void 0
            },
            h("span", { className: "concerto-id" }, `${rv.type}:${rv.id}`),
            ` \xB7 ${rv.missing ? rv.requiredForAcceptance ? "\u9A8C\u6536\u5FC5\u9700\xB7\u7F3A\u5931" : "\u5EFA\u8BAE\u8865\u5145" : `v${rv.version || 1} \u5DF2\u5C31\u7EEA`}`
          ))
        )
      ),
      h(
        "div",
        { className: "concerto-filter-bar", "data-concerto-artifact-filters": "true" },
        h(
          "label",
          null,
          "\u4EFB\u52A1 ",
          h(
            "select",
            {
              "aria-label": "\u6309\u4EFB\u52A1\u7B5B\u9009\u4EA7\u7269",
              "data-filter": "taskId",
              "data-active": artifactFilters.taskId !== "all" ? "true" : void 0,
              value: artifactFilters.taskId,
              onChange: (e) => updateFilters({ taskId: e.target.value })
            },
            h("option", { value: "all" }, "\u5168\u90E8\u4EFB\u52A1"),
            tasks.map((t) => h("option", { key: t.taskId, value: t.taskId }, `${t.taskId} \xB7 ${t.title}`))
          )
        ),
        h(
          "label",
          null,
          "\u6210\u5458 ",
          h(
            "select",
            {
              "aria-label": "\u6309\u6210\u5458\u7B5B\u9009\u4EA7\u7269",
              "data-filter": "memberId",
              "data-active": artifactFilters.memberId !== "all" ? "true" : void 0,
              value: artifactFilters.memberId,
              onChange: (e) => updateFilters({ memberId: e.target.value })
            },
            h("option", { value: "all" }, "\u5168\u90E8\u6210\u5458"),
            members.map((m) => h("option", { key: m.id, value: m.id }, m.id))
          )
        ),
        h(
          "label",
          null,
          "\u7C7B\u578B ",
          h(
            "select",
            {
              "aria-label": "\u6309\u7C7B\u578B\u7B5B\u9009\u4EA7\u7269",
              "data-filter": "type",
              "data-active": artifactFilters.type !== "all" ? "true" : void 0,
              value: artifactFilters.type,
              onChange: (e) => updateFilters({ type: e.target.value })
            },
            ARTIFACT_TYPE_OPTIONS.map((opt) => h("option", { key: opt.value, value: opt.value }, opt.label))
          )
        ),
        (artifactFilters.taskId !== "all" || artifactFilters.memberId !== "all" || artifactFilters.type !== "all") && h("button", {
          type: "button",
          className: "concerto-btn concerto-btn--ghost",
          onClick: () => updateFilters({ taskId: "all", memberId: "all", type: "all" })
        }, "\u91CD\u7F6E\u7B5B\u9009")
      ),
      savedFilterBeforeJump && h(
        "div",
        { className: "concerto-jump-banner", "data-concerto-jump-banner": "true" },
        h("span", null, `\u5DF2\u4E34\u65F6\u8C03\u6574\u7B5B\u9009\uFF0C\u786E\u4FDD\u5B9A\u4F4D\u76EE\u6807 ${savedFilterBeforeJump.targetLabel} \u53EF\u89C1`),
        h("button", {
          type: "button",
          className: "concerto-btn",
          "data-concerto-restore-filter": "true",
          onClick: restoreSavedFilters
        }, "\u8FD4\u56DE\u539F\u7B5B\u9009\u6761\u4EF6")
      ),
      filteredArtifacts.length === 0 ? h(EmptyState2, {
        icon: "\u{1F9E9}",
        text: viewObjects.length === 0 ? "\u6210\u5458\u6682\u672A\u53D1\u5E03\u7ED3\u6784\u5316\u4EA7\u7269\u3002" : "\u5F53\u524D\u7B5B\u9009\u6761\u4EF6\u4E0B\u6CA1\u6709\u5339\u914D\u7684\u7ED3\u6784\u5316\u4EA7\u7269\u3002",
        action: viewObjects.length > 0 && h("button", { type: "button", className: "concerto-link", onClick: () => updateFilters({ taskId: "all", memberId: "all", type: "all" }) }, "\u67E5\u770B\u5168\u90E8\u4EA7\u7269 \u2192")
      }) : renderBentoGroup(filteredArtifacts.map((obj) => {
        const effSize = obj.size || (obj.type === "mindmap" || obj.type === "board" ? "l" : "m");
        const isCmdPinned = (publicView.pinnedRefs || []).some((p) => p.type === obj.type && p.id === obj.id);
        const isUserPinned = userPinnedSet.has(`${obj.type}:${obj.id}`);
        return {
          key: obj.id,
          effSize,
          cardProps: {
            object: obj,
            tasks,
            sizeHint: effSize,
            sessionId,
            onJumpTask: jumpToTask,
            onOpenMember: (mid) => openMemberDrawer(mid, "messages"),
            highlighted: highlightObjectId === obj.id,
            userPinned: isUserPinned,
            onTogglePin: handleTogglePin,
            badgeLabel: isUserPinned ? "\u7528\u6237\u7F6E\u9876" : isCmdPinned ? "\u6307\u6325\u8005\u63A8\u8350" : ""
          }
        };
      }), "art")
    ),
    pinnedPreview && h(
      CanvasModal,
      {
        title: `${pinnedPreview.label}\u5FEB\u7167 \xB7 ${pinnedPreview.requestedRef}`,
        onClose: () => setPinnedPreview(null)
      },
      pinnedPreview.loading ? h("p", { style: styles.muted }, "\u6B63\u5728\u8BFB\u53D6\u56FA\u5B9A\u7248\u672C\u5FEB\u7167\u2026") : pinnedPreview.error ? h("p", { role: "alert", style: styles.error }, pinnedPreview.error) : h(StructuredObjectCard, {
        object: pinnedPreview.object,
        tasks,
        sessionId,
        badgeLabel: `${pinnedPreview.label} v${pinnedPreview.object?.version ?? ""}\uFF08\u5F53\u524D\u6700\u65B0 v${pinnedPreview.object?.latestVersion ?? ""}\uFF09`
      })
    ),
    filePreview && h(
      InspectorDialog,
      { title: `\u6587\u4EF6\u9884\u89C8 \xB7 ${filePreview.relativePath}`, onClose: () => setFilePreview(null) },
      h(
        "div",
        { className: "concerto-drawer-body", style: { display: "flex", flexDirection: "column", gap: 10 } },
        h(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" } },
          h("code", { style: { fontSize: "var(--cc-fs-code)", overflowWrap: "anywhere" } }, filePreview.path),
          h(
            "div",
            { style: { display: "flex", gap: 6 } },
            h("button", {
              type: "button",
              className: "concerto-btn",
              onClick: () => {
                try {
                  navigator.clipboard?.writeText?.(filePreview.path);
                } catch {
                }
              }
            }, "\u590D\u5236\u8DEF\u5F84"),
            h("button", { type: "button", className: "concerto-btn concerto-btn--ghost", onClick: () => setFilePreview(null) }, "\u5173\u95ED")
          )
        ),
        filePreview.loading && h("p", { className: "concerto-quiet" }, "\u8BFB\u53D6\u6587\u4EF6\u4E2D\u2026"),
        filePreview.error && h("p", { role: "alert", className: "concerto-field-error" }, filePreview.error),
        !filePreview.loading && !filePreview.error && h(
          import_react20.default.Fragment,
          null,
          h("div", { className: "concerto-quiet" }, `${filePreview.sizeBytes} \u5B57\u8282${filePreview.truncated ? "\uFF08\u4EC5\u663E\u793A\u524D 48 KiB\uFF09" : ""}`),
          h("pre", { style: { margin: 0, maxHeight: "60vh", overflow: "auto", padding: 12, borderRadius: "var(--cc-radius-ctrl)", background: "var(--cc-card-nested-bg)", fontFamily: "var(--cc-font-mono)", fontSize: "var(--cc-fs-code)", whiteSpace: "pre-wrap" } }, filePreview.content)
        )
      )
    ),
    runLimitsOpen && h(
      InspectorDialog,
      { title: "\u672C\u6B21\u8FD0\u884C\u7684\u6D3E\u53D1\u6B21\u6570\u9650\u5236", onClose: () => setRunLimitsOpen(false) },
      h(
        "form",
        { className: "concerto-drawer-body", method: "post", action: "/concerto/runs/dispatch-limits", onSubmit: saveRunLimits },
        h("h2", { className: "concerto-dialog-title" }, "\u672C\u6B21\u8FD0\u884C\u7684\u6D3E\u53D1\u6B21\u6570\u9650\u5236"),
        h(DispatchLimitFields, { limits: dispatchLimits, disabled: busy }),
        runLimitsError && h("p", { role: "alert", className: "concerto-field-error" }, runLimitsError),
        h(
          "div",
          { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
          h("button", { type: "submit", className: "concerto-btn concerto-btn--primary", disabled: !canAct }, "\u4FDD\u5B58\u4E0A\u9650"),
          h("button", { type: "button", className: "concerto-btn concerto-btn--ghost", onClick: () => setRunLimitsOpen(false) }, "\u5173\u95ED")
        )
      )
    ),
    // 右侧滑出成员详情抽屉（按 memberId key 挂载以保证切换成员重置焦点）
    drawerMember && h(MemberDrawer, {
      key: drawerMember.id,
      member: drawerMember,
      state: memberState(snapshot, drawerMember),
      sessionId,
      snapshot,
      initialTab: drawerState.tab,
      canManageDuties: info.roleKind === "commander",
      onClose: closeMemberDrawer,
      onJumpTask: jumpToTask,
      onOpenMember: (mid) => openMemberDrawer(mid, "messages"),
      onJumpObject: jumpToStageObject,
      returnTaskId: inspectorStack.at(-1)?.id || "",
      onBack: goInspectorBack,
      isLight
    })
  );
}
function NonHostedCommanderBar({ sessionId, commander, disabled = false, onSent }) {
  const [text, setText] = import_react20.default.useState("");
  const [sending, setSending] = import_react20.default.useState(false);
  const [reply, setReply] = import_react20.default.useState("");
  const [err, setErr] = import_react20.default.useState("");
  const labelText = commander?.source === "api" ? `\u81EA\u5B9A\u4E49 API \u6307\u6325\u8005\uFF08${commander.model || "API"}\uFF09` : `\u5916\u90E8 Agent \u6307\u6325\u8005\uFF08${commander?.connector || "external"}\uFF09`;
  async function onSubmit(event) {
    event?.preventDefault?.();
    if (!text.trim() || sending || disabled) return;
    setSending(true);
    setErr("");
    setReply("");
    try {
      const res = await request("/commander/prompt", {
        method: "POST",
        body: JSON.stringify({ sessionId, prompt: text.trim() })
      });
      setText("");
      if (res?.text) setReply(res.text);
      onSent?.();
    } catch (error) {
      setErr(error.message || "\u53D1\u9001\u5931\u8D25");
    } finally {
      setSending(false);
    }
  }
  return h(
    "form",
    {
      className: "concerto-attn-card",
      style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 6 },
      "data-concerto-nonhosted-commander-bar": "true",
      onSubmit
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
      h("strong", { style: { fontSize: "var(--cc-fs-meta)" } }, labelText),
      sending && h("span", { className: "concerto-quiet" }, "\u6307\u6325\u8005\u6267\u884C\u4E2D\u2026")
    ),
    h(
      "div",
      { style: { display: "flex", gap: 8 } },
      h("input", {
        className: "concerto-input",
        style: { flex: 1 },
        disabled: disabled || sending,
        value: text,
        placeholder: "\u76F4\u63A5\u5411\u5916\u90E8/API \u6307\u6325\u8005\u4E0B\u8FBE\u4EFB\u52A1\u6216\u8FFD\u95EE\u2026",
        onChange: (e) => setText(e.target.value)
      }),
      h("button", {
        type: "submit",
        className: "concerto-btn concerto-btn--primary",
        disabled: disabled || sending || !text.trim()
      }, sending ? "\u6267\u884C\u4E2D\u2026" : "\u53D1\u9001\u6307\u4EE4")
    ),
    err && h("div", { role: "alert", className: "concerto-field-error" }, err),
    reply && h("div", { style: { fontSize: "var(--cc-fs-meta)", whiteSpace: "pre-wrap", color: "var(--cc-text-secondary)" } }, reply)
  );
}
function LiveSuggestionBar({ sessionId, disabled = false, onSent }) {
  const [text, setText] = import_react20.default.useState("");
  const [sending, setSending] = import_react20.default.useState(false);
  const [notice, setNotice] = import_react20.default.useState("");
  const [err, setErr] = import_react20.default.useState("");
  async function onSubmit(event) {
    event?.preventDefault?.();
    if (!text.trim() || sending || disabled) return;
    setSending(true);
    setErr("");
    setNotice("");
    try {
      await request("/runs/suggest", {
        method: "POST",
        body: JSON.stringify({ sessionId, text: text.trim(), commandId: `suggest-${crypto.randomUUID()}` })
      });
      setText("");
      setNotice("\u5DF2\u53D1\u9001\u7ED9\u6307\u6325\u8005\u961F\u5217");
      onSent?.();
    } catch (error) {
      setErr(error.message || "\u53D1\u9001\u5EFA\u8BAE\u5931\u8D25");
    } finally {
      setSending(false);
    }
  }
  return h(
    "form",
    {
      style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 4 },
      "data-concerto-live-suggestion-bar": "true",
      onSubmit
    },
    h(
      "div",
      { style: { display: "flex", gap: 8, alignItems: "center" } },
      h("input", {
        className: "concerto-input",
        style: { flex: 1 },
        disabled: disabled || sending,
        value: text,
        "aria-label": "\u7ED9\u8FD0\u884C\u4E2D\u7684\u6307\u6325\u8005\u63D0\u5EFA\u8BAE",
        placeholder: "\u56E2\u961F\u8FD0\u884C\u4E2D\u968F\u65F6\u63D2\u8BDD / \u7ED9\u6307\u6325\u8005\u8865\u5145\u5EFA\u8BAE\u2026",
        onChange: (e) => {
          setText(e.target.value);
          if (notice) setNotice("");
        }
      }),
      h("button", {
        type: "submit",
        className: "concerto-btn",
        disabled: disabled || sending || !text.trim()
      }, sending ? "\u53D1\u9001\u4E2D\u2026" : "\u63D0\u5EFA\u8BAE")
    ),
    err && h("div", { role: "alert", className: "concerto-field-error" }, err),
    notice && h("div", { role: "status", className: "concerto-quiet" }, notice)
  );
}
function WorktreeActionBar({ sessionId, taskId, worktree, disabled = false }) {
  const [busy, setBusy] = import_react20.default.useState("");
  const [diffResult, setDiffResult] = import_react20.default.useState(null);
  const [statusMsg, setStatusMsg] = import_react20.default.useState("");
  const [errMsg, setErrMsg] = import_react20.default.useState("");
  async function runAction(kind) {
    setBusy(kind);
    setErrMsg("");
    setStatusMsg("");
    try {
      const res = await request(`/worktree/${kind}`, {
        method: "POST",
        body: JSON.stringify({ sessionId, taskId })
      });
      if (kind === "diff") {
        setDiffResult(res);
      } else if (kind === "merge") {
        setStatusMsg(res.noop ? res.detail : `\u5DF2\u5408\u5E76\u5230\u4E3B\u5206\u652F\uFF08${String(res.mergedCommit || "").slice(0, 7)}\uFF09`);
      } else if (kind === "cleanup") {
        setDiffResult(null);
        setStatusMsg("\u4E34\u65F6 Worktree \u5DF2\u6E05\u7406");
      }
    } catch (error) {
      setErrMsg(error.message || "\u64CD\u4F5C\u5931\u8D25");
    } finally {
      setBusy("");
    }
  }
  return h(
    "div",
    { style: { fontSize: "var(--cc-fs-caption)", marginBottom: 8, display: "flex", flexDirection: "column", gap: 6, color: "var(--cc-text-secondary)" }, "data-concerto-worktree-actions": taskId },
    h(
      "div",
      { style: { overflowWrap: "anywhere" } },
      h("strong", null, "Git Worktree \u9694\u79BB\uFF1A"),
      h("code", null, `${worktree.branch || ""} @ ${String(worktree.baseCommit || "").slice(0, 7)}${worktree.headCommit && worktree.headCommit !== worktree.baseCommit ? `..${String(worktree.headCommit).slice(0, 7)}` : ""}`),
      worktree.repositoryRoot && `\uFF08\u6E90\u4ED3\u5E93\uFF1A${worktree.repositoryRoot}\uFF09`
    ),
    h(
      "div",
      { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
      h("button", { type: "button", className: "concerto-btn", disabled: disabled || Boolean(busy), onClick: () => runAction("diff") }, busy === "diff" ? "\u8BFB\u53D6\u4E2D\u2026" : "\u67E5\u770B Diff"),
      h("button", { type: "button", className: "concerto-btn concerto-btn--primary", disabled: disabled || Boolean(busy), onClick: () => runAction("merge") }, busy === "merge" ? "\u5408\u5E76\u4E2D\u2026" : "\u5408\u5E76\u5230\u4E3B\u5206\u652F"),
      h("button", { type: "button", className: "concerto-btn concerto-btn--danger", disabled: disabled || Boolean(busy), onClick: () => runAction("cleanup") }, busy === "cleanup" ? "\u6E05\u7406\u4E2D\u2026" : "\u6E05\u7406 Worktree")
    ),
    statusMsg && h("div", { role: "status", className: "concerto-quiet" }, statusMsg),
    errMsg && h("div", { role: "alert", className: "concerto-field-error" }, errMsg),
    diffResult && h(
      "details",
      { open: true, className: "concerto-set-fold" },
      h("summary", null, `Diff \u9884\u89C8${diffResult.untrackedFiles?.length ? `\uFF08\u542B ${diffResult.untrackedFiles.length} \u4E2A\u672A\u8DDF\u8E2A\u6587\u4EF6\uFF09` : ""}`),
      diffResult.stat && h("pre", { style: { margin: "4px 0", whiteSpace: "pre-wrap", fontFamily: "var(--cc-font-mono)", fontSize: "var(--cc-fs-code)" } }, diffResult.stat),
      h(
        "pre",
        { style: { margin: "4px 0", maxHeight: 240, overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "var(--cc-font-mono)", fontSize: "var(--cc-fs-code)", padding: 8, borderRadius: "var(--cc-radius-ctrl)", background: "var(--cc-card-nested-bg)" } },
        diffResult.diff || (diffResult.untrackedFiles?.length ? `\u672A\u8DDF\u8E2A\u6587\u4EF6\uFF1A
${diffResult.untrackedFiles.join("\n")}` : "\u65E0\u6539\u52A8")
      )
    )
  );
}
function RaceLauncherBar({ sessionId, taskId, workers = [], disabled = false, onStarted }) {
  const [open, setOpen] = import_react20.default.useState(false);
  const [memberA, setMemberA] = import_react20.default.useState(workers[0]?.id || "");
  const [memberB, setMemberB] = import_react20.default.useState(workers[1]?.id || workers[0]?.id || "");
  const [busy, setBusy] = import_react20.default.useState(false);
  const [err, setErr] = import_react20.default.useState("");
  async function onStart() {
    if (!memberA || !memberB || memberA === memberB) {
      setErr("\u8BF7\u9009\u62E9\u4E24\u4F4D\u4E0D\u540C\u7684\u6267\u884C\u8005\u8FDB\u884C\u8D5B\u9A6C");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await request("/tasks/race", {
        method: "POST",
        body: JSON.stringify({ sessionId, taskId, memberA, memberB, commandId: `race-${taskId}-${crypto.randomUUID()}` })
      });
      setOpen(false);
      onStarted?.();
    } catch (error) {
      setErr(error.message || "\u542F\u52A8\u8D5B\u9A6C\u5931\u8D25");
    } finally {
      setBusy(false);
    }
  }
  return h(
    "div",
    { className: "concerto-acc-box", style: { width: "100%" }, "data-concerto-race-launcher": taskId },
    !open ? h(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" } },
      h("span", { style: { fontSize: "var(--cc-fs-meta)" } }, "\u{1F3C1} \u60F3\u5BF9\u6BD4\u4E0D\u540C Agent \u7684\u89E3\u6CD5\uFF1F\u53EF\u4E34\u65F6\u53D1\u8D77\u4E00\u6B21\u53CC\u89E3\u8D5B\u9A6C\uFF08\u72EC\u7ACB Worktree \u5E76\u884C\uFF09\u3002"),
      h("button", { type: "button", className: "concerto-btn", disabled, onClick: () => setOpen(true) }, "\u542F\u52A8\u53CC\u89E3\u8D5B\u9A6C (A/B)")
    ) : h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8 } },
      h("strong", { style: { fontSize: "var(--cc-fs-meta)" } }, "\u{1F3C1} \u9009\u62E9\u4E24\u4F4D\u53C2\u8D5B\u6210\u5458\uFF08\u5404\u81EA\u72EC\u7ACB Worktree \u5E76\u884C\u6267\u884C\uFF09"),
      h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
        h(
          "label",
          { style: { display: "flex", alignItems: "center", gap: 4, fontSize: "var(--cc-fs-caption)" } },
          "\u65B9\u6848 A",
          h(
            "select",
            { className: "concerto-input", disabled: busy, value: memberA, onChange: (e) => setMemberA(e.target.value) },
            workers.map((w) => h("option", { key: w.id, value: w.id }, `${w.id}${w.connector ? ` (${w.connector})` : ""}`))
          )
        ),
        h("span", { className: "concerto-quiet" }, "VS"),
        h(
          "label",
          { style: { display: "flex", alignItems: "center", gap: 4, fontSize: "var(--cc-fs-caption)" } },
          "\u65B9\u6848 B",
          h(
            "select",
            { className: "concerto-input", disabled: busy, value: memberB, onChange: (e) => setMemberB(e.target.value) },
            workers.map((w) => h("option", { key: w.id, value: w.id }, `${w.id}${w.connector ? ` (${w.connector})` : ""}`))
          )
        ),
        h("button", { type: "button", className: "concerto-btn concerto-btn--primary", disabled: busy || disabled, onClick: onStart }, busy ? "\u542F\u52A8\u4E2D\u2026" : "\u5F00\u59CB\u8D5B\u9A6C"),
        h("button", { type: "button", className: "concerto-btn concerto-btn--ghost", disabled: busy, onClick: () => setOpen(false) }, "\u53D6\u6D88")
      ),
      err && h("div", { role: "alert", className: "concerto-field-error" }, err)
    )
  );
}
function RaceCompareBoard({ sessionId, parentTask, tasks = [], members = [], disabled = false, onOpenFilePreview, onPicked }) {
  const [busyId, setBusyId] = import_react20.default.useState("");
  const [mergeWinner, setMergeWinner] = import_react20.default.useState(false);
  const [err, setErr] = import_react20.default.useState("");
  const race = parentTask.raceGroup;
  const candidates = (race?.candidates ?? []).map((c) => ({
    ...c,
    task: tasks.find((t) => t.taskId === c.taskId) || null,
    member: members.find((m) => m.id === c.memberId) || { id: c.memberId, roleKind: "worker" }
  }));
  async function pick(winnerTaskId) {
    setBusyId(winnerTaskId);
    setErr("");
    try {
      await request("/tasks/race/pick", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          raceId: race.raceId,
          winnerTaskId,
          mergeWinner,
          commandId: `race-pick-${race.raceId}-${winnerTaskId}`
        })
      });
      onPicked?.();
    } catch (error) {
      setErr(error.message || "\u91C7\u7EB3\u65B9\u6848\u5931\u8D25");
    } finally {
      setBusyId("");
    }
  }
  return h(
    "section",
    { className: "concerto-attn-card", style: { marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }, "data-concerto-race-board": race.raceId },
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" } },
      h("strong", null, `\u{1F3C1} \u5F02\u6784\u53CC\u89E3\u8D5B\u9A6C \xB7 ${parentTask.title}`),
      h("span", { className: "concerto-chip" }, race.status === "resolved" ? `\u5DF2\u91C7\u7EB3\u80DC\u8005 ${race.winnerTaskId}` : "\u53CC\u65B9\u6848\u5E76\u884C\u5BF9\u6BD4\u4E2D")
    ),
    race.status !== "resolved" && h(
      "label",
      { className: "concerto-set-check" },
      h("input", { type: "checkbox", checked: mergeWinner, onChange: (e) => setMergeWinner(e.target.checked) }),
      h("span", null, "\u91C7\u7EB3\u65F6\u987A\u4FBF\u5C06\u80DC\u8005\u7684 Git Worktree \u5408\u5E76\u56DE\u4E3B\u5206\u652F\uFF08\u672A\u5165\u9009\u65B9\u6848\u7684\u4E34\u65F6\u76EE\u5F55\u4F1A\u81EA\u52A8\u6E05\u7406\uFF09")
    ),
    h(
      "div",
      { className: "concerto-race-grid" },
      candidates.map(({ label: lbl, task: ct2, member }) => {
        const isWinner = race.winnerTaskId === ct2?.taskId;
        const meta = STATE_META[ct2?.viewState || ct2?.state || "pending"] || STATE_META.pending;
        const fileRefs = Array.isArray(ct2?.result?.artifactRefs) ? ct2.result.artifactRefs.filter((r) => typeof r === "string" && !/^(table|checklist|mindmap|diagram|board|html):|^event-|^view-/i.test(r)) : [];
        return h(
          "div",
          { key: lbl, className: "concerto-race-col", "data-winner": isWinner ? "true" : void 0 },
          h(
            "div",
            { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 } },
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 6 } },
              h(MemberGlyph, { member, state: ct2?.state || "idle", size: 28 }),
              h("strong", { style: { fontSize: "var(--cc-fs-meta)" } }, `\u65B9\u6848 ${lbl} \xB7 ${member.id}`)
            ),
            h(StateChip, { status: ct2?.viewState || ct2?.state || "pending", text: isWinner ? "\u{1F3C6} \u5DF2\u91C7\u7EB3" : meta.label })
          ),
          ct2?.result?.summary ? h("p", { style: { margin: 0, fontSize: "var(--cc-fs-caption)", color: "var(--cc-text-secondary)", whiteSpace: "pre-wrap" } }, ct2.result.summary) : h("p", { style: { margin: 0, fontSize: "var(--cc-fs-caption)", color: "var(--cc-text-muted)" } }, "\u7B49\u5F85\u8BE5\u6210\u5458\u63D0\u4EA4\u7ED3\u679C\u2026"),
          fileRefs.length > 0 && h(
            "div",
            { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
            fileRefs.map((ref) => h("button", { key: ref, type: "button", className: "concerto-chip", onClick: () => onOpenFilePreview?.(ref, ct2.taskId) }, `\u{1F4C4} ${ref}`))
          ),
          ct2?.worktree && h(WorktreeActionBar, { sessionId, taskId: ct2.taskId, worktree: ct2.worktree, disabled }),
          race.status !== "resolved" && ct2 && h("button", {
            type: "button",
            className: "concerto-btn concerto-btn--primary",
            disabled: disabled || Boolean(busyId) || ct2.state === "cancelled",
            onClick: () => pick(ct2.taskId)
          }, busyId === ct2.taskId ? "\u91C7\u7EB3\u4E2D\u2026" : `\u{1F3C6} \u91C7\u7EB3\u65B9\u6848 ${lbl}`)
        );
      })
    ),
    err && h("div", { role: "alert", className: "concerto-field-error" }, err)
  );
}

// packages/dsh-concerto/src/client/components/ChatIntegration.js
var import_react21 = __toESM(require_react(), 1);
var import_react_dom3 = __toESM(require_react_dom(), 1);
var TOOL_LABELS = {
  get_team_status: "\u8BFB\u53D6\u56E2\u961F\u72B6\u6001",
  submit_decision: "\u63D0\u4EA4\u56E2\u961F\u51B3\u7B56",
  dispatch_task: "\u6D3E\u53D1\u4EFB\u52A1",
  dispatch_review: "\u6D3E\u53D1\u72EC\u7ACB\u5BA1\u67E5",
  list_skills: "\u67E5\u770B\u65B9\u6CD5\u7D22\u5F15",
  read_skill: "\u8BFB\u53D6\u65B9\u6CD5\u6B63\u6587",
  publish_project_skill: "\u53D1\u5E03\u9879\u76EE\u65B9\u6CD5",
  manage_member_duties: "\u7BA1\u7406\u6210\u5458\u804C\u8D23",
  read_project_skill: "\u8BFB\u53D6\u9879\u76EE\u65B9\u6CD5",
  get_task: "\u8BFB\u53D6\u4EFB\u52A1\u8BE6\u60C5",
  report_progress: "\u6C47\u62A5\u4EFB\u52A1\u8FDB\u5C55",
  submit_result: "\u63D0\u4EA4\u4EFB\u52A1\u4EA4\u4ED8",
  submit_review: "\u63D0\u4EA4\u9A8C\u6536\u7ED3\u8BBA",
  publish_view_object: "\u53D1\u5E03\u4EA7\u7269",
  patch_view_object: "\u5C40\u90E8\u66F4\u65B0\u4EA7\u7269",
  list_view_objects: "\u6D4F\u89C8\u4EA7\u7269\u5217\u8868",
  read_view_object: "\u6309\u9700\u8BFB\u53D6\u4EA7\u7269",
  update_team_view: "\u66F4\u65B0\u6307\u6325\u53F0\u7B80\u62A5"
};
function ChatPlanConfirmation({ snapshot, info, canAct, onApprove, sessionId, showTeamLink, onAfterJump }) {
  const planGate = snapshot?.planGate;
  if (!planGate?.planRef || snapshot?.goalCompletion) return null;
  const { planRef, proposalId, status, commanderWake } = planGate;
  if (status === "approved" && (snapshot.tasks?.length ?? 0) > 0) return null;
  const planLabel = `${planRef.title || planRef.id} v${planRef.version}`;
  const message = status === "pending" ? "\u7B49\u5F85\u786E\u8BA4\u5F00\u5DE5" : status === "stale" ? "\u8BA1\u5212\u5DF2\u66F4\u65B0\uFF0C\u7B49\u5F85\u6307\u6325\u8005\u63D0\u4EA4\u65B0\u7248\u672C" : commanderWake === "accepted" ? "\u5DF2\u786E\u8BA4\u5F00\u5DE5\uFF0C\u7EED\u63A5\u6D88\u606F\u5DF2\u63D0\u4EA4" : commanderWake === "manual" ? "\u5DF2\u786E\u8BA4\u5F00\u5DE5\uFF0C\u8BF7\u5728\u5BF9\u8BDD\u4E2D\u624B\u52A8\u7EE7\u7EED" : "\u5DF2\u786E\u8BA4\u5F00\u5DE5";
  return h(
    "section",
    {
      className: "concerto-feedback concerto-plan-confirmation",
      "data-state": status,
      "data-concerto-chat-plan-gate": status,
      "aria-label": "\u5F00\u5DE5\u8BA1\u5212"
    },
    h("span", { role: "status" }, h("strong", null, planLabel), " \xB7 ", message),
    h(
      "div",
      { className: "concerto-plan-actions" },
      status === "pending" && info?.roleKind === "commander" && h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--primary",
        disabled: !canAct,
        onClick: () => onApprove(proposalId)
      }, `\u786E\u8BA4\u5F00\u5DE5 v${planRef.version}`),
      showTeamLink && h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--ghost",
        onClick: () => {
          onAfterJump?.();
          selectHostTeamTab(sessionId, true);
        }
      }, "\u5728\u56E2\u961F\u9875\u67E5\u770B\u8BA1\u5212")
    )
  );
}
function ConcertoDock({ sessionId }) {
  useTeamCss();
  const hostTheme = useHostTheme();
  const { info, error, loaded, refresh } = useTeamSession(sessionId);
  const [teamTabAvailable, setTeamTabAvailable] = import_react21.default.useState(false);
  const snapshot = info?.snapshot;
  import_react21.default.useEffect(() => {
    if (!loaded || typeof requestAnimationFrame === "undefined") return;
    const frame = requestAnimationFrame(() => {
      syncHostTeamTabVisibility(Boolean(info));
      if (info) {
        selectHostTeamTab(sessionId, false);
        setTeamTabAvailable(Boolean(findTeamTab()));
      } else {
        setTeamTabAvailable(false);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [sessionId, loaded, Boolean(info)]);
  const [actionError, setActionError] = import_react21.default.useState("");
  const [busy, setBusy] = import_react21.default.useState(false);
  const [open, setOpen] = import_react21.default.useState(false);
  const [filter, setFilter] = import_react21.default.useState("");
  const [selectedMember, setSelectedMember] = import_react21.default.useState("");
  const button = import_react21.default.useRef(null);
  const lastCommand = import_react21.default.useRef(null);
  import_react21.default.useEffect(() => {
    setOpen(false);
    setFilter("");
    setSelectedMember("");
    setActionError("");
    lastCommand.current = null;
  }, [sessionId]);
  const close = import_react21.default.useCallback(() => {
    setOpen(false);
    button.current?.focus?.();
  }, []);
  import_react21.default.useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const escape = (event) => {
      if (event.key === "Escape" && !document.querySelector(".concerto-surface:modal")) close();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, close]);
  if (!info || !snapshot) return error ? h("div", { role: "status", style: styles.dock }, error) : null;
  const canAct = info.roleKind === "commander" && !busy && !error;
  async function command(path, input) {
    setBusy(true);
    setActionError("");
    const signature = JSON.stringify({ path, input, sessionId });
    if (lastCommand.current?.signature !== signature) lastCommand.current = { signature, id: crypto.randomUUID() };
    try {
      await request2(path, { method: "POST", body: JSON.stringify({ ...input, sessionId, commandId: lastCommand.current.id }) });
      lastCommand.current = null;
      refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const pending = pendingRequests(snapshot);
  const active = snapshot.executions.filter((e) => ["running", "waiting_input", "waiting_approval", "interrupting"].includes(e.state));
  const unknown = snapshot.executions.filter((e) => e.state === "unknown" && !e.quarantined);
  const members = roster(snapshot);
  const summary = active.length + " \u4E2A\u6267\u884C \xB7 " + pending.length + " \u9879\u5F85\u5904\u7406" + (snapshot.planGate?.status === "pending" && !snapshot.goalCompletion ? " \xB7 \u5F85\u786E\u8BA4\u8BA1\u5212" : "") + (unknown.length ? " \xB7 " + unknown.length + " \u9879\u72B6\u6001\u672A\u77E5" : "");
  const sprite = (member) => {
    const state = memberState(snapshot, member);
    return h(MemberSprite, {
      key: member.id,
      member,
      state,
      count: pending.filter((r) => r.memberId === member.id).length,
      selected: open && selectedMember === member.id,
      onClick: () => {
        setSelectedMember(member.id);
        setFilter("");
        setOpen(true);
      }
    });
  };
  const visibleTasks = snapshot.tasks.filter((t) => !selectedMember || t.memberId === selectedMember);
  const panel = open && h(
    "section",
    {
      className: "concerto-surface concerto-panel",
      "data-concerto-theme": hostTheme.colorScheme,
      style: hostTheme.cssVars,
      "aria-label": "Concerto \u56E2\u961F\u8FD0\u884C\u9762\u677F"
    },
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 } },
      h("strong", null, selectedMember ? info.teamName + " / " + selectedMember : info.teamName),
      h(
        "div",
        { style: { display: "flex", gap: 6 } },
        selectedMember && teamTabAvailable && h("button", {
          type: "button",
          className: "concerto-btn",
          onClick: () => {
            requestMemberDrawerOpen(sessionId, selectedMember, { tab: "messages" });
            close();
            selectHostTeamTab(sessionId, true);
          }
        }, "\u6253\u5F00\u6210\u5458\u62BD\u5C49"),
        h("button", { type: "button", className: "concerto-btn concerto-btn--ghost", onClick: close }, "\u5173\u95ED")
      )
    ),
    h("div", { style: styles.muted }, "\u6700\u540E\u540C\u6B65 " + new Date(snapshot.serverTime).toLocaleTimeString()),
    error && h("p", { role: "status" }, error + "\uFF1B\u4FDD\u7559\u6700\u540E\u4E00\u6B21\u6210\u529F\u5FEB\u7167"),
    actionError && h("p", { role: "alert" }, actionError),
    h(ChatPlanConfirmation, {
      snapshot,
      info,
      canAct,
      sessionId,
      showTeamLink: teamTabAvailable,
      onAfterJump: close,
      onApprove: (proposalId) => command("/runs/approve-plan", { proposalId })
    }),
    pending.length > 0 && h("h3", null, "\u9700\u8981\u5904\u7406"),
    pending.filter((r) => !selectedMember || r.memberId === selectedMember).map((item) => h(RequestCard, {
      key: item.requestId,
      item,
      disabled: !canAct,
      onAnswer: (it2, answer) => command("/requests/respond", { requestId: it2.requestId, answer })
    })),
    unknown.filter((e) => !selectedMember || e.memberId === selectedMember).map((execution) => h(AdjudicationCard, {
      key: execution.executionId,
      execution,
      disabled: !canAct,
      onSubmit: (input) => command("/executions/adjudicate", input)
    })),
    h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 } }, members.map(sprite)),
    selectedMember && h("button", { type: "button", className: "concerto-btn", style: { marginTop: 8 }, onClick: () => setSelectedMember("") }, "\u67E5\u770B\u6574\u4E2A\u56E2\u961F"),
    h("h3", null, "\u4EFB\u52A1"),
    visibleTasks.length === 0 && h("p", null, "\u6682\u65E0\u4EFB\u52A1"),
    visibleTasks.map((task) => h(
      "article",
      { key: task.taskId, style: cardStyle },
      h("strong", null, task.title),
      h("span", { style: { marginLeft: 8 } }, label(task.viewState)),
      h("div", { style: styles.muted }, task.taskId + " \xB7 " + (task.memberId || "\u5C1A\u672A\u5206\u914D") + " \xB7 \u7B2C " + task.attempt + " \u6B21\u6267\u884C"),
      task.state === "review" && active.some((e) => e.executionId === task.executionId) && h("p", null, "\u7ED3\u679C\u5DF2\u63D0\u4EA4\uFF0C\u539F\u751F\u6267\u884C\u5C1A\u672A\u7ED3\u675F\uFF1B\u786E\u8BA4\u7ED3\u675F\u540E\u624D\u80FD\u5BA1\u67E5\u3002"),
      task.blockedReason && h("p", null, task.blockedReason),
      task.executionId && h(
        "details",
        null,
        h("summary", { style: { cursor: "pointer" } }, "\u6267\u884C\u8017\u65F6\u4E0E\u9636\u6BB5"),
        h(
          "pre",
          { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: "var(--cc-fs-code)" } },
          JSON.stringify(snapshot.executions.find((e) => e.executionId === task.executionId)?.metrics ?? {}, null, 2)
        ),
        h("small", null, "\u6700\u8FD1\u72B6\u6001\u5199\u76D8\uFF1A" + (snapshot.lastPersistenceMs ?? "\u672A\u91C7\u96C6") + " ms")
      ),
      task.result && h(
        "details",
        null,
        h("summary", null, task.result.executionId === task.executionId ? "\u7ED3\u679C\u4E0E\u8BC1\u636E" : "\u4E0A\u6B21\u6267\u884C\u7684\u7ED3\u679C\u4E0E\u8BC1\u636E"),
        h("p", { style: { whiteSpace: "pre-wrap" } }, task.result.summary),
        (task.result.artifactRefs || []).map((ref) => h("pre", { key: ref, style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" } }, ref))
      ),
      task.retryCwd && h("p", { style: { ...styles.muted, overflowWrap: "anywhere" } }, "\u9694\u79BB\u5DE5\u4F5C\u76EE\u5F55\uFF1A" + task.retryCwd),
      task.state === "pending" && h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--primary",
        disabled: !canAct || active.length > 0 || unknown.length > 0,
        onClick: () => command("/tasks/dispatch", { taskId: task.taskId })
      }, "\u6D3E\u53D1\u4EFB\u52A1"),
      active.some((e) => e.executionId === task.executionId) && h("button", {
        type: "button",
        className: "concerto-btn concerto-btn--ghost",
        disabled: !canAct || !active.some((e) => e.executionId === task.executionId && !e.connectorId.startsWith("hosted:") && e.state !== "interrupting"),
        onClick: () => command("/tasks/cancel", { taskId: task.taskId, executionId: task.executionId })
      }, "\u8BF7\u6C42\u53D6\u6D88"),
      task.state === "review" && h(ReviewCard, {
        task,
        disabled: !canAct || !snapshot.executions.some((e) => e.executionId === task.executionId && ["finished", "stopped"].includes(e.state)),
        onReview: (tk, verdict, reason) => command("/tasks/review", {
          taskId: tk.taskId,
          executionId: tk.executionId,
          resultId: tk.result.resultId,
          verdict,
          reason
        })
      })
    )),
    h(
      "details",
      { style: { marginTop: 18 } },
      h("summary", { style: { cursor: "pointer" } }, "\u6700\u8FD1\u6D3B\u52A8 \xB7 " + snapshot.events.length),
      h(
        "label",
        null,
        "\u7B5B\u9009\u4EFB\u52A1 ",
        h(
          "select",
          { value: filter, onChange: (event) => setFilter(event.target.value), style: styles.input },
          h("option", { value: "" }, "\u5168\u90E8\u4EFB\u52A1"),
          snapshot.tasks.map((t) => h("option", { key: t.taskId, value: t.taskId }, t.taskId))
        )
      ),
      h(
        "ol",
        { style: { paddingLeft: 20 } },
        snapshot.events.filter((e) => (!filter || e.taskId === filter) && (!selectedMember || e.actor?.id === selectedMember || snapshot.executions.some((x) => x.executionId === e.executionId && x.memberId === selectedMember))).slice().reverse().map((event) => h(
          "li",
          { key: event.eventId, style: { marginTop: 8 } },
          h(
            "details",
            null,
            h("summary", null, new Date(event.recordedAt).toLocaleTimeString() + " \xB7 " + (event.actor?.id || "Concerto") + " \xB7 " + (EVENT_LABEL[event.type] || event.type) + (event.taskId ? " \xB7 " + event.taskId : "")),
            h("pre", { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 240, overflow: "auto" } }, JSON.stringify(event.payload, null, 2))
          )
        ))
      )
    )
  );
  const hasTeamViewOrTab = teamTabAvailable || typeof document !== "undefined" && (Boolean(document.querySelector("[data-concerto-team-view]")) || Boolean(findTeamTab()));
  if (hasTeamViewOrTab) return null;
  return h(
    import_react21.default.Fragment,
    null,
    h(
      "div",
      { className: "concerto-surface concerto-dock", "data-concerto-theme": hostTheme.colorScheme, style: hostTheme.cssVars },
      h("button", {
        ref: button,
        type: "button",
        className: "concerto-btn concerto-btn--primary",
        "aria-expanded": open,
        onClick: () => {
          setSelectedMember("");
          setOpen(!open);
        }
      }, info.teamName + " \xB7 \u56E2\u961F"),
      h("span", { role: "status", "aria-atomic": true }, error ? "\u8FDE\u63A5\u4E2D\u65AD \xB7 \u663E\u793A\u4E0A\u6B21\u72B6\u6001" : summary),
      h("button", { type: "button", className: "concerto-btn", onClick: refresh }, "\u5237\u65B0")
    ),
    panel && typeof document !== "undefined" && document.body ? (0, import_react_dom3.createPortal)(panel, document.body) : null
  );
}
var avatarFlows = typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : null;
function bindMessageAvatars(flow, binding) {
  if (!avatarFlows) return () => {
  };
  let manager = avatarFlows.get(flow);
  if (!manager) {
    let sync = function() {
      frame = 0;
      const byTurn = new Map([...entries].map((entry) => [String(entry.turn), entry]));
      const groups = new Map([...entries].map((entry) => [entry, []]));
      const turns = [...flow.querySelectorAll("[data-chat-turn]")].map((row) => Number(row.dataset.chatTurn));
      const latest = Math.max(0, ...turns);
      const rows = /* @__PURE__ */ new Set();
      for (const row of flow.querySelectorAll('[data-chat-flow-kind="assistant-step"]:not([data-chat-group-part="reasoning"])')) {
        const entry = byTurn.get(row.dataset.chatTurn);
        if (!entry?.memberId) continue;
        rows.add(row);
        let mount = mounts.get(row);
        if (!mount || !row.contains(mount)) {
          mount = document.createElement("div");
          mount.className = "concerto-message-avatar";
          row.appendChild(mount);
          mounts.set(row, mount);
        }
        row.setAttribute("data-concerto-member-row", entry.memberId);
        groups.get(entry).push(mount);
      }
      for (const [row, mount] of mounts) if (!rows.has(row)) remove(row, mount);
      for (const entry of entries) entry.notify({ mounts: groups.get(entry), latest: entry.turn === latest, error: "" });
    };
    const entries = /* @__PURE__ */ new Set();
    const mounts = /* @__PURE__ */ new Map();
    let frame = 0;
    const remove = (row, mount) => {
      mount.remove();
      row.removeAttribute("data-concerto-member-row");
      mounts.delete(row);
    };
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(sync);
    });
    observer.observe(flow, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-chat-turn", "data-chat-flow-kind", "data-chat-group-part"]
    });
    manager = {
      add(entry) {
        entries.add(entry);
        sync();
      },
      remove(entry) {
        entries.delete(entry);
        if (entries.size) sync();
        else {
          observer.disconnect();
          cancelAnimationFrame(frame);
          for (const [row, mount] of mounts) remove(row, mount);
          avatarFlows.delete(flow);
        }
      }
    };
    avatarFlows.set(flow, manager);
  }
  manager.add(binding);
  return () => manager.remove(binding);
}
function useMessageAvatars(anchor, turn, memberId, enabled) {
  const [placement, setPlacement] = import_react21.default.useState({ mounts: [], latest: false, error: "" });
  import_react21.default.useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const flow = anchor.current?.closest('[data-slot="conversation.chat.flow"]');
    if (!flow || !Number.isInteger(turn)) {
      setPlacement({ mounts: [], latest: true, error: "\u5BBF\u4E3B\u5934\u50CF\u6302\u8F7D\u70B9\u672A\u627E\u5230\uFF0C\u5F53\u524D\u4EC5\u663E\u793A\u5185\u5D4C\u5361\u7247\u3002" });
      return;
    }
    return bindMessageAvatars(flow, {
      turn,
      memberId,
      notify(next) {
        setPlacement((old) => old.latest === next.latest && old.error === next.error && old.mounts.length === next.mounts.length && old.mounts.every((node, i) => node === next.mounts[i]) ? old : next);
      }
    });
  }, [anchor, turn, memberId, enabled]);
  return placement;
}
function ConcertoTurnCard({ sessionId, turn }) {
  useTeamCss();
  const hostTheme = useHostTheme();
  const { info, error, refresh } = useTeamSession(sessionId);
  const anchor = import_react21.default.useRef(null);
  const card = import_react21.default.useRef(null);
  const [opened, setOpened] = import_react21.default.useState(false);
  const [selected, setSelected] = import_react21.default.useState("");
  const [busy, setBusy] = import_react21.default.useState(false);
  const [actionError, setActionError] = import_react21.default.useState("");
  const lastCommand = import_react21.default.useRef(null);
  const snapshot = info?.snapshot;
  import_react21.default.useEffect(() => {
    setOpened(false);
    setSelected("");
    setActionError("");
    lastCommand.current = null;
  }, [sessionId]);
  const members = snapshot ? roster(snapshot) : [];
  const speaker = members.find((member) => member.id === info?.memberId);
  const placement = useMessageAvatars(anchor, turn.turn, speaker?.id, Boolean(info));
  function reveal(memberId) {
    setSelected(memberId);
    setOpened(true);
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => {
        card.current?.scrollIntoView?.({ block: "nearest" });
        card.current?.focus?.({ preventScroll: true });
      });
    }
  }
  async function command(path, bodyInput) {
    setBusy(true);
    setActionError("");
    const input = { sessionId, ...bodyInput };
    const signature = JSON.stringify({ path, input });
    if (lastCommand.current?.signature !== signature) lastCommand.current = { signature, id: crypto.randomUUID() };
    try {
      await request2(path, { method: "POST", body: JSON.stringify({ ...input, commandId: lastCommand.current.id }) });
      lastCommand.current = null;
      refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const answer = (item, ans) => command("/requests/respond", { requestId: item.requestId, answer: ans });
  if (!info || !snapshot) return h("div", { ref: anchor, className: "concerto-turn-anchor" });
  const pending = pendingRequests(snapshot);
  const tasks = snapshot.tasks.filter((task) => !selected || task.memberId === selected);
  const events = snapshot.events.filter((event) => !selected || event.actor?.id === selected || snapshot.executions.some((e) => e.executionId === event.executionId && e.memberId === selected));
  const canAct = info.roleKind === "commander" && !busy && !error;
  const drawerTarget = selected || speaker?.id || "";
  return h(
    "div",
    { ref: anchor, className: "concerto-turn-anchor", "data-concerto-turn": turn.turn },
    speaker && placement.mounts.map((mount, index) => (0, import_react_dom3.createPortal)(
      h(
        "button",
        {
          type: "button",
          "data-state": error ? "unknown" : memberState(snapshot, speaker),
          "aria-label": speaker.id + " \xB7 " + (speaker.roleKind === "commander" ? "\u6307\u6325\u8005" : "\u6210\u5458") + "\uFF0C\u67E5\u770B\u5F53\u524D\u56E2\u961F\u72B6\u6001",
          onClick: () => reveal(speaker.id)
        },
        h(MemberGlyph, { member: speaker, state: error ? "unknown" : memberState(snapshot, speaker), size: 36 }),
        h("small", null, speaker.id)
      ),
      mount,
      String(index)
    )),
    (placement.latest || opened) && h(
      "section",
      {
        ref: card,
        tabIndex: -1,
        className: "concerto-surface concerto-turn-card",
        "data-concerto-theme": hostTheme.colorScheme,
        style: hostTheme.cssVars,
        "aria-label": "Concerto \u5BF9\u8BDD\u5185\u56E2\u961F\u52A8\u6001",
        "data-concerto-session-id": sessionId
      },
      h(
        "div",
        { className: "concerto-turn-heading" },
        h("strong", null, info.teamName + " \xB7 \u56E2\u961F\u52A8\u6001"),
        h("span", { className: "concerto-badge concerto-id" }, `v${snapshot.planRevision}`),
        h("small", null, "\u5F53\u524D\u72B6\u6001 \xB7 " + new Date(snapshot.serverTime).toLocaleTimeString()),
        drawerTarget && h("button", {
          type: "button",
          className: "concerto-btn",
          onClick: () => {
            requestMemberDrawerOpen(sessionId, drawerTarget, { tab: "messages" });
            selectHostTeamTab(sessionId, true);
          }
        }, "\u6253\u5F00 " + drawerTarget + " \u8BE6\u60C5"),
        h("button", { type: "button", className: "concerto-btn concerto-btn--ghost", onClick: refresh }, "\u540C\u6B65")
      ),
      error && h("p", { role: "status" }, "\u8FDE\u63A5\u4E2D\u65AD \xB7 \u663E\u793A\u4E0A\u6B21\u72B6\u6001"),
      placement.error && h("p", { role: "status" }, placement.error),
      !speaker && h("p", { role: "status" }, "\u5F53\u524D\u4F1A\u8BDD\u7684\u6210\u5458\u8EAB\u4EFD\u5C1A\u672A\u7ED1\u5B9A\uFF0C\u4FDD\u7559\u539F\u5934\u50CF\u3002"),
      actionError && h("p", { role: "alert" }, actionError),
      h("div", { className: "concerto-turn-members" }, members.map((member) => {
        const state = memberState(snapshot, member);
        const count = pending.filter((item) => item.memberId === member.id).length;
        return h(
          "button",
          {
            key: member.id,
            type: "button",
            className: "concerto-turn-member",
            "aria-pressed": selected === member.id,
            onClick: () => setSelected(selected === member.id ? "" : member.id)
          },
          h(MemberGlyph, { member, state }),
          h(
            "span",
            null,
            h("strong", null, member.id),
            h("small", null, label(state) + (count ? " \xB7 " + count + " \u9879\u5F85\u529E" : ""))
          )
        );
      })),
      selected && h("button", { type: "button", className: "concerto-btn", style: { marginTop: 10 }, onClick: () => setSelected("") }, "\u67E5\u770B\u5168\u90E8\u6210\u5458"),
      h(ChatPlanConfirmation, {
        snapshot,
        info,
        canAct,
        sessionId,
        showTeamLink: true,
        onApprove: (proposalId) => command("/runs/approve-plan", { proposalId })
      }),
      tasks.length === 0 && h("p", { style: styles.muted }, selected ? selected + " \u5F53\u524D\u6CA1\u6709\u5206\u914D\u7684\u4EFB\u52A1\u3002" : "\u6682\u65E0\u4EFB\u52A1\uFF0C\u56E2\u961F\u5DF2\u5C31\u7EEA\u3002"),
      tasks.slice(-4).map((task) => h(
        "article",
        { key: task.taskId, className: "concerto-turn-task" },
        h("strong", null, (task.memberId || "\u5F85\u5206\u914D") + " \xB7 " + task.title),
        h("small", { style: { ...styles.muted, marginLeft: 8 } }, label(task.viewState)),
        (task.blockedReason || task.progress?.at(-1)?.note) && h("p", null, task.blockedReason || task.progress.at(-1).note),
        task.result && h("details", null, h("summary", null, "\u67E5\u770B\u7ED3\u679C"), h("p", { style: { whiteSpace: "pre-wrap" } }, task.result.summary))
      )),
      pending.filter((item) => !selected || item.memberId === selected).map((item) => h(RequestCard, { key: item.requestId, item, disabled: !canAct, onAnswer: answer })),
      events.length > 0 && h(
        "details",
        { style: { marginTop: 12 } },
        h("summary", { style: { cursor: "pointer", color: "var(--cc-text-secondary)" } }, "\u6700\u8FD1\u6D3B\u52A8 \xB7 " + events.length),
        h(
          "ol",
          { className: "concerto-turn-events" },
          events.slice(-6).reverse().map((event) => h(
            "li",
            { key: event.eventId },
            new Date(event.recordedAt).toLocaleTimeString() + " \xB7 " + (event.actor?.id || "Concerto") + " \xB7 " + (EVENT_LABEL[event.type] || event.type) + (event.taskId ? " \xB7 " + event.taskId : "")
          ))
        )
      )
    )
  );
}
function summarizePayload(tool, payload) {
  const value = payload || {};
  if (tool === "get_team_status") return "planRevision " + (value.planRevision ?? "?") + " \xB7 \u4EFB\u52A1 " + (Array.isArray(value.tasks) ? value.tasks.length : 0);
  if (tool === "submit_decision") return (value.replayed ? "replayed" : "applied") + " \xB7 plan " + (value.planRevision ?? "?");
  if (tool === "get_task") return String(value.task?.taskId ?? "") + " \xB7 " + String(value.task?.state ?? "");
  if (tool === "dispatch_task") return String(value.taskId ?? "") + " \u2192 " + String(value.memberId || value.state || "running");
  if (tool === "submit_result" || tool === "submit_review") return String(value.taskId ?? "") + " \u2192 " + String(value.state ?? "");
  if (tool === "publish_view_object" || tool === "patch_view_object") return String(value.id ?? "") + " \xB7 v" + (value.version ?? "?");
  if (tool === "list_view_objects") return "\u5BF9\u8C61 " + (Array.isArray(value.objects) ? value.objects.length : 0);
  if (tool === "read_view_object") return String(value.id ?? "") + " \xB7 v" + (value.version ?? "?");
  return value.ok === false ? String(value.code ?? "error") : "ok";
}
function ConcertoToolCard({ callId, toolName, phase, block, inspect }) {
  useTeamCss();
  const hostTheme = useHostTheme();
  const text = phase === "result" ? (block.content || []).filter((part) => part.type === "text").map((part) => part.text).join("\n") : "";
  let payload = null;
  let parseError = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (err) {
      parseError = err.message;
    }
  }
  const failed = Boolean(block.isError || block.error || payload?.ok === false);
  const status = phase === "result" ? failed ? "\u672A\u6210\u529F" : "\u5DF2\u8FD4\u56DE" : phase === "preparing" ? "\u51C6\u5907\u4E2D" : "\u6267\u884C\u4E2D";
  const titleLabel = TOOL_LABELS[toolName] ? `${TOOL_LABELS[toolName]} \xB7 ${toolName}` : toolName;
  return h(
    "details",
    {
      className: "concerto-surface concerto-tool-card",
      "data-concerto-theme": hostTheme.colorScheme,
      style: { ...styles.inlineCard, ...hostTheme.cssVars || {} },
      "data-concerto-call-id": callId,
      "data-concerto-tool": toolName
    },
    h(
      "summary",
      { style: { cursor: "pointer", padding: 6 }, title: toolName },
      "Concerto \xB7 " + titleLabel + " \xB7 " + status,
      payload && h("span", { style: { marginLeft: 8 } }, summarizePayload(toolName, payload))
    ),
    h("div", { className: "concerto-id", style: styles.muted }, "\u8C03\u7528 " + callId),
    parseError && h("div", { role: "status" }, "\u7ED3\u6784\u5316\u7ED3\u679C\u65E0\u6CD5\u89E3\u6790\uFF0C\u663E\u793A\u539F\u6587"),
    h(
      "pre",
      { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 280, overflow: "auto" } },
      text || inspect?.text || JSON.stringify(block, null, 2)
    )
  );
}

// packages/dsh-concerto/src/client/index.js
function registerPluginLocale(ctx) {
  const dict = { zh: { nav: "Concerto" }, en: { nav: "Concerto" } };
  if (typeof ctx.effect === "function") {
    ctx.effect(() => ctx.locale?.register?.(NS, dict), "concerto: locale");
  } else {
    ctx.locale?.register?.(NS, dict);
  }
}
function injectSlot(ctx, spec, component) {
  if (ctx.slots && typeof ctx.slots.inject === "function") {
    ctx.slots.inject(spec.name, () => ctx.slots.register(spec, component));
  } else if (ctx.slots && typeof ctx.slots.register === "function") {
    ctx.slots.register(spec, component);
  }
}
var index_default = {
  inject: ["slots", "locale"],
  apply(ctx) {
    setHostContext(ctx);
    registerPluginLocale(ctx);
    const labelOf = (text) => ({ label: () => text, locale: NS });
    injectSlot(ctx, { name: "conversation.view", id: "concerto.team", order: 10, ...labelOf("\u56E2\u961F") }, ConcertoTeamView);
    injectSlot(ctx, { name: "settings.section", id: "concerto.section", order: 90, ...labelOf("Concerto") }, ConcertoPanel);
    injectSlot(ctx, { name: "conversation.composer.dock", id: "concerto.members", order: 50, label: "Concerto" }, ConcertoDock);
    injectSlot(ctx, { name: "conversation.chat.turnTail", id: "concerto.turn-team", order: 50 }, ConcertoTurnCard);
    for (const toolName of TEAM_TOOLS) {
      injectSlot(
        ctx,
        { name: "tool.call.toolview", id: "concerto.tool." + toolName, key: toolName },
        (props) => ConcertoToolCard({ toolName, ...props })
      );
    }
  }
};
    return module.exports && module.exports.default ? module.exports.default : module.exports;
  }
});
