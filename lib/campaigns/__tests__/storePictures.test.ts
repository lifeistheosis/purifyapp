import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A store build has campaign pictures only when it was cut with them
 * (lib/campaigns/flags.ts, PICTURES_IN_STORE_BUILDS; lib/campaigns/
 * partsHere.ts). Agreed with the Admin chat on 2026-11-10, for the stores'
 * rule against a feature asleep in a build: with the constant false an app
 * draws no picture and no picture control and asks the pictures' route for
 * nothing, whatever the server answers, and the website follows the server
 * as before.
 *
 * What would go wrong if these broke: a store build reviewed with the
 * pictures' controls asleep in it and switched on later from the server; a
 * release commit that cut the apps with pictures while the server had them
 * off; a website that lost its pictures because an app has none; the team's
 * button counting pictures its page cannot draw.
 */

const state = vi.hoisted(() => ({
  /** Whether the code is running inside a store build's shell. */
  native: true,
  /** What the server answers, by path (without its query). */
  answers: {} as Record<string, unknown>,
  /** Every address the app asked, in order. */
  asked: [] as string[],
}));

vi.mock("@/lib/platform/native", () => ({ isNativeClient: () => state.native }));
vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(async (path: string) => {
    state.asked.push(path);
    const body = state.answers[path.split("?")[0]];
    return new Response(JSON.stringify(body ?? { error: "Not found." }), { status: body ? 200 : 404, headers: { "content-type": "application/json" } });
  }),
}));

import { addPicture, fetchPictures, removePicture, reportPicture } from "@/lib/campaigns/client";
import { CAMPAIGNS_OPENING, PICTURES_IN_STORE_BUILDS, __setCampaignsOpening, __setPicturesInStoreBuilds, picturesInStoreBuilds } from "@/lib/campaigns/flags";
import { CAMPAIGN_PARTS } from "@/lib/campaigns/parts";
import { partInThisBuild, queueInThisBuild } from "@/lib/campaigns/partsHere";
import { __forgetCampaignsOpen, campaignPartNow, subscribeCampaignsOpen } from "@/lib/campaigns/useCampaignsOpen";
import { fetchModQueue, fetchModWaiting } from "@/lib/community/client";

const CAMPAIGN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const PICTURE = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const settle = () => new Promise((r) => setTimeout(r, 0));

/** The server has pictures switched on, and one waits in the team's queue. */
function serverHasPictures() {
  state.answers = {
    "/api/campaigns/open": { open: true, parts: { many: true, pictures: true } },
    [`/api/campaigns/${CAMPAIGN}/pictures`]: { pictures: [{ id: PICTURE, url: "https://example.test/p.jpg", alt: null, held: false }], limit: 5, canAdd: false },
    "/api/community/moderation": { holds: [], reports: [], log: [], me: { name: "Team", admin: true }, campaigns: { waiting: [], reports: [], live: true, pictures: [{ id: PICTURE }] }, waiting: 1 },
  };
}

/** Let the app ask whether campaigns are open, and hear the answer. */
async function told() {
  const stop = subscribeCampaignsOpen(() => {});
  await settle();
  stop();
}

beforeEach(() => {
  state.native = true;
  state.asked = [];
  serverHasPictures();
  __setCampaignsOpening("testers");
  __setPicturesInStoreBuilds(false);
  __forgetCampaignsOpen();
});

afterEach(() => {
  __setCampaignsOpening(CAMPAIGNS_OPENING);
  __setPicturesInStoreBuilds(PICTURES_IN_STORE_BUILDS);
  __forgetCampaignsOpen();
});

describe("as committed", () => {
  it("store builds are cut without pictures while the server has them off", () => {
    // The release commit sets it true only if pictures are on at submission
    // (docs/plans/v1.9/RELEASE.md, section 6; docs/1.9-build/OWNER-STEPS.md,
    // R5d). Cut with pictures while the
    // server has them off, a store build would carry them asleep.
    expect(PICTURES_IN_STORE_BUILDS && !CAMPAIGN_PARTS.pictures).toBe(false);
    __setPicturesInStoreBuilds(PICTURES_IN_STORE_BUILDS);
    expect(picturesInStoreBuilds()).toBe(PICTURES_IN_STORE_BUILDS);
  });
});

describe("which builds have pictures at all", () => {
  it("a store build only when it was cut with them; the website always; and no other part is held back", () => {
    for (const [native, cut, has] of [
      [true, false, false],
      [true, true, true],
      [false, false, true],
      [false, true, true],
    ] as const) {
      state.native = native;
      __setPicturesInStoreBuilds(cut);
      expect(partInThisBuild("pictures"), `native ${native}, cut with pictures ${cut}`).toBe(has);
      expect(partInThisBuild("many")).toBe(true);
    }
  });
});

