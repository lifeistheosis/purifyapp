"use client";

// Community, his pick A on r3-17 (2026-10-30): one queue.
//
// "Moderation is a queue: most days it says so in one line, and on a busy
// one you clear it from the top without leaving the row." Waiting is
// everything that waits for a decision in one list, one row per thing (a
// post held by the filter and reported three times is one row, never four),
// oldest first, the oldest lit, its buttons on the row. A removal waits ten
// seconds with Undo before it is written. Dismissing keeps a record: a
// community report is kept as dismissed, and a recipe or campaign report,
// which the route deletes, is written to the moderation log first.
//
// The page's other parts sit in the same switch: Announcements (what is
// pinned), Filter and log (the team's words, handles to reset, the log),
// Kitchen photos (the newest reviews and each recipe's photo) and
// Ambassadors, kept small, whose Pay now asks first. On a phone the switch
// is one select.
//
// #tab=ambassadors lands here on Ambassadors. The rows are
// lib/admin/communityQueue.ts; the rail's badge counts the same rows.

import { useCallback, useEffect, useState } from "react";

import {
  buildQueue,
  type QueueAction,
  type QueueRow,
  type CampaignReportIn,
  type HoldIn,
  type RecipeIn,
  type RecipeReportIn,
  type ReportIn,
} from "@/lib/admin/communityQueue";
import { MAX_PINNED } from "@/lib/community/pinning";

import { AmbassadorsPart } from "../community/Ambassadors";
import { QueueList } from "../community/Queue";
import { runCalls, usePendingRemovals } from "../community/usePendingRemovals";
import { Select, SubTabs, ToolbarButton } from "../primitives";
import { CommunityFilterPanel, type FilterData } from "./CommunityFilterPanel";
import { KitchenModeration, type KitchenBlock } from "./KitchenModeration";
import { BOX, BOX_STYLE, ink, ink2, ink3, line } from "../tools/look";

/** A post the owner can put at the top of the feed. */
type RecentPost = {
  id: string;
  kind: string;
  title: string | null;
  body: string | null;
  author_name: string;
  created_at: string;
  pinned_at: string | null;
  /** Admin email. Behind the admin gate, and never sent to a reader. */
  pinned_by: string | null;
  reply_count: number;
};

type CommunityData = {
  pendingRecipes: RecipeIn[];
  campaignReports: CampaignReportIn[];
  recipeReports: RecipeReportIn[];
  conversationReports: ReportIn[];
  recentPosts: RecentPost[];
  maxPinned: number;
  kitchen?: KitchenBlock;
};

export type CommunityPart = "waiting" | "announcements" | "filter" | "kitchen" | "ambassadors";

const COMMUNITY = "/api/admin/community";

async function readJson<T>(url: string): Promise<{ data: T } | { error: string }> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!r.ok || !j) return { error: j?.error ?? "Could not be read." };
    return { data: j };
  } catch {
    return { error: "Could not be read." };
  }
}

/** How many decisions the log holds from the last seven days. */
function decidedThisWeek(log: FilterData["log"]): { n: number; more: boolean } | null {
  if (!log) return null;
  const since = Date.now() - 7 * 86_400_000;
  const n = log.filter((l) => Date.parse(l.created_at) >= since).length;
  // The route sends the newest forty lines: all forty inside the week means
  // there were at least that many.
  return { n, more: n >= log.length && log.length >= 40 };
}

export function CommunityTab() {
  return <CommunityPage />;
}

