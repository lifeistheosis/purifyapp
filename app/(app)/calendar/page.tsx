import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = { title: "Orthodox Calendar - Purify" };

const calendarTypes = [
  { key: "new", label: "New Calendar (Revised Julian)" },
  { key: "old", label: "Old Calendar (Julian)" },
  { key: "jerusalem", label: "Jerusalem Patriarchate" },
];

export default function CalendarPage() {
  return (
    <FeatureShell
      eyebrow="Liturgical year"
      title="Orthodox Calendar"
      body="Feasts, fasts, and saints of the day. Choose your calendar - we support multiple traditions."
      tierBadge="Free"
    >
      <div className="flex flex-wrap gap-3">
        {calendarTypes.map((c) => (
          <span
            key={c.key}
            className="rounded-pill border border-paper/15 bg-paper/[0.04] px-5 py-3 font-sans text-[14px] text-paper/85"
          >
            {c.label}
          </span>
        ))}
      </div>
    </FeatureShell>
  );
}
