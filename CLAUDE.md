# CLAUDE.md

Context and working rules for Claude Code sessions in this repository. Read this file before making changes.

- Setup commands and the public feature list: [README.md](README.md)
- What Phase 1 includes and its checklist: [docs/PHASE_1_SCOPE.md](docs/PHASE_1_SCOPE.md)
- How Phase 1 is being built (steps, data model, decisions, status): [docs/PHASE_1_IMPLEMENTATION_PLAN.md](docs/PHASE_1_IMPLEMENTATION_PLAN.md)
- Manual tests that need real phones: [docs/DEVICE_TESTING.md](docs/DEVICE_TESTING.md)

---

## Project Overview

**Voca** is a vocabulary-learning web app built around reading. The user uploads PDF books, reads them in the app, selects an unfamiliar word to see its definition, saves it, and later practises saved words with quizzes.

- **Core value (highest priority):** read a PDF → select a word → understand it → save it. Treat the reader and word selection as the most important code in the app.
- **Problem it solves:** looking up, recording, and reviewing words usually happen in separate tools; Voca keeps them in one place.
- **Intended users:** language learners and readers on desktop or phone.
- **Current phase:** Phase 1 — frontend only, all data stored in the browser.

---

## Technology Stack

| Area | Technology |
| --- | --- |
| UI | React 19 (functional components + hooks) |
| Build | Vite 8, `@vitejs/plugin-react` |
| Language | JavaScript (ES modules, `.jsx`). No TypeScript. |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite`. Tokens + shared component classes in `src/index.css` (`@theme`, `@layer components`). No `tailwind.config.js`. |
| Routing | `react-router-dom` v7 with **`HashRouter`** (URLs like `/voca/#/vocabulary`) |
| PWA | `vite-plugin-pwa` (`autoUpdate`, Workbox `generateSW`) |
| Storage | IndexedDB via the hand-written wrapper `src/utils/indexedDB.js` (no library) |
| PDF | `@react-pdf-viewer/core` 3.12 + plugins `page-navigation` and `zoom` (3.12), on `pdfjs-dist` 3.11.174. **Keep these pinned for Phase 1.** |
| Lint | ESLint 10 flat config, `eslint-plugin-react-hooks` v7 (includes React Compiler rules such as `set-state-in-effect`, `purity`, `refs`), `eslint-plugin-react-refresh` |

External services (browser `fetch`, no API keys):

- `https://api.dictionaryapi.dev` — definitions, phonetics, audio (`src/services/dictionaryService.js`). It intermittently returns 502 without CORS headers (seen by the browser as "Failed to fetch"); the service retries those twice (0.7 s, 1.5 s). Timeouts (8 s) are **not** retried. `parseEntries()` merges all entries, groups meanings by part of speech (≤6 per part of speech, ≤16 total), dedupes definitions, keeps per-meaning examples/synonyms/antonyms, per-accent pronunciations (US/UK/…), origin, and the Wiktionary source link.
- Results are cached in memory (LRU, 200 words, incl. base forms) and concurrent lookups of one word share a single request; a caller's AbortSignal only stops that caller waiting.
- `https://api.datamuse.com` — optional synonyms via `getSynonyms()`, fetched in the background by `useWordLookup` only when the dictionary has none. Never delays the definition; failures resolve to `[]`.

The PDF.js worker is **bundled locally** (`import … from "pdfjs-dist/build/pdf.worker.min.js?url"`) so its version always matches the installed `pdfjs-dist` and reading works offline. Never load it from a CDN.

---

## Project Architecture

Layering: **pages → components / hooks → services → `utils/indexedDB.js`**. `utils/` is React-free.

