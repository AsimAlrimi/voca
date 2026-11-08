import { useEffect, useRef } from "react";
import { readWordSelection } from "../utils/textSelection";

/**
 * Watches text selection inside `rootRef` and calls `onSelect(result)` once the selection
 * has settled (mouse released / touch handles idle). `result` is from readWordSelection:
 *   { ok: true, word, page, sentence, rect } | { ok: false, reason, rect } | null (cleared)
 *
 * Settling avoids flashing the lookup UI while the user is still dragging.
 */
export default function useWordSelection(rootRef, onSelect, { enabled = true } = {}) {
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!enabled) return undefined;

    let timer = null;
    let pointerDown = false;
    let lastKey = null;
    let lastPointerType = "mouse";

    const evaluate = () => {
      const result = readWordSelection(window.getSelection(), rootRef.current);
      // Avoid re-firing for the same settled selection (selectionchange is noisy).
      const key = result ? `${result.ok}|${result.word ?? result.reason}|${result.page ?? ""}` : "none";
      if (key === lastKey) return;
      lastKey = key;
      onSelectRef.current(result);
    };

    const schedule = (delay) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!pointerDown) evaluate();
      }, delay);
    };

    // Touch selection (long-press + handles) gets a longer settle time.
    const handleSelectionChange = () => schedule(lastPointerType === "touch" ? 450 : 220);

    const handlePointerDown = (event) => {
      lastPointerType = event.pointerType || "mouse";
      if (event.pointerType === "mouse" && rootRef.current?.contains(event.target)) pointerDown = true;
    };
    const handlePointerUp = () => {
      if (!pointerDown) return;
      pointerDown = false;
      schedule(30);
    };
    const handleKeyUp = (event) => {
      if (event.shiftKey || event.key.startsWith("Arrow")) schedule(220);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("pointercancel", handlePointerUp, true);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", handlePointerUp, true);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [rootRef, enabled]);
}

export function clearDocumentSelection() {
  window.getSelection()?.removeAllRanges();
}
