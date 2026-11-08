---
name: noor-islamic-fiqh-timing-guard
description: Enforces authentic Islamic Fiqh prayer calculations, 3 Makruh prohibited windows, 3 voluntary Nafl windows, and synchronized Qaza tracking in Noor Connect.
---

# Authentic Prayer, Makruh Waqt, Nafl & Qaza Sync Guard

This domain skill governs Islamic astronomical calculations, prohibited prayer (Makruh) periods, voluntary (Nafl) prayer windows, and bidirectional Qaza tracking.

## 1. Triggers
Activate this skill whenever any of the following files are inspected or modified:
- `src/lib/makruh-times.ts`
- `src/lib/nafl-prayers.ts`
- `src/lib/qaza-tracker.ts`
- `src/lib/prayer-times.ts`
- `src/hooks/usePrayerTimes.ts`
- `src/components/PrayerTimesSection.tsx`
- `src/components/TopQazaReminderBanner.tsx`
- `src/components/PremiumDashboard.tsx`
- `src/pages/Dashboard.tsx`

## 2. Enforced Rules & Invariants

### A. The 3 Prohibited (Makruh) Prayer Windows
According to authentic Sunnah (Sahih Muslim 831, Jami` at-Tirmidhi 153), Salah (and Sujood) is strictly prohibited during three distinct daily astronomical windows:
1. **Sunrise Window (Tulu-e-Aftab):**
   - Starts at astronomical **`Sunrise`** and extends until the sun has risen above the horizon by the height of a spear (**`Sunrise + 15 minutes`**).
2. **Zenith Window (Zawal / Nisf an-Nahar):**
   - Starts **`10 minutes before Dhuhr`** (true astronomical solar zenith / Istiwa) and ends at **`Dhuhr`** (when the sun passes the meridian).
3. **Sunset Window (Ghurub-e-Aftab):**
   - Starts **`15 minutes before Maghrib`** (when the sun pales and dims) and ends at **`Maghrib`** (sunset). *(Exception: Asr of that specific day if delayed due to extreme necessity).*

**Implementation Mandate:**
- The Makruh calculation must evaluate on every 1-second system clock tick against live astronomical timestamps.
- The red blinking alert card (`makruh-warning-card`) must appear **ONLY** when an active Makruh window is true.
- At the exact boundary second (`:00s`) when the window lapses, the alert must instantly and cleanly auto-dismiss without requiring manual app restart or pull-to-refresh.

### B. The 3 Voluntary (Nafl) Prayer Windows
1. **Ishraq (Post-Sunrise Prayer):**
   - Starts immediately after the morning Makruh window ends (**`Sunrise + 15 minutes`**) and lasts until **`Sunrise + 45 minutes`**.
2. **Chasht / Salāt al-Duha (Forenoon Prayer):**
   - Starts when Ishraq ends (**`Sunrise + 45 minutes`**) and continues until the midday Makruh window starts (**`Dhuhr - 10 minutes`**).
   - Recommended peak time is at mid-morning when the sand grows warm.
3. **Salāt al-Awwābin (Post-Maghrib Prayer):**
   - Starts **`15 minutes after Maghrib`** and continues until **`Isha`**.

**UI Mandate:**
- On the Home Screen, the Nafl Prayers section must be collapsible:
  * If a Nafl prayer is currently **ACTIVE**, show that prayer's active card with live countdown (`● 12m left`) and provide a toggle for inactive times.
  * If NO Nafl prayer is active, collapse into a sleek 1-line interactive bar (`✨ Nafl Prayers (Ishraq, Chasht, Awwabin) • Tap to view times ▾`) to preserve vertical screen space.

### C. Bidirectional Qaza Reconciliation & Top Reminder Banner
1. **Two-Way Synchronization:**
   - Noor Connect maintains two representations of missed prayers:
     * Aggregate counter tiles (`qazaData.prayers`: Fajr, Dhuhr, Asr, Maghrib, Isha, Witr).
     * Date-wise historical log entries (`noor_qaza_date_records_v1`).
   - Completing a prayer via either mechanism (e.g., tapping a date pill or decrementing an aggregate counter) must immediately synchronize both data sources.
2. **Top-of-Screen Persistent Reminder Banner:**
   - Whenever `totalPendingQaza > 0`, render the `TopQazaReminderBanner` immediately below the Hero Clock Card.
   - The banner must provide:
     * Live pending count and quick link to tracker.
     * Makruh-aware dynamic reminder (if Makruh is active, warn user to wait; if Makruh is clear, rotate motivational reminders).
     * Inline 1-tap makeup pills allowing immediate completion directly from the top of the Home Screen.

## 3. Pre-Commit Verification Checklist
- [ ] Makruh boundary check: Test edge timestamps (e.g., `Sunrise + 15m 01s`) to confirm instantaneous dismissal.
- [ ] Nafl range check: Verify Ishraq, Chasht, and Awwabin start and end times calculate correctly from solar coordinates.
- [ ] Qaza two-way sync: Mark a prayer complete from a date pill; confirm aggregate counter decrements simultaneously.
- [ ] Top banner visibility: Verify banner appears when `totalPendingQaza > 0` and hides when `totalPendingQaza === 0`.
