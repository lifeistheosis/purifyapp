"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Client island for the four-action footer row inside the Verse of Day card.
 *
 * - Favourite: toggles a localStorage bookmark for this verse reference. Heart
 *   fills rubric-red when active.
 * - Share: navigator.share() when supported, else copy a deep link with a
 *   small inline toast.
 * - More: opens a simple bottom sheet with three actions.
 * - Expand: navigates to the full chapter in the Bible reader.
 *
 * The verse text + reference are server-rendered; only the interactive
 * footer lives on the client.
 */
export function VerseCardActions({
  refLabel,
  href,
  shareText,
  shareUrl,
}: {
  refLabel: string;
  href: string;
  shareText: string;
  shareUrl: string;
}) {
  const key = `purify:vod:fav:${refLabel}`;
  const [fav, setFav] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(key) === "1") setFav(true);
    } catch {
      /* ignore */
    }
  }, [key]);

  function toggleFav() {
    setFav((v) => {
      const next = !v;
      try {
        if (next) localStorage.setItem(key, "1");
        else localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: refLabel,
          text: shareText,
          url: shareUrl,
        });
        return;
      }
    } catch {
      /* ignore */
    }
    try {
      await navigator.clipboard.writeText(`${refLabel}\n${shareUrl}`);
      setToast("Link copied");
      setTimeout(() => setToast(null), 1500);
    } catch {
      setToast("Could not share");
      setTimeout(() => setToast(null), 1500);
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${refLabel}`);
      setToast("Verse copied");
      setTimeout(() => setToast(null), 1500);
    } catch {
      setToast("Could not copy");
      setTimeout(() => setToast(null), 1500);
    }
    setMore(false);
  }

  return (
    <>
      <div className="relative grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-paper/8">
        <ActionBtn onClick={toggleFav} label="Favourite">
          <HeartIcon filled={fav} />
        </ActionBtn>
        <ActionBtn onClick={share} label="Share">
          <ShareIcon />
        </ActionBtn>
        <ActionBtn onClick={() => setMore(true)} label="More">
          <MoreIcon />
        </ActionBtn>
        <ActionLink href={href} label="Expand">
          <ExpandIcon />
        </ActionLink>
        {toast && (
          <div
            role="status"
            className="absolute left-1/2 -translate-x-1/2 -top-9 rounded-full bg-paper text-night px-3 py-1 font-sans text-[12px] font-semibold shadow-lg"
          >
            {toast}
          </div>
        )}
      </div>

      {more && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More actions"
          className="fixed inset-0 z-50 flex items-end"
        >
          <button
            aria-label="Close"
            type="button"
            onClick={() => setMore(false)}
            className="absolute inset-0 bg-night/60 backdrop-blur-sm"
          />
          <div className="relative w-full rounded-t-2xl border-t border-paper/10 bg-night px-5 pt-3 pb-7 safe-pb">
            <div
              aria-hidden
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-paper/20"
            />
            <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/45 mb-3">
              {refLabel}
            </p>
            <SheetItem
              label="Open chapter"
              onClick={() => {
                setMore(false);
                window.location.href = href;
              }}
            />
            <SheetItem label="Copy verse text" onClick={copyText} />
            <SheetItem
              label="Add to bookmarks"
              onClick={() => {
                toggleFav();
                setMore(false);
              }}
            />
            <button
              type="button"
              onClick={() => setMore(false)}
              className="mt-2 w-full rounded-md border border-paper/15 bg-paper/[0.04] py-3 font-sans text-[14px] font-semibold text-paper/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ActionBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 text-paper/80 hover:text-paper transition-colors"
    >
      {children}
      <span className="font-sans text-[12px]">{label}</span>
    </button>
  );
}

function ActionLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 text-paper/80 hover:text-paper transition-colors"
    >
      {children}
      <span className="font-sans text-[12px]">{label}</span>
    </Link>
  );
}

function SheetItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md px-3 py-3 text-left font-sans text-[15px] text-paper hover:bg-paper/[0.05] transition-colors"
    >
      {label}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill={filled ? "#c1272d" : "none"}
      stroke={filled ? "#c1272d" : "currentColor"}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 4h6v6" />
      <path d="M20 4 13 11" />
      <path d="M10 20H4v-6" />
      <path d="M4 20l7-7" />
    </svg>
  );
}
