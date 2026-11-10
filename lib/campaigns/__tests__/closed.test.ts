// With the switch closed, the app behaves exactly as it did before prayer
// campaigns were reworked (the arbiter's rule 2 of 2026-11-10: "With the
// switch closed and no new tables, the app behaves exactly as today. A test
// holds that.").
//
// The rework is built behind a switch that stays committed closed until
// release day, and it ships in 1.9 (his later word of the same day: "ok to
// all ensure its all in v1.9"). What makes building it beside the rest of
// 1.9 safe is one constant (lib/campaigns/flags.ts) and the handful of
// places that ask it. This file holds each of them:
//
//   the switch   committed closed
//   the server   every route answers 404 and reads nothing
//                (routes.test.ts, "closed: every route answers 404 and the
//                database is never asked", which this file does not repeat)
//   the pages    every campaign page is not found, on the server
//   the device   nothing is asked of the server, and the list of carried
//                campaigns is neither read nor written, whatever it holds
//   the doors    the screens that carry campaigns reach them only through
//                those two gates, and draw nothing of them
//   the data     the rework's SQL waits for his signature in docs/1.9-build/
//                sql, word for word what the notes hold, not in the folder a merge
//                runs against production
//
// What would go wrong if this broke: a reader of 1.9 shown a door to a
// feature that is not open, a request to a route that answers 404 on every
// visit to Community, or a migration run on production by a merge nobody
// signed.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(async (path: string) => {
    calls.push(path);
    return new Response(JSON.stringify({ open: true, campaigns: [], states: {} }), { status: 200, headers: { "content-type": "application/json" } });
  }),
}));

import CampaignDetailPage from "@/app/(app)/campaigns/detail/page";
import MyCampaignsPage from "@/app/(app)/campaigns/mine/page";
import NewCampaignPage from "@/app/(app)/campaigns/new/page";
import CampaignsPage from "@/app/(app)/campaigns/page";
import CampaignRulesPage from "@/app/(app)/campaigns/rules/page";
import { PrayTogether } from "@/components/community/PrayTogether";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { CARRIED_KEY, carry, type CarriedCampaign } from "@/lib/campaigns/carried";
import {
  closeCampaign,
  dropJoin,
  fetchBoard,
  fetchCampaign,
  fetchMine,
  fetchStates,
  keepJoin,
  reportCampaign,
  startCampaign,
  takeDownCampaign,
} from "@/lib/campaigns/client";
import { CAMPAIGNS_OPENING, __setCampaignsOpening, campaignsEnabled, campaignsInBuild, julyCampaignRoutes } from "@/lib/campaigns/flags";
import { __forgetCampaignsOpen, campaignsOpenNow, subscribeCampaignsOpen } from "@/lib/campaigns/useCampaignsOpen";
import { campaignUpkeep } from "@/lib/campaigns/useCampaignUpkeep";
import { keepExpiry, readCarried, updateCarried, writeCarried } from "@/lib/campaigns/useCarried";
import { getMessages } from "@/lib/i18n";
import { todayKey } from "@/lib/rhythm/dayKey";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the switch is not read as the switch. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

/** A device that already holds a carried campaign, as one would after a tester's build. */
function deviceHolding(): { store: Map<string, string>; writes: string[] } {
  const today = todayKey();
  const list: CarriedCampaign[] = carry([], { id: ID, name: "Nicholas", title: "Forty days for Nicholas", forWhom: "departed", prayer: null, lastDay: "2099-12-31" }, ["evening"], "2099-12-31", today);
  expect(list).toHaveLength(1);
  const store = new Map<string, string>([[CARRIED_KEY, JSON.stringify(list)]]);
  const writes: string[] = [];
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        writes.push(k);
        store.set(k, v);
      },
      removeItem: (k: string) => void store.delete(k),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
  return { store, writes };
}

beforeEach(() => {
  calls.length = 0;
  __forgetCampaignsOpen();
  __setCampaignsOpening("closed");
});

