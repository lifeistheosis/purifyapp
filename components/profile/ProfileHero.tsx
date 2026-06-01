"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === displayName) {
      setEditing(false);
      setDraft(displayName);
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { display_name: trimmed } });
      await supabase
        .from("profiles")
        .update({
          display_name: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");
      setDisplayName(trimmed);
      setDraft(trimmed);
      setEditing(false);
    } catch {
      /* surface in console */
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
    <header className="rounded-lg border border-paper/12 bg-paper/[0.03] p-6 md:p-8">
      <div className="flex items-start gap-5">
        {/* Gold-ringed initials disc, SaintIcon-style fallback. */}
        <div
          aria-hidden
          className="shrink-0 relative rounded-full border-2 border-gold/65 shadow-[0_0_24px_rgba(212,175,55,0.18)] flex items-center justify-center"
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
            Welcome back
          </p>
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setDraft(displayName);
                setEditing(true);
              }}
              className="text-left group"
              aria-label="Edit display name"
            >
              <h2 className="font-display-serif text-title md:text-display-sm text-paper leading-[1.05] tracking-[-0.01em]">
                {displayName}
                <span className="ml-3 align-middle font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/35 group-hover:text-paper/65 transition-colors">
                  Edit
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
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <dt className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/45">
            Email
          </dt>
          <dd className="mt-1 font-sans text-ui text-paper truncate">
            {email}
          </dd>
        </div>
        {memberSince && (
          <div>
            <dt className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/45">
              Member since
            </dt>
            <dd className="mt-1 font-sans text-ui text-paper">
              {memberSince}
            </dd>
          </div>
        )}
        {lastSeen && (
          <div>
            <dt className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/45">
              Last signed in
            </dt>
            <dd className="mt-1 font-sans text-ui text-paper">
              {lastSeen}
            </dd>
          </div>
        )}
      </dl>
    </header>
  );
}
