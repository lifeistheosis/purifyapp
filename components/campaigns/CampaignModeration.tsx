"use client";

import { useState, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Lock } from "@/components/ui/icons/Lock";
import { moderateCampaign } from "@/lib/campaigns/client";
import {
  KIND_LABEL,
  PICTURE_REPORT_REASON_LABEL,
  REPORT_REASON_LABEL,
  heldWhy,
  type CampaignModAction,
  type CampaignQueue,
  type HeldWhy,
  type OpenCampaignReport,
  type PictureReportReason,
  type ReportReason,
  type WaitingCampaign,
  type WaitingPicture,
} from "@/lib/campaigns/model";
import { dayText, lengthText } from "@/lib/campaigns/words";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/community/types";

/**
 * Prayer campaigns in the moderators' queue (1.9), drawn as the queue's own
 * cards are (components/community/moderation/ModerationClient.tsx): a line of
 * what it is and why it waits, who asked and when, the words as written, and
 * the decisions.
 *
 * Every campaign is read before it is public (his yes to item 117), so each
 * waits here once: Approve puts it on the board, Remove takes it down. One
 * that may mean its writer is in danger is first, and says so. A campaign
 * readers reported shows the reason they ticked; reports hide it again when
 * they add up, and then it waits here to be shown again or removed.
 *
 * Removing asks first, as it does for a post. Nothing here names who
 * reported, or carries anyone's account.
 *
 * Pictures (his item 121) wait here too, for the team alone and only while
 * the server has pictures switched on: the queue carries them for nobody
 * else (app/api/community/moderation). Each is drawn covered until it is
 * tapped, so a moderator chooses the moment they look.
 *
 * Drawn in the palette's own ink throughout (checkMock, on all five
 * palettes): what must be read first is the heavier line, never a red one,
 * and a box is the ink at four percent, never a black typed in.
 */

const QUIET = "border-paper/25 text-paper/75";
const STRONG = "border-paper/60 text-paper";
const BOX = "mt-3 space-y-1.5 rounded-lg border border-paper/10 bg-paper/[0.04] p-3 font-sans text-detail text-paper/85";

const WHY: Record<HeldWhy, { label: string; tone: string }> = {
  crisis: { label: "mod.campaignCrisis", tone: STRONG },
  words: { label: "mod.reason.words", tone: QUIET },
  asks: { label: "mod.campaignAsks", tone: QUIET },
  address: { label: "mod.campaignAddress", tone: QUIET },
  reports: { label: "mod.reason.reports", tone: STRONG },
};

const isReason = (v: string | null): v is ReportReason => v !== null && Object.prototype.hasOwnProperty.call(REPORT_REASON_LABEL, v);
const isPictureReason = (v: string | null): v is PictureReportReason => v !== null && Object.prototype.hasOwnProperty.call(PICTURE_REPORT_REASON_LABEL, v);

function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-pill border px-2.5 py-0.5 font-sans text-eyebrow font-semibold", className)}>{children}</span>;
}

function ActionButton({ label, onClick, busy, primary = false }: { label: string; onClick: () => void; busy: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "tap-press inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-detail font-semibold transition-colors disabled:opacity-50",
        primary ? "bg-paper text-night hover:bg-paper/90" : "border border-paper/25 text-paper/85 hover:border-paper/45",
      )}
    >
      {label}
    </button>
  );
}

/** How many things of campaigns wait, for the tab's count. */
export function campaignsWaitingCount(queue: CampaignQueue | undefined): number {
  return queue ? queue.waiting.length + queue.reports.length + (queue.pictures?.length ?? 0) : 0;
}

