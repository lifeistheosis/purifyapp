"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { ActionMenu, type ActionMenuItem } from "@/components/community/ActionMenu";
import { ClergySeal } from "@/components/community/ClergySeal";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { fetchThread, removeNote, writeNote, type NoteResult, type ThreadResult } from "@/lib/campaigns/client";
import { NOTE_MAX, type CampaignNote, type CampaignThread, type NoteKind } from "@/lib/campaigns/model";
import { dayText } from "@/lib/campaigns/words";
import { cn } from "@/lib/cn";
import { reportCommunityItem } from "@/lib/community/client";
import { timeAgo } from "@/lib/community/types";
import { isClergyMark } from "@/lib/profile/clergy";

/**
 * A campaign's updates and its comments (1.9, the rework's phase 2), the two
 * doors beside About on its page.
 *
 * Updates are its creator's own word to those who pray, newest first, each
 * with its day. Comments are drawn as the replies under a post are, oldest
 * first, with the field at the foot. Both are words only. Nothing here is
 * counted and nothing can be reacted to (his yes to item 126): a comment has
 * a menu, to report it, to delete one's own, or, for the campaign's creator,
 * to take one off their campaign.
 *
 * What a reader may do is the server's to say (app/api/campaigns/[id]/
 * thread): the screen offers a field only where the answer allowed one.
 */

/** A campaign's thread, asked once when its page opens and again after each change. */
export function useCampaignThread(campaignId: string, on: boolean): { result: ThreadResult | null; reload: () => void } {
  const [result, setResult] = useState<ThreadResult | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!on) return;
    let live = true;
    void fetchThread(campaignId).then((res) => {
      if (live) setResult(res);
    });
    return () => {
      live = false;
    };
  }, [campaignId, on, version]);
  return { result, reload: () => setVersion((v) => v + 1) };
}

type Translate = (key: string) => string;

/** Why a note did not go, in the reader's words. */
function refusal(res: Extract<NoteResult, { ok: false }>, t: Translate): string {
  if (res.status === 401) return t("campaigns.commentSignIn");
  switch (res.code) {
    case "campaign_link":
      return t("campaigns.err.link");
    case "comments_closed":
      return t("campaigns.commentsClosed");
    case "updates_today":
      return t("campaigns.err.updatesToday");
    case "blocked":
      return t("campaigns.err.blocked");
    case "not_running":
      return t("campaigns.endedBody");
    case "slow_down":
      return t("community.err.slowDown");
    case "slow_down_new":
      return t("community.err.slowDownNew");
    default:
      return t("profile.greetFailed");
  }
}

