// The reader's side of a work's file (app/saints-data/).
//
// A work is one file, or, for a work the Bible's commentary quotes, an index
// and parts (lib/saints/writingParts.ts). Whoever reads a work asks here and
// is handed the work whole, or one section of it, and never has to know which
// way it was written.
//
// The addresses are relative on purpose, as in lib/bible/chapterData.ts: the
// website on the web, the bundle inside the apps, where they open with no
// network. A file that was read in this visit is not read again; one that
// could not be read is asked for again the next time.

import { isWorkIndex, joinWork, partOfSection, workFileName, type PartSection, type WholeWork, type WorkIndex } from "./writingParts";

const kept = new Map<string, Promise<unknown>>();
// Parts are small and many, and a long night in the commentary should not
// hold every homily it passed. The indexes and whole works asked for are few.
const KEEP_PARTS = 96;

function read<T>(path: string, isPart = false): Promise<T | null> {
  const hit = kept.get(path);
  if (hit) {
    if (isPart) {
      kept.delete(path);
      kept.set(path, hit);
    }
    return hit as Promise<T | null>;
  }
  const asked = fetch(path)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null);
  kept.set(path, asked);
  void asked.then((v) => {
    if (v === null && kept.get(path) === asked) kept.delete(path);
  });
  if (isPart) {
    const parts = [...kept.keys()].filter((k) => /\.p\d+\.json$/.test(k));
    for (const old of parts.slice(0, Math.max(0, parts.length - KEEP_PARTS))) kept.delete(old);
  }
  return asked;
}

const address = (saint: string, file: string) => `/saints-data/${encodeURIComponent(saint)}/${file}`;

/** The work's own file: the work whole, or its index. */
function workFile(saint: string, work: string): Promise<WholeWork | WorkIndex | null> {
  return read<WholeWork | WorkIndex>(address(saint, workFileName(work)));
}

function workPart(saint: string, work: string, part: number): Promise<PartSection[] | null> {
  return read<PartSection[]>(address(saint, workFileName(work, part)), true);
}

/** A work whole, however it was written; null when it, or any part of it, could not be read. */
export async function fetchWriting<T = WholeWork>(saint: string, work: string): Promise<T | null> {
  const file = await workFile(saint, work);
  if (!file) return null;
  if (!isWorkIndex(file)) return file as unknown as T;
  const parts = await Promise.all(file.parts.map((_, part) => workPart(saint, work, part)));
  if (parts.some((p) => p === null)) return null;
  return joinWork(file, parts as PartSection[][]) as unknown as T;
}

/** One section of a work, by its number, reading only the part that holds it; null when it cannot be read. */
export async function fetchWorkSection(saint: string, work: string, n: number): Promise<PartSection | null> {
  const file = await workFile(saint, work);
  if (!file) return null;
  if (!isWorkIndex(file)) return file.sections.find((s) => s.n === n) ?? null;
  const part = partOfSection(file, n);
  if (part === null) return null;
  const sections = await workPart(saint, work, part);
  return sections?.find((s) => s.n === n) ?? null;
}

/** The work's title, from its own file (the work whole, or its index); null when it cannot be read. */
export async function fetchWorkTitle(saint: string, work: string): Promise<string | null> {
  const file = await workFile(saint, work);
  const title = file ? (file as { title?: unknown }).title : null;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

/** For tests: forget everything that was read. */
export function forgetWritings(): void {
  kept.clear();
}
