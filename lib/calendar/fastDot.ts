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

//
// Each dot takes its fast's own colour token, the --fast-* triplet that
// fastMeta.tsx, the calendar and /fasting/ draw with (app/globals.css). The
// tokens follow the palette: Light darkens them to hold contrast on its
// ground. The dots were fixed colours (bg-sage, bg-emerald-400) that stayed
// the same on every palette, and wine and oil wore the silver "gold" token
// where the calendar shows grape purple (Gate 6b, 2026-11-16, checkMock's
// palette rule on /prayers/today/). lib/calendar/__tests__/fastDot.test.ts
// holds every kind to its token.

import type { FastKind } from "./orthodox";

export const FAST_DOT: Record<FastKind, string> = {
  strict: "bg-[rgb(var(--fast-strict))]",
  "wine-oil": "bg-[rgb(var(--fast-wine-oil))]",
  fish: "bg-[rgb(var(--fast-fish))]",
  fast: "bg-[rgb(var(--fast-fast))]",
  "fast-free": "bg-[rgb(var(--fast-free))]",
  normal: "bg-[rgb(var(--fast-normal))]",
};
