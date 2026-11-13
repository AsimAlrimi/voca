import { forwardRef } from "react";
import Icon from "../common/Icon";

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200, 300, 400];
const VIEW_MODES = [
  { value: "pages", icon: "pageSingle", label: "Page by page" },
  { value: "vertical", icon: "scrollVertical", label: "Scroll vertically" },
  { value: "horizontal", icon: "scrollHorizontal", label: "Scroll horizontally" },
];
const THEMES = [
  { value: "paper", label: "Paper", swatch: "#ffffff" },
  { value: "sepia", label: "Sepia", swatch: "#f3e7cf" },
  { value: "night", label: "Night", swatch: "#161616" },
];

function Divider() {
  return <span className="mx-1.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
}

/** Page by page / vertical scroll / horizontal scroll. */
function ViewModeButtons({ value, onChange }) {
  return (
    <div className="flex rounded-lg bg-background p-0.5" role="group" aria-label="View">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={value === mode.value}
          aria-label={mode.label}
          title={mode.label}
          onClick={() => onChange(mode.value)}
          className={`flex h-8 w-9 items-center justify-center rounded-md transition-colors ${
            value === mode.value ? "bg-surface-hover text-text-primary" : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Icon name={mode.icon} size={17} />
        </button>
      ))}
    </div>
  );
}

/** Page colour: Paper / Sepia / Night. */
function ThemeButtons({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5 px-1" role="group" aria-label="Page colour">
      {THEMES.map((theme) => (
        <button
          key={theme.value}
          type="button"
          aria-pressed={value === theme.value}
          aria-label={`${theme.label} page`}
          title={`${theme.label} page`}
          onClick={() => onChange(theme.value)}
          className={`h-6 w-6 rounded-full border border-border-strong ${
            value === theme.value ? "ring-2 ring-focus ring-offset-2 ring-offset-surface" : ""
          }`}
          style={{ background: theme.swatch }}
        />
      ))}
    </div>
  );
}

/** Editable page number: type a page and press Enter. Keyed by page so it follows navigation. */
function PageField({ currentPage, pageCount, onGoToPage }) {
  const commit = (input) => {
    const page = Math.round(Number(input.value));
    if (Number.isFinite(page) && page >= 1 && page <= pageCount) {
      if (page !== currentPage) onGoToPage(page);
    } else {
      input.value = String(currentPage);
    }
  };

  return (
    <label className="flex items-center gap-1.5 text-sm tabular-nums text-text-secondary">
      <span className="sr-only">Page number</span>
      <input
        key={currentPage}
        type="text"
        inputMode="numeric"
        defaultValue={currentPage}
        disabled={!pageCount}
        className="h-8 w-12 rounded-md border border-border bg-background text-center text-sm text-text-primary focus:border-border-strong"
        onFocus={(event) => event.target.select()}
        onBlur={(event) => commit(event.target)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.target.blur();
          if (event.key === "Escape") {
            event.target.value = String(currentPage);
            event.target.blur();
          }
        }}
      />
      <span className="whitespace-nowrap">of {pageCount || "…"}</span>
    </label>
  );
}

/** Zoom drop-down: Fit width, Fit page and fixed percentages; shows the current zoom. */
function ZoomSelect({ scale, preset, onSelect }) {
  const percent = Math.round(scale * 100);
  const isFit = preset === "page-width" || preset === "page-fit";
  const value = isFit ? preset : String(percent);

  return (
    <select
      aria-label="Zoom"
      value={value}
      onChange={(event) => onSelect(event.target.value)}
      className="h-8 rounded-md border border-border bg-background px-2 text-sm text-text-primary"
    >
      <option value="page-width">Fit width</option>
      <option value="page-fit">Fit page</option>
      {!isFit && !ZOOM_LEVELS.includes(percent) && <option value={String(percent)}>{percent}%</option>}
      {ZOOM_LEVELS.map((level) => (
        <option key={level} value={String(level)}>
          {level}%
        </option>
      ))}
    </select>
  );
}

/**
 * Fixed reader toolbar (always visible).
 * Desktop: back, title · page navigation · zoom · view mode, page colour, contents, bookmark.
 * (`showViewOptions` puts view mode and page colour in the bar; otherwise they are in the Aa menu.)
 * Phones (`compact`): back, title, contents, view settings, bookmark — page and zoom controls
 * live in <ReaderBottomBar>.
 */
export const ReaderToolbar = forwardRef(function ReaderToolbar(
  {
    compact,
    title,
    onBack,
    currentPage,
    pageCount,
    onGoToPage,
    onPrevious,
    onNext,
    scale,
    zoomPreset,
    onZoomSelect,
    onZoomStep,
    showViewOptions,
    viewMode,
    onViewMode,
    theme,
    onTheme,
    onOpenContents,
    onToggleDisplay,
    displayOpen,
    bookmarked,
    onToggleBookmark,
  },
  ref
) {
  return (
    <header
      ref={ref}
      className="z-20 shrink-0 border-b border-border bg-surface"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-12 items-center gap-1 px-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to Library" title="Back to Library">
            <Icon name="arrowLeft" size={20} />
          </button>
          <h1 className="m-0 min-w-0 truncate text-sm font-medium" title={title}>
            {title}
          </h1>
        </div>

        {!compact && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" className="icon-btn" onClick={onPrevious} disabled={currentPage <= 1} aria-label="Previous page" title="Previous page">
              <Icon name="chevronLeft" size={20} />
            </button>
            <PageField currentPage={currentPage} pageCount={pageCount} onGoToPage={onGoToPage} />
            <button
              type="button"
              className="icon-btn"
              onClick={onNext}
              disabled={!pageCount || currentPage >= pageCount}
              aria-label="Next page"
              title="Next page"
            >
              <Icon name="chevronRight" size={20} />
            </button>
            <Divider />
            <button type="button" className="icon-btn" onClick={() => onZoomStep(-1)} aria-label="Zoom out" title="Zoom out">
              <Icon name="zoomOut" size={19} />
            </button>
            <ZoomSelect scale={scale} preset={zoomPreset} onSelect={onZoomSelect} />
            <button type="button" className="icon-btn" onClick={() => onZoomStep(1)} aria-label="Zoom in" title="Zoom in">
              <Icon name="zoomIn" size={19} />
            </button>
          </div>
        )}

        <div className="flex flex-1 items-center justify-end gap-1">
          {showViewOptions && (
            <>
              <ViewModeButtons value={viewMode} onChange={onViewMode} />
              <ThemeButtons value={theme} onChange={onTheme} />
              <Divider />
            </>
          )}
          <button type="button" className="icon-btn" onClick={onOpenContents} aria-label="Contents and bookmarks" title="Contents and bookmarks">
            <Icon name="contents" size={20} />
          </button>
          {!showViewOptions && <button
            type="button"
            className={`icon-btn ${displayOpen ? "bg-surface-raised text-text-primary" : ""}`}
            onClick={onToggleDisplay}
            aria-label="View settings"
            aria-expanded={displayOpen}
            title="View settings"
          >
            <span className="text-[15px] font-semibold tracking-tight" aria-hidden="true">
              Aa
            </span>
          </button>}
          <button
            type="button"
            className={`icon-btn ${bookmarked ? "text-text-primary" : ""}`}
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? `Remove bookmark from page ${currentPage}` : `Bookmark page ${currentPage}`}
            title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
          >
            <Icon name="bookmark" size={19} filled={bookmarked} />
          </button>
        </div>
      </div>
    </header>
  );
});

/** Phones: fixed bottom bar with page navigation and zoom buttons. */
export function ReaderBottomBar({ currentPage, pageCount, onPrevious, onNext, onOpenJump, onZoomStep }) {
  return (
    <div className="z-20 shrink-0 border-t border-border bg-surface" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex h-12 items-center gap-1 px-2">
        <button type="button" className="icon-btn" onClick={onPrevious} disabled={currentPage <= 1} aria-label="Previous page">
          <Icon name="chevronLeft" size={20} />
        </button>
        <button
          type="button"
          onClick={onOpenJump}
          disabled={!pageCount}
          className="min-h-10 rounded-lg px-3 text-sm tabular-nums text-text-primary hover:bg-surface-raised"
          aria-label={`Page ${currentPage} of ${pageCount || "…"}. Go to page`}
        >
          {currentPage}
          <span className="text-text-muted"> / {pageCount || "…"}</span>
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onNext}
          disabled={!pageCount || currentPage >= pageCount}
          aria-label="Next page"
        >
          <Icon name="chevronRight" size={20} />
        </button>
        <span className="flex-1" />
        <button type="button" className="icon-btn" onClick={() => onZoomStep(-1)} aria-label="Zoom out">
          <Icon name="zoomOut" size={19} />
        </button>
        <button type="button" className="icon-btn" onClick={() => onZoomStep(1)} aria-label="Zoom in">
          <Icon name="zoomIn" size={19} />
        </button>
      </div>
    </div>
  );
}
