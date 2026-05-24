import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

// The shape of a single document JSON under data/councils/{council}/{doc}.json.
// Mirrors the saints WritingContent schema deliberately so the reader UI
// (section title + framing + paragraphs + optional notes) can be reused
// without translation.

export type CouncilSection = {
 n: number;
 title: string;
 /** Editorial intro placed ABOVE the conciliar text: historical context,
 * dating, the standard reception. One paragraph, ~120 words. Optional. */
 framing?: string;
 /** Source attribution for `paragraphs`, e.g. "Schaff & Wace, NPNF2 Vol. 14,
 * p. 3" or "Canon I of Nicaea". Rendered as a small eyebrow above the
 * paragraphs so the reader knows what the text below is. Optional. */
 citation?: string;
 /** The text of the section, verbatim from the cited PD source. */
 paragraphs: string[];
 /** Editorial marginalia for the right column. Optional. */
 notes?: string[];
};

export type CouncilDocumentContent = {
 council: string;
 slug: string;
 title: string;
 subtitle?: string;
 source: string;
 sections: CouncilSection[];
};

const DATA_DIR = path.join(process.cwd(), "data", "councils");

export async function loadCouncilDocument(
 councilSlug: string,
 documentSlug: string,
): Promise<CouncilDocumentContent | null> {
 try {
 const file = path.join(DATA_DIR, councilSlug, `${documentSlug}.json`);
 const raw = await fs.readFile(file, "utf8");
 return JSON.parse(raw) as CouncilDocumentContent;
 } catch {
 return null;
 }
}
