import { ExportLibrary } from "@/components/account/ExportLibrary";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

export const metadata = {
  title: "Export your library",
  description:
    "Download everything you have gathered on Purify: florilegia, notes, highlights, bookmarks, and diptychs.",
};

/*
 * Export your library, from Settings' Data row. On a phone it wears the bar
 * every screen under You wears from 1.8: the way back, and the screen's name
 * once its own heading has gone up under the bar. It wore the apps' plain
 * back bar until then, a chevron with no name over a "← Account" link to a
 * screen that was no longer where it came from.
 */
export default function ExportLibraryPage() {
  return (
    <>
      <MobileTopBar titleKey="settings.export" back backFallback="/settings" revealTitleOn="export-title" />
      <ExportLibrary />
    </>
  );
}
