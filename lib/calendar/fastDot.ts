// The colour of the little dot beside a fasting rule.
//
// Presentation, but keyed on FastKind, so it lives beside the type it
// answers to rather than in a component. It had drifted into three
// byte-identical copies (the Today rail's fast card, /prayers/today, and the
// desktop Prayers index), which is three places to forget when a rule's
// colour changes.
//
// Plain constant, no "use client": server and client components both read it.

import type { FastKind } from "./orthodox";

export const FAST_DOT: Record<FastKind, string> = {
  strict: "bg-crimson",
  "wine-oil": "bg-gold",
  fish: "bg-sage",
  fast: "bg-paper/40",
  "fast-free": "bg-emerald-400",
  normal: "bg-paper/30",
};
