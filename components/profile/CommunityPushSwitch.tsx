"use client";

// Community notifications, beside the prayer reminders in Settings,
// Notifications (1.8). Replies, mentions, follows, greetings and prayers reach
// the reader's devices only while this is on, and only the devices where they
// turned notifications on (lib/community/push.ts).
//
// The switch was in Edit profile alone, three screens from the reminders, so
// a reader looking for "notifications" in Settings found the reminders and
// email and not this. It is kept in one place, profiles.push_community, and
// every screen reads and writes that one value (lib/profile/client.ts,
// communityPushOn): Edit profile keeps its switch as a second way in, and
// the welcome questions offer it beside the reminders as they turn on
// (components/onboarding/RemindersOn.tsx, the "row" look). Off until the
// reader turns it on: asked for, never on by default.

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { communityEnabled } from "@/lib/community/flags";
import { communityPushOn, fetchMyProfile, saveMyProfile } from "@/lib/profile/client";

type State = { kind: "loading" } | { kind: "ready"; on: boolean } | { kind: "unavailable" };

export function CommunityPushSwitch({
  variant = "card",
  className,
}: {
  /** "card": Settings, Notifications. "row": a line among others, as beside the reminders. */
  variant?: "card" | "row";
  className?: string;
}) {
  const { t } = useTranslate();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!communityEnabled()) return;
    let alive = true;
    void fetchMyProfile().then((r) => {
      if (!alive) return;
      setState(r.ok ? { kind: "ready", on: communityPushOn(r.profile) } : { kind: "unavailable" });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Nothing to switch where Community is not open, and nothing said while
  // the reader's own setting cannot be read: a switch drawn at a guess would
  // be a promise about their phone.
  if (state.kind !== "ready") return null;

  async function flip() {
    if (state.kind !== "ready" || busy) return;
    const next = !state.on;
    setBusy(true);
    setState({ kind: "ready", on: next });
    const saved = await saveMyProfile({ pushCommunity: next });
    // Not taken: the switch goes back to what is kept, never shows a choice
    // the server does not hold.
    setState({ kind: "ready", on: saved.ok ? communityPushOn(saved.profile) : !next });
    setBusy(false);
  }

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={state.on}
      aria-label={t("profile.pushToggle")}
      disabled={busy}
      onClick={() => void flip()}
      className={cn(
        "hit-44 relative h-6 w-11 shrink-0 rounded-full border transition-colors motion-reduce:transition-none disabled:opacity-60",
        state.on ? "border-gold/50 bg-gold/40" : "border-paper/20 bg-paper/10",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-paper transition-[left,right] motion-reduce:transition-none",
          state.on ? "start-[22px]" : "start-[3px]",
        )}
      />
    </button>
  );

  if (variant === "row") {
    return (
      <div className={cn("flex items-center justify-between gap-4", className)}>
        <div className="min-w-0">
          <p className="font-sans text-ui text-paper">{t("profile.pushToggle")}</p>
          <p className="mt-0.5 font-sans text-caption leading-[1.5] text-paper/55">{t("profile.pushToggleHint")}</p>
        </div>
        {toggle}
      </div>
    );
  }

  return (
    <section className={cn("rounded-md border border-paper/12 bg-paper/[0.03] p-5", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-sans text-caption font-semibold text-paper/55 mb-2">{t("profile.pushToggle")}</p>
          <p className="font-serif text-body text-paper/85 leading-[1.6]">{t("profile.pushToggleHint")}</p>
        </div>
        {toggle}
      </div>
    </section>
  );
}
