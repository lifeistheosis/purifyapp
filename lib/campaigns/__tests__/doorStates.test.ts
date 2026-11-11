import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What a campaign's address shows when campaigns are not this reader's to
 * open (components/campaigns/CampaignsGate.tsx, CampaignsClosed.tsx;
 * lib/campaigns/useCampaignsOpen.ts).
 *
 * Found by the fresh-eyes walk of 2026-11-11: with no answer from the
 * server, /campaigns drew the app's page for a link that leads nowhere,
 * which says "the page may not be built yet". A reader with no signal was
 * told a page did not exist.
 *
 * What this file holds:
 *
 *   a no is not a silence   the server's no and a server that could not be
 *                           reached are two answers, and are said as two;
 *   every other door        still reads both as "not yes": nothing of
 *                           campaigns is drawn anywhere on either;
 *   asked again             what was not heard is asked again by the
 *                           reader's tap, and by itself when the signal
 *                           returns. A no the server gave is not;
 *   honest words            neither page says 404, "not in our index" or
 *                           "may not be built yet".
 *
 * What would go wrong if this broke: a reader on a train told that prayer
 * campaigns are closed, or do not exist; or the app asking the server again
 * and again for a no it was already given.
 */

type Answer = { status: number; body?: unknown } | "fails";
const server = vi.hoisted(() => ({ answers: [] as Answer[], asked: 0 }));

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(async () => {
    server.asked++;
    const next = server.answers.shift() ?? { status: 200, body: { open: true, parts: {} } };
    if (next === "fails") throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status, headers: { "content-type": "application/json" } });
  }),
}));

import { CampaignsClosed } from "@/components/campaigns/CampaignsClosed";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { CAMPAIGNS_OPENING, __setCampaignsOpening } from "@/lib/campaigns/flags";
import { __forgetCampaignsOpen, askCampaignsAgain, campaignsDoorNow, campaignsOpenNow, subscribeCampaignsOpen } from "@/lib/campaigns/useCampaignsOpen";
import { getMessages } from "@/lib/i18n";
import en from "@/lib/i18n/messages/en.json";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A window that keeps what is listening for the signal to return, so a case can bring it back. */
function device(): { online: () => void; listeners: () => number } {
  const heard: (() => void)[] = [];
  vi.stubGlobal("window", {
    addEventListener: (name: string, cb: () => void) => {
      if (name === "online") heard.push(cb);
    },
    removeEventListener: () => {},
  });
  return {
    online: () => {
      for (const cb of heard.splice(0)) cb();
    },
    listeners: () => heard.length,
  };
}

/** Ask, as a page does when it is opened, and wait for the answer. */
async function open(): Promise<{ told: () => number; stop: () => void }> {
  let told = 0;
  const stop = subscribeCampaignsOpen(() => told++);
  await settled();
  return { told: () => told, stop };
}

beforeEach(() => {
  server.answers = [];
  server.asked = 0;
  __forgetCampaignsOpen();
  __setCampaignsOpening("open");
});

afterEach(() => {
  vi.unstubAllGlobals();
  __forgetCampaignsOpen();
  __setCampaignsOpening(CAMPAIGNS_OPENING);
});

describe("the server's answer, as a campaign's own page reads it", () => {
  it("is asking until the server has answered", () => {
    expect(campaignsDoorNow()).toBe("asking");
  });

  it("yes: open", async () => {
    const page = await open();
    expect(campaignsDoorNow()).toBe("open");
    expect(campaignsOpenNow()).toBe(true);
    page.stop();
  });

  it("the server's no: closed, and not asked again (build 93 note 21: the campaigns are in the build, hidden by the server's no)", async () => {
    server.answers = [{ status: 404, body: { error: "Not found." } }];
    const page = await open();
    expect(campaignsDoorNow()).toBe("closed");
    expect(campaignsOpenNow()).toBe(false);
    // A no is an answer. Try again is not offered for it, and asking again by hand does nothing.
    askCampaignsAgain();
    await settled();
    expect(server.asked).toBe(1);
    expect(campaignsDoorNow()).toBe("closed");
    page.stop();
  });

  it("no signal: not reached, which is not closed, and no door is drawn for it either", async () => {
    device();
    server.answers = ["fails"];
    const page = await open();
    expect(campaignsDoorNow()).toBe("unreached");
    expect(campaignsOpenNow()).toBe(false);
    page.stop();
  });

  it("a server that fails gave no answer: not reached", async () => {
    device();
    for (const status of [500, 502, 503]) {
      __forgetCampaignsOpen();
      server.answers = [{ status }];
      const page = await open();
      expect(campaignsDoorNow(), String(status)).toBe("unreached");
      page.stop();
    }
    // Refusals are answers: closed.
    for (const status of [401, 403, 404]) {
      __forgetCampaignsOpen();
      server.answers = [{ status }];
      const page = await open();
      expect(campaignsDoorNow(), String(status)).toBe("closed");
      page.stop();
    }
  });

  it("a build with no campaigns is closed at once and asks nobody", async () => {
    __setCampaignsOpening("closed");
    const page = await open();
    expect(campaignsDoorNow()).toBe("closed");
    expect(server.asked).toBe(0);
    page.stop();
  });
});

