import Link from "next/link";
import { T } from "@/components/i18n/T";
import {
 commemorationsOn,
 fastingStatus,
 formatLongDate,
 paschaInfo,
 startOfDayUtc,
} from "@/lib/calendar/orthodox";

/**
 * The home hero's right-column card. Evokes an Orthodox icon corner,
 * a quiet place where the icons hang, the lamp burns, and the day is
 * remembered before God. Shows today's saint, fast, and Pascha
 * countdown; links into /prayers/today.
 *
 * Server component; uses the same date helpers as /calendar and
 * /prayers/today so the surface is always live.
 */
export function IconCornerCard() {
 const today = startOfDayUtc(new Date());
 const fast = fastingStatus(today);
 const pascha = paschaInfo(today);
 const commemorations = commemorationsOn(today);
 const headline =
 commemorations.find((c) => c.kind === "feast") ?? commemorations[0];

 return (
 <Link
 href="/prayers/today"
 className="group relative block overflow-hidden rounded-card shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition-opacity duration-200 hover:opacity-95"
 style={{
 background:
 "linear-gradient(170deg, #0a0a0a 0%, #141414 50%, #0a0a0a 100%)",
 height: "min(70dvh, 560px)",
 aspectRatio: "9 / 19",
 }}
 >
 {/* Soft white glow at top, evoking a candle without the gold. */}
 <div
 aria-hidden
 className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full"
 style={{
 background:
 "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)",
 }}
 />

 <div className="relative h-full flex flex-col px-6 py-7">
 {/* Eyebrow */}
 <p className="font-sans text-eyebrow uppercase tracking-[2px] text-white/80 font-semibold">
 <T k="prayers.tabs.today" />
 </p>
 <p className="mt-1 font-sans text-caption text-white/55">
 {formatLongDate(today)}
 </p>

 {/* Monochrome cross centerpiece */}
 <div className="mt-6 flex-1 flex flex-col items-center justify-center text-center">
 <div
 aria-hidden
 className="relative flex items-center justify-center"
 style={{ width: 140, height: 140 }}
 >
 <div
 className="absolute inset-0 rounded-full"
 style={{
 background:
 "radial-gradient(circle, rgba(245,230,211,0.10) 0%, rgba(245,230,211,0) 70%)",
 }}
 />
 <svg
 viewBox="0 0 80 128"
 width={68}
 height={108}
 className="relative"
 style={{
 filter:
 "drop-shadow(0 2px 6px rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(255,255,255,0.08))",
 }}
 >
 <defs>
 <linearGradient id="iconCornerCross" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#ffffff" />
 <stop offset="55%" stopColor="#f2f2f2" />
 <stop offset="100%" stopColor="#c9c9c9" />
 </linearGradient>
 <linearGradient id="iconCornerCrossEdge" x1="0" y1="0" x2="1" y2="0">
 <stop offset="0%" stopColor="rgba(0,0,0,0.35)" />
 <stop offset="50%" stopColor="rgba(0,0,0,0)" />
 <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
 </linearGradient>
 </defs>

 {/* Vertical beam */}
 <rect
 x="36"
 y="6"
 width="8"
 height="116"
 rx="1.2"
 fill="url(#iconCornerCross)"
 />
 {/* Titulus (top short bar) */}
 <rect
 x="26"
 y="18"
 width="28"
 height="6"
 rx="1"
 fill="url(#iconCornerCross)"
 />
 {/* Crossbeam (main horizontal) */}
 <rect
 x="14"
 y="40"
 width="52"
 height="9"
 rx="1.2"
 fill="url(#iconCornerCross)"
 />
 {/* Suppedaneum (slanted footrest, Russian/Slavonic) */}
 <g transform="translate(40 92) rotate(-16)">
 <rect
 x="-22"
 y="-3.5"
 width="44"
 height="7"
 rx="1.2"
 fill="url(#iconCornerCross)"
 />
 </g>

 {/* Subtle edge shading overlays for depth */}
 <rect
 x="36"
 y="6"
 width="8"
 height="116"
 rx="1.2"
 fill="url(#iconCornerCrossEdge)"
 opacity="0.55"
 />
 <rect
 x="14"
 y="40"
 width="52"
 height="9"
 rx="1.2"
 fill="url(#iconCornerCrossEdge)"
 opacity="0.4"
 />
 </svg>
 </div>
 <p className="mt-5 font-serif italic text-detail text-white/65 leading-snug max-w-[200px] line-clamp-2">
 {headline?.name ?? "A quiet day"}
 </p>
 </div>

 {/* Bottom: fast + Pascha */}
 <div className="mt-auto space-y-2.5">
 <div className="rounded-pill border border-white/25 bg-white/[0.06] px-3 py-1.5 text-center font-sans text-caption font-medium text-white/85">
 {fast.label}
 </div>
 <p className="font-sans text-eyebrow text-white/50 text-center">
 {pascha.daysAway > 0
 ? `${pascha.daysAway} days until Pascha`
 : pascha.daysAway === 0
 ? "Pascha is today"
 : "Pascha has passed"}
 </p>
 <p className="font-sans text-caption font-semibold text-white text-center group-hover:underline underline-offset-2">
 <T k="prayers.openTodaysPrayer" /> →
 </p>
 </div>
 </div>
 </Link>
 );
}
