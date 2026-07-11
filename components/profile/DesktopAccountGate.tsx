"use client";

import Link from "next/link";
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
    <section className="hidden md:block px-8 py-24 bg-night min-h-[calc(100dvh-72px)]">
      <div className="mx-auto max-w-[820px] w-full">
        <div aria-hidden className="animate-pulse">
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
        {/* Progressive-enhancement door: the redirect above needs hydration,
            and a stale service-worker shell right after a deploy can stall
            it, leaving a signed-in user on this skeleton forever. A plain
            link works with no JavaScript at all. */}
        <p className="mt-8 text-center">
          <Link
            href="/account/profile"
            className="font-sans text-detail font-medium text-paper/60 underline underline-offset-4 hover:text-paper"
          >
            Taking too long? Open your profile →
          </Link>
        </p>
      </div>
    </section>
  );
}
