// The words under the player's five marks keep whole (1.9, rec 80).
//
// After bdf3342 gave each word its whole share of the row (58.4px at 360,
// 64.4px at 390), twenty words in fourteen languages were still single words
// wider than that and broke mid-word ("Wiederholen", "Temporizador",
// "Επανάληψη"). The row now has words of its own (player.option.*): in those
// fourteen languages a shorter word, chosen and measured in the dev site's
// Now Playing on 2026-11-10, 21 languages at 360 and 390px, five words each:
// no word broken mid-word (210 measured, from 20 at 360 and 13 at 390). In
// the other languages the word is the one it always was. Each button keeps
// the full name for a screen reader.
//
// What a reader would notice if this broke: "Wiederho / len" under a mark, or
// a screen reader saying "Timer" for the sleep timer.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(rel, "utf8");
const CATALOGS = Object.fromEntries(
  fs
    .readdirSync("lib/i18n/messages")
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.slice(0, -5), JSON.parse(read(`lib/i18n/messages/${f}`)) as Record<string, string>]),
);

/** The full word each mark is named by. */
const FULL = { loop: "prayers.audio.loop", speed: "player.speed", ambience: "ambience.title", sleep: "player.sleep", read: "player.read" } as const;

/** The shorter words, as measured: everything else is the full word. */
const SHORTER: Record<string, Partial<Record<keyof typeof FULL, string>>> = {
  bg: { loop: "Повтор", sleep: "Таймер" },
  de: { loop: "Schleife", ambience: "Klang", sleep: "Timer" },
  el: { loop: "Ξανά", ambience: "Ήχοι", sleep: "Ύπνος" },
  es: { sleep: "Dormir" },
  id: { speed: "Laju" },
  it: { sleep: "Timer" },
  ka: { loop: "ციკლი" },
  ne: { loop: "लूप" },
  pl: { ambience: "Dźwięki" },
  pt: { speed: "Ritmo", sleep: "Dormir" },
  ro: { sleep: "Somn" },
  sr: { loop: "Понови" },
  tr: { sleep: "Uyku" },
  uk: { speed: "Темп" },
};

describe("the words under the player's marks", () => {
  it("are the row's own in every language: the measured shorter word in fourteen, the full word elsewhere", () => {
    expect(Object.keys(CATALOGS)).toHaveLength(21);
    expect(Object.keys(SHORTER)).toHaveLength(14);
    for (const [code, m] of Object.entries(CATALOGS)) {
      for (const [mark, full] of Object.entries(FULL) as [keyof typeof FULL, string][]) {
        const word = m[`player.option.${mark}`];
        expect(word, `${code} ${mark}`).toBe(SHORTER[code]?.[mark] ?? m[full]);
        if (SHORTER[code]?.[mark]) expect(word.length, `${code} ${mark} is shorter`).toBeLessThan(m[full].length);
      }
    }
  });

  it("are what the row shows, while each button keeps its full name for a screen reader", () => {
    const sheet = read("components/player/NowPlayingSheet.tsx");
    for (const mark of ["loop", "speed", "sleep", "read"]) expect(sheet).toContain(`<OptionWord>{t("player.option.${mark}")}</OptionWord>`);
    expect(sheet).toContain('aria-label={`${t("prayers.audio.loop")}: ${loopLabel}`}');
    expect(sheet).toContain('aria-label={`${t("player.speed")}: ${speed}`}');
    expect(sheet).toContain('aria-label={t("player.sleep")}');
    expect(sheet).toContain('aria-label={audio.title ? `${t("player.read")}: ${audio.title}` : t("player.read")}');
    const ambience = read("components/player/AmbienceButton.tsx");
    expect(ambience).toContain('<OptionWord>{t("player.option.ambience")}</OptionWord>');
    expect(ambience).toContain('const label = track ? t("ambience.playingAria", { sound: t(track.labelKey) }) : t("ambience.title");');
  });
});
