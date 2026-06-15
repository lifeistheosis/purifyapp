import Link from "next/link";

/**
 * Mobile top bar for the Today shell.
 *
 * The Today / Calendar text tabs were removed — the bottom tab bar already
 * carries navigation, and the greeting block below the bar opens the
 * surface. What remains is a quiet right cluster: a bell linking to
 * /whats-new and a circular avatar slot. No streak counter — prayer life is
 * not scored back to the user.
 */
export function MobileTopTabs({ avatar }: { avatar: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-night/95 backdrop-blur-sm border-b border-paper/8">
      <div className="flex items-center justify-end gap-3 px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-2">
        <Link
          href="/whats-new"
          aria-label="What's new"
          className="text-paper/75 hover:text-paper transition-colors"
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
        </Link>
        <div className="ml-1">{avatar}</div>
      </div>
    </header>
  );
}
