"use client";

import type { KeyboardEvent, RefObject } from "react";

import { MentionField } from "@/components/community/MentionField";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

/**
 * A reader's own words, open to edit where they stood (1.9, build 95 note
 * 10, a reader's ask: "We should have the ability to remove or edit our
 * comments under replies and posts").
 *
 * Opened from the post's or the reply's own ⋯ menu, so there is no new way
 * in. The words become the fields they were written in: a discussion's title
 * and words, a share's own words (never its line, which is Purify's, from
 * the library, verbatim), a reply's words. They are the house's own field
 * (MentionField, so an @mention is suggested as when writing), with a fine
 * edge and no ring when tapped, and Cancel and Save under them at the end a
 * thumb reaches, each 44px to the touch. Escape cancels; in a reply, Enter
 * saves, as it sends one.
 */
export type EditWordsKind = "discussion" | "share" | "reply";

export function EditWords({
  kind,
  title = "",
  onTitle,
  body,
  onBody,
  fieldRef,
  fieldClass,
  canSave,
  onSave,
  onCancel,
}: {
  kind: EditWordsKind;
  /** A discussion's title. */
  title?: string;
  onTitle?: (value: string) => void;
  body: string;
  onBody: (value: string) => void;
  /** The words' field, which the card focuses as it opens, inside the tap. */
  fieldRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  /** The card's own field look (the reply box's). */
  fieldClass: string;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslate();
  const reply = kind === "reply";

  const keys = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (reply && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSave) onSave();
    }
  };

  return (
    <div className={reply ? "mt-1" : "mt-2"} data-edit-words={kind}>
      {kind === "discussion" ? (
        <input
          dir="auto"
          value={title}
          onChange={(e) => onTitle?.(e.target.value)}
          onKeyDown={keys}
          maxLength={160}
          aria-label={t("community.titlePlaceholder")}
          placeholder={t("community.titlePlaceholder")}
          className={cn(fieldClass, "mb-2")}
        />
      ) : null}
      <MentionField
        as="textarea"
        fieldRef={fieldRef}
        value={body}
        onChange={onBody}
        rows={reply ? 2 : 3}
        maxLength={reply ? 2000 : 4000}
        placeholder={
          kind === "discussion"
            ? t("community.bodyPlaceholder")
            : kind === "share"
              ? t("community.reflectionPlaceholder")
              : t("community.replyPlaceholder")
        }
        className={cn(fieldClass, "block resize-none field-sizing-content", reply ? "!py-2" : "min-h-24 leading-[22px]")}
        onKeyDown={keys}
      />
      <div className={cn("flex items-center justify-end gap-2", reply ? "mt-1.5" : "mt-2")}>
        <button
          type="button"
          onClick={onCancel}
          className={cn("min-h-11 px-3 font-sans font-semibold text-paper/75 hover:text-paper", reply ? "text-caption" : "text-detail")}
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className={cn(
            "min-h-11 shrink-0 rounded-pill bg-paper font-sans font-semibold text-night disabled:opacity-50",
            reply ? "px-4 text-caption" : "px-5 text-detail",
          )}
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
