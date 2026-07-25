"use client";

import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Quick-access grid on the mobile Today shell — the four core surfaces as
 * large, soft cards in the meditation-app idiom. Data-free; pure
 * navigation. Labels come from the catalog (today.tiles.*) so they follow
 * native locale switches.
 *
 * The four cards used to carry four "distinct" gradients — #303034,
 * #28282c, #343438, #2b2b30 — which are four shades of the same grey and
 * were indistinguishable on a phone. All they actually did was stop the
 * grid from reading as one object. One shared surface now, with the icon
 * as the only differentiator; the restraint is what makes the row look
 * deliberate rather than four boxes that almost match.
 *
 * Also gone: the `blur-xl` highlight blob on each card. A backdrop/filter
 * blur is the one effect the Android WebView reliably drops frames on, and
 * four of them sat in the scroll path. The same lift comes from a plain
 * radial-gradient, which costs nothing.
 */

type Tile = {
  href: string;
  key: string;
  icon: React.ReactNode;
};

const TILE_SURFACE =
  "radial-gradient(120% 90% at 88% 6%, rgba(255,255,255,0.07) 0%, transparent 55%), linear-gradient(155deg, #2b2b30 0%, #1b1b1e 100%)";

export function QuickAccessGrid() {
  const { t } = useTranslate();
  const tiles: Tile[] = [
    { href: "/prayers", key: "prayers", icon: <HandsIcon /> },
    { href: "/bible", key: "bible", icon: <BookIcon /> },
    { href: "/saints", key: "saints", icon: <HaloIcon /> },
    { href: "/calendar", key: "calendar", icon: <CalendarIcon /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          // `press-card` instead of a bespoke `active:scale-[0.98]`: the
          // shared class snaps down in 90ms and springs back over 220ms on
          // the house curve, which is what makes a press read as a press.
          // Every tappable surface in the app now uses the same two.
          className="press-card group relative overflow-hidden rounded-[22px] p-4 shadow-[0_12px_28px_-14px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-paper/10"
          style={{ background: TILE_SURFACE }}
        >
          <span
            aria-hidden
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-paper/12 text-gold-pale ring-1 ring-inset ring-paper/15"
          >
            {tile.icon}
          </span>
          <h3 className="relative mt-3 font-serif text-title-sm leading-tight text-paper">
            {t(`today.tiles.${tile.key}`)}
          </h3>
          <p className="relative mt-0.5 font-sans text-caption text-paper/60">
            {t(`today.tiles.${tile.key}Sub`)}
          </p>
        </Link>
      ))}
    </div>
  );
}

function HandsIcon() {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21c-1-1.6-4-3.2-5.5-5.2C5 14 5 12 6.2 11.2c1-.7 2.2-.2 2.8.8" />
      <path d="M12 21c1-1.6 4-3.2 5.5-5.2C19 14 19 12 17.8 11.2c-1-.7-2.2-.2-2.8.8" />
      <path d="M12 12V4M9.5 6.5 12 4l2.5 2.5" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5.5C10.5 4.3 8.3 4 6 4.2A1.6 1.6 0 0 0 4.5 5.8v11.4c0 1 .9 1.7 1.8 1.6 2-.2 4 0 5.7 1 1.7-1 3.7-1.2 5.7-1 .9.1 1.8-.6 1.8-1.6V5.8A1.6 1.6 0 0 0 18 4.2c-2.3-.2-4.5.1-6 1.3Z" />
      <path d="M12 5.5v13.3" />
    </svg>
  );
}

function HaloIcon() {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.2" />
      <ellipse cx="12" cy="6.6" rx="5.4" ry="1.7" />
      <path d="M6.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="5.5" width="16" height="15" rx="3" />
      <path d="M4 10h16M8 3.5v4M16 3.5v4" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
