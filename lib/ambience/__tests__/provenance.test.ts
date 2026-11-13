import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { isStreamedMedia } from "@/lib/media/streamed";

// docs/licensing/audio-provenance.md: "a track ships only if its source and
// license are documented here". Nothing held that line until 1.7 restored
// the ambience shelf, so it is held here: every file the apps carry under
// public/audio is named in that document.
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full) : [full];
  });
}

describe("the audio the apps carry", () => {
  const doc = fs.readFileSync("docs/licensing/audio-provenance.md", "utf8");

  it("is every one of it in the provenance record", () => {
    // The sound files (the Anthem's picture beside them is an image).
    const shipped = files("public/audio")
      .map((f) => f.replace(/\\/g, "/"))
      .filter((f) => /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/i.test(f));
    expect(shipped.length).toBeGreaterThan(0);
    // A folder of our own making can be recorded once for all its files (the
    // Bible read aloud, 1.8: a file a chapter).
    const folders = [...doc.matchAll(/`(public\/audio\/[^`]+\/)` \(every file\)/g)].map((m) => m[1]);
    expect(folders).toEqual(["public/audio/read/"]);
    const recorded = (f: string) => doc.includes("`" + f + "`") || folders.some((d) => f.startsWith(d));
    expect(shipped.filter((f) => !recorded(f))).toEqual([]);
  });

  it("gives every ambience sound a file that is there", () => {
    for (const t of AMBIENCE_TRACKS) expect(fs.existsSync(path.join("public", t.src)), t.id).toBe(true);
  });

  // Build 95, note 11: where each sound is asked for. A bundled one must be
  // in the export (out/audio/ambience), so its folder is never set aside by
  // the native build; one kept on the website alone must be a streamed path,
  // or the apps would ask their own bundle for a file it does not hold
  // (lib/media/streamed.ts: streamedUrl reaches the website only for those).
  it("carries every bundled sound in the apps, and asks the website for any kept there alone", () => {
    const build = fs.readFileSync("scripts/native-build.mjs", "utf8");
    expect(build).not.toMatch(/\[\s*"public",\s*"audio",\s*"ambience"\s*\]/);
    expect(build).not.toMatch(/\[\s*"public",\s*"audio"\s*\]/);
    for (const t of AMBIENCE_TRACKS) expect(isStreamedMedia(t.src), t.id).toBe(t.where === "web");
  });
});
