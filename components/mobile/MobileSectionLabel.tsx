/**
 * Small-caps eyebrow used between groups of cards on a single mobile tab.
 * Mirrors the "Daily Refresh" label on the Today shell, but lives inline
 * with the timeline so it can section off a longer feed.
 */
export function MobileSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-caption text-paper/55 mb-3 mt-2">
      {children}
    </p>
  );
}
