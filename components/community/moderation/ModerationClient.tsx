"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CampaignModeration, campaignsWaitingCount } from "@/components/campaigns/CampaignModeration";
import { CareNoteButton } from "@/components/campaigns/CareNoteButton";
import { TickLines } from "@/components/campaigns/TickLines";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { SkeletonList } from "@/components/ui/Skeleton";
import { dangerFirst, saysDanger } from "@/lib/campaigns/safety";
import { cn } from "@/lib/cn";
import {
  fetchModQueue,
  moderate,
  type ModAction,
  type ModHold,
  type ModLogLine,
  type ModQueue,
  type ModReport,
} from "@/lib/community/client";
import { DEFAULT_REMOVAL_REASON, REMOVAL_REASONS, REMOVAL_REASON_WORDS, type RemovalReason } from "@/lib/community/removal";
import { timeAgo } from "@/lib/community/types";

/**
 * The moderation queue, for readers who hold the Moderator badge and for
 * the team, on any device (app/api/community/moderation).
 *
 * Two lists. WAITING: what the filters held (masked words, spam, a new
 * account's link, something readers' reports hid) and what readers
 * reported. LOG: who did what, the filters' own actions included, newest
 * first. Every button here is one of the actions the team's console takes
 * (lib/community/moderation.ts), and each lands in the log under the name of
 * whoever pressed it.
 *
 * Removing asks first; everything else is a single tap, because each can be
 * undone from the console and the queue should move quickly on a phone.
 */

type Loaded =
  | { state: "loading" }
  | { state: "ok"; queue: ModQueue }
  | { state: "signed-out" | "not-moderator" | "error"; message?: string };

type Pending = { action: ModAction; id: string; label: string } | null;

/**
 * The reasons offered for removing words the safety line held: the list a
 * removal's notice says, without the one that stands for "none was chosen".
 * Such words are never removed as against the house rules (the moderators'
 * rule, lib/community/dangerHolds.ts); if no rule is broken they are
 * approved, or left waiting.
 */
const DANGER_REASONS = REMOVAL_REASONS.filter((r) => r !== DEFAULT_REMOVAL_REASON);

