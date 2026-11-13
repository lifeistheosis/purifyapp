"use client";

import { useState } from "react";

import { ActionMenu, type ActionMenuItem } from "@/components/community/ActionMenu";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { reportCommunityItem, type CommunityResult } from "@/lib/community/client";

/**
 * The ⋯ menu on a reply (1.9): Report, as a post's menu has it, and on the
 * reader's own reply Edit and Delete (build 95 note 10, a reader's ask: "We
 * should have the ability to remove or edit our comments under replies and
 * posts"), as their own post's menu has Delete.
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

/**
 * What a reply's menu holds for this reader. Empty, and so no menu, signed
 * out. On their own reply: their profile, Edit and Delete, in the order a
 * post's own menu has them; never Report, since a reader does not report
 * their own words.
 */
export function replyMenuItems({
  signedIn,
  mine,
  reported,
  canViewProfile,
  busy = false,
  t,
  onReport,
  onViewProfile,
  onEdit,
  onDelete,
}: {
  signedIn: boolean;
  mine: boolean;
  reported: boolean;
  canViewProfile: boolean;
  /** A change to this reply is on its way: Edit and Delete wait for it. */
  busy?: boolean;
  t: Translate;
  onReport: () => void;
  onViewProfile: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}): ActionMenuItem[] {
  // Signed in only: an anonymous report cannot be weighed or rate limited
  // (the route refuses it), and a reply is only someone's own when signed in.
  if (!signedIn) return [];
  const items: ActionMenuItem[] = [];
  if (canViewProfile) items.push({ label: t("community.viewProfile"), onSelect: onViewProfile });
  if (mine) {
    if (onEdit) items.push({ label: t("common.edit"), onSelect: onEdit, disabled: busy });
    if (onDelete) items.push({ label: t("community.delete"), onSelect: onDelete, danger: true, disabled: busy });
    return items;
  }
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
  busy = false,
  onViewProfile,
  onFailed,
  onEdit,
  onDelete,
}: {
  replyId: string;
  signedIn: boolean;
  mine: boolean;
  busy?: boolean;
  /** Opens the writer's profile; absent when the reply has no @handle. */
  onViewProfile: (() => void) | null;
  /** Says why a report did not send, where the card says its other errors. */
  onFailed: (message: string) => void;
  /** The reader's own reply: open it to edit, and ask before deleting it. */
  onEdit?: () => void;
  onDelete?: () => void;
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
    busy,
    t,
    onReport: () => void report(),
    onViewProfile: () => onViewProfile?.(),
    onEdit,
    onDelete,
  });
  return <ActionMenu className="-me-1.5 -mt-1 shrink-0" label={t("profile.moreActions")} items={items} />;
}
