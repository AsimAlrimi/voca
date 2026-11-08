# Voca — Phase 1 Implementation Plan

| | |
| --- | --- |
| **Phase** | 1 — Frontend Development |
| **Status** | Approved (A1–A7) — in implementation. Revised with corrections A–F (see §8). |
| **Prepared** | 2026-11-08 |
| **Related** | [PHASE_1_SCOPE.md](PHASE_1_SCOPE.md) (what), this document (how), [../CLAUDE.md](../CLAUDE.md) (rules) |

This plan describes how to finish Phase 1 using the existing React + Vite + Tailwind stack, with no backend and all data stored in IndexedDB.

---

## 0. Agreed Decisions

These were approved by the project owner and are the basis of this plan.

| # | Decision | Consequence |
| --- | --- | --- |
| D1 | Use **`HashRouter`**. | URLs become `/voca/#/vocabulary`. Fixes refresh and deep links on GitHub Pages. No `404.html` needed. |
| D2 | Keep **dictionaryapi.dev** and **Datamuse**. | Both are called from the browser. All failures (offline, timeout, not found) must be handled in the UI. |
| D3 | Keep **bookmarks** and persist them. | Stored per book in IndexedDB. |
| D4 | **Vocabulary export/import** is in Phase 1. | JSON backup file; import merges with existing words. |
| D5 | **Two practice directions**: definition → word, word → definition. | Practice offers a direction choice (plus "mixed"). |

---

## 1. Current Implementation Gaps (verified)

Each item was checked against the working tree on 2026-11-08, including the uncommitted changes in `App.jsx`, `Navbar.jsx`, `Practice.jsx`, and `Vocabulary.jsx`.

| # | Previously reported issue | Verified? | Evidence |
| --- | --- | --- | --- |
| G1 | Vocabulary uses hard-coded sample words | ✅ Confirmed | `Vocabulary.jsx`: `const SAMPLE_VOCAB = [...]`, `useState(SAMPLE_VOCAB)`. |
| G2 | Vocabulary changes are not persisted | ✅ Confirmed | Add/delete only call `setVocab`; no storage calls. |
| G3 | Practice doesn't use saved vocabulary | ✅ Confirmed | `Practice.jsx`: separate hard-coded `const VOCAB = [...]`. |
| G4 | Books can't be deleted in the UI | ✅ Confirmed | `removeBook()` in `bookService.js` is never imported. |
| G5 | Bookmarks are not persisted | ✅ Confirmed | `PDFReader.jsx`: `useState(false)` only. Not tied to a page either — it's a single on/off toggle. |
| G6 | PDF.js worker loaded from unpkg | ✅ Confirmed | `PDFReader.jsx`: `workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/..."`. The same file exists locally at `node_modules/pdfjs-dist/build/pdf.worker.min.js` (1.09 MB). |
| G7 | No page number or zoom controls | ✅ Confirmed | `currentPage`, `totalPages`, `jumpToPage` exist but are unused. Scale is fixed to `PageFit`. |
| G8 | Text selection can't save a word | ✅ Confirmed | No selection handling anywhere. |
| G9 | Refresh fails on nested routes on GitHub Pages | ✅ Confirmed | `main.jsx`: `BrowserRouter basename="/voca/"`; no 404 fallback in `public/`. |
| G10 | Dependencies and unused assets need review | ✅ Confirmed | See table below. |

### New findings

| # | Finding | Impact |
| --- | --- | --- |
| N1 | **`npm run lint` fails** with 5 errors and 1 warning: unused `currentPage`, `totalPages`, `jumpToPage` (`PDFReader.jsx`); unused `buildQuestion` and missing effect deps (`Practice.jsx`); empty `catch {}` (`Vocabulary.jsx`). | Must be fixed so lint can be used as a quality gate. |
| N2 | Object URLs are created for **every** book on Library load and never revoked. | Memory leak; grows with library size. |
| N3 | The reader is not a route. It replaces the Library inside `<main>`. Phone back gesture leaves the Library instead of closing the reader; refresh closes the book. | Poor mobile UX; makes "resume reading" harder. |
| N4 | Non-PDF uploads are silently ignored; upload/load errors (including storage quota) are unhandled. No loading state. | Confusing failures, especially on iOS with small quotas. |
| N5 | Drag & drop only works on the empty-state drop zone. | Minor; once a book exists, only the button works. |
| N6 | `shuffle()` uses `sort(() => Math.random() - 0.5)`, which is biased. | Minor; replace with Fisher–Yates. |
| N7 | Vocabulary search compares `w.word.includes(q)` without lowercasing `word`. | Minor bug for capitalised words. |
| N8 | `index.html` has no `apple-touch-icon`, `theme-color`, or `viewport-fit=cover`; layout has no safe-area padding. | iOS Home Screen icon and notch/home-indicator overlap. |
| N9 | PNG/SVG icons are not in the service-worker precache (default glob is `js,css,html`). | Icons may be missing offline. |
| N10 | `dist/` in the working folder is stale (built 2 June). | Ignored by git; no action needed, but don't trust it for testing. |

### Dependencies and assets

