// Cinematic era atmospheres: one quiet hue per age of the Church, applied
// at whisper alpha by .cinema-era on the timeline and by the account pages'
// drop caps, ornaments, and atmosphere. Chosen for mood, not category
// coding: dawn amber for the apostles, ember for the martyrs, gold for the
// imperial Church, violet for the christological centuries, steel for
// iconoclasm, emerald for the missionary expansion, rust for the
// estrangement, royal purple for the late empire, bronze for the Ottoman
// centuries, sea for the global missions, crimson for the century of the
// new martyrs.
//
// Plain module (no "use client"): imported by both the client timeline and
// the server-rendered account pages, where a client module's exports would
// arrive as unusable references.

import type { Era } from "@/lib/history/events";

export const ERA_HUE: Record<Era, number> = {
  apostolic: 42,
  persecution: 8,
  "imperial-conciliar": 46,
  christological: 262,
  iconoclasm: 214,
  "byzantine-expansion": 158,
  estrangement: 22,
  "late-byzantine": 282,
  ottoman: 34,
  "global-missions": 192,
  modern: 0,
};
