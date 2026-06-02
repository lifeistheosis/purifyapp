import Link from "next/link";
import { LESSONS } from "@/lib/prayers/learning";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import {
  commemorationsOn,
  fastingStatus,
  formatMonthDay,
  paschaInfo,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { PrayerIcon } from "@/components/prayers/PrayerIcon";
import { PrayersMobile } from "@/components/mobile/PrayersMobile";
import {
  PrayerPage,
  PrayerMasthead,
  PrayerSectionLabel,
  PrayerIndex,
  PrayerIndexRow,
  PrayerNote,
} from "@/components/prayers/PrayerBook";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Prayer",
  description:
    "Daily prayer in the Orthodox tradition: today's rule, morning and evening rules, the prayer of the heart, akathists, the liturgical hours, and a beginner's path.",
};

// Hourly ISR so the day strip rolls forward without a redeploy.
export const revalidate = 3600;

const FAST_DOT: Record<FastKind, string> = {
  strict: "bg-crimson",
  "wine-oil": "bg-gold",
  fish: "bg-sage",
  fast: "bg-paper/40",
  "fast-free": "bg-emerald-400",
  normal: "bg-paper/30",
};

export default async function PrayersPage() {
  const locale = await getServerLocale();
  const isDe = locale === "de";
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);
  const commemorations = commemorationsOn(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];

  const paschaLine =
    pascha.daysAway > 0
      ? isDe
        ? `${pascha.daysAway} Tage bis Pascha`
        : `${pascha.daysAway} days to Pascha`
      : pascha.daysAway === 0
        ? isDe
          ? "Pascha ist heute"
          : "Pascha is today"
        : pascha.label;

  return (
    <>
      <PrayersMobile />
      <div className="hidden md:block">
        <MobileTopBar title={isDe ? "Gebete" : "Prayers"} />
        <PrayerPage width="index">
          <PrayerMasthead
            align="center"
            eyebrow={isDe ? "Das Gebet" : "The Prayer"}
            title={isDe ? "Betet ohne Unterlaß." : "Pray without ceasing."}
            scripture={
              isDe ? "1. Thessalonicher 5,17" : "1 Thessalonians 5:17"
            }
            intro={
              <p className="mx-auto max-w-[46ch] text-center">
                {isDe
                  ? "Schlag die Seite auf, wenn du aufstehst; schlag sie auf, wenn du dich niederlegst."
                  : "Open the page when you rise; open it when you lie down."}
              </p>
            }
          >
            <PrayerIcon slug="christ-pantocrator" size="md" priority />
          </PrayerMasthead>

          {/* Today — one quiet row, not a glowing card. */}
          <Link
            href="/prayers/today"
            className="group flex items-center gap-4 rounded-md border border-paper/12 px-5 py-4 transition-colors hover:border-paper/25"
          >
            <span className="flex w-11 shrink-0 flex-col items-center text-center">
              <span className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/70 leading-none">
                {formatMonthDay(today).split(" ")[0].slice(0, 3).toUpperCase()}
              </span>
              <span className="mt-1 font-serif text-title-sm text-paper leading-none tabular-nums">
                {today.getUTCDate()}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-ui text-paper truncate">
                {headline?.name ??
                  (isDe ? "Mit der Kirche beten" : "Pray with the Church")}
              </span>
              <span className="mt-1 flex items-center gap-2 font-sans text-caption text-paper/45">
                <span
                  aria-hidden
                  className={`inline-block h-1.5 w-1.5 rounded-full ${FAST_DOT[fast.kind]}`}
                />
                <span className="truncate">
                  {fast.label}
                  <span className="text-paper/25"> · </span>
                  {paschaLine}
                </span>
              </span>
            </span>
            <span
              aria-hidden
              className="shrink-0 font-serif text-lede text-paper/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gold/70"
            >
              →
            </span>
          </Link>

          {/* The prayer of the heart — a calm centered passage. */}
          <div className="my-16 text-center">
            <p className="mb-6 font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40">
              {isDe ? "Das Gebet des Herzens" : "The prayer of the heart"}
            </p>
            <p className="font-serif text-title-sm md:text-title leading-[1.5] text-paper/90">
              {isDe ? (
                <>
                  Herr Jesus Christus,
                  <br />
                  Sohn Gottes,
                  <br />
                  erbarme Dich meiner, eines Sünders.
                </>
              ) : (
                <>
                  Lord Jesus Christ,
                  <br />
                  Son of God,
                  <br />
                  have mercy on me, a sinner.
                </>
              )}
            </p>
            <p className="mx-auto mt-6 max-w-[44ch] font-serif italic text-detail text-paper/55 leading-[1.7]">
              {isDe
                ? "Bete es im Atem, mit dem Herzen, zu jeder Zeit. Die Väter sagen, das Zurückbringen sei die halbe Arbeit."
                : "Pray it in the breath, with the heart, at any time. The Fathers say the bringing-back is half the work."}
            </p>
            <p className="mt-5">
              <Link
                href="/prayers/learning/jesus-prayer"
                className="font-sans text-detail font-medium text-gold/80 underline decoration-gold/30 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper"
              >
                {isDe ? "Lerne, es zu beten →" : "Learn how to pray it →"}
              </Link>
            </p>
          </div>

          <PrayerSectionLabel>
            {isDe ? "Die täglichen Regeln" : "The daily rules"}
          </PrayerSectionLabel>
          <PrayerIndex>
            <PrayerIndexRow
              href="/prayers/morning"
              title={isDe ? "Morgenregel" : "Morning rule"}
              description={
                isDe
                  ? "Den Tag mit Gott beginnen — Kreuzzeichen bis Entlassung."
                  : "Begin the day with God — the Sign of the Cross through dismissal."
              }
              meta={isDe ? "~8 Min." : "~8 min"}
            />
            <PrayerIndexRow
              href="/prayers/evening"
              title={isDe ? "Abendregel" : "Evening rule"}
              description={
                isDe
                  ? "Den Tag niederlegen — Tageserforschung und In deine Hände."
                  : "Lay the day down — examination of the day and Into Thy hands."
              }
              meta={isDe ? "~8 Min." : "~8 min"}
            />
          </PrayerIndex>

          <PrayerSectionLabel>
            {isDe ? "Durch den Tag" : "Through the day"}
          </PrayerSectionLabel>
          <PrayerIndex>
            <PrayerIndexRow
              href="/prayers/rope"
              title={isDe ? "Gebetsschnur" : "Prayer rope"}
              description={
                isDe
                  ? "Zähle das Jesusgebet auf einer digitalen Komvoschini."
                  : "Count the Jesus Prayer on a digital komvoschini."
              }
            />
            <PrayerIndexRow
              href="/prayers/personal"
              title={isDe ? "Diptychen" : "Diptychs"}
              description={
                isDe
                  ? "Die Namen, die du trägst — die Lebenden und die Entschlafenen."
                  : "The names you carry — the living and the reposed."
              }
            />
            <PrayerIndexRow
              href="/prayers/hours"
              title={isDe ? "Die Horen" : "The Hours"}
              description={
                isDe
                  ? "Kurze Gebete, die den Tag heiligen."
                  : "Short prayers that sanctify the daylight."
              }
            />
            <PrayerIndexRow
              href="/prayers/akathists"
              title={isDe ? "Die Akathiste" : "The Akathists"}
              description={
                isDe
                  ? "Lange Lobgesänge, im Stehen gebetet."
                  : "Long hymns of praise, prayed standing throughout."
              }
            />
          </PrayerIndex>

          <PrayerSectionLabel>
            {isDe ? "Der Anfang" : "Beginning"}
          </PrayerSectionLabel>
          <PrayerIndex>
            <PrayerIndexRow
              href="/prayers/learning"
              title={isDe ? "Beten lernen" : "Learn to pray"}
              description={
                isDe
                  ? "Ein kurzer Einsteiger-Weg durch das Gebet."
                  : "A short, beginner's path through Orthodox prayer."
              }
              meta={
                isDe
                  ? `${LESSONS.length} Lektionen`
                  : `${LESSONS.length} lessons`
              }
            />
          </PrayerIndex>

          <PrayerNote>
            {isDe
              ? "Deine Lesezeichen, Notizen und Markierungen leben auf diesem Gerät. Melde dich an, um sie über Geräte hinweg zu behalten."
              : "Your bookmarks, notes, and highlights live on this device. Sign in to keep them across devices."}{" "}
            <Link
              href="/account"
              className="text-paper/55 underline decoration-paper/25 underline-offset-2 hover:text-paper"
            >
              {isDe ? "Dein Konto →" : "Your account →"}
            </Link>
          </PrayerNote>
        </PrayerPage>
      </div>
    </>
  );
}
