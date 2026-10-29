// A doctrine's Related list names each study by its title. Until build 80 it
// printed the slug ("council of florence"), so every related study must be a
// topic the app can name, and the reader must ask for that name.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getTopicMeta } from "@/lib/theology/topics";

const DIR = path.join(process.cwd(), "data/theology");

describe("a doctrine's related studies", () => {
  it("each have a title to show", () => {
    const missing: string[] = [];
    for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
      const body = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as { related?: string[] };
      for (const slug of body.related ?? []) {
        if (!getTopicMeta(slug)?.title) missing.push(`${file}: ${slug}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("are shown by that title", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "components/theology/TopicReader.tsx"), "utf8");
    expect(src).toContain("getTopicMeta(slug)?.title");
  });
});
