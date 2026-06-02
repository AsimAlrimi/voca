import { Routes, Route } from "react-router-dom";

import Library from "../pages/Library";
import Vocabulary from "../pages/Vocabulary";
import Practice from "../pages/Practice";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/vocabulary" element={<Vocabulary />} />
      <Route path="/practice" element={<Practice />} />
    </Routes>
  );
}