import Link from "next/link";

/**
 * Quick-access grid on the mobile Today shell — the four core surfaces as
 * large, soft, illustration-tinted cards in the meditation-app idiom.
 * Each card carries a distinct in-palette tint (a calm gradient) and an
 * owned line icon, so the home screen reads as a set of inviting doors
 * rather than a text menu. Data-free; pure navigation.
 */

type Tile = {
  href: string;
  label: string;
  sub: string;
  tint: string; // CSS background
  icon: React.ReactNode;
};

export function QuickAccessGrid({ isDe = false }: { isDe?: boolean }) {
  const tiles: Tile[] = [
    {
      href: "/prayers",
      label: isDe ? "Gebete" : "Prayers",
      sub: isDe ? "Regeln & Hymnen" : "Rules & hymns",
      tint: "linear-gradient(155deg, #3a4a44 0%, #2b3a36 100%)",
      icon: <HandsIcon />,
    },
    {
      href: "/bible",
      label: isDe ? "Bibel" : "Scripture",
      sub: isDe ? "Lesen & hören" : "Read & study",
      tint: "linear-gradient(155deg, #353a63 0%, #282c4a 100%)",
      icon: <BookIcon />,
    },
    {
      href: "/saints",
      label: isDe ? "Heilige" : "Saints",
      sub: isDe ? "Leben & Ikonen" : "Lives & icons",
      tint: "linear-gradient(155deg, #4a4036 0%, #382f28 100%)",
      icon: <HaloIcon />,
    },
    {
      href: "/calendar",
      label: isDe ? "Kalender" : "Calendar",
      sub: isDe ? "Feste & Fasten" : "Feasts & fasts",
      tint: "linear-gradient(155deg, #423a5a 0%, #2f2945 100%)",
      icon: <CalendarIcon />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="group relative overflow-hidden rounded-[22px] p-4 shadow-[0_12px_28px_-14px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-paper/10 transition-transform active:scale-[0.98]"
          style={{ background: t.tint }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-5 -bottom-6 h-24 w-24 rounded-full bg-paper/10 blur-xl"
          />
          <span
            aria-hidden
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-paper/12 text-gold-pale ring-1 ring-inset ring-paper/15"
          >
            {t.icon}
          </span>
          <h3 className="relative mt-3 font-serif text-title-sm leading-tight text-paper">
            {t.label}
          </h3>
          <p className="relative mt-0.5 font-sans text-caption text-paper/60">
            {t.sub}
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
