# Real-device testing guide (Phase 1)

These tests need real phones. They could not be performed in the development environment. Headless Chrome does not do long-press word selection, even on plain HTML, so emulation cannot prove that mobile selection works.

What *was* verified in a 390×844 touch-emulated viewport:

- Nothing in the reader blocks native selection: no `user-select: none`, `pointer-events: none`, `touch-action: none`, or `-webkit-touch-callout: none` on the PDF text layer or its parents.
- A touch at a word lands on its text span.
- Once the phone has selected a word, Voca shows the bottom sheet within about 0.6 s. The word is scrolled above the sheet, and choosing a meaning, adding a note, and tapping Save store the correct definition, sentence, page, and book.

What remains is the step only the phone's browser does: **turning a long-press into a word selection** on the PDF text layer.

---

## 1. Get the app onto your phone

### Option A — before deploying (word selection and layout only)

1. On the PC: `npm run build`, then `npx vite preview --host`.
2. Note the "Network" URL it prints, e.g. `http://192.168.1.20:4173/voca/`. Allow Node.js through the Windows firewall if asked.
3. Connect the phone to the **same Wi-Fi** and open that URL.

This is plain HTTP, so the service worker, install, and offline mode **won't work** in this option. That is expected.

### Option B — after deploying (everything, including install and offline)

Open `https://asimalrimi.github.io/voca/`.

You need a text-based test PDF on the phone. `voca-test-book.pdf` from testing works, or any e-book PDF. Use the Files app (iOS) or Downloads (Android).

---

## 2. Word selection — the most important test

Do this on **iPhone Safari**, the **iPhone Home Screen app** (after Option B), and **Android Chrome**.

| # | Step | Expected | Pass? |
| --- | --- | --- | --- |
| 1 | Library → **Add PDF** → choose the PDF | Book appears with a cover; "Added …" message | |
| 2 | Tap the book | Reader opens; "1 / N" at the bottom | |
| 3 | Long-press a word in the middle of a line | Phone selects the word (blue highlight, handles). The phone's own menu (Copy/Look Up) may appear near the word | |
| 4 | Wait about half a second | Voca's sheet slides up from the bottom showing that word; the word stays visible above the sheet | |
| 5 | Check the sheet | Phonetic, play-sound icon, one or more meanings with part of speech, the sentence from the book with "— p. N" | |
| 6 | Tap a different meaning | It becomes highlighted | |
| 7 | Tap **Add a note or example**, type a note | The keyboard doesn't hide the field; the page doesn't zoom in | |
| 8 | Tap **Save to Vocabulary** | "Saved to Vocabulary" in the sheet and a "Saved …" message | |
| 9 | Close the sheet (×) or tap the page | Sheet closes; highlight cleared | |
| 10 | Long-press a word near the **bottom** of the screen | Same as 3–4; the page scrolls so the word is above the sheet | |
| 11 | Long-press a word, then drag a handle to cover two words | Message "Select a single word — phrases aren't supported yet." | |
| 12 | Drag a handle to select only part of a long word | Sheet shows the whole word | |
| 13 | Open **Vocabulary**, tap the saved word | Chosen meaning, note, sentence, "From <book>, p. N" | |
| 14 | **Practice** → Start → answer by tapping | Feedback, Next, results | |

If step 3 fails (no highlight at all), note the phone model, OS version, browser, and PDF. Also check whether long-pressing text elsewhere in Voca (e.g. a word in Vocabulary) does select. That tells a PDF text-layer problem apart from a page-wide one.

If steps 3 works but 4 fails (highlight, but no sheet), note it. That is a Voca bug in selection detection.

## 2c. Reader redesign (branch `feature/pdf-reader-redesign`)

