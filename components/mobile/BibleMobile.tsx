import {
  readingsOn,
  startOfDayUtc,
  type ReadingRef,
} from "@/lib/calendar/orthodox";
import {
  getOldTestamentCategories,
  getNewTestamentCategories,
  type BookCategory,
} from "@/lib/bible/books";
import { getVerseOfDay } from "@/lib/today/verseOfDay";
import { MobileShell } from "./MobileShell";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobilePill, MobilePillRow } from "./MobilePill";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { BibleMobileContinue } from "./BibleMobileContinue";
import { BibleSearchTrigger } from "./BibleSearchOverlay";
import { VerseCardActions } from "@/components/today/VerseCardActions";
import { BookSpine, type SpineTint } from "./BookSpine";
import { ShelfRow } from "./ShelfRow";

/**
 * Bible mobile shell — "the library."
 *
 * Structure:
 *   1. Gospel-of-the-day hero card with 4-action footer.
 *   2. Inline "Continue reading" island (when localStorage carries a last
 *      chapter).
 *   3. Quick-jump pill row to common entry points.
 *   4. Shelves — one horizontal scroll rail per category, each book a
 *      coloured BookSpine. No more long vertical timeline of cards.
 *   5. Today's epistle and OT readings as small footer cards.
 *
 * Search is moved into a header trigger that opens a full-screen
 * overlay, so the body stays uncluttered.
 */

// Map each OT / NT category label to a spine tint so the user can read
// the testament/genre at a glance.
const TINT_BY_LABEL: Record<string, SpineTint> = {
  // OT
  "The Pentateuch": "pentateuch",
  "History": "history",
  "Wisdom": "wisdom",
  "Major Prophets": "majorProphets",
  "Minor Prophets": "minorProphets",
  "Deuterocanon": "deuterocanon",
  // NT
  "The Gospels": "gospel",
  "Acts": "acts",
  "Pauline Epistles": "paulineEpistle",
  "Catholic Epistles": "catholicEpistle",
  "Revelation": "revelation",
};

function tintFor(label: string): SpineTint {
  return TINT_BY_LABEL[label] ?? "history";
}

export async function BibleMobile() {
  const today = startOfDayUtc(new Date());
  const readings = readingsOn(today);
  const epistle = readings.find((r) => r.kind === "epistle");
  const ot = readings.find((r) => r.kind === "ot");

  const vod = await getVerseOfDay(today);
  const verseText = vod.passage?.verses
    .map((v) => v.text.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const otCats = getOldTestamentCategories();
  const ntCats = getNewTestamentCategories();

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
      header={<MobileHeader title="Bible" trailing={<BibleSearchTrigger />} />}
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

      <div className="mt-7">
        <MobileSectionLabel>New Testament</MobileSectionLabel>
        <div className="space-y-4">
          {ntCats.map((cat) => (
            <Shelf key={cat.label} cat={cat} />
          ))}
        </div>
      </div>

      <div className="mt-7">
        <MobileSectionLabel>Old Testament — Septuagint</MobileSectionLabel>
        <div className="space-y-4">
          {otCats.map((cat) => (
            <Shelf key={cat.label} cat={cat} />
          ))}
        </div>
      </div>

      {(epistle || ot) && (
        <div className="mt-7">
          <MobileSectionLabel>Also appointed today</MobileSectionLabel>
          <div className="space-y-3">
            {epistle && (
              <ReadingMobileCard label="Today's Epistle" reading={epistle} />
            )}
            {ot && (
              <ReadingMobileCard label="Old Testament reading" reading={ot} />
            )}
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function Shelf({ cat }: { cat: BookCategory }) {
  return (
    <ShelfRow label={cat.label}>
      {cat.books.map((b) => (
        <BookSpine
          key={b.slug}
          href={`/bible/${b.slug}/1`}
          name={b.name}
          chapters={b.chapters}
          tint={tintFor(cat.label)}
        />
      ))}
    </ShelfRow>
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
        Read passage →
      </p>
    </MobileCard>
  );
}
