import { describe, expect, it } from "vitest";

// The kit's own builder, read as it is (as lib/email/__tests__/kit.test.ts reads it).
import * as kitBuild from "../../../docs/brand/kit/email/build.mjs";
import { goalHitEmail, goalWords } from "../goalHit";

const build = kitBuild as { milestone: (how: string) => string };

describe("the goal email", () => {
  it("is the letter he said yes to, character for character", () => {
    const { subject, html } = goalHitEmail(
      { level: 4, tier: 4, name: "Halfway", amount: "$750 a week", date: "Monday, May 17" },
      { admin: "https://purifyapp.net/admin" },
      { cross: "img/cross.png", mark: "img/level-4.png" },
    );
    expect(subject).toBe("You hit Halfway");
    expect(html).toBe(build.milestone("email"));
  });

  it("says the goal as a person would", () => {
    expect(goalWords("Halfway")).toBe("halfway");
    expect(goalWords("The first mark")).toBe("the first mark");
    expect(goalWords("A quarter of the way")).toBe("a quarter of the way");
    expect(goalWords("Freedom")).toBe("Freedom");
  });
});