```
src/
├── main.jsx                  HashRouter + ToastProvider; reloads once on stale-chunk errors after a deploy
├── App.jsx                   Shell: Navbar + <main>; reader route renders full-screen without the shell
├── index.css                 Theme tokens, focus styles, .btn/.icon-btn/.card/.input/.chip, safe-area helpers
├── pdf-viewer-overrides.css  Dark theme + text-layer selection styling for react-pdf-viewer
├── router/AppRouter.jsx      "/", "/read/:bookId" (lazy-loaded), "/vocabulary", "/practice", "*" → "/"
├── pages/
│   ├── Library.jsx           Book grid, continue-reading card, upload (button + page-wide drag & drop), delete
│   ├── Reader.jsx            Loads book + progress, object URL lifecycle, back-to-Library logic
│   ├── Vocabulary.jsx        Search, filters, sort, add/edit/delete, export/import, backup reminder
│   └── Practice.jsx          Mode setup, quiz session, results, retry missed
├── components/
│   ├── common/               Icon, Modal (native <dialog>), ConfirmDialog, StatusMessage, ToastProvider
│   ├── layout/               Navbar (sidebar / mobile bottom bar), PageHeader
│   ├── library/              BookCard, BookCover
│   ├── pdf/                  PDFReader, ReaderToolbar (fixed toolbar + phone bottom bar), DisplayMenu (Aa), ReaderNavigator
│   │                         (contents + bookmarks), WordLookupPanel (card / sheet / side panel), GoToPageDialog
│   ├── vocabulary/           WordCard, AddWordDialog, EditWordDialog, SenseList, ImportDialog
│   └── practice/             PracticeSetup, QuestionCard, ResultScreen
├── context/ToastContext.js   The only React context (app-wide action feedback)
├── hooks/                    useBooks, useVocabulary, useReadingProgress, useWordSelection, useWordLookup,
│                             useToast, useMediaQuery, useDebouncedValue, useObjectUrl, useVisualViewport,
│                             useReaderPreferences, useReaderGestures
├── services/                 bookService, readingProgressService, vocabularyService, practiceService,
│                             dictionaryService, backupService
└── utils/                    indexedDB (DB access + StorageError), textSelection (PDF selection → word),
                              words (validation/normalisation), practice (quiz generation), backup (file
                              format + merge plan), format (display helpers), popoverPosition (placement),
                              readerPreferences, readerGestures (tap/swipe/pinch math), outline (PDF contents)

tests/                        (repo root) Node unit tests for utils + dictionary service — `npm test`
```

### IndexedDB schema (`voca-db`, version 2)

| Store | Key | Indexes | Record |
| --- | --- | --- | --- |
| `books` | `id` | — | `{ id, title, author, fileName, size, file: Blob, createdAt }` (v1 records lack `fileName`/`size`; handled) |
| `readingProgress` | `bookId` | — | `{ bookId, lastPage, pageCount, bookmarks: number[], lastOpenedAt, updatedAt }` |
| `vocabulary` | `id` | `wordKey` (unique), `createdAt` | `{ id, word, wordKey, phonetic, audio, pos, definition, example, origin, synonyms[], note, source: { bookId, bookTitle, page, sentence } \| null, createdAt, updatedAt }` |
| `practiceStats` | `wordId` | — | `{ wordId, seen, correct, streak, lastPracticedAt }` |

`localStorage` holds only `voca.lastExportAt` (backup reminder) and `voca.reader.prefs` (reader display preferences: theme, mode, direction, zoom preset, pinch mode; the old `voca.reader.scrollMode` key is migrated); `voca.chunkReloadAt` is in sessionStorage.

### Reader layout (branch `feature/pdf-reader-redesign`)

