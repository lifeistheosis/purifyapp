import { JournalWritePage } from "@/components/journal/JournalWritePage";

export const metadata = {
  title: "Write in your journal",
  description: "A page of your own journal: a title, your words, Scripture and quotes from Purify's library.",
  // A reader's own page, written on their device: nothing here for a search engine.
  robots: { index: false, follow: false },
};

/*
 * Writing in the journal, as a page of its own (1.9, Fable round 3; build 97
 * note 2 and build 98 notes 4 and 5). A server shell for the metadata, and a
 * client body that reads the page being written from the device at runtime
 * (the journal's kept draft, or a kept page asked for by ?entry=), so it is
 * one static page in the native apps' export (AGENTS.md, the native pattern).
 * Its head, with the way back and Done, is the client's: it is the page's own
 * bar (lib/nav/backBar.ts, OWN_HEADER_PATTERNS).
 */
export default function JournalWrite() {
  return <JournalWritePage />;
}
