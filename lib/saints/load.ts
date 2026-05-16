import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export type Section = {
  n: number;
  title: string;
  paragraphs: string[];
  /**
   * Editorial marginalia — short reading notes shown in the right column.
   * Each entry is one note (1-2 sentences). Optional.
   */
  notes?: string[];
};

export type WritingContent = {
  saint: string;
  slug: string;
  title: string;
  subtitle?: string;
  source: string;
  sections: Section[];
};

const DATA_DIR = path.join(process.cwd(), "data", "saints");

export async function loadWriting(
  saintSlug: string,
  workSlug: string,
): Promise<WritingContent | null> {
  try {
    const file = path.join(DATA_DIR, saintSlug, `${workSlug}.json`);
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as WritingContent;
  } catch {
    return null;
  }
}