export function CampaignModeration({
  queue,
  onDone,
  onNotice,
}: {
  queue: CampaignQueue | undefined;
  /** A decision was written: read the queue again. */
  onDone: () => Promise<void> | void;
  /** What to say of it. */
  onNotice: (message: string | null) => void;
}) {
  const { t } = useTranslate();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ action: "remove_campaign" | "remove_picture"; id: string } | null>(null);
  if (!queue || campaignsWaitingCount(queue) === 0) return null;

  async function act(action: CampaignModAction, id: string) {
    setBusy(`${action}:${id}`);
    onNotice(null);
    const res = await moderateCampaign(action, id);
    setBusy(null);
    if (!res.ok) {
      onNotice(res.error ?? t("mod.failed"));
      return;
    }
    onNotice(t("mod.done"));
    await onDone();
  }
  const isBusy = (action: CampaignModAction, id: string) => busy === `${action}:${id}`;
  const remove = (id: string) => setConfirming({ action: "remove_campaign", id });

  return (
    <div data-mod-campaigns="" className="space-y-3">
      {queue.waiting.map((c) => (
        <WaitingCard
          key={c.id}
          campaign={c}
          approving={isBusy("approve_campaign", c.id)}
          removing={isBusy("remove_campaign", c.id)}
          onApprove={() => void act("approve_campaign", c.id)}
          onRemove={() => remove(c.id)}
        />
      ))}
      {queue.reports.map((r) => (
        <ReportedCard
          key={r.id}
          report={r}
          busy={busy}
          onRemove={(id) => remove(id)}
          onShowAgain={(id) => void act("approve_campaign", id)}
          onDismiss={() => void act("dismiss_campaign_report", r.id)}
        />
      ))}
      {(queue.pictures ?? []).map((p) => (
        <PictureCard
          key={p.id}
          picture={p}
          approving={isBusy("approve_picture", p.id)}
          removing={isBusy("remove_picture", p.id)}
          onApprove={() => void act("approve_picture", p.id)}
          onRemove={() => setConfirming({ action: "remove_picture", id: p.id })}
        />
      ))}
      <ConfirmDialog
        open={confirming !== null}
        title={t("mod.removeTitle")}
        description={t(confirming?.action === "remove_picture" ? "mod.pictureRemoveBody" : "mod.removeBody")}
        confirmLabel={t("mod.remove")}
        cancelLabel={t("common.cancel")}
        destructive
        pending={busy !== null}
        onConfirm={() => {
          const what = confirming;
          setConfirming(null);
          if (what) void act(what.action, what.id);
        }}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

function WaitingCard({
  campaign: c,
  approving,
  removing,
  onApprove,
  onRemove,
}: {
  campaign: WaitingCampaign;
  approving: boolean;
  removing: boolean;
  onApprove: () => void;
  onRemove: () => void;
}) {
  const { t, tn, locale } = useTranslate();
  const why = heldWhy(c.held_reason);
  const kind = c.for_whom === "departed" ? KIND_LABEL.departed : (KIND_LABEL as Record<string, string | undefined>)[c.intention] ?? KIND_LABEL.other;
  const last = dayText(c.ends_on, locale);
  const length = c.days ? (last ? t("campaigns.lengthTo", { length: lengthText(c.days, t, tn), date: last }) : lengthText(c.days, t, tn)) : "";
  return (
    <article data-mod-campaign="" className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip className={QUIET}>{t(why.includes("reports") ? "mod.hidden" : "mod.campaignWaiting")}</Chip>
        <Chip className={QUIET}>{t("mod.campaign")}</Chip>
        {why.map((w) => (
          <Chip key={w} className={WHY[w].tone}>
            {t(WHY[w].label)}
          </Chip>
        ))}
        <span className="font-sans text-caption text-paper/70">
          {c.creator_name ?? t("mod.unknown")}
          {c.creator_handle ? ` @${c.creator_handle}` : ""} · {timeAgo(c.created_at)}
        </span>
      </div>
      <p className="mt-2 font-sans text-caption text-paper/70">
        {t(kind)}
        {length ? ` · ${length}` : ""}
      </p>
      {/* Kept to one circle: who will see it once it is approved. Where its name could not be read, that it is kept to one is still said. */}
      {c.circle != null ? (
        <p data-mod-campaign-circle="" className="mt-1 flex items-center gap-1.5 font-sans text-caption text-paper/70">
          <Lock size={13} className="shrink-0" />
          <span className="min-w-0 break-words">{c.circle ? t("campaigns.onlyCircle", { circle: c.circle }) : t("campaigns.audience.note")}</span>
        </p>
      ) : null}
      <div className={BOX}>
        <p dir="auto" className="break-words font-semibold">{c.title}</p>
        {c.subject_name ? (
          <p className="break-words">
            <span className="text-paper/75">{t("prayers.diptychs.name")}: </span>
            {c.subject_name}
          </p>
        ) : null}
        {c.details ? <p dir="auto" className="whitespace-pre-wrap break-words">{c.details}</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton primary label={t(why.includes("reports") ? "mod.restore" : "mod.approve")} busy={approving} onClick={onApprove} />
        <ActionButton label={t("mod.remove")} busy={removing} onClick={onRemove} />
      </div>
    </article>
  );
}

function ReportedCard({
  report: r,
  busy,
  onRemove,
  onShowAgain,
  onDismiss,
}: {
  report: OpenCampaignReport;
  busy: string | null;
  onRemove: (campaignId: string) => void;
  onShowAgain: (campaignId: string) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslate();
  const c = r.campaign;
  const removed = !c || c.status === "removed";
  const hidden = c?.status === "held";
  const ticked = isReason(r.reason_code) ? t(REPORT_REASON_LABEL[r.reason_code]) : null;
  const reason = [ticked, r.reason].filter(Boolean).join(" ");
  return (
    <article data-mod-campaign-report="" className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip className={STRONG}>{t("mod.reported")}</Chip>
        <Chip className={QUIET}>{t("mod.campaign")}</Chip>
        {removed ? <Chip className={QUIET}>{t("mod.alreadyRemoved")}</Chip> : null}
        {hidden ? <Chip className={QUIET}>{t("mod.hidden")}</Chip> : null}
        <span className="font-sans text-caption text-paper/70">
          {c?.creator_name ?? t("mod.unknown")} · {timeAgo(r.created_at)}
        </span>
      </div>
      {/* A reader's own words, set in as written (the catalogs' interpolation reads "$&" as a pattern). */}
      {reason ? <p className="mt-2 break-words font-sans text-caption text-paper/70">{t("mod.reasonGiven").replace("{reason}", () => reason)}</p> : null}
      <div className={BOX}>
        {c ? (
          <>
            <p dir="auto" className="break-words font-semibold">{c.title}</p>
            {c.subject_name ? (
              <p className="break-words">
                <span className="text-paper/75">{t("prayers.diptychs.name")}: </span>
                {c.subject_name}
              </p>
            ) : null}
            {c.details ? <p dir="auto" className="line-clamp-6 whitespace-pre-wrap break-words">{c.details}</p> : null}
          </>
        ) : (
          <p className="text-paper/75">{t("mod.noText")}</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {c && !removed ? <ActionButton label={t("mod.remove")} busy={busy === `remove_campaign:${c.id}`} onClick={() => onRemove(c.id)} /> : null}
        {c && hidden ? <ActionButton primary label={t("mod.restore")} busy={busy === `approve_campaign:${c.id}`} onClick={() => onShowAgain(c.id)} /> : null}
        <ActionButton label={t("mod.dismiss")} busy={busy === `dismiss_campaign_report:${r.id}`} onClick={onDismiss} />
      </div>
    </article>
  );
}

/**
 * One picture to look at. Covered until it is tapped: a moderator opens a
 * queue to many things, and chooses when to look at a photograph.
 */
function PictureCard({
  picture: p,
  approving,
  removing,
  onApprove,
  onRemove,
}: {
  picture: WaitingPicture;
  approving: boolean;
  removing: boolean;
  onApprove: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslate();
  const [seen, setSeen] = useState(false);
  const reported = p.reports.length > 0;
  return (
    <article data-mod-campaign-picture="" className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip className={reported ? STRONG : QUIET}>{t(p.shown ? "mod.reported" : reported ? "mod.hidden" : "mod.pictureWaiting")}</Chip>
        <Chip className={QUIET}>{t("mod.picture")}</Chip>
        <span className="font-sans text-caption text-paper/70">
          {p.campaign.creator_name ?? t("mod.unknown")} · {timeAgo(p.created_at)}
        </span>
      </div>
      {p.reports.map((r, i) => {
        const reason = [isPictureReason(r.reason_code) ? t(PICTURE_REPORT_REASON_LABEL[r.reason_code]) : null, r.reason].filter(Boolean).join(" ");
        // A reader's own words, set in as written (the catalogs' interpolation reads "$&" as a pattern).
        return reason ? (
          <p key={i} className="mt-2 break-words font-sans text-caption text-paper/70">
            {t("mod.reasonGiven").replace("{reason}", () => reason)}
          </p>
        ) : null;
      })}
      <div className={BOX}>
        <p dir="auto" className="break-words font-semibold">{p.campaign.title}</p>
        {p.alt ? <p className="break-words">{t("mod.pictureShows").replace("{alt}", () => p.alt ?? "")}</p> : null}
        {p.check_result ? <p className="break-words text-paper/75">{t("mod.pictureCheck").replace("{result}", () => p.check_result ?? "")}</p> : null}
      </div>
      <div className="mt-3">
        {!p.url ? (
          <p className="font-sans text-detail text-paper/75">{t("mod.pictureGone")}</p>
        ) : seen ? (
          <ArrivingImage src={p.url} alt={p.alt ?? t("campaigns.pictureAlt")} decoding="async" className="max-h-72 w-auto max-w-full rounded-lg" />
        ) : (
          <ActionButton label={t("mod.pictureShow")} busy={false} onClick={() => setSeen(true)} />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton primary label={t(p.shown ? "mod.pictureKeep" : reported ? "mod.restore" : "mod.approve")} busy={approving} onClick={onApprove} />
        <ActionButton label={t("mod.remove")} busy={removing} onClick={onRemove} />
      </div>
    </article>
  );
}
