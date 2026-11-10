# Elephant-Goldfish Model (EGM) & Noor Connect Review Style Guide

Review pull requests only for high-severity correctness, packaging, security, or specification defects in changed lines. Never post style nits, summary banners, or speculative suggestions on untouched lines.

## 1. Repository Invariants

* **Skill Frontmatter and Directory Naming**: Every `.agents/skills/<dir>/SKILL.md` file must include YAML frontmatter with `name` equal to the directory name and a non-empty `description`. Every `.agents/agents/<name>.md` file must include `name` and `description` frontmatter.
* **Zero Runtime Bundle Impact**: All agent skills, plugin descriptors, and review guidelines must live strictly within `.agents/` and `.gemini/`. Never add runtime npm dependencies or inflate production APK/web bundle size.
* **GitHub Flavored Markdown Tables**: Never use multiline `:` continuation rows in Markdown tables. Every table row must stay on one line so GitHub renders it properly.
* **Relative Link Integrity**: All relative Markdown links and intra-document `#heading` anchors must resolve on disk.
* **Silent Failure and Comment Accuracy**: Flag swallowed exceptions, unlogged error fallbacks, and modified comments or docstrings that contradict the implementation.

## 2. Negative-Rule Ledger (Do Not Flag)

Do not flag any of the following intentional repository conventions:

* **Missing `$schema` in Root `plugin.json`**: Root `plugin.json` intentionally omits `$schema` so OhMyPi (`omp`) and OpenCode parsers do not reject the manifest.
* **Checked-In Multi-Agent Definitions**: The repository registers specialized EGM and Noor Connect skills in `.agents/` and `.gemini/`.
* **Zero-User-Impact Developer Vault**: Developer tools in `Settings > About Noor Connect` are hidden behind the 5-tap version gesture by design.

## 3. Comment Formatting Rules

* **Direct Opening**: Start every comment with `[High]: <1-sentence defect summary>. <1-sentence fix>`. Never print meta-labels such as `BLUF:`, `Bottom line:`, `Summary:`, or `Issue:`.
* **Committable Suggestions**: Include a 1-5 line GitHub `suggestion` block only when committing the block fixes the defect completely without follow-up edits.
* **Concise Technical Prose**: Keep sentences at or under 25 words in active voice and present tense. Avoid em dashes, semicolons, filler praise, and counted preambles.
* **Respect Author Pushback**: Do not re-open or argue a thread after a contributor or maintainer replies `intended`, `by design`, or `won't fix`.

## 4. Specialized Noor Connect Domain Skills

When modifying or reviewing Noor Connect code, automatically trigger and enforce the following 5 domain skills:

1. **[360px Mobile Viewport, BiDi RTL & Mushaf Layout Guard](file:///c:/Users/DELL/Noor-connect/.agents/skills/noor-360px-viewport-rtl-guard/SKILL.md):**
   - Enforce 360px width budget (`312px–336px` inner width) with `scrollWidth <= clientWidth`.
   - Zero `...` text truncation on badges or prayer titles.
   - Strict BiDi isolation for Urdu + English numbers (use `<bdi>` or `<span dir="ltr">`).
   - Mushaf 7L/13L/15L uniform font size, Knuth-Plass line packing, and unified `subPage` state.

2. **[IndexedDB, Cloud PDF Streaming & Zero-Buffer Page Turn Guard](file:///c:/Users/DELL/Noor-connect/.agents/skills/noor-offline-idb-zero-crash/SKILL.md):**
   - Zero unhandled console error leakage (`isTrusted: true`) from IndexedDB.
   - Clear stores via `objectStore.clear()` inside a `readwrite` transaction instead of deleting databases.
   - Serve Mushaf pages synchronously from `memoryPageCache` on frame 1 with $N-2$ to $N+4$ prefetching.
   - Viewport-priority PDF rendering in continuous scroll and auto-open on 100% download.

3. **[Capacitor Android WebView, CORS Proxy & Native Alarm Guard](file:///c:/Users/DELL/Noor-connect/.agents/skills/noor-capacitor-android-native/SKILL.md):**
   - Intercept large binary downloads via `MainActivity.java` `/__gh_ebook__/` with multi-hop redirect handling and synthetic CORS headers.
   - Strict APK update filtering (only releases with `.apk` assets; never asset-only releases like `ebooks-library-v1`).
   - Exact alarm permission handling for uninterrupted Adhan notifications.

4. **[7 Royal Themes & 17 CSS Token Auditor](file:///c:/Users/DELL/Noor-connect/.agents/skills/noor-6-theme-token-sentinel/SKILL.md):**
   - All 7 Royal Themes (`kiswah-noir`, `istanbul-sapphire`, `oxford-gold`, `imperial-violet`, `burgundy-velvet`, `desert-scroll`, `madinah-emerald`) must define all 17 root tokens.
   - Every `color-mix()` CSS declaration must be preceded by a plain CSS fallback rule.

5. **[Authentic Prayer, Makruh Waqt, Nafl & Qaza Sync Guard](file:///c:/Users/DELL/Noor-connect/.agents/skills/noor-islamic-fiqh-timing-guard/SKILL.md):**
   - 3 Makruh windows (Sunrise $+ 15m$, Dhuhr $- 10m$, Maghrib $- 15m$) evaluated every second and cleanly auto-dismissed at `:00s`.
   - 3 Nafl windows (Ishraq, Chasht, Awwabin) with collapsible Home Screen accordion.
   - Two-way sync between aggregate Qaza counters and date-wise records, with persistent top reminder banner.
