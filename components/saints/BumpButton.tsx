"use client";

import { useEffect, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { Info } from "@/components/ui/icons/Info";
import { cn } from "@/lib/cn";
import { askLine } from "@/lib/saints/page";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/client";

type Props = {
  slug: string;
  saintName: string;
  initialBumped: boolean;
  initialTotal: number;
  signedIn: boolean;
  /**
   * When true, the corpus for this saint is shipped end-to-end. The request
   * is replaced by a quiet Fully published pill: there is nothing more for
   * readers to ask for.
   */
  complete?: boolean;
  /**
   * A second action for the same row (the saint's Save button), so the two
   * stand side by side at one height with the note under both.
   */
  trailing?: ReactNode;
};

const noSubscribe = () => () => {};

/**
 * What asking does, behind the round "i" at the start of the row (1.7).
 *
 * It was a line of underlined words under the buttons ("What does requesting
 * do?"), and before that a 24px "?" whose box ran off the screen. The sheet
 * it opens is the part the owner called good (note 19 of 2026-10-16), so the
 * sheet and its words are as they were: the shared sheet, which cannot be
 * wider than the screen and moves with the finger like every other pop-up.
 * The button is a drawn icon (components/ui/icons/Info), never a character,
 * and `data-saint-explainer` is how the export walk finds it.
 */
function Explain({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={label}
        data-saint-explainer
        className="tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-paper/15 text-paper/75 motion-safe:transition-colors hover:border-paper/35 hover:text-paper"
      >
        <Info size={20} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label} desktop openFull>
        <div className="pb-1 pt-1 font-sans text-detail leading-relaxed text-paper/85">{children}</div>
      </Sheet>
    </>
  );
}

/** The pill: one height and one type size, whatever it says. */
const PILL =
  "tap-press inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-pill px-4 font-sans text-ui font-semibold motion-safe:transition-colors";

/**
 * The saint's actions on one row (1.7, the owner's note 19): what asking
 * means, the request itself as one clear pill, and Save. Under it, one quiet
 * line: how many readers asked, in words, or an invitation when nobody has
 * yet. Never a bare 0, and no triangle: the owner named both.
 */
