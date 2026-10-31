import "server-only";

import { shownCite } from "@/lib/citations/shown";
import type { ShownCite } from "@/lib/citations/cite";
import { SCHEMES } from "@/lib/saints/divisions";
import { getSaint } from "@/lib/saints/saints";

import type { TheologyBody } from "./load";
import { fatherKey, type DeckPassage } from "./page";
import { placePassages, type PlacedStudy } from "./parts";

/**
 * A study's passages as its cards show them, and where each stands in the
 * study read part by part (1.8, round 3 r3-13). Resolved here, on the
 * server: where each passage stands in the app (lib/citations/shown.ts) and
 * who each Father is.
 */
export function studyPassages(body: TheologyBody): { passages: DeckPassage[]; placed: PlacedStudy } {
  const passages = body.florilegium.map(passageOf);
  const placed = placePassages(
    body.essay,
    body.florilegium.map((q) => {
      const saint = q.saintSlug ? getSaint(q.saintSlug) : null;
      return {
        names: [saint?.name, q.author].filter((n): n is string => Boolean(n)),
        ...(q.placement !== undefined ? { placement: q.placement } : {}),
      };
    }),
  );
  return { passages, placed };
}

/**
 * One passage of the florilegium as its card shows it. Where the library has
 * the words, its line names the work and the place and opens them; a work it
 * numbers as the edition does (lib/saints/divisions.ts) says the place better
 * than the study's caption. Elsewhere the caption keeps the study's place,
 * and Read where it's from opens the public-domain page the words were read
 * on.
 */
export function passageOf(q: TheologyBody["florilegium"][number]): DeckPassage {
  const shown = q.cite ? shownCite(q.cite) : null;
  const placed = shown?.kind === "father" ? shown : null;
  const numbered = q.cite?.kind === "work" && Boolean(SCHEMES[`${q.cite.saint}/${q.cite.work}`]);
  const saint = q.saintSlug ? getSaint(q.saintSlug) : null;
  const inApp = whereFrom(shown);
  const [work, place] = workAndPlace(shown, q, numbered);
  return {
    text: q.text,
    father: fatherKey({ saintSlug: saint?.slug, author: q.author }),
    name: saint?.name ?? q.author,
    author: q.author,
    ...(saint ? { saintSlug: saint.slug, ...(saint.iconUrl ? { iconUrl: saint.iconUrl } : {}) } : {}),
    ...(work ? { work } : {}),
    ...(place ? { place } : {}),
    ...(shown?.kind === "inexact" ? { inexact: true } : {}),
    ...(inApp ? { source: { href: inApp, external: false } } : q.source ? { source: { href: q.source, external: true } } : {}),
    ...(q.gloss ? { gloss: q.gloss } : {}),
    ...(placed ? { gatherHref: placed.href } : q.saintSlug ? { gatherHref: `/saints/${q.saintSlug}` } : {}),
  };
}

/**
 * Where Read where it's from opens in the app: the words where they stand,
 * as the source line under a quotation links them (Today's saint window does
 * the same, lib/today/saintWords.ts, readWhereFrom). Null for a text the
 * library does not carry.
 */
function whereFrom(shown: ShownCite | null): string | null {
  if (!shown) return null;
  if (shown.kind === "father" || shown.kind === "scripture") return shown.href;
  if (shown.kind === "inexact") return shown.of.href;
  return null;
}

/**
 * The work and the place under a passage. The work is the library's name for
 * it where the library has the words, else the study's. The place is the
 * library's in a work it numbers as the edition does, which says it better;
 * elsewhere the study's caption keeps its finer place.
 */
function workAndPlace(
  shown: ShownCite | null,
  caption: { work?: string; reference?: string },
  numbered: boolean,
): [string | undefined, string | undefined] {
  const at = shown?.kind === "inexact" ? shown.of : shown;
  if (at?.kind === "father") {
    const library = [at.place, at.mark].filter(Boolean).join(", ");
    return [at.work || caption.work, (numbered ? library || caption.reference : caption.reference || library) || undefined];
  }
  if (at?.kind === "text") return [at.work, at.place];
  return [caption.work, caption.reference];
}
