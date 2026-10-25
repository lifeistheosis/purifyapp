"use client";

// "Who said it" (1.8): paste a line that goes round under a Father's name;
// the server looks for it in every text the app carries word for word
// (app/api/quotes/find, lib/quotes/find.ts) and the page shows where it
// stands, each with the same source line every quotation in the app wears,
// or says plainly that it is not found. Drawn like the dictionary: a short
// header, one field, one ruled list. A client page, so the apps' static
// export carries it and the question goes to purifyapp.net (apiFetch).

import { useState } from "react";

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { apiFetch } from "@/lib/api/client";
import type { ShownCite } from "@/lib/citations/cite";

type Found = { match: "exact" | "close"; share: number; cite: Extract<ShownCite, { kind: "father" }>; excerpt: string };
type State = { kind: "idle" } | { kind: "busy" } | { kind: "done"; found: Found[] } | { kind: "error"; key: string };

const MIN_WORDS = 5;

/**
 * The answer as a picture to post (1.8, the owner's yes of 2026-10-24): the
 * verse card's look (lib/share/drawVerseCard.ts) with the book's own words,
 * the Father under them, and the work and place on the line below. A line
 * that is not found gets a picture of the answer alone, never of the words
 * pasted in: a reader's own text does not go out under Purify's name.
 */
async function shareAnswer(
  t: (key: string, vars?: Record<string, string | number>) => string,
  found: Found | null,
): Promise<"ok" | "saved" | "failed"> {
  const [{ renderVerseCard }, { shareImage }, { cardFileName }] = await Promise.all([
    import("@/lib/share/drawVerseCard"),
    import("@/lib/share/shareImage"),
    import("@/lib/share/verseCard"),
  ]);
  if (!found) {
    const picture = await renderVerseCard({ text: t("whoSaidIt.card.noneTitle"), reference: t("whoSaidIt.title"), note: t("whoSaidIt.card.noneNote") });
    if (!picture) return "failed";
    const outcome = await shareImage(picture, "purify-who-said-it.png", t("whoSaidIt.card.noneTitle"));
    return outcome === "saved" ? "saved" : outcome === "failed" ? "failed" : "ok";
  }
  const { author, work, place } = found.cite;
  const key = found.match === "exact" ? "whoSaidIt.card.exactNote" : "whoSaidIt.card.closeNote";
  // The work and its place when the line holds them, the work alone when not.
  const notes = place ? [t(key, { where: `${work}, ${place}` }), t(key, { where: work })] : [t(key, { where: work })];
  for (const note of notes) {
    const picture = await renderVerseCard({ text: found.excerpt, reference: author || work, note });
    if (!picture) continue;
    const outcome = await shareImage(picture, cardFileName(`${author} ${work}`), `${found.excerpt}\n${[author, work, place].filter(Boolean).join(", ")}`);
    return outcome === "saved" ? "saved" : outcome === "failed" ? "failed" : "ok";
  }
  return "failed";
}

function ShareAnswer({ found }: { found: Found | null }) {
  const { t } = useTranslate();
  const [said, setSaid] = useState<string | null>(null);
  async function go() {
    setSaid(null);
    try {
      const outcome = await shareAnswer(t, found);
      if (outcome === "saved") setSaid(t("today.verse.pictureSaved"));
      if (outcome === "failed") setSaid(t("today.verse.couldNotMakePicture"));
    } catch {
      setSaid(t("today.verse.couldNotMakePicture"));
    }
  }
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={go}
        className="tap-press inline-flex h-11 items-center rounded-pill border border-paper/15 px-4 font-sans text-caption font-semibold text-paper/80 hover:border-paper/35"
      >
        {t("today.verse.shareAsPicture")}
      </button>
      {said ? <span className="font-sans text-caption text-paper/55">{said}</span> : null}
    </p>
  );
}

export function WhoSaidIt() {
  const { t } = useTranslate();
  const [line, setLine] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function find(e: React.FormEvent) {
    e.preventDefault();
    const q = line.trim();
    if ((q.match(/[\p{L}\p{N}]+/gu) ?? []).length < MIN_WORDS) {
      setState({ kind: "error", key: "whoSaidIt.tooShort" });
      return;
    }
    setState({ kind: "busy" });
    try {
      const res = await apiFetch(`/api/quotes/find?q=${encodeURIComponent(q)}`);
      if (res.status === 429) return setState({ kind: "error", key: "whoSaidIt.slow" });
      if (res.status === 400) return setState({ kind: "error", key: "whoSaidIt.tooShort" });
      if (!res.ok) return setState({ kind: "error", key: "whoSaidIt.error" });
      const body = (await res.json()) as { found: Found[] };
      setState({ kind: "done", found: body.found });
    } catch {
      setState({ kind: "error", key: "whoSaidIt.error" });
    }
  }

  return (
    <section className="bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[820px]">
        <header>
          <p className="font-sans text-caption font-semibold text-paper/55">{t("whoSaidIt.eyebrow")}</p>
          <h1 className="mt-3 font-serif text-display-sm font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display">
            {t("whoSaidIt.title")}
          </h1>
          <p className="mt-5 max-w-[60ch] font-serif text-body leading-[1.75] text-paper/80">{t("whoSaidIt.intro")}</p>
        </header>

        <form onSubmit={find} className="mt-8">
          <label className="block">
            <span className="sr-only">{t("whoSaidIt.placeholder")}</span>
            <textarea
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder={t("whoSaidIt.placeholder")}
              rows={3}
              maxLength={600}
              className="w-full resize-y rounded-[14px] border border-paper/10 bg-paper/[0.04] px-4 py-3 font-serif text-body leading-[1.6] text-paper placeholder:text-paper/45 focus:border-paper/30 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={state.kind === "busy"}
            className="tap-press mt-3 inline-flex h-12 items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
          >
            {state.kind === "busy" ? t("whoSaidIt.searching") : t("whoSaidIt.find")}
          </button>
        </form>

        <div aria-live="polite" className="mt-8">
          {state.kind === "error" ? <p className="font-sans text-ui text-paper/60">{t(state.key)}</p> : null}
          {state.kind === "done" && state.found.length === 0 ? (
            <div data-who-said-it="none">
              <p className="max-w-[62ch] font-serif text-body leading-[1.7] text-paper/75">{t("whoSaidIt.none")}</p>
              <ShareAnswer found={null} />
            </div>
          ) : null}
          {state.kind === "done" && state.found.length > 0 ? (
            <ol className="divide-y divide-paper/[0.07]">
              {state.found.map((f) => (
                <li key={f.cite.href} data-who-said-it={f.match} className="py-5">
                  <p className="font-sans text-caption font-semibold text-paper/55">
                    {f.match === "exact" ? t("whoSaidIt.exact") : t("whoSaidIt.close")}
                  </p>
                  <blockquote lang="en" className="mt-2 max-w-[62ch] font-serif text-body leading-[1.7] text-paper/85">
                    {f.excerpt}
                  </blockquote>
                  <SourceLine cite={f.cite} className="mt-2" />
                  <ShareAnswer found={f} />
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </section>
  );
}
