import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A priest's or deacon's answers sent as a request for the clergy seal (1.8.x,
 * the owner's note 54): into the queue the team already works, never over a
 * request already with them, signed out kept on the device for the next
 * sign-in, never in Testers mode, and never a mark by itself.
 */

const net = vi.hoisted(() => ({
  session: { user: { id: "reader-1" } } as object | null,
  calls: [] as { path: string; method: string; body: unknown }[],
  /** The team's side, as GET /api/profile/clergy answers it. */
  theirs: { status: "none" } as { status: string } | null,
  /** How POST answers. */
  post: { status: 200, body: { ok: true, clergy: { status: "requested" } } as Record<string, unknown> },
  offline: false,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: net.session } }) } }),
}));
vi.mock("@/lib/api/client", () => ({
  apiFetch: async (p: string, init: RequestInit = {}) => {
    if (net.offline) throw new TypeError("Failed to fetch");
    const method = init.method ?? "GET";
    net.calls.push({ path: p, method, body: init.body ? JSON.parse(String(init.body)) : null });
    if (method === "GET") {
      return net.theirs
        ? new Response(JSON.stringify({ clergy: { rank: null, jurisdiction: null, parish: null, note: null, ...net.theirs }, open: true }))
        : new Response("{}", { status: 500 });
    }
    return new Response(JSON.stringify(net.post.body), { status: net.post.status });
  },
}));

import { RETRY_MS, fileClergyRequest, flushClergyRequest } from "../clergyRequest";
import { SPACE_KEYS, readClergy, readClergyRequest, readRole, writeClergy, writeClergyRequest, writeLevel, writeRole } from "../state";
import { TESTERS_KEY } from "../testing";

function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    map,
  };
}

let store: ReturnType<typeof storage>;

/** A US priest who answered every screen, his parish written as the shipped screen takes it. */
function answeredPriest() {
  writeLevel("practicing");
  writeRole("priest");
  writeClergy({
    country: "US",
    jurisdiction: "antiochian",
    otherJurisdiction: "",
    parish: { kind: "typed", name: "St. Nicholas Antiochian Orthodox Cathedral", place: "Brooklyn, NY" },
  });
}

const posts = () => net.calls.filter((c) => c.method === "POST");

