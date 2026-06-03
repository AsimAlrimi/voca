import { useEffect, useRef, useState, useCallback } from "react";
import { Worker, Viewer, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";

export default function PDFReader({ fileUrl, onClose }) {
  const [showBar, setShowBar]         = useState(false);
  const [bookmarked, setBookmarked]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const hideTimer = useRef(null);

  const pageNavPlugin  = pageNavigationPlugin();
  const { jumpToPage } = pageNavPlugin;

  const showBarTemp = useCallback(() => {
    setShowBar(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowBar(false), 2500);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#000", display: "flex", flexDirection: "column" }}>

      {/* ── Three-dot trigger ── */}
      <button
        onClick={showBarTemp}
        aria-label="Show controls"
        style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          zIndex: 30, display: "flex", gap: 4, padding: "8px 12px",
          borderRadius: 999, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)",
          border: "none", cursor: "pointer",
        }}
      >
        {[0,1,2].map(i => (
          <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.7)", display: "block" }} />
        ))}
      </button>

      {/* ── Top bar ── */}
      <div
        aria-hidden={!showBar}
        style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)",
          opacity: showBar ? 1 : 0,
          pointerEvents: showBar ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Go back"
          style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "none",
            color: "white", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ←
        </button>

        <button
          onClick={() => setBookmarked(v => !v)}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark this page"}
          style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "none",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"
            fill={bookmarked ? "white" : "none"}
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z"/>
          </svg>
        </button>
      </div>

      {/* ── PDF viewer (black background) ── */}
      <div style={{ flex: 1, overflow: "hidden", background: "#000" }}>
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <Viewer
            fileUrl={fileUrl}
            theme="dark"
            defaultScale={SpecialZoomLevel.PageFit}
            plugins={[pageNavPlugin]}
            onPageChange={e => setCurrentPage(e.currentPage + 1)}
            onDocumentLoad={e => setTotalPages(e.doc.numPages)}
          />
        </Worker>
      </div>

      {/* Force black background on the viewer internals */}
      <style>{`
        .rpv-core__viewer { background: #000 !important; }
        .rpv-core__inner-pages { background: #000 !important; }
        .rpv-core__page-layer { box-shadow: none !important; }
      `}</style>
    </div>
  );
}