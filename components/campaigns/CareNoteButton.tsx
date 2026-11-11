"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { moderateCampaign } from "@/lib/campaigns/client";

/**
 * A moderator's button for the care note (his yes to call 26, 2026-11-11): a
 * short private note from Purify, in the writer's own inbox, with where to
 * find help. It stands on a card whose words the safety line marked, a
 * waiting campaign's or a held update's or comment's, and nowhere else.
 *
 * Drawn only where the server says the note can be sent (the queue's `care`,
 * lib/campaigns/careOn.ts): the screens never decide that themselves. It
 * asks first, since a note in a person's inbox cannot be taken back, and it
 * says what will be sent. The server finds the writer from the card's own id
 * and holds every rule of it (lib/campaigns/careSend.ts): one a day for a
 * writer, never their words, never a push.
 *
 * Once sent, the button gives way to a quiet line. A second moderator who
 * taps on another screen is told one was already sent today.
 */
export function CareNoteButton({
  target,
  id,
  onNotice,
}: {
  /** What this card is: a waiting campaign (its id), or a hold on an update or a comment (the hold's id). */
  target: "campaign" | "hold";
  id: string;
  /** The page's one line for what a decision did. */
  onNotice: (message: string | null) => void;
}) {
  const { t } = useTranslate();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    setAsking(false);
    setBusy(true);
    onNotice(null);
    const res = await moderateCampaign(target === "campaign" ? "care_note_for_campaign" : "care_note_for_hold", id);
    setBusy(false);
    if (!res.ok) {
      onNotice(res.error ?? t("mod.failed"));
      return;
    }
    setSent(true);
    onNotice(t("mod.care.sent"));
  }

  return (
    <div data-mod-care={sent ? "sent" : ""} className="mt-3">
      {sent ? (
        <p role="status" className="font-sans text-detail text-paper/75">
          {t("mod.care.sent")}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setAsking(true)}
          disabled={busy}
          aria-haspopup="dialog"
          className="tap-press inline-flex min-h-11 items-center rounded-pill border border-paper/25 px-4 font-sans text-detail font-semibold text-paper/85 transition-colors hover:border-paper/45 disabled:opacity-50"
        >
          {t("mod.care.send")}
        </button>
      )}
      <ConfirmDialog
        open={asking}
        title={t("mod.care.send")}
        description={t("mod.care.ask")}
        confirmLabel={t("mod.care.send")}
        cancelLabel={t("common.cancel")}
        pending={busy}
        onConfirm={() => void send()}
        onCancel={() => setAsking(false)}
      />
    </div>
  );
}
