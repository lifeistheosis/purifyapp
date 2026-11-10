"use client";

import { useState } from "react";

import { TickLines } from "@/components/campaigns/TickLines";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { reportCampaign } from "@/lib/campaigns/client";
import { REPORT_REASONS, REPORT_REASON_LABEL, type ReportReason } from "@/lib/campaigns/model";

/**
 * Reporting a campaign (1.9): a reason to tick, and words when the reader
 * has some. The first reason is the one a person named without their
 * blessing needs, and it hides the campaign at once until a moderator looks
 * (lib/campaigns/moderation.ts). The reader is told it was sent and that a
 * moderator will look, and nothing of what others have reported.
 */
export function CampaignReportSheet({
  open,
  campaignId,
  onClose,
  onDone,
}: {
  open: boolean;
  campaignId: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { t } = useTranslate();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    const res = await reportCampaign(campaignId, reason, words.trim() || null);
    setBusy(false);
    if (res.ok) {
      setReason(null);
      setWords("");
      onDone(t("campaigns.report.sent"));
    } else {
      setError(res.status === 401 ? t("campaigns.report.signIn") : t("community.reportFailed"));
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("campaigns.report.title")} desktop openFull keyboard>
      <div className="pb-1 pt-1">
        <p id="campaign-report-reason" className="sr-only">
          {t("campaigns.report.title")}
        </p>
        <TickLines
          value={reason}
          options={REPORT_REASONS.map((r) => ({ id: r, label: t(REPORT_REASON_LABEL[r]) }))}
          onChange={setReason}
          labelledBy="campaign-report-reason"
        />
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
            disabled={!reason || busy}
            className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-40"
          >
            {busy ? t("community.replySending") : t("shop.send")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