function ActionRow({
  explain,
  main,
  trailing,
  note,
}: {
  explain: ReactNode;
  main: ReactNode;
  trailing?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[420px] md:mx-0">
      <div className="flex items-center gap-2">
        {explain}
        {main}
        {trailing}
      </div>
      {note ? (
        <p aria-live="polite" className="mt-2.5 font-sans text-caption leading-snug text-paper/55">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function RequestExplainer() {
  const { t } = useTranslate();
  return (
    <>
      <p className="mb-2 font-semibold text-paper">{t("saints.bump.requesting")}</p>
      <p>
        {t("saints.bump.requestExplainer1")}{" "}
        <em className="text-gold">{t("saints.bump.requestQuote")}</em>
      </p>
      <p className="mt-2">{t("saints.bump.requestExplainer2")}</p>
    </>
  );
}

function CompleteExplainer() {
  const { t } = useTranslate();
  return (
    <>
      <p className="mb-2 font-semibold text-paper">{t("saints.bump.fullyPublished")}</p>
      <p>{t("saints.bump.completeExplainer1")}</p>
      <p className="mt-2 text-paper/65">
        {t("saints.bump.completeExplainer2")}{" "}
        <Link href="/contact" className="text-gold hover:underline">
          {t("saints.bump.letUsKnow")}
        </Link>
        .
      </p>
    </>
  );
}

export function BumpButton({
  slug,
  saintName,
  initialBumped,
  initialTotal,
  signedIn,
  complete,
  trailing,
}: Props) {
  const { t, tn } = useTranslate();
  const [bumped, setBumped] = useState(initialBumped);
  const [total, setTotal] = useState(initialTotal);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  // signedIn ARRIVES FALSE IN THE NATIVE APP, always.
  //
  // The saint page computes it on the server, and lib/supabase/server.ts hands
  // the static export a deliberately cookie-less anon client, so getUser() at
  // build time sees nobody and `signedIn: false` is baked into the bundle. A
  // signed-in reader on Android or iOS was therefore shown "Sign in to
  // request" and could not bump at all. The website is unaffected: that route
  // renders dynamically, so the server already knows.
  //
  // readLocalSessionUser rather than auth.getUser(): it is synchronous, does
  // no network call and never touches the cross-tab auth lock, which is the
  // hang recorded as F-13. It also reads the native shells' own store, which
  // is the only place this session lives on the surface that is broken.
  //
  // Upgrade only. A true from the server is never overturned by a failed local
  // read, so the web path cannot regress.
  //
  // Read during render through useSyncExternalStore, not copied into state by
  // an effect: the server snapshot is the prop, so hydration matches, and the
  // client snapshot upgrades it in the same commit. (It was a setState in the
  // effect below, which react-hooks/set-state-in-effect rejects and which cost
  // a second render on every saint page.) The session is not subscribed to:
  // signing in navigates, and the page mounts again.
  const liveSignedIn = useSyncExternalStore(
    noSubscribe,
    () => signedIn || readLocalSessionUser() !== null,
    () => signedIn,
  );
  useEffect(() => {
    if (signedIn) return;
    const user = readLocalSessionUser();
    if (!user) return;

    // AND SEED THE REAL STATE. initialBumped and initialTotal were computed by
    // the same signed-out build-time render, so they are false and stale here
    // too. Showing the button without this is worse than hiding it: a reader
    // who had already bumped would see "Request writings", tap it, and the
    // route would read their existing row and DELETE it. They would have
    // withdrawn their own request by asking for it again.
    //
    // Both reads are the reader's own row and a public aggregate, so RLS
    // (saint_bumps_self_select) and the anon grant on saint_bump_counts cover
    // them without the API hop.
    let cancelled = false;
    const supa = createClient();
    void (async () => {
      const [mine, agg] = await Promise.all([
        supa
          .from("saint_bumps")
          .select("id")
          .eq("user_id", user.id)
          .eq("saint_slug", slug)
          .maybeSingle(),
        supa
          .from("saint_bump_counts")
          .select("bumps")
          .eq("saint_slug", slug)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (mine.data) setBumped(true);
      if (typeof agg.data?.bumps === "number") setTotal(agg.data.bumps);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, slug]);
  const pathname = usePathname();

  // How many readers asked, in words, or an invitation when nobody has yet.
  const line = askLine(total);
  const count = line.key === "saints.ask.count" ? tn(line.key, line.count) : t(line.key);
  const requestExplain = (
    <Explain label={t("saints.bump.whatRequesting")}>
      <RequestExplainer />
    </Explain>
  );

  // Fully published: nothing left to ask for, so a quiet pill stands where
  // the request was, and the "i" says what that means.
  if (complete) {
    return (
      <ActionRow
        trailing={trailing}
        explain={
          <Explain label={t("saints.bump.whatFullyPublished")}>
            <CompleteExplainer />
          </Explain>
        }
        main={
          <p className={cn(PILL, "border border-paper/15 text-paper/80")}>
            <Check size={16} className="shrink-0" />
            <span aria-hidden className="truncate">
              {t("saints.bump.fullyPublished")}
            </span>
            <span className="sr-only">{t("saints.bump.fullyPublishedAria", { name: saintName })}</span>
          </p>
        }
      />
    );
  }

  if (!liveSignedIn) {
    const next = pathname ?? `/saints/${slug}`;
    return (
      <ActionRow
        trailing={trailing}
        explain={requestExplain}
        main={
          <Link
            href={`/signin?next=${encodeURIComponent(next)}`}
            aria-label={t("saints.ask.signInAria", { name: saintName })}
            className={cn(PILL, "border border-paper/25 text-paper hover:border-paper/50")}
          >
            <span className="truncate">{t("saints.ask.label")}</span>
          </Link>
        }
        note={count}
      />
    );
  }

  function toggle() {
    if (pending) return;
    const optimisticBumped = !bumped;
    const optimisticTotal = total + (optimisticBumped ? 1 : -1);
    setBumped(optimisticBumped);
    setTotal(Math.max(0, optimisticTotal));
    setError(false);

    startTransition(async () => {
      try {
        // apiFetch, not fetch. A relative URL in the native shell resolves to
        // https://localhost, which is the bundled asset server and has no
        // API: the call came back as the shell's own index.html. apiFetch
        // sends it to the real site with the Bearer token attached.
        const r = await apiFetch(`/api/saints/${slug}/bump`, { method: "POST" });
        if (!r.ok) throw new Error();
        const j = (await r.json()) as { bumped: boolean; total: number };
        setBumped(j.bumped);
        setTotal(j.total);
      } catch {
        setBumped(!optimisticBumped);
        setTotal(total);
        setError(true);
      }
    });
  }

  return (
    <ActionRow
      trailing={trailing}
      explain={requestExplain}
      main={
        // Named by its words, which are on the screen (a reader who speaks to
        // the phone says what they see); aria-pressed says whether it is asked.
        <button
          type="button"
          onClick={toggle}
          aria-pressed={bumped}
          disabled={pending}
          className={cn(
            PILL,
            bumped ? "bg-paper text-night hover:bg-paper/90" : "border border-paper/25 text-paper hover:border-paper/50",
            pending && "opacity-70",
          )}
        >
          {bumped ? <Check size={16} className="shrink-0" /> : null}
          <span className="truncate">{bumped ? t("saints.ask.asked") : t("saints.ask.label")}</span>
        </button>
      }
      note={
        error ? (
          <span role="alert" className="text-rose-300">
            {t("saints.bump.error")}
          </span>
        ) : (
          count
        )
      }
    />
  );
}
