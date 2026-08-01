// The colour of the little dot beside a fasting rule.
//
// Presentation, but keyed on FastKind, so it lives beside the type it
// answers to rather than in a component. It had drifted into three
// byte-identical copies (the Today rail's fast card, /prayers/today, and the
// desktop Prayers index), which is three places to forget when a rule's
// colour changes.
//
// Plain constant, no "use client": server and client components both read it.
//
// Not folded into components/calendar/fastMeta.tsx, which is the other
// half of this story: that one holds the icon, the short label and an
// "R G B" triplet for the calendar's own colour system, and it imports four
// icon components. This is a Tailwind class and is read by a server page,
// so it stays a leaf. If you add a third fasting-presentation map, fold it
// into one of these two rather than starting a fourth.

import type { FastKind } from "./orthodox";

export const FAST_DOT: Record<FastKind, string> = {
  strict: "bg-crimson",
  "wine-oil": "bg-gold",
  fish: "bg-sage",
  fast: "bg-paper/40",
  "fast-free": "bg-emerald-400",
  normal: "bg-paper/30",
};
