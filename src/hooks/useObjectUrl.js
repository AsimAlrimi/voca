import { useEffect, useState } from "react";

/**
 * Creates an object URL for a Blob and revokes it when the Blob changes or the component unmounts.
 * Created inside the effect (not useMemo) so StrictMode's mount → cleanup → mount cycle never
 * leaves the component holding a revoked URL.
 */
export default function useObjectUrl(blob) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!blob) return undefined;
    const objectUrl = URL.createObjectURL(blob);
    // Synchronizing React state with an external resource whose lifetime this effect owns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [blob]);

  return blob ? url : null;
}
