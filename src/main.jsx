import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";

import App from "./App.jsx";
import ToastProvider from "./components/common/ToastProvider.jsx";
import "./index.css";

// After a new deployment, an already-open page may try to lazy-load a chunk (e.g. the Reader)
// that no longer exists. Reload once to pick up the new version instead of failing.
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "voca.chunkReloadAt";
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY)) || 0;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable: still allow a single reload attempt below
  }
  if (Date.now() - last > 10_000) {
    event.preventDefault();
    window.location.reload();
  }
});

// HashRouter: GitHub Pages serves static files only, so routes live after "#"
// (e.g. /voca/#/vocabulary) and refreshes/deep links always load index.html.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>
);
