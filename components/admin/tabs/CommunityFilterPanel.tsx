"use client";

// The word and spam filter's moderator side (lib/moderation,
// lib/community/spam.ts): posts and replies that went up with words masked,
// and the ones held from everyone (spam, a new account's link, hidden by
// readers' reports), waiting on a decision; the team's own words and blocked
// web addresses on top of the built-in lists; handles that carry a listed
// word; and the moderation log, theirs and the moderators' in the app alike.
// Reads and writes go through /api/admin/community/filter (admin-gated,
// service role).

import { useCallback, useEffect, useState } from "react";

import { Card, Pill, ToolbarButton } from "../primitives";

type Hold = {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  /** Why it waits (20261005); "words" before it. */
  reason?: "words" | "spam" | "links" | "new_account" | "reports";
  detail?: string | null;
  original_title: string | null;
  original_body: string | null;
  hits: number;
  created_at: string;
  post: { id: string; title: string | null; body: string | null; author_name: string; author_handle: string | null; status: string } | null;
  reply: { id: string; post_id: string; body: string; author_name: string; author_handle: string | null; status: string } | null;
};
type Term = { term: string; scope: "text" | "handle" | "link"; whole_word: boolean; created_at: string };
type LogLine = {
  id: string;
  actor_name: string;
  actor_email?: string | null;
  action: string;
  target_kind: string | null;
  summary: string | null;
  created_at: string;
};
type FilterData = {
  live: { holds: boolean; terms: boolean; log?: boolean };
  holds: Hold[];
  terms: Term[];
  flaggedHandles: string[];
  log?: LogLine[];
};

