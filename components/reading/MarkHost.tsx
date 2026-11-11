import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { placeAttr, type MarkPlace } from "@/lib/marks/placeAttr";

/**
 * A paragraph the page draws itself, whose words a reader can mark (1.9, the
 * owner's word of 2026-11-10: "the same features that the Bible section has,
 * ensure that the other works also has"): a saint's life, a council's
 * document, a theology essay, a history page.
 *
 * It says where the paragraph's marks are kept and what a copy, a link and a
 * picture of its words carry; its child holds the words in one element
 * marked `data-mk-text`. Nothing here needs the device, so the page still
 * writes its own text once, on the server. The reader's marks are painted
 * over it afterwards (./MarksLayer.tsx), and the selection is the page's one
 * tool (./SelectionTools.tsx).
 */
export function MarkHost({
  place,
  cite,
  link,
  name,
  work,
  className,
  children,
}: {
  place: MarkPlace;
  /** Whose words and where, under a copy of them: "First Council of Nicaea, The Canons, Canon 6". */
  cite: string;
  /** The paragraph's own address, for the link. */
  link?: string;
  /** The name over a picture of the words. */
  name: string;
  /** The line under that name. */
  work?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-mk={placeAttr(place)}
      data-mk-layer=""
      data-mk-cite={cite}
      data-mk-link={link}
      data-mk-name={name}
      data-mk-work={work}
      // The app-wide hold-to-copy stands aside: a hold here selects the word under it.
      data-own-press=""
      // Its marks are painted behind its words, inside it.
      className={cn("relative isolate", className)}
    >
      {children}
    </div>
  );
}
