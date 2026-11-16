// A track's name glides in its own direction (build 98 note 2, Updates 98j's
// Arabic still, 2026-11-16): in Arabic the English name "The life of St.
// Athanasius the Great" was laid out right to left inside the dock, so its
// first letter was cut and it glided from its end. And the mini player's
// title, which ended in an ellipsis on a long name, glides as the dock's does.
// What a reader would notice if this broke: in Arabic, an English title that
// begins mid-word and runs backwards; in the mini player, a long name cut
// short with no way to read the rest there.
//
// Fails on the code before the mend: the glide lived inside ReaderDock.tsx
// with no direction of its own (components/player/GlideName.tsx is new), and
// the mini player's title was a truncated line.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("the glide keeps the name's own direction", () => {
  const glide = read("components/player/GlideName.tsx");

  it("its words take their direction from themselves, as the chapter row's English name does", () => {
    expect(glide).toMatch(/<span dir="auto" className="flex w-max">/);
    expect(glide).toMatch(/const rtl = readsRtl\(run\);/);
    expect(glide).not.toMatch(/readsRtl\(line\)/);
  });

  it("while it glides the line takes that direction, so the name begins at its own start edge, uncut", () => {
    expect(glide).toMatch(/if \(next\) line\.dir = rtl \? "rtl" : "ltr";\s*else line\.removeAttribute\("dir"\);/);
  });

  it("and a name whose direction turns glides again from its start", () => {
    expect(glide).toMatch(/const key = next \? `\$\{next\.to\}` : "";/);
  });

  it("still, with motion reduced, its ellipsis at its own end", () => {
    expect(glide).toMatch(/<span dir="auto" className="inline-block max-w-full truncate align-top">/);
  });
});

describe("one glide, in the dock and the mini player", () => {
  it("the dock draws the shared one", () => {
    const dock = read("components/bible/ReaderDock.tsx");
    expect(dock).toMatch(/import \{ GlideName \} from "@\/components\/player\/GlideName";/);
    expect(dock).not.toMatch(/function GlideName/);
  });

  it("the mini player's title glides, no longer cut by an ellipsis", () => {
    const bar = read("components/prayers/NowPlayingBar.tsx");
    expect(bar).toMatch(/<GlideName text=\{name\} className="font-sans text-detail font-semibold text-paper" \/>/);
    expect(bar).not.toMatch(/truncate[^"]*">\{name\}<\/span>\s*\{artist/);
  });

  it("measured only at rest: not while the dock or the mini player is drawn in", () => {
    const glide = read("components/player/GlideName.tsx");
    expect(glide).toMatch(/document\.body\.hasAttribute\(AWAY_ATTR\) \|\| root\.classList\.contains\("reader-focus"\) \|\| root\.classList\.contains\("now-playing-drawn"\)/);
  });
});
