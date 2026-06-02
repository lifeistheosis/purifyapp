"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Signed-in `/account` serves the native mobile shell (YouMobile) on
 * phones, but on desktop the canonical home is the fuller dashboard at
 * `/account/profile`. Since a server redirect can't branch on viewport,
 * this client gate redirects only when the viewport is `md+`. On mobile
 * it no-ops (and is `hidden md:block`, so it never paints there).
 *
 * The skeleton below shows for the split-second before the desktop
 * redirect lands, so signed-in desktop users never see a flash of the
 * mobile layout.
 */
export function DesktopAccountGate() {
  const router = useRouter();

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      router.replace("/account/profile");
    }
  }, [router]);

  return (
    <section
      aria-hidden
      className="hidden md:block px-8 py-24 bg-night min-h-[calc(100dvh-72px)]"
    >
      <div className="mx-auto max-w-[820px] w-full animate-pulse">
        <div className="h-32 rounded-lg border border-paper/10 bg-paper/[0.03]" />
        <div className="mt-8 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-md border border-paper/10 bg-paper/[0.03]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
