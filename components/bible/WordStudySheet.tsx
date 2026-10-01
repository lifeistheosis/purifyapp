"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type Item = {
  ref: string;
  book: string;
  chapter: number;
  verse: number;
  greek: string;
  forms: string[];
  english: string | null;
  href: string;
};
type Answer = {
  lemma: string | null;
  translit: string | null;
  gloss: string | null;
  counts: { nt: number; ot: number };
  next: number | null;
  items: Item[];
};

const GREEK = { fontFamily: "var(--font-greek), serif" } as const;

/** The verse's Greek with the word's own forms marked. */
function Marked({ text, forms }: { text: string; forms: string[] }) {
  if (forms.length === 0) return <>{text}</>;
  const escaped = forms.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return (
    <>
      {parts.map((p, i) =>
        forms.includes(p) ? (
          <mark key={i} className="rounded-sm bg-premium/20 px-0.5 text-premium-bright">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/**
 * The Greek word study (a Purify Plus tool): every verse a word stands in,
 * in the Septuagint and in the New Testament (app/api/bible/word). Opened
 * from a Greek word's card in the interlinear. Each verse shows its Greek
 * with the word marked and, where the Greek pairs with Purify's English verse
 * for verse, the English too; where it does not, the Greek alone and a link
 * to the chapter rather than to a verse that would be the wrong one.
 */
export function WordStudySheet({
  strongs,
  lemma,
  startIn,
  onClose,
}: {
  /** The Strong's number open, or null when closed. */
  strongs: string | null;
  lemma?: string | null;
  /** Which testament to open on: the one the reader is in. */
  startIn: "ot" | "nt";
  onClose: () => void;
}) {
  const { t, tn } = useTranslate();
  // Mounted afresh for each word (the caller keys it), so it opens in the
  // testament being read with nothing left over from the last word.
  const [tab, setTab] = useState<"ot" | "nt">(startIn);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!strongs) return;
    let alive = true;
    apiFetch(`/api/bible/word?s=${encodeURIComponent(strongs)}&t=${tab}&offset=0`)
      .then((r) => (r.ok ? (r.json() as Promise<Answer>) : Promise.reject(new Error(String(r.status)))))
      .then((a) => {
        if (!alive) return;
        setAnswer(a);
        setItems(a.items);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [strongs, tab]);

  const choose = (key: "ot" | "nt") => {
    if (key === tab) return;
    setTab(key);
    setItems([]);
    setFailed(false);
    setLoading(true);
  };

  const more = () => {
    if (!strongs || answer?.next == null) return;
    setLoading(true);
    apiFetch(`/api/bible/word?s=${encodeURIComponent(strongs)}&t=${tab}&offset=${answer.next}`)
      .then((r) => (r.ok ? (r.json() as Promise<Answer>) : Promise.reject(new Error(String(r.status)))))
      .then((a) => {
        setAnswer(a);
        setItems((prev) => [...prev, ...a.items]);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  const title = answer?.lemma ?? lemma ?? "";
  return (
    <Sheet open={strongs !== null} onClose={onClose} title={t("bible.wordStudyTitle")} desktop bodyClassName="px-5 pb-6 pt-1">
      <p lang="grc" style={GREEK} className="text-title text-paper">
        {title}
      </p>
      {answer?.translit || answer?.gloss ? (
        <p className="mt-1 font-sans text-ui leading-[1.55] text-paper/70">
          {answer?.translit ? <em className="not-italic text-paper/60">{answer.translit}</em> : null}
          {answer?.translit && answer?.gloss ? " · " : null}
          {answer?.gloss}
        </p>
      ) : null}

      {/* Two equal pills, the name over the count, so neither wraps mid-phrase
          on a phone. */}
      <div role="tablist" aria-label={t("bible.wordStudyTitle")} className="mt-4 grid grid-cols-2 gap-2">
        {(["ot", "nt"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => choose(key)}
            className={cn(
              "flex min-h-11 min-w-0 flex-col items-center justify-center rounded-pill border px-4 py-1.5 text-center font-sans text-detail font-semibold leading-tight transition-colors",
              tab === key ? "border-premium/50 bg-premium/[0.10] text-premium-ink" : "border-paper/15 text-paper/70 hover:border-paper/35",
            )}
          >
            {t(key === "ot" ? "bible.wordStudyOT" : "bible.wordStudyNT")}
            {answer ? (
              <span className="whitespace-nowrap text-caption font-normal tabular-nums opacity-80">
                {tn("bible.wordStudyTimes", answer.counts[key])}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <ol className="mt-4 divide-y divide-paper/10">
        {items.map((it) => (
          <li key={it.ref}>
            <Link href={it.href} onClick={onClose} className="group block py-3.5">
              <p className="font-sans text-detail font-semibold text-premium-ink group-hover:text-premium-bright">
                {t(`bible.books.${it.book}`)} {it.chapter}:{it.verse}
              </p>
              {it.english ? <p className="mt-1 font-serif text-body leading-[1.6] text-paper/85">{it.english}</p> : null}
              <p lang="grc" style={GREEK} className="mt-1 text-ui leading-[1.6] text-paper/65">
                <Marked text={it.greek} forms={it.forms} />
              </p>
              {it.english === null ? (
                <p className="mt-1 font-sans text-caption text-paper/45">{t("bible.wordStudyGreekNumbering")}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>

      {loading ? <p className="mt-4 font-sans text-detail text-paper/55">{t("bible.wordStudyLoading")}</p> : null}
      {failed ? <p className="mt-4 font-sans text-detail text-crimson-soft">{t("bible.wordStudyFailed")}</p> : null}
      {!loading && answer && items.length === 0 && !failed ? (
        <p className="mt-4 font-sans text-detail text-paper/55">{t("bible.wordStudyNone")}</p>
      ) : null}
      {answer?.next != null && !loading ? (
        <button
          type="button"
          onClick={more}
          className="mt-4 inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-detail font-semibold text-paper hover:border-paper/45"
        >
          {t("bible.wordStudyMore")}
        </button>
      ) : null}
      <p className="mt-5 font-sans text-caption text-paper/45">{t("bible.wordStudyCredit")}</p>
    </Sheet>
  );
}
