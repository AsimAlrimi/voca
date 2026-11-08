import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollMode, SpecialZoomLevel, Viewer, Worker } from "@react-pdf-viewer/core";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
// Bundled locally (same version as the installed pdfjs-dist) so reading works offline.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import "../../pdf-viewer-overrides.css";

import Icon from "../common/Icon";
import useToast from "../../hooks/useToast";
import useMediaQuery from "../../hooks/useMediaQuery";
import useVisualViewport, { isPinchZoomed } from "../../hooks/useVisualViewport";
import useReadingProgress from "../../hooks/useReadingProgress";
import useWordSelection, { clearDocumentSelection } from "../../hooks/useWordSelection";
import { SELECTION_MESSAGES } from "../../utils/words";
import { BookmarkToggle, PageControls, ScrollModeToggle, ZoomControls } from "./ReaderControls";
import WordLookupPanel from "./WordLookupPanel";
import GoToPageDialog from "./GoToPageDialog";
import BookmarksDialog from "./BookmarksDialog";

const SCROLL_CONTAINER = ".rpv-core__inner-pages";
const SCROLL_MODE_KEY = "voca.reader.scrollMode";

function readScrollModePreference() {
  try {
    return localStorage.getItem(SCROLL_MODE_KEY) === ScrollMode.Horizontal ? ScrollMode.Horizontal : ScrollMode.Vertical;
  } catch {
    return ScrollMode.Vertical; // storage unavailable (e.g. private mode)
  }
}

function saveScrollModePreference(mode) {
  try {
    localStorage.setItem(SCROLL_MODE_KEY, mode);
  } catch (error) {
    console.warn("Couldn't remember the scroll mode", error);
  }
}

