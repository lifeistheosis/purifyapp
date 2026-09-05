import { describe, expect, it } from "vitest";

import { isCorrect, normalizeWord } from "../grade";
import { parseQuestion } from "../schema";

describe("normalizeWord", () => {
  it("folds case, diacritics, punctuation and space", () => {
    expect(normalizeWord("Théotokos.")).toBe("theotokos");
    expect(normalizeWord("  HOMO-ousios ")).toBe("homo ousios");
    expect(normalizeWord("Ὁμοούσιος")).toBe("ομοουσιος");
    expect(normalizeWord("'")).toBe("");
  });
});

describe("isCorrect", () => {
  it("grades each type by its own shape", () => {
    const mc = { type: "multiple_choice" as const, answer: 2 };
    expect(isCorrect(mc, 2)).toBe(true);
    expect(isCorrect(mc, 1)).toBe(false);
    expect(isCorrect(mc, "2")).toBe(false);

    const tf = { type: "true_false" as const, answer: false };
    expect(isCorrect(tf, false)).toBe(true);
    expect(isCorrect(tf, true)).toBe(false);
    expect(isCorrect(tf, 0)).toBe(false);

    const fw = { type: "fill_word" as const, answer: ["Theotokos", "Mother of God"] };
    expect(isCorrect(fw, "theotokos")).toBe(true);
    expect(isCorrect(fw, "  Théotokos ")).toBe(true);
    expect(isCorrect(fw, "mother of god")).toBe(true);
    expect(isCorrect(fw, "Mother of Gods")).toBe(false);
    expect(isCorrect(fw, "")).toBe(false);
    expect(isCorrect(fw, 0)).toBe(false);
  });
});

describe("question schema", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000001",
    prompt: "A prompt",
    explanation: "An explanation",
    source_ref: "/bible/john/1",
    tags: ["creed"],
    reviewed_by: "fixture",
  };

  it("accepts the three shapes", () => {
    expect(parseQuestion({ ...base, type: "multiple_choice", options: ["a", "b", "c", "d"], answer: 3 }).ok).toBe(true);
    expect(parseQuestion({ ...base, type: "true_false", answer: true }).ok).toBe(true);
    expect(parseQuestion({ ...base, type: "fill_word", answer: ["word"] }).ok).toBe(true);
  });

  it("refuses the wrong answer shape, a fifth option, an em dash, and a foreign path", () => {
    expect(parseQuestion({ ...base, type: "multiple_choice", options: ["a", "b", "c", "d"], answer: 4 }).ok).toBe(false);
    expect(parseQuestion({ ...base, type: "multiple_choice", options: ["a", "b", "c", "d", "e"], answer: 0 }).ok).toBe(false);
    expect(parseQuestion({ ...base, type: "true_false", answer: "true" }).ok).toBe(false);
    expect(parseQuestion({ ...base, type: "fill_word", answer: [] }).ok).toBe(false);
    expect(parseQuestion({ ...base, type: "true_false", answer: true, prompt: "A \u2014 prompt" }).ok).toBe(false);
    expect(parseQuestion({ ...base, type: "true_false", answer: true, source_ref: "https://x" }).ok).toBe(false);
    expect(parseQuestion({ ...base, type: "true_false", answer: true, extra: 1 }).ok).toBe(false);
  });
});
