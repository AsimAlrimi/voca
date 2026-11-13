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
import useVisualViewport from "../../hooks/useVisualViewport";
import useReadingProgress from "../../hooks/useReadingProgress";
import useWordSelection, { clearDocumentSelection } from "../../hooks/useWordSelection";
import useReaderPreferences from "../../hooks/useReaderPreferences";
import useReaderGestures from "../../hooks/useReaderGestures";
import { SELECTION_MESSAGES } from "../../utils/words";
import { scrollModeFor } from "../../utils/readerPreferences";
import { zoomStep } from "../../utils/readerGestures";
import { flattenOutline, resolveOutline } from "../../utils/outline";
import { ReaderBottomBar, ReaderToolbar } from "./ReaderToolbar";
import DisplayMenu from "./DisplayMenu";
import ReaderNavigator from "./ReaderNavigator";
import WordLookupPanel from "./WordLookupPanel";
import GoToPageDialog from "./GoToPageDialog";

const SIDE_PANEL_WIDTH = 400; // keep in sync with WordLookupPanel
const FIT_LEVELS = {
  "page-width": SpecialZoomLevel.PageWidth,
  "page-fit": SpecialZoomLevel.PageFit,
};

/** Reports the viewer's current zoom (from the zoom plugin's render prop) to the parent. */
function ScaleReporter({ scale, onChange }) {
  useEffect(() => {
    onChange(scale);
  }, [scale, onChange]);
  return null;
}

/**
 * The PDF reader: a fixed toolbar (always visible), the document, and word lookup.
 * Phones get an additional fixed bottom bar for page and zoom controls.
 */