| Item | Status | Proposed action |
| --- | --- | --- |
| `@react-pdf-viewer/core` | Used | Keep. |
| `pdfjs-dist` 3.11.174 | Used (peer of core) | Keep; also used for the local worker. |
| `@react-pdf-viewer/page-navigation` | **Imported but undeclared** (comes via `toolbar`) | **Declare** `3.12.0`. |
| `@react-pdf-viewer/zoom` | Not used; available via `toolbar` | **Declare** `3.12.0` and use it for zoom. |
| `@react-pdf-viewer/default-layout` | Unused | Remove. |
| `@react-pdf-viewer/toolbar` | Unused | Remove (after declaring page-navigation and zoom). |
| `@react-pdf-viewer/highlight` | Unused | Remove. Not needed for saving words. |
| `@react-pdf-viewer/search` | Unused | Remove. In-book search is not in Phase 1 scope. |
| `gh-pages` (dev) | Unused | Remove. Deployment uses GitHub Actions. |
| `src/assets/hero.png`, `react.svg`, `vite.svg` | Unused | Delete. |
| `public/favicon.svg`, `public/icons.svg` | Unused | Delete, or use `favicon.svg` in `index.html`. |
| `src/pdf-viewer-overrides.css` | Not imported | Import it in `PDFReader.jsx` and remove the inline `<style>` block, or delete it. Recommend importing (it already uses theme tokens). |

All package changes need approval before running `npm install` / `npm uninstall` (see §7).

---

## 2. Proposed Architecture

### 2.1 Principles

- Keep the current layering: **pages → hooks → services → `utils/indexedDB.js`**.
- No new libraries for state, storage, or UI. No React context: Library, Reader, Vocabulary, and Practice are separate routes and are never on screen together, so each loads what it needs through a hook.
- Pure logic (quiz generation, word normalisation, backup validation) goes in React-free `utils/`.

### 2.2 Routes (HashRouter)

| Hash route | Page | Notes |
| --- | --- | --- |
| `#/` | `Library` | Book grid. |
| `#/read/:bookId` | `Reader` (**new page**) | Full-screen; navbar hidden. Back gesture returns to Library. Refresh keeps the book open. |
| `#/vocabulary` | `Vocabulary` | |
| `#/practice` | `Practice` | |
| `*` | redirect to `#/` | Unknown routes. |

`main.jsx` switches to `<HashRouter>` with **no `basename`** (the hash path starts after `/voca/#`). Vite `base: '/voca/'` and the PWA manifest stay unchanged.

Making the reader a route (N3) is a small architectural change. It is recommended because it fixes back-button behaviour on phones and makes "resume reading" natural. See §7, A2.

### 2.3 How features work together

```
Library ──open──▶ Reader ──select word──▶ SaveWordSheet ──▶ vocabularyService ──▶ IndexedDB
   │                 │                          │
   │                 └─ page change / bookmark ─┴─▶ readingProgressService ─▶ IndexedDB
   │
Vocabulary ◀── useVocabulary ──▶ vocabularyService ◀── backupService (export/import)
   │
Practice  ◀── useVocabulary + utils/practice.js ──▶ practiceService (stats) ──▶ IndexedDB
```

- The **dictionary lookup** is shared by the Vocabulary "Add word" modal and the Reader's save-word sheet through `dictionaryService.lookupWord()`.
- A word saved from the Reader stores its **source** (book ID, book title, page), shown in Vocabulary details.
- Practice reads the same vocabulary store and writes per-word stats.

### 2.4 IndexedDB schema (version 1 → 2)

Database `voca-db`. Version 1 has only `books`. Version 2 adds three stores. The upgrade is additive: existing books are kept.

| Store | keyPath | Indexes | Record |
| --- | --- | --- | --- |
| `books` *(exists)* | `id` | — | `{ id, title, author, file: Blob, size, createdAt }` |
| `readingProgress` *(new)* | `bookId` | — | `{ bookId, lastPage, pageCount, bookmarks: number[], lastOpenedAt, updatedAt }` |
| `vocabulary` *(new)* | `id` | `wordKey` (unique), `createdAt` | see below |
| `practiceStats` *(new)* | `wordId` | — | `{ wordId, seen, correct, streak, lastPracticedAt }` |

**Vocabulary record**

```js
{
  id: "uuid",
  word: "Ephemeral",            // as displayed
  wordKey: "ephemeral",         // lowercase, trimmed; unique → prevents duplicates
  phonetic: "/ɪˈfɛm(ə)r(ə)l/",
  pos: "adjective",
  definition: "Lasting for a very short time.",   // may be "" if saved offline
  example: "",
  origin: "",
  synonyms: [],
  note: "",                     // user's own note
  source: { bookId, bookTitle, page } | null,
  createdAt: 1731000000000,
  updatedAt: 1731000000000,
}
```

**Why these choices**

- **Reading progress is separate from `books`.** Page changes happen often; updating a small record is cheaper and safer than rewriting the record that holds the PDF blob.
- **Bookmarks are a list of page numbers** on the reading-progress record. The bookmark button toggles the current page. This keeps the existing button and makes it meaningful (see §7, A3).
- **`bookTitle` is copied into `source`** so words still show where they came from after the book is deleted.
- **Practice stats are separate** from vocabulary so importing/editing words doesn't touch progress, and progress writes don't rewrite word records.
- **Preferences:** none required. If a reader zoom preference is added, store it in `localStorage` (tiny value). No settings store.
- PDFs stay as `Blob`s in `books`. `getAll()` on Blobs returns references, not file contents, so listing books stays cheap.

**Deleting**

- Delete book → delete `books[id]` and `readingProgress[id]` in one transaction. Vocabulary is kept (source keeps `bookTitle`).
- Delete word → delete `vocabulary[id]` and `practiceStats[id]`.

### 2.5 `utils/indexedDB.js` changes

Replace the book-specific functions with small generic helpers. Keep it hand-written.

