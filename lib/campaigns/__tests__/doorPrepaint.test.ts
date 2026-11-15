import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The door to Pray together, known shut before the first paint (Updates 78,
 * 2026-11-15; lib/campaigns/doorPrepaint.ts).
 *
 * Community holds the switch's place while it asks the server whether
 * campaigns are open for this reader, and the page's HTML held it for every
 * reader. On a direct open of /community/, for a reader the answer was no
 * for, the place closed under the page as the answer came: the sign-in line
 * and every post moved up 77px in five drawn steps (Updates 77). A no kept
 * from last time did not stop it there, since the HTML is drawn before the
 * app reads anything.
 *
 * What this file holds: where the device already knows the answer is no (the
 * no the server gave it last time; on the website, a reader with no account
 * while the server opens campaigns to its admins alone), <html> is marked
 * before the paint, the place is not drawn under the mark, and Community
 * reads the same mark as a no. Never in the apps by the second rule, whose
 * server may already be open to every reader; and a live yes still opens
 * the door.
 */

const server = vi.hoisted(() => ({ answers: [] as { status: number; body?: unknown }[] }));
vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(async () => {
    const next = server.answers.shift() ?? { status: 404 };
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status, headers: { "content-type": "application/json" } });
  }),
}));

import { DOOR_MARK, KEPT_ANSWER_KEY, doorPrepaint } from "@/lib/campaigns/doorPrepaint";
import { CAMPAIGNS_OPENING, __setCampaignsOpening } from "@/lib/campaigns/flags";
import { __forgetCampaignsOpen, campaignsAnswerForSwitchNow, subscribeCampaignsOpen } from "@/lib/campaigns/useCampaignsOpen";
import { prayDoor } from "@/lib/community/halves";
import { NATIVE_UA_TOKEN } from "@/lib/platform/token";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
const WEB_UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36";
const APP_UA = `${WEB_UA} ${NATIVE_UA_TOKEN}`;

type Device = { stored?: Record<string, string>; cookie?: string; ua?: string; capacitor?: boolean; blocked?: boolean };

/** Run the pre-paint string the way the browser does, over a device, and say what it marked on <html>. */
function marked(signedOutShut: boolean, d: Device = {}): string | null {
  const marks: Record<string, string> = {};
  const stored = d.stored ?? {};
  const keys = Object.keys(stored);
  const localStorage = {
    get length() {
      if (d.blocked) throw new Error("blocked");
      return keys.length;
    },
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => {
      if (d.blocked) throw new Error("blocked");
      return k in stored ? stored[k] : null;
    },
  };
  const sandbox: Record<string, unknown> = {
    localStorage,
    navigator: { userAgent: d.ua ?? WEB_UA },
    document: { cookie: d.cookie ?? "", documentElement: { setAttribute: (k: string, v: string) => (marks[k] = v) } },
    ...(d.capacitor ? { Capacitor: { isNativePlatform: () => true } } : {}),
  };
  sandbox.window = sandbox;
  vm.runInNewContext(doorPrepaint(signedOutShut), sandbox);
  return marks[DOOR_MARK] ?? null;
}

describe("the door's pre-paint", () => {
  it("marks the no the server gave this device last time, on the website and in the apps", () => {
    for (const signedOutShut of [true, false])
      for (const ua of [WEB_UA, APP_UA]) expect(marked(signedOutShut, { stored: { [KEPT_ANSWER_KEY]: "no" }, ua })).toBe("none");
  });

  it("on the website, while its server opens campaigns to admins alone, marks a reader with no account", () => {
    expect(marked(true)).toBe("none");
    expect(marked(true, { stored: { "purify:onboarded": "99" }, cookie: "purify_locale=en" })).toBe("none");
  });

  it("leaves a reader with an account to the server, wherever the session is kept, chunked or whole", () => {
    expect(marked(true, { cookie: "purify_locale=en; sb-abcdef-auth-token=base64-x" })).toBeNull();
    expect(marked(true, { cookie: "sb-abcdef-auth-token.0=base64-x; sb-abcdef-auth-token.1=y" })).toBeNull();
    expect(marked(true, { stored: { "sb-abcdef-auth-token": "{}" } })).toBeNull();
  });

  it("never decides a reader with no account in the apps, whose server may be open to every reader (flags.ts, step 4)", () => {
    expect(marked(true, { ua: APP_UA })).toBeNull();
    expect(marked(true, { capacitor: true })).toBeNull();
  });

  it("a server that opens campaigns to everyone (the test web, or open) decides nothing alone, and a kept yes is never read", () => {
    expect(marked(false)).toBeNull();
    expect(marked(false, { stored: { [KEPT_ANSWER_KEY]: "yes" } })).toBeNull();
    expect(marked(false, { stored: { [KEPT_ANSWER_KEY]: "yes" }, ua: APP_UA })).toBeNull();
  });

  it("a device whose storage is blocked is left as it was, and nothing throws", () => {
    expect(marked(true, { blocked: true })).toBeNull();
  });
});

describe("Community reads the same mark", () => {
  let mark: string | null = null;
  beforeEach(() => {
    server.answers = [];
    mark = null;
    __forgetCampaignsOpen();
    __setCampaignsOpening("testers");
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
    vi.stubGlobal("document", { documentElement: { getAttribute: (k: string) => (k === DOOR_MARK ? mark : null) } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    __forgetCampaignsOpen();
    __setCampaignsOpening(CAMPAIGNS_OPENING);
  });

  it("unmarked, with nothing kept, the place is held while it asks (Updates 77's direct open, which the mark now prevents where it can)", () => {
    expect(campaignsAnswerForSwitchNow()).toBeNull();
    expect(prayDoor({ campaigns: campaignsAnswerForSwitchNow(), ownCampaign: false, placeKept: false })).toBe("waiting");
  });

  it("marked, the door is none from the first frame: no place, so nothing closes under the page", () => {
    mark = "none";
    expect(campaignsAnswerForSwitchNow()).toBe(false);
    expect(prayDoor({ campaigns: campaignsAnswerForSwitchNow(), ownCampaign: false, placeKept: false })).toBe("none");
  });

  it("the server's live yes still opens the door over the mark", async () => {
    mark = "none";
    server.answers = [{ status: 200, body: { open: true, parts: {} } }];
    const stop = subscribeCampaignsOpen(() => {});
    await settled();
    expect(campaignsAnswerForSwitchNow()).toBe(true);
    stop();
  });
});

describe("the wiring", () => {
  it("the root layout runs the pre-paint with its nonce, writing the website's own position, never the apps'", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toMatch(/<script\s+nonce=\{nonce\}\s+suppressHydrationWarning\s+dangerouslySetInnerHTML=\{\{ __html: doorPrepaint\(!IS_STATIC_EXPORT && serverOpening\(\) === "testers"\) \}\}\s+\/>/);
  });

  it("under the mark the held place is not drawn", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/:root\[data-pray-door="none"\] \.community-door-place \{\s*display: none;\s*\}/);
  });
});
