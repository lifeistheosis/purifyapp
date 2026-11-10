"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { changeCampaignWords } from "@/lib/campaigns/client";
import { NAME_MAX, TITLE_MAX, TITLE_MIN, WORDS_MAX, type PublicCampaign } from "@/lib/campaigns/model";

const LABEL = "block font-sans text-detail font-semibold text-paper/80";
const FIELD = "mt-2 block min-h-11 w-full rounded-[12px] bg-paper/[0.06] px-3 py-2.5 font-sans text-[16px] leading-[24px] text-paper focus:outline-none";

/**
 * Changing a campaign's words while it still waits for its first read (1.9;
 * the notes, section 33): its title, the name and the words, as its creator
 * wrote them, to mend. A moderator reads it once, as changed.
 *
 * Offered only on a campaign the server says can still be changed
 * (`changeable`, lib/campaigns/server.ts, mayChange), and the server holds
 * the rule again when it is sent: one a moderator has read in the meantime
 * is not changed, and the sheet says so. The same refusals as starting one:
 * no link, and the writer is asked first about a word the filter will mask.
 */
export function CampaignChangeSheet({
  open,
  campaign,
  onClose,
  onDone,
}: {
  open: boolean;
  campaign: PublicCampaign;
  onClose: () => void;
  /** Saved: the page reads the campaign again and says so. */
  onDone: (message: string) => void;
}) {
  const { t } = useTranslate();
  // The form is the sheet's child, so it is made anew each time the sheet
  // opens and begins from the campaign as it stands then.
  return (
    <Sheet open={open} onClose={onClose} title={t("campaigns.change")} desktop openFull keyboard>
      <ChangeForm campaign={campaign} onDone={onDone} />
    </Sheet>
  );
}

function ChangeForm({ campaign, onDone }: { campaign: PublicCampaign; onDone: (message: string) => void }) {
  const { t } = useTranslate();
  const [title, setTitle] = useState(campaign.title);
  const [name, setName] = useState(campaign.subject_name ?? "");
  const [words, setWords] = useState(campaign.details ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askFiltered, setAskFiltered] = useState(false);

  const same = title.trim() === campaign.title && name.trim() === (campaign.subject_name ?? "") && words.trim() === (campaign.details ?? "");
  const ready = title.trim().length >= TITLE_MIN && name.trim().length > 0 && !same && !busy;

  async function save(confirmFiltered = false) {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const res = await changeCampaignWords(campaign.id, { title: title.trim(), name: name.trim(), words: words.trim() || null, confirmFiltered });
    setBusy(false);
    setAskFiltered(false);
    if (res.ok) {
      onDone(t("campaigns.change.saved"));
    } else if (res.code === "filtered") {
      setAskFiltered(true);
    } else if (res.code === "campaign_link") {
      setError(t("campaigns.err.link"));
    } else if (res.code === "not_waiting") {
      setError(t("campaigns.change.late"));
    } else {
      setError(t("campaigns.err.failed"));
    }
  }

  return (
    <>
      <div className="pb-1 pt-1" data-campaign-change="">
        <p className="font-sans text-caption leading-relaxed text-paper/70">{t("campaigns.change.note")}</p>

        <label htmlFor="campaign-change-title" className={`${LABEL} mt-4`}>
          {t("journal.page.title")}
        </label>
        <input dir="auto" id="campaign-change-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX} className={FIELD} />

        <label htmlFor="campaign-change-name" className={`${LABEL} mt-5`}>
          {t("prayers.diptychs.name")}
        </label>
        <input dir="auto" id="campaign-change-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} autoComplete="off" aria-describedby="campaign-change-name-hint" className={FIELD} />
        <p id="campaign-change-name-hint" className="mt-2 font-sans text-caption leading-relaxed text-paper/70">
          {t("campaigns.new.nameHint")}
        </p>

        <label htmlFor="campaign-change-words" className={`${LABEL} mt-5`}>
          {t("campaigns.new.words")} <span className="font-normal text-paper/70">({t("common.optional")})</span>
        </label>
        <textarea
          dir="auto"
          id="campaign-change-words"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          rows={3}
          maxLength={WORDS_MAX}
          className={`${FIELD} resize-none field-sizing-content`}
        />

        {error ? (
          <p role="alert" data-campaign-change-error="" className="mt-3 font-sans text-detail text-crimson-soft">
            {error}
          </p>
        ) : null}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!ready}
            className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-40"
          >
            {busy ? t("community.replySending") : t("common.save")}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={askFiltered}
        title={t("community.filteredTitle")}
        description={t("campaigns.filteredBody")}
        confirmLabel={t("campaigns.filteredSend")}
        cancelLabel={t("campaigns.filteredEdit")}
        pending={busy}
        onConfirm={() => void save(true)}
        onCancel={() => setAskFiltered(false)}
      />
    </>
  );
}
