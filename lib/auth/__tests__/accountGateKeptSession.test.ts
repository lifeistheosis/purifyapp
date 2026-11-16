import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// The account gate lets a kept session in with the page (1.9, build 98 note 11;
// round 3, You and Profile): it reads the session kept on the device itself, in
// the frame the page arrives in, so the reader's picture carried from You has a
// page to land on. Before, it waited for resolveUser to read the same thing a
// tick later. These hold that the change lets in no one resolveUser would not:
// a reader who is signed out (nothing kept) still meets the waiting line and is
// sent to sign in, and a kept session that has ended was let in before the
// change as it is now, by resolveUser's own first step. What such a session can
// read is decided by RLS on the server, which refuses an ended or forged token
// (the probe is in docs/handoffs/round-3-apply-b.md).

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getSession: () => getSession() } }) }));

import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { NATIVE_SESSION_KEY } from "@/lib/supabase/nativeStore";
import { resolveUser } from "@/lib/supabase/resolveUser";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

function stubStorage(cookie: string, ls: Record<string, string> = {}) {
  vi.stubGlobal("document", { cookie });
  const store = new Map(Object.entries(ls));
  vi.stubGlobal("localStorage", {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
  });
}

const NAME = "sb-avbqyvjgcrucjwevwixt-auth-token";
const session = (id: string, expiresAt: number) => ({
  access_token: "kept",
  refresh_token: "kept",
  expires_at: expiresAt,
  user: { id, email: `${id}@example.com` },
});
const asCookie = (value: unknown) => `${NAME}=${encodeURIComponent(JSON.stringify(value))}`;

// Every way a device can stand when an account screen opens.
const DEVICES: { name: string; kept: boolean; cookie: string; ls?: Record<string, string> }[] = [
  { name: "signed out, nothing kept", kept: false, cookie: "" },
  { name: "a live session kept", kept: true, cookie: asCookie(session("live", 4102444800)) },
  { name: "a kept session that has ended", kept: true, cookie: asCookie(session("ended", 1)) },
  { name: "a kept value that is not a session", kept: false, cookie: `${NAME}=${encodeURIComponent("{not json")}` },
  { name: "a session with no user id", kept: false, cookie: asCookie({ access_token: "x", user: {} }) },
  {
    name: "the apps' own store",
    kept: true,
    cookie: "",
    ls: { [NATIVE_SESSION_KEY]: JSON.stringify([{ name: NAME, value: JSON.stringify(session("native", 4102444800)) }]) },
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  getSession.mockReset();
});

describe("the account gate lets in with the page only whom the session read lets in", () => {
  it.each(DEVICES)("$name", async ({ kept, cookie, ls }) => {
    stubStorage(cookie, ls);
    // The server, asked, says no one is signed in: the early way in may not lean on it.
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const early = readLocalSessionUser() !== null;
    expect(early).toBe(kept);
    const verdict = await resolveUser();
    if (early) expect(verdict.state).toBe("signed-in");
    else expect(verdict.state).toBe("signed-out");
  });

  it("a reader who is signed out is not let in early, and is sent to sign in", async () => {
    stubStorage("");
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(readLocalSessionUser()).toBeNull();
    expect(await resolveUser()).toEqual({ state: "signed-out" });
  });

  it("a kept session that has ended was let in before the change too: resolveUser's first step is the same read", async () => {
    stubStorage(asCookie(session("ended", 1)));
    expect(readLocalSessionUser()?.id).toBe("ended");
    const verdict = await resolveUser();
    expect(verdict.state).toBe("signed-in");
    // Never asked the server: the verdict was the device's own read, as the gate's is.
    expect(getSession).not.toHaveBeenCalled();
  });

  it("the gate draws its page on 'in', or while loading after hydration with a session kept, and never once sent on", () => {
    const gate = read("components/account/AccountAuthGate.tsx");
    expect(gate.match(/return <>\{children\}<\/>;/g)).toHaveLength(1);
    expect(gate).toContain(
      'if (state === "in" || (state === "loading" && hydrated && readLocalSessionUser() !== null)) return <>{children}</>;',
    );
    // The hydrating render matches the server's waiting line.
    expect(gate).toContain("useSyncExternalStore(noSubscribe, () => true, () => false)");
    // Sent on: the line that says so, never the page.
    expect(gate).toMatch(/state === "out"\s*\?\s*t\("ui\.redirectingToSignIn"\)/);
    // A card kept on the device (lib/profile/myCard.ts) is drawn only for the reader it was kept for:
    // after one reader signs out, the next never meets the first one's card.
    const card = read("lib/profile/myCard.ts");
    expect(card).toContain("kept = read && read.uid === uid ? read : null;");
    expect(card).toContain("if (kept && kept.uid !== uid) emit(null);");
    // The same read resolveUser makes first, so the early way in is never the wider one.
    expect(read("lib/supabase/resolveUser.ts")).toMatch(
      /const local = readLocalSessionUser\(\);\s*if \(local\) return \{ state: "signed-in", user: local \};/,
    );
  });
});
