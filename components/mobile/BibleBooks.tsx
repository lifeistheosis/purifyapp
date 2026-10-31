"use client";

// The books on the phone's /bible: both Testaments as one list, in the
// Church's order (lib/bible/books.ts, bibleCanon), each under its name, as
// the chapter's books sheet draws them (components/bible/MobileChapterSheet).
// One tap target per book, in the tab's one row language (IndexRows.tsx).
//
// There was a switch over it until 1.8, Old Testament and New Testament,
// with the New on first and the choice kept on the device. The owner's note
// 65: "cut out the whole entire Old Testament and New Testament selectors
// and just go straight into the book when you click the Bible". His pick A
// of r3-20 did: the Bible tab opens the chapter itself, and this page stays
// as the whole list, for the website, for links and for the chapter's way
// back.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { bibleCanon } from "@/lib/bible/books";
import { IndexEyebrow, IndexList, IndexRow } from "./IndexRows";

export function BibleBooks() {
  const { t } = useTranslate();
  return (
    <div data-bible-books="">
      {bibleCanon().map(({ testament, categories }) => (
        <section key={testament} aria-labelledby={`bible-books-${testament}`}>
          <h2 id={`bible-books-${testament}`} className="px-1 pb-0.5 pt-5 font-heading text-[21px] font-bold leading-[1.2] text-paper">
            {t(testament === "OT" ? "bible.theOldTestament" : "bible.theNewTestament")}
          </h2>
          <div className="mt-3 space-y-6">
            {categories.map((cat) => (
              <section key={cat.label}>
                <IndexEyebrow>
                  {t(`bible.category.${cat.label.toLowerCase().replace(/ /g, "-")}`)}
                </IndexEyebrow>
                <IndexList>
                  {cat.books.map((b, i) => (
                    <IndexRow
                      key={b.slug}
                      first={i === 0}
                      href={`/bible/${b.slug}/1`}
                      left={t(`bible.books.${b.slug}`)}
                      right={`${b.chapters} ${t("bible.chAbbrev")}`}
                    />
                  ))}
                </IndexList>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
