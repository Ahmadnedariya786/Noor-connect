---
name: noor-6-theme-token-sentinel
description: Audits and enforces the 6 Royal Themes and complete 17 CSS root tokens across Noor Connect, ensuring cross-theme visual harmony and color-mix fallbacks.
---

# 6 Royal Themes & 17 CSS Root Token Auditor

This domain skill enforces design system integrity, CSS custom property definitions, and theme color-mix fallbacks across Noor Connect.

## 1. Triggers
Activate this skill whenever any of the following files are inspected or modified:
- `src/index.css`
- `src/lib/theme-engine.ts`
- `src/lib/widget-customizer.ts`
- `src/types/theme.ts`
- `src/components/themes/ThemePicker.tsx`
- `src/pages/SettingsThemePage.tsx`
- Any component stylesheet defining CSS variables or theme classes

## 2. Enforced Rules & Invariants

### A. The 6 Royal Themes Canon
The application features exactly 6 Royal Themes in a symmetrical 3×2 selector grid:
1. **`kiswah-noir` (`Kaaba Kiswah Noir`):** Sacred Black Silk & 24K Gold Embroidery.
2. **`istanbul-sapphire` (`Royal Iznik Sapphire`):** Ottoman Turquoise-Teal & Champagne Rose-Gold.
3. **`oxford-gold` (`Oxford Gold`):** Midnight Navy Blue & Warm Luminous Gold.
4. **`imperial-violet` (`Imperial Violet`):** Deep Regal Amethyst & Burnished Gold.
5. **`burgundy-velvet` (`Burgundy Velvet`):** Crimson Velvet & Antique Brass.
6. **`desert-scroll` (`Desert Scroll`):** Parchment Sandstone & Warm Umber.

*(Note: `madinah-emerald` is permanently deprecated; any legacy storage reference automatically migrates to `kiswah-noir`).*

### B. Mandatory 17 CSS Root Tokens
Every theme definition in `src/index.css` (under `[data-theme="..."]`) and in `src/lib/theme-engine.ts` (`APP_THEMES`) **MUST** define all 17 core tokens:

| Token | Semantic Purpose | Typical Requirement |
| :--- | :--- | :--- |
| `--bg-base` | Main application canvas background | OLED black, deep navy, or parchment |
| `--bg-elev` | Elevated container / bottom nav background | Slightly lighter or tinted base |
| `--surface` | Primary card background | Elevated contrast card surface |
| `--surface-2` | Secondary nested card / badge background | Deeper or distinct card layer |
| `--border` | Card, divider, and modal borders | Subtle metallic, gold, or tinted line |
| `--accent` | Primary brand accent color | Pure gold, turquoise, or theme jewel |
| `--accent-text` | Legible text color on dark surfaces | Luminous gold or pearl accent |
| `--on-accent` | High-contrast text on top of `--accent` | Deep black or contrast dark |
| `--accent-soft` | Soft transparent tint for active pills | 10–18% opacity of accent |
| `--accent-glow` | Box-shadow glow / ambient highlight | 20–35% opacity highlight |
| `--accent-2` | Secondary accent / complementary jewel | Turquoise, rose gold, or bronze |
| `--text-primary` | Main readable body typography | High contrast ivory or crisp white |
| `--text-secondary`| Muted secondary labels and timestamps | Muted silver, gold, or slate |
| `--success` | Green confirmation state | `#10B981` |
| `--warning` | Amber warning / Makruh state | `#F59E0B` |
| `--danger` | Red destructive / alarm state | `#EF4444` |
| `--card-sheen` | Subtle diagonal gradient highlight | Multi-stop linear gradient |

### C. Plain CSS Fallback for `color-mix()`
1. **Android WebView Compatibility:**
   - Older Android System WebViews (API $\le 30$ or un-updated Chromium cores) fail to parse `color-mix(in srgb, ...)`.
   - When a browser encounters an unsupported property without a fallback, the entire declaration is ignored, resulting in transparent or unstyled elements.
2. **Mandatory Fallback Pattern:**
   - Every single CSS rule utilizing `color-mix()` must have a plain CSS fallback line immediately preceding it:
     ```css
     /* Plain CSS Fallback for older WebViews */
     background-color: var(--surface-2);
     /* Modern color-mix enhancement */
     background-color: color-mix(in srgb, var(--surface-2) 90%, var(--accent) 10%);
     ```

## 3. Pre-Commit Verification Checklist
- [ ] Token completeness: Verify all 17 root tokens are present in all 6 themes in `src/index.css` and `src/lib/theme-engine.ts`.
- [ ] Deprecation check: Ensure zero lingering references to `madinah-emerald` in active selectors.
- [ ] Color-mix fallback check: Verify each `color-mix()` declaration is immediately preceded by a static CSS fallback.
- [ ] Symmetrical grid: Confirm `ThemePicker.tsx` renders the 3×2 grid cleanly without text truncation on subtitles.
