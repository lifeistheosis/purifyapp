"use client";

// Read together (1.8, the owner's yes of 2026-10-24), on a reading path's
// page: the reader's circles on this path (a parish, a household, friends),
// their members, the invite code to pass on, and a way to start a circle or
// join one by its code. The days list under it says who in the circles has
// read each day (PathView). Signed in only; shown once the circle SQL is run
// (lib/circles/circles.ts, circlesEnabled).

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CIRCLE_KINDS, circlesEnabled, type Circle, type CircleKind } from "@/lib/circles/circles";
import { createCircle, fetchCircles, joinCircle, leaveCircle, markCircleDay } from "@/lib/circles/client";
import { normalizeInviteCode } from "@/lib/campaigns/groups";
import { useMyPicture } from "@/lib/profile/myPicture";
import { copyText } from "@/lib/ui/copyText";

export type CirclesState = {
  enabled: boolean;
  /** Whether the account is known yet: nothing is shown until it is. */
  known: boolean;
  signedIn: boolean;
  circles: Circle[] | null;
  reload: () => Promise<void>;
  /** Tell the circles a day is read, or not. */
  mark: (day: number, read: boolean) => void;
  /** Who in the reader's circles read a day, the reader left out (their own mark shows already). */
  readersOf: (day: number) => string[];
};

export function useCircles(pathId: string): CirclesState {
  const me = useMyPicture();
  const known = me.state !== "unknown";
  const signedIn = me.state === "in";
  const enabled = circlesEnabled();
  const [circles, setCircles] = useState<Circle[] | null>(null);

  const reload = useCallback(async () => {
    if (!enabled || !signedIn) return;
    const r = await fetchCircles(pathId);
    if (r.ok) setCircles(r.circles);
  }, [enabled, signedIn, pathId]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the read
       shares its path with every change to a circle; every write is past an
       await. */
    void reload();
  }, [reload]);

  const mark = useCallback(
    (day: number, read: boolean) => {
      if (!enabled || !signedIn || !circles?.length) return;
      void markCircleDay(pathId, day, read).then((r) => (r.ok ? reload() : undefined));
    },
    [enabled, signedIn, circles, pathId, reload],
  );

  const readersOf = useCallback(
    (day: number) => {
      const mine = new Set((circles ?? []).flatMap((c) => c.members.filter((m) => m.you).map((m) => m.name)));
      return [...new Set((circles ?? []).flatMap((c) => c.read[day] ?? []))].filter((n) => !mine.has(n));
    },
    [circles],
  );

  return { enabled, known, signedIn, circles, reload, mark, readersOf };
}

const KIND_KEY: Readonly<Record<CircleKind, string>> = {
  parish: "together.kind.parish",
  household: "together.kind.household",
  friends: "together.kind.friends",
};

export function ReadTogether({ pathId, state }: { pathId: string; state: CirclesState }) {
  const { t } = useTranslate();
  const [mode, setMode] = useState<"idle" | "start" | "join">("idle");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CircleKind>("parish");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);

  if (!state.enabled || !state.known) return null;

  if (!state.signedIn) {
    return (
      <section aria-labelledby="together-title" className="mt-8 border-y border-paper/[0.07] py-5">
        <h2 id="together-title" className="font-serif text-title-sm font-semibold text-paper">{t("together.title")}</h2>
        <p className="mt-1 font-sans text-caption text-paper/55">
          <Link href={`/signin?next=/reading/paths/${pathId}`} className="underline underline-offset-4">
            {t("together.signIn")}
          </Link>
        </p>
      </section>
    );
  }
  if (state.circles === null) return null;

  async function start() {
    setBusy(true);
    setSaid(null);
    const r = await createCircle({ name: name.trim(), kind, pathId });
    setBusy(false);
    if (!r.ok) return setSaid(r.error || t("together.failed"));
    setMode("idle");
    setName("");
    await state.reload();
  }

  async function join() {
    setBusy(true);
    setSaid(null);
    const r = await joinCircle(normalizeInviteCode(code));
    setBusy(false);
    if (!r.ok) return setSaid(r.error || t("together.failed"));
    setMode("idle");
    setCode("");
    await state.reload();
  }

  async function leave(id: string) {
    setLeaving(null);
    const r = await leaveCircle(id);
    if (!r.ok) return setSaid(r.error || t("together.failed"));
    await state.reload();
  }

  const field = "h-11 w-full rounded-[12px] border border-paper/15 bg-paper/[0.04] px-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:border-paper/35 focus:outline-none";
  const pill = "tap-press inline-flex min-h-11 items-center rounded-pill border border-paper/15 px-4 font-sans text-detail font-semibold text-paper/85 hover:border-paper/35";

  return (
    <section aria-labelledby="together-title" className="mt-8 border-y border-paper/[0.07] py-5">
      <h2 id="together-title" className="font-serif text-title-sm font-semibold text-paper">{t("together.title")}</h2>
      {state.circles.length === 0 ? <p className="mt-1 max-w-[60ch] font-sans text-caption leading-[1.6] text-paper/55">{t("together.intro")}</p> : null}

      {state.circles.map((c) => (
        <div key={c.id} data-circle="" className="mt-4">
          <p className="font-sans text-ui font-semibold text-paper">
            {c.name} <span className="font-normal text-paper/50">· {t(KIND_KEY[c.kind])}</span>
          </p>
          <p className="mt-0.5 font-sans text-caption text-paper/60">{c.members.map((m) => m.name).join(", ")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-sans text-caption text-paper/60">
            <span>
              {t("together.code")} <span className="font-semibold tracking-[0.12em] text-paper">{c.inviteCode}</span>
            </span>
            <button type="button" onClick={() => void copyText(c.inviteCode).then((ok) => setSaid(ok ? t("together.copied") : null))} className={pill}>
              {t("together.copy")}
            </button>
            {leaving === c.id ? (
              <button type="button" onClick={() => void leave(c.id)} className={pill}>
                {t("together.leaveSure")}
              </button>
            ) : (
              <button type="button" onClick={() => setLeaving(c.id)} className="tap-press min-h-11 px-2 text-paper/55 underline-offset-4 hover:underline">
                {t("together.leave")}
              </button>
            )}
          </div>
        </div>
      ))}

      {mode === "start" ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t("together.name")} aria-label={t("together.name")} className={field} />
          <div role="radiogroup" aria-label={t("together.kind")} className="flex flex-wrap gap-2">
            {CIRCLE_KINDS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`${pill} aria-checked:border-paper aria-checked:text-paper`}>
                {t(KIND_KEY[k])}
              </button>
            ))}
          </div>
          <button type="submit" disabled={busy || name.trim().length < 2} className="tap-press inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night disabled:opacity-50">
            {t("together.create")}
          </button>
        </form>
      ) : mode === "join" ? (
        <form
          className="mt-4 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void join();
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={9} placeholder={t("together.codePlaceholder")} aria-label={t("together.code")} className={`${field} max-w-[11rem] uppercase tracking-[0.12em]`} />
          <button type="submit" disabled={busy || normalizeInviteCode(code).length !== 6} className="tap-press inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night disabled:opacity-50">
            {t("together.joinButton")}
          </button>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode("start")} className={pill}>
            {t("together.start")}
          </button>
          <button type="button" onClick={() => setMode("join")} className={pill}>
            {t("together.join")}
          </button>
        </div>
      )}
      {said ? <p className="mt-2 font-sans text-caption text-paper/60" aria-live="polite">{said}</p> : null}
    </section>
  );
}
