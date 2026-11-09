// What the website serves stays readable by the builds in readers' hands.
//
// An installed app cannot be changed. It loads its own bundled copy and asks
// the website, as it stood on the day the app was built, for three things to
// play a chant: the list of recordings that may play, a recording, and (the
// builds through 86) a recording's timing file. If main ever serves one of
// those in a shape an installed build does not read, or stops serving it,
// that build's chants stop for every reader who has it, and nothing in the
// new build's own tests would say so: they test the new build.
//
// The owner, 2026-11-09, on the report that the chant player does not load:
// "Maybe one possibility that happened before was that we would update the
// public build, and then it would conflict with some of the users that don't
// have the updated public build." It had happened once: on 2026-10-17 the 1.7
// apps went out before the website carried the list. This time the website
// was not the cause (the 1.8 store bundle plays every recording against it),
// but from 1.9 the list is a route and no longer a file, which is exactly the
// kind of change that could be.
//
// scripts/chants/store-builds.json is the record of what each build asks for.
// The readers below are copies of what those builds run, kept here on
// purpose: importing the app's own would let a change to it pass unseen.
// scripts/chants/probe-live.mjs asks the same of purifyapp.net itself.

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import builds from "@/scripts/chants/store-builds.json";

const state = vi.hoisted(() => ({ pulls: [] as string[], fail: false }));
vi.mock("@/lib/chants/pulls.server", () => ({
  activePulls: async () => {
    if (state.fail) throw new Error("the takedowns cannot be read");
    return state.pulls;
  },
}));

import { GET } from "@/app/audio/chants/live.json/route";

/** The list as the 1.7 and 1.8 builds read it: version 1, two lists of strings, or nothing. */
function listAsStoreBuildsReadIt(value: unknown): { live: string[]; pulled: string[] } | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { v?: unknown; live?: unknown; pulled?: unknown };
  const strings = (a: unknown): a is string[] => Array.isArray(a) && a.every((s) => typeof s === "string");
  if (v.v !== 1 || !strings(v.live) || !strings(v.pulled)) return null;
  return { live: v.live, pulled: v.pulled };
}

/** A timing file as the builds through 86 read it: version 1 only. */
function timingAsOldBuildsReadIt(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as { v?: unknown; durationSec?: unknown; lines?: unknown };
  if (v.v !== 1 || typeof v.durationSec !== "number" || !Array.isArray(v.lines)) return false;
  return v.lines.every(
    (l: { at?: unknown; end?: unknown; text?: unknown } | null) =>
      Boolean(l) && typeof l!.at === "number" && typeof l!.end === "number" && typeof l!.text === "string",
  );
}

const committed = JSON.parse(fs.readFileSync("data/chants-live.json", "utf8")) as { live: string[]; pulled: string[] };
const recordings = builds.builds.flatMap((b) => b.recordings.map((r) => ({ build: b.name, ...(r as { ref: string; audio: string; timing?: string }) })));
const onWebsite = (address: string) => path.join("public", address);

beforeEach(() => {
  state.pulls = [];
  state.fail = false;
});

describe("the list every installed app asks for", () => {
  it("is still at the address they ask, and not a file and a route at once", () => {
    expect(builds.list.path).toBe("/audio/chants/live.json");
    expect(fs.existsSync("app/audio/chants/live.json/route.ts")).toBe(true);
    expect(fs.existsSync(onWebsite(builds.list.path))).toBe(false);
  });

  it("is read by every store build: version 1, as they read it", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const list = listAsStoreBuildsReadIt(await res.json());
    expect(list).not.toBeNull();
    expect(list).toEqual({ live: committed.live, pulled: committed.pulled });
    expect(builds.list.version).toBe(1);
  });

  it("may be read by an app, which is another origin: one allow-origin of *, and the resource policy", async () => {
    const res = await GET();
    // A browser refuses a list that names the origin twice, or not at all.
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    const kept = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "");
    expect(kept).not.toBeNull();
    expect(Number(kept![1])).toBeLessThanOrEqual(builds.list.keptAtMostSeconds);
  });

  it("is still that list, readable, with a recording taken down from the admin", async () => {
    state.pulls = ["psalm-135/en"];
    const list = listAsStoreBuildsReadIt(await (await GET()).json());
    expect(list).not.toBeNull();
    expect(list!.pulled).toContain("psalm-135/en");
    expect(list!.live).not.toContain("psalm-135/en");
    expect(list!.live.length).toBe(committed.live.length - 1);
  });

  it("names every recording a store build carries: live, or taken down on purpose, never dropped", () => {
    const named = new Set([...committed.live, ...committed.pulled]);
    for (const r of recordings) expect(named.has(r.ref), `${r.ref}, which ${r.build} carries, is in neither list`).toBe(true);
  });
});

describe("the recordings and timing files installed apps ask for", () => {
  const stillOffered = recordings.filter((r) => committed.live.includes(r.ref));

  it("has every store build's recordings on record", () => {
    expect(builds.builds.length).toBeGreaterThanOrEqual(3);
    expect(stillOffered.length).toBeGreaterThan(0);
    for (const b of builds.builds) expect(b.recordings.length, b.name).toBeGreaterThan(0);
  });

  it("keeps on the website each recording a build asks the website for", () => {
    for (const r of stillOffered.filter((x) => x.audio.startsWith("/"))) {
      expect(fs.existsSync(onWebsite(r.audio)), `${r.audio}, asked for by ${r.build}`).toBe(true);
      // The header rule that lets an app play it covers its folder.
      expect(r.audio.startsWith("/audio/chants/")).toBe(true);
    }
  });

  it("keeps each bucket recording at the address the builds carry", () => {
    // A file in the bucket is never moved or renamed: a build in a reader's
    // hands asks for the address it was built with. A new take gets a new
    // version id beside the old one.
    for (const r of stillOffered.filter((x) => x.audio.startsWith("https://"))) {
      expect(r.audio).toMatch(/^https:\/\/audio\.purifyapp\.net\/chants\/[a-z0-9-]+\/[a-z0-9-]+\.mp3$/);
      const [slug, id] = r.ref.split("/");
      const chant = JSON.parse(fs.readFileSync(path.join("data", "chants", `${slug}.json`), "utf8")) as {
        variants: { id: string; audio: { src: string } }[];
      };
      const variant = chant.variants.find((v) => v.id === id);
      expect(variant, `${r.ref} is live in the list and gone from data/chants/${slug}.json`).toBeDefined();
      expect(variant!.audio.src, `${r.ref} moved; ${r.build} still asks for the old address`).toBe(r.audio);
    }
  });

  it("keeps each timing file an older build asks the website for, in the version it reads", () => {
    for (const r of stillOffered.filter((x) => x.timing)) {
      const file = onWebsite(r.timing!);
      expect(fs.existsSync(file), `${r.timing}, asked for by ${r.build}`).toBe(true);
      expect(timingAsOldBuildsReadIt(JSON.parse(fs.readFileSync(file, "utf8"))), `${r.timing} is not version 1 as ${r.build} reads it`).toBe(true);
    }
  });

  it("serves the chant folder with the headers an app's web view needs", () => {
    const config = fs.readFileSync("next.config.ts", "utf8");
    const headers = config.slice(config.indexOf("async headers()"));
    expect(headers).toContain("{ source: CHANT_MEDIA_SOURCE, headers: streamedMediaHeaders }");
    expect(config).toContain('const CHANT_MEDIA_SOURCE = "/audio/chants/:path*";');
  });
});
