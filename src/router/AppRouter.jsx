import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Library from "../pages/Library";
import Vocabulary from "../pages/Vocabulary";
import Practice from "../pages/Practice";
import StatusMessage from "../components/common/StatusMessage";

// The reader pulls in the PDF engine (~600 KB); load it only when a book is opened.
// The chunk is precached by the service worker, so this still works offline.
const Reader = lazy(() => import("../pages/Reader"));

function ReaderFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <StatusMessage type="loading" title="Opening reader…" />
    </div>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route
        path="/read/:bookId"
        element={
          <Suspense fallback={<ReaderFallback />}>
            <Reader />
          </Suspense>
        }
      />
      <Route path="/vocabulary" element={<Vocabulary />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
