// Which kind of reader is looking (1.8): the one answer every transitionary
// screen reads. "Transitionary" is the owner's word of 2026-10-28 for a
// screen or section that shows different things to each type of reader:
// "if they're Orthodox, they're more or less gonna see the feast day and the
// saint of the day commemorations and their prayers." Today is to become as
// transitionary as it can; Discover stays one design for everyone.
//
// Read from what onboarding keeps on the device, never guessed: the level
// first (what the reader said of their own practice), then where they come
// from. A reader with neither (an install from before onboarding asked, or a
// skipped question) sees Purify as it always was, the Orthodox view, the
// same way the fasting rule reads "strict" when it was never set.

import type { Background, Level } from "./space";

export type ReaderType = "orthodox" | "learning" | "new";
export const READER_TYPES: readonly ReaderType[] = ["orthodox", "learning", "new"];

export function readerTypeOf(level: Level | null, background: Background | null): ReaderType {
  if (level === "practicing") return "orthodox";
  if (level === "learning") return "learning";
  if (level === "inquirer") return "new";
  if (background && background !== "orthodox" && background !== "prefer-not") return "new";
  return "orthodox";
}
