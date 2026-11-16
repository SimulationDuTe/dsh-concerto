#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  compositeOver,
  contrastRatio,
  parseCssColor,
  relativeLuminance,
  resolveReadableSurfaceAndInk,
} from '../lib/domain/theme_contrast.mjs'

const SCENARIOS = [
  {
    name: '1. Solid Light (non-glass)',
    input: {
      isLight: true,
      isGlass: false,
      bgBase: '#ffffff',
      bgLayer1: '#f9fafb',
      bgLayer2: '#f5f7fa',
      bgOverlay: '#ffffff',
      textPrimary: '#0f1115',
      textSecondary: '#61666b',
      textTertiary: '#81858c',
      accent: '#4176e6',
    },
  },
  {
    name: '2. Solid Dark (non-glass)',
    input: {
      isLight: false,
      isGlass: false,
      bgBase: '#151517',
      bgLayer1: '#232324',
      bgLayer2: '#2c2c2e',
      bgOverlay: '#2c2c2e',
      textPrimary: '#f9fafb',
      textSecondary: '#cfd3d6',
      textTertiary: '#adb2b8',
      accent: '#7aaaff',
    },
  },
  {
    name: '3. Live Host Glass Dark + Cyan Accent + Dark Wallpaper',
    input: {
      isLight: false,
      isGlass: true,
      bgBase: 'transparent',
      bgLayer1: 'color(srgb 0.0509804 0.0823529 0.141176 / 0.268822)',
      bgLayer2: 'color(srgb 0.0509804 0.082353 0.141176 / 0.28558)',
      bgOverlay: 'color(srgb 0.0509804 0.0823529 0.141176 / 0.335854)',
      wallpaperUnderlay: 'rgb(19, 58, 88)',
      readabilityBase: '#0d1524',
      textPrimary: '#ffffff',
      textSecondary: '#fafafa',
      textTertiary: '#75e6f5',
      accent: '#67DCE7',
      accentInk: '#0f1115',
    },
  },
  {
    name: '4a. Extreme: Light Theme + Dark Wallpaper (Wallpaper Engine dark slate glass)',
    input: {
      isLight: true,
      isGlass: true,
      bgBase: 'transparent',
      bgLayer1: 'color(srgb 0.223529 0.247059 0.298039 / 0.24561)',
      bgLayer2: 'color(srgb 0.223529 0.247059 0.298039 / 0.2629)',
      bgOverlay: 'color(srgb 0.223529 0.247059 0.298039 / 0.31477)',
      wallpaperUnderlay: 'rgb(19, 58, 88)',
      readabilityBase: '#393f4c',
      textPrimary: '#ffffff',
      textSecondary: '#fafafa',
      textTertiary: '#75e6f5',
      hostTextPrimary: '#0f1115',
      hostTextSecondary: '#61666b',
      hostTextTertiary: '#81858c',
      accent: '#67DCE7',
      accentInk: '#0f1115',
    },
  },
  {
    name: '4b. Extreme: Light Theme + Dark Wallpaper (Light frosted tint + black ink guard)',
    input: {
      isLight: true,
      isGlass: true,
      bgBase: 'transparent',
      bgLayer1: 'rgba(249, 250, 251, 0.26)',
      bgLayer2: 'rgba(245, 247, 250, 0.30)',
      bgOverlay: 'rgba(255, 255, 255, 0.35)',
      wallpaperUnderlay: 'rgb(19, 58, 88)',
      textPrimary: '#0f1115',
      textSecondary: '#61666b',
      textTertiary: '#81858c',
      accent: '#4176e6',
    },
  },
  {
    name: '4c. Extreme: Light Theme + Dark Wallpaper (Host white-on-light collision guard)',
    input: {
      isLight: true,
      isGlass: false,
      bgBase: '#ffffff',
      bgLayer1: '#f9fafb',
      bgLayer2: '#f5f7fa',
      bgOverlay: '#ffffff',
      wallpaperUnderlay: 'rgb(19, 58, 88)',
      textPrimary: '#ffffff',
      textSecondary: '#fafafa',
      textTertiary: '#75e6f5',
      accent: '#67DCE7',
      accentInk: '#0f1115',
    },
  },
  {
    name: '5. Extreme: Dark Theme + Bright Light Wallpaper (glass opacity guard)',
    input: {
      isLight: false,
      isGlass: true,
      bgBase: 'transparent',
      bgLayer1: 'color(srgb 0.0509804 0.0823529 0.141176 / 0.268822)',
      bgLayer2: 'color(srgb 0.0509804 0.082353 0.141176 / 0.28558)',
      bgOverlay: 'color(srgb 0.0509804 0.0823529 0.141176 / 0.335854)',
      wallpaperUnderlay: 'rgb(245, 248, 255)',
      readabilityBase: '#0d1524',
      textPrimary: '#ffffff',
      textSecondary: '#cfd3d6',
      textTertiary: '#adb2b8',
      accent: '#67DCE7',
      accentInk: '#0f1115',
    },
  },
]

