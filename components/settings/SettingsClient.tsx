"use client";

// The settings screen.
//
// There was no /settings route at all. The preferences that exist were
// scattered: reader font and size, the interlinear default and the calendar
// reckoning sat behind AccountAuthGate on a tab called "Data", which is also
// where the row labelled "Notifications" pointed; the reading palette was
// reachable only from a reader toolbar; and export lived on its own page.
//
// Two rules shape this screen:
//
//   1. Nothing here that needs no account sits behind a sign-in. Font, size,
//      palette, interlinear, calendar reckoning and language are all plain
//      localStorage and always worked signed out, they were merely fenced in.
//   2. What genuinely needs an account (push subscriptions, export of synced
//      data, deleting an account) is linked to rather than duplicated, so
//      there is still exactly one implementation of each.

import Link from "next/link";
import { useEffect, useState } from "react";

import { LanguagePicker } from "@/components/i18n/LanguagePicker";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderPrefsProvider, useReaderPrefs, type ReaderFont, type ReaderSize } from "@/components/reader/ReaderPrefs";
import { ReadingModeChips } from "@/components/reader/ReadingModeChips";
import { useInterlinear } from "@/lib/bible/interlinear";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import type { CalendarStyleDefault } from "@/lib/calendar/styleDefault";
import type { PresenceLevel } from "@/lib/desktop/activity";
import { presenceStatus, useIsDesktopApp, type PresenceStatus } from "@/lib/desktop/bridge";
import { usePresenceLevel } from "@/lib/desktop/presencePref";
import { DiscordPreviewCard } from "@/components/desktop/DiscordPreviewCard";

