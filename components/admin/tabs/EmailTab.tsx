"use client";

// Email, folded into Releases by his pick A on r3-17 (2026-10-30): the release
// email is step 4 of the one path (the day a store has it), and what is going
// out and who has been written to are under its Records. The view keeps its
// id, so #tab=email still lands, on step 4. The parts are
// components/admin/releases/email.tsx.

import { ReleasesPage } from "./DropTab";

export function EmailTab() {
  return <ReleasesPage focus="email" />;
}
