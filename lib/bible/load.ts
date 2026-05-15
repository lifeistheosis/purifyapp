import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export type Verse = { n: number; text: string };
export type Chapter = {
  book: string;
  name: string;
  chapter: number;
  verses: Verse[];
  source: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "bible");

export async function loadChapter(
  bookSlug: string,
  chapter: number,
): Promise<Chapter | null> {
  try {
    const file = path.join(DATA_DIR, bookSlug, `${chapter}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as Chapter;
  } catch {
    return null;
  }
}

export type CrossRef = { display: string; votes: number };
export type ChapterCrossRefs = Record<string, CrossRef[]>;

export async function loadCrossRefs(
  bookSlug: string,
  chapter: number,
): Promise<ChapterCrossRefs> {
  try {
    const file = path.join(DATA_DIR, "cross-refs", bookSlug, `${chapter}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as ChapterCrossRefs;
  } catch {
    return {};
  }
}

export async function loadIntro(bookSlug: string): Promise<string | null> {
  try {
    const file = path.join(DATA_DIR, "intros", `${bookSlug}.md`);
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

export type CommentaryNote = {
  author: string;
  work: string;
  citation: string;
  text: string;
};
export type ChapterCommentary = Record<string, CommentaryNote[]>;

export async function loadCommentary(
  bookSlug: string,
  chapter: number,
): Promise<ChapterCommentary> {
  try {
    const file = path.join(DATA_DIR, "commentary", bookSlug, `${chapter}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as ChapterCommentary;
  } catch {
    return {};
  }
}