describe("what was not heard is asked again", () => {
  it("by the reader's tap: the page shows it is asking, then what was answered", async () => {
    device();
    server.answers = ["fails"];
    const page = await open();
    expect(campaignsDoorNow()).toBe("unreached");
    const before = page.told();
    askCampaignsAgain();
    // At once: asking again, and the page is told so.
    expect(campaignsDoorNow()).toBe("asking");
    expect(page.told()).toBe(before + 1);
    await settled();
    expect(campaignsDoorNow()).toBe("open");
    expect(server.asked).toBe(2);
    page.stop();
  });

  it("and still not reached is said again, as many times as it is true", async () => {
    device();
    server.answers = ["fails", "fails", { status: 404 }];
    const page = await open();
    askCampaignsAgain();
    await settled();
    expect(campaignsDoorNow()).toBe("unreached");
    askCampaignsAgain();
    await settled();
    // Reached at last, and the answer is no.
    expect(campaignsDoorNow()).toBe("closed");
    expect(server.asked).toBe(3);
    page.stop();
  });

  it("by itself when the signal returns, once", async () => {
    const phone = device();
    server.answers = ["fails"];
    const page = await open();
    expect(campaignsDoorNow()).toBe("unreached");
    expect(phone.listeners()).toBe(1);
    phone.online();
    await settled();
    expect(campaignsDoorNow()).toBe("open");
    expect(campaignsOpenNow()).toBe(true);
    expect(server.asked).toBe(2);
    // Heard: nothing is left waiting for a signal.
    expect(phone.listeners()).toBe(0);
    page.stop();
  });

  it("the signal's return is waited for once, however often the server is missed", async () => {
    const phone = device();
    server.answers = ["fails", "fails"];
    const page = await open();
    askCampaignsAgain();
    await settled();
    expect(campaignsDoorNow()).toBe("unreached");
    expect(phone.listeners()).toBe(1);
    page.stop();
  });

  it("where there is no window to listen on, missing the server breaks nothing", async () => {
    vi.stubGlobal("window", {});
    server.answers = ["fails"];
    const page = await open();
    expect(campaignsDoorNow()).toBe("unreached");
    expect(page.told()).toBe(1);
    page.stop();
  });

  it("two taps while it asks are one question", async () => {
    device();
    server.answers = ["fails"];
    const page = await open();
    askCampaignsAgain();
    askCampaignsAgain();
    askCampaignsAgain();
    await settled();
    expect(server.asked).toBe(2);
    page.stop();
  });
});

describe("the page that stands at a campaign's address", () => {
  const draw = (unreached: boolean) =>
    renderToStaticMarkup(
      createElement(MessagesProvider, { locale: "en", messages: getMessages("en") } as Parameters<typeof MessagesProvider>[0], createElement(CampaignsClosed, { unreached })),
    );

  it("not open: says so, with a way on to Community", () => {
    const html = draw(false);
    expect(html).toContain('data-campaigns-closed="closed"');
    expect(html).toContain(">Prayer campaigns are not open yet.</h1>");
    expect(html).toMatch(/<a [^>]*href="\/community"[^>]*>Community<\/a>/);
    expect(html).not.toContain("<button");
  });

  it("not reached: says that, in the board's own words, with Try again", () => {
    const html = draw(true);
    expect(html).toContain('data-campaigns-closed="unreached"');
    expect(html).toMatch(/<h1 role="alert"[^>]*>We could not load the campaigns just now\.<\/h1>/);
    expect(html).toMatch(/<button type="button"[^>]*>Try again<\/button>/);
    expect(html).not.toContain("not open yet");
    // And the tap asks the server again, by the one function for it.
    expect(read("components/campaigns/CampaignsClosed.tsx")).toContain("onClick={askCampaignsAgain}");
  });

  it("neither says a page is missing: no 404, no index, no page that may not be built", () => {
    for (const html of [draw(false), draw(true)]) {
      expect(html).not.toMatch(/404|not in our index|may not be built|link may be wrong/i);
      // Nothing of campaigns is drawn in their place.
      expect(html).not.toMatch(/data-campaign-board|data-campaign-row/);
    }
  });

  it("each control is 44 to the touch, and nothing here is a fixed colour", () => {
    const code = read("components/campaigns/CampaignsClosed.tsx");
    expect(code.match(/min-h-11/g)).toHaveLength(2);
    expect(code).not.toMatch(/#[0-9a-f]{3,8}\b|text-white|bg-black/i);
  });

  it("the gate draws the campaign on a yes, waits while it asks, and says which of the two it is otherwise", () => {
    const gate = read("components/campaigns/CampaignsGate.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(gate).toMatch(
      /const door = useCampaignsDoor\(\);\s*if \(door === "open"\) return <>\{children\}<\/>;\s*if \(door === "asking"\) return <div data-campaigns-asking="" className="min-h-\[60vh\]" \/>;\s*if \(!campaignsInBuild\(\)\) return <NotFoundScreen \/>;\s*return <CampaignsClosed unreached=\{door === "unreached"\} \/>;/,
    );
  });

  it("has its one new line in the catalog, with no em dash", () => {
    const words = en as Record<string, string>;
    expect(words["campaigns.notOpen"]).toBe("Prayer campaigns are not open yet.");
    expect(words["campaigns.notOpen"]).not.toMatch(/[\u2013\u2014]/);
    // The other three it uses were there already.
    expect(words["campaigns.loadFailed"]).toBe("We could not load the campaigns just now.");
    expect(words["community.tryAgain"]).toBe("Try again");
    expect(words["nav.community"]).toBe("Community");
  });
});
