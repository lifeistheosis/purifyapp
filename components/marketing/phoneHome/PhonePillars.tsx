import Image from "next/image";
import type { ReactNode } from "react";

import { T } from "@/components/i18n/T";

/**
 * What is inside, on a phone: the four pillars the desktop shows as large
 * pictures, here as one list, each with its picture, its name and a line on
 * what it holds. The September page kept only the names, and the owner's
 * word for the result was "a bad shadow of what we had before"; the line is
 * what the name alone did not say.
 *
 * Words through <T>, so the list follows the reader's language. Nothing here
 * moves: the page's one moving thing is the phones.
 */
export function PhonePillars() {
  return (
    <section aria-labelledby="phone-pillars-title" className="px-5 pb-2 pt-14">
      <h2
        id="phone-pillars-title"
        className="text-balance text-[clamp(26px,7vw,30px)] leading-[1.12] tracking-[-0.02em] text-paper"
      >
        <T k="home.fourPillars" />
      </h2>
      <ul className="mt-7 border-t border-paper/10">
        <Pillar
          icon="/fathers_widget_v2.png"
          title={<T k="home.pillars.fathers.title" />}
          body={<T k="home.pillars.fathers.body" />}
        />
        <Pillar
          icon="/saint_widget_v2.png"
          title={<T k="home.pillars.saints.title" />}
          body={<T k="home.pillars.saints.body" />}
        />
        <Pillar
          icon="/calendar_widget_v2.png"
          title={<T k="home.pillars.calendar.title" />}
          body={<T k="home.pillars.calendar.body" />}
        />
        <Pillar
          icon="/pray_widget_v2.png"
          title={<T k="home.pillars.prayer.title" />}
          body={<T k="home.pillars.prayer.body" />}
        />
      </ul>
    </section>
  );
}

function Pillar({ icon, title, body }: { icon: string; title: ReactNode; body: ReactNode }) {
  return (
    <li className="flex items-start gap-4 border-b border-paper/10 py-5">
      <Image src={icon} alt="" width={56} height={56} className="lm-invert h-14 w-14 shrink-0 object-contain" />
      <div className="min-w-0 pt-1">
        <h3 className="text-[19px] leading-snug tracking-[-0.01em] text-paper">{title}</h3>
        <p className="mt-1.5 text-pretty font-sans text-[15px] leading-[1.55] text-paper/68">{body}</p>
      </div>
    </li>
  );
}
