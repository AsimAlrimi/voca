import { useEffect, useRef } from "react";
import Icon from "../common/Icon";

const THEMES = [
  { value: "paper", label: "Paper", swatch: "#ffffff", ink: "#1a1a1a" },
  { value: "sepia", label: "Sepia", swatch: "#f3e7cf", ink: "#5b4636" },
  { value: "night", label: "Night", swatch: "#161616", ink: "#d8d8d8" },
];
const ZOOM_PRESETS = [
  { value: "page-width", label: "Fit width" },
  { value: "page-fit", label: "Fit page" },
  { value: "100", pref: "1", label: "100%" },
  { value: "150", pref: "1.5", label: "150%" },
];

function Segmented({ label, options, value, onChange, disabled }) {
  return (
    <fieldset className="m-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-1.5 p-0 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</legend>
      <div className={`flex rounded-xl bg-background p-1 ${disabled ? "opacity-40" : ""}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-9 flex-1 rounded-lg px-2 text-xs transition-colors ${
              value === option.value
                ? "bg-surface-hover font-medium text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Non-modal view settings panel under the toolbar, so changes preview live on the page.
 * `showZoom` adds zoom controls (phones; on desktop zoom lives in the toolbar).
 * Closes on Escape or a tap outside.
 */
export default function DisplayMenu({
  open,
  preferences,
  onChange,
  onZoomPreset,
  onZoomStep,
  scale,
  showZoom,
  showPinchOption,
  onClose,
  anchorRef,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    const onPointer = (event) => {
      if (panelRef.current?.contains(event.target) || anchorRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  const pages = preferences.mode === "pages";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="View settings"
      className="absolute right-2 top-2 z-40 max-h-[calc(100%-1rem)] w-[min(22rem,calc(100vw-1rem))] animate-fade-in space-y-5 overflow-y-auto rounded-2xl border border-border-strong bg-surface-raised p-4 text-text-primary shadow-[0_16px_50px_rgba(0,0,0,0.6)]"
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 p-0 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Page</legend>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((theme) => {
            const selected = preferences.theme === theme.value;
            return (
              <button
                key={theme.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ theme: theme.value })}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs transition-shadow ${
                  selected
                    ? "border-transparent ring-2 ring-focus ring-offset-2 ring-offset-surface-raised"
                    : "border-border hover:border-border-strong"
                }`}
                style={{ background: theme.swatch, color: theme.ink }}
              >
                {selected && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-focus text-white">
                    <Icon name="check" size={11} strokeWidth={3} />
                  </span>
                )}
                <span className="text-base font-semibold" aria-hidden="true">
                  Aa
                </span>
                {theme.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Segmented
        label="Reading"
        value={preferences.mode}
        onChange={(mode) => onChange({ mode })}
        options={[
          { value: "continuous", label: "Scroll" },
          { value: "pages", label: "Pages" },
        ]}
      />
      <div>
        <Segmented
          label="Scroll direction"
          value={preferences.direction}
          onChange={(direction) => onChange({ direction })}
          disabled={pages}
          options={[
            { value: "vertical", label: "Vertical" },
            { value: "horizontal", label: "Horizontal" },
          ]}
        />
        {pages && <p className="m-0 mt-1 text-[11px] text-text-muted">Pages mode turns one page at a time.</p>}
      </div>

      {showZoom && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Zoom</span>
            <div className="flex items-center gap-1">
              <button type="button" className="icon-btn h-8 w-8" onClick={() => onZoomStep(-1)} aria-label="Zoom out">
                <Icon name="zoomOut" size={17} />
              </button>
              <span className="w-11 text-center text-xs tabular-nums text-text-secondary" aria-live="polite">
                {Math.round(scale * 100)}%
              </span>
              <button type="button" className="icon-btn h-8 w-8" onClick={() => onZoomStep(1)} aria-label="Zoom in">
                <Icon name="zoomIn" size={17} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-background p-1">
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                aria-pressed={preferences.zoom === (preset.pref ?? preset.value)}
                onClick={() => onZoomPreset(preset.value)}
                className={`min-h-9 rounded-lg text-[11px] transition-colors ${
                  preferences.zoom === (preset.pref ?? preset.value)
                    ? "bg-surface-hover font-medium text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showPinchOption && (
        <div>
          <Segmented
            label="Pinch zoom"
            value={preferences.pinch}
            onChange={(pinch) => onChange({ pinch })}
            options={[
              { value: "sharp", label: "Sharp (beta)" },
              { value: "browser", label: "Browser" },
            ]}
          />
          <p className="m-0 mt-1 text-[11px] leading-snug text-text-muted">
            Sharp re-draws the page at the new size. Switch to Browser if pinching misbehaves.
          </p>
        </div>
      )}
    </div>
  );
}
