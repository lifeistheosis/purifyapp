"use client";

import dynamic from "next/dynamic";

/**
 * The selection tool of a page whose paragraphs can be marked
 * (./SelectionTools.tsx), fetched after the page is up: nothing of it is in
 * the page's first script, and a page without such paragraphs never asks.
 */
export const SelectionToolsLazy = dynamic(() => import("./SelectionTools").then((m) => m.SelectionTools), { ssr: false });
