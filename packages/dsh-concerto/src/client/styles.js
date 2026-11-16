import React from 'react'
import { HOST_FALLBACK_CSS_VARS } from './api.js'

const BASELINE_ROOT_CSS = `:where(:root){${Object.entries(HOST_FALLBACK_CSS_VARS).map(([k, v]) => `${k}:${v};`).join('')}}`

/**
 * Design tokens & host-aligned styles for Concerto surfaces.
 * Consumes DSH `--dsw-*` / `--dsh-*` / `--we-*` theme, material, elevation,
 * typography, radius, border, and focus-ring tokens with contrast guards.
 * Zero hardcoded color literals appear anywhere in stylesheet rules.
 */
export const TEAM_CSS = `
  ${BASELINE_ROOT_CSS}
  .concerto-surface {
    --cc-radius-card: var(--dsw-radius-md, var(--cc-fb-radius-md));
    --cc-radius-ctrl: var(--dsw-radius-sm, var(--cc-fb-radius-sm));
    --cc-radius-lg: var(--dsw-radius-lg, var(--cc-fb-radius-lg));
    --cc-radius-pill: var(--cc-fb-radius-pill);

    --cc-font-sans: var(--dsw-font-family, var(--dsh-font-family-text-default, system-ui, sans-serif));
    --cc-font-mono: var(--ds-font-family-code, var(--dsh-font-family-code-default, ui-monospace, monospace));
    --cc-font-size: var(--dsh-content-font-size, 1em);
    --cc-font-size-secondary: var(--dsh-content-font-size-secondary, 0.92em);

    /* Typography scale strictly relative to host content font size */
    --cc-fs-display: calc(var(--cc-font-size) * 1.25);
    --cc-fs-title: calc(var(--cc-font-size) * 1.07);
    --cc-fs-body: var(--cc-font-size);
    --cc-fs-meta: var(--cc-font-size-secondary);
    --cc-fs-caption: calc(var(--cc-font-size) * 0.85);
    --cc-fs-micro: calc(var(--cc-font-size) * 0.72);
    --cc-fs-code: var(--dsh-code-font-size, 0.85em);
    --cc-fs-terminal: var(--dsh-terminal-font-size, 0.92em);

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
    --cc-overlay-bg: var(--cc-contrast-overlay-bg, var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, var(--cc-fb-bg-layer-2)))));
    --cc-backdrop-blur: var(--dsw-mask-blur, none);

    --cc-border: var(--dsw-alias-border-l2, var(--cc-fb-border));
    --cc-border-subtle: var(--dsw-alias-border-l1, var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l2, var(--cc-fb-border-subtle))));
    --cc-border-strong: var(--dsw-alias-border-l3, var(--cc-fb-border-strong));
    --cc-shadow-soft: var(--dsw-elevation-soft, var(--dsw-shadow-lv1, var(--cc-fb-shadow-soft)));
    --cc-shadow-panel: var(--dsw-elevation-panel, var(--dsw-shadow-lv1, var(--cc-fb-shadow-panel)));
    --cc-shadow-prominent: var(--dsw-elevation-prominent, var(--dsw-shadow-lv3, var(--cc-fb-shadow-prominent)));

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
  .concerto-surface h3 { font-family: var(--cc-font-sans); font-size: var(--cc-fs-title); font-weight: 600; line-height: 1.4; color: var(--cc-text-primary); margin: 0; }
  .concerto-surface p { font: inherit; margin: var(--cc-space-1) 0; }
  .concerto-surface code, .concerto-surface pre { font-family: var(--cc-font-mono); font-size: var(--cc-fs-code); }
  .concerto-surface :where(button, textarea, select, input) { font-family: inherit; font-size: var(--cc-fs-meta); color: inherit; }
  .concerto-surface button:disabled { opacity: .45; cursor: not-allowed; }
  .concerto-surface button:focus-visible, .concerto-surface summary:focus-visible, .concerto-surface [tabindex]:focus-visible, .concerto-surface select:focus-visible {
    outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--cc-accent));
    outline-offset: 2px;
  }
  .concerto-num { font-variant-numeric: tabular-nums; }
  .concerto-kpi-accent { color: var(--cc-accent-text); font-weight: 700; font-variant-numeric: tabular-nums; }
  .concerto-id { font-family: var(--cc-font-mono); font-size: var(--cc-fs-caption); font-variant-numeric: tabular-nums; }
  .concerto-quiet { color: var(--cc-text-muted); font-size: var(--cc-fs-caption); font-weight: 500; }
  .concerto-group-label { font-size: var(--cc-fs-caption); font-weight: 600; color: var(--cc-text-muted); letter-spacing: 0.02em; }

  /* Interactive grammar: btn / tag / badge / chip / link */
  .concerto-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 28px; padding: 0 var(--cc-space-3);
    border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-ctrl);
    background: var(--cc-card-nested-bg); color: var(--cc-text-primary);
    font-size: var(--cc-fs-meta); font-weight: 500; cursor: pointer;
    transition: border-color .12s ease;
    white-space: nowrap;
  }
  .concerto-btn:hover:not(:disabled) { border-color: var(--cc-accent-border); background: var(--dsw-alias-interactive-bg-hover, var(--cc-accent-soft)); }
  .concerto-btn:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active, var(--cc-accent-hover)); }
  .concerto-btn--primary { border-color: var(--cc-accent-fill); background: var(--cc-accent-fill); color: var(--cc-on-accent); font-weight: 600; }
  .concerto-btn--primary:hover:not(:disabled) { filter: brightness(1.07); background: var(--cc-accent-fill); }
  .concerto-btn--attn { border-color: color-mix(in srgb, var(--cc-state-attention) 42%, transparent); background: var(--cc-state-attention-bg); color: var(--cc-state-attention); font-weight: 600; }
  .concerto-btn--attn:hover:not(:disabled) { background: color-mix(in srgb, var(--cc-state-attention) 24%, transparent); }
  .concerto-btn--ghost { border-color: transparent; background: transparent; color: var(--cc-text-secondary); }
  .concerto-btn--ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, var(--cc-accent-soft)); color: var(--cc-text-primary); }
  .concerto-btn--icon { width: 28px; min-width: 28px; padding: 0; }
  .concerto-btn--pin[aria-pressed="true"] { border-color: var(--cc-accent-border); background: var(--cc-accent-soft); color: var(--cc-accent-text); font-weight: 600; }
  .concerto-canvas-btns .concerto-btn:focus-visible,
  .concerto-stage-tools .concerto-btn:focus-visible { outline-width: 1px; outline-offset: 1px; }
  @media (pointer: coarse) {
    .concerto-btn { min-height: 36px; }
    .concerto-btn--icon { width: 36px; min-width: 36px; }
  }

  .concerto-tag, .concerto-chip, .concerto-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 1px 8px; border-radius: var(--cc-radius-pill); corner-shape: round;
    font-size: var(--cc-fs-caption); line-height: 1.45;
  }
  .concerto-tag { background: var(--cc-card-nested-bg); color: var(--cc-text-secondary); border: 0; font-weight: 500; }
  .concerto-badge { background: var(--cc-accent-soft); color: var(--cc-accent-text); border: 1px solid var(--cc-accent-border); font-weight: 600; }
  .concerto-chip {
    background: var(--cc-accent-soft);
    color: var(--cc-accent-text);
    border: 1px solid var(--cc-accent-border);
    cursor: pointer; font-weight: 500;
    transition: border-color .12s ease;
  }
  .concerto-chip:hover { border-color: var(--cc-accent); background: var(--cc-accent-hover); color: var(--cc-text-primary); }
  .concerto-link { border: 0; background: none; padding: 0; color: var(--cc-accent-text); font-size: var(--cc-fs-meta); font-weight: 500; cursor: pointer; }
  .concerto-link:hover { text-decoration: underline; }

  .concerto-panel {
    position: fixed;
    top: 72px;
    right: 20px;
    width: min(440px, calc(100vw - 32px));
    max-height: calc(100dvh - 320px);
    overflow: auto;
    z-index: 1000;
    padding: 18px;
    background: var(--cc-panel-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    border: 1px solid var(--cc-border-strong);
    border-radius: var(--cc-radius-lg);
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
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-card);
    box-shadow: var(--cc-shadow-soft);
    padding: 6px 10px;
  }

  .concerto-sprite {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    min-height: 40px;
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-ctrl);
    background: var(--cc-card-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    color: var(--cc-text-primary);
    cursor: pointer;
    text-align: left;
    flex: none;
    transition: border-color .14s ease;
  }
  .concerto-sprite:hover {
    border-color: var(--cc-accent);
    background: var(--dsw-alias-interactive-bg-hover, var(--cc-accent-soft));
  }
  .concerto-sprite[aria-pressed="true"] {
    border-color: var(--cc-accent);
    background: var(--cc-accent-soft);
  }
  .concerto-sprite[aria-pressed="true"] .concerto-sprite-meta strong { color: var(--cc-accent-text); }
  .concerto-sprite-meta { min-width: 0; max-width: 190px; }
  .concerto-sprite-meta strong { display: block; font-size: var(--cc-fs-meta); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
    color: var(--cc-text-primary);
    border: 1px solid var(--cc-border);
    border-radius: var(--cc-radius-card);
    font-family: var(--cc-font-sans);
    font-size: var(--cc-fs-caption);
    font-weight: 600;
    line-height: 1.3;
    cursor: pointer;
    box-shadow: var(--cc-shadow-soft);
  }
  .concerto-message-avatar button:hover {
    border-color: var(--cc-accent);
    background: var(--cc-accent-soft);
  }
  .concerto-message-avatar button[data-state="attention"] svg { animation: concerto-float 2.4s ease-in-out infinite; }
  .concerto-message-avatar small { font: inherit; max-width: 44px; overflow-wrap: anywhere; }

  .concerto-turn-anchor { display: contents; }
  .concerto-turn-card {
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-card);
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
    border-radius: var(--cc-radius-ctrl);
    background: var(--cc-card-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    box-shadow: var(--cc-shadow-soft);
    color: var(--cc-text-secondary);
  }
  .concerto-turn-heading { display: flex; gap: var(--cc-space-2); align-items: center; flex-wrap: wrap; }
  .concerto-turn-heading strong { flex: 1; }
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

  /* 团队主页（常驻粘顶 + 概览 / 任务 / 成果） */
  .concerto-team-view {
    height: 100%;
    overflow: auto;
    padding: var(--cc-space-4) var(--cc-space-5) 180px;
    border-radius: var(--cc-radius-card);
    background: var(--dsw-alias-bg-base, var(--cc-fb-bg-base));
    display: flex;
    flex-direction: column;
    gap: var(--cc-space-6);
  }
  .concerto-hero {
    position: sticky;
    top: 0;
    z-index: 5;
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-card);
    padding: var(--cc-space-3) var(--cc-space-4);
    background: var(--cc-overlay-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    box-shadow: var(--cc-shadow-panel);
    display: flex;
    flex-direction: column;
    gap: var(--cc-space-2);
    transition: padding .16s ease, gap .16s ease;
  }
  .concerto-hero[data-compact="true"] { padding-block: var(--cc-space-2); gap: var(--cc-space-2); }
  .concerto-hero[data-compact="true"] .concerto-hero-goal,
  .concerto-hero[data-compact="true"] .concerto-sprite small { display: none; }
  .concerto-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--cc-space-3); flex-wrap: wrap; }
  .concerto-hero-title { margin: 0; font-size: var(--cc-fs-display); font-weight: 600; letter-spacing: -0.01em; display: flex; align-items: center; gap: var(--cc-space-2); flex-wrap: wrap; }
  .concerto-hero-goal {
    margin: 2px 0 0;
    font-size: var(--cc-fs-meta);
    color: var(--cc-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .concerto-live-dot { display: inline-flex; align-items: center; gap: 6px; font-size: var(--cc-fs-caption); color: var(--cc-text-muted); font-weight: 500; }
  .concerto-live-dot::before { content: ""; width: 7px; height: 7px; border-radius: var(--cc-radius-pill); corner-shape: round; background: var(--cc-state-done); box-shadow: 0 0 0 3px var(--cc-state-done-bg); }
  .concerto-live-dot[data-offline="true"]::before { background: var(--cc-state-blocked); box-shadow: 0 0 0 3px var(--cc-state-blocked-bg); }
  .concerto-progress-wrap { display: flex; align-items: center; gap: var(--cc-space-3); flex-wrap: wrap; }
  .concerto-progress-bar { flex: 1; min-width: 140px; height: 5px; border-radius: var(--cc-radius-pill); corner-shape: round; background: var(--cc-border-subtle); overflow: hidden; display: flex; }
  .concerto-seg-done { background: var(--cc-state-done); }
  .concerto-seg-review { background: var(--cc-state-review); }
  .concerto-seg-run { background: var(--cc-accent); }
  .concerto-seg-block { background: var(--cc-state-blocked); }

  .concerto-briefing-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: var(--cc-space-3); }
  .concerto-briefing-cell {
    padding: var(--cc-space-3) var(--cc-space-4);
    border-radius: var(--cc-radius-ctrl);
    background: var(--cc-card-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    border: 1px solid var(--cc-border-subtle);
    min-width: 0;
  }
  .concerto-briefing-cell .concerto-group-label { margin-bottom: var(--cc-space-1); }
  .concerto-briefing-cell[data-tone="attention"] { background: var(--cc-state-attention-bg); border-color: color-mix(in srgb, var(--cc-state-attention) 35%, transparent); }
  .concerto-briefing-cell[data-tone="attention"] .concerto-group-label { color: var(--cc-state-attention); }
  .concerto-briefing-cell[data-tone="calm"] > :not(.concerto-group-label) { color: var(--cc-text-muted); }

  .concerto-key-tasks { display: flex; flex-direction: column; gap: var(--cc-space-2); }
  .concerto-key-task-row {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-3); flex-wrap: wrap;
    padding: var(--cc-space-2) var(--cc-space-3); border-radius: var(--cc-radius-ctrl); border: 1px solid var(--cc-border-subtle);
    background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur);
    color: inherit; cursor: pointer; text-align: left;
    box-shadow: var(--cc-shadow-soft);
    transition: border-color .12s ease;
  }
  .concerto-key-task-row:hover { border-color: var(--cc-accent); background: var(--dsw-alias-interactive-bg-hover, var(--cc-accent-soft)); }

  .concerto-filter-bar {
    display: flex; align-items: center; gap: var(--cc-space-2); flex-wrap: wrap;
    padding: var(--cc-space-2) var(--cc-space-3);
    border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-ctrl);
    background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur);
    margin-bottom: var(--cc-space-3);
  }
  .concerto-filter-bar select { min-height: 28px; padding: 3px 8px; border-radius: var(--cc-radius-ctrl); border: 1px solid var(--cc-border); background: var(--cc-canvas-bg); color: var(--cc-text-primary); font: inherit; transition: border-color .12s ease; }
  .concerto-filter-bar select[data-active="true"] { border-color: var(--cc-accent); background: var(--cc-accent-soft); color: var(--cc-accent-text); font-weight: 600; }
  .concerto-req-view-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: var(--cc-radius-pill); corner-shape: round; font-size: var(--cc-fs-caption); border: 1px solid var(--cc-border-subtle); background: var(--cc-card-nested-bg); }
  .concerto-req-view-pill[data-missing="true"] { border-color: var(--cc-state-attention); background: var(--cc-state-attention-bg); color: var(--cc-state-attention); font-weight: 600; }
  .concerto-req-view-pill[data-suggested="true"] { border-color: var(--cc-border-subtle); background: var(--cc-card-nested-bg); color: var(--cc-text-secondary); }
  .concerto-jump-banner { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; padding: var(--cc-space-2) var(--cc-space-3); border-radius: var(--cc-radius-ctrl); border: 1px solid var(--cc-accent-border); background: var(--cc-accent-soft); font-size: var(--cc-fs-meta); }
  .concerto-mindmap-outline { list-style: none; margin: 4px 0; padding-left: 18px; border-left: 1px solid var(--cc-border); display: flex; flex-direction: column; gap: 4px; }
  .concerto-mindmap-outline-root { padding-left: 0; border-left: none; }
  .concerto-mindmap-outline-node { padding: 4px 8px; border-radius: var(--cc-radius-ctrl); background: var(--cc-card-nested-bg); border: 1px solid var(--cc-border-subtle); display: inline-flex; align-items: center; flex-wrap: wrap; }
  .concerto-semantic-pill[data-semantic="live_execution"]::before { content: ""; width: 6px; height: 6px; border-radius: var(--cc-radius-pill); corner-shape: round; background: currentColor; animation: concerto-pulse 1.8s ease-in-out infinite; }

  .concerto-tabbar { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; border-bottom: 1px solid var(--cc-border-subtle); padding-bottom: 0; }
  .concerto-tabs { display: inline-flex; align-items: center; gap: var(--cc-space-1); flex-wrap: nowrap; }
  .concerto-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px var(--cc-space-3);
    border-radius: var(--cc-radius-ctrl) var(--cc-radius-ctrl) 0 0;
    border: 0;
    background: transparent;
    color: var(--cc-text-secondary);
    cursor: pointer;
    font-weight: 500;
    font-size: var(--cc-fs-meta);
    transition: box-shadow .14s ease;
  }
  .concerto-tab-btn:hover { background: var(--dsw-alias-interactive-bg-hover, var(--cc-accent-soft)); color: var(--cc-text-primary); }
  .concerto-tab-btn[aria-selected="true"] {
    background: var(--cc-accent-soft);
    color: var(--cc-accent-text);
    font-weight: 600;
    box-shadow: inset 0 -2px 0 var(--cc-accent);
  }
  .concerto-tab-btn[aria-selected="true"] .concerto-tag {
    background: var(--cc-accent-fill);
    color: var(--cc-on-accent);
    font-weight: 600;
  }

  /* Segmented switch (list / kanban toggle) */
  .concerto-seg { display: inline-flex; align-items: center; gap: 2px; padding: 3px; border-radius: var(--cc-radius-ctrl); background: var(--cc-card-nested-bg); border: 1px solid var(--cc-border-subtle); }
  .concerto-seg-btn { border: 1px solid transparent; background: transparent; padding: 4px var(--cc-space-3); border-radius: calc(var(--cc-radius-ctrl) - 2px); font-size: var(--cc-fs-meta); color: var(--cc-text-secondary); cursor: pointer; font-weight: 500; transition: border-color .12s ease; }
  .concerto-seg-btn[aria-pressed="true"] { background: var(--cc-accent-soft); border-color: var(--cc-accent-border); color: var(--cc-accent-text); font-weight: 600; box-shadow: var(--cc-shadow-soft); }

  .concerto-section-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); margin-bottom: var(--cc-space-3); flex-wrap: wrap; }
  .concerto-section-title { font-size: var(--cc-fs-title); font-weight: 600; display: flex; align-items: center; gap: var(--cc-space-2); color: var(--cc-text-primary); }
  .concerto-count-pill { font-size: var(--cc-fs-caption); font-weight: 600; padding: 1px 8px; border-radius: var(--cc-radius-pill); corner-shape: round; background: var(--cc-card-nested-bg); color: var(--cc-text-secondary); border: 0; }

  .concerto-state-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: var(--cc-radius-pill); corner-shape: round; font-size: var(--cc-fs-caption); font-weight: 600; white-space: nowrap; }
  .concerto-state-running { background: var(--cc-state-running-bg); color: var(--cc-state-running); }
  .concerto-state-attention { background: var(--cc-state-attention-bg); color: var(--cc-state-attention); }
  .concerto-state-review { background: var(--cc-state-review-bg); color: var(--cc-state-review); }
  .concerto-state-done { background: var(--cc-state-done-bg); color: var(--cc-state-done); }
  .concerto-state-blocked { background: var(--cc-state-blocked-bg); color: var(--cc-state-blocked); }
  .concerto-state-unknown { background: var(--cc-state-unknown-bg); color: var(--cc-state-unknown); }
  .concerto-state-idle { background: var(--cc-card-nested-bg); color: var(--cc-text-muted); }

  /* 待处理区 */
  .concerto-attn-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: var(--cc-space-3); }
  .concerto-attn-card { border-radius: var(--cc-radius-card); padding: var(--cc-space-4); background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur); border: 1px solid var(--cc-border-subtle); box-shadow: var(--cc-shadow-soft); position: relative; overflow: hidden; display: flex; flex-direction: column; gap: var(--cc-space-2); }
  .concerto-attn-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--cc-state-attention); }
  .concerto-attn-card[data-kind="unknown"]::before { background: var(--cc-state-unknown); }
  .concerto-attn-card[data-kind="blocked"]::before, .concerto-attn-card[data-kind="failed"]::before { background: var(--cc-state-blocked); }
  .concerto-attn-card[data-kind="review"]::before { background: var(--cc-state-review); }
  .concerto-attn-card[data-kind="unknown"] { background-image: repeating-linear-gradient(-45deg, transparent, transparent 10px, var(--cc-state-unknown-bg) 10px, var(--cc-state-unknown-bg) 20px); }

  /* 名册 */
  .concerto-roster-strip { display: flex; gap: var(--cc-space-2); flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; padding-bottom: 2px; }
  .concerto-roster-strip::-webkit-scrollbar { display: none; }
  .concerto-roster-strip > * { flex: none; scroll-snap-align: start; }

  /* 看板与列表 */
  .concerto-board-cols { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--cc-space-3); align-items: start; }
  .concerto-board-col { border-radius: var(--cc-radius-card); padding: 10px; min-height: 92px; display: flex; flex-direction: column; gap: var(--cc-space-2); background: var(--cc-card-nested-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur); border: 1px solid var(--cc-border-subtle); }
  .concerto-board-col[data-empty="true"] { min-height: 0; padding: 8px 10px; opacity: 0.72; }
  .concerto-board-col[data-empty="true"] .concerto-board-col-head { border-bottom: none; padding-bottom: 2px; }
  .concerto-board-col-head { display: flex; align-items: center; justify-content: space-between; font-size: var(--cc-fs-caption); font-weight: 600; padding: 2px 4px 6px; border-bottom: 1px solid var(--cc-border-subtle); }
  .concerto-kcard { border-radius: var(--cc-radius-ctrl); padding: 10px 12px; background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur); border: 1px solid var(--cc-border-subtle); box-shadow: var(--cc-shadow-soft); cursor: pointer; display: flex; flex-direction: column; gap: 6px; text-align: left; color: inherit; transition: border-color .14s ease; width: 100%; }
  .concerto-kcard:hover { border-color: var(--cc-accent); background: var(--dsw-alias-interactive-bg-hover, var(--cc-accent-soft)); }
  .concerto-kcard[data-blocked="true"] { border-color: var(--cc-state-blocked); background-image: repeating-linear-gradient(-45deg, transparent, transparent 8px, var(--cc-state-blocked-bg) 8px, var(--cc-state-blocked-bg) 16px); }
  .concerto-kcard[data-unknown="true"] { border-color: var(--cc-state-unknown); background-image: repeating-linear-gradient(-45deg, transparent, transparent 8px, var(--cc-state-unknown-bg) 8px, var(--cc-state-unknown-bg) 16px); }
  .concerto-kcard-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: var(--cc-fs-caption); color: var(--cc-text-muted); }

  /* Bento & 卡片 */
  .concerto-bento-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-flow: row dense; gap: var(--cc-space-3); }
  .concerto-bento-item { grid-column: span var(--cc-span, 6); min-width: 0; display: flex; }
  .concerto-bento-item[data-size="s"] { grid-column: span var(--cc-span, 4); }
  .concerto-bento-item[data-size="m"] { grid-column: span var(--cc-span, 6); }
  .concerto-bento-item[data-size="l"] { grid-column: span var(--cc-span, 12); }
  .concerto-bento-item > .concerto-card { flex: 1; display: flex; flex-direction: column; }
  .concerto-bento-item > .concerto-card > [data-concerto-renderer-root] { flex: 1; display: flex; flex-direction: column; }
  .concerto-stage-group + .concerto-stage-group { margin-top: var(--cc-space-6); }
  .concerto-stage-group > .concerto-group-label { margin-bottom: var(--cc-space-2); }

  .concerto-card {
    border: 1px solid var(--cc-border-subtle);
    border-radius: var(--cc-radius-card);
    padding: var(--cc-space-4);
    background: var(--cc-card-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    box-shadow: var(--cc-shadow-soft);
    min-width: 0;
    position: relative;
    transition: border-color .2s ease;
  }
  @keyframes concerto-flash {
    0%, 35% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--cc-accent) 45%, transparent); }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  .concerto-card-highlight, .concerto-task-highlight { border-color: var(--cc-accent) !important; animation: concerto-flash 2.4s ease-out; }
  .concerto-card-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: nowrap; margin-bottom: var(--cc-space-2); }
  .concerto-card-head-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .concerto-card-title-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .concerto-card-title-row strong { font-size: var(--cc-fs-body); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .concerto-card-caption { font-size: var(--cc-fs-caption); color: var(--cc-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .concerto-hover-tools { display: inline-flex; gap: 4px; align-items: center; flex: none; }
  .concerto-info-pop { margin-top: 6px; margin-bottom: 8px; padding: var(--cc-space-2) var(--cc-space-3); border-radius: var(--cc-radius-ctrl); background: var(--cc-card-nested-bg); border: 1px solid var(--cc-border-subtle); font-size: var(--cc-fs-caption); color: var(--cc-text-secondary); }

  .concerto-table-wrap { overflow-x: auto; }
  .concerto-table { width: 100%; border-collapse: collapse; font-size: var(--cc-fs-meta); }
  .concerto-table th, .concerto-table td { border: 1px solid var(--cc-border-subtle); padding: 6px 10px; text-align: left; }
  .concerto-table th { background: var(--cc-card-nested-bg); color: var(--cc-text-primary); font-weight: 600; }
  .concerto-checklist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .concerto-checklist li { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: var(--cc-radius-ctrl); background: var(--cc-card-nested-bg); border: 1px solid var(--cc-border-subtle); }

  /* 任务详情折叠/列表 */
  .concerto-task-module { border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-card); padding: var(--cc-space-3) var(--cc-space-4); background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur); box-shadow: var(--cc-shadow-soft); margin-top: var(--cc-space-2); transition: border-color .25s ease; }
  .concerto-task-summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .concerto-acc-cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--cc-space-3); margin-top: 10px; }
  .concerto-acc-box { padding: var(--cc-space-3); border-radius: var(--cc-radius-ctrl); background: var(--cc-card-nested-bg); border: 1px solid var(--cc-border-subtle); }

  /* 画布、浮动工具与全屏弹窗 */
  .concerto-canvas-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; margin-bottom: var(--cc-space-2); font-size: var(--cc-fs-caption); color: var(--cc-text-muted); }
  .concerto-canvas-btns { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .concerto-canvas-stage { position: relative; flex: 1; border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-ctrl); background: var(--cc-canvas-bg); overflow: hidden; min-height: 190px; max-height: 320px; cursor: grab; user-select: none; }
  .concerto-canvas-stage:active { cursor: grabbing; }
  .concerto-stage-tools {
    position: absolute; right: var(--cc-space-2); bottom: var(--cc-space-2); z-index: 2;
    display: inline-flex; gap: 2px; padding: 2px;
    border-radius: var(--cc-radius-ctrl);
    background: var(--cc-overlay-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    box-shadow: var(--cc-shadow-soft);
    opacity: 0; transition: opacity .15s ease;
  }
  .concerto-card:hover .concerto-stage-tools,
  .concerto-card:focus-within .concerto-stage-tools { opacity: 1; }
  @media (pointer: coarse) { .concerto-stage-tools { opacity: 1; } }
  .concerto-canvas-foot { margin-top: var(--cc-space-2); font-size: var(--cc-fs-caption); color: var(--cc-text-muted); display: flex; align-items: center; justify-content: space-between; gap: var(--cc-space-2); flex-wrap: wrap; }
  .concerto-html-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 34px; pointer-events: none; background: linear-gradient(transparent, var(--cc-card-nested-bg)); }

  .concerto-modal-backdrop { position: fixed; inset: 0; z-index: 1100; background: var(--dsw-alias-bg-mask-1, var(--cc-fb-mask)); display: flex; align-items: stretch; justify-content: center; padding: 18px; }
  .concerto-canvas-modal {
    flex: 1;
    max-width: 1440px;
    border: 1px solid var(--cc-border-strong);
    border-radius: var(--cc-radius-lg);
    background: var(--cc-overlay-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    color: var(--cc-text-primary);
    padding: var(--cc-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--cc-space-3);
    box-shadow: var(--cc-shadow-prominent);
    min-width: 0;
    min-height: 0;
  }
  .concerto-canvas-modal .concerto-canvas-stage { flex: 1; max-height: none; min-height: 320px; }

  /* 右侧成员详情抽屉 */
  .concerto-drawer-backdrop { position: fixed; inset: 0; z-index: 1050; background: var(--dsw-alias-bg-mask-1, var(--cc-fb-mask)); display: flex; justify-content: flex-end; }
  .concerto-drawer {
    width: min(480px, 92vw);
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--cc-overlay-bg);
    backdrop-filter: var(--cc-backdrop-blur);
    -webkit-backdrop-filter: var(--cc-backdrop-blur);
    color: var(--cc-text-primary);
    border-left: 1px solid var(--cc-border-strong);
    box-shadow: var(--cc-shadow-prominent);
  }
  .concerto-drawer-head { padding: var(--cc-space-4); border-bottom: 1px solid var(--cc-border-subtle); display: flex; align-items: flex-start; justify-content: space-between; gap: var(--cc-space-3); }
  .concerto-drawer-tabs { display: flex; gap: var(--cc-space-1); padding: 0 var(--cc-space-4); border-bottom: 1px solid var(--cc-border-subtle); flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .concerto-drawer-body { flex: 1; overflow-y: auto; padding: var(--cc-space-4); display: flex; flex-direction: column; gap: var(--cc-space-3); }
  .concerto-bubble { padding: var(--cc-space-3); border-radius: var(--cc-radius-card); background: var(--cc-card-nested-bg); border: 1px solid var(--cc-border-subtle); display: flex; flex-direction: column; gap: 6px; }
  .concerto-activity-line { font-size: var(--cc-fs-meta); color: var(--cc-text-secondary); padding: 6px 10px; border-left: 2px solid var(--cc-border-strong); background: var(--cc-card-nested-bg); border-radius: 0 var(--cc-radius-ctrl) var(--cc-radius-ctrl) 0; }
  .concerto-empty { display: grid; justify-items: center; text-align: center; gap: var(--cc-space-2); padding: var(--cc-space-6) var(--cc-space-4); color: var(--cc-text-muted); font-size: var(--cc-fs-meta); }

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
  @media (prefers-reduced-motion: reduce) {
    .concerto-sprite svg, .concerto-message-avatar svg, .concerto-sprite .concerto-halo-pulse, .concerto-semantic-pill::before { animation: none !important; }
    .concerto-task-highlight, .concerto-card-highlight { animation: none !important; outline: 2px solid var(--cc-accent); }
  }
  @media (max-width: 900px) {
    .concerto-board-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .concerto-bento-item,
    .concerto-bento-item[data-size="l"],
    .concerto-bento-item[data-size="m"],
    .concerto-bento-item[data-size="s"] { grid-column: span 12 !important; }
  }
  @media (max-width: 720px) {
    .concerto-team-view { padding: var(--cc-space-3) var(--cc-space-3) 140px; gap: var(--cc-space-5); }
    .concerto-briefing-grid { grid-template-columns: 1fr; }
    .concerto-board-cols { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; }
    .concerto-board-col { min-width: 240px; scroll-snap-align: start; }
    .concerto-acc-cols { grid-template-columns: 1fr; }
    .concerto-drawer { width: 100vw; }
    .concerto-stage-tools { opacity: 1; }
    .concerto-filter-bar { display: grid; grid-template-columns: 1fr 1fr; }
    .concerto-filter-bar label { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .concerto-filter-bar label:first-child { grid-column: 1 / -1; }
    .concerto-filter-bar select { width: 100%; text-overflow: ellipsis; }
    .concerto-tabs { width: 100%; }
    .concerto-tab-btn { flex: 1; justify-content: center; }
    .concerto-key-task-row { flex-direction: column; align-items: flex-start; }
    .concerto-modal-backdrop { padding: 0; }
    .concerto-canvas-modal { border-radius: 0; border: 0; }
    .concerto-sprite-meta { max-width: 150px; }
  }
  @media (max-width: 600px) { .concerto-panel { top: 56px; right: 16px; max-height: calc(100dvh - 280px); } }
`

let teamCssRefs = 0

/**
 * Mount Concerto's stylesheet once in `<head>` with reference-counted cleanup
 * so multiple components/portals share one `<style>` instead of injecting dozens.
 * Safely no-ops under minimal SSR mocks lacking `React.useEffect` or `document`.
 */
export function useTeamCss() {
  if (typeof React.useEffect !== 'function') return
  React.useEffect(() => {
    if (typeof document === 'undefined' || !document.head) return
    if (teamCssRefs === 0 && !document.getElementById('concerto-team-css')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'concerto-team-css'
      styleEl.textContent = TEAM_CSS
      document.head.appendChild(styleEl)
    }
    teamCssRefs += 1
    return () => {
      teamCssRefs = Math.max(0, teamCssRefs - 1)
      if (teamCssRefs === 0) {
        document.getElementById('concerto-team-css')?.remove()
      }
    }
  }, [])
}
