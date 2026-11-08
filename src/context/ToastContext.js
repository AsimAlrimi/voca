import { createContext } from "react";

/** App-wide action feedback (saved, deleted, failed). Provided by <ToastProvider>. */
export const ToastContext = createContext(null);