const results = []
for (const scenario of SCENARIOS) {
  const solved = resolveReadableSurfaceAndInk(scenario.input)
  const bg = parseCssColor(solved.compositedBg1)
  const borderAccentRatio = contrastRatio(solved.accentBorder, bg)
  const exportCr = contrastRatio(solved.exportTheme.textPrimary, solved.exportTheme.bgLayer1)
  const exportLum = relativeLuminance(solved.exportTheme.bgLayer1)

  assert.ok(solved.contrastMetrics.primaryRatio >= 4.5, `${scenario.name}: primary contrast ${solved.contrastMetrics.primaryRatio} < 4.5`)
  assert.ok(solved.contrastMetrics.secondaryRatio >= 4.5, `${scenario.name}: secondary contrast ${solved.contrastMetrics.secondaryRatio} < 4.5`)
  assert.ok(solved.contrastMetrics.tertiaryRatio >= 4.5, `${scenario.name}: tertiary contrast ${solved.contrastMetrics.tertiaryRatio} < 4.5`)
  assert.ok(solved.contrastMetrics.accentTextRatio >= 4.5, `${scenario.name}: accentText contrast ${solved.contrastMetrics.accentTextRatio} < 4.5`)
  assert.ok(solved.contrastMetrics.onAccentRatio >= 4.5, `${scenario.name}: onAccent contrast ${solved.contrastMetrics.onAccentRatio} < 4.5`)
  assert.ok(borderAccentRatio >= 3.0, `${scenario.name}: accentBorder graphic contrast ${borderAccentRatio.toFixed(2)} < 3.0`)
  assert.ok(exportCr >= 4.5, `${scenario.name}: export contrast ${exportCr.toFixed(2)} < 4.5`)
  if (scenario.input.isLight) {
    assert.ok(exportLum > 0.5, `${scenario.name}: Light theme export bg became dark (L=${exportLum.toFixed(3)})`)
  } else {
    assert.ok(exportLum < 0.35, `${scenario.name}: Dark theme export bg became light (L=${exportLum.toFixed(3)})`)
  }

  results.push({
    scenario: scenario.name,
    compositedBg1: solved.compositedBg1,
    primaryRatio: solved.contrastMetrics.primaryRatio,
    secondaryRatio: solved.contrastMetrics.secondaryRatio,
    tertiaryRatio: solved.contrastMetrics.tertiaryRatio,
    accentTextRatio: solved.contrastMetrics.accentTextRatio,
    onAccentRatio: solved.contrastMetrics.onAccentRatio,
    borderGraphicRatio: Number(borderAccentRatio.toFixed(2)),
    surfaceRescued: solved.contrastMetrics.surfaceRescued,
    textRescued: solved.contrastMetrics.textRescued,
    exportBg1: solved.exportTheme.bgLayer1,
    exportText: solved.exportTheme.textPrimary,
    exportRatio: Number(exportCr.toFixed(2)),
  })
}

console.log(JSON.stringify({ ok: true, minBodyAA: 4.5, minGraphicAA: 3.0, scenarios: results }, null, 2))