beforeEach(() => {
  store = storage();
  vi.stubGlobal("window", { localStorage: store, dispatchEvent: () => true });
  vi.stubGlobal("CustomEvent", class extends Event {});
  net.session = { user: { id: "reader-1" } };
  net.calls = [];
  net.theirs = { status: "none" };
  net.post = { status: 200, body: { ok: true, clergy: { status: "requested" } } };
  net.offline = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("filing the request", () => {
  it("sends a signed-in priest's answers once, as a request the team decides", async () => {
    answeredPriest();
    expect(await fileClergyRequest()).toBe("sent");
    expect(posts()).toHaveLength(1);
    const { path, body } = posts()[0];
    expect(path).toBe("/api/profile/clergy");
    expect(body).toMatchObject({
      rank: "priest",
      jurisdiction: "Antiochian Orthodox Christian Archdiocese of North America",
      parish: "St. Nicholas Antiochian Orthodox Cathedral, Brooklyn, NY",
    });
    expect((body as { evidence: string }).evidence).toContain("Country they serve in: United States.");
    expect((body as { evidence: string }).evidence).toContain("Parish as they wrote it.");
    expect(body).not.toHaveProperty("status");
    expect(readClergyRequest()).toEqual({ state: "sent" });
    // Sent is sent: the end of the questions again asks nothing more.
    expect(await fileClergyRequest()).toBe("already");
    expect(posts()).toHaveLength(1);
  });

  it("never writes over a request already with the team, or a seal already given", async () => {
    for (const status of ["requested", "verified"]) {
      answeredPriest();
      writeClergyRequest(null);
      net.calls = [];
      net.theirs = { status };
      expect(await fileClergyRequest(), status).toBe("already");
      expect(posts(), status).toHaveLength(0);
    }
  });

  it("asks again after a decline, as the profile's own card lets a reader", async () => {
    answeredPriest();
    net.theirs = { status: "declined" };
    expect(await fileClergyRequest()).toBe("sent");
    expect(posts()).toHaveLength(1);
  });

  it("sends nothing for a layman, a catechumen, or answers left unfinished", async () => {
    answeredPriest();
    writeRole("layman");
    expect(await fileClergyRequest()).toBe("nothing");
    answeredPriest();
    writeLevel("learning");
    expect(await fileClergyRequest()).toBe("nothing");
    writeLevel("practicing");
    writeClergy({ country: "US", jurisdiction: "oca", otherJurisdiction: "", parish: null });
    expect(await fileClergyRequest()).toBe("nothing");
    expect(net.calls).toHaveLength(0);
  });

  it("sends nothing in Testers mode, where the device holds a test and not the admin's own answers", async () => {
    answeredPriest();
    store.setItem(TESTERS_KEY, JSON.stringify({ v: 1, keys: {} }));
    expect(await fileClergyRequest()).toBe("nothing");
    expect(net.calls).toHaveLength(0);
  });
});

describe("waiting on the device", () => {
  it("keeps a signed-out priest's request and sends it at the first sign-in", async () => {
    answeredPriest();
    net.session = null;
    expect(await fileClergyRequest()).toBe("pending");
    expect(net.calls).toHaveLength(0);
    expect(readClergyRequest()).toEqual({ state: "pending" });
    net.session = { user: { id: "reader-1" } };
    expect(await flushClergyRequest()).toBe("sent");
    expect(posts()).toHaveLength(1);
  });

  it("tries a failed send again only after a while, so a page load is not a request", async () => {
    answeredPriest();
    net.offline = true;
    const before = Date.now();
    expect(await fileClergyRequest()).toBe("pending");
    const kept = readClergyRequest();
    expect(kept?.state).toBe("pending");
    expect(kept?.tried).toBeGreaterThanOrEqual(before);
    net.offline = false;
    expect(await flushClergyRequest(kept!.tried! + 60_000)).toBeNull();
    expect(posts()).toHaveLength(0);
    expect(await flushClergyRequest(kept!.tried! + RETRY_MS + 1)).toBe("sent");
    expect(posts()).toHaveLength(1);
  });

  it("does nothing at a sign-in when nothing waits", async () => {
    expect(await flushClergyRequest()).toBeNull();
    answeredPriest();
    writeClergyRequest({ state: "sent" });
    expect(await flushClergyRequest()).toBeNull();
    expect(net.calls).toHaveLength(0);
  });

  it("lets go of a request the route turns back as it stands, rather than sending it every day", async () => {
    answeredPriest();
    net.post = { status: 400, body: { error: "Some words here aren't allowed.", code: "filtered" } };
    expect(await fileClergyRequest()).toBe("refused");
    expect(readClergyRequest()).toBeNull();
  });

  it("counts a seal given since as done", async () => {
    answeredPriest();
    net.post = { status: 409, body: { error: "You are already verified.", code: "verified" } };
    expect(await fileClergyRequest()).toBe("already");
    expect(readClergyRequest()).toEqual({ state: "sent" });
  });

  it("keeps the answers on this device only, among the keys Testers mode keeps and puts back", () => {
    answeredPriest();
    expect(readRole()).toBe("priest");
    expect(readClergy().jurisdiction).toBe("antiochian");
    for (const key of ["purify:role", "purify:clergy", "purify:clergy.request"]) expect(SPACE_KEYS).toContain(key);
  });

  it("forgets that it was sent once an answer changes, so the next end of the questions asks with what is true", () => {
    answeredPriest();
    writeClergyRequest({ state: "sent" });
    writeClergy({ country: "US", jurisdiction: "goa", otherJurisdiction: "", parish: { kind: "typed", name: "St. Mary", place: "Austin, TX" } });
    expect(readClergyRequest()).toBeNull();
  });
});
