# Voca — Phase 1 Scope: Frontend Development

| | |
| --- | --- |
| **Phase** | 1 — Frontend Development |
| **Status** | Implemented and browser-tested; real-device testing pending (see [DEVICE_TESTING.md](DEVICE_TESTING.md)) |
| **Last updated** | 2026-11-08 |
| **How it is built** | [PHASE_1_IMPLEMENTATION_PLAN.md](PHASE_1_IMPLEMENTATION_PLAN.md) |

## Product Vision

Voca is a vocabulary-learning application that lets users read PDF books, discover unfamiliar words, save them, and practise them later.

## Phase 1 Objective

A functional, responsive frontend with local data persistence that demonstrates the complete primary experience — **upload → read → select word → understand → save → practise** — without a backend.

## How it was tested

- **Unit tests** (`npm test`, Node's built-in runner, 13 tests): word validation, practice question generation and ambiguity rules, backup parsing and import planning, dictionary retry behaviour.
- **Browser tests:** scripted runs against the **production build** (`vite preview`) in headless Chrome, driven over the DevTools protocol. They used desktop (1280×860) and mobile-emulated (390×844, touch enabled) viewports, with the service worker both active and bypassed, and with the network cut off for offline tests.
- **Not possible from the development environment:** real iOS Safari / Android Chrome, real touch long-press selection, real safe-area insets, real PWA installation. See [DEVICE_TESTING.md](DEVICE_TESTING.md).

Legend: ✅ verified in the browser · 🧪 verified by unit tests only · 📱 needs a real device · ⬜ not tested.

---

## Requirements status

### 1. Application foundation
| Requirement | Status |
| --- | --- |
| React + Vite, Tailwind, dark theme | ✅ |
| HashRouter; refresh and deep links (`#/read/<id>`, unknown routes → Library) | ✅ |
| Responsive layout: desktop sidebar, mobile bottom bar, no horizontal overflow at 390 px | ✅ |
| iOS safe-area insets (notch, home indicator) | 📱 (CSS in place; emulation reports zero insets) |
| PWA manifest, icons (192/512/180 at correct sizes), no Chrome installability errors | ✅ |
| Actual install on desktop / Android / iOS | 📱 |
| GitHub Pages deployment | ⬜ (not deployed by request) |

### 2. Library
| Requirement | Status |
| --- | --- |
| Upload by button; non-PDF rejected with message | ✅ |
| Drag & drop upload (desktop) with drop overlay | ✅ |
| Persistence across reload | ✅ |
| Progress on cards, "Continue reading" | ✅ |
| Delete with confirmation; reading progress removed with it | ✅ |
| Saved words kept after their book is deleted; link to the deleted book shows "Book not found" | ✅ |
| Storage-full (quota) error message | 🧪 code path only (cannot fill quota in test) |

### 3. Reader
| Requirement | Status |
| --- | --- |
| Render with the local PDF.js worker (no CDN) | ✅ |
| Page indicator, next/previous, go to page | ✅ |
| Zoom in/out, fit to width | ✅ |
| Resume at last page (no flicker); bookmarks persist; bookmarks list | ✅ |
| Back button → Library (from Library, direct link, refresh); browser back/forward | ✅ |
| Scanned-PDF notice | ✅ |
| Select a word with the mouse (double-click / drag), incl. split spans, partial selection, hyphenated line breaks | ✅ |
| Multi-word selection → hint; already-saved word → "Already in your vocabulary" | ✅ |
| Lookup panel: meanings, phonetic, part of speech, choose meaning, note, save, confirmation | ✅ desktop popover · ✅ mobile bottom sheet |
| Popover never covers the selected word (desktop); word scrolled above the sheet (mobile) | ✅ |
| Dictionary failures handled (retry, offline message, save without definition) | ✅ |
| **Long-press word selection on a real phone** | 📱 **not verifiable here** (see below) |

### 4. Vocabulary
| Requirement | Status |
| --- | --- |
| List, details (definition, sentence, page, source, note, synonyms, stats) | ✅ |
| Search, filters (part of speech, needs definition), sort | ✅ |
| Add manually with lookup; duplicate add blocked | ✅ |
| Edit with dictionary lookup | ✅ |
| Delete with confirmation | ✅ |
| Export JSON (desktop download) | ✅ |
| Export via share sheet (iOS/Android) | 📱 |
| Import: preview counts New/Updated/Skipped correct (2/1/7 test case) | ✅ |
| Import: unchanged file → "Nothing to import"; cancel → no change | ✅ |
| Import: invalid JSON, non-Voca file, newer-version file → message, no change | ✅ |
| Import atomicity: forced conflict mid-import → error, nothing written | ✅ |
| Import keeps existing word ids (practice stats stay linked) | ✅ |

### 5. Practice
| Requirement | Status |
| --- | --- |
| Definition → Word, Word → Definition, Mixed sessions to completion | ✅ |
| Feedback, results screen, retry missed | ✅ |
| Stats saved and shown on word cards | ✅ |
| Keyboard (1–3, Enter) | ✅ |
| Fewer than 3 valid words → guidance | ✅ |
| Ambiguous definitions → skipped / clear message | ✅ + 🧪 |

### 6. Offline and updates (production build, service worker active)
| Requirement | Status |
| --- | --- |
| Service worker registers and controls the app | ✅ |
| Precache contains app shell, Reader chunk, PDF.js worker, icons | ✅ |
| Offline reload: Library loads | ✅ |
| Offline: stored PDF opens and renders | ✅ |
| Offline: Vocabulary and Practice work; lookup shows "You're offline" and allows saving | ✅ |
| New build: new service worker takes over an open page; stale-chunk reload; data intact | ✅ |
| Offline / update behaviour in an installed app on iOS and Android | 📱 |

---

## Out of Scope for Phase 1

Backend, authentication, cloud or cross-device sync, server-side PDF storage, AI explanations or exercises, payments, social features, phrase saving, EPUB/other formats, OCR, light theme.

## Deliverables

1. Installable PWA ready for GitHub Pages.
2. Library, Reader with select-to-save, Vocabulary with backup, Practice in three modes.
3. Unit tests (`npm test`).
4. Documentation: `README.md`, `CLAUDE.md`, this scope, the implementation plan, device-testing guide.

## Remaining before Phase 1 is complete

- [ ] Real-device tests in [DEVICE_TESTING.md](DEVICE_TESTING.md) (iPhone Safari, iPhone Home Screen app, Android Chrome).
- [ ] Deploy to GitHub Pages and repeat the install/offline checks on the live HTTPS URL.