export function ModerationClient() {
  const { t } = useTranslate();
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [tab, setTab] = useState<"waiting" | "log">("waiting");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Pending>(null);
  // A removal that must say why: what is being removed, and the reason chosen so far.
  const [reasoning, setReasoning] = useState<{ action: ModAction; id: string } | null>(null);
  const [reason, setReason] = useState<RemovalReason | null>(null);

  const load = useCallback(async () => {
    const res = await fetchModQueue();
    if (res.ok) setLoaded({ state: "ok", queue: res.queue });
    else
      setLoaded((prev) =>
        prev.state === "ok" && res.status !== 401 && res.status !== 404
          ? prev
          : { state: res.status === 401 ? "signed-out" : res.status === 404 ? "not-moderator" : "error", message: res.error },
      );
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await fetchModQueue();
      if (!alive) return;
      if (res.ok) setLoaded({ state: "ok", queue: res.queue });
      else setLoaded({ state: res.status === 401 ? "signed-out" : res.status === 404 ? "not-moderator" : "error", message: res.error });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const askReason = (action: ModAction, id: string) => {
    setReason(null);
    setReasoning({ action, id });
  };

  async function act(action: ModAction, id: string, code?: RemovalReason) {
    setBusy(`${action}:${id}`);
    setNotice(null);
    const res = await moderate(action, id, null, code ?? null);
    setBusy(null);
    if (!res.ok) {
      // The server holds the rule on every path: where it asks for a reason, the list is shown.
      if (res.code === "reason_needed") {
        askReason(action, id);
        return;
      }
      setNotice(res.error ?? t("mod.failed"));
      return;
    }
    setNotice(t("mod.done"));
    await load();
  }

  const queue: ModQueue | null = loaded.state === "ok" ? loaded.queue : null;

  function ask(action: ModAction, id: string, label: string) {
    // Words that may mean danger are removed only for a chosen reason: the list, and no plain "Remove this?".
    if (action === "remove_hold" && queue?.holds.some((h) => h.id === id && saysDanger(h.detail))) askReason(action, id);
    else if (action === "remove_post" || action === "remove_reply" || action === "remove_hold") setConfirming({ action, id, label });
    else void act(action, id);
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-20 pt-8 md:pt-12">
      <Link href="/community#conversations" className="font-sans text-detail text-paper/60 hover:text-paper">
        {t("mod.back")}
      </Link>
      <h1 className="mt-3 text-heading leading-[1.1] text-paper">{t("mod.title")}</h1>

      {loaded.state === "loading" ? (
        <div className="mt-6" aria-busy aria-label={t("mod.loading")}>
          <SkeletonList rows={4} />
        </div>
      ) : loaded.state === "signed-out" ? (
        <Gate text={t("mod.signedOut")} href="/signin?next=/community/moderate" cta={t("community.signIn")} />
      ) : loaded.state === "not-moderator" ? (
        <Gate text={t("mod.notModerator")} href="/community#conversations" cta={t("mod.back")} />
      ) : loaded.state === "error" ? (
        <div className="mt-6 rounded-2xl border border-paper/10 bg-black/20 p-6 text-center">
          <p className="font-sans text-ui text-paper/75">{t("mod.loadFailed")}</p>
          <button
            type="button"
            onClick={() => {
              setLoaded({ state: "loading" });
              void load();
            }}
            className="mt-3 inline-flex items-center rounded-pill bg-paper px-5 py-2 font-sans text-ui font-semibold text-night"
          >
            {t("community.tryAgain")}
          </button>
        </div>
      ) : queue ? (
        <>
          <p className="mt-2 max-w-[560px] font-sans text-ui leading-relaxed text-paper/60">
            {t("mod.subtitle", { name: queue.me.name })}
          </p>

          <div role="tablist" aria-label={t("mod.title")} className="mt-6 inline-flex gap-1 rounded-pill border border-paper/12 bg-paper/[0.03] p-1">
            {(
              [
                ["waiting", t("mod.tabWaiting", { count: queue.holds.length + queue.reports.length + campaignsWaitingCount(queue.campaigns) })],
                ["log", t("mod.tabLog")],
              ] as ["waiting" | "log", string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-pill px-4 py-1.5 font-sans text-detail font-semibold transition-colors",
                  tab === id ? "bg-paper text-night" : "text-paper/65 hover:text-paper",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {notice ? (
            <p role="status" className="mt-4 font-sans text-detail text-paper/75">
              {notice}
            </p>
          ) : null}

          {tab === "waiting" ? (
            <div className="mt-5 space-y-3">
              {queue.holds.length === 0 && queue.reports.length === 0 && campaignsWaitingCount(queue.campaigns) === 0 ? (
                <p className="py-10 text-center font-sans text-ui text-paper/55">{t("mod.nothing")}</p>
              ) : null}
              {/* Prayer campaigns waiting to be read, and those reported (1.9):
                  first, since one may mean its writer is in danger. Nothing
                  unless campaigns are open for this moderator. */}
              <CampaignModeration queue={queue.campaigns} onDone={load} onNotice={setNotice} />
              {/* A hold whose words may mean danger is read before the others (lib/campaigns/safety.ts). */}
              {dangerFirst(queue.holds).map((h) => (
                <HoldCard key={h.id} hold={h} busy={busy} onAct={ask} care={queue.campaigns?.care === true} onNotice={setNotice} />
              ))}
              {queue.reports.map((r) => (
                <ReportCard key={r.id} report={r} busy={busy} onAct={ask} />
              ))}
            </div>
          ) : (
            <LogList rows={queue.log} />
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={confirming !== null}
        title={t("mod.removeTitle")}
        description={t("mod.removeBody")}
        confirmLabel={confirming?.label ?? t("mod.remove")}
        cancelLabel={t("common.cancel")}
        destructive
        pending={busy !== null}
        onConfirm={() => {
          const c = confirming;
          setConfirming(null);
          if (c) void act(c.action, c.id);
        }}
        onCancel={() => setConfirming(null)}
      />

      {/* Why it is removed, where that has to be chosen. The reasons are the
          panel's own words, in English as the panel has them. */}
      <Sheet open={reasoning !== null} onClose={() => setReasoning(null)} title={t("mod.removeTitle")} desktop openFull>
        <p id="mod-removal-reason" className="sr-only">
          {t("mod.removeTitle")}
        </p>
        <div data-mod-removal-reason="" className="pb-1 pt-1">
          <TickLines value={reason} options={DANGER_REASONS.map((r) => ({ id: r, label: REMOVAL_REASON_WORDS[r] }))} onChange={setReason} labelledBy="mod-removal-reason" />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!reason || busy !== null}
              onClick={() => {
                const r = reasoning;
                const code = reason;
                setReasoning(null);
                if (r && code) void act(r.action, r.id, code);
              }}
              className="inline-flex min-h-11 items-center rounded-pill border border-crimson/50 px-5 font-sans text-detail font-semibold text-crimson-soft transition-colors hover:border-crimson disabled:opacity-50"
            >
              {t("mod.remove")}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function Gate({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-6 text-center">
      <p className="font-sans text-ui text-paper/75">{text}</p>
      <Link href={href} className="mt-3 inline-flex items-center rounded-pill bg-paper px-5 py-2 font-sans text-ui font-semibold text-night">
        {cta}
      </Link>
    </div>
  );
}

const REASON_TONE: Record<ModHold["reason"], string> = {
  words: "border-premium/40 text-premium-ink",
  spam: "border-crimson/50 text-crimson-soft",
  links: "border-link-soft/40 text-link-soft",
  new_account: "border-sage/40 text-sage-soft",
  reports: "border-crimson/50 text-crimson-soft",
};

/** The mark of a hold whose words may mean danger: the campaigns' own strong tone (components/campaigns/CampaignModeration.tsx). */
const DANGER_TONE = "border-paper/60 text-paper";

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-pill border px-2.5 py-0.5 font-sans text-eyebrow font-semibold", className)}>
      {children}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  busy,
  danger = false,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  danger?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-detail font-semibold transition-colors disabled:opacity-50",
        primary
          ? "bg-paper text-night hover:bg-paper/90"
          : danger
            ? "border border-crimson/50 text-crimson-soft hover:border-crimson"
            : "border border-paper/20 text-paper/85 hover:border-paper/40",
      )}
    >
      {label}
    </button>
  );
}

function HoldCard({
  hold,
  busy,
  onAct,
  care,
  onNotice,
}: {
  hold: ModHold;
  busy: string | null;
  onAct: (action: ModAction, id: string, label: string) => void;
  /** Whether the server says the care note can be sent (the campaigns' part of the queue says so, lib/campaigns/careOn.ts). */
  care: boolean;
  onNotice: (message: string | null) => void;
}) {
  const { t } = useTranslate();
  const target = hold.post ?? hold.reply;
  // A prayer request's words (1.7.1) are held like a post's: who asked, and the words as shown now.
  const request = hold.profile ?? null;
  const shownText = request
    ? request.intention
    : hold.post
      ? hold.post.title || hold.post.body || hold.post.quote_text
      : hold.reply?.body;
  const words = hold.reason === "words";
  const danger = saysDanger(hold.detail);
  const isBusy = (a: ModAction) => busy === `${a}:${hold.id}`;
  const authorName = request ? request.name : target?.author_name;
  const authorHandle = request ? request.handle : target?.author_handle;
  return (
    <article className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Words that may mean danger are filed under a reason the table allows, and say what they are here. */}
        {danger ? <Chip className={DANGER_TONE}>{t("mod.campaignCrisis")}</Chip> : <Chip className={REASON_TONE[hold.reason]}>{t(`mod.reason.${hold.reason}`)}</Chip>}
        <Chip className="border-paper/15 text-paper/60">{request ? t("mod.prayerRequest") : hold.post ? t("mod.post") : t("mod.reply")}</Chip>
        {target?.status === "held" ? <Chip className="border-paper/15 text-paper/60">{t("mod.hidden")}</Chip> : null}
        <span className="font-sans text-caption text-paper/45">
          {authorName ?? t("mod.unknown")}
          {authorHandle ? ` @${authorHandle}` : ""} · {timeAgo(hold.created_at)}
        </span>
      </div>
      {hold.detail ? <p className="mt-2 font-sans text-caption text-paper/55">{hold.detail}</p> : null}
      {words ? (
        <div className="mt-3 space-y-2">
          <p className="font-sans text-eyebrow font-semibold text-paper/50">{t("mod.asWritten")}</p>
          <p className="whitespace-pre-wrap break-words rounded-lg border border-paper/10 bg-black/25 p-3 font-sans text-detail text-paper/85">
            {[hold.original_title, hold.original_body].filter(Boolean).join("\n\n")}
          </p>
          <p className="font-sans text-eyebrow font-semibold text-paper/50">{t("mod.asShown")}</p>
          <p className="line-clamp-4 whitespace-pre-wrap break-words font-sans text-detail text-paper/60">{shownText}</p>
        </div>
      ) : (
        <p className="mt-3 line-clamp-6 whitespace-pre-wrap break-words rounded-lg border border-paper/10 bg-black/25 p-3 font-sans text-detail text-paper/85">
          {shownText || t("mod.noText")}
        </p>
      )}
      {/* The care note, only for words the safety line marked (components/campaigns/CareNoteButton.tsx), above the decisions. */}
      {care && danger ? <CareNoteButton target="hold" id={hold.id} onNotice={onNotice} /> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton
          primary
          label={words ? t("mod.approveWords") : t("mod.approve")}
          busy={isBusy("approve_hold")}
          onClick={() => onAct("approve_hold", hold.id, t("mod.approve"))}
        />
        {words ? (
          <ActionButton label={t("mod.keepMasked")} busy={isBusy("keep_hold")} onClick={() => onAct("keep_hold", hold.id, t("mod.keepMasked"))} />
        ) : null}
        <ActionButton danger label={t("mod.remove")} busy={isBusy("remove_hold")} onClick={() => onAct("remove_hold", hold.id, t("mod.remove"))} />
      </div>
    </article>
  );
}

function ReportCard({
  report,
  busy,
  onAct,
}: {
  report: ModReport;
  busy: string | null;
  onAct: (action: ModAction, id: string, label: string) => void;
}) {
  const { t } = useTranslate();
  const isBusy = (a: ModAction, id: string) => busy === `${a}:${id}`;
  if (report.is_profile) {
    const p = report.profile;
    return (
      <article className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="border-crimson/50 text-crimson-soft">{t("mod.reported")}</Chip>
          <Chip className="border-paper/15 text-paper/60">{t("mod.profile")}</Chip>
          <span className="font-sans text-caption text-paper/45">
            {p?.name ?? t("mod.unknown")}
            {p?.handle ? ` @${p.handle}` : ""} · {timeAgo(report.created_at)}
          </span>
        </div>
        {report.reason ? <p className="mt-2 font-sans text-caption text-paper/55">{t("mod.reasonGiven", { reason: report.reason })}</p> : null}
        <div className="mt-3 space-y-1 rounded-lg border border-paper/10 bg-black/25 p-3 font-sans text-detail text-paper/80">
          {p?.status ? <p>{p.status}</p> : null}
          {p?.bio ? <p className="whitespace-pre-wrap break-words">{p.bio}</p> : null}
          {p?.parish ? <p className="text-paper/60">{p.parish}</p> : null}
          {p?.intention ? (
            <p className="break-words">
              <span className="block text-caption text-paper/50">{t("mod.prayerRequest")}</span>
              {p.intention}
            </p>
          ) : null}
          {!p?.status && !p?.bio && !p?.parish && !p?.intention ? <p className="text-paper/45">{t("mod.noText")}</p> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton danger label={t("mod.clearProfile")} busy={isBusy("clear_profile", report.id)} onClick={() => onAct("clear_profile", report.id, t("mod.clearProfile"))} />
          <ActionButton label={t("mod.resetHandle")} busy={isBusy("reset_handle", report.id)} onClick={() => onAct("reset_handle", report.id, t("mod.resetHandle"))} />
          <ActionButton label={t("mod.dismiss")} busy={isBusy("dismiss_report", report.id)} onClick={() => onAct("dismiss_report", report.id, t("mod.dismiss"))} />
        </div>
      </article>
    );
  }
  const isReply = Boolean(report.reply_id);
  const target = isReply ? report.reply : report.post;
  const text = isReply ? report.reply?.body : report.post?.title || report.post?.body || report.post?.quote_text;
  const targetId = (isReply ? report.reply_id : report.post_id) as string;
  const removed = target?.status === "removed";
  const hidden = target?.status === "held";
  return (
    <article className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip className="border-crimson/50 text-crimson-soft">{t("mod.reported")}</Chip>
        <Chip className="border-paper/15 text-paper/60">{isReply ? t("mod.reply") : t("mod.post")}</Chip>
        {removed ? <Chip className="border-paper/15 text-paper/60">{t("mod.alreadyRemoved")}</Chip> : null}
        {hidden ? <Chip className="border-paper/15 text-paper/60">{t("mod.hidden")}</Chip> : null}
        <span className="font-sans text-caption text-paper/45">
          {target?.author_name ?? t("mod.unknown")} · {timeAgo(report.created_at)}
        </span>
      </div>
      {report.reason ? <p className="mt-2 font-sans text-caption text-paper/55">{t("mod.reasonGiven", { reason: report.reason })}</p> : null}
      <p className="mt-3 line-clamp-6 whitespace-pre-wrap break-words rounded-lg border border-paper/10 bg-black/25 p-3 font-sans text-detail text-paper/85">
        {text || t("mod.noText")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!removed ? (
          <ActionButton
            danger
            label={t("mod.remove")}
            busy={isBusy(isReply ? "remove_reply" : "remove_post", targetId)}
            onClick={() => onAct(isReply ? "remove_reply" : "remove_post", targetId, t("mod.remove"))}
          />
        ) : null}
        {hidden ? (
          <ActionButton
            primary
            label={t("mod.restore")}
            busy={isBusy(isReply ? "restore_reply" : "restore_post", targetId)}
            onClick={() => onAct(isReply ? "restore_reply" : "restore_post", targetId, t("mod.restore"))}
          />
        ) : null}
        <ActionButton label={t("mod.dismiss")} busy={isBusy("dismiss_report", report.id)} onClick={() => onAct("dismiss_report", report.id, t("mod.dismiss"))} />
      </div>
    </article>
  );
}

/** What the log can say happened; anything newer reads as its own words. */
const LOGGED = [
  "remove_post",
  "remove_reply",
  "restore_post",
  "restore_reply",
  "dismiss_report",
  "approve_words",
  "keep_masked",
  "remove_request_words",
  "clear_profile",
  "reset_handle",
  "auto_hide",
  "add_term",
  "remove_term",
  "clergy_verified",
  "clergy_declined",
  "clergy_requested",
  "approve_campaign",
  "remove_campaign",
  "restore_campaign",
  "dismiss_campaign_report",
  // A campaign's creator took a comment off their own campaign (lib/campaigns/thread.ts).
  "creator_remove_comment",
  // A campaign's pictures (1.9, switched off on the server until they open).
  "approve_picture",
  "remove_picture",
  "picture_flagged",
] as const;

function LogList({ rows }: { rows: ModLogLine[] }) {
  const { t } = useTranslate();
  const said = (action: string) =>
    (LOGGED as readonly string[]).includes(action) ? t(`mod.action.${action}`) : action.replace(/_/g, " ");
  if (rows.length === 0) return <p className="mt-5 py-10 text-center font-sans text-ui text-paper/55">{t("mod.logEmpty")}</p>;
  return (
    <ul className="mt-5 divide-y divide-paper/8 overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]">
      {rows.map((r) => (
        <li key={r.id} className="px-4 py-3">
          <p className="font-sans text-detail text-paper/85">
            <span className="font-semibold">{r.actor_name}</span> {said(r.action)}
          </p>
          {r.summary ? <p className="mt-0.5 line-clamp-2 font-sans text-caption text-paper/55">{r.summary}</p> : null}
          <p className="mt-0.5 font-sans text-caption text-paper/40">{timeAgo(r.created_at)}</p>
        </li>
      ))}
    </ul>
  );
}