afterEach(() => {
  vi.unstubAllGlobals();
  __setCampaignsOpening("closed");
});

describe("the switch", () => {
  it("is committed closed", () => {
    // The constant itself, not what a test set it to.
    expect(CAMPAIGNS_OPENING).toBe("closed");
    expect(code("lib/campaigns/flags.ts")).toContain('export const CAMPAIGNS_OPENING: CampaignsOpening = "closed" as CampaignsOpening;');
    expect(campaignsInBuild()).toBe(false);
    expect(campaignsEnabled()).toBe(false);
  });

  it("is a constant in version control, read from no setting of the environment", () => {
    // An environment variable is how a preview build once showed a feature
    // that production did not have. The position is a line of this file.
    expect(code("lib/campaigns/flags.ts")).not.toMatch(/process\.env/);
  });

  it("never brings July's routes back, in any position", () => {
    for (const position of ["closed", "testers", "open"] as const) {
      __setCampaignsOpening(position);
      expect(julyCampaignRoutes(), position).toBe(false);
    }
  });
});

describe("closed: the pages", () => {
  const RUN: Record<string, () => unknown> = {
    "app/(app)/campaigns/page.tsx": CampaignsPage,
    "app/(app)/campaigns/detail/page.tsx": CampaignDetailPage,
    "app/(app)/campaigns/new/page.tsx": NewCampaignPage,
    "app/(app)/campaigns/mine/page.tsx": MyCampaignsPage,
    "app/(app)/campaigns/rules/page.tsx": CampaignRulesPage,
  };
  const PAGES = Object.keys(RUN);

  it("are every page campaigns have, but the old address that only sends a reader on", () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        if (e.isDirectory()) walk(`${dir}/${e.name}`);
        else if (e.name === "page.tsx") found.push(`${dir}/${e.name}`);
      }
    };
    walk("app/(app)/campaigns");
    expect(found.sort()).toEqual([...PAGES, "app/(app)/campaigns/[id]/page.tsx"].sort());
    // The old address draws nothing of its own: it leads to the campaign's page, which is not found.
    expect(code("app/(app)/campaigns/[id]/page.tsx")).toMatch(/redirect\(`\/campaigns\/detail\?id=/);
  });

  it("are not found, before anything of theirs is drawn", () => {
    for (const file of PAGES) {
      const src = code(file);
      // The first thing the page does.
      const body = src.slice(src.indexOf("export default function"));
      const first = body.slice(body.indexOf("{") + 1).trim();
      expect(first.startsWith("if (!campaignsInBuild()) notFound();"), file).toBe(true);
      // And it does: the page's own function, run as the server runs it.
      let thrown: unknown = null;
      try {
        RUN[file]();
      } catch (e) {
        thrown = e;
      }
      expect(String((thrown as { digest?: string } | null)?.digest ?? ""), file).toContain("404");
    }
  });

  it("are kept from search engines once they are open", () => {
    for (const file of PAGES) expect(code(file), file).toContain("robots: { index: false, follow: false }");
  });
});

describe("closed: the device", () => {
  it("asks the server nothing", async () => {
    deviceHolding();
    expect(await fetchBoard()).toEqual({ state: "closed" });
    expect(await fetchCampaign(ID)).toEqual({ state: "missing" });
    expect(await fetchMine()).toEqual({ state: "closed" });
    expect(await fetchStates([ID])).toBeNull();
    await keepJoin(ID, ["evening"], null);
    await dropJoin(ID);
    expect((await reportCampaign(ID, "other", null)).ok).toBe(false);
    expect((await closeCampaign(ID, "answered")).ok).toBe(false);
    expect((await takeDownCampaign(ID)).ok).toBe(false);
    const started = await startCampaign({
      forWhom: "departed",
      kind: "departed",
      title: "Forty days for Nicholas",
      name: "Nicholas",
      words: null,
      days: 40,
      startsOn: todayKey(),
      prayer: null,
      consent: "family",
      blessing: true,
      rules: true,
    });
    expect(started.ok).toBe(false);
    await campaignUpkeep(true);
    expect(calls).toEqual([]);
  });

  it("is not asked whether campaigns are open, and the answer is no", async () => {
    deviceHolding();
    let told = 0;
    const stop = subscribeCampaignsOpen(() => told++);
    await Promise.resolve();
    await Promise.resolve();
    expect(campaignsOpenNow()).toBe(false);
    expect(calls).toEqual([]);
    expect(told).toBe(0);
    stop();
  });

  it("neither reads nor writes the list of carried campaigns, whatever the device holds", () => {
    const { store, writes } = deviceHolding();
    const before = store.get(CARRIED_KEY);
    expect(readCarried()).toEqual([]);
    writeCarried([]);
    keepExpiry();
    expect(updateCarried(() => [])).toEqual([]);
    expect(writes).toEqual([]);
    // What a tester's build left is still there, untouched, for the day it opens.
    expect(store.get(CARRIED_KEY)).toBe(before);
  });

  it("does all of that once the switch is not closed, so the test above is not vacuous", async () => {
    deviceHolding();
    __setCampaignsOpening("open");
    expect(readCarried().map((c) => c.id)).toEqual([ID]);
    expect((await fetchBoard()).state).toBe("ok");
    const stop = subscribeCampaignsOpen(() => {});
    await new Promise((r) => setTimeout(r, 0));
    expect(campaignsOpenNow()).toBe(true);
    expect(calls).toEqual(["/api/campaigns", "/api/campaigns/open"]);
    stop();
  });
});

describe("closed: the doors", () => {
  it("draw nothing of campaigns in Pray together", () => {
    const messages = getMessages("en");
    const el = createElement(
      MessagesProvider,
      { locale: "en", messages } as Parameters<typeof MessagesProvider>[0],
      createElement(PrayTogether, { signedIn: true, campaign: null, onOpenProfile: () => {} }),
    );
    const html = renderToStaticMarkup(el);
    expect(html).toContain("data-prayer-wall");
    expect(html).not.toContain("data-campaigns");
    expect(html).not.toContain("data-campaign-card");
    expect(html).not.toMatch(/\/campaigns/);
    expect(html).not.toContain(messages["community.prayerCampaigns"]);
    expect(calls).toEqual([]);
  });

  it("reach campaigns only through the two gates", () => {
    // Open for this reader: nothing until the server has said yes, and a
    // closed build never asks.
    const open = code("lib/campaigns/useCampaignsOpen.ts");
    expect(open).toMatch(/export function subscribeCampaignsOpen\(cb: \(\) => void\): \(\) => void \{\s*if \(!campaignsInBuild\(\)\) return \(\) => \{\};/);
    expect(open).toMatch(/export function campaignsOpenNow\(\): boolean \{\s*return campaignsInBuild\(\) && answer === true;/);
    // The carried list: nothing in a closed build.
    const carried = code("lib/campaigns/useCarried.ts");
    expect(carried).toContain('if (typeof window === "undefined" || !campaignsInBuild()) return EMPTY;');
    expect(carried.match(/!campaignsInBuild\(\)/g)?.length).toBeGreaterThanOrEqual(4);

    // Each screen that carries something of campaigns, and the gate it stands behind.
    const doors: Record<string, RegExp> = {
      "components/campaigns/PrayTogetherCampaigns.tsx": /const open = useCampaignsOpen\(\);\s*return open \? <Campaigns signedIn=\{signedIn\} \/> : null;/,
      "components/campaigns/CampaignNames.tsx": /const list = useCarried\(\);[\s\S]*if \(now\.length === 0 && asking\.length === 0 && !notice\) return null;/,
      "components/prayers/PrayerRuleReader.tsx": /const carriedList = useCarried\(\);/,
      "components/mobile/YouMobile.tsx": /const campaignsOpen = useCampaignsOpen\(\);[\s\S]*\.\.\.\(campaignsOpen\s/,
      "components/profile/AccountSettingsLinks.tsx": /const campaignsOpen = useCampaignsOpen\(\);[\s\S]*\.\.\.\(campaignsOpen\s/,
      "components/campaigns/CampaignsGate.tsx": /const answer = useCampaignsAnswer\(\);\s*if \(answer === true\) return <>\{children\}<\/>;/,
    };
    for (const [file, gate] of Object.entries(doors)) expect(code(file), file).toMatch(gate);

    // And nothing outside campaigns' own folders names a campaign page or
    // route but those doors, the old card of 1.8 and the tab bar's own map.
    const KNOWN = new Set([
      "components/mobile/YouMobile.tsx",
      "components/profile/AccountSettingsLinks.tsx",
      "components/nav/DiscoverDropdown.tsx",
      "components/nav/MobileTabBar.tsx",
    ]);
    const naming: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          if (e.name === "__tests__" || rel === "components/campaigns" || rel === "app/(app)/campaigns" || rel === "app/api/campaigns" || rel === "components/admin") continue;
          walk(rel);
        } else if (/\.tsx?$/.test(e.name) && /["'`]\/(?:api\/)?campaigns\b/.test(code(rel))) naming.push(rel);
      }
    };
    walk("components");
    walk("app");
    expect(naming.filter((f) => !KNOWN.has(f))).toEqual([]);
    // The menu's row waits for campaigns to be open to everyone, never to testers alone.
    expect(code("components/nav/DiscoverDropdown.tsx")).toContain('...(campaignsEnabled() ? [{ key: "campaigns", href: "/campaigns" }] : []),');
  });
});