export function CommunityPage({ part: first = "waiting" }: { part?: CommunityPart }) {
  const [part, setPart] = useState<CommunityPart>(first);
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterData | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [decided, setDecided] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [c, f] = await Promise.all([
        readJson<CommunityData>(COMMUNITY),
        readJson<FilterData>("/api/admin/community/filter"),
      ]);
      if (!alive) return;
      if ("data" in c) {
        setCommunity(c.data);
        setCommunityError(null);
      } else {
        setCommunityError("The moderation queue could not be read. This is not an empty queue.");
      }
      if ("data" in f) {
        setFilter(f.data);
        setFilterError(null);
      } else {
        setFilterError(f.error);
      }
      // A fresh read is the truth: what was decided is gone from it, or
      // back as what is left to decide.
      setDecided({});
    })();
    return () => {
      alive = false;
    };
  }, [version]);

  const onWritten = useCallback(
    (key: string, err: string | null) => {
      if (err) setErrors((e) => ({ ...e, [key]: err }));
      else {
        setDecided((d) => ({ ...d, [key]: "Removed." }));
        reload();
      }
    },
    [reload],
  );
  const removals = usePendingRemovals(onWritten);

  async function decide(row: QueueRow, action: QueueAction) {
    setErrors((e) => {
      const next = { ...e };
      delete next[row.key];
      return next;
    });
    if (action.removal) {
      removals.schedule(row.key, action);
      return;
    }
    setBusy(row.key + action.id);
    const err = await runCalls(action.calls);
    setBusy(null);
    if (err) setErrors((e) => ({ ...e, [row.key]: err }));
    else {
      setDecided((d) => ({ ...d, [row.key]: action.done }));
      reload();
    }
  }

  async function pin(action: "pin_community_post" | "unpin_community_post", id: string) {
    setBusy(id + action);
    const err = await runCalls([{ url: COMMUNITY, body: { action, id } }]);
    setBusy(null);
    if (err) setErrors((e) => ({ ...e, [`pin:${id}`]: err }));
    else reload();
  }

  const rows = community
    ? buildQueue({
        holds: ((filter?.holds ?? []) as HoldIn[]),
        reports: community.conversationReports,
        pendingRecipes: community.pendingRecipes,
        campaignReports: community.campaignReports,
        recipeReports: community.recipeReports,
        reviewReports: community.kitchen?.reviewReports ?? [],
      })
    : [];
  const waitingNow = rows.filter((r) => !decided[r.key] && !removals.pending[r.key]).length;
  const week = decidedThisWeek(filter?.log);
  const weekLine = week ? `Decided this week: ${week.n}${week.more ? " or more" : ""}. ` : "";

  const parts: [CommunityPart, string][] = [
    ["waiting", community ? `Waiting ${waitingNow}` : "Waiting"],
    ["announcements", "Announcements"],
    ["filter", "Filter and log"],
    ["kitchen", "Kitchen photos"],
    ["ambassadors", "Ambassadors"],
  ];

  return (
    <div className="space-y-4">
      {/* One switch for the page's parts: joined segments on a computer, one
          select on a phone, as the sheet draws it. */}
      <div className="hidden md:block">
        <SubTabs<CommunityPart> tabs={parts} active={part} onChange={setPart} />
      </div>
      <div className="md:hidden">
        <Select<CommunityPart>
          ariaLabel="Part of Community"
          value={part}
          onChange={setPart}
          options={parts.map(([value, label]) => ({
            value,
            label: value === "waiting" && community ? `Waiting · ${waitingNow} to decide` : label,
          }))}
        />
      </div>

      {part === "waiting" ? (
        <section className="space-y-3">
          {communityError ? (
            <p role="alert" className="font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
              {communityError}
            </p>
          ) : !community ? (
            <p className="font-sans text-[12.5px]" style={ink3}>
              Reading the queue.
            </p>
          ) : (
            <>
              {filterError ? (
                <p role="alert" className="font-sans text-[12.5px]" style={{ color: "var(--adm-warn)" }}>
                  What the word filter holds could not be read, so posts it holds are missing from this list. {filterError}
                </p>
              ) : null}
              {rows.length === 0 ? (
                <p className={`${BOX} px-4 py-3 font-sans text-[13.5px]`} style={{ ...BOX_STYLE, ...ink }}>
                  Nothing waits.
                </p>
              ) : (
                <QueueList
                  rows={rows}
                  busy={busy}
                  errors={errors}
                  decided={decided}
                  waiting={(key) => (removals.pending[key] ? removals.seconds(key) : null)}
                  onAction={(row, action) => void decide(row, action)}
                  onUndo={removals.undo}
                />
              )}
              <p className="font-sans text-[12px]" style={ink3}>
                {weekLine}A removal waits ten seconds, with Undo, before it is written.
              </p>
            </>
          )}
        </section>
      ) : null}

      {part === "announcements" ? (
        community ? (
          <Announcements posts={community.recentPosts ?? []} max={community.maxPinned ?? MAX_PINNED} busy={busy} errors={errors} pin={pin} />
        ) : (
          <p className="font-sans text-[12.5px]" style={communityError ? { color: "var(--adm-critical)" } : ink3}>
            {communityError ?? "Reading the posts."}
          </p>
        )
      ) : null}

      {part === "filter" ? (
        filter ? (
          <CommunityFilterPanel data={filter} onChanged={reload} />
        ) : (
          <p className="font-sans text-[12.5px]" style={filterError ? { color: "var(--adm-critical)" } : ink3}>
            {filterError ?? "Reading the filter."}
          </p>
        )
      ) : null}

      {part === "kitchen" ? (
        community?.kitchen ? (
          <KitchenModeration
            kitchen={community.kitchen}
            busy={busy}
            showReported={false}
            reload={reload}
            act={(action, id) => {
              if (action !== "remove_review") return;
              removals.schedule(`review:${id}`, {
                id: "remove",
                label: "Remove review",
                tone: "danger",
                removal: true,
                calls: [{ url: COMMUNITY, body: { action: "remove_review", id } }],
                done: "Removed, with its photos.",
              });
            }}
            waitingOn={(id) =>
              removals.pending[`review:${id}`] ? { seconds: removals.seconds(`review:${id}`), undo: () => removals.undo(`review:${id}`) } : null
            }
          />
        ) : (
          <p className="font-sans text-[12.5px]" style={communityError ? { color: "var(--adm-critical)" } : ink3}>
            {communityError ?? (community ? "The Kitchen switches on with 20260928000000_kitchen.sql." : "Reading the Kitchen.")}
          </p>
        )
      ) : null}

      {part === "ambassadors" ? <AmbassadorsPart /> : null}
    </div>
  );
}

