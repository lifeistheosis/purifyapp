import type { ReactNode } from "react";

/**
 * Horizontal-scroll rail for browse intent (shelves of books, strips of
 * saints, etc.). Inset-edged so the cards bleed past the screen edge for
 * the "more off-screen" affordance.
 */
export function ShelfRow({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <section>
      {label && (
        <p className="font-sans text-[11px] uppercase tracking-[1.8px] text-paper/55 mb-2">
          {label}
        </p>
      )}
      <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
        <div className="flex gap-2.5">
          {children}
        </div>
      </div>
    </section>
  );
}
