import "server-only";

import { SAINTS } from "@/lib/saints/saints";

import { minutesOf, nameOf, statFor } from "./cards";
import { ENTRIES, bylineOf, type WorkKey } from "./entries";
import { getPath, type ReadingPath } from "./paths";
import { workHref } from "./workHref";

export type PathReadingView = { href: string; title: string; author: string | null; minutes: number; part?: { n: number; of: number } };
export type PathView = { id: string; days: { readings: PathReadingView[]; minutes: number }[] };

/** A path as its page draws it: each reading's title, author, length and the place it opens. */
export function pathPage(id: string): PathView | null {
  const path = getPath(id);
  if (!path) return null;
  return { id, days: path.days.map((day) => {
    const readings = day.map((r) => readingOf(path, r.work, r.from, r.to));
    return { readings, minutes: readings.reduce((n, r) => n + r.minutes, 0) };
  }) };
}

function readingOf(path: ReadingPath, work: WorkKey, from?: number, to?: number): PathReadingView {
  const [saint, slug] = work.split("/");
  const title = SAINTS.find((s) => s.slug === saint)?.works.find((w) => w.slug === slug)?.title ?? slug;
  const line = bylineOf(ENTRIES[work]);
  const runs = path.days.flat().filter((r) => r.work === work && r.from !== undefined);
  const part = from !== undefined && runs.length > 1 ? { n: runs.findIndex((r) => r.from === from) + 1, of: runs.length } : undefined;
  const first = from ?? statFor(work)?.sections[0]?.[0] ?? 1;
  return {
    href: `${workHref(saint, slug)}#s${first}`,
    title,
    author: line.slug ? nameOf(line.slug) : null,
    minutes: minutesOf(work, from !== undefined ? [[from, to ?? from]] : undefined),
    ...(part ? { part } : {}),
  };
}
