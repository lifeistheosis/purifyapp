import { describe, expect, it } from "vitest";

// The kit's own builder (the Fable designer's), read as it is: importing it
// draws nothing and writes nothing (its writes run only as a script).
import * as kitBuild from "../../../docs/brand/kit/email/build.mjs";

import {
  bars,
  columns,
  days,
  esc,
  figures,
  label,
  link,
  linkRow,
  money,
  opening,
  pairs,
  para,
  pen,
  quietButton,
  saintCard,
  shell,
  signOff,
  type KitDay,
} from "../kit";
import { KIT_DARK, KIT_LIGHT, KIT_NIGHT_SKY } from "../theme";

/**
 * The letter sent is the letter he said yes to (2026-11-13, "yes look").
 *
 * The kit's builder draws its samples (reader.html, brief.html); here the
 * same samples are drawn with the production pieces (lib/email/kit.ts) and
 * held to the builder's, character for character. The palettes are held to
 * the builder's own computation from the kit's tokens, so a change to the kit
 * fails here until the email theme follows it.
 */

const build = kitBuild as {
  PALETTES: Record<string, { wears: Record<string, string> }>;
  NIGHT_SKY: Record<string, string>;
  reader: (how: string) => string;
  brief: (how: string) => string;
};

const KIT_ASSETS = { cross: "img/cross.png", crossInk: "img/cross-ink.png" };

describe("the kit's palettes", () => {
  it("are the builder's own: Dark, the clean light and Night sky", () => {
    expect(KIT_DARK).toEqual(build.PALETTES.Dark.wears);
    expect(KIT_LIGHT).toEqual(build.PALETTES.Light.wears);
    expect(KIT_NIGHT_SKY).toEqual(build.NIGHT_SKY);
  });

  it("never wear parchment", () => {
    for (const w of [KIT_DARK, KIT_LIGHT, KIT_NIGHT_SKY]) {
      for (const paper of ["#f1e8d4", "#e7dcc1", "#e6dcc4"]) {
        expect(w.ground).not.toBe(paper);
        expect(w.raised).not.toBe(paper);
      }
    }
  });
});

describe("the pieces draw what the kit draws", () => {
  it("the reader email, mark for mark", () => {
    const WEEK: KitDay[] = [
      { weekday: "Sun", date: "15", name: "St. Paisius Velichkovsky", kind: "saint", fast: "fish" },
      { weekday: "Mon", date: "16", name: "Holy Apostle and Evangelist Matthew", kind: "feast", fast: "fish" },
      { weekday: "Tue", date: "17", name: "St. Gregory the Wonderworker", kind: "saint", fast: "fish" },
      { weekday: "Fri", date: "20", name: "Forefeast of the Entrance of the Theotokos", kind: "feast", fast: "strict" },
      { weekday: "Sat", date: "21", name: "Entrance of the Most Holy Theotokos into the Temple", kind: "feast", fast: "fish" },
    ];
    const p = pen(KIT_DARK);
    const why = "You are getting this because you turned on “What is new in the library” in your Purify settings.";
    const foot = `<p style="margin:0">${esc("Dates follow the new calendar.")} ${esc(why)}</p>
  <p style="margin:6px 0 0">The company's name and its postal address stand here.</p>
  <p style="margin:18px 0 0">${quietButton(p, { href: "https://purifyapp.net/unsubscribe", text: "Unsubscribe" })}</p>
  <p style="margin:8px 0 0">${link(p, "https://purifyapp.net", "purifyapp.net")}</p>`;
    const mine = shell(p, {
      title: "The week ahead: Holy Apostle and Evangelist Matthew",
      preheader: "St. Paisius Velichkovsky, the Apostle Matthew, and the Entrance of the Theotokos.",
      kind: "Sunday, November 15",
      rows: [
        opening(p, { title: "The week ahead", sub: "November 15 to 21" }),
        days(p, WEEK),
        saintCard(p, {
          small: "This week in the library",
          name: "St. Paisius Velichkovsky",
          epithet: "Elder of Neamț · Reviver of Hesychasm",
          picture: "img/paisius-velichkovsky.jpg",
          alt: "St. Paisius Velichkovsky",
          href: "https://purifyapp.net/saints/paisius-velichkovsky",
          action: "Read about St. Paisius Velichkovsky",
        }),
        signOff(p),
      ],
      foot,
      assets: KIT_ASSETS,
    });
    expect(mine).toBe(build.reader("email"));
  });

  it("the owner's brief's pieces, mark for mark", () => {
    const p = pen(KIT_DARK);
    const mine = shell(p, {
      title: "The owner's brief: Thursday, November 12",
      preheader: "Yesterday on one screen. Two things need you.",
      kind: "The owner's brief",
      rows: [
        opening(p, { eyebrow: "Friday, November 13", title: "Yesterday", sub: "A steady Thursday. Two things need you." }),
        label(p, "Needs you"),
        para(p, esc("Two shop orders are paid and not yet sent."), 2),
        linkRow(p, "https://purifyapp.net/admin#tab=orders", "Open orders"),
        para(p, esc("One report in the community waits for a look."), 6),
        linkRow(p, "https://purifyapp.net/admin#tab=reports", "Open reports"),
        label(p, "Readers"),
        figures(p, [
          { value: "1,240", name: "Visitors", against: "86 more than Wednesday" },
          { value: "58", name: "New readers", against: "4 fewer" },
          { value: "4", name: "Plus starts", against: "1 cancellation" },
        ]),
        columns(p, { title: "Visitors, the last seven days", days: ["F", "S", "S", "M", "T", "W", "T"], values: [1010, 1180, 1420, 1090, 1130, 1154, 1240] }),
        label(p, "Money in"),
        money(p, {
          total: "$212.40",
          parts: [
            { slot: "shop", name: "Shop", amount: "$124.00", cents: 12400 },
            { slot: "plus", name: "Purify Plus", amount: "$58.40", cents: 5840 },
            { slot: "box", name: "EIKON Box", amount: "$30.00", cents: 3000 },
          ],
          back: "Refunds: none.",
        }),
        label(p, "Opened most"),
        bars(p, [
          { name: "Morning prayers", count: 312 },
          { name: "St. Nektarios of Aegina", count: 264 },
          { name: "John 1", count: 198 },
        ]),
        label(p, "Searched for and not found"),
        pairs(p, [
          { words: "akathist of thanksgiving", value: "6 times" },
          { words: "prayer before travel", value: "4 times" },
        ]),
        label(p, "Could not be read"),
        pairs(p, [{ words: "Errors", value: "not read", quiet: true }]),
        label(p, "Goes out today"),
        para(p, esc("The week ahead, the Sunday email, goes out at 9:00 unless you hold it."), 2),
        `<tr><td style="padding:14px 0 0">${quietButton(p, { href: "https://purifyapp.net/admin#tab=reach", text: "Hold" })}</td></tr>`,
      ],
      foot: `<p style="margin:0">Figures were read at 7:30 this morning. This brief is made for the owner and goes to no reader.</p>
  <p style="margin:18px 0 0">${quietButton(p, { href: "https://purifyapp.net/unsubscribe", text: "Unsubscribe" })}</p>
  <p style="margin:8px 0 0">${link(p, "https://purifyapp.net/admin", "Open the panel")}</p>`,
      assets: KIT_ASSETS,
    });
    expect(mine).toBe(build.brief("email"));
  });
});
