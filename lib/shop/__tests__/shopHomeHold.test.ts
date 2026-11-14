// The shop's home holds Shop by saint's place while New in's bones stand
// below it, so the two go together (Updates 38). The catalogue answered
// before the home, with no saint among its pieces: the row's place went at
// once while the bones stood, and they rose 153px in one frame (the gate's
// walk from Today to the shop, Updates 37).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const home = fs.readFileSync(path.join(process.cwd(), "components/shop/ShopHomeClient.tsx"), "utf8");

/** A condition as the page writes it, read as a function of the page's three states. */
function condition(source: string): (settled: boolean, loading: boolean, error: boolean) => boolean {
  return new Function("settled", "loading", "error", `return Boolean(${source});`) as (a: boolean, b: boolean, c: boolean) => boolean;
}

describe("the shop's home", () => {
  it("holds the row of saints whenever New in's bones stand", () => {
    const held = /<ShopBySaint saints=\{saints\} waiting=\{([^}]+)\}/.exec(home)?.[1];
    const bones = /\{([^{}?]+) \? <NewInBones \/> : null\}/.exec(home)?.[1];
    expect(held, "ShopBySaint's waiting").toBeTruthy();
    expect(bones, "NewInBones' condition").toBeTruthy();
    const waiting = condition(held!);
    const standing = condition(bones!);
    for (const settled of [false, true])
      for (const loading of [false, true])
        for (const error of [false, true]) {
          if (standing(settled, loading, error)) expect(waiting(settled, loading, error), `settled ${settled}, loading ${loading}, error ${error}`).toBe(true);
        }
  });
});
