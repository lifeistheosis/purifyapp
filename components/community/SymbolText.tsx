"use client";

import { Fragment, useMemo } from "react";

import { symbolRuns } from "@/lib/community/symbols";

/**
 * A reader's own words, with their emoji and symbols drawn by the device's
 * fonts (`.font-symbols`) instead of being looked up through the web fonts,
 * which fetched font files mid-render (lib/community/symbols.ts).
 */
export function SymbolText({ text }: { text: string }) {
  const runs = useMemo(() => symbolRuns(text), [text]);
  if (runs.length === 1 && !runs[0].symbol) return <>{text}</>;
  return (
    <>
      {runs.map((r, i) =>
        r.symbol ? (
          <span key={i} className="font-symbols">
            {r.text}
          </span>
        ) : (
          <Fragment key={i}>{r.text}</Fragment>
        ),
      )}
    </>
  );
}
