"use client";

// Your week: the Audit log's first view, his pick B on r3-17 (2026-10-30).
//
// "You asked the admin to learn from your use: this is where it says what it
// learned and you decide, and the rail moves only when you say yes." His use
// first, in sentences: where his time went, what Home was for, what he never
// opened; then suggestions he answers Do it or Not now. Only his own visits
// count (/api/admin/usage reads the signed-in admin's rows alone), and Do it
// is the one thing that moves the rail: it writes the adm_rail cookie the
// server draws the rail from, and the shell no longer re-sorts it by itself.
// Not now keeps a suggestion away for a week, in this browser.
//
// The words are lib/admin/yourWeek.ts. The record of who did what, A's
// timeline, is the page's second view (AuditLogTab).

import { useEffect, useState } from "react";

import { viewLabel } from "@/lib/admin/pages";
import { encodeRail, railCookie, railDay } from "@/lib/admin/rail";
import type { UsageSummary } from "@/lib/admin/usage";
import {
  NOT_NOW_DAYS,
  applySuggestion,
  durationWords,
  homeLine,
  neverOpened,
  railFromCookies,
  railSuggestions,
  stillAsked,
  timeByPage,
  weekSentence,
  type RailSuggestion,
} from "@/lib/admin/yourWeek";

import { useAdminFetch } from "../adminFetch";
import { Disclosure, StatusDot, SubTabs, ToolbarButton } from "../primitives";
import { BOX, BOX_STYLE, GLOW, ink, ink2, ink3, line } from "../tools/look";

type Payload = UsageSummary & { days: number };

const NOT_NOW_KEY = "adm_week_not_now";

