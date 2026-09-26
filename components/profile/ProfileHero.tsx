"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Pen } from "@/components/ui/icons/Pen";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { InitialsAvatar } from "@/components/profile/InitialsAvatar";

/** What each tier is called on the pill. Product names, not tier ids. */
const TIER_LABEL: Record<"free" | "plus" | "pro", string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
};

/**
 * Displays the signed-in user's display name (editable inline), email,
 * and member-since date. Saves changes to both auth.users.user_metadata
 * (so the app picks them up across sessions) and the profiles.display_name
 * column (so other future surfaces can read them via RLS).
 */
/**
 * Lower case on purpose. Every one of these now follows a label inside a
 * pill ("Last signed in just now"), so a capital would land mid-sentence.
 * The absolute date keeps its own capitals because a month name has them
 * wherever it sits.
 */
function relativeTime(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 2) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * One fact about the account, as a pill: an icon carrying the category and
 * the value in plain words. Outlined rather than filled, so a row of them
 * reads as chrome around the name rather than as a row of buttons.
 */
function Fact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-paper/15 bg-paper/[0.04] px-3 py-1.5 font-sans text-caption text-paper/70">
      <span aria-hidden className="shrink-0 text-paper/40">
        {icon}
      </span>
      {children}
    </span>
  );
}

