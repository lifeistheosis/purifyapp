// The retention emails' sample words, taken from the sending's own letters
// (lib/email/retention/letters.ts) so the kit's stills say exactly what a
// reader would be sent. Not in the test suite's reach on purpose. To take
// the samples again after the letters change:
//
//   cp docs/brand/kit/email/letters.sample.test.ts lib/email/retention/__tests__/zz-kit-sample.test.ts
//   npx vitest run lib/email/retention/__tests__/zz-kit-sample.test.ts
//   rm lib/email/retention/__tests__/zz-kit-sample.test.ts
//   node docs/brand/kit/email/build.mjs
//
// It writes docs/brand/kit/email/letters.sample.json, which build.mjs reads.
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

import { fastOn } from "@/lib/email/retention/fasts";
import { RETENTION_LABEL } from "@/lib/email/retention/kinds";
import { letterFor } from "@/lib/email/retention/letters";
import type { PlannedRetention } from "@/lib/email/retention/plan";
import { retentionFooter } from "@/lib/email/retention/render";

it("writes the kit's sample letters", () => {
  const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
  const fast = (iso: string, piece: "open" | number): [PlannedRetention, Date] => {
    const f = fastOn(at(iso), "new");
    if (!f) throw new Error(`no fast on ${iso}`);
    return [{ kind: "fasting_companion", userId: "sample", fast: f, style: "new", piece, dedupeKey: "sample", owner: false } as PlannedRetention, at(iso)];
  };
  const step = (s: "morning" | "calendar" | "verse"): [PlannedRetention, Date] => [{ kind: "first_week", userId: "sample", step: s, dedupeKey: "sample", owner: false }, at("2026-11-13")];
  const plans: Record<string, [PlannedRetention, Date]> = {
    "first-week-1": step("morning"),
    "first-week-3": step("calendar"),
    "first-week-7": step("verse"),
    "pick-up": [
      { kind: "pick_up", userId: "sample", step: 14, line: { kind: "bible", book: "romans", bookName: "Romans", chapter: 8, verse: 1, at: 0 }, dedupeKey: "sample", owner: false },
      at("2026-11-13"),
    ],
    "fast-opening": fast("2026-11-15", "open"),
    "fast-week": fast("2026-11-22", 1),
  };
  const out: Record<string, unknown> = {};
  for (const [name, [plan, now]] of Object.entries(plans)) {
    const letter = letterFor(plan, now);
    out[name] = {
      letter,
      // The frame a look is given (render.ts frameFor): the list's own name, and the foot. The postal address is the sender's to fill.
      frame: { eyebrow: RETENTION_LABEL[letter.kind], footer: retentionFooter(letter.kind, "its postal address", { owner: false }), unsubscribeHref: "https://purifyapp.net/email/unsubscribe" },
    };
  }
  // An address is drawn on the main web, whatever this machine's own site address is.
  const text = JSON.stringify(out, null, 2).replace(/https:\/\/[a-z0-9.-]+(?=\/(prayers|settings|bible|plans|calendar|saints))/g, "https://purifyapp.net");
  fs.writeFileSync(path.resolve(__dirname, "../../../../docs/brand/kit/email/letters.sample.json"), `${text}\n`);
  expect(Object.keys(out)).toHaveLength(6);
});
