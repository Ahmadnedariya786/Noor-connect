---
name: noor-6-theme-token-sentinel
description: Audits and enforces the 7 Royal Themes and complete 17 CSS root tokens across Noor Connect, ensuring cross-theme visual harmony and color-mix fallbacks.
---

# 7 Royal Themes & 17 CSS Root Token Auditor

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

### A. The 7 Royal Themes Canon
The application features 7 Royal Themes with unified Sukoon low-glare velvet architecture:
1. **`oxford-gold` (`Oxford Gold`):** Midnight Velvet & Satin Gold (`#060911`, `#0F1729`, `#DCA349`, `#B87F28`).
2. **`kiswah-noir` (`Haramain Noir`):** Obsidian Graphite & Satin Silver (`#060608`, `#12131A`, `#A8B3C7`, `#7E8B9F`).
3. **`imperial-violet` (`Imperial Violet`):** Obsidian Plum & Satin Orchid (`#0B0514`, `#180C2B`, `#C582F0`, `#9333EA`).
4. **`burgundy-velvet` (`Burgundy Velvet`):** Deep Onyx & Crimson (`#0B0B0B`, `#241012`, `#C24552`, `#E0707E`).
5. **`desert-scroll` (`Desert Scroll`):** Obsidian Mocha & Terracotta (`#100806`, `#21110D`, `#E58A4E`, `#C46830`).
6. **`istanbul-sapphire` (`Royal Sapphire`):** Obsidian Sapphire & Periwinkle (`#050912`, `#0C1629`, `#6A9AF2`, `#3B6FD4`).
7. **`madinah-emerald` (`Madinah Emerald`):** Obsidian Pine & Satin Jade (`#040D09`, `#0A1F17`, `#45B88C`, `#2E946D`).

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

### D. Sharia-Safe Islamic Geometry Canon & Forbidden Motifs (Permanent)
Never render in any theme pattern, motif, preview card, or decorative layer:
1. **Forbidden Geometry:**
   - Six-pointed hexagrams (two overlapping triangles)
   - Standalone cross or plus motifs
   - Fleur-de-lis
   - Gothic or church window arches
   - Trefoil or trinity shapes
   - Literal Quranic or Ayah text as decorative background (respect risk under UI elements)
2. **Allowed Vocabulary:**
   - 8-pointed khatam stars (two overlapping SQUARES rotated 45 degrees)
   - Rub el Hizb medallions
   - Girih strapwork
   - Mihrab pointed arches
   - Arabesque vines
   - Sazm leaves (Ottoman saz style)
   - Ottoman lale (tulip) drawn correctly
   - Palm fronds
   - Mosque dome and minaret silhouettes
   - Crescent
   - Fanous lantern
   - Abstract Kiswa embroidery medallions (strictly no readable text)
3. **Tiling Invariant:**
   - The rule applies strictly to the **TILED RESULT**, not only to a single tile.
   - When a tile repeats, the seams and intersections must never form a plus/cross, hexagram, or fleur silhouette.

## 3. Pre-Commit Verification Checklist
- [ ] Token completeness: Verify all 17 root tokens are present in all 7 themes in `src/index.css` and `src/lib/theme-engine.ts`.
- [ ] Color-mix fallback check: Verify each `color-mix()` declaration is immediately preceded by a static CSS fallback.
- [ ] Sharia-safe geometry audit: Confirm all decorative patterns, motifs, and preview cards adhere to the Sharia-Safe Islamic Geometry Canon with zero forbidden shapes (at tile and seam levels).
- [ ] Grid integrity: Confirm `ThemePicker.tsx` renders all 7 theme preview cards cleanly without text truncation on subtitles.