export function ProfileHero({
  email,
  initialDisplayName,
  joinedAt,
  lastSignedInAt,
}: {
  email: string;
  initialDisplayName: string;
  joinedAt: string;
  lastSignedInAt?: string;
}) {
  const { t } = useTranslate();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tier = usePremiumTier();

  /**
   * Write the new name to BOTH places it is read from, and say so when
   * either refuses.
   *
   * The name is read back in two steps by ProfileTabClient: first from the
   * session cookie's user_metadata, then overwritten by profiles.display_name
   * when that row arrives. So a write that lands in auth and not in the table
   * looks, after one reload, exactly like a write that never happened. This
   * used to be that: the whole function hung on updateUser (see AppNav, which
   * held the auth lock against itself), so auth took the new name, the table
   * never did, and the reader saw the old one come back.
   *
   * Three silent failures were underneath it, each still live once the hang
   * was gone, so all four are fixed together:
   *   1. postgrest returns RLS refusals in `error`, it does not throw, and
   *      nothing here looked at `error`. A denied write reported success.
   *   2. the row was targeted with `getUser()?.id ?? ""`, so a failed user
   *      read updated zero rows and still reported success.
   *   3. `catch {}` was empty, so a thrown failure also reported success.
   * The user is told now, in all three cases, and the name stays in the box
   * so nothing they typed is lost.
   */
  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === displayName) {
      setEditing(false);
      setDraft(displayName);
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth, error: authErr } = await supabase.auth.updateUser({
        data: { display_name: trimmed },
      });
      if (authErr) throw new Error(authErr.message);

      const id = auth.user?.id;
      if (!id) throw new Error("Not signed in.");

      const { error: rowErr } = await supabase
        .from("profiles")
        .update({
          display_name: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      // Auth already has the new name at this point. Leaving the table behind
      // is the exact state that reads as "it did not save", so it is an error
      // here rather than something to shrug at.
      if (rowErr) throw new Error(rowErr.message);

      setDisplayName(trimmed);
      setDraft(trimmed);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that name.");
    }
    setSaving(false);
  }

  const memberSince = joinedAt
    ? new Date(joinedAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "";

  const lastSeen = lastSignedInAt ? relativeTime(lastSignedInAt) : "";

  return (
    <header
      className="lm-violet relative overflow-hidden rounded-2xl border border-paper/10 p-6 md:p-8"
      style={{
        // Violet tint — matches MobileHeroCard's "violet" mood for the
        // You / account surface, so desktop reads as the same family.
        background:
          "radial-gradient(120% 80% at 80% 90%, rgba(150,100,200,0.18) 0%, transparent 60%), linear-gradient(180deg, #14101c 0%, #08060d 100%)",
      }}
    >
      <svg
        aria-hidden
        viewBox="0 0 400 200"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-50"
        preserveAspectRatio="none"
      >
        <path
          d="M0 160 C 80 120, 160 200, 240 150 S 400 120, 400 160 L 400 200 L 0 200 Z"
          fill="rgba(14,8,18,0.85)"
          className="lm-violet-wave"
        />
      </svg>
      <div className="relative">
      <div className="flex items-start gap-5">
        {/* The reader's initials: neutral and minimal since 2026-09-25, no
            gold ring or glow (see InitialsAvatar). */}
        <InitialsAvatar name={displayName} size={64} />
        <div className="min-w-0 flex-1">
          {/*
            No greeting above the name. "Welcome back" was a third
            typographic voice (tracked uppercase) stacked over a serif
            display name and a row of pills, and it pushed the one thing
            the card is about down a line to say nothing. The name leads.
          */}
          {!editing ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="font-display-serif text-title md:text-display-sm text-paper leading-[1.05] tracking-[-0.01em] min-w-0 break-words">
                {displayName}
              </h2>
              {tier !== "loading" && (
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-sans text-eyebrow font-semibold uppercase tracking-[1.1px]",
                    tier === "free"
                      ? "border border-paper/20 text-paper/55"
                      : "border border-gold/45 bg-gold/15 text-gold",
                  )}
                >
                  {tier !== "free" && (
                    <span aria-hidden className="shrink-0">
                      <Sparkle size={11} />
                    </span>
                  )}
                  {TIER_LABEL[tier]}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setDraft(displayName);
                  setEditing(true);
                }}
                aria-label={t("ui.editDisplayName")}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-pill border border-paper/20 bg-paper/[0.04] px-3 py-1.5 font-sans text-caption text-paper/70 hover:text-paper hover:border-paper/40 hover:bg-paper/[0.08] transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none"
              >
                <span aria-hidden className="shrink-0 text-paper/45">
                  <Pen size={13} />
                </span>
                {t("common.edit")}
              </button>
            </div>
          ) : (
            <div className="hidden" aria-hidden="true" />
          )}
        </div>
      </div>
      {editing ? (
        <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            // The input only mounts when the user clicks "edit", focus is
            // following the user's intent, not stealing it.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setDraft(displayName);
                setEditing(false);
              }
            }}
            maxLength={60}
            className="flex-1 min-w-0 bg-paper/[0.06] border border-paper/30 rounded-pill px-4 py-2 font-sans text-title-sm md:text-title text-paper focus:outline-none focus:border-paper/60 transition-colors"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="font-sans text-detail font-medium bg-paper text-night rounded-pill px-4 py-2 hover:bg-paper/90 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(displayName);
                setEditing(false);
              }}
              className="font-sans text-detail text-paper/55 hover:text-paper transition-colors px-3 py-2"
            >
              {t("common.cancel")}
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="w-full sm:w-auto font-sans text-caption text-rose-300/90 leading-[1.45]"
            >
              {error}
            </p>
          )}
        </div>
      ) : null}
      {/*
        Three labelled blocks became three pills.

        The old shape was a <dl> of uppercase tracked micro-labels over
        values, one third of the card's width each. It spent a full row of
        vertical space and three pieces of label typography on facts nobody
        comes to this page to read: they are context, not content. The name
        is the content, and it was competing with them.

        As pills they are one scannable line, the label carried by an icon
        and the value in the reader's own words ("9 days ago", not a
        timestamp), and the row wraps to two lines on a narrow phone rather
        than collapsing to three stacked blocks. `flex-wrap` and not a grid,
        because the pills are different natural widths and should stay that
        way.

        The email keeps a full-width line of its own above them. It is the
        one fact here that is genuinely long, it is the account's identity,
        and squeezing it into a pill would truncate the part that identifies
        it. `break-all` rather than `truncate`: a reader checking WHICH
        account they are signed into needs the whole address.
      */}
      <p className="mt-6 font-sans text-ui text-paper/80 break-all">{email}</p>
      <ul className="mt-3 flex flex-wrap items-center gap-2">
        {memberSince && (
          <li>
            <Fact icon={<Calendar size={13} />}>
              {t("ui.memberSince")} {memberSince}
            </Fact>
          </li>
        )}
        {lastSeen && (
          <li>
            <Fact icon={<Hourglass size={13} />}>
              {t("ui.lastSignedIn")} {lastSeen}
            </Fact>
          </li>
        )}
      </ul>
      </div>
    </header>
  );
}
