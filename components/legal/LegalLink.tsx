"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LEGAL_HREF, type LegalDoc } from "@/lib/legal/docs";

import { LegalSheet, preloadLegal } from "./LegalSheet";

/**
 * A link to the Terms, the Privacy Policy or EIKON's shipping and returns,
 * wherever the app says you agree to them (build 90 note 1): the Google and
 * Apple notice, the sign-up form's box and the sign-up page's line, the
 * checkout's agreement in the cart and the buy bar, and both purchase sheets.
 *
 * It is an ordinary link to the page: it works without script, and on the
 * website a middle click or a modified click still opens the page. A tap
 * opens the text in a sheet over whatever asked (components/legal/
 * LegalSheet.tsx), and the reader stays where they were.
 * lib/legal/__tests__/legalSheet.test.ts holds every agreement to it.
 */
export function LegalLink({ doc, className, children }: { doc: LegalDoc; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Each opening is a new sheet, on this link's own document.
  const [opening, setOpening] = useState(0);
  // Its text, fetched once the page has settled, so the sheet rises with its
  // words (LegalSheet.tsx, preloadLegal); and at the first touch, for a tap
  // that comes sooner.
  useEffect(() => {
    const timer = setTimeout(() => preloadLegal(doc), 700);
    return () => clearTimeout(timer);
  }, [doc]);
  return (
    <>
      <Link
        href={LEGAL_HREF[doc]}
        prefetch={false}
        data-legal-link={doc}
        className={className}
        onPointerDown={() => preloadLegal(doc)}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          // Inside a label, a tap on the link does not tick the box (it is
          // the link's own); nothing above it should hear the tap either.
          e.stopPropagation();
          setOpening((n) => n + 1);
          setOpen(true);
        }}
      >
        {children}
      </Link>
      {/* The sheet is drawn on the page's root, but its taps travel back up
          the tree it was written in: a form, a card, a label or a sheet
          around the link must not hear them. Only catching what bubbles
          from inside, so presentation (jsx-a11y's own advice for this). */}
      <span
        role="presentation"
        className="contents"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <LegalSheet key={opening} doc={doc} open={open} onClose={() => setOpen(false)} />
      </span>
    </>
  );
}
