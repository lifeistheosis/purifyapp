import type { ReactNode } from "react";

import type { Saint } from "@/lib/saints/saints";
import { FeastDays } from "./FeastDays";
import { T } from "@/components/i18n/T";

/**
 * A saint at a glance, on a phone and a tablet: born, reposed, his see, and
 * every feast day, written on the device in the reader's language. The line
 * under his name gives the first feast day only (SaintHero); the rest are
 * here. A computer's study rail shows the same list (SaintStudyRail), so this
 * one steps aside there.
 */
export function SaintFacts({ saint }: { saint: Pick<Saint, "born" | "reposed" | "see" | "feastDays"> }) {
  const facts: { labelKey: string; value: ReactNode }[] = [];
  if (saint.born) facts.push({ labelKey: "saints.born", value: saint.born });
  if (saint.reposed) facts.push({ labelKey: "saints.reposed", value: saint.reposed });
  if (saint.see) facts.push({ labelKey: "saints.see", value: saint.see });
  if (saint.feastDays.length) facts.push({ labelKey: "saints.feastLabel", value: <FeastDays days={saint.feastDays} /> });
  if (facts.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:hidden">
      {facts.map((f) => (
        <div key={f.labelKey} className="min-w-0">
          <dt className="font-sans text-caption text-paper/55">
            <T k={f.labelKey} />
          </dt>
          <dd className="mt-0.5 font-sans text-ui leading-snug text-paper/90">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
