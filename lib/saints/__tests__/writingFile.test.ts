import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadWriting } from "../load";
import { SAINTS } from "../saints";
import { workOfFile, writingFile, writingFiles } from "../writingFile";

/**
 * A work of the Fathers as a file (app/saints-data/), and the page that no
 * longer carries it in the apps. The last test holds the page to that, so the
 * weight cannot come back as a prop without somebody deleting an assertion.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");

describe("a work as a file", () => {
  it("is written for every work in the registry, and every one opens", async () => {
    const files = writingFiles();
    expect(files.length).toBe(SAINTS.reduce((n, s) => n + s.works.length, 0));
    expect(files.length).toBeGreaterThan(100);
    for (const f of files) {
      // A file's name turns back into its work, or the route would answer 404 for a file it listed.
      const work = workOfFile(f.file);
      expect(work, `${f.slug}/${f.file}`).not.toBeNull();
      const text = await writingFile(f.slug, work!);
      expect(text, `${f.slug}/${f.file}`).not.toBeNull();
      expect(text!.sections.length, `${f.slug}/${f.file}`).toBeGreaterThan(0);
    }
  }, 120_000);

  it("is the work as the reader takes it: the same text the page hands over on the website", async () => {
    const file = await writingFile("athanasius-the-great", "on-the-incarnation");
    const page = await loadWriting("athanasius-the-great", "on-the-incarnation", "en");
    expect(file).not.toBeNull();
    expect(file!.title).toBe(page!.title);
    expect(file!.sections).toEqual(page!.sections);
    expect(file).not.toHaveProperty("isLocalized");
  });

  it("answers nothing for a work that is not in the registry, whatever its name", async () => {
    expect(await writingFile("athanasius-the-great", "no-such-work")).toBeNull();
    expect(await writingFile("no-such-saint", "on-the-incarnation")).toBeNull();
    for (const bad of ["../on-the-incarnation.json", "on-the-incarnation", "On-The-Incarnation.json", "a..json", ".json", "i18n/ru/on-the-incarnation.json"]) {
      expect(workOfFile(bad), bad).toBeNull();
    }
    expect(workOfFile("on-the-incarnation.json")).toBe("on-the-incarnation");
  });
});

describe("the writing page", () => {
  const page = fs.readFileSync(path.join(ROOT, "app/(app)/saints/[slug]/[work]/page.tsx"), "utf8");

  it("hands the apps' reader the work's name and not the work", () => {
    expect(page).toContain("<LazyWritingReader saint={found.saint} work={work} />");
    // The website keeps the text in the page, for search engines.
    expect(page).toContain("<WritingReader saint={found.saint} content={content} />");
    expect(page).toContain("IS_STATIC_EXPORT ? (");
  });
});
