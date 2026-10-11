import {
  getOldTestamentCategories,
  getNewTestamentCategories,
} from "@/lib/bible/books";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { SectionMasthead } from "./SectionMasthead";
import { BibleMobileContinue } from "./BibleMobileContinue";
import { BibleStudyLinks } from "@/components/bible/BibleStudyLinks";
import { BibleTabs } from "./BibleTabs";
import { BibleAppointedToday } from "./BibleAppointedToday";
import { T } from "@/components/i18n/T";

/**
 * Bible mobile shell — minimal book selector.
 *
 *   1. Header. Its magnifier is the app-wide search, which opens a typed
 *      reference since 1.6. Until then this tab carried a second magnifier
 *      beside it for a Bible-only search: two of the same icon, side by
 *      side, each opening a different box.
 *   2. Continue reading island (only when localStorage has a last chapter).
 *   3. Today's appointed-readings strip (one quiet line, optional).
 *   4. Segmented Old/New Testament tabs.
 *   5. Categorised vertical list of books — single tappable row per book.
 *
 * No hero feed card, no horizontal shelves of book spines, no coloured
 * chips. The page is a library index, nothing more.
 *
 * The appointed readings live in a CLIENT child on purpose. This component
 * used to compute them here with `startOfDayUtc(new Date())`, which under
 * `output: "export"` froze them at build time; see BibleAppointedToday.
 * Do not move that back up here. The book categories below are static and
 * are correctly resolved on the server.
 */
export function BibleMobile() {
  const otCats = getOldTestamentCategories();
  const ntCats = getNewTestamentCategories();

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.bible" />}
      eyebrow={<T k="saints.read" />}
    >
      {/* Codex Sinaiticus: the Greek uncial behind the text being read. */}
      <SectionMasthead section="bible" />

      <BibleMobileContinue />
      <BibleStudyLinks className="mt-4 justify-start px-5" />

      <BibleAppointedToday />

      <div className="mt-6">
        <BibleTabs ot={otCats} nt={ntCats} />
      </div>
    </MobileShell>
  );
}
