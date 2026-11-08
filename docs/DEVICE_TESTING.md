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
