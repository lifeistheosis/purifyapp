"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[560px]">
        <Link
          href="/account"
          className="font-sans text-caption text-paper/50 hover:text-paper/80"
        >
          {t("ui.accountX")}
        </Link>
        <h1 className="mt-4 font-display-serif text-title text-paper">
          {t("ui.exportYourLibrary")}
        </h1>
        <p className="mt-2 font-sans text-ui leading-relaxed text-paper/60">
          {t("ui.everythingYouHaveGatheredOn")}
        </p>

        {summary ? (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={summary.florilegia} label={t("ui.florilegia")} />
            <Stat value={summary.gatheredLines} label={t("ui.gatheredLines")} />
            <Stat value={summary.notes} label={t("saints.notes")} />
            <Stat value={summary.names} label={t("ui.names")} />
          </div>
        ) : (
          <p className="mt-7 font-sans text-ui text-paper/40">{t("ui.gathering")}</p>
        )}

        {empty ? (
          <p className="mt-6 rounded-2xl border border-paper/10 bg-black/20 p-5 font-sans text-ui text-paper/55">
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
            className="inline-flex flex-1 items-center justify-center rounded-pill bg-paper px-6 py-4 font-display-serif text-lede text-night transition-colors hover:bg-paper/90 disabled:opacity-40"
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
            className="inline-flex flex-1 items-center justify-center rounded-pill border border-paper/25 px-6 py-4 font-display-serif text-lede text-paper/85 transition-colors hover:border-paper/45 disabled:opacity-40"
          >
            {t("ui.downloadBackupJson")}
          </button>
        </div>

        <p className="mt-6 font-sans text-caption leading-[1.6] text-paper/40">
          {t("ui.theMarkdownCopyIsFor")}
        </p>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4 text-center">
      <p className="font-display-serif text-title text-paper tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-sans text-caption text-paper/50">{label}</p>
    </div>
  );
}
