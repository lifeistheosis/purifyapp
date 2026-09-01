"use client";

// CommunityTab — owner moderation for the community features: prayer campaigns
// and the Trapeza recipe board. Publish or remove submitted recipes, remove
// reported campaigns, and clear reports. Reads/writes go through
// /api/admin/community (admin-gated, service role). Web only, like the console.

import { useCallback, useEffect, useState } from "react";

import { Card, Pill, ToolbarButton } from "../primitives";
import { MAX_PINNED } from "@/lib/community/pinning";

type PendingRecipe = {
  id: string;
  title: string;
  fast_level: string;
  season: string;
  tradition: string;
  summary: string | null;
  ingredients: string;
  steps: string;
  created_at: string;
};
type CampaignReport = {
  id: string;
  reason: string | null;
  created_at: string;
  campaign: {
    id: string;
    title: string;
    status: string;
    intention: string;
    subject_name: string | null;
    image_url?: string | null;
  } | null;
};
type RecipeReport = {
  id: string;
  reason: string | null;
  created_at: string;
  recipe: { id: string; title: string; status: string } | null;
};
/** A reported Conversations post or reply. Exactly one of post/reply is set. */
type ConversationReport = {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  reason: string | null;
  created_at: string;
  post: {
    id: string;
    kind: string;
    title: string | null;
    body: string | null;
    quote_text: string | null;
    quote_source: string | null;
    author_name: string;
    status: string;
  } | null;
  reply: {
    id: string;
    post_id: string;
    body: string;
    author_name: string;
    status: string;
  } | null;
};
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
  pendingRecipes: PendingRecipe[];
  campaignReports: CampaignReport[];
  recipeReports: RecipeReport[];
  conversationReports: ConversationReport[];
  recentPosts: RecentPost[];
  maxPinned: number;
};

type Action =
  | "publish_recipe"
  | "remove_recipe"
  | "remove_campaign"
  | "dismiss_campaign_report"
  | "dismiss_recipe_report"
  | "remove_community_post"
  | "remove_community_reply"
  | "dismiss_community_report"
  | "pin_community_post"
  | "unpin_community_post";

