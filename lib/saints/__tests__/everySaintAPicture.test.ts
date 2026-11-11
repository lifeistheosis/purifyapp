// Every saint a picture, but the named few still waiting for one (build 93
// note 12; the pre-build gate's part 3, CLAUDE.md: "no saint and no work
// stands without a picture unless it is on the named list of permissions
// awaited"). His words, 2026-11-11: "Ensure every single saint has a icon
// photo". The works have their own list (lib/reading/__tests__/
// coverArt.test.ts, WAITING); this is the saints' pages.
//
// A saint with no picture stands here by name with what he waits for:
//   permission  a modern icon, until its painter or monastery gives written
//               permission (docs/1.9-build/ICON-PERMISSIONS.md, Admin's
//               letters); the only kind the gate lets through
//   search      no free picture has passed yet, and the chat named is
//               looking (an old icon, or the oldest public-domain picture
//               whose freedom can be shown in its row)
//   his word    a picture found, waiting on the owner
// Each leaves this list in the commit that gives him his picture, and a
// saint with no picture who is not named here fails it.
//
// What would go wrong if this broke: a saint on the plain plate that no one
// is looking for, or a test build cut while a saint waits on a search
// rather than a permission.

import { describe, expect, it } from "vitest";

import { SAINTS } from "@/lib/saints/saints";

const WAITING: Record<string, string> = {
  // Modern saints, the owner's word of 2026-11-10 ("modern saints on the
  // plate until a painter or monastery gives written permission"); who to
  // write to is in docs/1.9-build/ICON-PERMISSIONS.md.
  "paisios-the-athonite": "permission: the Hesychasterion of St John the Theologian, Souroti",
  "porphyrios-of-kavsokalyvia": "permission: Efstathios Giannis, through the Church of Greece's Synodal Committee on Divine Worship",
  "silouan-the-athonite": "permission: the Monastery of St John the Baptist, Tolleshunt Knights (St Sophrony's icon of 1988)",
  "justin-popovic": "permission: the Eparchy of Valjevo",
  "cleopas-of-sihastria": "permission: the Romanian Patriarchate (the icon of 2024, Răzvan and Mihaela Bădescu)",
  "sofian-of-antim": "permission: the Romanian Patriarchate (the icon of 2024, Răzvan and Mihaela Bădescu)",
  "dumitru-staniloae": "permission: the Romanian Patriarchate (the icon of 2024, Răzvan and Mihaela Bădescu)",
  // Updates 2's search (build 93 note 12), at Commons' pace.
  "symeon-the-new-theologian": "search: Updates 2 (no icon whose freedom can be shown; a permission if none passes)",
  "mark-of-ephesus": "search: Updates 2 (the Illustrated Chronicle's miniature of 1568 to 1576 to be read; a permission if none passes)",
  "isidora-of-tabenna": "search: Updates 2",
  "alexander-of-alexandria": "search: Updates 2",
  "theodosius-the-great": "search: Updates 2",
  "adrian-of-rome": "search: Updates 2",
  "xenia-of-petersburg": "search: Updates 2",
  "bede-the-venerable": "search: Updates 2",
  "hilary-of-poitiers": "search: Updates 2",
  "victorinus-of-pettau": "search: Updates 2",
  "isidore-of-seville": "search: Updates 2 (Murillo's painting of 1655, its original still refused by Commons)",
  "peter-chrysologus": "search: Updates 2",
  // November's and December's saints are the November and December chat's
  // (docs/1.9-build/notes/november-saints.md, december-saints.md).
  "arsenius-of-prislop": "permission: the Diocese of Deva and Hunedoara (the Church's icon of 2025; its painter not named)",
  "iakovos-of-evia": "permission: Lydia Gourioti, iconographer",
  "sophrony-of-essex": "permission: the Monastery of St John the Baptist, Tolleshunt Knights (Sister Gabriela's icon)",
  "philoumenos-of-jacobs-well": "permission: the Holy Metropolis of Morphou (the icons of Hieromonk Ambrosios, 2009, and Michalis Koullepos, 1999)",
  "gabriel-of-georgia": "permission: Samtavro Convent or the Georgian Patriarchate (no icon with a named painter and no address found yet)",
  "theodota-mother-of-the-unmercenaries": "search: the November and December chat",
  "marcian-of-cyrrhus": "search: the November and December chat",
  "nicander-and-hermas": "search: the November and December chat",
  "lazarus-of-galesion": "search: the November and December chat",
  "onesiphorus-and-porphyrius": "search: the November and December chat",
  "arsenius-of-cappadocia": "permission: the Hesychasterion of St John the Theologian, Souroti",
  "zacchaeus-and-alphaeus": "search: the November and December chat",
  "irenarchus-and-the-seven-women": "search: the November and December chat",
  "elias-of-murom": "search: the November and December chat",
  // January's saints (1.9): twenty took their pictures in the January chat's
  // pushes 2 and 3 (docs/1.9-build/notes/january-saints.md); these two have
  // none that passes.
  "prophet-micaiah": "search: the January chat found none (Weigel's engraving of 1695 shows him struck)",
  "george-the-chozebite": "permission: his monastery's wall painting, photographed by Britchi Mirela (docs/1.9-build/ICON-PERMISSIONS.md)",
};

/** The saints whose pages have no picture: no entry of the saint names one (a saint may stand in the registry more than once). */
function withoutPicture(): string[] {
  const has = new Map<string, boolean>();
  for (const s of SAINTS) has.set(s.slug, Boolean(has.get(s.slug)) || Boolean(s.iconUrl));
  return [...has].filter(([, pictured]) => !pictured).map(([slug]) => slug).sort();
}

describe("every saint", () => {
  it("has a picture, but the named few still waiting for one", () => {
    expect(withoutPicture()).toEqual(Object.keys(WAITING).sort());
    for (const [slug, why] of Object.entries(WAITING)) expect(why, slug).toMatch(/^(permission|search|his word): ./);
  });

  it("waits on a permission only where the list for Admin's letters names him", async () => {
    const fs = await import("node:fs");
    const list = fs.readFileSync("docs/1.9-build/ICON-PERMISSIONS.md", "utf8");
    const names = new Map(SAINTS.map((s) => [s.slug, s.name.replace(/^Sts?\. /, "")]));
    for (const [slug, why] of Object.entries(WAITING)) {
      if (!why.startsWith("permission:")) continue;
      expect(list, slug).toContain(`## St ${names.get(slug)}`);
    }
  });
});
