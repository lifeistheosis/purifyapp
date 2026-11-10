"use client";

import { useState } from "react";

import { ActionMenu, type ActionMenuItem } from "@/components/community/ActionMenu";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { reportCommunityItem, type CommunityResult } from "@/lib/community/client";

/**
 * The ⋯ menu on a reply (1.9): Report, as a post's menu has it.
 *
 * No screen offered Report on a reply. The route took one
 * (app/api/community/report/route.ts) and only a post's menu called it, so a
 * hurtful reply under a good post could not be reported at all; Apple's rule
 * for apps with people's words in them asks for a way to report content
 * (campaigns-fable.md, section 9, item 5). The same words and the same
 * behaviour as a post's Report: offered to a signed-in reader on someone
 * else's reply, "Reported" at once, undone and said if it did not send. A
 * report carries no reason, as a post's does not. Enough reports from
 * different readers hide the reply until a moderator looks
 * (lib/community/autoHide.ts).
 */

type Translate = (key: string) => string;

/** What a reply's menu holds for this reader. Empty, and so no menu, on one's own reply or signed out. */
export function replyMenuItems({
  signedIn,
  mine,
  reported,
  canViewProfile,
  t,
  onReport,
  onViewProfile,
}: {
  signedIn: boolean;
  mine: boolean;
  reported: boolean;
  canViewProfile: boolean;
  t: Translate;
  onReport: () => void;
  onViewProfile: () => void;
}): ActionMenuItem[] {
  // Signed in only: an anonymous report cannot be weighed or rate limited
  // (the route refuses it), and a reader does not report their own words.
  if (!signedIn || mine) return [];
  const items: ActionMenuItem[] = [];
  if (canViewProfile) items.push({ label: t("community.viewProfile"), onSelect: onViewProfile });
  items.push({ label: reported ? t("community.reported") : t("community.report"), onSelect: onReport, disabled: reported });
  return items;
}

/**
 * Report a reply: "Reported" at once, and back to Report, with the reason
 * said, when it did not send. Leaving it on "Reported" would tell the reader
 * a report was filed when it was not.
 */
export function replyReporter(
  replyId: string,
  { set, fail }: { set: (reported: boolean) => void; fail: (message: string | null) => void },
  send: (input: { replyId: string }) => Promise<CommunityResult> = reportCommunityItem,
): () => Promise<void> {
  return async () => {
    set(true);
    const res = await send({ replyId });
    if (!res.ok) {
      set(false);
      fail(res.error ?? null);
    }
  };
}

export function ReplyMenu({
  replyId,
  signedIn,
  mine,
  onViewProfile,
  onFailed,
}: {
  replyId: string;
  signedIn: boolean;
  mine: boolean;
  /** Opens the writer's profile; absent when the reply has no @handle. */
  onViewProfile: (() => void) | null;
  /** Says why a report did not send, where the card says its other errors. */
  onFailed: (message: string) => void;
}) {
  const { t } = useTranslate();
  const [reported, setReported] = useState(false);
  const report = replyReporter(replyId, {
    set: setReported,
    fail: (message) => onFailed(message ?? t("community.reportFailed")),
  });
  const items = replyMenuItems({
    signedIn,
    mine,
    reported,
    canViewProfile: Boolean(onViewProfile),
    t,
    onReport: () => void report(),
    onViewProfile: () => onViewProfile?.(),
  });
  return <ActionMenu className="-me-1.5 -mt-1 shrink-0" label={t("profile.moreActions")} items={items} />;
}
