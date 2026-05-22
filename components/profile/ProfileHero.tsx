"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Displays the signed-in user's display name (editable inline), email,
 * and member-since date. Saves changes to both auth.users.user_metadata
 * (so the app picks them up across sessions) and the profiles.display_name
 * column (so other future surfaces can read them via RLS).
 */
export function ProfileHero({
  email,
  initialDisplayName,
  joinedAt,
}: {
  email: string;
  initialDisplayName: string;
  joinedAt: string;
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

  return (
    <header className="rounded-lg border border-paper/12 bg-paper/[0.03] p-6 md:p-8">
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
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
          <h2 className="font-sans text-[32px] md:text-[40px] font-bold text-paper leading-[1.1] tracking-[-0.02em]">
            {displayName}
            <span className="ml-3 align-middle font-sans text-[12px] uppercase tracking-[1.2px] text-paper/35 group-hover:text-paper/65 transition-colors">
              Edit
            </span>
          </h2>
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setDraft(displayName);
                setEditing(false);
              }
            }}
            maxLength={60}
            className="flex-1 min-w-0 bg-paper/[0.06] border border-paper/30 rounded-pill px-4 py-2 font-sans text-[22px] md:text-[26px] text-paper focus:outline-none focus:border-paper/60 transition-colors"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="font-sans text-[13px] font-medium bg-paper text-night rounded-pill px-4 py-2 hover:bg-paper/90 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(displayName);
                setEditing(false);
              }}
              className="font-sans text-[13px] text-paper/55 hover:text-paper transition-colors px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <dt className="font-sans text-[11px] font-semibold uppercase tracking-[1.2px] text-paper/45">
            Email
          </dt>
          <dd className="mt-1 font-sans text-[14.5px] text-paper truncate">
            {email}
          </dd>
        </div>
        {memberSince && (
          <div>
            <dt className="font-sans text-[11px] font-semibold uppercase tracking-[1.2px] text-paper/45">
              Member since
            </dt>
            <dd className="mt-1 font-sans text-[14.5px] text-paper">
              {memberSince}
            </dd>
          </div>
        )}
      </dl>
    </header>
  );
}