export function CommunityTab() {
  const [data, setData] = useState<CommunityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/admin/community", { cache: "no-store" });
        if (!alive) return;
        if (!r.ok) {
          setError("Couldn't load (are the campaigns + trapeza migrations applied?).");
          return;
        }
        setData((await r.json()) as CommunityData);
        setError(null);
      } catch {
        if (alive) setError("Couldn't load.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [version]);

  const act = useCallback(
    async (action: Action, id: string, reason?: string) => {
      setBusy(id + action);
      setActionError(null);
      try {
        const r = await fetch("/api/admin/community", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, id, reason: reason ?? null }),
        });
        // THE RESPONSE IS READ NOW. It was awaited and thrown away, so every
        // failure reloaded the queue and looked exactly like a success: the
        // row simply did not change and the operator was told nothing. The
        // pin cap answers 409 with a sentence explaining itself, and that
        // sentence would never have been seen.
        if (!r.ok) {
          const body = (await r.json().catch(() => null)) as {
            error?: string;
          } | null;
          setActionError(body?.error ?? "That didn't go through.");
          return;
        }
        reload();
      } catch {
        setActionError("That didn't go through.");
      } finally {
        setBusy(null);
      }
    },
    [reload],
  );

  if (error) {
    return <p className="font-sans text-detail text-[color:var(--adm-critical)]">{error}</p>;
  }
  if (!data) {
    return <p className="font-sans text-detail text-paper/40">Loading…</p>;
  }

  const pinned = (data.recentPosts ?? []).filter((p) => p.pinned_at);
  const unpinned = (data.recentPosts ?? []).filter((p) => !p.pinned_at);
  const atCap = pinned.length >= (data.maxPinned ?? MAX_PINNED);

  return (
    <div className="space-y-6">
      {actionError && (
        <p
          role="alert"
          className="font-sans text-detail text-[color:var(--adm-critical)]"
        >
          {actionError}
        </p>
      )}

      {/* ── Announcements ────────────────────────────────────────────────
          An announcement is an ordinary post that has been pinned, not a
          separate kind of thing. That is what lets it keep replies, reactions,
          reporting and removal without any of them being reimplemented, and it
          is why this card lists real posts rather than offering a compose box:
          the owner writes in the community like everyone else, then raises it
          here. */}
      <Card
        title="Announcements"
        subtitle={`Pinned to the top of the feed for every reader. ${data.maxPinned ?? MAX_PINNED} at once, newest first`}
        accent={pinned.length > 0}
      >
        {pinned.length === 0 ? (
          <p className="font-sans text-detail text-paper/40">
            Nothing pinned. The feed is in plain reverse-chronological order.
          </p>
        ) : (
          <ul className="space-y-2">
            {pinned.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-[var(--adm-radius-sm)] border p-2.5"
                style={{
                  borderColor: "color-mix(in oklab, var(--adm-accent), transparent 60%)",
                  background:
                    "color-mix(in oklab, var(--adm-accent), var(--adm-panel) 94%)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <PostLine post={p} />
                  <p className="mt-1 font-sans text-[11.5px] text-paper/45">
                    Pinned {shortWhen(p.pinned_at)}
                    {/* pinned_by is an internal address. It is shown HERE and
                        nowhere a reader can reach, which is the whole reason
                        the public feed projects a boolean instead of the row. */}
                    {p.pinned_by ? ` by ${p.pinned_by}` : ""}
                  </p>
                </div>
                <ToolbarButton
                  loading={busy === p.id + "unpin_community_post"}
                  title="Take this out of the announcement slot"
                  onClick={() => void act("unpin_community_post", p.id)}
                >
                  Unpin
                </ToolbarButton>
              </li>
            ))}
          </ul>
        )}

        <p className="mb-2 mt-5 font-sans text-[12px] text-paper/45">
          Recent posts
        </p>
        {unpinned.length === 0 ? (
          <p className="font-sans text-detail text-paper/40">
            No posts yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {unpinned.slice(0, 12).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-[var(--adm-radius-sm)] border p-2.5"
                style={{ borderColor: "var(--adm-line)" }}
              >
                <div className="min-w-0 flex-1">
                  <PostLine post={p} />
                </div>
                <ToolbarButton
                  variant="primary"
                  loading={busy === p.id + "pin_community_post"}
                  // Disabled at the cap rather than hidden, with the reason on
                  // the button. A control that vanishes reads as a bug; one
                  // that explains itself reads as a rule.
                  title={
                    atCap
                      ? `Unpin one first. ${data.maxPinned ?? MAX_PINNED} is the limit.`
                      : "Put this at the top of the feed"
                  }
                  onClick={() => {
                    if (atCap) return;
                    void act("pin_community_post", p.id);
                  }}
                >
                  {atCap ? "At limit" : "Pin"}
                </ToolbarButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* First, because until now this queue had nowhere to live: the tab
          named "Community" covered campaigns and Trapeza only, so a
          reported Conversations post could be acted on only in the SQL
          editor. Conversations is live in the Android build. */}
      <Card
        title="Reported conversations"
        subtitle="Posts and replies readers have flagged. Removing hides it from everyone and keeps the row."
        accent={data.conversationReports.length > 0}
      >
        {data.conversationReports.length === 0 ? (
          <Empty>Nothing reported.</Empty>
        ) : (
          <div className="space-y-3">
            {data.conversationReports.map((rep) => {
              const isReply = Boolean(rep.reply_id);
              const target = isReply ? rep.reply : rep.post;
              const text = isReply
                ? rep.reply?.body
                : rep.post?.body || rep.post?.quote_text || rep.post?.title;
              const alreadyRemoved = target?.status === "removed";
              return (
                <div
                  key={rep.id}
                  className="rounded-[var(--adm-radius)] border border-paper/10 bg-paper/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={isReply ? "neutral" : "gold"}>
                      {isReply ? "reply" : rep.post?.kind ?? "post"}
                    </Pill>
                    {alreadyRemoved && <Pill tone="rose">already removed</Pill>}
                    <span className="font-sans text-caption text-paper/45">
                      {target?.author_name ?? "unknown"} ·{" "}
                      {new Date(rep.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="mt-2 font-sans text-detail text-paper/80 line-clamp-4">
                    {text || <span className="italic text-paper/40">(no text)</span>}
                  </p>
                  {rep.post?.quote_source && (
                    <p className="mt-1 font-sans text-caption text-paper/45">
                      {rep.post.quote_source}
                    </p>
                  )}
                  {rep.reason && (
                    <p className="mt-2 font-sans text-caption text-[color:color-mix(in_oklab,var(--adm-critical),transparent_20%)]">
                      Reason: {rep.reason}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!alreadyRemoved && (
                      <ToolbarButton
                        variant="danger"
                        loading={
                          busy ===
                          (isReply ? rep.reply_id : rep.post_id) +
                            (isReply
                              ? "remove_community_reply"
                              : "remove_community_post")
                        }
                        onClick={() =>
                          act(
                            isReply
                              ? "remove_community_reply"
                              : "remove_community_post",
                            (isReply ? rep.reply_id : rep.post_id) as string,
                            rep.reason ?? undefined,
                          )
                        }
                      >
                        Remove {isReply ? "reply" : "post"}
                      </ToolbarButton>
                    )}
                    <ToolbarButton
                      loading={busy === rep.id + "dismiss_community_report"}
                      onClick={() => act("dismiss_community_report", rep.id)}
                    >
                      Dismiss
                    </ToolbarButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card
        title="Pending recipes"
        subtitle="Submissions waiting to join the Trapeza. Publish or remove."
        accent={data.pendingRecipes.length > 0}
      >
        {data.pendingRecipes.length === 0 ? (
          <Empty>Nothing waiting.</Empty>
        ) : (
          <div className="space-y-3">
            {data.pendingRecipes.map((r) => (
              <div
                key={r.id}
                className="rounded-[var(--adm-radius)] border border-paper/10 bg-paper/[0.02] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-sans text-detail font-semibold text-paper">
                    {r.title}
                  </p>
                  <div className="flex gap-2">
                    <ToolbarButton
                      variant="primary"
                      loading={busy === r.id + "publish_recipe"}
                      onClick={() => act("publish_recipe", r.id)}
                    >
                      Publish
                    </ToolbarButton>
                    <ToolbarButton
                      variant="danger"
                      loading={busy === r.id + "remove_recipe"}
                      onClick={() => act("remove_recipe", r.id)}
                    >
                      Remove
                    </ToolbarButton>
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Pill tone="gold">{r.fast_level}</Pill>
                  {r.season !== "any" ? <Pill>{r.season}</Pill> : null}
                  {r.tradition !== "any" ? <Pill>{r.tradition}</Pill> : null}
                </div>
                {r.summary ? (
                  <p className="mt-2 font-sans text-eyebrow text-paper/55">
                    {r.summary}
                  </p>
                ) : null}
                <details className="mt-2">
                  <summary className="cursor-pointer font-sans text-eyebrow text-paper/45">
                    Ingredients and method
                  </summary>
                  <p className="mt-1.5 whitespace-pre-line font-sans text-eyebrow text-paper/60">
                    {r.ingredients}
                    {"\n\n"}
                    {r.steps}
                  </p>
                </details>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Reported campaigns"
        subtitle="Prayer campaigns flagged by the community."
        accent={data.campaignReports.length > 0}
      >
        {data.campaignReports.length === 0 ? (
          <Empty>No reports.</Empty>
        ) : (
          <div className="space-y-3">
            {data.campaignReports.map((rep) => (
              <ReportRow
                key={rep.id}
                title={rep.campaign?.title ?? "(deleted campaign)"}
                status={rep.campaign?.status}
                reason={rep.reason}
                busy={busy}
                media={
                  // A reported campaign is often reported FOR its picture, so
                  // show it here rather than making the owner open the public
                  // page to find out what was flagged.
                  rep.campaign?.image_url ? (
                    <a
                      href={rep.campaign.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-24 shrink-0 overflow-hidden rounded-[var(--adm-radius-sm)] border border-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rep.campaign.image_url}
                        alt={`Attached to the reported campaign ${rep.campaign.title}`}
                        className="h-20 w-full object-cover"
                      />
                    </a>
                  ) : null
                }
                actions={
                  <>
                    {rep.campaign && rep.campaign.status !== "removed" ? (
                      <ToolbarButton
                        variant="danger"
                        loading={busy === rep.campaign.id + "remove_campaign"}
                        onClick={() => {
                          if (rep.campaign) void act("remove_campaign", rep.campaign.id);
                        }}
                      >
                        Remove campaign
                      </ToolbarButton>
                    ) : null}
                    <ToolbarButton
                      loading={busy === rep.id + "dismiss_campaign_report"}
                      onClick={() => act("dismiss_campaign_report", rep.id)}
                    >
                      Dismiss
                    </ToolbarButton>
                  </>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Reported recipes"
        subtitle="Recipes flagged by the community."
        accent={data.recipeReports.length > 0}
      >
        {data.recipeReports.length === 0 ? (
          <Empty>No reports.</Empty>
        ) : (
          <div className="space-y-3">
            {data.recipeReports.map((rep) => (
              <ReportRow
                key={rep.id}
                title={rep.recipe?.title ?? "(deleted recipe)"}
                status={rep.recipe?.status}
                reason={rep.reason}
                busy={busy}
                actions={
                  <>
                    {rep.recipe && rep.recipe.status !== "removed" ? (
                      <ToolbarButton
                        variant="danger"
                        loading={busy === rep.recipe.id + "remove_recipe"}
                        onClick={() => {
                          if (rep.recipe) void act("remove_recipe", rep.recipe.id);
                        }}
                      >
                        Remove recipe
                      </ToolbarButton>
                    ) : null}
                    <ToolbarButton
                      loading={busy === rep.id + "dismiss_recipe_report"}
                      onClick={() => act("dismiss_recipe_report", rep.id)}
                    >
                      Dismiss
                    </ToolbarButton>
                  </>
                }
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ReportRow({
  title,
  status,
  reason,
  actions,
  media,
}: {
  title: string;
  status?: string;
  reason: string | null;
  busy: string | null;
  actions: React.ReactNode;
  /** Optional thumbnail of the reported content, shown beside the row. */
  media?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--adm-radius)] border border-paper/10 bg-paper/[0.02] p-4">
      <div className="flex gap-3">
        {media}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-detail font-semibold text-paper">
              {title}
              {status ? (
                <span className="ml-2 font-normal text-paper/40">· {status}</span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
          {reason ? (
            <p className="mt-1.5 font-sans text-eyebrow text-paper/55">
              Reason: {reason}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-detail text-paper/40">{children}</p>;
}

/** One post, identified the way a reader would recognise it. */
function PostLine({ post }: { post: RecentPost }) {
  const text = (post.title?.trim() || post.body?.trim() || "").replace(/\s+/g, " ");
  return (
    <>
      <p className="font-sans text-detail text-paper/85">
        {text ? (
          text.length > 120 ? `${text.slice(0, 120)}…` : text
        ) : (
          <span className="text-paper/40">Untitled</span>
        )}
      </p>
      <p className="mt-0.5 font-sans text-[11.5px] text-paper/45">
        {post.author_name} · {post.kind} · {shortWhen(post.created_at)}
        {post.reply_count > 0 ? ` · ${post.reply_count} replies` : ""}
      </p>
    </>
  );
}

function shortWhen(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
