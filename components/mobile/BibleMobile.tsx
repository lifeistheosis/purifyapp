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
import { getVerseOfDay } from "@/lib/today/verseOfDay";
import { MobileShell } from "./MobileShell";
import { MobileTimeline } from "./MobileTimeline";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobilePill, MobilePillRow } from "./MobilePill";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { BibleSearch } from "@/components/bible/BibleSearch";
import { BibleMobileContinue } from "./BibleMobileContinue";
import { VerseCardActions } from "@/components/today/VerseCardActions";

/**
 * Bible mobile shell, reworked to match the Today aesthetic with a
 * Gospel-led hero card up top. The hero shows the day's appointed
 * Gospel reading (or the curated rotation fallback) with the same
 * 4-action footer used on Today (favourite, share, more, expand).
 *
 * Below the hero: a "Continue reading" pill row (when localStorage has
 * a last-chapter record), a search card, quick-jump pills to common
 * entry points, the day's other appointed readings, and the OT/NT
 * browse cards plus a footer for the Psalter.
 *
 * All verse text loads from Purify's public-domain Bible (Brenton
 * Septuagint + KJV) via lib/bible/load.ts.
 */
export async function BibleMobile() {
  const today = startOfDayUtc(new Date());
  const readings = readingsOn(today);
  const epistle = readings.find((r) => r.kind === "epistle");
  const ot = readings.find((r) => r.kind === "ot");

  // The hero text uses the same resolver Today uses: today's appointed
  // Gospel first, then Epistle / OT, then the curated rotation. This
  // keeps the Bible hero and the Today hero in sync.
  const vod = await getVerseOfDay(today);
  const verseText = vod.passage?.verses
    .map((v) => v.text.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const otCats = getOldTestamentCategories();
  const ntCats = getNewTestamentCategories();
  const otBookCount = otCats.reduce((n, c) => n + c.books.length, 0);
  const ntBookCount = ntCats.reduce((n, c) => n + c.books.length, 0);

  const heroEyebrow =
    vod.source === "gospel"
      ? "Today's Gospel"
      : vod.source === "epistle"
      ? "Today's Epistle"
      : vod.source === "ot"
      ? "Today's Old Testament reading"
      : "Verse of the Day";

  return (
    <MobileShell
      header={<MobileHeader title="Bible" trailing={<UserAvatarSmall />} />}
      eyebrow="Today in Scripture"
    >
      <MobileHeroCard
        tint="warm"
        eyebrow={heroEyebrow}
        kicker={vod.ref.label}
        headline={
          verseText ? (
            <span className="block">{verseText}</span>
          ) : (
            <span className="italic text-paper/45">Loading…</span>
          )
        }
        bodyFades
        actions={
          <VerseCardActions
            refLabel={vod.ref.label}
            href={vod.href}
            shareText={verseText ?? vod.ref.label}
            shareUrl={vod.href}
            book={vod.ref.book}
            chapter={vod.ref.chapter}
            verse={vod.ref.from}
          />
        }
      />

      <div className="mt-5">
        <BibleMobileContinue />
      </div>

      <div className="mt-5">
        <MobileSectionLabel>Jump to a chapter</MobileSectionLabel>
        <MobilePillRow>
          <MobilePill href="/bible/john/1">Gospel of John</MobilePill>
          <MobilePill href="/bible/psalms/1">Psalms</MobilePill>
          <MobilePill href="/bible/genesis/1">Genesis</MobilePill>
          <MobilePill href="/bible/romans/1">Romans</MobilePill>
          <MobilePill href="/bible/1-corinthians/13">1 Cor 13</MobilePill>
          <MobilePill href="/bible/revelation/1">Revelation</MobilePill>
        </MobilePillRow>
      </div>

      <div className="mt-6">
        <MobileSectionLabel>Browse the canon</MobileSectionLabel>
        <MobileTimeline>
          {[
            <MobileCard key="search" eyebrow="Search">
              <div className="mt-2">
                <BibleSearch />
              </div>
              <p className="mt-2 font-sans italic text-[11.5px] text-paper/45">
                Try: &lsquo;John 3:16&rsquo; &middot; &lsquo;1 Cor 13&rsquo; &middot; &lsquo;Psalm 23&rsquo;
              </p>
            </MobileCard>,
            epistle ? (
              <ReadingMobileCard
                key="epistle"
                label="Today's Epistle"
                reading={epistle}
              />
            ) : null,
            ot ? (
              <ReadingMobileCard
                key="ot"
                label="Old Testament reading"
                reading={ot}
              />
            ) : null,
            <MobileCard
              key="ot-browse"
              eyebrow="Old Testament"
              title={`${otBookCount} books, Septuagint`}
              href="/bible#ot"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                Brenton&rsquo;s Septuagint of 1851, the Greek text the Church has
                read since the apostles. Includes the deuterocanonical books.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Browse OT &rarr;
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
                Browse NT &rarr;
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
                Open Psalm 1 &rarr;
              </p>
            </MobileCard>,
          ].filter(Boolean) as React.ReactNode[]}
        </MobileTimeline>
      </div>
    </MobileShell>
  );
}

function ReadingMobileCard({
  label,
  reading,
}: {
  label: string;
  reading: ReadingRef;
}) {
  return (
    <MobileCard
      eyebrow={label}
      title={reading.label}
      href={`/bible/${reading.book}/${reading.chapter}#v${reading.from}`}
    >
      <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
        Read passage &rarr;
      </p>
    </MobileCard>
  );
}
