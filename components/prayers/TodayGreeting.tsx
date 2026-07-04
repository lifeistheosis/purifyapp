"use client";

// The personal line at the top of Today: a local-time greeting (with the
// reader's name when they are signed in and have set one), the rule the
// hour calls for, whether it has already been prayed today, and a quiet
// 14-day rhythm row. Everything reads from local storage and the client
// clock; nothing here requires an account, and every lookup fails silent.

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { readPrayedDates, rhythmFor } from "@/lib/prayers/storage";
import { cn } from "@/lib/cn";

type Suggestion = {
  greeting: string;
  ruleId: "morning" | "evening";
  label: string;
  href: string;
};

function suggestionFor(hour: number): Suggestion {
  if (hour < 12) {
    return {
      greeting: "Good morning",
      ruleId: "morning",
      label: "the Morning Rule",
      href: "/prayers/morning",
    };
  }
  if (hour < 17) {
    return {
      greeting: "Good afternoon",
      ruleId: "morning",
      label: "the Morning Rule",
      href: "/prayers/morning",
    };
  }
  return {
    greeting: "Good evening",
    ruleId: "evening",
    label: "the Evening Rule",
    href: "/prayers/evening",
  };
}

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function TodayGreeting() {
  const [ready, setReady] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [prayedToday, setPrayedToday] = useState(false);
  const [rhythm, setRhythm] = useState<{ date: string; prayed: boolean }[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate (Sheet.tsx precedent): the clock, localStorage, and the session
     are all client-only. */
  useEffect(() => {
    const s = suggestionFor(new Date().getHours());
    setSuggestion(s);
    try {
      setPrayedToday(readPrayedDates(s.ruleId).includes(ymdLocal(new Date())));
      setRhythm(rhythmFor(s.ruleId, 14));
    } catch {
      /* ignore */
    }
    setReady(true);
    // The name is a garnish; it arrives when it arrives.
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const dn = data.user?.user_metadata?.display_name;
        if (typeof dn === "string" && dn.trim()) {
          setName(dn.trim().split(/\s+/)[0]);
        }
      })
      .catch(() => {
        /* signed out or offline: greet without a name */
      });
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!ready || !suggestion) return <div className="h-[76px]" aria-hidden />;

  const prayedAny = rhythm.some((d) => d.prayed);

  return (
    <div className="mt-6 rounded-lg border border-gold/25 bg-gold/[0.04] px-5 py-4">
      <p className="font-serif text-lede text-paper/85 leading-snug">
        {suggestion.greeting}
        {name ? `, ${name}` : ""}.{" "}
        {prayedToday ? (
          <span className="text-paper/65">
            You have already prayed {suggestion.label} today.
          </span>
        ) : (
          <>
            <span className="text-paper/65">The hour calls for </span>
            <Link
              href={suggestion.href}
              className="font-sans text-ui font-semibold text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
            >
              {suggestion.label}
            </Link>
            <span className="text-paper/65">.</span>
          </>
        )}
      </p>
      {prayedAny ? (
        <p className="mt-3 flex items-center gap-2">
          <span className="flex items-center gap-[5px]" aria-hidden>
            {rhythm.map((d) => (
              <span
                key={d.date}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  d.prayed ? "bg-gold" : "bg-paper/15",
                )}
              />
            ))}
          </span>
          <span className="font-sans text-caption text-paper/55">
            your last fourteen days with {suggestion.label}
          </span>
        </p>
      ) : null}
    </div>
  );
}