export default function PDFReader({ book, fileUrl, initialProgress, onBack }) {
  // react-pdf-viewer plugins use hooks internally: create them unconditionally on every render.
  const pageNavigation = pageNavigationPlugin();
  const zoom = zoomPlugin();
  const { jumpToPage, jumpToNextPage, jumpToPreviousPage } = pageNavigation;
  const { zoomTo, CurrentScale } = zoom;

  // Minimal local plugin: the viewer hands plugins its functions on install; we only need
  // switchScrollMode (no extra dependency). Created once so the viewer installs it once.
  const switchScrollModeRef = useRef(null);
  const [scrollModeBridge] = useState(() => ({
    install: (functions) => {
      switchScrollModeRef.current = functions.switchScrollMode;
    },
  }));
  const [scrollMode, setScrollMode] = useState(readScrollModePreference);
  const [initialScrollMode] = useState(scrollMode);

  const toast = useToast();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const viewport = useVisualViewport();
  const progress = useReadingProgress(book.id, initialProgress);
  const { handlePageChange, handleDocumentLoad } = progress;

  const viewerRootRef = useRef(null);
  const toolbarRef = useRef(null);
  const closeOnClear = useRef(false);

  const [lookup, setLookup] = useState(null); // valid word selection
  const [hint, setHint] = useState(null); // message for an unsupported selection
  const [dialog, setDialog] = useState(null); // "page" | "bookmarks" | null
  const [chromeVisible, setChromeVisible] = useState(true);
  const [docLoaded, setDocLoaded] = useState(false);
  const [noTextLayer, setNoTextLayer] = useState(false);

  // Defaults chosen once: fit width on small screens, comfortable fixed zoom on desktop.
  const [defaultScale] = useState(() =>
    window.matchMedia("(max-width: 1023px)").matches ? SpecialZoomLevel.PageWidth : 1.25
  );
  const [initialPage] = useState(() => Math.max(0, (initialProgress?.lastPage ?? 1) - 1));
  // While opening at a saved page, the viewer briefly reports other pages as it measures
  // page sizes. Ignore page events during a short settle window after the document loads.
  const settled = useRef(initialPage === 0);

  // ── Word selection ────────────────────────────────────────────────────────
  const handleSelection = useCallback((result) => {
    if (!result) {
      setHint(null);
      if (closeOnClear.current) {
        closeOnClear.current = false;
        setLookup(null);
      }
      return;
    }
    closeOnClear.current = false;
    if (result.ok) {
      setHint(null);
      setLookup(result);
    } else {
      setHint(SELECTION_MESSAGES[result.reason] ?? SELECTION_MESSAGES["not-a-word"]);
    }
  }, []);

  useWordSelection(viewerRootRef, handleSelection);

  // Tapping/clicking the page (outside the panel) dismisses the panel once the selection clears.
  const handleViewerPointerDown = () => {
    if (lookup) closeOnClear.current = true;
  };

  const closeLookup = useCallback(() => {
    setLookup(null);
    clearDocumentSelection();
  }, []);

  const handleWordSaved = useCallback(
    (record) => {
      clearDocumentSelection(); // remove highlight; panel stays to show "Saved"
      if (isMobile) toast.show(`Saved “${record.word}” to Vocabulary`, { type: "success" });
    },
    [isMobile, toast]
  );

  // Mobile: the bottom sheet covers the lower part of the screen. Scroll the selected word
  // into the visible top area so the user can still see it in context.
  const lookupKey = lookup ? `${lookup.word}-${lookup.page}` : null;
  const usesSheet = isMobile && !isPinchZoomed(viewport);
  useEffect(() => {
    if (!usesSheet || !lookupKey) return;
    const scroller = viewerRootRef.current?.querySelector(SCROLL_CONTAINER);
    const selection = window.getSelection();
    if (!scroller || !selection?.rangeCount) return;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    if (rect.height && rect.bottom > visibleHeight * 0.3) {
      scroller.scrollBy({ top: rect.bottom - visibleHeight * 0.22, behavior: "smooth" });
    }
    // Run only when a new word opens the sheet, not on every viewport change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupKey]);

  // Auto-dismiss the unsupported-selection hint.
  useEffect(() => {
    if (!hint) return undefined;
    const timer = setTimeout(() => setHint(null), 3500);
    return () => clearTimeout(timer);
  }, [hint]);

  // ── Scroll: auto-hide chrome on mobile, keep the desktop popover attached ──
  useEffect(() => {
    if (!docLoaded) return undefined;
    const scroller = viewerRootRef.current?.querySelector(SCROLL_CONTAINER);
    if (!scroller) return undefined;
    let lastTop = scroller.scrollTop;
    let lastLeft = scroller.scrollLeft;

    const onScroll = () => {
      const top = scroller.scrollTop;
      const left = scroller.scrollLeft;
      // Moving forward in either direction (down or right) hides the mobile controls.
      const delta = top - lastTop + (left - lastLeft);
      lastTop = top;
      lastLeft = left;
      if (isMobile && Math.abs(delta) > 6) setChromeVisible(delta < 0 || (top < 40 && left < 40));

      // Keep the popover attached to the selected word while the pages scroll.
      const selection = window.getSelection();
      if (selection?.rangeCount && !selection.isCollapsed && viewerRootRef.current?.contains(selection.anchorNode)) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        setLookup((current) => (current ? { ...current, rect } : current));
      }
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [docLoaded, isMobile]);

  // ── Document events ──────────────────────────────────────────────────────
  const onDocumentLoad = useCallback(
    (event) => {
      const { doc } = event;
      handleDocumentLoad(doc.numPages);
      setDocLoaded(true);
      setTimeout(() => {
        settled.current = true;
      }, 800);

      // Detect scanned PDFs (no text layer) so we can explain why words can't be selected.
      const pagesToCheck = Math.min(doc.numPages, 3);
      Promise.all(
        Array.from({ length: pagesToCheck }, (_, i) => doc.getPage(i + 1).then((page) => page.getTextContent()))
      )
        .then((contents) => {
          const hasText = contents.some((content) => content.items.some((item) => item.str?.trim()));
          setNoTextLayer(!hasText);
        })
        .catch((error) => console.warn("Text layer check failed", error));
    },
    [handleDocumentLoad]
  );

  const onPageChange = useCallback(
    (event) => {
      if (!settled.current) return;
      handlePageChange(event.currentPage + 1);
    },
    [handlePageChange]
  );

  const goToPage = useCallback((page) => jumpToPage(page - 1), [jumpToPage]);

  // Switching keeps the zoom (viewer state) and scrolls back to the current page. While the
  // layout changes the viewer reports intermediate pages, so ignore page events briefly.
  const handleToggleScrollMode = () => {
    const switchScrollMode = switchScrollModeRef.current;
    if (!switchScrollMode) return;
    const next = scrollMode === ScrollMode.Horizontal ? ScrollMode.Vertical : ScrollMode.Horizontal;
    settled.current = false;
    switchScrollMode(next);
    setScrollMode(next);
    saveScrollModePreference(next);
    setLookup(null);
    clearDocumentSelection();
    setTimeout(() => {
      settled.current = true;
    }, 700);
  };

  const handleToggleBookmark = async () => {
    try {
      const added = await progress.toggleCurrentBookmark();
      toast.show(added ? `Bookmarked page ${progress.currentPage}` : `Removed bookmark from page ${progress.currentPage}`, {
        type: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Bookmark failed", error);
      toast.show(`Couldn't update bookmark: ${error.message}`, { type: "error" });
    }
  };

  const handleRemoveBookmark = async (page) => {
    try {
      await progress.removeBookmark(page);
    } catch (error) {
      console.error("Removing bookmark failed", error);
      toast.show(`Couldn't remove bookmark: ${error.message}`, { type: "error" });
    }
  };

  useEffect(() => {
    if (progress.saveError) {
      toast.show("Your reading position couldn't be saved on this device.", { type: "error" });
    }
  }, [progress.saveError, toast]);

  const showBottomBar = chromeVisible && !lookup;

  const pageControls = (
    <PageControls
      currentPage={progress.currentPage}
      pageCount={progress.pageCount}
      onPrevious={jumpToPreviousPage}
      onNext={jumpToNextPage}
      onOpenJump={() => setDialog("page")}
      compact={isMobile}
    />
  );

  const zoomControls = (
    <CurrentScale>
      {({ scale }) => (
        <ZoomControls
          scale={scale}
          onZoom={zoomTo}
          onFitWidth={() => zoomTo(SpecialZoomLevel.PageWidth)}
          showLabel={!isMobile}
        />
      )}
    </CurrentScale>
  );

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-background text-text-primary">
      {/* ── Top bar ── */}
      <header
        ref={toolbarRef}
        className="z-20 shrink-0 border-b border-border bg-surface"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-14 items-center gap-1 px-2 md:gap-2 md:px-3">
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to Library" title="Back to Library">
            <Icon name="arrowLeft" size={20} />
          </button>
          <div className="min-w-0 flex-1 md:flex-none md:basis-64 lg:basis-80">
            <h1 className="m-0 truncate text-sm font-medium" title={book.title}>
              {book.title}
            </h1>
          </div>

          {!isMobile && (
            <>
              <div className="flex flex-1 justify-center">{pageControls}</div>
              {zoomControls}
              <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            </>
          )}

          <ScrollModeToggle
            horizontal={scrollMode === ScrollMode.Horizontal}
            onToggle={handleToggleScrollMode}
            disabled={!docLoaded}
          />
          <BookmarkToggle active={progress.isBookmarked} onToggle={handleToggleBookmark} page={progress.currentPage} />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setDialog("bookmarks")}
            aria-label={`Bookmarks (${progress.bookmarks.length})`}
            title="Bookmarks"
          >
            <span className="relative">
              <Icon name="bookmarks" size={19} />
              {progress.bookmarks.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 text-[9px] font-semibold text-background">
                  {progress.bookmarks.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </header>

      {noTextLayer && docLoaded && (
        <div className="z-10 border-b border-border bg-surface px-4 py-2 text-xs text-text-secondary md:text-center" role="note">
          <Icon name="info" size={13} className="mr-1.5 inline align-[-2px]" />
          This PDF looks scanned, so words can’t be selected. Voca needs PDFs with real text.
        </div>
      )}

      {/* ── Document ── */}
      <div
        ref={viewerRootRef}
        className="relative min-h-0 flex-1"
        onPointerDown={handleViewerPointerDown}
      >
        <Worker workerUrl={pdfWorkerUrl}>
          <Viewer
            fileUrl={fileUrl}
            theme="dark"
            plugins={[pageNavigation, zoom, scrollModeBridge]}
            scrollMode={initialScrollMode}
            defaultScale={defaultScale}
            initialPage={initialPage}
            onDocumentLoad={onDocumentLoad}
            onPageChange={onPageChange}
            renderLoader={(percent) => <DocumentLoader percent={percent} />}
            renderError={(error) => <DocumentError error={error} onBack={onBack} />}
          />
        </Worker>
      </div>

      {/* ── Mobile bottom bar ── */}
      {isMobile && (
        <div
          className={`absolute inset-x-3 z-20 flex items-center justify-between rounded-2xl border border-white/10 bg-surface/90 px-1 backdrop-blur-xl transition-all duration-200 ${
            showBottomBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
          }`}
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {pageControls}
          {zoomControls}
        </div>
      )}

      {/* ── Selection feedback ── */}
      {hint && !lookup && (
        <div
          role="status"
          className="absolute inset-x-0 z-30 flex justify-center px-4"
          style={{ bottom: isMobile ? "calc(env(safe-area-inset-bottom) + 5rem)" : "1.5rem" }}
        >
          <p className="m-0 flex animate-slide-up items-center gap-2 rounded-xl border border-border-strong bg-surface-raised px-4 py-2.5 text-sm text-text-primary shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <Icon name="info" size={16} className="text-text-secondary" />
            {hint}
          </p>
        </div>
      )}

      {lookup && (
        <WordLookupPanel
          key={`${lookup.word}-${lookup.page}`}
          selection={lookup}
          book={book}
          compact={isMobile}
          viewport={viewport}
          toolbarRef={toolbarRef}
          onClose={closeLookup}
          onSaved={handleWordSaved}
        />
      )}

      <GoToPageDialog
        open={dialog === "page"}
        currentPage={progress.currentPage}
        pageCount={progress.pageCount}
        onGo={goToPage}
        onClose={() => setDialog(null)}
      />
      <BookmarksDialog
        open={dialog === "bookmarks"}
        bookmarks={progress.bookmarks}
        currentPage={progress.currentPage}
        pageCount={progress.pageCount}
        onGo={goToPage}
        onRemove={handleRemoveBookmark}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function DocumentLoader({ percent }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-text-secondary" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      <p className="m-0 text-sm">Opening book… {Math.round(percent)}%</p>
    </div>
  );
}

function DocumentError({ error, onBack }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
      <span className="text-danger">
        <Icon name="alert" size={28} />
      </span>
      <p className="m-0 text-base font-medium">This PDF couldn’t be opened</p>
      <p className="m-0 max-w-sm text-sm text-text-secondary">
        {error?.message || "The file may be damaged or in an unsupported format."}
      </p>
      <button type="button" className="btn btn-secondary mt-2" onClick={onBack}>
        Back to Library
      </button>
    </div>
  );
}
