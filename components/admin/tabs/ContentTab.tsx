"use client";

// Content, his pick A on r3-17 (2026-10-30): the editors' desk.
//
// "The only thing here that changes what readers see from week to week is
// which saint is finished next; the rest is a number to update now and then."
// So the page is one list, the saints readers asked for, most asked first,
// each with its own icon in grey; Mark complete answers in place with Undo,
// and each change is one line in the audit log (app/api/admin/actions). The
// front page's ratings sit beside it as one card, whose Update and Edit open
// the two editors as sheets, and the catechism is one line until its bank is
// in. What readers open in 30 days, which Traffic also shows, is folded at
// the foot.
//
// #tab=ratings and #tab=catechism land here, on their card. The words and
// the order are lib/admin/contentDesk.ts.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { CatechismAdminPayload } from "@/app/api/admin/catechism/route";
import type { RatingsPayload } from "@/app/api/admin/ratings/route";
import { adminJson } from "@/lib/admin/fetchJson";
import {
  askedLine,
  askedList,
  askedShare,
  catechismLine,
  undoValue,
  type DeskFilter,
  type DeskSaint,
} from "@/lib/admin/contentDesk";
import { ratingText } from "@/lib/marketing/storeRatings";

import { BarChart } from "../charts";
import { CatechismDetail } from "../content/catechism";
import { PlayCard, ReviewsCard, sourceLine } from "../content/ratings";
import { Disclosure, Modal, StatusDot, SubTabs, ToolbarButton } from "../primitives";
import { BOX, BOX_STYLE, LIT, ink, ink2, ink3, line } from "../tools/look";

type Payload = {
  saintGrid: DeskSaint[];
  topSaintsByViews: { slug: string; name: string; views: number }[];
  topCouncils: { slug: string; count: number }[];
  topBibleBooks: { book: string; count: number }[];
  topTopics: { slug: string; count: number }[];
  viewsUnavailable?: boolean;
  partial?: { rows: number; needs: string } | null;
};

/** A Mark complete in flight or done, kept on its row so the row stays put. */
type Mark = {
  before: Pick<DeskSaint, "complete" | "overridden">;
  state: "saving" | "done" | "undoing";
};

/** How many rows the list shows before "Show all". */
const FIRST = 8;

/** A copy of a record without one key. */
function without<T>(rec: Record<string, T>, key: string): Record<string, T> {
  const next = { ...rec };
  delete next[key];
  return next;
}

async function setComplete(slug: string, complete: boolean | null): Promise<string | null> {
  try {
    const r = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saint-complete", slug, complete }),
    });
    if (r.ok) return null;
    const j = (await r.json().catch(() => null)) as { error?: string } | null;
    return j?.error ?? "That did not save.";
  } catch {
    return "The network dropped. Nothing changed.";
  }
}

export function ContentTab() {
  return <ContentDesk />;
}