/** The field an update or a comment is written in, with Post beside it. */
function NoteField({ campaignId, kind, onSent }: { campaignId: string; kind: NoteKind; onSent: () => void }) {
  const { t } = useTranslate();
  const fieldId = useId();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  // The word filter asks first, as under a post.
  const [ask, setAsk] = useState(false);
  const label = kind === "update" ? t("campaigns.updatePlaceholder") : t("campaigns.commentPlaceholder");

  async function send(confirmFiltered = false) {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailed(null);
    setNotice(null);
    const res = await writeNote(campaignId, kind, text, confirmFiltered);
    setBusy(false);
    setAsk(false);
    if (res.ok) {
      setDraft("");
      if (res.held) setNotice(t("campaigns.noteHeld"));
      onSent();
      return;
    }
    if (res.code === "filtered") {
      setAsk(true);
      return;
    }
    setFailed(refusal(res, t));
  }

  return (
    <div data-note-field={kind}>
      <div className="flex items-end gap-2">
        <label htmlFor={fieldId} className="sr-only">
          {label}
        </label>
        <textarea
          dir="auto"
          id={fieldId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          maxLength={NOTE_MAX}
          placeholder={label}
          className="block min-h-11 w-full flex-1 resize-none border-b border-paper/10 bg-transparent pb-2.5 pt-2 font-sans text-[16px] leading-[24px] text-paper/90 field-sizing-content placeholder:text-paper/55 focus:border-paper/30 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !draft.trim()}
          className="tap-press inline-flex min-h-11 shrink-0 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night disabled:opacity-40"
        >
          {busy ? t("community.replySending") : t("community.post")}
        </button>
      </div>
      {kind === "update" ? <p className="mt-2 font-sans text-caption leading-relaxed text-paper/70">{t("campaigns.updateHint")}</p> : null}
      {notice || failed ? (
        <p role={failed ? "alert" : "status"} className={cn("mt-2 font-sans text-detail leading-relaxed", failed ? "text-crimson-soft" : "text-paper/75")}>
          {failed ?? notice}
        </p>
      ) : null}
      <ConfirmDialog
        open={ask}
        title={t("community.filteredTitle")}
        description={t("community.filteredBody")}
        confirmLabel={t("community.filteredPost")}
        cancelLabel={t("community.filteredEdit")}
        pending={busy}
        onConfirm={() => void send(true)}
        onCancel={() => setAsk(false)}
      />
    </div>
  );
}

/** What a note's menu holds for this reader. Empty, and so no menu, when signed out on someone else's note. */
function noteMenu({
  note,
  signedIn,
  campaignMine,
  reported,
  t,
  onReport,
  onRemove,
}: {
  note: CampaignNote;
  signedIn: boolean;
  campaignMine: boolean;
  reported: boolean;
  t: Translate;
  onReport: () => void;
  onRemove: () => void;
}): ActionMenuItem[] {
  if (note.mine) return [{ label: t("common.delete"), onSelect: onRemove, danger: true }];
  if (!signedIn) return [];
  const items: ActionMenuItem[] = [{ label: reported ? t("community.reported") : t("community.report"), onSelect: onReport, disabled: reported }];
  // Its creator may take a comment off their own campaign, never an update (which is theirs anyway).
  if (campaignMine && !note.update) items.push({ label: t("campaigns.noteTakeOff"), onSelect: onRemove, danger: true });
  return items;
}

function useNoteActions(campaignId: string, onChanged: () => void) {
  const { t } = useTranslate();
  const [reported, setReported] = useState<ReadonlySet<string>>(new Set());
  const [removing, setRemoving] = useState<CampaignNote | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function report(note: CampaignNote) {
    setFailed(null);
    setReported((r) => new Set(r).add(note.id));
    const res = await reportCommunityItem({ replyId: note.id });
    if (!res.ok) {
      setReported((r) => {
        const next = new Set(r);
        next.delete(note.id);
        return next;
      });
      setFailed(t("community.reportFailed"));
    }
  }

  async function remove() {
    if (!removing || busy) return;
    setBusy(true);
    const res = await removeNote(campaignId, removing.id);
    setBusy(false);
    setRemoving(null);
    if (!res.ok) {
      setFailed(t("campaigns.noteRemoveFailed"));
      return;
    }
    onChanged();
  }

  const dialog = (
    <ConfirmDialog
      open={removing !== null}
      title={removing?.mine ? t("campaigns.noteDeleteTitle") : t("campaigns.noteTakeOffTitle")}
      description={removing?.mine ? t("campaigns.noteDeleteBody") : t("campaigns.noteTakeOffBody")}
      confirmLabel={removing?.mine ? t("common.delete") : t("campaigns.noteTakeOff")}
      cancelLabel={t("campaigns.cancel")}
      destructive
      pending={busy}
      onConfirm={() => void remove()}
      onCancel={() => setRemoving(null)}
    />
  );
  return { reported, report, ask: setRemoving, failed, dialog };
}

type PanelProps = {
  campaignId: string;
  /** Null while the thread is on its way; a failure says so and offers to try again. */
  result: ThreadResult | null;
  reload: () => void;
  /** The reader started this campaign. */
  campaignMine: boolean;
  /** The campaign takes words: it runs. */
  running: boolean;
};

function Unread({ result, reload }: { result: ThreadResult | null; reload: () => void }) {
  const { t } = useTranslate();
  if (result === null) {
    return (
      <p role="status" className="font-sans text-detail text-paper/70">
        {t("community.loadingReplies")}
      </p>
    );
  }
  return (
    <p role="alert" className="font-sans text-detail leading-relaxed text-paper/70">
      {t("community.loadFailed")}{" "}
      <button type="button" onClick={reload} className="hit-44 font-semibold text-paper underline underline-offset-4">
        {t("community.tryAgain")}
      </button>
    </p>
  );
}

/** The Updates door: the creator's field at the head, then the updates, newest first. */
export function CampaignUpdates({ campaignId, result, reload, campaignMine }: PanelProps) {
  const { t, locale } = useTranslate();
  const actions = useNoteActions(campaignId, reload);
  if (!result || result.state !== "ok") return <Unread result={result} reload={reload} />;
  const thread: CampaignThread = result.thread;

  return (
    <div data-campaign-updates="">
      {thread.canUpdate ? (
        <div className="mb-7">
          <NoteField campaignId={campaignId} kind="update" onSent={reload} />
        </div>
      ) : null}
      {thread.updates.length === 0 ? (
        <p className="font-sans text-detail leading-relaxed text-paper/70">{t("campaigns.updatesNone")}</p>
      ) : (
        <ol className="space-y-7">
          {thread.updates.map((note) => {
            const items = noteMenu({
              note,
              signedIn: thread.signedIn,
              campaignMine,
              reported: actions.reported.has(note.id),
              t,
              onReport: () => void actions.report(note),
              onRemove: () => actions.ask(note),
            });
            return (
              <li key={note.id} data-note="update">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-sans text-detail font-semibold text-paper/80">{dayText(note.created_at.slice(0, 10), locale)}</p>
                  {items.length > 0 ? <ActionMenu className="-me-1.5 -mt-2 shrink-0" label={t("profile.moreActions")} items={items} /> : null}
                </div>
                <p dir="auto" className="mt-1 whitespace-pre-line break-words font-serif text-body leading-[1.7] text-paper/90">{note.body}</p>
              </li>
            );
          })}
        </ol>
      )}
      {actions.failed ? (
        <p role="alert" className="mt-4 font-sans text-detail text-crimson-soft">
          {actions.failed}
        </p>
      ) : null}
      {actions.dialog}
    </div>
  );
}

/** The Comments door: the comments, oldest first, then the field, or why there is none. */
export function CampaignComments({ campaignId, result, reload, campaignMine, running }: PanelProps) {
  const { t } = useTranslate();
  const actions = useNoteActions(campaignId, reload);
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  if (!result || result.state !== "ok") return <Unread result={result} reload={reload} />;
  const thread: CampaignThread = result.thread;
  const signedIn = thread.signedIn;

  return (
    <div data-campaign-comments="">
      {thread.comments.length === 0 ? (
        <p className="font-sans text-detail leading-relaxed text-paper/70">{t("campaigns.commentsNone")}</p>
      ) : (
        <ol className="space-y-5">
          {thread.comments.map((note) => {
            // A muted writer's words stay folded until the reader opens them, as under a post.
            if (note.muted && !shown.has(note.id)) {
              return (
                <li key={note.id} data-note="muted">
                  <button
                    type="button"
                    onClick={() => setShown((s) => new Set(s).add(note.id))}
                    className="tap-press min-h-11 text-start font-sans text-detail leading-relaxed text-paper/70 underline decoration-paper/30 underline-offset-4"
                  >
                    {t("community.mutedReply")}
                  </button>
                </li>
              );
            }
            const items = noteMenu({
              note,
              signedIn,
              campaignMine,
              reported: actions.reported.has(note.id),
              t,
              onReport: () => void actions.report(note),
              onRemove: () => actions.ask(note),
            });
            return (
              <li key={note.id} data-note="comment" className="flex items-start gap-2.5">
                <CommunityAvatar name={note.author_name} url={note.author_avatar} size={28} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1 font-sans text-caption text-paper/70">
                    <span className="font-semibold text-paper/90">{note.author_name}</span>
                    <ClergySeal mark={isClergyMark(note.author_clergy) ? note.author_clergy : null} size={14} />
                    <span>
                      {"· "}
                      {timeAgo(note.created_at)}
                    </span>
                  </p>
                  <p dir="auto" className="mt-0.5 whitespace-pre-wrap break-words font-sans text-[14.5px] leading-[1.5] text-paper/90">{note.body}</p>
                </div>
                {items.length > 0 ? <ActionMenu className="-me-1.5 -mt-1 shrink-0" label={t("profile.moreActions")} items={items} /> : null}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-7">
        {thread.canComment ? (
          <NoteField campaignId={campaignId} kind="comment" onSent={reload} />
        ) : !thread.commentsOpen ? (
          <p className="font-sans text-detail leading-relaxed text-paper/70">{t("campaigns.commentsClosed")}</p>
        ) : running && !signedIn ? (
          <p className="font-sans text-detail leading-relaxed text-paper/70">
            {t("campaigns.commentSignIn")}{" "}
            <Link href={`/signin?next=${encodeURIComponent(`/campaigns/detail?id=${campaignId}`)}`} className="hit-44 font-semibold text-paper underline underline-offset-4">
              {t("common.signIn")}
            </Link>
          </p>
        ) : null}
      </div>
      {actions.failed ? (
        <p role="alert" className="mt-4 font-sans text-detail text-crimson-soft">
          {actions.failed}
        </p>
      ) : null}
      {actions.dialog}
    </div>
  );
}
