"use client";

import { SearchDoor } from "@/components/search/SearchField";

/**
 * The Bible's search field: the door to the one search, turned to the Bible
 * (1.8, the owner's pick of r3-12, "C, with the mix of B").
 *
 * Until 1.8 this was a search of its own: a dropdown under the field on a
 * computer, and from 1.7.1 a screen of its own on a phone and a tablet. Both
 * are the one search now, and nothing it found is lost there: a book by its
 * name in the reader's language or by its abbreviation ("mt", "1 cor"), a
 * passage known by its name (Susanna), a chapter, a verse and a range
 * ("john 3", "john 3:16", "james 2:14-26"), several at once parted by a comma
 * or a semicolon (the multi-reference page), and the psalm by the number most
 * Bibles give it (lib/search/references.ts, read by
 * components/search/CommandPalette.tsx). Opened from here it starts on the
 * Bible's door, with the Bible's own line on what can be typed.
 *
 * `layer` is the field in the reader's ••• sheet
 * (components/bible/ReaderMoreSheet.tsx), and `onNavigate` closes that sheet
 * as the search opens, so nothing is left under the search when it closes.
 */
export function BibleSearch({
  className,
  layer = false,
  onNavigate,
}: {
  className?: string;
  /** The field in the reader's ••• sheet. */
  layer?: boolean;
  /** Called as the search opens: the sheet it stood in closes. */
  onNavigate?: () => void;
}) {
  const door = (
    <SearchDoor place="bible" placeholderKey="bible.searchAria" onOpen={onNavigate} className={layer ? undefined : className} />
  );
  // In the ••• sheet it keeps the mark the walk finds it by.
  return layer ? (
    <div data-bible-search-open="" className={className}>
      {door}
    </div>
  ) : (
    door
  );
}