export function ContentDesk({ focus }: { focus?: "ratings" | "catechism" }) {
  const [data, setData] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);
  const [ratings, setRatings] = useState<RatingsPayload | null>(null);
  const [ratingsVersion, setRatingsVersion] = useState(0);
  const [catechism, setCatechism] = useState<CatechismAdminPayload | null>(null);
  const [filter, setFilter] = useState<DeskFilter>("open");
  const [all, setAll] = useState(false);
  const [local, setLocal] = useState<Record<string, Pick<DeskSaint, "complete" | "overridden">>>({});
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"play" | "reviews" | null>(null);
  const [catechismOpen, setCatechismOpen] = useState(focus === "catechism");
  const ratingsRef = useRef<HTMLElement | null>(null);
  const catechismRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let alive = true;
    adminJson<Payload>("/api/admin/content").then((d) => {
      if (!alive) return;
      if (d && Array.isArray(d.saintGrid)) setData(d);
      else setFailed(true);
    });
    adminJson<CatechismAdminPayload>("/api/admin/catechism").then((d) => {
      if (alive && d) setCatechism(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    adminJson<RatingsPayload>("/api/admin/ratings").then((d) => {
      if (alive && d) setRatings(d);
    });
    return () => {
      alive = false;
    };
  }, [ratingsVersion]);

  // Landing from an old link: bring its card into view, once.
  useEffect(() => {
    const el = focus === "ratings" ? ratingsRef.current : focus === "catechism" ? catechismRef.current : null;
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focus]);

  const rows: DeskSaint[] = (data?.saintGrid ?? []).map((r) => ({ ...r, ...(local[r.slug] ?? {}) }));
  // A row marked in this visit stays in the list it was marked in, so the
  // Undo beside it stays under the pointer.
  const listed = askedList(rows, filter);
  const kept = filter === "open" ? rows.filter((r) => marks[r.slug] && !listed.includes(r)) : [];
  const list = askedList([...listed, ...kept], "all");
  const shown = all ? list : list.slice(0, FIRST);
  const viewsKnown = !data?.viewsUnavailable;

  async function mark(r: DeskSaint) {
    setProblem(null);
    const before = { complete: r.complete, overridden: r.overridden };
    setMarks((m) => ({ ...m, [r.slug]: { before, state: "saving" } }));
    const err = await setComplete(r.slug, true);
    if (err) {
      setProblem(`${r.name}: ${err}`);
      setMarks((m) => without(m, r.slug));
      return;
    }
    setLocal((l) => ({ ...l, [r.slug]: { complete: true, overridden: true } }));
    setMarks((m) => ({ ...m, [r.slug]: { before, state: "done" } }));
  }

  async function undo(r: DeskSaint) {
    const m = marks[r.slug];
    if (!m) return;
    setProblem(null);
    setMarks((x) => ({ ...x, [r.slug]: { ...m, state: "undoing" } }));
    const back = undoValue(m.before);
    const err = await setComplete(r.slug, back);
    if (err) {
      setProblem(`${r.name}: ${err}`);
      setMarks((x) => ({ ...x, [r.slug]: { ...m, state: "done" } }));
      return;
    }
    setLocal((l) => ({ ...l, [r.slug]: m.before }));
    setMarks((m) => without(m, r.slug));
  }

  async function reopen(r: DeskSaint, to: boolean | null) {
    setProblem(null);
    setMarks((m) => ({ ...m, [r.slug]: { before: { complete: r.complete, overridden: r.overridden }, state: "saving" } }));
    const err = await setComplete(r.slug, to);
    setMarks((m) => without(m, r.slug));
    if (err) {
      setProblem(`${r.name}: ${err}`);
      return;
    }
    // Back to the registry means its own word; the page reads it again.
    if (to === null) {
      const d = await adminJson<Payload>("/api/admin/content");
      if (d && Array.isArray(d.saintGrid)) {
        setData(d);
        setLocal((l) => without(l, r.slug));
      }
    } else {
      setLocal((l) => ({ ...l, [r.slug]: { complete: to, overridden: true } }));
    }
  }

  const apple = ratings?.appStore.shown;
  const play = ratings?.googlePlay.shown;
  const reviewsShown = ratings ? ratings.reviews.filter((x) => x.shown).length : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
        {/* ── Asked for next ─────────────────────────────────────────── */}
        <section className={BOX} style={BOX_STYLE}>
          <div className="flex flex-wrap items-start gap-3 px-4 pb-3 pt-3.5">
            <div className="min-w-0 flex-1">
              <h2 className="font-sans text-[13.5px] font-semibold" style={ink}>
                Asked for next
              </h2>
              <p className="mt-0.5 font-sans text-[12px] leading-[1.45]" style={ink3}>
                Saints readers asked for, most asked first. Mark one complete when its writings are in, and its Ask
                button retires.
              </p>
            </div>
            <SubTabs<DeskFilter>
              tabs={[
                ["open", "Open"],
                ["complete", "Complete"],
                ["all", "All"],
              ]}
              active={filter}
              onChange={(f) => {
                setFilter(f);
                setAll(false);
              }}
            />
          </div>
          {data?.viewsUnavailable ? (
            <p className="px-4 pb-2 font-sans text-[12px]" style={ink3}>
              The page views could not be read just now, so the views are left out, not counted as none.
            </p>
          ) : data?.partial ? (
            <p className="px-4 pb-2 font-sans text-[12px]" style={ink3}>
              Views are counted from the newest {data.partial.rows.toLocaleString()} page views only, so they are short.
            </p>
          ) : null}
          {problem ? (
            <p role="alert" className="px-4 pb-2 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
              {problem}
            </p>
          ) : null}
          {!data ? (
            <p className="border-t px-4 py-4 font-sans text-[12.5px]" style={{ ...line, ...ink3 }}>
              {failed ? "The list did not load. Reloading asks again." : "Reading the list."}
            </p>
          ) : list.length === 0 ? (
            <p className="border-t px-4 py-4 font-sans text-[12.5px]" style={{ ...line, ...ink3 }}>
              {filter === "open" ? "Every saint is complete." : filter === "complete" ? "No saint is marked complete yet." : "No saints."}
            </p>
          ) : (
            <ul>
              {shown.map((r) => {
                const m = marks[r.slug];
                const share = askedShare(r, rows);
                return (
                  <li key={r.slug} className="flex items-center gap-3 border-t px-4 py-2" style={line}>
                    <span
                      className="block size-[34px] shrink-0 overflow-hidden rounded-full"
                      style={{ background: "var(--adm-panel-2)", boxShadow: "0 0 0 1px var(--adm-line)" }}
                    >
                      {r.icon ? (
                        <Image
                          src={r.icon}
                          alt=""
                          width={34}
                          height={34}
                          sizes="34px"
                          className="size-full object-cover"
                          // His pick draws every icon in grey: one ink on this
                          // page, the icons included.
                          style={{ objectPosition: "50% 18%", filter: "grayscale(1) contrast(1.08) brightness(1.04)" }}
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/saints/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate font-sans text-[13.5px] font-semibold hover:underline"
                        style={ink}
                      >
                        {r.name}
                      </a>
                      <p className="truncate font-sans text-[12px]" style={ink3}>
                        {askedLine(r, viewsKnown)}
                        {r.overridden && !m ? " · set here" : ""}
                      </p>
                    </div>
                    {r.bumps > 0 ? (
                      <span
                        aria-hidden
                        className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full sm:block"
                        style={{ background: "var(--adm-panel-2)" }}
                      >
                        <span className="block h-full rounded-full" style={{ width: `${Math.max(4, share * 100)}%`, background: "var(--adm-ink)" }} />
                      </span>
                    ) : null}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {m && m.state !== "saving" ? (
                        <span
                          className="inline-flex min-h-[34px] items-center gap-2 rounded-[var(--adm-radius-sm)] px-2.5 font-sans text-[12px]"
                          style={{ background: "var(--adm-panel-2)", color: "var(--adm-ink-2)" }}
                          role="status"
                        >
                          <StatusDot tone="good" />
                          Marked complete
                          <button
                            type="button"
                            onClick={() => void undo(r)}
                            disabled={m.state === "undoing"}
                            className="min-h-[34px] font-semibold underline underline-offset-[3px] disabled:opacity-50"
                            style={ink}
                          >
                            Undo
                          </button>
                        </span>
                      ) : r.complete ? (
                        <>
                          <ToolbarButton loading={m?.state === "saving"} onClick={() => void reopen(r, false)}>
                            Reopen
                          </ToolbarButton>
                          {r.overridden ? (
                            <ToolbarButton
                              loading={m?.state === "saving"}
                              title="Clear what was set here and use the registry's word"
                              onClick={() => void reopen(r, null)}
                            >
                              Use the registry
                            </ToolbarButton>
                          ) : null}
                        </>
                      ) : (
                        <ToolbarButton loading={m?.state === "saving"} onClick={() => void mark(r)}>
                          Mark complete
                        </ToolbarButton>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {list.length > FIRST ? (
            <div className="border-t px-4 py-2" style={line}>
              <button type="button" onClick={() => setAll((v) => !v)} className="min-h-11 font-sans text-[12.5px] underline underline-offset-[3px]" style={ink2}>
                {all ? "Show the first eight" : `Show all ${list.length}`}
              </button>
            </div>
          ) : null}
        </section>

        <div className="space-y-4">
          {/* ── The front page ────────────────────────────────────────── */}
          <section
            ref={ratingsRef}
            className={`${BOX} scroll-mt-24 px-4 py-3.5`}
            style={focus === "ratings" ? { ...BOX_STYLE, ...LIT } : BOX_STYLE}
          >
            <h2 className="font-sans text-[13.5px] font-semibold" style={ink}>
              The front page
            </h2>
            <p className="mt-0.5 font-sans text-[12px]" style={ink3}>
              What it says about the stores.
            </p>
            {!ratings || !apple || !play ? (
              <p className="mt-3 font-sans text-[12.5px]" style={ink3}>
                Reading the ratings.
              </p>
            ) : (
              <ul className="mt-2">
                <li className="grid grid-cols-[6.5rem_3rem_1fr] items-center gap-2 border-t py-2.5" style={line}>
                  <span className="font-sans text-[13px]" style={ink2}>
                    App Store
                  </span>
                  <span className="font-sans text-[19px] font-semibold tracking-[-0.02em]" style={ink}>
                    {apple.count > 0 ? ratingText(apple.rating) : "None"}
                  </span>
                  <span className="font-sans text-[11.5px]" style={ink3}>
                    {sourceLine(apple, "appStore")}
                  </span>
                </li>
                <li className="grid grid-cols-[6.5rem_3rem_1fr_auto] items-center gap-2 border-t py-2.5" style={line}>
                  <span className="font-sans text-[13px]" style={ink2}>
                    Google Play
                  </span>
                  <span className="font-sans text-[19px] font-semibold tracking-[-0.02em]" style={ink}>
                    {play.count > 0 ? ratingText(play.rating) : "None"}
                  </span>
                  <span className="font-sans text-[11.5px]" style={ink3}>
                    {sourceLine(play, "googlePlay")}
                  </span>
                  <ToolbarButton onClick={() => setSheet("play")}>Update</ToolbarButton>
                </li>
                <li className="grid grid-cols-[6.5rem_3rem_1fr_auto] items-center gap-2 border-t py-2.5" style={line}>
                  <span className="font-sans text-[13px]" style={ink2}>
                    Reviews
                  </span>
                  <span className="font-sans text-[19px] font-semibold tracking-[-0.02em]" style={ink}>
                    {reviewsShown}
                  </span>
                  <span className="font-sans text-[11.5px]" style={ink3}>
                    of {ratings.reviews.length} shown
                  </span>
                  <ToolbarButton onClick={() => setSheet("reviews")}>Edit</ToolbarButton>
                </li>
              </ul>
            )}
            {ratings && !ratings.present ? (
              <p className="mt-2 font-sans text-[12px] leading-[1.5]" style={ink3}>
                Saving opens once docs/1.8-build/sql/site-settings.sql has run; until then the front page shows the
                committed numbers.
              </p>
            ) : ratings && !ratings.readOk ? (
              <p role="alert" className="mt-2 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
                The saved rows could not be read just now. The front page keeps what it read last.
              </p>
            ) : null}
          </section>

          {/* ── Catechism, one line ───────────────────────────────────── */}
          <section ref={catechismRef} className={`${BOX} scroll-mt-24 px-4 py-3.5`} style={BOX_STYLE}>
            <div className="flex items-baseline gap-3">
              <h2 className="flex-1 font-sans text-[13.5px] font-semibold" style={ink}>
                Catechism
              </h2>
              {catechism ? (
                <span className="font-sans text-[19px] font-semibold tracking-[-0.02em]" style={ink}>
                  {catechism.bankSize}
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-sans text-[12px] leading-[1.5]" style={ink3}>
              {catechism ? catechismLine(catechism.bankSize) : "Reading the bank."}
            </p>
            {catechism ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setCatechismOpen((v) => !v)}
                  className="min-h-11 font-sans text-[12.5px] underline underline-offset-[3px]"
                  style={ink2}
                  aria-expanded={catechismOpen}
                >
                  {catechismOpen ? "Close" : catechism.bankSize > 0 ? "Today's five, and how each lands" : "The counts"}
                </button>
                {catechismOpen ? (
                  <div className="mt-2 border-t pt-3" style={line}>
                    <CatechismDetail data={catechism} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {/* ── What readers open ─────────────────────────────────────────── */}
      {data && !data.viewsUnavailable ? (
        <Disclosure title="What readers open" hint="The last 30 days: saint pages, councils, Bible books and topics. Traffic has every page.">
          <div className="grid gap-5 md:grid-cols-2">
            {(
              [
                ["Saint pages", data.topSaintsByViews.slice(0, 10).map((s) => ({ label: s.name, value: s.views }))],
                ["Councils", data.topCouncils.map((c) => ({ label: c.slug.replace(/-/g, " "), value: c.count }))],
                ["Bible books", data.topBibleBooks.map((b) => ({ label: b.book, value: b.count }))],
                ["Topics", data.topTopics.map((t) => ({ label: t.slug.replace(/-/g, " "), value: t.count }))],
              ] as const
            ).map(([title, chart]) => (
              <div key={title}>
                <p className="mb-2 font-sans text-[12px] font-semibold" style={ink2}>
                  {title}
                </p>
                <BarChart rows={[...chart]} />
              </div>
            ))}
          </div>
        </Disclosure>
      ) : null}

      {sheet === "play" && ratings ? (
        <Modal title="Google Play rating" subtitle="What the front page shows for Google Play." onClose={() => setSheet(null)}>
          <PlayCard
            key={`${ratings.googlePlay.shown.rating}-${ratings.googlePlay.shown.count}-${ratings.googlePlay.shown.asOf}`}
            initial={ratings.googlePlay.shown}
            listing={ratings.googlePlay.listing}
            canSave={ratings.present}
            onSaved={() => setRatingsVersion((v) => v + 1)}
          />
        </Modal>
      ) : null}
      {sheet === "reviews" && ratings ? (
        <Modal title="Reviews on the front page" subtitle="Real ones only, copied exactly." onClose={() => setSheet(null)} wide>
          <ReviewsCard
            key={`${ratings.reviewsFromDefault ? "default" : ratings.updated.reviews?.at ?? "saved"}-${ratings.reviews.length}`}
            initial={ratings.reviews}
            fromDefault={ratings.reviewsFromDefault}
            savedAt={ratings.updated.reviews?.at ?? null}
            canSave={ratings.present}
            onSaved={() => setRatingsVersion((v) => v + 1)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
