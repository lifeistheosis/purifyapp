"use client";

// Community's "Filter and log" (his pick A on r3-17, 2026-10-30): the word and
// spam filter's own settings, the handles that carry a listed word, and the
// moderation log, theirs and the moderators' in the app alike. The items the
// filter holds back are no longer here: they are rows of the one queue, under
// Waiting, beside the reports on the same post (lib/admin/communityQueue.ts).
//
// The page reads /api/admin/community/filter once and hands it here, because
// the queue needs the same read. Writes still go through that route
// (admin-gated, service role).

import { useState } from "react";

import { Pill, ToolbarButton } from "../primitives";

export type FilterTerm = { term: string; scope: "text" | "handle" | "link"; whole_word: boolean; created_at: string };
export type FilterLogLine = {
  id: string;
  actor_name: string;
  actor_email?: string | null;
  action: string;
  target_kind: string | null;
  summary: string | null;
  created_at: string;
};
export type FilterData = {
  live: { holds: boolean; terms: boolean; log?: boolean };
  holds: unknown[];
  terms: FilterTerm[];
  flaggedHandles: string[];
  log?: FilterLogLine[];
};

async function act(body: Record<string, unknown>): Promise<string | null> {
  try {
    const r = await fetch("/api/admin/community/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) return null;
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    return j.error ?? "That did not go through.";
  } catch {
    return "Network dropped. Nothing changed.";
  }
}

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;
const line = { borderColor: "var(--adm-line)" } as const;

export function CommunityFilterPanel({ data, onChanged }: { data: FilterData; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [scope, setScope] = useState<"text" | "handle" | "link">("text");
  const [wholeWord, setWholeWord] = useState(true);

  async function run(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    const problem = await act(body);
    setBusy(null);
    if (problem) setError(problem);
    else onChanged();
  }

  async function addTerm() {
    const t = term.trim().toLowerCase();
    if (t.length < 2) return;
    await run("add", { action: "add_term", term: t, scope, wholeWord });
    setTerm("");
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p role="alert" className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          {error}
        </p>
      ) : null}
      {!data.live.holds ? (
        <p className="font-sans text-[12.5px]" style={ink3}>
          The review queue and your own words switch on with 20261004000000_community_filter.sql. The built-in list already works.
        </p>
      ) : null}

      <section className="space-y-2">
        <h3 className="font-sans text-[13.5px] font-semibold" style={ink}>
          Your words and blocked web addresses
        </h3>
        <p className="font-sans text-[12.5px] leading-[1.55]" style={ink3}>
          On top of the built-in list, which stays on the server and is not shown here. A writing word is masked in posts and
          replies and refused in handles; a handle word is only refused in handles. A web address holds any post that links to
          it for review, and is refused as a profile link.
        </p>
        {data.live.terms ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void addTerm();
            }}
          >
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              maxLength={60}
              placeholder="A word or phrase"
              aria-label="Word to add"
              className="h-11 min-w-[12rem] flex-1 rounded-[var(--adm-radius-sm)] border bg-transparent px-3 font-sans text-[13px]"
              style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink)" }}
            />
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "text" | "handle" | "link")}
              aria-label="Where it applies"
              className="h-11 rounded-[var(--adm-radius-sm)] border px-2 font-sans text-[12.5px]"
              style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-panel)", color: "var(--adm-ink)" }}
            >
              <option value="text">Writing and handles</option>
              <option value="handle">Handles only</option>
              <option value="link">A web address</option>
            </select>
            <label className="inline-flex min-h-11 items-center gap-2 font-sans text-[12.5px]" style={ink2}>
              <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />
              Whole word only
            </label>
            <ToolbarButton variant="primary" loading={busy === "add"} onClick={addTerm}>
              Add
            </ToolbarButton>
          </form>
        ) : null}
        {data.terms.length > 0 ? (
          <ul className="rounded-[var(--adm-radius)] border" style={line}>
            {data.terms.map((t, i) => (
              <li key={t.term} className={`flex flex-wrap items-center gap-3 px-3 py-1.5 ${i ? "border-t" : ""}`} style={line}>
                <span className="adm-sensitive min-w-0 flex-1 truncate font-sans text-[13px]" style={ink}>
                  {t.term}
                </span>
                <span className="font-sans text-[12px]" style={ink3}>
                  {t.scope === "text" ? "writing" : t.scope === "link" ? "web address" : "handles"}
                  {!t.whole_word ? ", inside words too" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void run(`rm:${t.term}`, { action: "remove_term", term: t.term })}
                  className="min-h-11 font-sans text-[12px] underline underline-offset-[3px]"
                  style={ink2}
                  aria-label={`Remove ${t.term}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : data.live.terms ? (
          <p className="font-sans text-[12.5px]" style={ink3}>
            None added yet.
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 font-sans text-[13.5px] font-semibold" style={ink}>
          Handles to reset {data.flaggedHandles.length > 0 ? <Pill tone="gold">{data.flaggedHandles.length}</Pill> : null}
        </h3>
        <p className="font-sans text-[12.5px] leading-[1.55]" style={ink3}>
          Handles made before the filter, or that carry one of your words. Each is also swapped on its own the next time that reader
          posts or opens their profile.
        </p>
        {data.flaggedHandles.length === 0 ? (
          <p className="font-sans text-[12.5px]" style={ink3}>
            None.
          </p>
        ) : (
          <ul className="rounded-[var(--adm-radius)] border" style={line}>
            {data.flaggedHandles.map((h, i) => (
              <li key={h} className={`flex items-center gap-3 px-3 py-1.5 ${i ? "border-t" : ""}`} style={line}>
                <span className="adm-sensitive min-w-0 flex-1 truncate font-sans text-[13px]" style={ink}>
                  @{h}
                </span>
                <ToolbarButton loading={busy === `h:${h}`} onClick={() => run(`h:${h}`, { action: "reset_handle", handle: h })}>
                  Give a plain handle
                </ToolbarButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.log ? (
        <section className="space-y-2">
          <h3 className="font-sans text-[13.5px] font-semibold" style={ink}>
            Moderation log
          </h3>
          <p className="font-sans text-[12.5px] leading-[1.55]" style={ink3}>
            Who did what: you, the moderators working the queue from Community, and the filters on their own. Newest first. The
            Audit log&apos;s record reads it too.
          </p>
          {data.log.length === 0 ? (
            <p className="font-sans text-[12.5px]" style={ink3}>
              {data.live.log === false ? "The log opens with 20261005000000_community_three.sql." : "Nothing yet."}
            </p>
          ) : (
            <ul className="rounded-[var(--adm-radius)] border" style={line}>
              {data.log.map((l, i) => (
                <li key={l.id} className={`px-3 py-2 font-sans text-[12.5px] ${i ? "border-t" : ""}`} style={line}>
                  <span className="font-semibold" style={ink}>
                    {l.actor_name}
                  </span>
                  {l.actor_email ? (
                    <span className="adm-sensitive" style={ink3}>
                      {" "}
                      ({l.actor_email})
                    </span>
                  ) : null}
                  <span style={ink2}> {l.action.replace(/_/g, " ")}</span>
                  {l.summary ? (
                    <span className="adm-sensitive block text-[12px]" style={ink3}>
                      {l.summary}
                    </span>
                  ) : null}
                  <span className="block text-[11.5px]" style={ink3}>
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
