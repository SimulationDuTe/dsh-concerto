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

  /* Interactive grammar: btn / tag / badge / chip / link — mirrors DSH button tokens */
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

  /* 团队主页（常驻粘顶 + 概览 / 任务 / 成果） */
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

  /* 待处理区 */
  .concerto-attn-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(290px, 100%), 1fr)); gap: var(--cc-space-3); }
  .concerto-attn-card { border-radius: var(--cc-radius-card); corner-shape: var(--cc-corner-shape); padding: var(--cc-space-4) var(--cc-space-4) var(--cc-space-4) calc(var(--cc-space-4) + 3px); background: var(--cc-card-bg); backdrop-filter: var(--cc-backdrop-blur); -webkit-backdrop-filter: var(--cc-backdrop-blur); border: 1px solid var(--cc-border); box-shadow: var(--cc-shadow-soft); position: relative; overflow: hidden; display: flex; flex-direction: column; gap: var(--cc-space-2); }
  .concerto-attn-card::before { content: ""; position: absolute; left: 0; top: var(--cc-space-3); bottom: var(--cc-space-3); width: 3px; border-radius: 0 3px 3px 0; background: var(--cc-state-attention); }
  .concerto-attn-card[data-kind="unknown"]::before { background: var(--cc-state-unknown); }
  .concerto-attn-card[data-kind="blocked"]::before, .concerto-attn-card[data-kind="failed"]::before { background: var(--cc-state-blocked); }
  .concerto-attn-card[data-kind="review"]::before { background: var(--cc-state-review); }
  .concerto-attn-card[data-kind="unknown"] { background-image: repeating-linear-gradient(-45deg, transparent, transparent 10px, var(--cc-state-unknown-bg) 10px, var(--cc-state-unknown-bg) 20px); }
  .concerto-attention-popover .concerto-attn-card { box-shadow: none; background: var(--cc-card-bg); }

  /* 名册 */
  .concerto-roster-strip { display: flex; gap: var(--cc-space-1); flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; padding-bottom: 2px; }
  .concerto-roster-strip::-webkit-scrollbar { display: none; }
  .concerto-roster-strip > * { flex: none; scroll-snap-align: start; }

  /* 固定看板：列是带底色的泳道，卡片保留一层宿主材质。 */
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

  /* Bento & 卡片 */
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

  /* 任务详情折叠/列表 */
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

  /* 画布、浮动工具与全屏弹窗 */
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

  /* 右侧成员详情抽屉 */
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

  /* ===== 设置页：装配团队 / 运行实例 / 异常恢复 ===== */
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
  .concerto-live-stage { position: relative; display: flex; flex-direction: column; align-items: center; gap: 18px; padding: var(--cc-space-3) var(--cc-space-3) var(--cc-space-2); border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-card); background: radial-gradient(ellipse 60% 55% at 50% 15%, color-mix(in srgb, var(--cc-accent) 9%, transparent), transparent 72%), var(--cc-card-nested-bg); }
  .concerto-live-stage-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; z-index: 1; }
  .concerto-live-stage-row { position: relative; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--cc-space-2); width: 100%; }
  .concerto-live-stage-wings { position: relative; z-index: 2; display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--cc-space-3); width: 100%; }
  .concerto-live-stage-wing { flex: 1 1 180px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--cc-space-2); }
  .concerto-live-node-wrap { display: inline-flex; position: relative; }
  .concerto-live-node--celebrate { animation: concerto-sprite-hop 0.85s var(--cc-ease) 2; }
  .concerto-live-node--celebrate .concerto-sprite { box-shadow: 0 0 0 2px var(--cc-state-done), 0 4px 14px color-mix(in srgb, var(--cc-state-done) 35%, transparent); }
  @keyframes concerto-sprite-hop { 0%, 100% { transform: translateY(0) scale(1); } 30% { transform: translateY(-7px) scale(1.04); } 55% { transform: translateY(0) scale(0.98); } 75% { transform: translateY(-3px) scale(1.01); } }
  .concerto-stage-arc--idle { fill: none; stroke: color-mix(in srgb, var(--cc-border) 65%, transparent); stroke-width: 1.25; stroke-dasharray: 3 5; }
  .concerto-stage-arc--dispatch { fill: none; stroke: var(--cc-accent); stroke-width: 2.5; stroke-dasharray: 6 6; stroke-linecap: round; animation: concerto-stage-flow 1.2s linear infinite; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--cc-accent) 55%, transparent)); }
  .concerto-stage-arc--handoff { fill: none; stroke: var(--cc-state-review); stroke-width: 2.5; stroke-dasharray: 6 5; stroke-linecap: round; animation: concerto-stage-flow 1.1s linear infinite; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--cc-state-review) 55%, transparent)); }
  .concerto-stage-pulse-dot { fill: var(--cc-accent); }
  .concerto-stage-pulse-dot--handoff { fill: var(--cc-state-review); }
  /* A/B Compare Race Board */
  .concerto-race-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--cc-space-3); width: 100%; }
  .concerto-race-col { display: flex; flex-direction: column; gap: var(--cc-space-2); padding: var(--cc-space-3); border: 1px solid var(--cc-border-subtle); border-radius: var(--cc-radius-card); background: var(--cc-card-bg); min-width: 0; }
  .concerto-race-col[data-winner="true"] { border-color: var(--cc-state-done); box-shadow: 0 0 0 2px var(--cc-state-done-bg); }
  /* Live Battle Map node pulse & point-on-diagram command bar */
  .concerto-battle-node--running > rect:first-of-type { stroke: var(--cc-state-running); stroke-width: 2; animation: concerto-battle-pulse 1.8s ease-in-out infinite; }
  .concerto-battle-node--done > rect:first-of-type { stroke: var(--cc-state-done); stroke-width: 1.5; }
  .concerto-battle-node--blocked > rect:first-of-type { stroke: var(--cc-state-blocked); stroke-width: 1.8; }
  .concerto-battle-node--interactive { cursor: pointer; }
  .concerto-battle-node--interactive:hover > rect:first-of-type { stroke: var(--cc-accent); stroke-width: 2; }
  @keyframes concerto-battle-pulse { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: 0.35; } }
  .concerto-point-cmd-bar { display: flex; flex-direction: column; gap: 6px; padding: var(--cc-space-2) var(--cc-space-3); margin-bottom: var(--cc-space-2); border: 1px solid color-mix(in srgb, var(--cc-accent) 40%, var(--cc-border)); border-radius: var(--cc-radius-ctrl); background: var(--cc-card-nested-bg); animation: concerto-stage-expand 0.2s var(--cc-ease); }
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
    .concerto-sprite svg, .concerto-message-avatar svg, .concerto-sprite .concerto-halo-pulse, .concerto-semantic-pill::before, .concerto-stage-arc, .concerto-stage-arc--dispatch, .concerto-stage-arc--handoff, .concerto-live-node--celebrate, .concerto-stage-node--commander .concerto-pixel, .concerto-stage-inspector, .concerto-battle-node--running > rect:first-of-type, .concerto-point-cmd-bar { animation: none !important; }
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
