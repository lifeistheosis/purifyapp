// The on-phone voice's Plus rule (1.9; F-09: a route on the money path ships
// with its tests). What is free and what is Plus is the owner's word of
// 2026-11-11 ("yes free Heart"): the Heart voice free to every reader, every
// other on-phone voice Plus, decided on the server.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DEV_PLUS_ENTITLEMENTS } from "@/lib/dev/developer";
import type { EntitlementRow } from "@/lib/entitlements/entitlements";
import {
  decidePhoneVoice,
  FREE_PHONE_VOICE,
  offeredPhoneVoices,
  PHONE_VOICE_ROUTE,
  PHONE_VOICE_STORE,
  PHONE_VOICES,
  phoneVoiceFile,
  type PhoneVoice,
} from "@/lib/listen/phoneVoices";

const NOW = new Date("2026-11-11T12:00:00.000Z");
const FUTURE = "2027-06-01T00:00:00.000Z";
const PAST = "2026-01-01T00:00:00.000Z";

const free: EntitlementRow = { is_supporter: false, plus_until: null, plus_source: null, pro_until: null };
const lapsed: EntitlementRow = { ...free, plus_until: PAST };
const plus: EntitlementRow = { ...free, plus_until: FUTURE, plus_source: "play" };
const pro: EntitlementRow = { ...free, pro_until: FUTURE };
const supporter: EntitlementRow = { ...free, is_supporter: true };

/** A list with one Plus voice offered, as it will be once he has kept one. */
const KEPT: readonly PhoneVoice[] = [
  { id: "af_heart", plus: false, offered: true },
  { id: "bm_george", plus: true, offered: true },
  { id: "bf_emma", plus: true, offered: false },
];
const on = { enforced: true, now: NOW, voices: KEPT };

describe("the on-phone voices", () => {
  it("has one free voice, Heart, and it is offered", () => {
    const freeOnes = PHONE_VOICES.filter((v) => !v.plus);
    expect(freeOnes.map((v) => v.id)).toEqual([FREE_PHONE_VOICE]);
    expect(freeOnes[0].offered).toBe(true);
    expect(offeredPhoneVoices()[0].id).toBe(FREE_PHONE_VOICE);
  });

  it("names each voice once, as the engine names it", () => {
    const ids = PHONE_VOICES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[ab][fm]_[a-z]+$/);
  });

  it("fetches the free voice from Purify's own storage and a Plus voice from the website's route", () => {
    expect(phoneVoiceFile(KEPT[0])).toEqual({ url: `${PHONE_VOICE_STORE}/voices/af_heart.bin`, needsAccount: false });
    expect(phoneVoiceFile(KEPT[1])).toEqual({ url: `${PHONE_VOICE_ROUTE}?voice=bm_george`, needsAccount: true });
    expect(new URL(PHONE_VOICE_STORE).hostname).toBe("audio.purifyapp.net");
  });

  it("holds a file on the server for every Plus voice it offers, and for no other", () => {
    const dir = path.join(process.cwd(), "data/listen/phone-voices");
    const held = fs.readdirSync(dir).filter((f) => f.endsWith(".bin")).map((f) => f.slice(0, -4)).sort();
    const offered = PHONE_VOICES.filter((v) => v.plus && v.offered).map((v) => v.id).sort();
    expect(held).toEqual(offered);
  });

  it("keeps no Plus voice where an address would serve it without the check", () => {
    const publicDir = path.join(process.cwd(), "public");
    const found: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(path.join(d, e.name));
        else if (PHONE_VOICES.some((v) => v.plus && e.name === `${v.id}.bin`)) found.push(path.join(d, e.name));
      }
    };
    walk(publicDir);
    expect(found).toEqual([]);
  });
});

describe("decidePhoneVoice", () => {
  it("400s a voice the list does not know, and never reads it as a path", () => {
    for (const raw of ["", null, undefined, 3, "BM_GEORGE", "../af_heart", "bm_george.bin", "bm_george/../x"]) {
      expect(decidePhoneVoice(raw, plus, on), String(raw)).toMatchObject({ ok: false, status: 400, error: "unknown_voice" });
    }
  });

  it("404s a voice that is not offered, even for Plus", () => {
    expect(decidePhoneVoice("bf_emma", plus, on)).toMatchObject({ ok: false, status: 404, error: "not_offered" });
  });

  it("offers no Plus voice in the real list until he has kept one by ear", () => {
    for (const v of PHONE_VOICES.filter((x) => x.plus && !x.offered)) {
      expect(decidePhoneVoice(v.id, plus, { enforced: true, now: NOW }).status, v.id).toBe(404);
    }
  });

  it("does not keep the free voice behind the route", () => {
    expect(decidePhoneVoice("af_heart", null, on)).toMatchObject({ ok: false, status: 400, error: "free_voice" });
  });

  it("403s no row, a free account, a lapsed Plus and a supporter", () => {
    for (const [name, row] of [["no row", null], ["free", free], ["lapsed", lapsed], ["supporter", supporter]] as const) {
      expect(decidePhoneVoice("bm_george", row, on), name).toMatchObject({ ok: false, status: 403, error: "plus_required" });
    }
  });

  it("answers Plus and Pro", () => {
    expect(decidePhoneVoice("bm_george", plus, on)).toEqual({ ok: true, status: 200, voice: "bm_george" });
    expect(decidePhoneVoice("bm_george", pro, on)).toEqual({ ok: true, status: 200, voice: "bm_george" });
  });

  it("answers every signed-in reader where Plus is not enforced, as every Plus surface does", () => {
    expect(decidePhoneVoice("bm_george", free, { ...on, enforced: false }).status).toBe(200);
  });

  it("honours the developer override the route has verified", () => {
    expect(decidePhoneVoice("bm_george", free, { ...on, override: DEV_PLUS_ENTITLEMENTS }).status).toBe(200);
  });
});

describe("GET /api/listen/phone-voice", () => {
  const route = fs.readFileSync(path.join(process.cwd(), "app/api/listen/phone-voice/route.ts"), "utf8");

  it("reads who is asking and their entitlement on the server", () => {
    expect(route).toContain("createClientFromRequest(req)");
    expect(route).toContain('.from("entitlements")');
    expect(route).toContain("decidePhoneVoice(");
    expect(route).toContain('refuse(401, "sign_in")');
  });

  it("takes nothing from the request but the voice's name", () => {
    expect(route).not.toMatch(/req\.json\(\)|searchParams\.get\("(?!voice")/);
    expect(route).not.toMatch(/plus(Features)?\s*[:=]\s*(req|body|params)/i);
  });

  it("is rate limited, answers the apps' preflight, and is never kept by a shared cache", () => {
    expect(route).toContain("rateLimited(");
    expect(route).toContain("export const OPTIONS = corsPreflight");
    expect(route).toContain("export const GET = corsRoute(handleGET)");
    expect(route).toContain('"private, no-store"');
  });

  it("builds the file's path from the list's own name", () => {
    expect(route).toContain("`${decision.voice}.bin`");
  });
});
