// With the switch closed, the app behaves exactly as it did before prayer
// campaigns were reworked (the arbiter's rule 2 of 2026-11-10: "With the
// switch closed and no new tables, the app behaves exactly as today. A test
// holds that.").
//
// The rework is built behind a switch, and it ships in 1.9 (his later word
// of the same day: "ok to all ensure its all in v1.9"). What makes building
// it beside the rest of 1.9 safe is one constant (lib/campaigns/flags.ts)
// and the handful of places that ask it. This file holds each of them.
//
// The constant was committed closed until 2026-11-10, when it moved to
// "testers" on the branch at his word ("exactly I meant it should be in my
// build"): release day's step 1 done early, for the test web and a test
// build. Closed is still a position, and the one the main web is in until
// the merge, so every case below sets it and holds what closed means.
//
//   the switch   committed at testers, never open; closed set case by case
//   the server   every route answers 404 and reads nothing
//                (routes.test.ts, "closed: every route answers 404 and the
//                database is never asked", which this file does not repeat)
//   the pages    every campaign page is not found, on the server
//   the device   nothing is asked of the server, and the list of carried
//                campaigns is neither read nor written, whatever it holds
//   the doors    the screens that carry campaigns reach them only through
//                those two gates, and draw nothing of them
//   the data     only SQL he has signed is in the folder a merge runs
//                against production, word for word as he signed it; what
//                he has not signed waits in docs/1.9-build/sql
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
  addPicture,
  closeCampaign,
  dropJoin,
  fetchBoard,
  fetchCampaign,
  fetchMany,
  fetchMine,
  fetchPictures,
  fetchStates,
  fetchThread,
  keepJoin,
  removeNote,
  removePicture,
  reportCampaign,
  reportPicture,
  setCommentsOpen,
  setListed,
  startCampaign,
  takeDownCampaign,
  writeNote,
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
  it("is committed at testers, release day's step 1 done early, and never open", () => {
    // The constant itself, not what a test set it to. His word of 2026-11-10,
    // "exactly I meant it should be in my build": a test build has the
    // campaign pages, and the test web answers for its admins. Open, for
    // every reader, is one line that waits for his word.
    expect(CAMPAIGNS_OPENING).toBe("testers");
    expect(CAMPAIGNS_OPENING).not.toBe("open");
    expect(code("lib/campaigns/flags.ts")).toContain('export const CAMPAIGNS_OPENING: CampaignsOpening = "testers" as CampaignsOpening;');
    // As committed: in the build, so its screens ask the website; and told
    // to nobody, so no page that sells Purify names campaigns yet.
    __setCampaignsOpening(CAMPAIGNS_OPENING);
    expect(campaignsInBuild()).toBe(true);
    expect(campaignsEnabled()).toBe(false);
  });

  it("closed is still a position: nothing in the build, and open for nobody", () => {
    __setCampaignsOpening("closed");
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
      termsAccepted: true,
    });
    expect(started.ok).toBe(false);
    // Updates and comments, and "Prayed by many", as closed as the rest.
    expect(await fetchThread(ID)).toEqual({ state: "missing" });
    expect((await writeNote(ID, "comment", "Praying.")).ok).toBe(false);
    expect((await removeNote(ID, ID)).ok).toBe(false);
    expect((await setCommentsOpen(ID, false)).ok).toBe(false);
    expect(await fetchMany("week")).toEqual([]);
    expect((await setListed(ID, false)).ok).toBe(false);
    // Pictures: closed with campaigns, and switched off on the server besides.
    expect(await fetchPictures(ID)).toEqual({ state: "none" });
    expect((await addPicture(ID, new File(["x"], "p.jpg", { type: "image/jpeg" }), { adult: true, consent: true, alt: "" })).ok).toBe(false);
    expect((await removePicture(ID, ID)).ok).toBe(false);
    expect((await reportPicture(ID, ID, "picture", null)).ok).toBe(false);
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
  // Columns only the rework's file one has (July's file made the tables themselves).
  const NEW = /consent_kind|keep_after_end|until_on|prayer_rule|creator_handle/;
  /** What only file two makes. */
  const NEW_IN_TWO = /campaign_update|community_posts_campaign_thread/;
  /** File one, the copy to paste, and the migration it became on his signature ("R0b yes 1", 2026-11-10). */
  const FOR_HIS_SIGNATURE = "docs/1.9-build/sql/campaigns-1-rework.sql";
  const SIGNED = "supabase/migrations/20261110084116_campaigns_rework.sql";
  /**
   * File two: a campaign's updates and comments, as its own thread in
   * Community. And file three: a campaign's pictures, which are switched off
   * on the server besides. Each with the migration it became on his
   * signature: "All recommendations. Start.", 2026-11-10 at about 13:50 UTC,
   * which answered the arbiter's list whose item 7 was file two, and file
   * three, put to him at 12:02 after a second chat had read it
   * (docs/1.9-build/HANDOFF.md, docs/1.9-build/BRAINSTORM.md).
   */
  const THREADS_FOR_HIS_SIGNATURE = "docs/1.9-build/sql/campaigns-2-threads.sql";
  const THREADS_SIGNED = "supabase/migrations/20261110135543_campaign_threads.sql";
  const PICTURES_FOR_HIS_SIGNATURE = "docs/1.9-build/sql/campaigns-3-pictures.sql";
  const PICTURES_SIGNED = "supabase/migrations/20261110135545_campaign_pictures.sql";
  /**
   * File four: the moment a creator accepted the Terms of Service. With the
   * migration it became on his signature: "rec yes to all", 2026-11-10 at
   * about 16:45 UTC, which covered it once a second chat's read had passed,
   * and the Admin chat's passed at about 17:00 UTC with nothing to change
   * (docs/1.9-build/BRAINSTORM.md, docs/1.9-build/OWNER-STEPS.md).
   */
  const TERMS_FOR_HIS_SIGNATURE = "docs/1.9-build/sql/campaigns-4-terms.sql";
  const TERMS_SIGNED = "supabase/migrations/20261110172648_campaign_terms.sql";
  /** A file's SQL from its first statement on, its header left out. */
  const statements = (sql: string) => sql.slice(sql.search(/^set lock_timeout/m));

  it("runs file one from the folder a merge runs against production: once, signed, and word for word as he signed it", () => {
    // A migration on this branch runs on production when 1.9 merges
    // (AGENTS.md, "Merging a migration to main runs it"), so only SQL the
    // owner has signed is in that folder (docs/1.9-build/OWNER-STEPS.md,
    // R0b). File one is: "R0b yes 1", 2026-11-10 (docs/1.9-build/HANDOFF.md).
    // The migration is the copy he was shown, statement for statement, so
    // what runs on the merge is what was checked and what was signed.
    const hits = readdirSync(join(ROOT, "supabase/migrations")).filter((f) => NEW.test(read(`supabase/migrations/${f}`)));
    expect(hits.map((f) => `supabase/migrations/${f}`)).toEqual([SIGNED]);
    expect(statements(read(SIGNED))).toBe(statements(read(FOR_HIS_SIGNATURE)));
    for (const file of [SIGNED, FOR_HIS_SIGNATURE]) {
      expect(read(file), file).toMatch(/Signed off by the owner on 2026-11-10/);
      expect(read(file), file).not.toMatch(/NOT SIGNED YET/);
    }
    // Neither says it was applied by hand: a probe of production that day
    // found it had not run, and a header may only say what a probe has seen.
    expect(read(SIGNED)).toMatch(/^-- SIGNED, AND NOT APPLIED BY HAND\./m);
    expect(read(FOR_HIS_SIGNATURE)).toMatch(/^-- NOT APPLIED YET\./m);
  });

  it("runs files two and three from that folder as well: each once, signed, word for word, and after file one", () => {
    // Until he signed them they were held out of the folder by this test.
    // Now each is in it exactly once, and is the copy that was read by a
    // second chat and put to him in plain words, statement for statement.
    const folder = readdirSync(join(ROOT, "supabase/migrations"));
    const files = [
      [NEW_IN_TWO, THREADS_SIGNED, THREADS_FOR_HIS_SIGNATURE],
      [/prayer_campaign_pictures/, PICTURES_SIGNED, PICTURES_FOR_HIS_SIGNATURE],
    ] as const;
    for (const [makes, signed, copy] of files) {
      const hits = folder.filter((f) => makes.test(read(`supabase/migrations/${f}`)));
      expect(hits.map((f) => `supabase/migrations/${f}`)).toEqual([signed]);
      expect(existsSync(join(ROOT, copy))).toBe(true);
      expect(statements(read(signed))).toBe(statements(read(copy)));
      for (const file of [signed, copy]) {
        expect(read(file), file).toMatch(/Signed off by the owner on 2026-11-10/);
        expect(read(file), file).toContain('"All recommendations. Start."');
        expect(read(file), file).not.toMatch(/NOT SIGNED YET/);
      }
      // Neither says it was applied: a probe of production that day found it
      // had not run, and a header may only say what a probe has seen.
      expect(read(signed)).toMatch(/^-- SIGNED, AND NOT APPLIED BY HAND\./m);
      expect(read(copy)).toMatch(/^-- NOT APPLIED YET\./m);
    }
    // The folder is run by name: one, then two, then three.
    const order = [SIGNED, THREADS_SIGNED, PICTURES_SIGNED].map((f) => f.slice(f.lastIndexOf("/") + 1));
    expect([...order].sort()).toEqual(order);
  });

  it("runs file four, the acceptance of the Terms, from that folder too: once, signed, read by a second chat, word for word, and last", () => {
    // Until he had said yes, and until a second chat's read had passed, this
    // test held it out of the folder: a file there runs on production at the
    // merge, and on the test web's database once it reaches the branch,
    // signed or not (docs/1.9-build/HANDOFF.md). Now it is in it exactly
    // once, and is the copy that was read, statement for statement.
    const folder = readdirSync(join(ROOT, "supabase/migrations"));
    const hits = folder.filter((f) => /terms_accepted_at/.test(read(`supabase/migrations/${f}`)));
    expect(hits.map((f) => `supabase/migrations/${f}`)).toEqual([TERMS_SIGNED]);
    expect(existsSync(join(ROOT, TERMS_FOR_HIS_SIGNATURE))).toBe(true);
    expect(statements(read(TERMS_SIGNED))).toBe(statements(read(TERMS_FOR_HIS_SIGNATURE)));
    for (const file of [TERMS_SIGNED, TERMS_FOR_HIS_SIGNATURE]) {
      expect(read(file), file).toMatch(/Signed off by the owner on 2026-11-10/);
      expect(read(file), file).toContain('"rec yes to all"');
      // His yes covered it once the second read had passed, so the file says that it did.
      expect(read(file), file).toMatch(/^-- Read by a second chat on 2026-11-10 \(Admin\): passes, with nothing to\n-- change\./m);
      expect(read(file), file).not.toMatch(/NOT SIGNED YET/);
    }
    // Neither says it was applied: a probe of production that day found it
    // had not run, and a header may only say what a probe has seen.
    expect(read(TERMS_SIGNED)).toMatch(/^-- SIGNED, AND NOT APPLIED BY HAND\./m);
    expect(read(TERMS_FOR_HIS_SIGNATURE)).toMatch(/^-- NOT APPLIED YET\./m);
    // One statement, which can run twice, and nothing that gives a right.
    const body = statements(read(TERMS_SIGNED)).replace(/^--.*$/gm, "");
    expect(body.match(/;/g)).toHaveLength(3);
    expect(body).toMatch(/alter table public\.prayer_campaigns\s+add column if not exists terms_accepted_at timestamptz;/);
    expect(body).not.toMatch(/\bgrant\b|\bdefault\b|\bdrop\b|\bdelete\b|\bupdate\b/i);
    // The folder is run by name: one, two, three, then this.
    const order = [SIGNED, THREADS_SIGNED, PICTURES_SIGNED, TERMS_SIGNED].map((f) => f.slice(f.lastIndexOf("/") + 1));
    expect([...order].sort()).toEqual(order);
  });

  it("file three gives the public key nothing, and takes no yes that was not asked for", () => {
    const sql = statements(read(PICTURES_FOR_HIS_SIGNATURE));
    // Nobody reads a picture's row straight from the table: row level
    // security with no policy, and no right for the public key or a
    // signed-in reader (run with both roles on a scratch PostgreSQL). Where a
    // file is kept is the server's alone.
    expect(sql).toContain("alter table public.prayer_campaign_pictures enable row level security;");
    expect(sql).toContain("revoke all on public.prayer_campaign_pictures from anon, authenticated;");
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/grant [^;]*\bto\s+(?:anon|authenticated|public)\b/i);
    // It waits unless a moderator says otherwise, and goes with its campaign.
    expect(sql).toContain("status text not null default 'held' check (status in ('held', 'shown', 'removed'))");
    // The moment its creator affirmed the two lines is required and has no
    // default (the second chat's read of the SQL, 2026-11-10): only the
    // route that asked writes it, so a write that never asked cannot record
    // a yes. pictures.test.ts holds that the route does write it.
    expect(sql).toContain("consent_at timestamptz not null,");
    expect(sql).not.toMatch(/consent_at[^,\n]*default/);
    expect(sql).toContain("references public.prayer_campaigns (id) on delete cascade");
    // Safe to run twice.
    expect(sql).toMatch(/create table if not exists public\.prayer_campaign_pictures/);
    expect(sql).not.toMatch(/create (?:unique )?index (?!if not exists)/i);
    // And it is the notes' own, word for word (5.4), as file one is.
    const notes = read("docs/1.9-build/notes/campaigns-fable.md");
    const block = [...notes.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]).find((b) => b.includes("create table if not exists public.prayer_campaign_pictures"));
    expect(block).toBeTruthy();
    expect(statements(block!).trim()).toBe(sql.trim());
  });

  it("makes a campaign's thread a post with a state of its own, which is what keeps it out of Community", () => {
    // File two. Every read of Community asks for a post that is 'visible',
    // and so do the row policies of posts and replies, so a thread that says
    // 'campaign' is in none of them (proved with the public key's role on a
    // scratch PostgreSQL; the routes' side is thread.test.ts). The file has
    // to go on saying so: a thread that were merely a post with a campaign's
    // id would stand in the feed.
    const threads = statements(read(THREADS_FOR_HIS_SIGNATURE));
    expect(threads).toContain("check (status in ('visible', 'removed', 'held', 'campaign'));");
    expect(threads).toContain("check ((status = 'campaign') = (campaign_id is not null));");
    expect(threads).toMatch(/create unique index if not exists community_posts_campaign_thread_idx\s+on public\.community_posts \(campaign_id\)/);
    expect(threads).toContain("references public.prayer_campaigns (id) on delete cascade");
    expect(threads).not.toMatch(/create (?:unique )?index (?!if not exists)/i);
    expect(threads).not.toMatch(/add column (?!if not exists)/i);
    expect(threads).not.toMatch(/create policy|grant /i);
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
