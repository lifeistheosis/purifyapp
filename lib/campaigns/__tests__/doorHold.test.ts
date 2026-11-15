// Updates 90 (2026-11-15), item 1: the campaigns door's empty wait. A
// campaign's page drew an empty box 60% of the screen high while its door
// asked the server whether campaigns are open (components/campaigns/
// CampaignsGate.tsx), so a switch into /campaigns/detail/ stood empty: 7 of 8
// runs on the export of 17276848, with motion on and reduced. The door,
// mounted by a page switch, now holds the page being left until the server
// answers, for DOOR_HOLD_MS at the most, and past that says it is loading.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let reply: (res: Response) => void = () => {};
const calls: string[] = [];
vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn((path: string) => {
    calls.push(path);
    return new Promise<Response>((resolve) => {
      reply = resolve;
    });
  }),
}));

import { __setCampaignsOpening } from "@/lib/campaigns/flags";
import { DOOR_HOLD_MS, __forgetCampaignsOpen, askCampaignsAgain, campaignsDoorNow, holdForCampaignsDoor } from "@/lib/campaigns/useCampaignsOpen";

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
const settled = (p: Promise<void>) => {
  let done = false;
  void p.then(() => {
    done = true;
  });
  return () => done;
};

beforeEach(() => {
  vi.useFakeTimers();
  calls.length = 0;
  __forgetCampaignsOpen();
  __setCampaignsOpening("testers");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  __forgetCampaignsOpen();
  __setCampaignsOpening("closed");
});

describe("a campaign's door holds the page switch while it asks, and no longer", () => {
  it("asks the server once and holds until the answer comes", async () => {
    const wait = holdForCampaignsDoor();
    expect(wait).toBeInstanceOf(Promise);
    expect(calls).toEqual(["/api/campaigns/open"]);
    // The same wait on every render while it holds (React's use() needs one promise).
    expect(holdForCampaignsDoor()).toBe(wait);
    expect(calls).toHaveLength(1);
    const done = settled(wait!);
    await flush();
    expect(done()).toBe(false);
    reply(new Response("{}", { status: 404 }));
    await flush();
    expect(done()).toBe(true);
    expect(campaignsDoorNow()).toBe("closed");
    expect(holdForCampaignsDoor()).toBeNull();
  });

  it("holds DOOR_HOLD_MS at the most, then lets the door draw its waiting line", async () => {
    expect(DOOR_HOLD_MS).toBe(600);
    const wait = holdForCampaignsDoor()!;
    const done = settled(wait);
    vi.advanceTimersByTime(DOOR_HOLD_MS - 1);
    await flush();
    expect(done()).toBe(false);
    vi.advanceTimersByTime(1);
    await flush();
    expect(done()).toBe(true);
    expect(campaignsDoorNow()).toBe("asking");
    expect(holdForCampaignsDoor()).toBeNull();
    // A late answer still opens the door; nothing holds again.
    reply({ ok: true, status: 200, json: async () => ({ parts: {} }) } as unknown as Response);
    await flush();
    expect(campaignsDoorNow()).toBe("open");
    expect(holdForCampaignsDoor()).toBeNull();
  });

  it("never holds once the server has answered in this page load: Try again asks on a page already drawn", async () => {
    vi.stubGlobal("window", { addEventListener: () => {} });
    holdForCampaignsDoor();
    reply(new Response("", { status: 503 }));
    await flush();
    expect(campaignsDoorNow()).toBe("unreached");
    askCampaignsAgain();
    expect(campaignsDoorNow()).toBe("asking");
    expect(holdForCampaignsDoor()).toBeNull();
  });

  it("holds nothing in a build without campaigns", () => {
    __setCampaignsOpening("closed");
    expect(holdForCampaignsDoor()).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
