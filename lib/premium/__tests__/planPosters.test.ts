// Your plan's posters (build 89 note 12). He has Plus, so the walk through the
// features he photographed ("1 / 12") was Your plan (/plan), not the Plus
// sheet's Try it: each poster opened a sheet with one line and, for six of
// twelve, a link out. Cross-references dropped him into John 1 ("it just takes
// you to the Bible"); Word study into Genesis 1, a page with no Greek to tap
// ("the Greek doesn't pull up anything"); the plans page came with a cut; the
// mark and Discord led nowhere. His word: "I want each one visualized,
// explained." Now each Plus poster's sheet shows the feature itself, live,
// from the preview Try it draws for a reader without Plus
// (components/billing/plusTry), drawn as theirs (`owned`), in the paywall's
// own rows and words, in all twenty-one languages.

import { createElement, type ReactElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TRY_PREVIEW_IDS } from "@/components/billing/PlusTry";
import TryAmbience from "@/components/billing/plusTry/TryAmbience";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { FEATURE_PLACES } from "@/components/premium/FeatureShowcase";
import { interlinearState } from "@/lib/bible/chapterExtras";
import { getMessages } from "@/lib/i18n";
import { PLUS_ROWS, PRO_ROWS } from "@/lib/premium/plusRows";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const code = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const render = (node: ReactElement, lang = "en") =>
  renderToString(createElement(MessagesProvider, { locale: lang, messages: getMessages(lang) } as ProviderProps, node));

describe("Your plan's posters", () => {
  const plan = code("components/premium/PlanScreen.tsx");
  const showcase = code("components/premium/FeatureShowcase.tsx");

  it("are the paywall's own rows and words, in all twenty-one languages, not plans.ts's English and German", () => {
    expect(plan).toContain("rowsHere(PLUS_ROWS, { desktopApp })");
    expect(plan).toContain("PRO_ROWS.map(");
    expect(plan).not.toMatch(/planCopy\.(plusItems|proItems)/);
    expect(plan).toContain("soonLabel={t(SOON_LABEL)}");
    // Pro's posters are the Pro rows, one for one, as plans.ts listed them.
    expect(PRO_ROWS.map((r) => r.id)).toEqual(["everything-plus", "studio-audio", "eikon-box", "eikon-benefits"]);
  });

  it("open, for every Plus feature, onto the feature itself, live, drawn as the reader's own", () => {
    for (const r of PLUS_ROWS) expect(TRY_PREVIEW_IDS, r.id).toContain(r.id);
    expect(showcase).toContain("<TryPreview row={live} owned />");
    expect(showcase).toContain("item.row && TRY_PREVIEW_IDS.includes(item.id)");
    // The line under it, and the way to the feature where it has a page.
    expect(showcase).toContain("item.sub");
    expect(showcase).toContain("<Link href={place.href}");
  });

  it("never show a reader who has the feature a lock or a minute", () => {
    const ambience = code("components/billing/plusTry/TryAmbience.tsx");
    expect(ambience).toContain("const ended = !owned && minute.ended;");
    expect(ambience).toContain("if (owned) void playAmbience(next);");
    // Drawn as theirs, the six sounds stand ready to play.
    const owned = render(createElement(TryAmbience, { row: PLUS_ROWS.find((r) => r.id === "ambience")!, owned: true }));
    for (const track of AMBIENCE_TRACKS) expect(owned, track.id).toContain(getMessages("en")[track.labelKey]);
    expect(owned).not.toContain("disabled");
  });

  it("lead to each feature where it lives: Word study to a chapter whose Greek pairs verse for verse", async () => {
    expect(FEATURE_PLACES["word-study"].href).toBe("/bible/john/1");
    expect(await interlinearState("john", 1)).toBe("shown");
    for (const [id, p] of Object.entries(FEATURE_PLACES)) {
      const top = p.href.split("/").filter(Boolean)[0];
      expect(readFileSync(path.join(ROOT, "app/(app)", top, "page.tsx"), "utf8").length, `${id}: ${p.href}`).toBeGreaterThan(0);
    }
    // The upgrade sheet's welcome sends a new subscriber to the same places.
    const modal = code("components/billing/UpgradeModal.tsx");
    for (const p of Object.values(FEATURE_PLACES)) {
      const line = modal.split("\n").find((l) => l.includes(`key: "${p.label}"`));
      if (line) expect(line, p.label).toContain(`href: "${p.href}"`);
    }
  });

  it("count themselves legibly: the pager reads on every palette", () => {
    expect(showcase).toContain('tabular-nums text-paper/60">');
    expect(showcase).not.toContain("tabular-nums text-paper/40");
  });
});
