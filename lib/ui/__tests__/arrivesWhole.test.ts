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

describe("the flow bar's room (Updates 18)", () => {
  // Today's "Read all" or a plan's Begin opens a chapter with the flow bar at
  // its foot, and everything that floats over the foot rises by the bar's
  // height (globals.css, html.has-readings-flow). Set in a passive effect, the
  // class came after the View Transition's picture: the chapter pill was drawn
  // 76px low and jumped up (measured on the export of 823d24e0, 650 to 574).
  it("is marked on the page as the bar commits, before the page's picture", () => {
    const src = code("components/flow/FlowBarShell.tsx");
    expect(src).toMatch(/const useMarkEffect = typeof window !== "undefined" \? useLayoutEffect : useEffect;/);
    const shell = body(src, /export function FlowBarShell\(/);
    expect(shell).toMatch(/useMarkEffect\(\(\) => \{\s*const root = document\.documentElement;\s*root\.classList\.add\("has-readings-flow"\);/);
    expect(shell).not.toMatch(/\buseEffect\(/);
  });
});

describe("late parts measured or read on the device (Updates 18)", () => {
  it("the chapter pill's fit is written on the pill as it is measured, not rendered after the picture", () => {
    // Listen jumped 48px sideways a moment after a chapter arrived (the walk
    // of 823d24e0, /bible/ to 1 Thessalonians 5): the fit was kept in state.
    const src = code("components/bible/MobileChapterPill.tsx");
    expect(src).not.toMatch(/setFitFor|fitFor|setFrameWidth/);
    expect(src).toMatch(/while \(fit < 2 && tooLong\(\)\) pill\.dataset\.fit = String\(\+\+fit\);/);
    expect(src).toMatch(/data-fit="0"/);
  });

  it("Community keeps no empty place for the switch where the server said no last time", () => {
    // The kept 77px place closed as the answer came, and the page rose under it.
    const hook = code("lib/campaigns/useCampaignsOpen.ts");
    expect(hook).toMatch(/const readAnswerOrKeptNo = \(\) => answer \?\? \(keptAnswer\(\) === "no" \? false : null\);/);
    expect(hook).toMatch(/if \(!missed\) keepAnswer\(open\);/);
    expect(hook).toMatch(/if \(campaignsInBuild\(\) && keptAnswer\(\) === "none"\) ask\(\);/);
    expect(code("components/community/CommunityClient.tsx")).toMatch(/const campaignsOpen = useCampaignsAnswerForSwitch\(\);/);
    expect(code("components/layout/AppFrame.tsx")).toMatch(/useAskCampaignsAtFirstLaunch\(\);/);
  });

  it("Export gathers the library as the page renders on the device", () => {
    const src = code("components/account/ExportLibrary.tsx");
    expect(src).not.toMatch(/setData\(gatherLibrary\(\)\)/);
    expect(src).toMatch(/useMemo\(\(\) => \(onDevice \? gatherLibrary\(\) : null\), \[onDevice\]\)/);
  });

  it("Change email says its state as the page renders, from the address being opened", () => {
    const src = code("components/account/security/EmailChangeState.tsx");
    expect(src).not.toMatch(/useEffect|setState/);
    expect(src).toMatch(/onDevice \? readEmailChangeState\(query, hashFor\(pathname\)\) : null/);
  });
});

describe("cause 3's rest: parts that settled after the page arrived (Updates 20)", () => {
  it("the gift's ticket is signed out from its first frame on a device with no session, and a failed read leaves it standing", () => {
    // The walk got the load error (the main web before the merge has no /api/gifts/order): the
    // skeleton's ticket gave way to "Try again", 45 to 52px shorter, under a page that had arrived.
    const src = code("components/gifts/OrderGiftClient.tsx");
    expect(src).toMatch(/const SIGNED_OUT: OrderGiftState = \{ signedIn: false \};/);
    expect(src).toMatch(/const onDevice = useSyncExternalStore\(noSubscribe, \(\) => true, \(\) => false\);/);
    expect(src).toMatch(/const state: OrderGiftState \| null = read \?\? \(onDevice && !readLocalSessionUser\(\) \? SIGNED_OUT : null\);/);
    expect(src).toMatch(/const loadError = readFailed && !state;/);
    expect(src).not.toMatch(/const \[state, setState\] = useState/);
  });

  it("the shop waits for something to pick from before it settles", () => {
    // The catalogue's read failed while the home's was loading: the page settled on nothing, Shop by
    // saint and the featured icon's column dropped, and New in rose 153px (from Discover).
    const src = code("components/shop/ShopHomeClient.tsx");
    expect(src).toMatch(/const catalogue = pool \?\? \(poolError && \(data \|\| error\) \? collection : null\);/);
  });

  it("a category's chips hold their row until the counts are known", () => {
    // Every kind was drawn until the home answered, then the empty ones dropped out: 170px sideways.
    const page = code("components/shop/CategoryClient.tsx");
    expect(page).toMatch(/const \{ data: home, loading: homeLoading \} = useAsyncData\(fetchShopHome, \[\], peekShopHome\);/);
    expect(page).toMatch(/waiting=\{homeLoading && !home\}/);
    expect(code("components/shop/CategoryChips.tsx")).toMatch(/className=\{cn\(waiting && "invisible", className\)\}/);
  });
});
