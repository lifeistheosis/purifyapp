"use client";

// The prayer book's search field, at the top of /prayers and of the Prayers
// tab: the door to the one search, turned to Prayers (1.8, the owner's pick
// of r3-12, "C, with the mix of B").
//
// Honors MosesLOL @cloudw_w:
//   "There is many prayers for different things, we can't just scroll
//    till we find it, we should be able to search for it." (2_yes×2)
//
// Until 1.8 the field filtered the page in place over a list of its own. The
// one search holds the same things behind the Prayers door, each by the name
// the prayer book gives it in the reader's language (lib/search/
// buildCorpus.ts): the daily and devotional rules, the Hours, the akathists,
// Learn to pray, Today's prayer, the chants and the Anthem among them; the
// door's strip narrows to the prayer book, the akathists, the chants or the
// lessons. The page itself is always shown under the field now.

import { SearchDoor } from "@/components/search/SearchField";

export function PrayerSearch({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <SearchDoor place="prayers" placeholderKey="search.open" />
      {children}
    </div>
  );
}
