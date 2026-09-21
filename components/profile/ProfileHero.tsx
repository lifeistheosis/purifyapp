"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Displays the signed-in user's display name (editable inline), email,
 * and member-since date. Saves changes to both auth.users.user_metadata
 * (so the app picks them up across sessions) and the profiles.display_name
 * column (so other future surfaces can read them via RLS).
 */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function relativeTime(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "Just now";
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 2) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

  const initials = initialsFromName(displayName);
  const lastSeen = lastSignedInAt ? relativeTime(lastSignedInAt) : "";

  return (
    <header
      className="relative overflow-hidden rounded-2xl border border-paper/10 p-6 md:p-8"
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
        />
      </svg>
      <div className="relative">
      <div className="flex items-start gap-5">
        {/* Gold-ringed initials disc, SaintIcon-style fallback. */}
        <div
          aria-hidden
          className="shrink-0 relative rounded-full border-2 border-gold/65 shadow-[0_0_24px_rgba(183,176,163,0.18)] flex items-center justify-center"
          style={{
            width: 64,
            height: 64,
            background:
              "linear-gradient(155deg, #2a1f10 0%, #3b2a14 50%, #5a3f1c 100%)",
          }}
        >
          <span className="font-display-serif text-title-sm text-cream tracking-[0.04em]">
            {initials}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
            {t("ui.welcomeBack")}
          </p>
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setDraft(displayName);
                setEditing(true);
              }}
              className="text-left group"
              aria-label={t("ui.editDisplayName")}
            >
              <h2 className="font-display-serif text-title md:text-display-sm text-paper leading-[1.05] tracking-[-0.01em]">
                {displayName}
                <span className="ml-3 align-middle font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/35 group-hover:text-paper/65 transition-colors">
                  {t("common.edit")}
                </span>
              </h2>
            </button>
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
      <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <dt className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/45">
            {t("common.email")}
          </dt>
          <dd className="mt-1 font-sans text-ui text-paper truncate">
            {email}
          </dd>
        </div>
        {memberSince && (
          <div>
            <dt className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/45">
              {t("ui.memberSince")}
            </dt>
            <dd className="mt-1 font-sans text-ui text-paper">
              {memberSince}
            </dd>
          </div>
        )}
        {lastSeen && (
          <div>
            <dt className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/45">
              {t("ui.lastSignedIn")}
            </dt>
            <dd className="mt-1 font-sans text-ui text-paper">
              {lastSeen}
            </dd>
          </div>
        )}
      </dl>
      </div>
    </header>
  );
}
