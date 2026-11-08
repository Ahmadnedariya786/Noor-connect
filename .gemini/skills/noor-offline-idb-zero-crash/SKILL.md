---
name: noor-offline-idb-zero-crash
description: Enforces resilient IndexedDB storage, zero console error leakage, synchronous in-memory Mushaf page prefetching, and viewport-priority PDF rendering in Noor Connect.
---

# IndexedDB, Cloud PDF Streaming & Zero-Buffer Page Turn Guard

This domain skill protects storage operations, in-memory caching, PDF rendering, and offline page-turn stability across Noor Connect.

## 1. Triggers
Activate this skill whenever any of the following files are inspected or modified:
- `src/lib/ebooks-cloud.ts`
- `src/lib/cache-manager.ts`
- `src/pages/NativePdfViewer.tsx`
- `src/lib/interactive-mushaf.ts`
- `src/lib/diagnostics-engine.ts`
- Any code interfacing with `indexedDB`, Cache API, or PDF.js rendering loops

## 2. Enforced Rules & Invariants

### A. Zero Console Errors from IndexedDB
1. **Sanitize DOM Events Before Logging:**
   - In browser WebViews, raw DOM error events passed directly to `console.error(err)` or `Promise.reject(event)` serialize into unhelpful messages like `{"isTrusted": true}`.
   - Always extract meaningful diagnostics:
     ```ts
     const message = (event?.target as IDBRequest)?.error?.message || 
                     (event instanceof Error ? event.message : 'Unknown IDB error');
     console.warn(`[IDB_STORAGE] Operation failed: ${message}`);
     ```
2. **Safe Store Reset Pattern:**
   - Never call `indexedDB.deleteDatabase()` while database connections are actively held open across active components or worker threads. Doing so triggers `blocked` events and locks the database.
   - To clear cached records safely, open a `readwrite` transaction on the target store and invoke:
     ```ts
     const tx = db.transaction([storeName], 'readwrite');
     tx.objectStore(storeName).clear();
     ```
   - Provide fallback in-memory maps if IndexedDB is blocked or quota is exceeded.

### B. Synchronous Memory Cache & Prefetching
1. **Frame-1 Synchronous Mushaf Page Delivery:**
   - Every Mushaf page must be queried first through synchronous in-memory cache:
     ```ts
     const page = getCachedMushafPageSync(pageNumber);
     ```
   - If available in memory, render immediately on frame 1 without transitioning the UI through an intermediate `"Loading..."` state or resetting container scroll height.
2. **Sliding Prefetch Window ($N-2$ to $N+4$):**
   - When the user navigates to page $N$, trigger asynchronous background prefetching for pages $N-1, N-2, N+1, N+2, N+3, N+4$.
   - Cache decoded page vectors/lines in memory so page turns feel instantaneous (0ms perceived latency).

### C. Viewport-Priority PDF Streaming & Immediate Opening
1. **LIFO / Distance-to-Viewport Priority:**
   - In `NativePdfViewer.tsx` continuous scrolling mode, prioritize rendering tasks for pages currently intersecting or closest to the viewport.
   - Cancel or deprioritize off-screen page render tasks during rapid scrolling to prevent canvas thrashing and Out-Of-Memory (OOM) WebGL/Canvas crashes on budget Android devices.
2. **Immediate Auto-Open on 100% Download:**
   - When downloading an offline cloud volume, immediately upon reaching 100% transfer completion, resolve the viewer state and open the volume without requiring an extra manual tap or screen reload.

## 3. Pre-Commit Verification Checklist
- [ ] IndexedDB error audit: Verify zero unhandled `isTrusted: true` errors appear in console or logs.
- [ ] Safe wipe check: Confirm store clearance uses `objectStore.clear()` inside a transaction.
- [ ] Mushaf page flip check: Confirm zero layout shift or loading flashes during sequential page turns.
- [ ] PDF rendering test: Verify viewport pages render first without blocking UI threads.
