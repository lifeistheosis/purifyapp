"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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
};

// Small inline help bubble attached to the bump button. Click the "?"
// to toggle a short explanation of what the bump system is for.
function HelpPopover({ children, label }: { children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
        className={
          "inline-flex h-6 w-6 items-center justify-center rounded-full border text-caption font-bold leading-none transition-colors " +
          (open
            ? "border-gold/70 bg-gold/15 text-gold"
            : "border-paper/25 bg-paper/[0.03] text-paper/65 hover:border-gold/60 hover:text-gold")
        }
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-[calc(100%+8px)] z-20 w-[280px] rounded-lg border border-paper/15 bg-night p-4 shadow-pop font-sans text-caption leading-relaxed text-paper/85"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function RequestExplainer() {
  const { t } = useTranslate();
  return (
    <>
      <p className="font-semibold text-paper mb-2">{t("saints.bump.requesting")}</p>
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
      <p className="font-semibold text-paper mb-2">{t("saints.bump.fullyPublished")}</p>
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
}: Props) {
  const { t, tn } = useTranslate();
  const [bumped, setBumped] = useState(initialBumped);
  const [total, setTotal] = useState(initialTotal);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const pathname = usePathname();

  // Static fully-published state — no interaction, just a help popover.
  if (complete) {
    return (
      <div className="inline-flex items-center gap-2">
        <div
          className="inline-flex items-center gap-2.5 rounded-full border border-gold/40 bg-gold/[0.08] px-5 py-2.5 font-sans text-ui font-semibold text-gold"
          aria-label={t("saints.bump.fullyPublishedAria", { name: saintName })}
        >
          <span aria-hidden="true" className="text-body leading-none">
            ✓
          </span>
          <span>{t("saints.bump.fullyPublished")}</span>
        </div>
        <HelpPopover label={t("saints.bump.whatFullyPublished")}>
          <CompleteExplainer />
        </HelpPopover>
      </div>
    );
  }

  if (!signedIn) {
    const next = pathname ?? `/saints/${slug}`;
    return (
      <div className="inline-flex flex-col items-start gap-1.5">
        <div className="inline-flex items-center gap-2">
          <div className="inline-flex items-center gap-3 rounded-full border border-paper/15 bg-paper/[0.03] px-4 py-2">
            <span className="font-sans text-ui text-paper/70">
              {tn("saints.bump.readersAsking", total)}
            </span>
            <Link
              href={`/signin?next=${encodeURIComponent(next)}`}
              className="font-sans text-detail font-semibold text-gold hover:underline"
            >
              {t("saints.bump.signInToRequest")}
            </Link>
          </div>
          <HelpPopover label={t("saints.bump.whatRequesting")}><RequestExplainer /></HelpPopover>
        </div>
      </div>
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
        const r = await fetch(`/api/saints/${slug}/bump`, { method: "POST" });
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
    <div className="inline-flex flex-col items-start gap-1.5">
      <div className="inline-flex items-center gap-2">
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
          className={
            "inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 font-sans text-ui font-semibold transition-colors " +
            (bumped
              ? "bg-gold text-night hover:bg-gold/90"
              : "border border-paper/20 bg-paper/[0.04] text-paper hover:border-gold/60 hover:text-gold") +
            (pending ? " opacity-70" : "")
          }
        >
          <span aria-hidden="true" className="text-body leading-none">
            {bumped ? "▲" : "△"}
          </span>
          <span>{bumped ? t("saints.bump.requested") : t("saints.bump.requestWritings")}</span>
          <span className="tabular-nums opacity-80">{total}</span>
        </button>
        <HelpPopover label={t("saints.bump.whatRequesting")}><RequestExplainer /></HelpPopover>
      </div>
      <p className="font-sans text-eyebrow text-paper/45 ms-1">
        {bumped
          ? t("saints.bump.thanksNoted")
          : t("saints.bump.askEditors")}
      </p>
      {error && (
        <p className="font-sans text-eyebrow text-rose-400 ms-1">
          {t("saints.bump.error")}
        </p>
      )}
    </div>
  );
}