- **Fixed toolbar, always visible** (`ReaderToolbar.jsx`) — the user rejected hidden/auto-hiding controls and tap zones; don't reintroduce them. Desktop: back, title · previous / editable page number "of N" / next · zoom out / zoom drop-down (Fit width, Fit page, percentages) / zoom in · Contents, View settings (Aa), bookmark. Phones: back, title, Contents, Aa, bookmark on top, plus a fixed bottom bar (`ReaderBottomBar`) with previous / page (tap → Go to page) / next and zoom out / in.
- Clicking or tapping the page does nothing except text selection.
- **View settings (Aa)** (`DisplayMenu`, non-modal so changes preview live): page theme Paper/Sepia/Night, reading Scroll/Pages, direction Vertical/Horizontal; on phones also zoom presets + steps and pinch mode Sharp/Browser. Saved via `useReaderPreferences`.
- **Themes** tint only the page canvas with CSS filters (`pdf-viewer-overrides.css`); the transparent text layer is untouched, so selection keeps working.
- **Modes** map to the viewer's `ScrollMode` (Vertical / Horizontal / Page) via `switchScrollMode`, obtained through a tiny local plugin object (`viewerBridge` in `PDFReader.jsx`) — no extra package. The viewer keeps the zoom and scrolls back to the current page; page events are ignored for 700 ms during a switch.
- **Gestures** (`useReaderGestures` + pure `utils/readerGestures.js`): touch swipes turn pages in Pages mode (never while text is selected or for slow drags); arrow / Page keys turn pages in Pages mode; no tap handling is wired up. One-finger sideways moves at a scroll edge are `preventDefault`ed so Chrome's swipe-back doesn't close the book.
- **Sharp pinch** (touch, `pinch: "sharp"`): the page area gets `touch-action: pan-x pan-y` (no browser zoom), the gesture shows a CSS-transform preview, then `zoomTo()` re-renders the PDF at the new scale and the scroll is corrected around the pinch point. `pinch: "browser"` restores the old browser zoom (fallback). Ctrl/⌘+wheel zooms the same way on desktop.
- **Word lookup**: compact card next to the word (Save / More); More → bottom sheet on phones, 400 px side panel on desktop (the page area shrinks so the text isn't covered).
- **Contents**: `doc.getOutline()` → `utils/outline.js` flattens and resolves destinations to pages; PDFs without an outline show a friendly empty state.
- Horizontal mode uses CSS `scroll-snap-type: x proximity` with `scroll-snap-align: start`. **Keep `start`:** the viewer aligns a page's left edge when navigating; `center` broke go-to-page/previous on wide screens.

### Popover positioning and pinch-zoom

- Pinch-zoom on phones/trackpads zooms the *visual* viewport only. All panel positioning uses `useVisualViewport()` (`window.visualViewport`) plus the pure `utils/popoverPosition.js#placePopover()` (unit-tested), in layout-viewport px.
- The compact card is placed next to the word on every device, counter-scaled with `transform: scale(1/scale)` when the browser is pinch-zoomed so it keeps its normal size; it never covers the word and stays inside the visible area. The expanded phone sheet is anchored to the visible bottom (also above the iOS keyboard).

### How word selection works

`useWordSelection` listens to `selectionchange` and waits until the selection settles (mouse released / touch handles idle). `utils/textSelection.js` rebuilds the page's text-layer text in reading order — joining spans that belong to one word, re-joining hyphenated line breaks, inserting paragraph breaks on large gaps or font-size changes — then expands the selection to whole-word boundaries and validates it as a single word. `WordLookupPanel` (popover on desktop, non-modal bottom sheet on mobile) looks the word up, lets the user pick the meaning that fits, add a note/example, and save. Invalid selections show a short hint.

---

## Development Guidelines

- Reusable components in `src/components/<domain>/`; one page per route in `src/pages/`.
- Business logic goes in services (data, external APIs) and React-free utils (pure logic). Pages should not touch IndexedDB or `fetch` directly.
- Hooks in `src/hooks/` named `useXxx`. Use context only for truly app-wide state (today: toasts).
- Naming: `PascalCase.jsx` components; `camelCase.js` services/utils/hooks; `UPPER_SNAKE_CASE` constants; `onXxx` props, `handleXxx` handlers.
- Styling: Tailwind utilities + tokens in `src/index.css`. Prefer the shared classes (`btn btn-primary`, `icon-btn`, `card`, `input`, `chip`) over new one-off styles. Don't hard-code colours that have a token.
- Avoid new dependencies; never install packages without the user's approval.

### IndexedDB rules (must follow)

- Never `await` network or unrelated async work inside a transaction. Prepare data first, then open the transaction and issue requests synchronously.
- Use `runTransaction()`; it resolves on `complete` and rejects on `error`/`abort` with a `StorageError` (`code`: `quota`, `constraint`, `duplicate`, `blocked`, …).
- Multi-store operations (delete book + progress, delete word + stats, import) run in **one** transaction so they are atomic.
- Schema changes: bump `DB_VERSION`, add stores/indexes in `upgrade()` by `oldVersion`, never delete user data.

## Coding Guidelines

- Functional components and hooks only; follow the react-hooks v7 lint rules (derive state instead of setting it in effects; no impure calls like `Date.now()` during render).
- Every async view handles loading, error, and empty states. Don't swallow errors: show them or `console.warn` with context.
- Keyboard and screen-reader support: real `<button>`s, labels on icon buttons, visible focus (`:focus-visible`), Esc closes dialogs/panels.
- Mobile: 40px+ touch targets, safe-area insets (`env(safe-area-inset-*)`), 16px inputs on iOS.
- Revoke object URLs (`useObjectUrl`).
- Before finishing: `npm run lint` (must pass), `npm test`, and `npm run build`.

### Tests

- `npm test` runs `tests/*.test.mjs` with Node's built-in test runner (Node 21+; no test dependency).
- Tests import the React-free modules directly, so **imports inside `src/utils/*` and `src/services/dictionaryService.js` must use explicit `.js` extensions** (`from "./words.js"`). Vite accepts both.
- Add tests for pure logic (selection → word, practice generation, backup/import) when changing it. UI flows were verified with scripted headless-Chrome runs against `vite preview`; real phones are covered by `docs/DEVICE_TESTING.md`.

---

## Important Project Decisions

| Decision | Status |
| --- | --- |
| Frontend-only; no backend, auth, sync, or AI in Phase 1 | Implemented |
| Books, progress, vocabulary, stats in IndexedDB (schema above) | Implemented |
| `HashRouter`; Vite `base: '/voca/'`; PWA `start_url`/`scope` `/voca/` | Implemented |
| Reader is its own route (`#/read/:bookId`); its back button always lands on the Library | Implemented |
| PDF.js worker bundled locally and precached | Implemented |
| Reader route lazy-loaded; `vite:preloadError` triggers one reload after a deploy | Implemented |
| Bookmarks: multiple pages per book, persisted | Implemented |
| Single words only (no phrases) for saving | Implemented |
| Reader scroll modes: vertical / horizontal (per-device preference) | Implemented |
| Lookup panel positioned against the visual viewport (pinch-zoom safe) | Implemented |
| Practice: Definition → Word, Word → Definition, Mixed; 3 choices; min 3 words; ambiguous questions skipped | Implemented |
| Vocabulary JSON export/import with preview (new/updated/skipped) and atomic apply; words only | Implemented |
| Dark theme only; responsive (sidebar ≥ md, floating bottom bar on mobile) | Implemented |
| Deploy: GitHub Actions on push to `main` → GitHub Pages | Implemented |

Never change the `/voca/` base without updating `vite.config.js` (base + manifest) together.

---

## Instructions for Future Claude Sessions

1. Read this file first.
2. Inspect the relevant page, components, hooks, services, and utils before proposing changes.
3. Preserve the architecture above unless there is a clear reason; explain significant changes (dependencies, router, IndexedDB schema, PDF library, PWA config) before implementing them.
4. Protect the core workflow (read → select → define → save → practise). Re-test word selection after any reader change.
5. Update this file, `README.md`, and the docs in `docs/` when decisions or implementation status change.
6. Do not commit, push, or install packages unless the user asks.
7. Never read or print `.env.local` (git-ignored, unused by the code).
