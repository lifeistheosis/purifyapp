import { describe, expect, it } from "vitest";

import { ROADS, leanOf, roadOf, type RoadAnswers } from "../road";
import { ALL_BACKGROUNDS, INTENTS, LEVELS, type Background, type Intent, type Level } from "../space";

// The road (1.9): where a reader comes in from, beside how far along they
// are. Read from what they said, never guessed
// (docs/1.9-build/notes/onboarding-fable.md, 3.4).

const road = (o: Partial<RoadAnswers> = {}) => roadOf({ background: null, level: null, intent: null, returning: false, ...o });

describe("the reader's road", () => {
  it("is none when the reader has said nothing, or would rather not say and gave no level", () => {
    expect(road()).toBeNull();
    expect(road({ background: "prefer-not" })).toBeNull();
    // Picks alone choose no road: what a reader is looking for is not where they come from.
    expect(road({ intent: "fathers" })).toBeNull();
    // Orthodox, and skipped before the next question: Purify as it always was.
    expect(road({ background: "orthodox" })).toBeNull();
  });

  it("puts what the reader said of their practice before where they come from", () => {
    for (const background of [...ALL_BACKGROUNDS, null] as (Background | null)[]) {
      expect(road({ background, level: "practicing" }), String(background)).toBe("practicing");
      expect(road({ background, level: "practicing", returning: true }), String(background)).toBe("returning");
      expect(road({ background, level: "learning" }), String(background)).toBe("catechumen");
    }
  });

  it("gives a reader not yet going the road of where they come from", () => {
    expect(road({ background: "catholic", level: "inquirer" })).toBe("catholic");
    expect(road({ background: "protestant", level: "inquirer" })).toBe("protestant");
    expect(road({ background: "christian", level: "inquirer" })).toBe("christian");
    expect(road({ background: "other-faith", level: "inquirer" })).toBe("newcomer");
    expect(road({ background: "none", level: "inquirer" })).toBe("newcomer");
  });

  it("reads where they come from alone when they skipped before the level", () => {
    expect(road({ background: "catholic" })).toBe("catholic");
    expect(road({ background: "protestant" })).toBe("protestant");
    expect(road({ background: "christian" })).toBe("christian");
    expect(road({ background: "other-faith" })).toBe("newcomer");
    expect(road({ background: "none" })).toBe("newcomer");
  });

  it("takes Orthodox by family and new to the faith down the road back", () => {
    expect(road({ background: "orthodox", level: "inquirer" })).toBe("returning");
  });

  it("is the early-church seeker's for the curious who asked first for the Fathers, the councils or history", () => {
    for (const intent of ["fathers", "councils", "history"] as Intent[]) {
      expect(road({ background: "none", level: "inquirer", intent }), intent).toBe("seeker");
      expect(road({ background: "none", intent }), intent).toBe("seeker");
      expect(road({ background: "prefer-not", level: "inquirer", intent }), intent).toBe("seeker");
      expect(road({ level: "inquirer", intent }), intent).toBe("seeker");
      // Never for a reader who named a tradition: theirs is their own road.
      expect(road({ background: "catholic", level: "inquirer", intent }), intent).toBe("catholic");
      expect(road({ background: "other-faith", level: "inquirer", intent }), intent).toBe("newcomer");
    }
    for (const intent of INTENTS.filter((i) => !["fathers", "councils", "history"].includes(i))) {
      expect(road({ background: "none", level: "inquirer", intent }), intent).toBe("newcomer");
    }
  });

  it("answers every combination with a road it knows, or none", () => {
    const seen = new Set<string>();
    for (const background of [...ALL_BACKGROUNDS, null] as (Background | null)[]) {
      for (const level of [...LEVELS, null] as (Level | null)[]) {
        for (const intent of [...INTENTS, null] as (Intent | null)[]) {
          for (const returning of [false, true]) {
            const r = roadOf({ background, level, intent, returning });
            if (r) {
              expect(ROADS).toContain(r);
              seen.add(r);
            }
          }
        }
      }
    }
    // Eight roads, each reachable.
    expect([...seen].sort()).toEqual([...ROADS].sort());
  });
});

describe("a Protestant reader's lean", () => {
  it("is Scripture's unless what they asked for says they know a church with a liturgy", () => {
    expect(leanOf(null)).toBe("bible");
    for (const i of ["gospels", "study", "beliefs", "prayer", "quiet"] as Intent[]) expect(leanOf(i), i).toBe("bible");
    for (const i of ["liturgy", "fathers", "councils", "history", "feasts", "saints"] as Intent[]) expect(leanOf(i), i).toBe("liturgical");
  });
});
