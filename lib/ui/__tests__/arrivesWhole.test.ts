// A page arrives whole (1.9, Gate 2.0's jumps as pages arrive, 2026-11-13).
//
// A page switch is a View Transition. It takes its picture of the page
// arriving as soon as the page has committed, and react-dom flushes any
// render a layout or passive effect asks for only once that picture is
// ready. So a part a page draws only after an effect (the day, the reader's
// session) is not in the picture: it lands in the live page a moment later,
// and everything under it jumps. Measured on the export of fa6b1b53: Reading
// plans' "More plans" 354px down as the season's card came with the day;
// Settings 131px as the account's Sign in row came after an asynchronous
// check; Community's feed 84px as its Sign in box replaced the 42px that
// held its place.
//
// What it holds: what the device knows (the day, the session it keeps) is
// read as the page renders, wherever the page is drawn on the device; a
// page drawn on the server still starts with none (no date or reader baked
// into the export's HTML), and reads it as it wakes.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
/** A file's code without its notes. */
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
/** The body of a function, from its signature to the brace that closes it at the start of a line. */
function body(src: string, signature: RegExp): string {
  const at = src.search(signature);
  expect(at, String(signature)).toBeGreaterThanOrEqual(0);
  const end = src.indexOf("\n}", at);
  return src.slice(at, end + 2);
}

describe("the day", () => {
  it("is known in the first render on the device, and none on the server", () => {
    const src = code("lib/calendar/useToday.ts");
    const today = body(src, /export function useToday\(\): Date \| null \{/);
    // No day set after mount: the at-once store, with nothing for the server.
    expect(today).not.toMatch(/useEffect|useState/);
    expect(today).toMatch(/return useTodayAtOnce\(\);/);
    expect(src).toMatch(/useSyncExternalStore\(subscribeDay, todayNow, noDayOnTheServer\)/);
    expect(src).toMatch(/const noDayOnTheServer = \(\) => null;/);
  });
});

describe("the reader's session", () => {
  it("Settings' account section is drawn from the device's session as the page renders", () => {
    const src = code("components/settings/SettingsClient.tsx");
    const reader = body(src, /function useReader\(\): Reader \{/);
    expect(reader).not.toMatch(/useEffect|useLayoutEffect|resolveUser/);
    expect(reader).toMatch(/useSyncExternalStore\(noSubscribe, \(\) => true, \(\) => false\)/);
    expect(reader).toMatch(/readLocalSessionUser\(\)/);
  });

  it("Community's composer row knows the reader as the page renders", () => {
    const src = code("components/community/CommunityClient.tsx");
    expect(src).toMatch(/const onDevice = useSyncExternalStore\(noSubscribe, \(\) => true, \(\) => false\);/);
    expect(src).toMatch(/const user = readLocalSessionUser\(\);/);
    expect(src).toMatch(/const me = meFound \?\? localMe;/);
    expect(src).toMatch(/const authSettled = authFound \|\| onDevice;/);
  });
});
