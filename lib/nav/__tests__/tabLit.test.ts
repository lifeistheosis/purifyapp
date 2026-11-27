import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tabLit } from "../tabLit";

const bar = fs.readFileSync(path.join(__dirname, "..", "..", "..", "components/nav/MobileTabBar.tsx"), "utf8");
/** The source of one tab's entry in the bar, from its key to the next. */
const tab = (key: string) => {
  const from = bar.indexOf(`key: "${key}"`);
  const to = bar.indexOf("key: \"", from + 1);
  return bar.slice(from, to < 0 ? undefined : to);
};

describe("the tab the bar lights", () => {
  it("a page of one home lights its tab", () => {
    expect(tabLit(["bible"], "you")).toBe("bible");
    expect(tabLit([], "you")).toBeNull();
  });

  it("a page of two homes lights the one the reader came from", () => {
    expect(tabLit(["bible", "you"], "you")).toBe("you");
    expect(tabLit(["bible", "you"], "bible")).toBe("bible");
  });

  it("with nothing to go by, the first that claims it", () => {
    expect(tabLit(["bible", "you"], null)).toBe("bible");
    expect(tabLit(["bible", "you"], "prayers")).toBe("bible");
  });

  it("the journal is claimed by the Bible and by You, and the bar lights by the rule", () => {
    for (const key of ["bible", "you"]) {
      expect(tab(key), key).toContain('p === "/journal"');
      expect(tab(key), key).toContain('p.startsWith("/journal/")');
    }
    expect(bar).toContain("const lit = tabLit(claims, lastSingleTab);");
    expect(bar).toContain("const active = key === lit;");
  });
});
