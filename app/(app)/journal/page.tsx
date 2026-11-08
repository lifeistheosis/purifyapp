import { JournalClient } from "@/components/journal/JournalClient";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

export const metadata = {
  title: "Your journal",
  description:
    "Your own journal, by the Church's day: pages with Scripture, your own quotes and highlights, and the notes you write on verses.",
};

/*
 * The journal (2026-09-30; on phones 1.7, the owner's note 23): a server
 * shell for the metadata and the phone's bar, and a client body that reads
 * the reader's entries, notes and entitlement at runtime, so it works the
 * same in the native apps (AGENTS.md, the native pattern). The heading is
 * the client's, which also puts the Write button at its end on a computer.
 */
export default function JournalPage() {
  return (
    <>
      <MobileTopBar titleKey="journal.title" back backFallback="/bible" revealTitleOn="journal-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="journal-title">
        {/* Wide enough on a computer for the notebooks at the side and the
            page in its column of 720px (1.9, JOURNAL.md); the journal keeps
            to one column of 760px when there are no notebooks. */}
        <div className="mx-auto w-full max-w-[1000px]">
          <JournalClient />
        </div>
      </section>
    </>
  );
}
