---
name: noor-360px-viewport-rtl-guard
description: Enforces 360px mobile viewport budget, BiDi isolation for Urdu + English numbers, and Mushaf 7L/13L/15L line invariants in Noor Connect.
---

# 360px Mobile Viewport, BiDi RTL & Mushaf Layout Guard

This domain skill governs all UI layout, typography, bidirectional text rendering, and Mushaf line-breaking across Noor Connect (`com.noorconnect.ummah`).

## 1. Triggers
Activate this skill whenever any of the following files are inspected or modified:
- `src/components/**`
- `src/pages/**`
- `src/pages/InteractiveMushafPage.tsx`
- `src/pages/QuranReader.tsx`
- `src/lib/interactive-mushaf.ts`
- Any CSS or styling file affecting mobile layouts

## 2. Enforced Rules & Invariants

### A. 360px Horizontal Viewport Budget
1. **Mathematical Screen Budget:**
   - Base mobile viewport width is strictly `360px`.
   - Accounting for container margins (`px-3` = 12px each side or `px-4` = 16px each side), the available inner width is **`312px` to `336px`**.
   - **Constraint:** Every card, modal header, and horizontal flex row must satisfy:
     ```
     element.scrollWidth <= element.clientWidth
     ```
   - No horizontal scrollbars must ever appear unless an explicit horizontal scroll container (such as a tab pill list or prayer ribbon) is intentionally configured with `overflow-x-auto`.
2. **Zero `...` Text Truncation on Critical UI:**
   - Badges, prayer names (Fajr, Dhuhr, Asr, Maghrib, Isha, Tahajjud, Ishraq, Chasht, Awwabin), and primary action buttons must never suffer ellipsis truncation (`...`).
   - If a header row contains leading action, title, and trailing action, the center container must use:
     ```css
     flex: 1 1 0%;
     min-width: 0;
     ```
   - Subtitles must be allowed to wrap or span two clean lines rather than squeezing horizontal space from primary labels.

### B. BiDi Isolation for Urdu & Numbers
1. **The Inversion Bug:**
   - Urdu is an RTL script, while Arabic-Indic digits (1, 2, 3...) in Western keyboards are treated as weak LTR numbers by the Unicode Bidirectional Algorithm (UBA).
   - In raw string templates like `` `${juzTitle} ${startJuz} تا ${endJuz}` ``, Android WebViews invert the token order into `7تا 1پارہ` or `1-7 پارہ`.
2. **Mandatory BiDi Structure:**
   - Never mix RTL text and LTR numbers in a single raw string without isolation.
   - Always structure bidirectional text using isolated tags or `<bdi>`:
     ```tsx
     <div className="inline-flex items-center gap-1.5" dir="rtl">
       <span className="font-urdu">{t('juz')}</span>
       <span dir="ltr" className="font-mono">{startJuz}</span>
       <span className="font-urdu">{t('to')}</span>
       <span dir="ltr" className="font-mono">{endJuz}</span>
     </div>
     ```
   - Alternatively, wrap digits with `<bdi dir="ltr">{num}</bdi>`.
   - Render all Urdu text strictly in Jameel Noori Nastaliq (`var(--font-urdu)`).

### C. Mushaf 7L / 13L / 15L Invariants
1. **Uniform Font Size:**
   - Maintain uniform, legible font sizes across all lines on a Mushaf page. Never shrink individual lines to arbitrary microscopic sizes just to prevent line wrapping.
2. **Knuth-Plass Dynamic Programming Line Packing:**
   - Compute line breaks using dynamic programming minimum-raggedness algorithms with anti-orphan penalty functions.
   - Trailing lines containing $\le 3$ words must be centered with balanced tracking rather than left or right-justified.
3. **Unified Navigation & State:**
   - `QuranReader.tsx` and `InteractiveMushafPage.tsx` must maintain a 1:1 synchronized `subPage` state.
   - Navigating or flipping pages must preserve the exact subpage index so switching reading modes never causes position jumps or content desynchronization.

## 3. Pre-Commit Verification Checklist
- [ ] Viewport test: Emulate 360px viewport; verify `scrollWidth <= clientWidth` on all cards and headers.
- [ ] BiDi test: Verify Urdu ranges (e.g. `پارہ 1 تا 7`) render in the correct logical visual order on Android WebView.
- [ ] Truncation check: Ensure badges and prayer titles show full text without ellipsis.
- [ ] Mushaf validation: Test 7L, 13L, and 15L line modes; confirm font size uniformity and anti-orphan centering.