- `openDB()` — cached connection; `DB_VERSION = 2`; `onupgradeneeded` creates missing stores and indexes by checking `oldVersion`; `db.onversionchange = () => db.close()` so an old tab doesn't block an upgrade after deployment; `onblocked` rejects with a clear error.
- `getAll(store)`, `getByKey(store, key)`, `getByIndex(store, index, value)`, `put(store, value)`, `remove(store, key)`, `clear(store)`.
- `runTransaction(storeNames, mode, callback)` for multi-store operations (delete book + progress; import).
- `requestPersistentStorage()` → `navigator.storage?.persist?.()`; `getStorageEstimate()` → `navigator.storage?.estimate?.()`.

**Transaction rules (correction A)**

- **No network requests or unrelated `await`s inside an active transaction.** An IndexedDB transaction auto-commits as soon as control returns to the event loop with no pending requests; awaiting a fetch (or anything else) inside it lets it commit early, and later requests throw `TransactionInactiveError`.
- **Prepare first, then write.** Multi-store operations gather everything they need *before* opening the write transaction (e.g. import: parse + validate the file and compute the merge plan from a read-only snapshot; reader save: finish the dictionary lookup first). The transaction callback then only issues IndexedDB requests synchronously (or chained from request callbacks).
- **Resolve on `complete`, not on request success.** `runTransaction` returns a promise that resolves on `tx.oncomplete` and rejects on `tx.onerror` / `tx.onabort` with the underlying error (`tx.error` or the failed request's error). Callers must not assume data is written until it resolves.
- **Atomic multi-store operations.** Book deletion (`books` + `readingProgress`), word deletion (`vocabulary` + `practiceStats`), and vocabulary import run in **one** transaction each. If any request fails, the transaction aborts and nothing is changed. Callback exceptions call `tx.abort()`.
- Errors are surfaced to the UI (no silent `catch {}`); `QuotaExceededError` is mapped to a friendly message.

### 2.6 Files after Phase 1

New files are marked **+**; modified files **~**.

```
src/
├── main.jsx                          ~ HashRouter
├── App.jsx                           ~ hide Navbar on reader route; safe-area padding
├── router/AppRouter.jsx              ~ add /read/:bookId and catch-all
├── pages/
│   ├── Library.jsx                   ~ use useBooks; delete; states; navigate to reader
│   ├── Reader.jsx                    + loads book + progress, renders PDFReader
│   ├── Vocabulary.jsx                ~ use useVocabulary; edit; export/import; no sample data
│   └── Practice.jsx                  ~ use saved words; direction picker; stats
├── components/
│   ├── layout/Navbar.jsx             ~ (minor) safe-area bottom
│   ├── common/ConfirmDialog.jsx      + reusable confirm (delete book/word, import)
│   ├── common/StatusMessage.jsx      + loading / error / empty block
│   ├── library/BookCard.jsx          + moved out of Library.jsx, adds delete menu
│   ├── pdf/PDFReader.jsx             ~ controls, local worker, selection, bookmarks
│   ├── pdf/ReaderControls.jsx        + page indicator, prev/next, jump, zoom, bookmark list
│   ├── pdf/SaveWordSheet.jsx         + lookup + save from selection
│   ├── vocabulary/WordCard.jsx       + moved out of Vocabulary.jsx
│   ├── vocabulary/WordFormModal.jsx  + add (lookup) and edit (manual fields)
│   └── practice/ResultScreen.jsx     + moved out of Practice.jsx
├── hooks/
│   ├── useBooks.js                   + list/add/delete, loading/error
│   └── useVocabulary.js              + list/add/update/delete/import, loading/error
├── services/
│   ├── bookService.js                ~ delete with progress; quota errors
│   ├── readingProgressService.js     + lastPage, bookmarks
│   ├── vocabularyService.js          + CRUD, duplicate check
│   ├── dictionaryService.js          + dictionaryapi.dev + Datamuse, timeout, error types
│   ├── practiceService.js            + record answers, read stats
│   └── backupService.js              + export/import JSON
└── utils/
    ├── indexedDB.js                  ~ v2 schema, generic helpers
    ├── words.js                      + normaliseWord, extractSelectedWord
    ├── practice.js                   + shuffle (Fisher–Yates), buildSession
    └── backup.js                     + build/validate backup file
```

Components are only extracted when they are reused or a file becomes hard to follow — moving `BookCard`, `WordCard`, and `ResultScreen` out is optional cleanup, done while touching those files.

---

## 3. Implementation Steps

Ordered so that the app becomes genuinely usable as early as possible. Each step should end with `npm run lint` and `npm run build` passing.

**Milestones**

- **M1 — Usable (after Step 4):** real books, real saved words, practice on your own words. Everything survives restart.
- **M2 — Core loop (after Step 6):** read → select word → save → practice, with resume and bookmarks.
- **M3 — Phase 1 complete (after Step 9):** backup, offline, iOS polish, QA, docs.

---

### Step 1 — Foundation fixes

**Implement**
- Switch to `HashRouter` (D1); add catch-all route.
- Load the PDF.js worker locally: `import workerUrl from "pdfjs-dist/build/pdf.worker.min.js?url"` and pass it to `<Worker>`. Vite emits it as a hashed asset in `dist/assets/`, so it is precached automatically.
- Dependency cleanup (needs approval, §7 A1): declare `page-navigation` and `zoom`; remove `default-layout`, `toolbar`, `highlight`, `search`, `gh-pages`.
- Delete unused assets; import `pdf-viewer-overrides.css`.
  - **Asset cleanup rules (correction E):** search `src/`, `index.html`, `vite.config.js`, and the manifest for every file before deleting it. Never delete a file still referenced by the app, the manifest, or the build config. After cleanup, the app must still have a valid favicon and both PWA icons (`icon-192.png`, `icon-512.png`); verify `dist/` contains them and the manifest URLs resolve.
- Fix current lint errors (N1) without changing behaviour.

**Files:** `main.jsx`, `router/AppRouter.jsx`, `components/pdf/PDFReader.jsx`, `pages/Practice.jsx`, `pages/Vocabulary.jsx`, `package.json`, `package-lock.json`, `src/assets/*`, `public/favicon.svg`, `public/icons.svg`.

**Depends on:** nothing.

**Test**
- `npm run lint` → 0 errors.
- `npm run build && npm run preview`; open `/voca/#/vocabulary`, refresh → page loads.
- In DevTools → Network, open a book → worker loads from `/voca/assets/pdf.worker.min-*.js`, not unpkg.
- Existing upload and reading still work.

---

### Step 2 — Data layer v2

**Implement**
- Rewrite `utils/indexedDB.js` as in §2.5 with the v2 schema.
- Update `bookService.js` to use the generic helpers; add `deleteBookWithProgress`.
- Create empty-but-working `vocabularyService.js`, `readingProgressService.js`, `practiceService.js`.
- Add `utils/words.js` (`normaliseWord`).

**Files:** `utils/indexedDB.js`, `utils/words.js`, `services/bookService.js`, `services/vocabularyService.js`, `services/readingProgressService.js`, `services/practiceService.js`.

**Depends on:** Step 1.

**Test**
- With books already stored under v1, load the new build → books are still listed (migration kept data).
- DevTools → Application → IndexedDB → `voca-db` shows version 2 and four stores.
- Open the app in two tabs, deploy/rebuild, reload one tab → no "blocked" hang.

---

### Step 3 — Persistent vocabulary

**Implement**
- `useVocabulary` hook: loads words, exposes `addWord`, `updateWord`, `deleteWord`, `status` (`loading` / `ready` / `error`).
- `dictionaryService.lookupWord(word)`: moves the fetch code out of `Vocabulary.jsx`; 8-second timeout with `AbortController`; returns `{ ok: true, entry }` or `{ ok: false, reason: "offline" | "not_found" | "network" }`. Datamuse failure is ignored (synonyms just stay empty).
- Remove `SAMPLE_VOCAB`. Start with an empty list and a helpful empty state.
- **Add word modal:** lookup as today; if lookup fails, show the reason and allow **"Save without definition"** or typing a definition manually.
- **Edit word:** modal with definition, part of speech, example, note.
- **Delete word:** confirmation dialog; also deletes its practice stats.
- Duplicate check by `wordKey` (case-insensitive).
- Fix search to be case-insensitive (N7). Filters: part of speech, plus "Needs definition" when any exist.
- Show source ("from *Book title*, p. 12") in word details when present.

**Files:** `hooks/useVocabulary.js`, `services/vocabularyService.js`, `services/dictionaryService.js`, `pages/Vocabulary.jsx`, `components/vocabulary/WordCard.jsx`, `components/vocabulary/WordFormModal.jsx`, `components/common/ConfirmDialog.jsx`, `components/common/StatusMessage.jsx`.

**Depends on:** Step 2.

**Test**
- Add three words → refresh → close and reopen the browser → all three remain.
- Add "Ephemeral" when "ephemeral" exists → "Already in your list".
- DevTools → Network → Offline → add a word → offline message → save without definition → word shows "Needs definition"; go online, edit → lookup again or type definition.
- Edit and delete work and survive refresh.

---

### Step 4 — Practice from saved vocabulary *(reaches M1)*

**Implement**
- Move quiz logic to `utils/practice.js`: Fisher–Yates `shuffle`; `buildSession(words, { direction, size })`. One function serves both new sessions and "retry missed" (removes the current duplication).
- Directions (D5): **Definition → Word**, **Word → Definition**, **Mixed**. A small selector above the quiz.
- Only words **with a definition** are eligible. Minimum **3** eligible words (3 choices). Below that, show "Save at least 3 words with definitions to practise" with a link to Vocabulary.
- **Unambiguous choices (correction C):**
  - Definition → Word: choices are distinct words (by `wordKey`).
  - Word → Definition: a question is only built when the correct definition and at least two distractor definitions are **distinct** — compared after normalising (lowercase, strip punctuation, collapse whitespace) and rejected if identical or if one contains the other. Distractors whose definitions are too similar to the correct one are skipped.
  - Questions that can't get 2 valid distractors are **skipped**, not shown with multiple apparently correct answers.
  - If fewer than 3 valid questions can be built for the chosen mode, show a helpful message (e.g. "Some of your definitions are too similar to make a fair quiz — try Definition → Word or add more words") instead of starting.
- Session size: up to 10 questions. Prefer words with lower accuracy or not practised recently (simple sort using stats, then shuffle within groups).
- Distractors: prefer other words with the same part of speech; avoid choices with identical text.
- Record each answer with `practiceService.recordAnswer(wordId, isCorrect)`.
- Keep keyboard shortcuts; fix the effect dependency warning.
- Show simple progress per word in Vocabulary details (e.g. "Practised 5 times · 80% correct"). Optional, small.

**Files:** `utils/practice.js`, `services/practiceService.js`, `pages/Practice.jsx`, `components/practice/ResultScreen.jsx`, optionally `components/vocabulary/WordCard.jsx`.

**Depends on:** Step 3.

**Test**
- With 0–2 words → guidance message, no crash.
- With ≥ 3 words → both directions produce correct questions; answers marked correctly.
- Retry missed uses only missed words.
- After a session, stats in IndexedDB `practiceStats` increase; refresh keeps them.
- Practice works with network disabled.

---

### Step 5 — Library completion

**Implement**
- `useBooks` hook with `status` and `error`.
- Loading state, empty state (keep current drop zone), and error state.
- Upload: clear message for non-PDF files; catch `QuotaExceededError` → "Not enough storage space on this device".
- Call `requestPersistentStorage()` after the first successful upload.
- Delete book: visible "⋯" menu button on each card (works on touch, no hover needed) → confirm → removes book and reading progress.
- Object URLs: don't create them for the grid. Create one only when a book is opened, revoke it on close (N2).
- Allow drag & drop on the whole Library page, not only the empty state (N5).
- Show reading progress on each card (e.g. "p. 34 / 210") once Step 6 exists.

**Files:** `hooks/useBooks.js`, `pages/Library.jsx`, `components/library/BookCard.jsx`, `services/bookService.js`.

**Depends on:** Step 2.

**Test**
- Upload `.txt` → message shown, nothing stored.
- Delete a book → gone after refresh; its `readingProgress` record is gone; words saved from it remain with the book title.
- Upload with DevTools storage quota throttled (Application → Storage → simulate custom quota) → friendly error.
- Library with 10+ books loads quickly; no object URLs leak (check Memory or just repeat open/close).

---

### Step 6 — Reader: route, controls, progress, bookmarks

**Implement**
- New `pages/Reader.jsx` at `#/read/:bookId`: loads the book and its progress; handles "book not found" (e.g. deleted) with a link back. Navbar is hidden on this route.
- **Navigation (correction B):** Library opens books with `navigate('/read/' + id)`, so browser/OS back naturally returns to the Library. The reader's **own** back button always navigates to the Library (`/`) — it never relies on `navigate(-1)`, because the reader may have been opened directly from a link or refreshed, in which case there is no Library entry in history. To avoid stacking history entries, when the reader was opened from the Library (`location.state.fromLibrary`), the back button uses `navigate(-1)`; otherwise `navigate('/', { replace: true })`. Either way the user lands on the Library.
- `ReaderControls`:
  - Page indicator `12 / 240`.
  - Previous / next page buttons; tap the indicator to type a page number.
  - Zoom out / zoom in / fit page (zoom plugin `zoomTo`); clamp between 50% and 300% to protect memory on phones.
  - Bookmark toggle for the **current page**; bookmark list to jump to a bookmarked page.
- Reading progress: `onPageChange` saves `lastPage` (debounced ~1 s); open with `initialPage = lastPage`; `onDocumentLoad` stores `pageCount`.
- Controls stay visible on desktop; on mobile keep the current tap-to-show behaviour but with larger touch targets.

**Files:** `pages/Reader.jsx`, `router/AppRouter.jsx`, `App.jsx`, `components/pdf/PDFReader.jsx`, `components/pdf/ReaderControls.jsx`, `services/readingProgressService.js`, `pages/Library.jsx`.

**Depends on:** Steps 1, 2, 5.

**Test**
- Open a book, go to page 30, refresh → still on page 30. Close and reopen the app → page 30.
- Bookmark pages 5 and 30 → refresh → both in the list; jumping works; un-bookmark works.
- Phone back gesture / browser back closes the reader.
- `#/read/unknown-id` → "Book not found".
- Zoom in/out/fit works on desktop and phone.

---

### Step 7 — Save a word from the reader *(reaches M2)*

**Implement**
- In `PDFReader`, listen to `selectionchange` (debounced) within the viewer container.
- `utils/words.js → extractSelectedWord(text)`: trim, strip surrounding punctuation, accept a single word (letters, apostrophe, hyphen, up to ~40 chars). Multi-word selections show no button in Phase 1.
- When a valid word is selected, show a floating **"Save "word""** button **anchored to the bottom of the screen** (avoids the iOS/Android native selection menu, which appears near the selection).
- Tapping it opens `SaveWordSheet`: runs `lookupWord`, shows definition, phonetic, part of speech; **Save** stores the word with `source: { bookId, bookTitle, page }`.
- Already saved → show "Already in your vocabulary" with the saved definition.
- Lookup failed/offline → "Save without definition" (D2).
- Clear the selection after saving.

**Files:** `components/pdf/PDFReader.jsx`, `components/pdf/SaveWordSheet.jsx`, `utils/words.js`, `services/vocabularyService.js`, `services/dictionaryService.js`.

**Depends on:** Steps 3 and 6.

**Test**
- Desktop: double-click a word → button → save → appears in Vocabulary with source and page.
- iPhone Safari and Android Chrome: long-press a word → button visible and not covered by the native menu → save works.
- Select a sentence → no button. Select "word," → saves "word".
- Offline → save without definition works.
- Scanned PDF (no text layer) → nothing selectable; no errors.

---

### Step 8 — Vocabulary export / import (D4)

**Implement**
- **Export:** button in Vocabulary → file `voca-vocabulary-YYYY-MM-DD.json`:
  ```json
  { "app": "voca", "type": "vocabulary", "version": 1, "exportedAt": "...", "words": [ ... ] }
  ```
  Use `navigator.share({ files })` when `navigator.canShare` supports files (best on iOS, lets the user save to Files); otherwise a download link (`<a download>` + Blob URL).
- **Import (correction F):** file picker (`.json`) → validate with `utils/backup.js` → compute a merge plan against the current vocabulary → **preview** showing counts of **New**, **Updated**, and **Skipped** words → user must **confirm** → apply in **one atomic transaction**.
  - Merge rule (unchanged): match by `wordKey`; new words are added; for existing words keep the one with the newer `updatedAt`.
    - *New*: `wordKey` not in the current vocabulary.
    - *Updated*: exists, and the imported copy has a newer `updatedAt` (existing `id` is kept so practice stats stay linked).
    - *Skipped*: exists and the current copy is the same age or newer, or the entry is invalid / duplicated within the file.
  - The plan is computed before the write transaction opens (correction A). If the transaction fails, nothing is imported.
  - Invalid file → clear error, nothing changed. Cancel at the preview → nothing changed.
- Practice stats are **not** included in the backup (see §7 A4).

**Files:** `services/backupService.js`, `utils/backup.js`, `pages/Vocabulary.jsx`, `hooks/useVocabulary.js`.

**Depends on:** Step 3.

**Test**
- Export → clear site data → import → all words back with sources and notes.
- Import the same file twice → no duplicates.
- Import a random JSON / corrupt file → error, vocabulary unchanged.
- Export on iPhone (Safari and installed PWA) → file can be saved to Files.

---

### Step 9 — PWA, offline, iOS polish, QA *(reaches M3)*

**Implement**
- PWA config (see §4): precache icons; confirm worker is precached; keep `autoUpdate`.
- `index.html`: `apple-touch-icon`, `theme-color`, `viewport-fit=cover`, title "Voca".
- Safe areas: `env(safe-area-inset-*)` padding for mobile navbar, reader top bar, and bottom save button. Use `dvh` instead of `100vh`/`h-screen` where full-height matters.
- Offline indicator: small banner when `navigator.onLine` is false (lookups unavailable; everything else works).
- iOS hint in Library empty state: books are stored on this device; Safari and the Home Screen app keep separate storage.
- Full QA pass against §5 on desktop Chrome, desktop Safari/Firefox (smoke test), iPhone Safari, iPhone installed PWA, Android Chrome.
- Update `CLAUDE.md`, `README.md`, `PHASE_1_SCOPE.md` (statuses, routing decision, data model, decisions D1–D5).

**Files:** `vite.config.js`, `index.html`, `App.jsx`, `components/layout/Navbar.jsx`, `components/pdf/*`, `src/index.css`, docs.

**Depends on:** all previous steps.

**Test:** §4 and §5 checklists.

---

### Step summary

| Step | Title | Depends on | Milestone |
| --- | --- | --- | --- |
| 1 | Foundation fixes (HashRouter, local worker, deps, lint) | — | |
| 2 | Data layer v2 | 1 | |
| 3 | Persistent vocabulary | 2 | |
| 4 | Practice from saved vocabulary | 3 | **M1 usable** |
| 5 | Library completion | 2 | |
| 6 | Reader route, controls, progress, bookmarks | 1, 2, 5 | |
| 7 | Save word from reader | 3, 6 | **M2 core loop** |
| 8 | Export / import | 3 | |
| 9 | PWA, offline, iOS polish, QA, docs | all | **M3 done** |

Steps 5 and 8 are independent of 3–4 and can be swapped if priorities change.

---

## 4. Offline and PWA Behaviour

### 4.1 What must change

| Goal | Today | Change |
| --- | --- | --- |
| **Saved PDFs open offline** | Fails: worker loads from unpkg. | Bundle the worker via `?url` import (Step 1). It lands in `dist/assets/` and matches the default precache glob (`**/*.{js,css,html}`). Size 1.09 MB is under Workbox's 2 MB default limit. PDFs themselves come from IndexedDB, so no network is needed. |
| **Vocabulary viewable and practisable offline** | Sample data only. | Vocabulary, stats, and practice read only from IndexedDB (Steps 3–4). No network calls on those pages except lookup. |
| **Dictionary APIs unavailable** | Generic "Word not found". | `dictionaryService` distinguishes offline / timeout / not found. UI offers "Save without definition" or manual entry. Words without a definition are flagged and excluded from practice. |
| **App shell offline** | Precached. | Keep. `navigateFallback` to `index.html` (plugin default) works for the root URL; with HashRouter every route is the same document. |
| **Icons offline** | Not precached. | Add `workbox.globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}']` or `includeAssets`. |

Not cached: dictionary API responses. Saved words already contain their data, so caching lookups adds complexity without real benefit.

Known limitation: PDFs that need external CMaps (some CJK documents) may render incorrectly. Out of scope for Phase 1.

### 4.2 Updates after deployment

Current config: `registerType: 'autoUpdate'` with the injected `registerSW.js`.

- On the next launch after a deploy, the browser fetches the new service worker; it installs, activates immediately, and removes outdated precaches. The page currently open keeps running the old version until the next reload. This does not interrupt reading or a quiz. **Keep this behaviour.**
- The app is a single JS bundle (plus the worker), so there are no missing lazy chunks after an update.
- **Data compatibility is the real risk.** Rules:
  - IndexedDB schema changes are **additive** and done in `onupgradeneeded` by `oldVersion`. Never delete or rename stores holding user data without a migration.
  - `onversionchange` closes old connections so a new version's upgrade isn't blocked by an old tab.
  - Backup file has its own `version` field for future format changes.
- `start_url` and `scope` stay `/voca/`. Existing installs keep working after the HashRouter change because routes now live after `#`.
- Test: install the PWA, deploy a visible change, close and reopen the app (twice on iOS) → new version shown, data intact.

### 4.3 iOS Safari specifics

| Topic | Behaviour | Handling |
| --- | --- | --- |
| Separate storage | Safari and the Home Screen app have **separate** IndexedDB data. | Tell users in the empty state; recommend using the installed app. Export/import moves vocabulary between them. PDFs must be re-uploaded. |
| Eviction | Safari may evict website data after prolonged lack of interaction (~7 days of use without visiting) and under device storage pressure. Installed Home Screen apps have different storage behaviour, but local data is **never a guaranteed backup**. | Call `navigator.storage.persist()` where supported — it is a **request**, which the browser may deny or ignore, not a guarantee. Encourage install; prompt users to **export vocabulary regularly** (e.g. a reminder in Vocabulary when there is no recent export). UI copy must never promise that data cannot be lost. |
| Quota | Smaller than desktop; large PDFs can fail. | Catch `QuotaExceededError`; show storage estimate if useful. |
| Text selection | Long-press selects words in the PDF.js text layer; native callout appears near the selection. | Save button anchored at the bottom. Needs real-device testing. |
| Zoom | No pinch-zoom inside the viewer (react-pdf-viewer limitation). | +/– buttons; clamp to 300% to avoid memory crashes. |
| Download | `<a download>` is unreliable in standalone mode. | Use Web Share with files for export. |
| Safe areas | Notch and home indicator overlap fixed UI. | `viewport-fit=cover` + `env(safe-area-inset-*)`. |
| Icon | iOS needs `apple-touch-icon`. | Add to `index.html`. |
| SW updates | iOS checks for updates less eagerly. | Fully close and reopen the app; documented in README. |

---

## 5. Acceptance Criteria

Phase 1 is complete when every item passes on **desktop Chrome**, **iPhone Safari**, the **installed iPhone PWA**, and **Android Chrome** (installed PWA), unless marked otherwise. This list supersedes the checklist in `PHASE_1_SCOPE.md`, which will be updated to match.

### Build and deployment
- [ ] `npm run lint` reports 0 errors; `npm run build` succeeds.
- [ ] Push to `main` deploys to GitHub Pages.
- [ ] Opening or refreshing `/voca/#/vocabulary`, `/voca/#/practice`, and `/voca/#/read/<id>` loads the correct screen.
- [ ] Every imported package is declared; no unused packages remain.
- [ ] No request to unpkg or any CDN while reading.

### Library
- [ ] Upload a PDF by button (all devices) and by drag & drop (desktop).
- [ ] Non-PDF file → clear message.
- [ ] Books remain after refresh, closing the browser, and reopening the installed app.
- [ ] Delete a book with confirmation; it stays deleted after refresh.
- [ ] Loading, empty, and error states are shown appropriately.
- [ ] Storage-full error shows a friendly message.

### Reader
- [ ] Open and read a stored PDF.
- [ ] Current page / total pages is visible; previous, next, and go-to-page work.
- [ ] Zoom in, zoom out, and fit-to-page work.
- [ ] Reopening a book returns to the last page read (after refresh and app restart).
- [ ] Bookmark the current page; bookmarks persist and can be used to jump to a page; can be removed.
- [ ] Back button / phone back gesture returns to the Library.
- [ ] Controls are not hidden behind the notch or home indicator on iPhone.

### Saving words
- [ ] Select a single word in a text-based PDF → "Save" action appears (desktop double-click; mobile long-press).
- [ ] Saved word includes definition (when available), source book, and page.
- [ ] Saving a word that already exists shows "already saved" instead of a duplicate.
- [ ] Offline or lookup failure → word can be saved without a definition and completed later.

### Vocabulary
- [ ] No sample data; a new user sees an empty state.
- [ ] Words persist after restart.
- [ ] Search (case-insensitive) and part-of-speech filter work.
- [ ] View details, edit (definition, example, note, part of speech), delete with confirmation.
- [ ] Manual add with dictionary lookup works online; graceful message offline.

### Backup
- [ ] Export creates a JSON file (desktop download; iPhone share sheet → Save to Files).
- [ ] Import restores words after clearing site data.
- [ ] Re-importing the same file creates no duplicates.
- [ ] Invalid file → error message, no data changed.

### Practice
- [ ] Questions come only from saved words that have definitions.
- [ ] Fewer than 3 eligible words → guidance message.
- [ ] Definition → Word, Word → Definition, and Mixed all work.
- [ ] Feedback after each answer; score and missed words at the end; retry missed.
- [ ] Per-word practice stats persist after restart.
- [ ] Keyboard shortcuts work on desktop.

### Offline, PWA, and responsive
- [ ] App installs from Chrome (desktop/Android) and via Share → Add to Home Screen on iOS.
- [ ] With network off: the installed app opens, Library lists books, a stored book opens and renders, Vocabulary and Practice work.
- [ ] With network off: dictionary lookup shows an offline message; nothing crashes.
- [ ] After a new deployment, the installed app updates on relaunch and all data is intact.
- [ ] All screens usable at ~375 px (phone) and ≥ 1024 px (desktop); no horizontal scrolling.
- [ ] Touch targets are at least ~40 px on mobile.

---

## 6. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Text selection in the PDF text layer is unreliable on iOS (selection handles, callout overlap). | Medium | Bottom-anchored button; test early on a real iPhone during Step 7. Fallback: "Add word" button in the reader that opens the manual add modal. |
| Large PDFs exhaust memory or quota on phones. | Medium | Zoom clamp, quota error handling, `storage.persist()`. |
| Free dictionary APIs are slow, rate-limited, or down. | Medium | Timeout, manual definition entry, save without definition. |
| iOS data eviction or Safari/PWA storage split confuses users. | Medium | In-app hint, export/import. |
| react-pdf-viewer 3.x is no longer actively maintained and is tied to pdfjs-dist 3.x. | Low for Phase 1 | Keep versions pinned; don't upgrade pdfjs-dist independently. Revisit in a later phase. |
| IndexedDB upgrade blocked by an old open tab. | Low | `onversionchange` → close; `onblocked` message. |

---

## 7. Decisions Needing Approval

| # | Question | Recommendation |
| --- | --- | --- |
| A1 | **Package changes:** add `@react-pdf-viewer/page-navigation@3.12.0` and `@react-pdf-viewer/zoom@3.12.0`; remove `@react-pdf-viewer/default-layout`, `toolbar`, `highlight`, `search`, and `gh-pages`. Both added packages are already in `node_modules` (via `toolbar`), so nothing new is downloaded. | Approve. |
| A2 | **Make the reader a route** (`#/read/:bookId`) instead of an overlay inside Library. | Approve. Fixes back gesture and refresh; needed for clean "resume reading". |
| A3 | **Bookmarks as multiple pages per book** (toggle current page + list to jump), separate from the automatic "last read page". | Approve. Alternative: a single bookmark per book. |
| A4 | **Backup contents:** words only (with source and notes), not practice stats or PDFs. | Approve. Keeps the file small and simple. |
| A5 | **Minimum words for practice:** 3 (matches 3 answer choices). Alternative: 4 choices / 4 words. | 3 choices, 3 words. |
| A6 | **Unused assets:** delete `src/assets/*`, `public/favicon.svg`, `public/icons.svg`; import `pdf-viewer-overrides.css`. | Approve. |
| A7 | **Multi-word selections** (phrases) are not saveable in Phase 1. | Approve; revisit later. |

All of A1–A7 were approved on 2026-11-08.

---

## 8. Implementation status (2026-11-08)

All five stages are implemented. Verification status is tracked in [PHASE_1_SCOPE.md](PHASE_1_SCOPE.md#acceptance-criteria).

Changes made during implementation, with reasons:

| Change | Why |
| --- | --- |
| `vocabulary.source` also stores `sentence`; vocabulary records add `audio` | Sentence from the book gives context in Vocabulary and Practice; `audio` enables pronunciation. Additive fields, no schema version change. |
| `books` records add `fileName`, `size`; file stored as a plain `Blob` | Display metadata; avoids depending on `File` support in IndexedDB. v1 records handled. |
| Word lookup shows several meanings and lets the user pick one; tries base forms ("running" → "run") | Saves the meaning that fits the book; more lookups succeed. |
| Reader route is lazy-loaded; `vite:preloadError` reloads once | Main bundle 784 KB → 309 KB. The reload prevents a missing-chunk error on pages left open across a deployment. |
| PWA icons resized to the sizes the manifest declares (both were 500×500); `apple-touch-icon.png` added | Correct install icons on Chrome and iOS. Originals backed up outside the repo. |
| `src/assets/*`, `public/favicon.svg`, `public/icons.svg` deleted | Verified unreferenced (they were Vite template files). Favicon is `icon-192.png`. |
| Datamuse synonym lookup has its own 2.5 s timeout | It's optional and was slow/unreachable during testing; definitions no longer wait for it. |
| Toasts (`ToastContext`) are the only React context | App-wide action feedback. |
| Reading-position events ignored for 800 ms after a book opens | The viewer briefly reports page 1 while it jumps to the saved page. |

Testing done: ESLint, production build, 10 Node unit tests for word validation, practice ambiguity rules and import planning, and a scripted end-to-end run in headless Chrome over the DevTools protocol (no extra dependencies). The run covered the Library, Reader, word selection and saving, Vocabulary, and part of Practice. Not yet tested: mobile viewport, real iOS/Android devices, PWA install and offline mode, export/import UI, deployment.

### Stabilization pass (2026-11-08)

Testing only; no new features. Results are in [PHASE_1_SCOPE.md](PHASE_1_SCOPE.md), and what still needs a phone is in [DEVICE_TESTING.md](DEVICE_TESTING.md).

| Issue found | Cause | Fix | Re-tested |
| --- | --- | --- | --- |
| About half of live lookups showed "The dictionary isn't responding" | dictionaryapi.dev intermittently returns 502 without CORS headers → browser "Failed to fetch" | Retry transient failures up to twice (0.7 s, 1.5 s); never retry not-found or offline | 10/10 live lookups OK; 3 unit tests with mocked fetch |
| On mobile, the lookup sheet (up to ~62 % of the screen) could hide a word selected low on the page | Sheet is fixed to the bottom; no scroll adjustment | On mobile, scroll the selected word into the top ~30 % when the sheet opens | Word moved from y=650 to y=177, above the sheet (top 498) |
| In Definition → Word mode, the ambiguity message suggested switching to "Definition → Word" | Message didn't depend on the mode | Mode-specific message | Browser test |
| Unit tests lived outside the repo | — | Moved to `tests/`, added `npm test`; tested modules use explicit `.js` imports | 13/13 pass |

## 9. Revision log

| Date | Change |
| --- | --- |
| 2026-11-08 | Plan approved with corrections: **A** IndexedDB transaction rules (§2.5); **B** reader back button always lands on Library (Step 6); **C** unambiguous practice choices (Step 4); **D** iOS storage/data-safety wording (§4.3); **E** verify references before asset cleanup (Step 1); **F** import preview with New/Updated/Skipped + confirmation + atomic apply (Step 8). |
| 2026-11-08 | Execution order follows the owner's stages: (1) foundation + Library, (2) Reader, (3) vocabulary workflow incl. save-from-selection, (4) practice, (5) backup, PWA/offline, iOS polish, QA, docs. This merges plan Steps 1, 2, 5 → Stage 1; Step 6 → Stage 2; Steps 3, 7 → Stage 3; Step 4 → Stage 4; Steps 8, 9 → Stage 5. |
