// Theology's path (1.8, round 3 r3-13): the owner's hybrid of B and C, C's
// path through the faith in the order of the Creed. What a reader would
// notice if this broke: the nine out of the Creed's order, the hub sending a
// learning reader back to a read they already went past, a study that will
// not resume at the part they reached, or a stored progress from an older
// build breaking the page.

import { describe, expect, it } from "vitest";

import {
  NO_PROGRESS,
  PATH_ORDER,
  currentStepIndex,
  firstSentence,
  isWalked,
  nextReadIndex,
  parseProgress,
  partFromHash,
  partHash,
  readAfter,
  readIdOf,
  readStates,
  resumePart,
  started,
  stepNumeral,
  stepStates,
  walkedCount,
  withAt,
  withPart,
  withRead,
  withWalked,
  type PathRead,
} from "@/lib/theology/path";
import { pathSteps } from "@/lib/theology/pathSteps";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";

const read = (id: string, kind: PathRead["kind"] = "study"): PathRead => ({ id, kind, href: `/x/${id}`, title: id });
const step = (id: string, reads: string[]) => ({ id, reads: reads.map((r) => read(r)) });

describe("the path's steps", () => {
  it("are the nine subjects in the order of the Creed, I to IX", () => {
    expect(PATH_ORDER).toEqual(["trinity", "christ", "theotokos", "church", "mysteries", "salvation", "icons", "scripture", "last-things"]);
    expect(PATH_ORDER).toEqual(THEOLOGY_SUBJECTS.map((s) => s.id));
    expect([1, 6, 9].map(stepNumeral)).toEqual(["I", "VI", "IX"]);
  });

  it("hold every subject's reads from the registries, the question first, then studies, errors, councils", async () => {
    const steps = await pathSteps(false);
    expect(steps.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const order = { question: 0, study: 1, error: 2, council: 3 } as const;
    for (const s of steps) {
      const kinds = s.reads.map((r) => order[r.kind]);
      expect(kinds, s.id).toEqual([...kinds].sort((a, b) => a - b));
      expect(s.reads.length, s.id).toBeGreaterThan(0);
      for (const r of s.reads) {
        expect(r.title, r.id).toBeTruthy();
        expect(r.href, r.id).toMatch(/^\/(topics|theology|heresies|councils)\//);
      }
    }
    const salvation = steps.find((s) => s.id === "salvation")!;
    expect(salvation.reads.map((r) => r.id)).toEqual([
      "q:theosis",
      "s:theosis",
      "s:essence-energies",
      "s:original-sin",
      "s:penal-substitution",
      "h:pelagianism",
      "h:barlaamism",
      "h:valentinianism",
    ]);
    // The question's short answer, its definition's first sentence; a study's length, parts and Father.
    expect(salvation.short).toMatch(/^Theosis is the goal of the Christian life/);
    expect(salvation.short?.endsWith(".")).toBe(true);
    const ee = salvation.reads.find((r) => r.id === "s:essence-energies")!;
    expect(ee).toMatchObject({ minutes: 30, parts: 5, father: { slug: "basil-the-great" } });
    // A council wears its own picture; four subjects have no question to start on.
    const trinity = steps[0];
    expect(trinity.reads.find((r) => r.kind === "council")?.picture?.src).toMatch(/^\/history\/media\//);
    expect(steps.filter((s) => !s.reads.some((r) => r.kind === "question")).map((s) => s.id)).toEqual(["church", "icons", "scripture", "last-things"]);
  });
});

describe("the reader's place on the path", () => {
  const steps = [step("a", ["a1", "a2"]), step("b", ["b1"]), step("c", ["c1", "c2"])];

  it("is nothing kept, read forgivingly from whatever the device holds", () => {
    expect(parseProgress(null)).toEqual(NO_PROGRESS);
    expect(parseProgress("")).toEqual(NO_PROGRESS);
    expect(parseProgress("not json")).toEqual(NO_PROGRESS);
    expect(parseProgress("[1,2]")).toEqual({ walked: [], read: [], at: null, parts: {} });
    expect(parseProgress('{"walked":["a",3],"read":"x","at":7,"parts":{"s":2,"t":0,"u":"3"}}')).toEqual({
      walked: ["a"],
      read: [],
      at: null,
      parts: { s: 2 },
    });
    expect(started(NO_PROGRESS)).toBe(false);
    expect(started(withAt(NO_PROGRESS, "a"))).toBe(true);
  });

  it("starts at the first step, which is the one in hand", () => {
    expect(currentStepIndex(steps, NO_PROGRESS)).toBe(0);
    expect(stepStates(steps, NO_PROGRESS)).toEqual(["current", "ahead", "ahead"]);
    expect(walkedCount(steps, NO_PROGRESS)).toBe(0);
  });

  it("is the step last opened while it is not walked, else the first not walked", () => {
    const p = withAt(withWalked(NO_PROGRESS, "a"), "c");
    expect(currentStepIndex(steps, p)).toBe(2);
    expect(stepStates(steps, p)).toEqual(["walked", "ahead", "current"]);
    const walkedC = withWalked(p, "c");
    expect(currentStepIndex(steps, walkedC)).toBe(1);
    expect(currentStepIndex(steps, withWalked(walkedC, "b"))).toBe(-1);
  });

  it("walks a step by its Up next, or once every read of it is read", () => {
    expect(isWalked(steps[1], withWalked(NO_PROGRESS, "b"))).toBe(true);
    expect(isWalked(steps[0], withRead(withRead(NO_PROGRESS, "a1"), "a2"))).toBe(true);
    expect(isWalked(steps[0], withRead(NO_PROGRESS, "a2"))).toBe(false);
  });

  it("lights the read after the furthest one read, so a jump ahead is not sent back", () => {
    const reads = steps[2].reads;
    expect(nextReadIndex(reads, NO_PROGRESS)).toBe(0);
    expect(nextReadIndex(reads, withRead(NO_PROGRESS, "c1"))).toBe(1);
    expect(nextReadIndex(reads, withRead(NO_PROGRESS, "c2"))).toBe(-1);
    expect(readStates(reads, withRead(NO_PROGRESS, "c1"))).toEqual(["read", "next"]);
    expect(readStates(steps[0].reads, withRead(NO_PROGRESS, "a2"))).toEqual(["ahead", "read"]);
    expect(readAfter(reads, "c1")?.id).toBe("c2");
    expect(readAfter(reads, "c2")).toBeNull();
  });

  it("keeps the furthest part of a study, and resumes there until it is finished", () => {
    const p = withPart(withPart(NO_PROGRESS, "s", 3), "s", 2);
    expect(p.parts.s).toBe(3);
    expect(resumePart(p, "s", 5)).toBe(3);
    expect(resumePart(withPart(p, "s", 5), "s", 5)).toBe(1);
    expect(resumePart(NO_PROGRESS, "s", 5)).toBe(1);
  });

  it("changes nothing when nothing changes, so no write is made", () => {
    const p = withRead(NO_PROGRESS, "x");
    expect(withRead(p, "x")).toBe(p);
    expect(withAt(withAt(p, "a"), "a")).toEqual(withAt(p, "a"));
    expect(withWalked(withWalked(p, "a"), "a").walked).toEqual(["a"]);
  });

  it("names its reads by kind", () => {
    expect([readIdOf.question("t"), readIdOf.study("t"), readIdOf.error("t"), readIdOf.council("t")]).toEqual(["q:t", "s:t", "h:t", "c:t"]);
  });
});

describe("a study read part by part", () => {
  it("keeps the part in view in the address, held within the study", () => {
    expect(partHash(2)).toBe("#part-2");
    expect(partFromHash("#part-2", 5)).toBe(2);
    expect(partFromHash("", 5)).toBe(1);
    expect(partFromHash("#part-9", 5)).toBe(5);
    expect(partFromHash("#part-0", 5)).toBe(1);
    expect(partFromHash("#study", 5)).toBe(1);
  });
});

describe("a question's short answer", () => {
  it("is its definition's first sentence, and a full stop after St. ends none", () => {
    expect(firstSentence("God is one. Three Persons.")).toBe("God is one.");
    expect(firstSentence("As St. Basil says, God is known. More.")).toBe("As St. Basil says, God is known.");
    expect(firstSentence("Called 'the one who gave birth to God.' Then more.")).toBe("Called 'the one who gave birth to God.'");
    expect(firstSentence("No full stop at all")).toBe("No full stop at all");
  });
});
