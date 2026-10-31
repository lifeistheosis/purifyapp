"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { Church } from "@/components/ui/icons/Church";
import { Cross } from "@/components/ui/icons/Cross";
import { Scroll } from "@/components/ui/icons/Scroll";
import { withAt, withRead, type PathProgress, type PathRead, type ReadKind } from "@/lib/theology/path";
import { updatePathProgress } from "@/lib/theology/usePathProgress";

/**
 * A read on Theology's path, as the hub and a step show it (1.8, round 3
 * r3-13): its kind by the glyph the four ways already wear (the question a
 * book, a study the cross, an error the scroll, a council the church), and
 * the one thing under its title, each from the reader's own catalog.
 */

export function KindIcon({ kind, size }: { kind: ReadKind; size: number }) {
  if (kind === "question") return <Book size={size} />;
  if (kind === "study") return <Cross size={size} />;
  if (kind === "error") return <Scroll size={size} />;
  return <Church size={size} />;
}

/**
 * Under a read's title: how many of the Fathers a question cites; a study's
 * length, or the part the reader is in while it is begun; an error's
 * century; a council's year.
 */
export function ReadMeta({ read, progress }: { read: PathRead; progress: PathProgress }) {
  const { t, tn } = useTranslate();
  if (read.kind === "question") return <>{tn("topics.citations", read.citations ?? 0)}</>;
  if (read.kind === "study") {
    const slug = read.id.slice(2);
    const reached = progress.parts[slug] ?? 0;
    if (read.parts && reached > 0 && reached < read.parts && !progress.read.includes(read.id)) {
      return <>{t("paths.part", { n: reached, total: read.parts })}</>;
    }
    return read.minutes ? <>{t("bible.minRead", { minutes: read.minutes })}</> : null;
  }
  if (read.kind === "error") return read.era ? <span lang="en">{read.era}</span> : null;
  return read.year ? <>{read.year}</> : null;
}

/**
 * A read opened from the path: the step is where the reader is, and a
 * question, an error or a council counts as read once opened. A study counts
 * once it is read to its end (components/theology/StudyReader.tsx).
 */
export function noteOpened(read: Pick<PathRead, "id" | "kind">, stepId: string): void {
  updatePathProgress((p) => withAt(read.kind === "study" ? p : withRead(p, read.id), stepId));
}
