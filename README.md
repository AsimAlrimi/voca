# Voca

Voca is a vocabulary-learning web app for people who learn new words while reading. Upload your PDF books, read them in the app, select a word you don't know to see its definition, save it, and practise it later.

Voca runs entirely in your browser, keeps your books and words on your own device, and can be installed as a Progressive Web App (PWA) on desktop and mobile.

> **Status:** Phase 1 (frontend only) is implemented and browser-tested; testing on real phones is pending. See [docs/PHASE_1_SCOPE.md](docs/PHASE_1_SCOPE.md) and [docs/DEVICE_TESTING.md](docs/DEVICE_TESTING.md).

**Live app:** https://asimalrimi.github.io/voca/

---

## Features

### Library
- Add PDFs with the **Add PDF** button (multiple at once) or by dragging files onto the page (desktop).
- Non-PDF and damaged files are rejected with a clear message; storage-full errors are explained.
- Books are stored in your browser (IndexedDB) and remain after refreshing or reopening the app.
- Each book shows reading progress; a **Continue reading** card opens the last book you read.
- Delete a book (with confirmation). Words you saved from it are kept.

### Reader
- Full-screen dark reader with a compact toolbar.
- Page indicator, previous/next, and **go to page**.
- Zoom in/out (50–300%) and **fit to width**.
- Reopens at the page where you stopped.
- Bookmark any page; jump to bookmarks from the bookmarks list.
- **Select a word** (double-click on desktop, long-press on mobile) to see its definition, pronunciation, phonetic spelling and part of speech, pick the meaning that fits, add a note or example, and **save it to your vocabulary**. The sentence from the book and the page number are saved with the word.
- Works with words split across PDF text runs and words hyphenated across lines. Selecting several words shows a hint (Phase 1 supports single words).
- If the dictionary can't be reached, you can still save the word and add a definition later.

### Vocabulary
- Search (word, definition, note, book), filter by part of speech or "needs definition", sort.
- Word details: definition, example, book sentence, note, synonyms, origin, source book and page, practice accuracy, pronunciation.
- Add words manually (with dictionary lookup), edit, delete (with confirmation).
- **Export** a JSON backup and **import** it again. Import shows how many words are new, updated, and skipped before anything changes.

### Practice
- Three modes: **Definition → Word**, **Word → Definition**, and **Mixed**; 5, 10 or 20 questions.
- Questions come from your saved words (at least 3 with definitions). Questions whose answers would be ambiguous are skipped.
- Feedback after each answer, results with words to review, and **retry missed**.
- Per-word practice history is saved; the words you know least come first.
- Keyboard: `1`–`3` to answer, `Enter` to continue.

### App
- Installable PWA; app shell, PDF engine, and icons are cached for offline use.
- Offline: your library, stored books, vocabulary, and practice work; dictionary lookups need a connection.
- Responsive layout with iOS safe-area support; keyboard navigation and visible focus states.

### Known limitations
- Data lives in one browser on one device. There is no sync. Use **Export** regularly as a backup.
- Scanned (image-only) PDFs have no selectable text; the reader says so.
- Phrases (multi-word selections) can't be saved yet.
- No pinch-to-zoom inside the reader; use the zoom buttons.

---

## Technology Stack

| Purpose | Technology |
| --- | --- |
| UI | React 19 |
| Build | Vite 8 |
| Language | JavaScript (JSX) |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 (`HashRouter`) |
| PDF | `@react-pdf-viewer/core` 3.12 (+ `page-navigation`, `zoom`) on `pdfjs-dist` 3.11 |
| Offline / install | `vite-plugin-pwa` (Workbox) |
| Storage | IndexedDB |
| Dictionary | [Free Dictionary API](https://dictionaryapi.dev/), [Datamuse](https://www.datamuse.com/api/) |
| Hosting | GitHub Pages via GitHub Actions |

---

## Project Structure

```
voca/
├── .github/workflows/deploy.yml   # Build and deploy to GitHub Pages
├── docs/                          # Phase 1 scope, implementation plan, device-testing guide
├── public/                        # Icons (favicon, PWA, Apple touch icon)
├── src/
│   ├── components/                # UI by feature: common, layout, library, pdf, vocabulary, practice
│   ├── context/                   # Toast context
│   ├── hooks/                     # Reusable React logic (books, vocabulary, selection, lookup, …)
│   ├── pages/                     # Library, Reader, Vocabulary, Practice
│   ├── router/                    # Routes
│   ├── services/                  # Data and external APIs (IndexedDB, dictionary, backup)
│   ├── utils/                     # Pure helpers: IndexedDB wrapper, word/selection logic, quiz logic
│   ├── App.jsx, main.jsx, index.css
├── tests/                         # Unit tests (npm test)
├── CLAUDE.md                      # Context for AI-assisted development
├── index.html
├── package.json
└── vite.config.js
```

---

## Installation and Setup

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/AsimAlrimi/voca.git
cd voca
npm install
npm run dev
```

Open the URL Vite prints (the app is served under `/voca/`, e.g. `http://localhost:5173/voca/`).

```bash
npm run build     # production build in dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
npm test          # unit tests (Node 21+ built-in test runner)
```

To try the app on a phone on the same Wi-Fi before deploying, run `npm run build && npx vite preview --host` and open the printed Network URL. Install and offline mode need HTTPS, so test those on the deployed site.

---

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main`: Node 20 → `npm install` → `npm run build` → upload `dist/` → deploy to GitHub Pages.

```bash
git push origin main
```

One-time setting: **Settings → Pages → Source: GitHub Actions**.

The app is served from `/voca/` (`base: '/voca/'` in `vite.config.js`). Routes use the URL hash (`/voca/#/vocabulary`), so refreshing any page works on GitHub Pages.

**Updates:** the service worker downloads a new version in the background. It is used the next time the app is opened (on iOS, close the app fully and reopen it). Your data is not affected by updates.

---

## Data Storage

Everything is stored in your browser on your device (IndexedDB database `voca-db`):

| Data | Store |
| --- | --- |
| PDF files and book details | `books` |
| Last page, page count, bookmarks | `readingProgress` |
| Saved words | `vocabulary` |
| Practice history | `practiceStats` |

- Nothing is uploaded anywhere. Dictionary lookups send only the word to the dictionary API.
- Voca asks the browser for persistent storage, but that is a request, not a guarantee.
- Browsers can clear website data (for example Safari after a period without use, or when the device is low on space). Clearing site data, private browsing, or uninstalling the app also removes it. **Export your vocabulary regularly** (Vocabulary → ⋯ → Export backup).
- On iPhone/iPad, Safari and the Home Screen app keep **separate** storage.

---

## Future Development

After Phase 1, possible directions include phrase saving, spaced repetition, and optional accounts with sync across devices. These are ideas, not commitments.
