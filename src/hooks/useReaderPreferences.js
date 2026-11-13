import { useCallback, useState } from "react";
import { loadPreferences, sanitizePreferences, savePreferences } from "../utils/readerPreferences.js";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked (private mode, disabled site data)
  }
}

/** Reader display preferences, restored on open and saved on every change (per device). */
export default function useReaderPreferences() {
  const [preferences, setPreferences] = useState(() => loadPreferences(storage()));

  const update = useCallback((changes) => {
    setPreferences((current) => {
      const next = sanitizePreferences({ ...current, ...changes });
      if (!savePreferences(storage(), next)) console.warn("Couldn't save reader preferences on this device");
      return next;
    });
  }, []);

  return [preferences, update];
}