function Section({
  title,
  hint,
  children,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/80">
        {title}
      </h2>
      {hint ? (
        <p className="mt-1.5 font-serif italic text-detail text-paper/55 leading-[1.55]">
          {hint}
        </p>
      ) : null}
      <div className="mt-4 rounded-xl border border-paper/12 bg-paper/[0.02] divide-y divide-paper/8">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-ui text-paper">{label}</p>
        {description ? (
          <p className="mt-0.5 font-sans text-caption text-paper/55 leading-[1.5]">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-pill border border-paper/15 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            value === o.value
              ? "rounded-pill bg-paper px-3 py-1 font-sans text-caption font-semibold text-night"
              : "rounded-pill px-3 py-1 font-sans text-caption text-paper/65 hover:text-paper"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A link out to something that genuinely needs an account. */
function LinkRow({
  href,
  label,
  description,
}: {
  href: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="tap-press flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-paper/[0.04]"
    >
      <div className="min-w-0">
        <p className="font-sans text-ui text-paper">{label}</p>
        {description ? (
          <p className="mt-0.5 font-sans text-caption text-paper/55 leading-[1.5]">
            {description}
          </p>
        ) : null}
      </div>
      <span aria-hidden className="shrink-0 font-serif text-body text-paper/30">
        →
      </span>
    </Link>
  );
}

/**
 * Discord status, in the desktop app only (desktop/, lib/desktop/). Decided
 * after mount: a server render and every other shell have no desktop bridge,
 * and rendering the section there would promise something they cannot do.
 */
function DiscordSection() {
  const { t } = useTranslate();
  const desktop = useIsDesktopApp();
  const [level, setLevel] = usePresenceLevel();
  const [status, setStatus] = useState<PresenceStatus | null>(null);

  // Whether Discord is there to show it. Polled only while presence is on and
  // this screen is open; the answer changes when the reader opens Discord.
  // setStatus runs in the promise callback, never in the effect body.
  useEffect(() => {
    if (!desktop || level === "off") return;
    let live = true;
    const read = () => {
      void presenceStatus().then((s) => {
        if (live) setStatus(s);
      });
    };
    read();
    const timer = window.setInterval(read, 4000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [desktop, level]);

  if (!desktop) return null;

  const hints: Record<PresenceLevel, string> = {
    off: t("settings.discordOffHint"),
    app: t("settings.discordAppHint"),
    reading: t("settings.discordReadingHint"),
  };
  return (
    <Section title={t("settings.discord")} hint={t("settings.discordHint")}>
      <Row label={t("settings.discordLabel")} description={hints[level]}>
        <Choice<PresenceLevel>
          value={level}
          options={[
            { value: "off", label: t("settings.discordOff") },
            { value: "app", label: t("settings.discordApp") },
            { value: "reading", label: t("settings.discordReading") },
          ]}
          onChange={setLevel}
          label={t("settings.discordLabel")}
        />
      </Row>
      {/* What friends will see, drawn from the same strings the status sends,
          with the connection state as a badge rather than a line of grey. */}
      <DiscordPreviewCard level={level} status={status} />
    </Section>
  );
}

function Body() {
  const { t } = useTranslate();
  const { size, setSize, font, setFont } = useReaderPrefs();
  const { on: interlinearOn, toggle: toggleInterlinear } = useInterlinear();
  const [calStyle, pickCalStyle] = useCalendarStyleDefault();

  const sizeOptions: { value: ReaderSize; label: string }[] = [
    { value: "sm", label: "Small" },
    { value: "md", label: "Medium" },
    { value: "lg", label: "Large" },
    { value: "xl", label: "Extra large" },
  ];
  const fontOptions: { value: ReaderFont; label: string }[] = [
    { value: "serif", label: "Serif" },
    { value: "display", label: "Display" },
    { value: "sans", label: "Sans" },
  ];

  return (
    <>
      <Section
        title={t("settings.reading")}
        hint={t("settings.readingHint")}
      >
        <div className="px-5 py-4">
          <ReadingModeChips />
        </div>
        <Row
          label={t("ui.readerFont")}
          description={t("settings.fontHint")}
        >
          <Choice
            value={font}
            options={fontOptions}
            onChange={setFont}
            label={t("ui.readerFont")}
          />
        </Row>
        <Row label={t("ui.readerSize")} description={t("settings.sizeHint")}>
          <Choice
            value={size}
            options={sizeOptions}
            onChange={setSize}
            label={t("ui.readerSize")}
          />
        </Row>
        <Row
          label={t("ui.interlinearByDefault")}
          description={t("settings.interlinearHint")}
        >
          <Choice
            value={interlinearOn ? "on" : "off"}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) => {
              if ((v === "on") !== interlinearOn) toggleInterlinear();
            }}
            label={t("ui.interlinearByDefault")}
          />
        </Row>
      </Section>

      <Section title={t("settings.calendar")} hint={t("settings.calendarHint")}>
        <Row label={t("ui.calendarReckoning")}>
          <Choice
            value={calStyle}
            options={[
              { value: "new" as CalendarStyleDefault, label: "New" },
              { value: "old" as CalendarStyleDefault, label: "Old (Julian)" },
            ]}
            onChange={pickCalStyle}
            label={t("ui.calendarReckoning")}
          />
        </Row>
      </Section>

      <Section title={t("settings.language")}>
        <div className="px-5 py-4">
          <LanguagePicker />
        </div>
      </Section>

      <DiscordSection />

      {/* Everything below needs an account, so it is linked rather than
          reimplemented here: one push subscription flow, one export. */}
      <Section title={t("settings.account")} hint={t("settings.accountHint")}>
        <LinkRow
          href="/account/data"
          label={t("settings.notifications")}
          description={t("settings.notificationsHint")}
        />
        <LinkRow
          href="/account/export"
          label={t("settings.export")}
          description={t("settings.exportHint")}
        />
        <LinkRow
          href="/account/profile"
          label={t("settings.accountSecurity")}
          description={t("settings.accountSecurityHint")}
        />
      </Section>
    </>
  );
}

export function SettingsClient() {
  // ReadingModeChips and the font/size rows read ReaderPrefs, which is
  // provided per route rather than globally.
  return (
    <ReaderPrefsProvider>
      <Body />
    </ReaderPrefsProvider>
  );
}