| # | Step | Expected | Pass? |
| --- | --- | --- | --- |
| 1 | Open a book | Top bar and bottom bar stay visible the whole time | |
| 2 | Tap the page | Nothing changes (no hidden controls) | |
| 3 | Bottom bar: arrows, tap the page number, − / + | Page turns, Go to page opens, zoom changes | |
| 4 | Aa → Sepia, then Night | Page colours change; long-press still selects words | |
| 5 | Aa → Pages | One page per screen; swipe left/right or use the arrows to turn pages | |
| 6 | In Pages mode, long-press and adjust a word selection | The page does **not** turn | |
| 7 | Pinch with two fingers (Aa → Pinch zoom: Sharp) | Page grows smoothly, then becomes sharp; text still selectable; pan with one finger | |
| 8 | Same with Pinch zoom: Browser | Old behaviour (Safari zooms the whole screen) | |
| 9 | Long-press a word | Small card next to the word: word, phonetic, first meaning, Save, More | |
| 10 | Tap More | Full sheet with all meanings; pick one; Save | |
| 11 | ☰ (Contents) | Chapters (if the PDF has them) and Bookmarks tabs; tapping one jumps there | |
| 12 | Close and reopen the book | Theme, mode and page are restored | |
| 13 | Swipe right on the first page / left edge | Stays in the book (doesn't go back to the Library) | |

## 2b. Scroll modes and pinch-zoom (added 2026-11-08)

| # | Step | Expected | Pass? |
| --- | --- | --- | --- |
| 1 | In the reader, tap the two-rectangles icon in the top bar | Pages now sit side by side; same page and zoom | |
| 2 | Swipe left / right | Moves through pages; the page number at the bottom follows | |
| 3 | Tap the icon again | Back to vertical scrolling on the same page | |
| 4 | Close and reopen the book | The mode you chose is kept | |
| 5 | **Pinch-zoom in** with two fingers, then long-press a word | A small definition card appears right next to the word, normal-sized and fully on screen (not a huge or off-screen panel) | |
| 6 | While zoomed, select a word near the right edge and one near the bottom | The card moves to the side/above so it stays on screen and doesn't cover the word | |
| 7 | Pinch back out and select a word | The usual bottom sheet is used again | |

In the emulator, pinch-zoom was simulated with Chrome's page-scale setting, which produces the same `visualViewport` state as a real pinch. The real iOS gesture still needs confirming on the phone.

## 3. Layout and safe areas (iPhone with Face ID)

| Check | Expected | Pass? |
| --- | --- | --- |
| Bottom navigation bar | Sits above the home indicator line, not on it | |
| Reader top bar (Home Screen app) | Back button and title below the notch/Dynamic Island | |
| Reader bottom controls | Above the home indicator; hide when scrolling down, return when scrolling up | |
| Dialogs (Add word, Delete, Import) | Open as bottom sheets; buttons fully visible above the home indicator | |
| Rotate to landscape in the reader | Page re-fits; nothing cut off | |
| Zoom buttons | − / + / fit-width change the page size | |

## 4. Install and offline (Option B only)

| Check | Expected | Pass? |
| --- | --- | --- |
| iOS: Share → **Add to Home Screen** | Voca icon (white V on black); opens full-screen without Safari UI | |
| Android: menu → **Install app** | Installs; opens standalone | |
| In the installed app: add a book, save two words | Works | |
| Turn on **Airplane mode**, fully close and reopen the app | Library loads | |
| Open the book offline | Pages render; words can be selected | |
| Select a word offline | "You're offline…" with **Save without definition** | |
| Vocabulary and Practice offline | Work normally | |
| Vocabulary → ⋯ → **Export backup** | iOS/Android share sheet opens → Save to Files works | |
| Import that file back | Preview shows 0 new / 0 updated / N skipped | |

Note: on iPhone, Safari and the Home Screen app have **separate storage**. Books added in Safari won't appear in the installed app.

## 5. Updates (after a later deployment)

| Check | Expected | Pass? |
| --- | --- | --- |
| Deploy a new version, fully close and reopen the installed app (on iOS, twice) | New version loads; books, words, bookmarks, and progress still there | |
