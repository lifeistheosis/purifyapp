import Link from "next/link";

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
      <header className="px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="font-sans text-[18px] font-bold tracking-[-0.01em] text-paper hover:text-paper/80 transition-colors"
        >
          Purify
        </Link>
        <Link
          href="/privacy"
          className="font-sans text-[12px] text-paper/55 hover:text-paper transition-colors"
        >
          Privacy
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
      <footer className="px-6 py-5 text-center font-serif italic text-[12.5px] text-paper/45">
        Glory to God for all things.
      </footer>
    </div>
  );
}
