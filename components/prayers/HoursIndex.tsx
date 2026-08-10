"use client";

// The Hours index, with the Hour the clock is actually in marked.
//
// A reader opens /prayers/hours with one question: which Hour is mine right
// now. The answer was already computed and shown nowhere. currentHourSlug has
// sat in lib/prayers/hours.ts with zero callers since it was written, and the
// file's own header claims "used by the /prayers landing page to highlight
// which Hour the day is closest to", which was not true of any page. Five
// identical rows, distinguished only by a flat clock time the reader had to
// compare against their own watch.
//
// CLIENT, AND THE CLOCK IS READ AFTER MOUNT. This page ships into the static
// export. Reading `new Date()` during render would bake the build hour into
// the APK and mark the same Hour for the life of the install, which is the
// trap documented at length in components/today/ChurchTodayRail.tsx and
// lib/calendar/useToday.ts. The gate below is the TodayHourRule pattern.
//
// The mark is a word, not a colour. CONTRIBUTING.md: colour is never the only
// signal. It is also not a count, a streak or a nudge to pray: it states
// which Hour the day is in and stops there, per the RhythmRow doctrine and
// voice.md's rule about stopping when the thought is complete.

import { useEffect, useState } from "react";
import { currentHourSlug, type HourMeta } from "@/lib/prayers/hours";
import { PrayerIndex, PrayerIndexRow } from "@/components/prayers/PrayerBook";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function HoursIndex({ hours }: { hours: HourMeta[] }) {
  const { t } = useTranslate();
  const [nowSlug, setNowSlug] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate, the TodayHourRule precedent: the clock is client-only, and a
     server render of it bakes the build hour into the Android export. */
  useEffect(() => {
    setNowSlug(currentHourSlug(new Date().getHours()));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <PrayerIndex>
      {hours.map((h) => {
        const isNow = nowSlug === h.slug;
        return (
          <PrayerIndexRow
            key={h.slug}
            href={`/prayers/hours/${h.slug}`}
            title={
              isNow ? (
                <>
                  {h.title}{" "}
                  <span className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-gold/85">
                    {t("prayers.hoursIndex.nowMark")}
                  </span>
                </>
              ) : (
                h.title
              )
            }
            description={h.subtitle}
            // Before hydration nowSlug is null and every row reads exactly as
            // it does today, so nothing moves when the answer arrives.
            meta={`${h.approxHour}:00`}
          />
        );
      })}
    </PrayerIndex>
  );
}