const REASON_LABEL: Record<NonNullable<Hold["reason"]>, string> = {
  words: "Masked words",
  spam: "Spam",
  links: "Short link",
  new_account: "New account link",
  reports: "Hidden by reports",
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

async function fetchFilter(): Promise<{ data: FilterData } | { error: string }> {
  try {
    const r = await fetch("/api/admin/community/filter", { cache: "no-store" });
    const j = (await r.json()) as FilterData & { error?: string };
    return r.ok ? { data: j } : { error: j.error ?? "The word filter queue could not be read." };
  } catch {
    return { error: "The word filter queue could not be read." };
  }
}

export function CommunityFilterPanel() {
  const [data, setData] = useState<FilterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [scope, setScope] = useState<"text" | "handle" | "link">("text");
  const [wholeWord, setWholeWord] = useState(true);

  const apply = useCallback((res: { data: FilterData } | { error: string }) => {
    if ("error" in res) setError(res.error);
    else {
      setError(null);
      setData(res.data);
    }
  }, []);
  const load = useCallback(async () => apply(await fetchFilter()), [apply]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await fetchFilter();
      if (alive) apply(res);
    })();
    return () => {
      alive = false;
    };
  }, [apply]);

  async function run(key: string, body: Record<string, unknown>) {
    setBusy(key);
    const problem = await act(body);
    setBusy(null);
    if (problem) setError(problem);
    else await load();
  }

  async function addTerm() {
    const t = term.trim().toLowerCase();
    if (t.length < 2) return;
    await run("add", { action: "add_term", term: t, scope, wholeWord });
    setTerm("");
  }

  if (error && !data) {
    return (
      <Card title="Word filter">
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error}
        </p>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card title="Word filter">
        <p className="font-sans text-detail text-paper/40">Loading…</p>
      </Card>
    );
  }

  return (
    <Card
      title="Word and spam filter"
      subtitle="Masked words wait for your decision; spam, a new account's link and posts readers' reports hid wait unseen until you approve or remove them"
      accent={data.holds.length > 0}
    >
      {error ? (
        <p role="alert" className="mb-3 font-sans text-detail text-[color:var(--adm-critical)]">
          {error}
        </p>
      ) : null}
      {!data.live.holds ? (
        <p className="font-sans text-detail text-paper/50">
          The review queue and your own words switch on with 20261004000000_community_filter.sql. The built-in list already works.
        </p>
      ) : null}

      <section className="space-y-2">
        <h3 className="font-sans text-ui font-semibold text-paper">
          Held for review <Pill tone={data.holds.length > 0 ? "rose" : "neutral"}>{data.holds.length}</Pill>
        </h3>
        {data.holds.length === 0 ? (
          <p className="font-sans text-detail text-paper/40">Nothing waiting.</p>
        ) : (
          <ul className="space-y-2">
            {data.holds.map((h) => (
              <HoldRow key={h.id} hold={h} busy={busy} run={run} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 space-y-2">
        <h3 className="font-sans text-ui font-semibold text-paper">Your words and blocked web addresses</h3>
        <p className="font-sans text-detail text-paper/50">
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
              className="h-11 min-w-[12rem] flex-1 rounded-[var(--adm-radius-sm)] border border-paper/15 bg-transparent px-3 font-sans text-ui text-paper placeholder:text-paper/35"
            />
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "text" | "handle" | "link")}
              aria-label="Where it applies"
              className="h-11 rounded-[var(--adm-radius-sm)] border border-paper/15 bg-[var(--adm-panel)] px-2 font-sans text-detail text-paper"
            >
              <option value="text">Writing and handles</option>
              <option value="handle">Handles only</option>
              <option value="link">A web address</option>
            </select>
            <label className="inline-flex min-h-11 items-center gap-2 font-sans text-detail text-paper/70">
              <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />
              Whole word only
            </label>
            <ToolbarButton variant="primary" loading={busy === "add"} onClick={addTerm}>
              Add
            </ToolbarButton>
          </form>
        ) : null}
        {data.terms.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {data.terms.map((t) => (
              <li key={t.term} className="inline-flex items-center gap-2 rounded-[var(--adm-radius-sm)] border border-paper/10 px-2.5 py-1">
                <span className="adm-sensitive font-sans text-detail text-paper">{t.term}</span>
                <Pill>{t.scope === "text" ? "writing" : t.scope === "link" ? "web address" : "handles"}</Pill>
                {!t.whole_word ? <Pill tone="gold">inside words</Pill> : null}
                <button
                  type="button"
                  onClick={() => void run(`rm:${t.term}`, { action: "remove_term", term: t.term })}
                  className="hit-44 font-sans text-caption text-paper/50 hover:text-paper"
                  aria-label={`Remove ${t.term}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : data.live.terms ? (
          <p className="font-sans text-detail text-paper/40">None added yet.</p>
        ) : null}
      </section>

      <section className="mt-6 space-y-2">
        <h3 className="font-sans text-ui font-semibold text-paper">
          Handles to reset <Pill tone={data.flaggedHandles.length > 0 ? "rose" : "neutral"}>{data.flaggedHandles.length}</Pill>
        </h3>
        <p className="font-sans text-detail text-paper/50">
          Handles made before the filter, or that carry one of your words. Each is also swapped on its own the next time that reader
          posts or opens their profile.
        </p>
        {data.flaggedHandles.length === 0 ? (
          <p className="font-sans text-detail text-paper/40">None.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {data.flaggedHandles.map((h) => (
              <li key={h} className="inline-flex items-center gap-2 rounded-[var(--adm-radius-sm)] border border-paper/10 px-2.5 py-1">
                <span className="adm-sensitive font-sans text-detail text-paper">@{h}</span>
                <ToolbarButton loading={busy === `h:${h}`} onClick={() => run(`h:${h}`, { action: "reset_handle", handle: h })}>
                  Give a plain handle
                </ToolbarButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.log ? (
        <section className="mt-6 space-y-2">
          <h3 className="font-sans text-ui font-semibold text-paper">Moderation log</h3>
          <p className="font-sans text-detail text-paper/50">
            Who did what: you, the moderators working the queue from Community, and the filters on their own. Newest first.
          </p>
          {data.log.length === 0 ? (
            <p className="font-sans text-detail text-paper/40">{data.live.log === false ? "The log opens with 20261005000000_community_three.sql." : "Nothing yet."}</p>
          ) : (
            <ul className="divide-y divide-paper/8 rounded-[var(--adm-radius)] border border-paper/10">
              {data.log.map((l) => (
                <li key={l.id} className="px-3 py-2 font-sans text-detail">
                  <span className="font-semibold text-paper">{l.actor_name}</span>
                  {l.actor_email ? <span className="adm-sensitive text-paper/45"> ({l.actor_email})</span> : null}
                  <span className="text-paper/70"> {l.action.replace(/_/g, " ")}</span>
                  {l.summary ? <span className="adm-sensitive block text-caption text-paper/55">{l.summary}</span> : null}
                  <span className="block text-caption text-paper/40">{new Date(l.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </Card>
  );
}

function HoldRow({
  hold,
  busy,
  run,
}: {
  hold: Hold;
  busy: string | null;
  run: (key: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const reason = hold.reason ?? "words";
  const words = reason === "words";
  const item = hold.post ?? hold.reply;
  const shown = hold.post ? [hold.post.title, hold.post.body].filter(Boolean).join("\n") : (hold.reply?.body ?? "");
  const written = [hold.original_title, hold.original_body].filter(Boolean).join("\n");
  return (
    <li className="rounded-[var(--adm-radius)] border border-paper/10 bg-paper/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2 font-sans text-caption text-paper/55">
        <Pill tone={words ? "gold" : "rose"}>{REASON_LABEL[reason]}</Pill>
        <Pill>{hold.post ? "Post" : "Reply"}</Pill>
        <span className="adm-sensitive">
          {item?.author_name ?? "A reader"}
          {item?.author_handle ? ` @${item.author_handle}` : ""}
        </span>
        <span>· {new Date(hold.created_at).toLocaleString()}</span>
        {item?.status === "removed" ? <Pill tone="rose">removed</Pill> : null}
        {item?.status === "held" ? <Pill>hidden from readers</Pill> : null}
      </div>
      {hold.detail ? <p className="mt-1 font-sans text-caption text-paper/55">{hold.detail}</p> : null}
      <p className="mt-2 whitespace-pre-wrap break-words font-sans text-detail text-paper/85">{shown}</p>
      <div className="mt-2">
        {!words ? null : showOriginal ? (
          <div className="rounded-[var(--adm-radius-sm)] border border-[color:var(--adm-critical)]/30 p-2">
            <p className="font-sans text-caption font-semibold text-paper/55">As written</p>
            <p className="adm-sensitive mt-1 whitespace-pre-wrap break-words font-sans text-detail text-paper/85">{written}</p>
          </div>
        ) : (
          <button type="button" onClick={() => setShowOriginal(true)} className="min-h-11 font-sans text-caption text-paper/55 underline hover:text-paper">
            Show what was written
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ToolbarButton loading={busy === `a:${hold.id}`} onClick={() => run(`a:${hold.id}`, { action: "approve_hold", id: hold.id })}>
          {words ? "Approve as written" : "Approve and show"}
        </ToolbarButton>
        {words ? (
          <ToolbarButton variant="primary" loading={busy === `k:${hold.id}`} onClick={() => run(`k:${hold.id}`, { action: "keep_hold", id: hold.id })}>
            Keep hidden
          </ToolbarButton>
        ) : null}
        <ToolbarButton variant="danger" loading={busy === `r:${hold.id}`} onClick={() => run(`r:${hold.id}`, { action: "remove_hold", id: hold.id })}>
          Remove
        </ToolbarButton>
      </div>
    </li>
  );
}
