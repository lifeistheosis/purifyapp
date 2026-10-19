"use client";

// Export your library: everything gathered on this device, as a readable
// Markdown copy or a full JSON backup.
//
// Drawn as the phone screens under You are from 1.8: the page's own heading
// under the bar its page mounts (app/(app)/account/export/page.tsx), what is
// about to be taken as one rounded list, and the two downloads. It was a
// "← Account" link over a heading in the display serif, four tiles of a big
// number over a small word, and two buttons in the display serif.

import { useEffect, useState } from "react";

import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import {
  gatherLibrary,
  librarySummary,
  toJson,
  toMarkdown,
  type LibraryData,
} from "@/lib/library/exportLibrary";
import { useTranslate } from "@/components/i18n/MessagesProvider";

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportLibrary() {
  const { t } = useTranslate();
  const [data, setData] = useState<LibraryData | null>(null);

  useEffect(() => {
    // Reads localStorage, so it must run on the client after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(gatherLibrary());
  }, []);

  const summary = data ? librarySummary(data) : null;
  const stamp = new Date().toISOString().slice(0, 10);
  const empty =
    summary != null &&
    summary.florilegia === 0 &&
    summary.bookmarks === 0 &&
    summary.names === 0 &&
    summary.notes === 0;

  const counts: [label: string, value: number][] = summary
    ? [
        [t("ui.bookmarks"), summary.bookmarks],
        [t("saints.notes"), summary.notes],
        [t("ui.florilegia"), summary.florilegia],
        [t("ui.gatheredLines"), summary.gatheredLines],
        [t("ui.names"), summary.names],
      ]
    : [];

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="export-title">
      <div className="mx-auto w-full max-w-[560px]">
        <h1 id="export-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper">
          {t("ui.exportYourLibrary")}
        </h1>
        <p className="mt-2 font-sans text-detail leading-[1.6] text-paper/55">
          {t("ui.everythingYouHaveGatheredOn")}
        </p>

        {summary ? (
          <dl className={`mt-7 ${INDEX_LIST_LOOK}`}>
            {counts.map(([label, value], i) => (
              <div key={label} className={`flex items-center justify-between gap-4 px-4 py-3${i ? " border-t border-paper/[0.06]" : ""}`}>
                <dt className="font-sans text-ui text-paper/75">{label}</dt>
                <dd className="font-sans text-ui tabular-nums text-paper">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-7 font-sans text-ui text-paper/40">{t("ui.gathering")}</p>
        )}

        {empty ? (
          <p className="mt-6 font-sans text-ui leading-[1.6] text-paper/60">
            {t("ui.youHaveNotGatheredAnything")}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={!data || empty}
            onClick={() =>
              data &&
              download(`purify-library-${stamp}.md`, toMarkdown(data), "text/markdown")
            }
            className="tap-press inline-flex h-12 flex-1 items-center justify-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night motion-safe:transition-colors hover:bg-paper/90 disabled:opacity-40"
          >
            {t("ui.downloadMarkdown")}
          </button>
          <button
            type="button"
            disabled={!data || empty}
            onClick={() =>
              data &&
              download(`purify-library-${stamp}.json`, toJson(data), "application/json")
            }
            className="tap-press inline-flex h-12 flex-1 items-center justify-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper/85 motion-safe:transition-colors hover:border-paper/45 disabled:opacity-40"
          >
            {t("ui.downloadBackupJson")}
          </button>
        </div>

        <p className="mt-6 font-sans text-caption leading-[1.6] text-paper/50">
          {t("ui.theMarkdownCopyIsFor")}
        </p>
      </div>
    </section>
  );
}
