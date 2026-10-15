import { describe, expect, it } from "vitest";
import { ANTHEM_LYRICS, ANTHEM_LYRICS_FR } from "@/lib/prayers/anthemLyrics";
import { captionLines, lineAt } from "../captions";

describe("live captions", () => {
  const lines = captionLines(ANTHEM_LYRICS, 126.88);

  it("keeps every line and every word of the anthem, in order", () => {
    expect(lines).toHaveLength(ANTHEM_LYRICS.length);
    lines.forEach((line, i) => {
      expect(line.words.map((w) => w.text).join(" ")).toBe(ANTHEM_LYRICS[i].text);
    });
  });

  it("lights each word inside its own line, one after another", () => {
    for (const line of lines) {
      expect(line.words[0].at).toBe(line.at);
      for (let j = 1; j < line.words.length; j++) expect(line.words[j].at).toBeGreaterThan(line.words[j - 1].at);
      expect(line.words.at(-1)!.at).toBeLessThan(line.end);
    }
  });

  it("ends a line where the next begins, and the last a little after it starts", () => {
    for (let i = 0; i + 1 < lines.length; i++) expect(lines[i].end).toBe(lines[i + 1].at);
    const last = lines.at(-1)!;
    expect(last.end).toBeGreaterThan(last.at);
    expect(last.end).toBeLessThanOrEqual(126.88);
  });

  it("knows the line at any moment, a breath early", () => {
    expect(lineAt(lines, 0)).toBe(-1);
    expect(lineAt(lines, 3.1)).toBe(0); // 3.2 starts, taken 0.15 early
    expect(lineAt(lines, 24)).toBe(4);
    expect(lineAt(lines, 200)).toBe(lines.length - 1);
  });

  it("works for every version, French included", () => {
    const fr = captionLines(ANTHEM_LYRICS_FR, 0);
    expect(fr.length).toBe(ANTHEM_LYRICS_FR.length);
    expect(fr.every((l) => l.words.length > 0)).toBe(true);
  });
});
