import type { ReactNode } from "react";

/**
 * Desktop reading shell for content/study surfaces. Keeps the main column at
 * a comfortable reading measure and fills what would otherwise be empty
 * right-hand gutter on laptops with a sticky study rail.
 *
 * Below `lg` the rail is hidden and the page renders as a single column, so
 * callers should keep their in-flow rail content (facts, feasts, etc.)
 * visible on small screens and mark it `lg:hidden` where the rail repeats it.
 */
export function ContentShell({
  children,
  rail,
}: {
  children: ReactNode;
  rail?: ReactNode;
}) {
  if (!rail) {
    return <div className="min-w-0">{children}</div>;
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-12 xl:gap-16">
      <div className="min-w-0">{children}</div>
      <aside className="hidden lg:block">
        <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto scrollbar-thin pb-8">
          {rail}
        </div>
      </aside>
    </div>
  );
}
