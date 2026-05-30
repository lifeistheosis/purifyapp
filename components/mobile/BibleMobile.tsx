import Link from "next/link";
import {
  readingsOn,
  startOfDayUtc,
  type ReadingRef,
} from "@/lib/calendar/orthodox";
import {
  getOldTestamentCategories,
  getNewTestamentCategories,
} from "@/lib/bible/books";
import { MobileShell } from "./MobileShell";
import { MobileTimeline } from "./MobileTimeline";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { BibleSearch } from "@/components/bible/BibleSearch";
import { BibleMobileContinue } from "./BibleMobileContinue";

/**
 * Mobile-only Bible shell. Replaces the desktop hero on `< md`.
 *
 * Cards in order:
 *   - Search (the inline reader-search that the desktop page also carries)
 *   - Continue reading (last book + chapter from localStorage; client island)
 *   - Today's Gospel
 *   - Today's Epistle
 *   - Old Testament reading (when appointed)
 *   - Browse by Testament (links into OT and NT category pages)
 */
export function BibleMobile() {
  const today = startOfDayUtc(new Date());
  const readings = readingsOn(today);
  const gospel = readings.find((r) => r.kind === "gospel");
  const epistle = readings.find((r) => r.kind === "epistle");
  const ot = readings.find((r) => r.kind === "ot");

  const otCats = getOldTestamentCategories();
  const ntCats = getNewTestamentCategories();
  const otBookCount = otCats.reduce((n, c) => n + c.books.length, 0);
  const ntBookCount = ntCats.reduce((n, c) => n + c.books.length, 0);

  return (
    <MobileShell
      header={
        <MobileHeader
          title="Bible"
          trailing={<UserAvatarSmall />}
        />
      }
      eyebrow="Today in Scripture"
    >
      <MobileTimeline>
        {[
          <MobileCard key="search" eyebrow="Search">
            <div className="mt-2">
              <BibleSearch />
            </div>
            <p className="mt-2 font-sans italic text-[11.5px] text-paper/45">
              Try: &lsquo;John 3:16&rsquo; · &lsquo;1 Cor 13&rsquo; · &lsquo;Psalm 23&rsquo;
            </p>
          </MobileCard>,
          <BibleMobileContinue key="continue" />,
          gospel ? (
            <ReadingMobileCard key="gospel" label="Today's Gospel" reading={gospel} tint="warm" />
          ) : null,
          epistle ? (
            <ReadingMobileCard key="epistle" label="Today's Epistle" reading={epistle} />
          ) : null,
          ot ? (
            <ReadingMobileCard key="ot" label="Old Testament reading" reading={ot} />
          ) : null,
          <MobileCard
            key="ot-browse"
            eyebrow="Old Testament"
            title={`${otBookCount} books, Septuagint`}
            href="/bible#ot"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Brenton's Septuagint of 1851 — the Greek text the Church has
              read since the apostles. Includes the deuterocanonical books.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Browse OT →
            </p>
          </MobileCard>,
          <MobileCard
            key="nt-browse"
            eyebrow="New Testament"
            title={`${ntBookCount} books, King James`}
            href="/bible#nt"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              King James of 1611, traditional English wording. Cross-references
              and book introductions throughout.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Browse NT →
            </p>
          </MobileCard>,
          <MobileCard
            key="psalter"
            eyebrow="The Psalter"
            title="Pray the Psalms"
            href="/bible/psalms/1"
            tint="gold"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              All one hundred fifty Psalms in the Septuagint numbering, the
              prayer book of the Church.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open Psalm 1 →
            </p>
          </MobileCard>,
        ].filter(Boolean) as React.ReactNode[]}
      </MobileTimeline>
    </MobileShell>
  );
}

function ReadingMobileCard({
  label,
  reading,
  tint = "default",
}: {
  label: string;
  reading: ReadingRef;
  tint?: "default" | "warm" | "gold";
}) {
  return (
    <MobileCard
      eyebrow={label}
      title={reading.label}
      href={`/bible/${reading.book}/${reading.chapter}#v${reading.from}`}
      tint={tint}
    >
      <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
        Read passage →
      </p>
    </MobileCard>
  );
}
