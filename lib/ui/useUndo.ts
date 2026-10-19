"use client";

// "Removed. Undo." for five seconds (1.7, Saved and the journal; the owner's
// note 21). One removal at a time: a second one replaces the first, which is
// then final. `commit` runs when an entry can no longer be undone (its time
// is up, another replaces it, or the screen goes); `restore` puts it back.
//
// The stores this serves make a removal real at once (a tombstone for the
// sync, a deletedAt on a journal entry), so most callers need no commit:
// Undo simply puts the thing back, and the sync carries that too.

import { useCallback, useEffect, useRef, useState } from "react";

export const UNDO_MS = 5000;

export type UndoEntry = {
  /** What the bar says: "Removed". */
  label: string;
  restore: () => void;
  commit?: () => void;
};

export function useUndo(ms: number = UNDO_MS) {
  const [entry, setEntry] = useState<(UndoEntry & { n: number }) | null>(null);
  const current = useRef<(UndoEntry & { n: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const count = useRef(0);

  const settle = useCallback(() => {
    window.clearTimeout(timer.current);
    const was = current.current;
    current.current = null;
    setEntry(null);
    return was;
  }, []);

  const offer = useCallback(
    (next: UndoEntry) => {
      settle()?.commit?.();
      count.current += 1;
      const e = { ...next, n: count.current };
      current.current = e;
      setEntry(e);
      timer.current = window.setTimeout(() => {
        if (current.current?.n === e.n) settle()?.commit?.();
      }, ms);
    },
    [ms, settle],
  );

  const undo = useCallback(() => {
    settle()?.restore();
  }, [settle]);

  // Leaving the screen makes the last removal final.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      current.current?.commit?.();
      current.current = null;
    },
    [],
  );

  return { entry, offer, undo };
}
