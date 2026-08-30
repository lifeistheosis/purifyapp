import Link from "next/link";
import { T } from "@/components/i18n/T";

/**
 * Minimal centered shell for sign-in / sign-up / forgot / reset /
 * set-password. No AppNav, no Footer, just a brand mark and a
 * single small footer link to /privacy. Lives in its own route
 * group `(auth)` so the in-app chrome doesn't compose over it.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-night">
      <header
        // The only top-level layout in the app with no top inset. The root
        // layout sets viewportFit: "cover" and black-translucent, and the
        // native shell runs edge to edge, so the Purify wordmark and the
        // Privacy link started 20px from the TRUE top and landed under the
        // notch. The (app) group gets its inset from .safe-pt; this group
        // never had an equivalent. Also hits the installed iOS PWA.
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
        className="px-6 pb-5 flex items-center justify-between"
      >
        <Link
          href="/"
          className="font-sans text-lede font-bold tracking-[-0.01em] text-paper hover:text-paper/80 transition-colors"
        >
          Purify
        </Link>
        <Link
          href="/privacy"
          className="font-sans text-caption text-paper/55 hover:text-paper transition-colors"
        >
          <T k="footer.privacy" />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
      <footer className="px-6 py-5 text-center font-serif italic text-caption text-paper/45">
        <T k="footer.glory" />
      </footer>
    </div>
  );
}
