import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Try again asks behind the card it was tapped on (1.9, Updates 93).
 *
 * The gate's motion walk, with no network (Gate 4, docs/1.9-build/notes/
 * gate-run-4.md, group 3): every offline card's Try again took the card down
 * for a waiting state (the campaigns door's line, the shop's skeleton, the
 * moderation queue's rows) and put it back a frame or two later, because a
 * read with no signal fails at once. A box drawn for a frame and dropped, on
 * nine screens, motion on and reduced.
 *
 * The rule: a retry draws no waiting state in the card's place. It asks
 * again, and only the answer takes the card's place: the page when it is
 * reached, the same card when it is not, so a retry with no signal changes
 * nothing on the screen. Words a failed retry adds (Community's "No signal")
 * come into a place the card holds from its first frame
 * (lib/today/__tests__/offlineAnswers.test.ts).
 *
 * This file finds every Try again in the app's components and reads its
 * handler, and the function it calls when that is in the same file, up to
 * the read's first await. Any left are named, with the reason.
 */

const ROOT = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const p = join(dir, name);
    if (name === "__tests__" || name === "admin") continue; // the owner's tools are stashed out of the apps (scripts/native-build.mjs)
    if (statSync(join(ROOT, p)).isDirectory()) out.push(...files(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** A state set back to a waiting one: null, true, "loading", { state: "loading" }, or { ..., loading: true }. */
const WAITING = /\bset[A-Z]\w*\(\s*(?:null|true|"loading"|\{\s*state:\s*"loading"\s*\}|\([^)]*\)\s*=>\s*\(\{[^}]*loading:\s*true)/;

type Retry = { file: string; handler: string; reads: string };

function retries(): Retry[] {
  const found: Retry[] = [];
  for (const file of files("components")) {
    const src = read(file);
    let at = 0;
    for (;;) {
      const words = src.slice(at).search(/\{t\("[\w.]+\.tryAgain"\)\}/);
      if (words < 0) break;
      const end = at + words;
      at = end + 1;
      const open = src.lastIndexOf("<button", end);
      if (open < 0) continue;
      const tag = src.slice(open, end);
      const click = tag.indexOf("onClick={");
      if (click < 0) continue;
      // The handler: from onClick={ to its matching brace.
      let depth = 0;
      let i = tag.indexOf("{", click);
      const from = i;
      for (; i < tag.length; i++) {
        if (tag[i] === "{") depth++;
        else if (tag[i] === "}" && --depth === 0) break;
      }
      const handler = tag.slice(from + 1, i);
      // What it calls, when that is this file's own: the body up to the read's first await.
      const called = /(?:^|void\s+|=>\s*)(\w+)\(?\)?\s*$/.exec(handler.trim())?.[1] ?? "";
      const def = called ? src.search(new RegExp(`const ${called} = useCallback\\(async \\(\\) => \\{|async function ${called}\\(`)) : -1;
      const reads = def >= 0 ? src.slice(def, src.indexOf("await", def)) : "";
      found.push({ file, handler, reads });
    }
  }
  return found;
}

/** Left, by name. Each says why; a mend takes it off this list. */
const LEFT: Record<string, string> = {
  // None. A post's replies were the last (Updates 93 named them): their Try
  // again shared loadReplies with the opening, which draws the waiting rows.
  // Since Updates 94 it asks with askRepliesAgain, held below.
};

describe("Try again asks behind the card it was tapped on", () => {
  const all = retries();

  it("finds the offline cards (the walk's nine screens among them)", () => {
    const where = new Set(all.map((r) => r.file));
    for (const f of [
      "components/campaigns/CampaignsClosed.tsx",
      "components/shop/ShopStates.tsx",
      "components/community/moderation/ModerationClient.tsx",
      "components/community/CommunityClient.tsx",
      "components/community/profile/ProfileViewer.tsx",
      "components/account/AccountAuthGate.tsx",
      "components/shop/MerchantApplyGate.tsx",
    ]) {
      expect(where.has(f), f).toBe(true);
    }
    expect(all.length).toBeGreaterThanOrEqual(12);
  });

  it("no Try again sets a waiting state in the card's place", () => {
    const wrong: string[] = [];
    for (const r of all) {
      const called = /(\w+)\(\)\s*$/.exec(r.handler.trim())?.[1];
      if (called && LEFT[`${r.file}#${called}`]) continue;
      if (WAITING.test(r.handler)) wrong.push(`${r.file}: onClick {${r.handler.trim()}}`);
      else if (WAITING.test(r.reads)) wrong.push(`${r.file}: ${r.reads.trim().split("\n")[0]} sets a waiting state before its read`);
    }
    expect(wrong).toEqual([]);
  });

  it("the ones left are still as named, so a mend takes them off the list", () => {
    for (const key of Object.keys(LEFT)) {
      const [file, fn] = key.split("#");
      const r = all.find((x) => x.file === file && x.handler.includes(fn));
      expect(r, key).toBeTruthy();
      expect(WAITING.test(r!.reads), key).toBe(true);
    }
  });

  it("a post's replies ask again behind their card: no waiting rows, and a read that fails again lands with no move (Updates 94)", () => {
    const src = read("components/community/CommunityClient.tsx");
    const r = all.find((x) => x.file === "components/community/CommunityClient.tsx" && x.handler.includes("askRepliesAgain"));
    expect(r, "the replies' Try again calls askRepliesAgain").toBeTruthy();
    expect(r!.reads).toContain("const askRepliesAgain = useCallback(async () => {");
    expect(WAITING.test(r!.reads)).toBe(false);
    // The read it shares with the opening: it sets no waiting state of its own, and a retry that fails again leaves the card as it stood.
    const body = src.slice(src.indexOf("const readReplies = useCallback("), src.indexOf("const loadReplies = useCallback("));
    expect(body.length).toBeGreaterThan(0);
    expect(WAITING.test(body)).toBe(false);
    expect(body).toMatch(/if \(again && res\.state !== "ok"\) return land\(\);/);
    // The opening still draws its waiting rows.
    expect(src).toMatch(/const loadReplies = useCallback\(async \(\) => \{\s*setRepliesState\("loading"\);\s*await readReplies\(false\);/);
  });

  it("the shop asks again behind its card: reload sets no loading state (lib/shop/useAsyncData.ts)", () => {
    const hook = read("lib/shop/useAsyncData.ts");
    const reload = hook.slice(hook.indexOf("const reload = "), hook.indexOf("return { ...state, reload }"));
    expect(reload).toContain("setNonce((n) => n + 1)");
    expect(reload).not.toMatch(/setState/);
    expect(read("components/shop/ShopStates.tsx")).toContain("onClick={onRetry}");
  });

  it("the campaigns door asks again behind its card: askCampaignsAgain tells no page it is asking", () => {
    const open = read("lib/campaigns/useCampaignsOpen.ts");
    const again = open.slice(open.indexOf("export function askCampaignsAgain"), open.indexOf("/** Wait for the answer"));
    expect(again).toContain("ask(true);");
    expect(again).not.toMatch(/answer = null|for \(const cb of waiting\)/);
    // Held by behaviour too: lib/campaigns/__tests__/doorStates.test.ts, "asked again with still no signal".
  });

  it("a read that answers clears the card it stood behind (the EIKON Box: the error was only cleared by the tap)", () => {
    const box = read("components/eikonBox/EikonBoxClient.tsx");
    expect(box).toMatch(/setState\(data\);\s*setLoadError\(false\);/);
  });
});
