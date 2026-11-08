import Icon from "../common/Icon";

const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

function nextZoom(scale) {
  return ZOOM_STEPS.find((step) => step > scale + 0.01) ?? MAX_ZOOM;
}
function previousZoom(scale) {
  return [...ZOOM_STEPS].reverse().find((step) => step < scale - 0.01) ?? MIN_ZOOM;
}

/** ‹ 12 / 240 › — the label opens "go to page". */
export function PageControls({ currentPage, pageCount, onPrevious, onNext, onOpenJump, compact = false }) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        className="icon-btn"
        onClick={onPrevious}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <Icon name="chevronLeft" size={20} />
      </button>
      <button
        type="button"
        onClick={onOpenJump}
        disabled={!pageCount}
        className={`min-h-10 rounded-lg px-2 text-sm tabular-nums text-text-primary hover:bg-surface-raised ${
          compact ? "min-w-[4.5rem]" : "min-w-[5.5rem]"
        }`}
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
    </div>
  );
}

/** − 110% + [fit width]. `scale` comes from the zoom plugin's CurrentScale. */
export function ZoomControls({ scale, onZoom, onFitWidth, showLabel = true }) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        className="icon-btn"
        onClick={() => onZoom(previousZoom(scale))}
        disabled={scale <= MIN_ZOOM + 0.01}
        aria-label="Zoom out"
      >
        <Icon name="zoomOut" size={19} />
      </button>
      {showLabel && (
        <span className="w-12 text-center text-xs tabular-nums text-text-secondary" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
      )}
      <button
        type="button"
        className="icon-btn"
        onClick={() => onZoom(nextZoom(scale))}
        disabled={scale >= MAX_ZOOM - 0.01}
        aria-label="Zoom in"
      >
        <Icon name="zoomIn" size={19} />
      </button>
      <button type="button" className="icon-btn" onClick={onFitWidth} aria-label="Fit to width" title="Fit to width">
        <Icon name="fitWidth" size={19} />
      </button>
    </div>
  );
}

/** Switches between vertical (top-to-bottom) and horizontal (side-by-side) page scrolling. */
export function ScrollModeToggle({ horizontal, onToggle, disabled }) {
  const label = horizontal
    ? "Scrolling sideways. Switch to vertical scrolling"
    : "Scrolling up and down. Switch to horizontal scrolling";
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      title={horizontal ? "Switch to vertical scrolling" : "Switch to horizontal scrolling"}
    >
      <Icon name={horizontal ? "scrollHorizontal" : "scrollVertical"} size={19} />
    </button>
  );
}

export function BookmarkToggle({ active, onToggle, page }) {
  return (
    <button
      type="button"
      className={`icon-btn ${active ? "text-text-primary" : ""}`}
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? `Remove bookmark from page ${page}` : `Bookmark page ${page}`}
      title={active ? "Remove bookmark" : "Bookmark this page"}
    >
      <Icon name="bookmark" size={19} filled={active} />
    </button>
  );
}
