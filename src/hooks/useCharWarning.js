import { useRef, useState, useCallback } from "react";

// Wraps a sanitize function (sanitizeText / sanitizeName) so a field can
// show a brief warning whenever a keystroke gets filtered out, instead of
// silently dropping the character.
export function useCharWarning(sanitizeFn) {
  const [warn, setWarn] = useState(false);
  const timerRef = useRef(null);

  const filter = useCallback(
    (raw) => {
      const clean = sanitizeFn(raw);
      if (clean.length !== raw.length) {
        setWarn(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setWarn(false), 2200);
      }
      return clean;
    },
    [sanitizeFn]
  );

  return [warn, filter];
}
