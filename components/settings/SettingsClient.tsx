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

import { cn } from "@/lib/cn";

import { LanguagePicker } from "@/components/i18n/LanguagePicker";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderPrefsProvider, useReaderPrefs, type ReaderFont, type ReaderSize } from "@/components/reader/ReaderPrefs";
import { ReadingModeChips } from "@/components/reader/ReadingModeChips";
import { useInterlinear } from "@/lib/bible/interlinear";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import type { CalendarStyleDefault } from "@/lib/calendar/styleDefault";
import { useIsDesktopApp } from "@/lib/desktop/bridge";
import { DiscordModes } from "@/components/desktop/DiscordModes";
import { useSpace } from "@/lib/onboarding/useSpace";
import { saveSpaceToAccount } from "@/lib/onboarding/accountSync";
import {
  refreshDayOne,
  writeDepth,
  writeFastingRule,
  writeFocus,
  writeIntent,
  writeLevel,
} from "@/lib/onboarding/state";
import { FASTING_RULES, INTENTS, LEVELS, depthFor, focusFor } from "@/lib/onboarding/space";

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
  stacked = false,
  children,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** The control on its own line under the label, for choices too wide to
   *  sit beside it: side by side, the label column was squeezed to one word
   *  a line. */
  stacked?: boolean;
  children?: React.ReactNode;
}) {
  if (stacked) {
    return (
      <div className="px-5 py-4">
        <p className="font-sans text-ui text-paper">{label}</p>
        {description ? (
          <p className="mt-0.5 font-sans text-caption text-paper/55 leading-[1.5]">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    );
  }
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
  block = false,
}: {
  /** Null when never answered: no option shows as chosen. */
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  /** Fill the row, options sharing it evenly and wrapping as a grid on a
   *  narrow screen, each a full 44px target. */
  block?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={
        block
          ? "flex flex-wrap gap-1 rounded-[22px] border border-paper/15 p-1"
          : "inline-flex flex-wrap gap-1 rounded-pill border border-paper/15 p-1"
      }
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-pill font-sans text-caption",
            block ? "min-h-11 flex-1 whitespace-nowrap px-4" : "px-3 py-1",
            value === o.value ? "bg-paper font-semibold text-night" : "text-paper/65 hover:text-paper",
          )}
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
 * "Your space": the answers from the first-run flow (lib/onboarding/space.ts),
 * open to change. Familiarity and focus pick the first step Today suggests,
 * so changing either brings that card back with the new step; fasting decides
 * how the fast shows on Today. None of it needs an account, and each change
 * is copied to the account when there is one.
 */
function SpaceSection() {
  const { t } = useTranslate();
  const { level, intent, fasting } = useSpace();
  return (
    <Section title={t("settings.space")} hint={t("settings.spaceHint")}>
      <Row label={t("settings.level")} stacked>
        <Choice
          block
          value={level}
          options={LEVELS.map((l) => ({ value: l, label: t(`onboard.level.${l}`) }))}
          onChange={(l) => {
            writeLevel(l);
            writeDepth(depthFor(l));
            refreshDayOne();
            void saveSpaceToAccount();
          }}
          label={t("settings.level")}
        />
      </Row>
      <Row label={t("settings.fasting")} description={t("settings.fastingHint")} stacked>
        <Choice
          block
          value={fasting}
          options={FASTING_RULES.map((f) => ({ value: f, label: t(`onboard.fasting.${f}`) }))}
          onChange={(f) => {
            writeFastingRule(f);
            void saveSpaceToAccount();
          }}
          label={t("settings.fasting")}
        />
      </Row>
      <Row label={t("settings.focus")} stacked>
        <Choice
          block
          value={intent}
          options={INTENTS.map((i) => ({ value: i, label: t(`onboard.intent.${i}`) }))}
          onChange={(i) => {
            writeIntent(i);
            writeFocus([focusFor(i)]);
            refreshDayOne();
            void saveSpaceToAccount();
          }}
          label={t("settings.focus")}
        />
      </Row>
    </Section>
  );
}

/**
 * Discord status, in the desktop app only (desktop/, lib/desktop/). Decided
 * after mount: a server render and every other shell have no desktop bridge,
 * and rendering the section there would promise something they cannot do.
 * The four modes and their preview are components/desktop/DiscordModes.tsx.
 */
function DiscordSection() {
  const { t } = useTranslate();
  const desktop = useIsDesktopApp();
  if (!desktop) return null;
  return (
    <Section title={t("settings.discord")} hint={t("settings.discordHint")}>
      <DiscordModes />
    </Section>
  );
}

function Body() {
  const { t } = useTranslate();
  const { size, setSize, font, setFont } = useReaderPrefs();
  const { on: interlinearOn, toggle: toggleInterlinear } = useInterlinear();
  const [calStyle, pickCalStyle] = useCalendarStyleDefault();

  const sizeOptions: { value: ReaderSize; label: string }[] = [
    { value: "sm", label: t("settings.sizeSmall") },
    { value: "md", label: t("settings.sizeMedium") },
    { value: "lg", label: t("settings.sizeLarge") },
    { value: "xl", label: t("settings.sizeExtraLarge") },
  ];
  const fontOptions: { value: ReaderFont; label: string }[] = [
    { value: "serif", label: t("bible.fontSerif") },
    { value: "display", label: t("settings.fontDisplay") },
    { value: "sans", label: t("settings.fontSans") },
  ];

  return (
    <>
      <SpaceSection />

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
              { value: "on", label: t("common.on") },
              { value: "off", label: t("common.off") },
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
              { value: "new" as CalendarStyleDefault, label: t("calendar.styleNew") },
              { value: "old" as CalendarStyleDefault, label: t("calendar.reckoning.old") },
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