function readNotNow(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(NOT_NOW_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === "object" ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Do it: the rail he said yes to, in the cookie the server draws the rail
 * from on the next load (lib/admin/rail.ts says why a cookie). The only
 * writer of that cookie since his pick B.
 */
function saveRail(next: Parameters<typeof encodeRail>[0]) {
  document.cookie = railCookie(encodeRail(next, railDay(new Date())), window.location.protocol === "https:");
}

function writeNotNow(v: Record<string, string>) {
  try {
    window.localStorage.setItem(NOT_NOW_KEY, JSON.stringify(v));
  } catch {
    // Private mode or storage off: the suggestion simply comes back.
  }
}

/** "24 to 30 Oct", the window the readout covers. */
function windowWords(since: string | null, days: number): string {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const day = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return since ? `${day(start)} to ${day(end)}` : `the last ${days} days`;
}

export function UsageTab() {
  const [days, setDays] = useState<7 | 30>(7);
  const { data, error } = useAdminFetch<Payload>(`/api/admin/usage?days=${days}`);
  const [notNow, setNotNow] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [cookies, setCookies] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    // Read once the page is in the browser: storage, cookies and the clock
    // are not this render's to read.
    const t = window.setTimeout(() => {
      setNotNow(readNotNow());
      setCookies(document.cookie);
      setNow(Date.now());
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  if (error) {
    return (
      <p className={`${BOX} px-4 py-3 font-sans text-[13px]`} style={{ ...BOX_STYLE, ...ink2 }}>
        Your use is not being kept yet: the usage table is not on the database. Once docs/1.8-build/sql/admin-usage.sql has
        run, the admin starts keeping it, and this page says what it learns.
      </p>
    );
  }

  const pages = data ? timeByPage(data.views) : [];
  const top = pages[0]?.ms ?? 0;
  const current = railFromCookies(cookies);
  const suggestions = data && now ? stillAsked(railSuggestions(current, data.views, data.days), notNow, now) : [];
  const never = data ? neverOpened(data.never) : [];
  const home = data ? homeLine(pages, data.paths) : null;

  function doIt(s: RailSuggestion) {
    if (!data) return;
    saveRail(applySuggestion(current, s, data.views));
    setCookies(document.cookie);
    setDone(`${s.title.replace(/\.$/, "")}: done. The rail has it the next time the admin opens.`);
  }

  function later(s: RailSuggestion) {
    const next = { ...notNow, [s.id]: new Date().toISOString() };
    setNotNow(next);
    writeNotNow(next);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-sans text-[20px] font-semibold leading-snug tracking-[-0.01em] md:text-[22px]" style={ink}>
            {data ? weekSentence(pages, data.days) : "Reading your week."}
          </h2>
          <p className="mt-1 font-sans text-[12.5px]" style={ink3}>
            Your own visits, {windowWords(data?.since ?? null, days)}. Another admin&apos;s visits never move your rail.
          </p>
        </div>
        <SubTabs<"7" | "30">
          tabs={[
            ["7", "This week"],
            ["30", "30 days"],
          ]}
          active={String(days) as "7" | "30"}
          onChange={(v) => setDays(v === "7" ? 7 : 30)}
        />
      </div>

      {data ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <section className={`${BOX} px-4 py-3.5`} style={BOX_STYLE}>
            <h3 className="font-sans text-[13.5px] font-semibold" style={ink}>
              Where your time went
            </h3>
            <p className="mt-0.5 font-sans text-[12px]" style={ink3}>
              Time with each page open, and how often you opened it.
            </p>
            {pages.length === 0 ? (
              <p className="mt-3 font-sans text-[12.5px]" style={ink3}>
                No visits of yours in this window.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {pages.slice(0, 8).map((p) => (
                  <li key={p.pageId} className="grid grid-cols-[6.5rem_1fr_4rem_4.5rem] items-center gap-3 font-sans text-[13px]">
                    <span className="truncate" style={ink}>
                      {p.label}
                    </span>
                    <span className="block h-2 overflow-hidden rounded-full" style={{ background: "var(--adm-panel-2)" }} aria-hidden>
                      <span className="block h-full rounded-full" style={{ width: `${top ? Math.max(2, (p.ms / top) * 100) : 0}%`, background: "var(--adm-ink)" }} />
                    </span>
                    <span className="text-right font-mono text-[12px]" style={ink2}>
                      {durationWords(p.ms)}
                    </span>
                    <span className="font-mono text-[11.5px]" style={ink3}>
                      {p.visits} {p.visits === 1 ? "visit" : "visits"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {home ? (
              <p className="mt-3 border-t pt-2.5 font-sans text-[12.5px]" style={{ ...line, ...ink2 }}>
                {home}
              </p>
            ) : null}
          </section>

          <section className={`${BOX} px-0 py-0`} style={BOX_STYLE}>
            <div className="px-4 pb-2 pt-3.5">
              <h3 className="font-sans text-[13.5px] font-semibold" style={ink}>
                Suggestions {suggestions.length > 0 ? <span style={ink3}>{suggestions.length}</span> : null}
              </h3>
              <p className="mt-0.5 font-sans text-[12px]" style={ink3}>
                From the {data.days === 7 ? "week" : `${data.days} days`} beside them. Nothing moves until you say so.
              </p>
            </div>
            {done ? (
              <p className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5 font-sans text-[12.5px]" style={{ ...line, ...ink2 }} role="status">
                <StatusDot tone="good" />
                <span className="min-w-0 flex-1">{done}</span>
                <ToolbarButton onClick={() => window.location.reload()}>Reload now</ToolbarButton>
              </p>
            ) : null}
            {suggestions.length === 0 ? (
              <p className="border-t px-4 py-3 font-sans text-[12.5px]" style={{ ...line, ...ink3 }}>
                Nothing to suggest: your rail already follows your use, or there is not enough of it yet to say.
              </p>
            ) : (
              <ul>
                {suggestions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 border-t px-4 py-3" style={line}>
                    <span className="self-start pt-[6px]">
                      <StatusDot tone="wait" />
                    </span>
                    <div className="min-w-[12rem] flex-1">
                      <p className="font-sans text-[13.5px] font-semibold" style={ink}>
                        {s.title}
                      </p>
                      <p className="mt-0.5 font-sans text-[12px]" style={ink3}>
                        {s.why}
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 pl-5 sm:flex sm:w-auto sm:pl-0">
                      <ToolbarButton onClick={() => later(s)} title={`Asked again in ${NOT_NOW_DAYS} days`}>
                        Not now
                      </ToolbarButton>
                      <span className="grid rounded-[var(--adm-radius-sm)] sm:inline-flex" style={{ boxShadow: GLOW }}>
                        <ToolbarButton variant="primary" onClick={() => doIt(s)}>
                          Do it
                        </ToolbarButton>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {data && never.length > 0 ? (
        <p className="font-sans text-[12.5px]" style={ink3}>
          Never opened {data.days === 7 ? "this week" : `in ${data.days} days`}: {never.join(", ")}.
        </p>
      ) : null}

      {data && (data.paths.length > 0 || data.actions.length > 0) ? (
        <Disclosure title="The rest of the readout" hint="Pages opened one after the other, and the buttons you press most.">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-2 font-sans text-[12px] font-semibold" style={ink2}>
                Opened one after the other
              </p>
              <ul className="space-y-1 font-sans text-[12.5px]" style={ink2}>
                {data.paths.map((p) => (
                  <li key={`${p.from}>${p.to}`} className="flex justify-between gap-3">
                    <span className="truncate">
                      {viewLabel(p.from)} then {viewLabel(p.to)}
                    </span>
                    <span className="font-mono" style={ink3}>
                      {p.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-sans text-[12px] font-semibold" style={ink2}>
                Buttons pressed most
              </p>
              <ul className="space-y-1 font-sans text-[12.5px]" style={ink2}>
                {data.actions.map((a) => (
                  <li key={`${a.tab}:${a.label}`} className="flex justify-between gap-3">
                    <span className="truncate">{a.label}</span>
                    <span className="font-mono" style={ink3}>
                      {a.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Disclosure>
      ) : null}
    </div>
  );
}
