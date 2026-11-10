/**
 * A lesson's words as the file writes them (Learn to pray, 1.7): paragraphs
 * apart by a blank line, a paragraph that is all **bold** is a heading, and
 * lines that open with "- " are a list. The words are never changed, only
 * set; until 1.7.1 the marks themselves were printed ("**The hand**").
 *
 * Shared by the page and the device, which sets a lesson in the reader's
 * language from its own file (1.9, components/prayers/LessonView.tsx).
 */
export type Block = { kind: "heading" | "list" | "text"; lines: string[] };

export function lessonBlocks(intro: string): Block[] {
  return intro
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw): Block => {
      const heading = /^\*\*(.+)\*\*$/.exec(raw);
      if (heading) return { kind: "heading", lines: [heading[1]] };
      const lines = raw.split("\n");
      if (lines.every((l) => l.startsWith("- "))) return { kind: "list", lines: lines.map((l) => l.slice(2)) };
      return { kind: "text", lines: [raw] };
    });
}

/**
 * Learn to pray's list as it shows a lesson (components/prayers/LessonList.tsx,
 * LessonRow), in order. Here and not beside the list, because the page calls
 * it on the server and the device calls it on a language's own file: a
 * function in a client file cannot be called from the server.
 */
export function rowsOf<L extends LessonLike & { summary: string; estimatedMinutes: number }>(list: readonly L[]) {
  return [...list]
    .sort((a, b) => a.order - b.order)
    .map(({ id, order, title, summary, estimatedMinutes }) => ({ id, order, title, summary, estimatedMinutes }));
}

/** A lesson as one language's list holds it (data/prayers/learning), with its neighbours by order. */
export type LessonLike = { id: string; order: number; title: string };

export type LessonPlace<L extends LessonLike> = {
  lesson: L;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  /** Every lesson in that language's order, so the last one can tell when all are read. */
  ids: string[];
};

export function lessonPlace<L extends LessonLike>(list: readonly L[], id: string): LessonPlace<L> | null {
  const ordered = [...list].sort((a, b) => a.order - b.order);
  const at = ordered.findIndex((l) => l.id === id);
  if (at < 0) return null;
  const near = (l: L | undefined) => (l ? { id: l.id, title: l.title } : null);
  return { lesson: ordered[at], prev: near(ordered[at - 1]), next: near(ordered[at + 1]), ids: ordered.map((l) => l.id) };
}
