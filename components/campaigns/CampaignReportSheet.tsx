"use client";

import { useState } from "react";

import { TickLines } from "@/components/campaigns/TickLines";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { reportCampaign, reportPicture } from "@/lib/campaigns/client";
import {
  PICTURE_REPORT_REASONS,
  PICTURE_REPORT_REASON_LABEL,
  REPORT_REASONS,
  REPORT_REASON_LABEL,
  type PictureReportReason,
  type ReportReason,
} from "@/lib/campaigns/model";

/**
 * Reporting a campaign (1.9): a reason to tick, and words when the reader
 * has some. The first reason is the one a person named without their
 * blessing needs, and it hides the campaign at once until a moderator looks
 * (lib/campaigns/moderation.ts). The reader is told it was sent and that a
 * moderator will look, and nothing of what others have reported.
 *
 * With `pictureId` it is one of the campaign's pictures that is reported,
 * from its viewer, with a picture's own reasons (lib/campaigns/pictures.ts).
 */
export function CampaignReportSheet({
  open,
  campaignId,
  pictureId,
  onClose,
  onDone,
}: {
  open: boolean;
  campaignId: string;
  /** One of its pictures, when it is the picture that is reported. */
  pictureId?: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { t } = useTranslate();
  const [reason, setReason] = useState<ReportReason | PictureReportReason | null>(null);
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!ticked || !reason || busy) return;
    setBusy(true);
    setError(null);
    const said = words.trim() || null;
    const res = pictureId ? await reportPicture(campaignId, pictureId, reason as PictureReportReason, said) : await reportCampaign(campaignId, reason as ReportReason, said);
    setBusy(false);
    if (res.ok) {
      setReason(null);
      setWords("");
      onDone(t("campaigns.report.sent"));
    } else {
      setError(res.status === 401 ? t("campaigns.report.signIn") : t("community.reportFailed"));
    }
  }

  const title = t(pictureId ? "campaigns.report.pictureTitle" : "campaigns.report.title");
  const options: { id: ReportReason | PictureReportReason; label: string }[] = pictureId
    ? PICTURE_REPORT_REASONS.map((r) => ({ id: r, label: t(PICTURE_REPORT_REASON_LABEL[r]) }))
    : REPORT_REASONS.map((r) => ({ id: r, label: t(REPORT_REASON_LABEL[r]) }));
  // A reason ticked for the campaign is not one for a picture, and the other way.
  const ticked = options.some((o) => o.id === reason) ? reason : null;

  return (
    <Sheet open={open} onClose={onClose} title={title} desktop openFull keyboard>
      <div className="pb-1 pt-1">
        <p id="campaign-report-reason" className="sr-only">
          {title}
        </p>
        <TickLines value={ticked} options={options} onChange={setReason} labelledBy="campaign-report-reason" />
        <label htmlFor="campaign-report-words" className="mt-5 block font-sans text-detail font-semibold text-paper/80">
          {t("campaigns.report.words")}{" "}
          <span className="font-normal text-paper/70">({t("common.optional")})</span>
        </label>
        <textarea
          id="campaign-report-words"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          rows={2}
          maxLength={500}
          className="mt-2 block min-h-11 w-full resize-none rounded-[12px] bg-paper/[0.06] px-3 py-2.5 font-sans text-[16px] leading-[24px] text-paper field-sizing-content focus:outline-none"
        />
        {error ? (
          <p role="alert" className="mt-3 font-sans text-detail text-crimson-soft">
            {error}
          </p>
        ) : null}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void send()}
            disabled={!ticked || busy}
            className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-40"
          >
            {busy ? t("community.replySending") : t("shop.send")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
