"use client";

import { createElement, useEffect, useState, type ComponentType, type ReactNode } from "react";

/**
 * A part of marking, fetched after the page is up and drawn once it has
 * arrived: nothing of it is in the page's first script, and a page without
 * such paragraphs never asks.
 *
 * Fetched in an effect and kept in state, NOT with next/dynamic. A dynamic
 * part with no server side is a Suspense boundary of its own in the page's
 * first draw: on the first such page of a visit its script is not there yet,
 * the boundary falls back, and React holds its retry until the page switch
 * has finished, then pictures the retry as a page switch of its own. A reader
 * saw the switch into a saint's life run twice, the screen taking no touch
 * for the second half second (Fable Theology's finding of 2026-11-11, with
 * scripts/route-motion.mjs; the same fault as the gathering's bar,
 * docs/1.9-build/notes/transitions-fable.md: "the first part of a page that
 * comes from the page's own script must not stand in a Suspense boundary of
 * its own"). Arriving in an ordinary update, the part is not pictured at all.
 */
function useLater(load: () => Promise<ComponentType>): ReactNode {
  const [Part, setPart] = useState<ComponentType | null>(null);
  useEffect(() => {
    let on = true;
    void load().then((part) => {
      if (on) setPart(() => part);
    });
    return () => {
      on = false;
    };
    // The part is the same for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The part itself, drawn: it is fetched, not made here.
  return Part ? createElement(Part) : null;
}

const loadTools = () => import("./SelectionTools").then((m) => m.SelectionTools);
const loadLayer = () => import("./MarksLayer").then((m) => m.MarksLayer);

/** The selection tool of a page whose paragraphs can be marked (./SelectionTools.tsx). */
export function SelectionToolsLazy() {
  return useLater(loadTools);
}

/**
 * Both halves of marking for a page that wrote its own text
 * (./MarkHost.tsx): the reader's marks painted over it, and the selection.
 */
export function ReadingMarks() {
  const layer = useLater(loadLayer);
  return (
    <>
      {layer}
      <SelectionToolsLazy />
    </>
  );
}
