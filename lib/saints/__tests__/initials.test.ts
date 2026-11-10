import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { saintInitials } from "../initials";

/**
 * A saint's stand-in initials leave out the small words and the titles
 * (the arbiter's yes of 2026-11-10: "Ammon of Nitria" read "Ao"), by one rule
 * that every stand-in uses.
 */
describe("a saint's initials", () => {
  it("are the first letters of the first two words that name the saint", () => {
    expect(saintInitials("St. Ammon of Nitria")).toBe("AN");
    expect(saintInitials("The Mother of God")).toBe("MG");
    expect(saintInitials("St. Anthony the Great")).toBe("AG");
    expect(saintInitials("St. John Chrysostom")).toBe("JC");
    expect(saintInitials("Saint Basil the Great")).toBe("BG");
    expect(saintInitials("Pope Leo the Great")).toBe("LG");
    expect(saintInitials("Ephrem")).toBe("E");
    expect(saintInitials("the")).toBe("?");
  });

  it("are counted the same way by every stand-in", () => {
    for (const file of ["components/saints/SaintIcon.tsx", "components/bible/SaintIcon.tsx", "components/shop/SaintAvatar.tsx"]) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source, file).toContain('import { saintInitials } from "@/lib/saints/initials";');
      expect(source, file).not.toMatch(/\.slice\(0, 2\)\s*\.map\(/);
    }
  });
});
