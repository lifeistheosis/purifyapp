"use client";

// Push, folded into Releases by his pick A on r3-17 (2026-10-30): the
// composer is step 5 of the one path (a few days later), and what was sent is
// under its Records. The view keeps its id, so #tab=push still lands, on step
// 5. The parts are components/admin/releases/push.tsx.

import { ReleasesPage } from "./DropTab";

export function PushTab() {
  return <ReleasesPage focus="push" />;
}
