// The shop's home when it cannot be reached (Updates 72). Offline, the motion
// walk's tap on Discover's Shop door found "We couldn't reach the shop" jumping
// 208px in one frame, 258ms after the tap (Updates 69, on two exports). The
// home's read failed before the catalogue's: the error was drawn under Shop by
// saint's held row (132px and its 20px margin) and under the featured card
// still holding its icon's place, and when the catalogue failed too, both let
// go at once (the card 275px to 220px at 390 wide) and the error rose 208px.
// Even when all three reads fail together, the card's dropping its icon's
// place moved its own search button 153px and its line 26px (Updates 72's
// probe on the head's export).
//
// So the error takes the place the bones held, once nothing above it is still
// waiting, and the card keeps its icon's place, still, when nothing could be
// read. Read here as the page writes it, so the old code fails.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), "components/shop", f), "utf8");
const home = read("ShopHomeClient.tsx");
const card = read("FeaturedIcon.tsx");

type State = { settled: boolean; loading: boolean; error: boolean };

/** A condition as the page writes it, read as a function of the page's three states. */
function condition(source: string): (s: State) => boolean {
  const f = new Function("settled", "loading", "error", `return Boolean(${source});`) as (a: boolean, b: boolean, c: boolean) => boolean;
  return (s) => f(s.settled, s.loading, s.error);
}

/**
 * The states the home can stand in. Its own read is loading, failed or answered, never loading
 * and failed at once (lib/shop/useAsyncData.ts); the catalogue answers or fails on its own time.
 */
const STATES: State[] = [];
for (const settled of [false, true])
  for (const loading of [false, true])
    for (const error of [false, true]) if (!(loading && error)) STATES.push({ settled, loading, error });

const say = (s: State) => `settled ${s.settled}, loading ${s.loading}, error ${s.error}`;

const errorWhen = /\{([^{}?]+) \? <ShopError message=\{error\} onRetry=\{reload\} \/> : null\}/.exec(home)?.[1];
const saintsWait = /<ShopBySaint saints=\{saints\} waiting=\{([^}]+)\}/.exec(home)?.[1];
const cardProps = /<FeaturedIcon ([^>]*?)\/>/.exec(home)?.[1] ?? "";
const cardWait = /\bwaiting=\{([^}]+)\}/.exec(cardProps)?.[1];
const cardUnreachable = /\bunreachable=\{([^}]+)\}/.exec(cardProps)?.[1] ?? "false";
const side = /const side = ([^;]+);/.exec(card)?.[1];

describe("the shop's home when it cannot be reached", () => {
  it("reads what it needs from the page", () => {
    expect(errorWhen, "ShopError's condition").toBeTruthy();
    expect(saintsWait, "ShopBySaint's waiting").toBeTruthy();
    expect(cardWait, "FeaturedIcon's waiting").toBeTruthy();
    expect(side, "FeaturedIcon's side column").toBeTruthy();
  });

  it("draws the error only when nothing above it still holds a place it will let go", () => {
    const drawn = condition(errorWhen!);
    const saints = condition(saintsWait!);
    const waiting = condition(cardWait!);
    for (const s of STATES) {
      if (!drawn(s)) continue;
      expect(saints(s), `Shop by saint still held over the error (${say(s)})`).toBe(false);
      expect(waiting(s), `the featured card still waiting over the error (${say(s)})`).toBe(false);
    }
  });

  it("keeps the featured card's icon's place from its wait to the error, so its words and buttons stay put", () => {
    // Nothing could be read, so no icon was picked: the card's side column stands only if it is held.
    const column = new Function("image", "waiting", "unreachable", `return Boolean(${side});`) as (i: boolean, w: boolean, u: boolean) => boolean;
    const drawn = condition(errorWhen!);
    const waiting = condition(cardWait!);
    const unreachable = condition(cardUnreachable);
    for (const s of STATES) {
      if (s.settled && !drawn(s)) continue; // the catalogue answered and the shop is drawn
      expect(column(false, waiting(s), unreachable(s)), `the card's side column (${say(s)})`).toBe(true);
    }
  });

  it("holds that place still once the shop has said it cannot be reached", () => {
    // The pulse is the wait's; the place kept under the error does not breathe.
    expect(card).toMatch(/waiting && "animate-pulse motion-reduce:animate-none"/);
    expect(card).not.toMatch(/className="[^"]*\banimate-pulse\b[^"]*"/);
  });

  it("says the same words", () => {
    expect(read("ShopStates.tsx")).toContain('{ours ?? t("shop.couldntReachTheShop")}');
  });
});
