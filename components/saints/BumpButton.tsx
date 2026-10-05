"use client";

import { useEffect, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
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
   * When true, the corpus for this saint is shipped end-to-end. The
   * button is replaced by a static Fully-published badge — there's
   * nothing more for readers to ask for.
   */
  complete?: boolean;
  /**
   * A second action for the same row (the saint's Save button), so the two
   * stand side by side at one height with the note under both.
   */
  trailing?: ReactNode;
};

const noSubscribe = () => () => {};

// What a request does, behind one line of text under the buttons.
//
// It was a 24px "?" beside the button that opened a 280px box from its own
// left edge. On a phone the "?" sits at the right of the row, so the box ran
// 193px off the screen and the whole page grew sideways to hold it: the
// reader saw the screen "zoom in" (the owner, 2026-10-05). It is the shared
// sheet now, which cannot be wider than the screen, moves with the finger
// like every other pop-up, and is the same panel on a computer.
function Explain({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="hit-44 font-sans text-caption font-medium text-paper/65 underline decoration-paper/25 underline-offset-[3px] transition-colors hover:text-paper hover:decoration-paper/60"
      >
        {label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label} desktop openFull>
        <div className="pb-1 pt-1 font-sans text-detail leading-relaxed text-paper/85">{children}</div>
      </Sheet>
    </>
  );
}

/**
 * The request's mark: an upward triangle, hollow until it is asked and solid
 * once it is. Drawn, where it used to be the characters △ and ▲: those sit in
 * the symbol ranges the page's fonts are split by, so the first one on a page
 * could fetch a font file to draw itself (components/community/SymbolText.tsx
 * records the same trap).
 */
function RequestMark({ solid = false }: { solid?: boolean }) {
  return (
    <svg
      width="13"
      height="12"
      viewBox="0 0 13 12"
      fill={solid ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path d="M6.5 1.4 11.9 10.8H1.1Z" />
    </svg>
  );
}

/** Both buttons in the row share this: one height, one type size. */
const ACTION =
  "tap-press inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-pill px-4 font-sans text-detail font-semibold transition-colors";

/**
 * The saint's actions: the request (or what stands in its place) and whatever
 * the page hands over beside it, on one line, with one note under both.
 *
 * The request and Save used to be two unrelated shapes: a taller pill with a
 * caption under it, and a shorter pill centred against the pair, which on a
 * phone wrapped onto a row of its own. On a phone the request now takes the
 * room Save leaves; on a computer both keep their own width.
 */
function ActionRow({
  main,
  trailing,
  note,
}: {
  main: ReactNode;
  trailing?: ReactNode;
  note: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-2">
      <div className="flex items-stretch gap-2.5">
        {main}
        {trailing}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 ps-1 font-sans text-caption leading-snug text-paper/55">
        {note}
      </div>
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

  // Fully published: nothing left to ask for, so a badge stands where the
  // button was.
  if (complete) {
    return (
      <ActionRow
        trailing={trailing}
        main={
          <p
            className={cn(ACTION, "border border-gold/40 bg-gold/[0.08] text-gold max-md:flex-1")}
            aria-label={t("saints.bump.fullyPublishedAria", { name: saintName })}
          >
            <span aria-hidden="true" className="leading-none">
              ✓
            </span>
            <span className="truncate">{t("saints.bump.fullyPublished")}</span>
          </p>
        }
        note={
          <Explain label={t("saints.bump.whatFullyPublished")}>
            <CompleteExplainer />
          </Explain>
        }
      />
    );
  }

  if (!liveSignedIn) {
    const next = pathname ?? `/saints/${slug}`;
    return (
      <ActionRow
        trailing={trailing}
        main={
          <Link
            href={`/signin?next=${encodeURIComponent(next)}`}
            className={cn(
              ACTION,
              "border border-paper/20 bg-paper/[0.04] text-paper hover:border-gold/60 hover:text-gold max-md:flex-1",
            )}
          >
            <RequestMark />
            <span className="truncate">{t("saints.bump.signInToRequest")}</span>
          </Link>
        }
        note={
          <>
            <span>{tn("saints.bump.readersAsking", total)}</span>
            <Explain label={t("saints.bump.whatRequesting")}>
              <RequestExplainer />
            </Explain>
          </>
        }
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
      main={
        <button
          type="button"
          onClick={toggle}
          aria-pressed={bumped}
          aria-label={
            bumped
              ? t("saints.bump.withdrawAria", { name: saintName })
              : t("saints.bump.requestAria", { name: saintName })
          }
          disabled={pending}
          className={cn(
            ACTION,
            "max-md:flex-1",
            bumped
              ? "bg-gold text-night hover:bg-gold/90"
              : "border border-paper/20 bg-paper/[0.04] text-paper hover:border-gold/60 hover:text-gold",
            pending && "opacity-70",
          )}
        >
          <RequestMark solid={bumped} />
          <span className="truncate">
            {bumped ? t("saints.bump.requested") : t("saints.bump.requestWritings")}
          </span>
          <span className="tabular-nums opacity-80">{total}</span>
        </button>
      }
      note={
        <>
          {error ? (
            <span role="alert" className="text-rose-400">
              {t("saints.bump.error")}
            </span>
          ) : (
            <span>{bumped ? t("saints.bump.thanksNoted") : t("saints.bump.askEditors")}</span>
          )}
          <Explain label={t("saints.bump.whatRequesting")}>
            <RequestExplainer />
          </Explain>
        </>
      }
    />
  );
}
