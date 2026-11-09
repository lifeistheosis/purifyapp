"use client";

/**
 * Community > Shared pages (1.9, admin item A1): every journal page a reader
 * has shared, by where it stands (lib/admin/sharedPages.ts). A page is kept
 * out of search engines until it is reviewed here; a reported one also waits
 * in the Waiting queue, where it is decided like everything else. Its writer
 * is never shown.
 */

import { useState } from "react";

import type { SharedPageRow, SharedPagesPayload } from "@/app/api/admin/shared-pages/route";
import { SHARED_STATE_WORDS } from "@/lib/admin/sharedPages";

import { useAdminFetch } from "../adminFetch";
import { Skeleton, SubTabs, ToolbarButton } from "../primitives";
import { ink, ink2, ink3, line } from "../tools/look";

type Show = "unreviewed" | "reviewed" | "reported" | "hidden" | "withdrawn";

const SHOWS: readonly (readonly [Show, string])[] = [
  ["unreviewed", "Not reviewed"],
  ["reviewed", "Reviewed"],
  ["reported", "Reported"],
  ["hidden", "Hidden"],
  ["withdrawn", "Taken down"],
];

const note = "max-w-[72ch] font-sans text-[12.5px] leading-[1.55]";
const day = (iso: string) => iso.slice(0, 10);

type Act = "hide" | "unhide" | "review" | "unreview";

/** What can be done from a page's state. A page its writer took down is theirs: nothing here brings it back. */
const ACTIONS: Record<SharedPageRow["state"], { act: Act; label: string; danger?: boolean }[]> = {
  unreviewed: [
    { act: "review", label: "Let search engines show it" },
    { act: "hide", label: "Hide the page", danger: true },
  ],
  reviewed: [
    { act: "unreview", label: "Keep it out of search engines" },
    { act: "hide", label: "Hide the page", danger: true },
  ],
  reported: [{ act: "hide", label: "Hide the page", danger: true }],
  hidden: [{ act: "unhide", label: "Show it again" }],
  withdrawn: [],
};

function Page({ p, onChanged }: { p: SharedPageRow; onChanged: () => void }) {
  const [busy, setBusy] = useState<Act | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function send(act: Act) {
    setBusy(act);
    setProblem(null);
    try {
      const res = await fetch("/api/admin/shared-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, action: act }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setProblem(j?.error ?? "Not changed.");
        return;
      }
      onChanged();
    } catch {
      setProblem("Not changed: the admin could not be reached.");
    } finally {
      setBusy(null);
    }
  }

  const [first, ...rest] = p.words.split("\n");
  return (
    <li className="py-3" style={line}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[13px] font-medium" style={ink}>
            {first}
          </p>
          <p className="mt-0.5 font-sans text-[11.5px]" style={ink3}>
            Shared {day(p.createdAt)} · {SHARED_STATE_WORDS[p.state]}
            {p.reports > 0 ? ` · ${p.reports === 1 ? "1 report" : `${p.reports} reports`}` : ""}
            {p.reasons.length > 0 ? `: ${[...new Set(p.reasons)].join(", ")}` : ""}
          </p>
          {rest.length > 0 ? (
            <details className="mt-1.5">
              <summary className="cursor-pointer font-sans text-[12px]" style={ink2}>
                Read the page
              </summary>
              <p className="mt-1.5 whitespace-pre-line font-serif text-[13px] leading-[1.6]" style={ink2}>
                {rest.join("\n")}
              </p>
            </details>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {p.state !== "hidden" && p.state !== "withdrawn" ? (
            <a
              href={`/p/${p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]"
              style={{ ...line, ...ink }}
            >
              Open it
            </a>
          ) : null}
          {ACTIONS[p.state].map((a) => (
            <ToolbarButton key={a.act} variant={a.danger ? "danger" : undefined} loading={busy === a.act} onClick={() => send(a.act)}>
              {a.label}
            </ToolbarButton>
          ))}
        </div>
      </div>
      {problem ? (
        <p role="alert" className="mt-1.5 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
          {problem}
        </p>
      ) : null}
    </li>
  );
}

export function SharedPagesPart() {
  const [show, setShow] = useState<Show>("unreviewed");
  const { data, error, reload } = useAdminFetch<SharedPagesPayload>(`/api/admin/shared-pages?show=${show}`);

  if (error) return <p className={note} style={ink2}>{error}</p>;
  if (!data) return <Skeleton h={160} />;
  if ("unavailable" in data) return <p className={note} style={ink2}>The shared pages could not be read just now.</p>;
  if (data.absent) {
    return (
      <p className={note} style={ink2}>
        Sharing a journal page waits for its table, which the 1.9 merge creates (supabase/migrations/20261109180246_shared_pages.sql).
        From then, every shared page is listed here, kept out of search engines until you review it, and a reported one
        waits in Waiting.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <SubTabs<Show> tabs={SHOWS} active={show} onChange={setShow} />
      <p className={note} style={ink2}>
        {show === "unreviewed"
          ? "Shared, and kept out of search engines until you review them. Review only what you would put Purify's name to."
          : show === "reported"
            ? "Reported by readers since they were last kept. Decide them in Waiting, or hide one here."
            : show === "withdrawn"
              ? "Taken down by their writers. Their links show nothing, and they stay down."
              : show === "hidden"
                ? "Hidden by a decision here. Their links show nothing until they are shown again."
                : "Reviewed: search engines may show them. The newest first."}
      </p>
      {data.pages.length === 0 ? (
        <p className={note} style={ink3}>
          Nothing here.
        </p>
      ) : (
        <ul className="divide-y border-y" style={line}>
          {data.pages.map((p) => (
            <Page key={p.id} p={p} onChanged={reload} />
          ))}
        </ul>
      )}
    </div>
  );
}
