import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { FIGURES } from "@/lib/readAloud/covers";
import { COUNCIL_COVERS, FEELING_COVERS } from "@/lib/reading/authorCovers";
import { COVER_ART, WORK_ART } from "@/lib/reading/coverArt";
import { ICON_RIGHTS, ICONS_URL_PREFIX } from "@/lib/saints/iconRights";

/**
 * The photographs Purify's pictures are made from that their makers share
 * under a Creative Commons licence asking to be named (1.9, the owner's yes
 * to his page's 99, relayed by the arbiter on 2026-11-10: "CC BY and CC
 * BY-SA photographs are now allowed, each photographer named on a credits
 * page"). Every other picture in the app is public domain or CC0 and needs
 * no credit (docs/licensing/).
 *
 * Read from the pictures' own registries, so nothing is written twice (the
 * shape Updates asked for): the reading room's covers and doors
 * (lib/reading/coverArt.ts, authorCovers.ts), the Bible's read-aloud
 * covers (lib/readAloud/covers.ts), and the saints' own pictures
 * (lib/saints/iconRights.ts, from 2026-11-11, when St Victorinus's fresco
 * came to him through a CC BY-SA photograph), and the ambience sounds'
 * photographs (lib/ambience/ambience.ts, from build 95's note 22). A picture whose licence is CC BY or CC
 * BY-SA carries `credit`, the photographer as its Commons page asks to be
 * credited, beside the licence and the page it was read on; this lists every
 * one. The work photographed must itself be old enough to be free: a
 * photograph of a contemporary icon is never used, since the painter's
 * rights are not the photographer's to give, unless the painter published
 * it under such a licence themselves (St Mark of Ephesus's icon, by the
 * owner's word of 2026-11-11: its row's `creditAs` is "icon", and the
 * credit names the painter). Under CC BY-SA, Purify's crop is shared under
 * the same licence, as the page says. A saint's picture among these also
 * names its maker under it on his page, and in what every small face of it
 * says to a screen reader (lib/credits/saintPictures.ts).
 * lib/credits/__tests__/photos.test.ts holds every such picture to a credit.
 */

export const CC_LICENCES = {
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 2.5": "https://creativecommons.org/licenses/by/2.5/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY-SA 2.5": "https://creativecommons.org/licenses/by-sa/2.5/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
} as const;

export type CcLicence = keyof typeof CC_LICENCES;

export const isCcLicence = (license: string): license is CcLicence => Object.hasOwn(CC_LICENCES, license);

export type PhotoCredit = {
  /** Purify's file made from the photograph: a cover under /covers/, or a saint's picture under /saints/icons/. */
  file: string;
  /** The work photographed, in the registry's words. */
  work: string;
  /** The photographer, as the file's page asks to be credited; for an icon its painter (`kind`). */
  photographer: string;
  /** "icon": the icon's own painter, who published it under the licence; else a photograph of an old work. */
  kind: "photograph" | "icon";
  licence: CcLicence;
  /** The picture's page: its maker's own where the licence was given there, else its page on Wikimedia Commons. */
  source: string;
};

/** A picture in one of the registries, as far as a credit needs it. */
type Registered = { file: string; work: string; license: string; credit?: string; creditAs?: "icon"; creditPage?: string; evidenceUrl: string };

function registered(): Registered[] {
  const out: Registered[] = [];
  for (const art of [...Object.values(COVER_ART), ...Object.values(WORK_ART), ...Object.values(COUNCIL_COVERS), ...Object.values(FEELING_COVERS)]) {
    if (art.kind === "streamed") out.push(art);
  }
  for (const figure of Object.values(FIGURES)) if (figure) out.push(figure);
  // The ambience sounds' photographs (build 95, note 22), on their tiles in the sheet.
  for (const { photo } of AMBIENCE_TRACKS) out.push({ file: photo.src, work: photo.work, license: photo.license, credit: photo.credit, evidenceUrl: photo.evidenceUrl });
  for (const [file, row] of Object.entries(ICON_RIGHTS)) {
    if (row.status === "verified") out.push({ file: `${ICONS_URL_PREFIX}${file}`, work: row.work, license: row.license, credit: row.credit, creditAs: row.creditAs, creditPage: row.creditPage, evidenceUrl: row.evidenceUrl });
  }
  return out;
}

/** Every credited photograph, once each, in the registries' order. */
export function photoCredits(): PhotoCredit[] {
  const seen = new Set<string>();
  const out: PhotoCredit[] = [];
  for (const r of registered()) {
    if (!isCcLicence(r.license) || seen.has(r.file)) continue;
    seen.add(r.file);
    out.push({ file: r.file, work: r.work, photographer: r.credit ?? "", kind: r.creditAs ?? "photograph", licence: r.license, source: r.creditPage ?? r.evidenceUrl });
  }
  return out;
}

/** The credit for one of Purify's files, if its picture is a credited photograph. */
export function creditFor(file: string): PhotoCredit | undefined {
  return photoCredits().find((c) => c.file === file);
}