export default function PDFReader({ book, fileUrl, initialProgress, onBack }) {
  // react-pdf-viewer plugins use hooks internally: create them unconditionally on every render.
  const pageNavigation = pageNavigationPlugin();
  const zoom = zoomPlugin();
  const { jumpToPage, jumpToNextPage, jumpToPreviousPage } = pageNavigation;
  const { zoomTo, CurrentScale } = zoom;

  // Minimal local plugin: the viewer hands plugins its functions on install; we use
  // switchScrollMode (no extra dependency). Created once so the viewer installs it once.
  const viewerFunctions = useRef(null);
  const [viewerBridge] = useState(() => ({
    install: (functions) => {
      viewerFunctions.current = functions;
    },
  }));

  const toast = useToast();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTouch = useMediaQuery("(pointer: coarse)");
  const isWide = useMediaQuery("(min-width: 1100px)"); // room for view options in the toolbar
  const viewport = useVisualViewport();
  const [preferences, updatePreferences] = useReaderPreferences();
  const progress = useReadingProgress(book.id, initialProgress);
  const { handlePageChange, handleDocumentLoad } = progress;

  const viewerRootRef = useRef(null);
  const toolbarRef = useRef(null);
  const closeOnClear = useRef(false);
  const scaleRef = useRef(1);

  const [lookup, setLookup] = useState(null); // { ...selection, expanded }
  const [hint, setHint] = useState(null);
  const [dialog, setDialog] = useState(null); // "page" | "navigate" | null
  const [displayOpen, setDisplayOpen] = useState(false);
  const [docLoaded, setDocLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [outline, setOutline] = useState({ status: "loading", items: [] });

  // Values the viewer only reads once, on open.
  const [initialScrollMode] = useState(() => ScrollMode[scrollModeFor(preferences)]);
  const [defaultScale] = useState(() => {
    if (FIT_LEVELS[preferences.zoom]) return FIT_LEVELS[preferences.zoom];
    if (preferences.zoom) return Number(preferences.zoom);
    if (preferences.mode === "pages") return SpecialZoomLevel.PageFit; // show the whole page
    return window.matchMedia("(max-width: 1023px)").matches ? SpecialZoomLevel.PageWidth : 1.25;
  });
  const [initialPage] = useState(() => Math.max(0, (initialProgress?.lastPage ?? 1) - 1));
  // While opening at a saved page (or switching layout), the viewer briefly reports other
  // pages as it measures them. Ignore page events during a short settle window.
  const settled = useRef(initialPage === 0);
  const unsettle = (ms) => {
    settled.current = false;
    setTimeout(() => {
      settled.current = true;
    }, ms);
  };

  const handleScale = useCallback((value) => {
    scaleRef.current = value;
    setScale(value);
  }, []);

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
      setDisplayOpen(false);
      setLookup({ ...result, expanded: false });
    } else {
      setHint(SELECTION_MESSAGES[result.reason] ?? SELECTION_MESSAGES["not-a-word"]);
    }
  }, []);

  useWordSelection(viewerRootRef, handleSelection);

  // Clicking the page (outside the panel) dismisses the panel once the selection clears.
  const handleViewerPointerDown = () => {
    if (lookup) closeOnClear.current = true;
  };

  const closeLookup = useCallback(() => {
    setLookup(null);
    clearDocumentSelection();
  }, []);

  const setLookupExpanded = useCallback((expanded) => {
    setLookup((current) => (current ? { ...current, expanded } : current));
  }, []);

  const handleWordSaved = useCallback(
    (record) => {
      clearDocumentSelection(); // remove highlight; panel stays to show "Saved"
      toast.show(`Saved “${record.word}” to Vocabulary`, { type: "success", duration: 2500 });
    },
    [toast]
  );

  useEffect(() => {
    if (!hint) return undefined;
    const timer = setTimeout(() => setHint(null), 3500);
    return () => clearTimeout(timer);
  }, [hint]);

  // ── Navigation and zoom ──────────────────────────────────────────────────
  const goToPage = useCallback((page) => jumpToPage(page - 1), [jumpToPage]);
  const previousPage = useCallback(() => jumpToPreviousPage(), [jumpToPreviousPage]);
  const nextPage = useCallback(() => jumpToNextPage(), [jumpToNextPage]);

  const applyZoom = useCallback(
    (value) => {
      zoomTo(value);
      setLookup(null);
      clearDocumentSelection();
    },
    [zoomTo]
  );

  /** value: "page-width" | "page-fit" | percentage as a string ("125"). */
  const handleZoomSelect = (value) => {
    if (FIT_LEVELS[value]) {
      updatePreferences({ zoom: value });
      applyZoom(FIT_LEVELS[value]);
      return;
    }
    const next = Number(value) / 100;
    if (!Number.isFinite(next) || next <= 0) return;
    updatePreferences({ zoom: next === 1 || next === 1.5 ? String(next) : null });
    applyZoom(next);
  };

  const handleZoomStep = (direction) => {
    updatePreferences({ zoom: null });
    applyZoom(zoomStep(scaleRef.current, direction));
  };

  // Touch: swipe to turn pages in Pages mode and pinch to zoom. Ctrl/⌘ + wheel zooms on desktop.
  // (No tap zones: all controls are in the toolbar.)
  useReaderGestures(viewerRootRef, {
    mode: preferences.mode,
    pinchEnabled: isTouch && preferences.pinch === "sharp",
    getScale: () => scaleRef.current,
    onSwipe: (direction) => (direction === "next" ? nextPage() : previousPage()),
    onZoom: (value) => {
      updatePreferences({ zoom: null });
      applyZoom(value);
    },
  });

  // A sideways swipe at the edge of the content would otherwise trigger the browser's
  // "swipe to go back" (Chrome/Android) and close the book. Disable it while reading.
  useEffect(() => {
    const targets = [document.documentElement, document.body];
    const previous = targets.map((el) => el.style.overscrollBehaviorX);
    targets.forEach((el) => {
      el.style.overscrollBehaviorX = "none";
    });
    return () =>
      targets.forEach((el, i) => {
        el.style.overscrollBehaviorX = previous[i];
      });
  }, []);

  // Keyboard: in Pages mode, arrows / Page Up / Page Down / Space turn pages.
  useEffect(() => {
    if (preferences.mode !== "pages") return undefined;
    const onKey = (event) => {
      if (dialog || event.target.closest?.("input, textarea, select, button, [role=dialog], dialog")) return;
      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        nextPage();
      } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        previousPage();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preferences.mode, dialog, nextPage, previousPage]);

  // Keep the card attached to its word while pages scroll (any scroll container, any mode).
  useEffect(() => {
    const root = viewerRootRef.current;
    if (!root || !docLoaded) return undefined;
    const onScroll = () => {
      const selection = window.getSelection();
      if (selection?.rangeCount && !selection.isCollapsed && root.contains(selection.anchorNode)) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        setLookup((current) => (current ? { ...current, rect } : current));
      }
    };
    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => root.removeEventListener("scroll", onScroll, { capture: true });
  }, [docLoaded]);

  // ── View settings ────────────────────────────────────────────────────────
  const handlePreferencesChange = (changes) => {
    const next = { ...preferences, ...changes };
    const before = scrollModeFor(preferences);
    const after = scrollModeFor(next);
    if (before !== after && viewerFunctions.current?.switchScrollMode) {
      unsettle(700);
      viewerFunctions.current.switchScrollMode(ScrollMode[after]);
      setLookup(null);
      clearDocumentSelection();
    }
    // Entering page-by-page view: fit the whole page on screen.
    if (next.mode === "pages" && preferences.mode !== "pages") {
      updatePreferences({ ...changes, zoom: "page-fit" });
      setTimeout(() => applyZoom(SpecialZoomLevel.PageFit), 150);
      return;
    }
    updatePreferences(changes);
  };

  const viewMode = preferences.mode === "pages" ? "pages" : preferences.direction;
  const handleViewMode = (value) =>
    handlePreferencesChange(value === "pages" ? { mode: "pages" } : { mode: "continuous", direction: value });

  // ── Document events ──────────────────────────────────────────────────────
  const onDocumentLoad = useCallback(
    (event) => {
      const { doc } = event;
      handleDocumentLoad(doc.numPages);
      setDocLoaded(true);
      setTimeout(() => {
        settled.current = true;
      }, 800);

      // Scanned PDFs have no text layer: explain why words can't be selected.
      Promise.all(
        Array.from({ length: Math.min(doc.numPages, 3) }, (_, i) => doc.getPage(i + 1).then((page) => page.getTextContent()))
      )
        .then((contents) => {
          const hasText = contents.some((content) => content.items.some((item) => item.str?.trim()));
          if (!hasText) {
            toast.show("This PDF looks scanned, so words can’t be selected. Voca needs PDFs with real text.", {
              type: "info",
              duration: 7000,
            });
          }
        })
        .catch((error) => console.warn("Text layer check failed", error));

      // Table of contents, if the PDF has one.
      doc
        .getOutline()
        .then((nodes) => resolveOutline(doc, flattenOutline(nodes)))
        .then((items) => setOutline({ status: "ready", items }))
        .catch((error) => {
          console.warn("Reading the table of contents failed", error);
          setOutline({ status: "ready", items: [] });
        });
    },
    [handleDocumentLoad, toast]
  );

  const onPageChange = useCallback(
    (event) => {
      if (!settled.current) return;
      handlePageChange(event.currentPage + 1);
    },
    [handlePageChange]
  );

  // ── Bookmarks ────────────────────────────────────────────────────────────
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
    if (progress.saveError) toast.show("Your reading position couldn't be saved on this device.", { type: "error" });
  }, [progress.saveError, toast]);

  const sidePanelOpen = Boolean(lookup?.expanded) && !isMobile;
  const pinchHandledByApp = isTouch && preferences.pinch === "sharp";

  return (
    <div className={`reader-root reader-theme-${preferences.theme} fixed inset-0 z-30 text-text-primary`} data-mode={preferences.mode}>
      <div
        className="absolute inset-y-0 left-0 flex flex-col transition-[right] duration-200"
        style={{ right: sidePanelOpen ? SIDE_PANEL_WIDTH : 0 }}
      >
        <ReaderToolbar
          ref={toolbarRef}
          compact={isMobile}
          title={book.title}
          onBack={onBack}
          currentPage={progress.currentPage}
          pageCount={progress.pageCount}
          onGoToPage={goToPage}
          onPrevious={previousPage}
          onNext={nextPage}
          scale={scale}
          zoomPreset={preferences.zoom}
          onZoomSelect={handleZoomSelect}
          onZoomStep={handleZoomStep}
          showViewOptions={isWide}
          viewMode={viewMode}
          onViewMode={handleViewMode}
          theme={preferences.theme}
          onTheme={(theme) => handlePreferencesChange({ theme })}
          onOpenContents={() => setDialog("navigate")}
          onToggleDisplay={() => setDisplayOpen((open) => !open)}
          displayOpen={displayOpen}
          bookmarked={progress.isBookmarked}
          onToggleBookmark={handleToggleBookmark}
        />

        {/* ── Document ── */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={viewerRootRef}
            className="absolute inset-0"
            style={{ touchAction: pinchHandledByApp ? "pan-x pan-y" : undefined }}
            onPointerDown={handleViewerPointerDown}
          >
            <Worker workerUrl={pdfWorkerUrl}>
              <Viewer
                fileUrl={fileUrl}
                theme="dark"
                plugins={[pageNavigation, zoom, viewerBridge]}
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

          <CurrentScale>{({ scale: current }) => <ScaleReporter scale={current} onChange={handleScale} />}</CurrentScale>

          <DisplayMenu
            open={displayOpen && !isWide}
            preferences={preferences}
            scale={scale}
            onChange={handlePreferencesChange}
            onZoomPreset={handleZoomSelect}
            onZoomStep={handleZoomStep}
            showZoom={isMobile}
            showPinchOption={isTouch}
            onClose={() => setDisplayOpen(false)}
            anchorRef={toolbarRef}
          />

          {hint && !lookup && (
            <div role="status" className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
              <p className="m-0 flex animate-slide-up items-center gap-2 rounded-xl border border-border-strong bg-surface-raised px-4 py-2.5 text-sm text-text-primary shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <Icon name="info" size={16} className="text-text-secondary" />
                {hint}
              </p>
            </div>
          )}
        </div>

        {isMobile && (
          <ReaderBottomBar
            currentPage={progress.currentPage}
            pageCount={progress.pageCount}
            onPrevious={previousPage}
            onNext={nextPage}
            onOpenJump={() => setDialog("page")}
            onZoomStep={handleZoomStep}
          />
        )}
      </div>

      {lookup && (
        <WordLookupPanel
          key={`${lookup.word}-${lookup.page}`}
          selection={lookup}
          book={book}
          compact={isMobile}
          viewport={viewport}
          toolbarRef={toolbarRef}
          toolbarVisible
          expanded={lookup.expanded}
          onExpandChange={setLookupExpanded}
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
      <ReaderNavigator
        open={dialog === "navigate"}
        outline={outline.items}
        outlineStatus={outline.status}
        bookmarks={progress.bookmarks}
        currentPage={progress.currentPage}
        pageCount={progress.pageCount}
        onGo={goToPage}
        onRemoveBookmark={handleRemoveBookmark}
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