describe("a store build cut without pictures, while the server has them on", () => {
  it("never believes pictures are on, and still follows the server for the rest", async () => {
    await told();
    expect(campaignPartNow("pictures")).toBe(false);
    expect(campaignPartNow("many")).toBe(true);
  });

  it("asks the pictures' route for nothing: not the list, not an upload, not a removal, not a report", async () => {
    await told();
    expect(await fetchPictures(CAMPAIGN)).toEqual({ state: "none" });
    expect(await addPicture(CAMPAIGN, new File(["x"], "p.jpg", { type: "image/jpeg" }), { adult: true, consent: true, alt: "" })).toMatchObject({ ok: false, status: 404 });
    expect((await removePicture(CAMPAIGN, PICTURE)).ok).toBe(false);
    expect((await reportPicture(CAMPAIGN, PICTURE, "picture", null)).ok).toBe(false);
    expect(state.asked).toEqual(["/api/campaigns/open"]);
  });

  it("tells the moderators' route it has none, is sent none, and draws none even if some were sent", async () => {
    const got = await fetchModQueue();
    expect(state.asked).toEqual(["/api/community/moderation?pictures=0"]);
    // The stand-in answers with pictures all the same: they are dropped where they come in.
    expect(got.ok && got.queue.campaigns).toEqual({ waiting: [], reports: [], live: true });
    await fetchModWaiting();
    expect(state.asked[1]).toBe("/api/community/moderation?summary=1&pictures=0");
  });
});

describe("everywhere else the server decides, as before", () => {
  it("the website shows pictures the moment the server says so, whatever the store builds were cut with", async () => {
    state.native = false;
    await told();
    expect(campaignPartNow("pictures")).toBe(true);
    expect(await fetchPictures(CAMPAIGN)).toMatchObject({ state: "ok" });
    const got = await fetchModQueue();
    expect(state.asked).toEqual(["/api/campaigns/open", `/api/campaigns/${CAMPAIGN}/pictures`, "/api/community/moderation"]);
    expect(got.ok && got.queue.campaigns?.pictures).toHaveLength(1);
    await fetchModWaiting();
    expect(state.asked[3]).toBe("/api/community/moderation?summary=1");
  });

  it("a store build cut with pictures has them when the server says so, and not before", async () => {
    __setPicturesInStoreBuilds(true);
    state.answers["/api/campaigns/open"] = { open: true, parts: { many: true, pictures: false } };
    await told();
    expect(campaignPartNow("pictures")).toBe(false);
    expect(await fetchPictures(CAMPAIGN)).toEqual({ state: "none" });

    __forgetCampaignsOpen();
    serverHasPictures();
    await told();
    expect(campaignPartNow("pictures")).toBe(true);
    expect(await fetchPictures(CAMPAIGN)).toMatchObject({ state: "ok" });
  });

  it("the queue is handed on untouched where the build has pictures, and where it carries none", () => {
    state.native = false;
    const withPictures = { waiting: [], reports: [], live: true, pictures: [] };
    expect(queueInThisBuild(withPictures)).toBe(withPictures);
    state.native = true;
    const without = { waiting: [], reports: [], live: true };
    expect(queueInThisBuild(without)).toBe(without);
    expect(queueInThisBuild(withPictures)).toEqual(without);
  });
});

describe("every screen follows from the one answer", () => {
  const code = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("the build's rule is asked where the server's answers come in, and nowhere a screen could miss it", () => {
    expect(code("lib/campaigns/useCampaignsOpen.ts")).toContain("said[p] === true && partInThisBuild(p)");
    const community = code("lib/community/client.ts");
    expect(community).toContain("campaigns: queueInThisBuild(json.campaigns)");
    expect(community.match(/partInThisBuild\("pictures"\) \? "" : /g)).toHaveLength(2);
    // The app's own calls to the pictures' route all pass the one gate.
    const client = code("lib/campaigns/client.ts");
    expect(client).toContain('const picturesOff = () => !campaignsInBuild() || !campaignPartNow("pictures");');
    expect(client.match(/if \(picturesOff\(\)\)/g)).toHaveLength(4);
    expect(client.match(/\/pictures/g)!.length).toBeGreaterThan(0);
  });

  it("a screen draws pictures only on the app's own answer for the part, never on a response's own word", () => {
    // The campaign's page and the rules ask the hook; nothing in the screens reads `parts` for itself.
    expect(code("components/campaigns/CampaignPage.tsx")).toContain('const picturesOn = useCampaignPart("pictures") && campaign.days !== null;');
    expect(code("components/campaigns/CampaignRules.tsx")).toContain('const pictures = useCampaignPart("pictures");');
    for (const screen of ["components/campaigns/CampaignPage.tsx", "components/campaigns/CampaignPictures.tsx", "components/campaigns/CampaignRules.tsx", "components/campaigns/CampaignModeration.tsx"]) {
      expect(code(screen), screen).not.toMatch(/parts\??\.pictures/);
    }
    // The constant's file knows nothing of which build is asking: it reads no setting, as ever.
    expect(code("lib/campaigns/flags.ts")).not.toMatch(/process\.env|isNativeClient|IS_STATIC_EXPORT/);
  });
});
