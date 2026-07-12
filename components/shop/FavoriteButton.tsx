"use client";

import { useEffect, useState } from "react";

import { Heart } from "@/components/ui/icons/Heart";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";

/**
 * Product favorite, backed by the app-wide bookmarks store so saved
 * icons appear on /saved beside verses and prayers. Mounted gate keeps
 * the server render (never favorited) from flashing.
 */
export function FavoriteButton({
  productSlug,
  title,
  storeName,
  priceLabel,
  imageUrl,
  imageAlt,
  className,
}: {
  productSlug: string;
  title: string;
  storeName: string;
  priceLabel: string;
  imageUrl?: string;
  imageAlt?: string;
  className?: string;
}) {
  const { toggle, isBookmarked } = useBookmarks();
  const [mounted, setMounted] = useState(false);
  /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time
     hydration gate: bookmarks live in localStorage, unreadable during SSR
     (ContinueExploring / Sheet.tsx precedent). */
  useEffect(() => setMounted(true), []);

  const saved = mounted && isBookmarked({ kind: "product", productSlug });
  // Replay the pop only when the heart goes on (not on remove). Keyed off a
  // nonce bumped by the click so the CSS animation re-fires each save.
  const [pop, setPop] = useState(0);

  return (
    <button
      type="button"
      onClick={() => {
        if (!saved) setPop((n) => n + 1);
        toggle({
          kind: "product",
          productSlug,
          label: title,
          storeName,
          priceLabel,
          imageUrl,
          imageAlt,
        });
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save this icon"}
      title={saved ? "Remove from saved" : "Save this icon"}
      className={cn(
        "tap-press inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
        saved
          ? "border-gold/60 bg-gold/15 text-gold"
          : "border-paper/20 text-paper/60 hover:border-paper/40 hover:text-paper",
        className,
      )}
    >
      <span key={pop} className={saved ? "heart-pop inline-flex" : "inline-flex"}>
        <Heart size={20} filled={saved} />
      </span>
    </button>
  );
}