/**
 * What is pinned above the feed, and the recent posts that could be. An
 * announcement is an ordinary post that has been pinned, so it keeps
 * replies, reporting and removal like any other; the owner writes in the
 * community like everyone else, then raises it here.
 */
function Announcements({
  posts,
  max,
  busy,
  errors,
  pin,
}: {
  posts: RecentPost[];
  max: number;
  busy: string | null;
  errors: Record<string, string>;
  pin: (action: "pin_community_post" | "unpin_community_post", id: string) => Promise<void>;
}) {
  const pinned = posts.filter((p) => p.pinned_at);
  const recent = posts.filter((p) => !p.pinned_at).slice(0, 12);
  const atCap = pinned.length >= max;
  const row = (p: RecentPost, i: number, button: React.ReactNode) => {
    const text = (p.title?.trim() || p.body?.trim() || "").replace(/\s+/g, " ");
    return (
      <li key={p.id} className={`flex flex-wrap items-start gap-3 px-4 py-2.5 ${i ? "border-t" : ""}`} style={line}>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[13px]" style={ink}>
            {text ? (text.length > 120 ? `${text.slice(0, 120)}…` : text) : <span style={ink3}>Untitled</span>}
          </p>
          <p className="mt-0.5 font-sans text-[11.5px]" style={ink3}>
            {p.author_name} · {p.kind} · {new Date(p.created_at).toLocaleDateString()}
            {p.reply_count > 0 ? ` · ${p.reply_count} replies` : ""}
            {p.pinned_at ? ` · pinned ${new Date(p.pinned_at).toLocaleDateString()}${p.pinned_by ? ` by ${p.pinned_by}` : ""}` : ""}
          </p>
          {errors[`pin:${p.id}`] ? (
            <p role="alert" className="mt-1 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
              {errors[`pin:${p.id}`]}
            </p>
          ) : null}
        </div>
        {button}
      </li>
    );
  };
  return (
    <div className="space-y-4">
      <p className="font-sans text-[12.5px]" style={ink2}>
        {pinned.length === 0
          ? "Nothing is pinned: the feed is in plain newest-first order."
          : `${pinned.length} of ${max} pinned to the top of the feed for every reader, newest first.`}
      </p>
      {pinned.length > 0 ? (
        <ul className={BOX} style={BOX_STYLE}>
          {pinned.map((p, i) =>
            row(
              p,
              i,
              <ToolbarButton loading={busy === p.id + "unpin_community_post"} onClick={() => void pin("unpin_community_post", p.id)}>
                Unpin
              </ToolbarButton>,
            ),
          )}
        </ul>
      ) : null}
      <p className="font-sans text-[12px] font-semibold" style={ink2}>
        Recent posts
      </p>
      {recent.length === 0 ? (
        <p className="font-sans text-[12.5px]" style={ink3}>
          No posts yet.
        </p>
      ) : (
        <ul className={BOX} style={BOX_STYLE}>
          {recent.map((p, i) =>
            row(
              p,
              i,
              <ToolbarButton
                loading={busy === p.id + "pin_community_post"}
                title={atCap ? `Unpin one first. ${max} is the limit.` : "Put this at the top of the feed"}
                onClick={() => {
                  if (!atCap) void pin("pin_community_post", p.id);
                }}
              >
                {atCap ? "At the limit" : "Pin"}
              </ToolbarButton>,
            ),
          )}
        </ul>
      )}
    </div>
  );
}
