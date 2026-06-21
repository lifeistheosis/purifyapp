// Shared chrome for every Theology surface: the "Theology" breadcrumb back to
// the hub and the mode switcher, over a consistent reading column. Each page
// supplies its own eyebrow/intro/body as children, so the four modes share a
// frame while keeping their distinct editorial identity below it.

import Link from "next/link";

import { TheologyNav } from "./TheologyNav";

export function TheologyShell({
  children,
  /** Hide the breadcrumb (the hub itself is the root, so it omits it). */
  isHub = false,
}: {
  children: React.ReactNode;
  isHub?: boolean;
}) {
  return (
    <section className="bg-night px-5 md:px-8 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[820px]">
        <div className="flex items-center gap-2 border-b border-paper/10 pb-4">
          {isHub ? (
            <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
              Theology
            </span>
          ) : (
            <Link
              href="/theology"
              className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55 hover:text-paper transition-colors"
            >
              Theology
            </Link>
          )}
        </div>

        <div className="mt-4">
          <TheologyNav />
        </div>

        <div className="mt-9 md:mt-12">{children}</div>
      </div>
    </section>
  );
}
