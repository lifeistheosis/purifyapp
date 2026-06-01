/**
 * iOS-calendar-widget date chip. Stacked big-number day + small month
 * label. Lives in the corner of the Discover hero (passed in the `aside`
 * slot of MobileHeroCard).
 */
export function DayBadge({ date }: { date: Date }) {
  const day = date.getUTCDate();
  const month = date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return (
    <div
      className="flex flex-col items-center justify-center h-14 w-14 rounded-md border border-paper/15 bg-night/60 backdrop-blur-sm"
      aria-label={`${month} ${day}`}
    >
      <span className="font-sans text-eyebrow uppercase tracking-[1.5px] text-crimson font-semibold leading-none mt-1">
        {month}
      </span>
      <span className="font-sans text-title-sm font-bold tabular-nums text-paper leading-none mt-0.5">
        {day}
      </span>
    </div>
  );
}
