import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The frame for an admin page that lives at its own URL rather than as a
 * tab inside AdminShell: /admin/shop and its two form pages.
 *
 * `.adm` is what makes the admin theme apply. app/admin/layout.tsx sets the
 * data-adm-theme attribute and imports the stylesheet, but every token in
 * admin-theme.css is scoped under .adm, which AdminShell puts on its own
 * root. A page outside the shell has to put it there itself or it renders
 * in the reader's palette with white text on white cards in light mode.
 *
 * Phone first. The content column is capped at 720px because these pages
 * are a form and a list, and a form wider than that is a form with fields
 * the eye has to travel to.
 */
export function AdminSubpage({
  title,
  eyebrow,
  back,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  /** Where the back link goes and what it says. */
  back: { href: string; label: string };
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="adm min-h-[100dvh]" style={{ background: "var(--adm-bg)", color: "var(--adm-ink)" }}>
      <div className="mx-auto w-full max-w-[720px] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-8">
        <Link
          href={back.href}
          className="inline-flex min-h-[44px] items-center gap-1.5 font-sans text-[12.5px] font-medium"
          style={{ color: "var(--adm-ink-2)" }}
        >
          <span aria-hidden>←</span> {back.label}
        </Link>
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {eyebrow ? (
              <p className="font-sans text-[11.5px] uppercase tracking-[1.2px]" style={{ color: "var(--adm-ink-3)" }}>
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-sans text-[22px] font-semibold leading-tight" style={{ color: "var(--adm-ink)" }}>
              {title}
            </h1>
          </div>
          {action}
        </header>
        {children}
      </div>
    </div>
  );
}