describe("closed: the data", () => {
  // Columns only the rework has (July's file made the tables themselves).
  const NEW = /consent_kind|keep_after_end|until_on|prayer_rule|creator_handle/;
  const FOR_HIS_SIGNATURE = "docs/1.9-build/sql/campaigns-1-rework.sql";
  /** A file's SQL from its first statement on, its header left out. */
  const statements = (sql: string) => sql.slice(sql.search(/^set lock_timeout/m));

  it("keeps the rework's SQL out of the folder a merge runs against production, until he has signed it", () => {
    // A migration on this branch runs on production when 1.9 merges
    // (AGENTS.md, "Merging a migration to main runs it"), and campaigns ship
    // in 1.9, so the SQL goes into that folder: but only once the owner has
    // signed the SQL itself (docs/1.9-build/OWNER-STEPS.md, R0b). Until
    // then it waits in docs/1.9-build/sql and says so. On his signature this
    // test changes, to hold the migration to the SQL he signed, word for word.
    const hits = readdirSync(join(ROOT, "supabase/migrations")).filter((f) => NEW.test(read(`supabase/migrations/${f}`)));
    expect(hits).toEqual([]);
    expect(existsSync(join(ROOT, FOR_HIS_SIGNATURE))).toBe(true);
    expect(read(FOR_HIS_SIGNATURE)).toMatch(/^-- NOT APPLIED YET, AND NOT SIGNED YET\./m);
  });

  it("puts before him the SQL that was checked: the file is the notes' own, word for word", () => {
    // The notes' file one (5.2) is what ran twice on a scratch database and
    // what the routes' tests name their columns from. The copy he reads has a
    // header of its own in plain words, and not one statement of its own.
    const notes = read("docs/1.9-build/notes/campaigns-fable.md");
    const block = [...notes.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]).find((b) => b.includes("prayer_campaigns_intention_check"));
    expect(block).toBeTruthy();
    const signed = statements(read(FOR_HIS_SIGNATURE));
    expect(signed.length).toBeGreaterThan(5000);
    expect(signed).toBe(statements(block!));
    expect(signed).toMatch(NEW);
    // Safe to run twice: nothing is made without "if not exists", a check
    // first, or dropping what it is about to make.
    expect(signed).not.toMatch(/create (?:unique )?index (?!if not exists)/i);
    expect(signed).not.toMatch(/add column (?!if not exists)/i);
    expect(signed).not.toMatch(/create policy/i);
  });
});
