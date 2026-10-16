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
//
// From 1.6 this is the ONE Settings. On a phone the account's rows were in
// three places that led into each other: the You tab's list ("Account and
// security", "Export your library", "Settings", "Privacy", "About", "Sign
// out" and five more), a dashboard of four tabs behind the first of those,
// and this screen, which ended in an "Account" group linking back into the
// dashboard. The owner, 2026-10-13: "there is technically 3 sections that all
// have similar names. profile, settings, account ... if you have to delete
// sections and add them into one then do that". So the You tab keeps the
// reader's own rows and one door, and everything else is here, once, in this
// order:
//
//   Your account   Profile, Security, Notifications, the supporter mark.
//                  Signed out: Sign in.
//   Your space, Reading, The calendar, Language, Home screen
//                  as they were: what is kept on this device.
//   Data           Export your library, Delete account.
//   Purify         Privacy, Support Purify, What's new, About.
//   Sign out
//
// No new words: every heading and row is a line the catalogs already held.
// lib/nav/__tests__/oneSettings.test.ts holds this list and the You tab's.

import Link from "next/link";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";

import { LanguagePicker } from "@/components/i18n/LanguagePicker";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderPrefsProvider, useReaderPrefs, type ReaderFont, type ReaderSize } from "@/components/reader/ReaderPrefs";
import { ReadingModeChips } from "@/components/reader/ReadingModeChips";
import { WidgetTipSheet, useWidgetPlatform } from "@/components/widget/WidgetTip";
import { useInterlinear } from "@/lib/bible/interlinear";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import type { CalendarStyleDefault } from "@/lib/calendar/styleDefault";
import { useIsDesktopApp } from "@/lib/desktop/bridge";
import {
  motionPlatform,
  motionPreference,
  osPrefersReducedMotion,
  setMotionPreference,
  subscribeReducedMotion,
  useReducedMotion,
} from "@/lib/ui/motion";
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
import { isDeveloperEmail } from "@/lib/dev/developer";
import { useShowSupporterMark } from "@/lib/profile/useShowSupporterMark";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { resolveUser } from "@/lib/supabase/resolveUser";

function Section({
  id,
  title,
  hint,
  children,
}: {
  /** Lets the app-wide search open this screen at the section: its rows for
   *  settings point at /settings#<id> (lib/search/buildCorpus.ts). */
  id?: string;
  /** Left out for a group that is one row and says what it is: Sign out. */
  title?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt clears the bar fixed to the top of a phone.
    <section id={id} className="mt-10 scroll-mt-24 first:mt-0">
      {title ? (
        <h2 className="font-sans text-caption font-semibold text-gold/80">
          {title}
        </h2>
      ) : null}
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
 * Who is signed in on this device, for the rows that differ: nothing here
 * reads or writes the account, and each account screen has its own gate.
 *
 * The session the device already holds is read before the first paint
 * (readLocalSessionUser: no request, no lock), so a signed-in reader's rows
 * are there with the screen and the rest does not jump down a frame later.
 * With no session there, resolveUser settles the rarer cases; "could not find
 * out" is shown as signed out, which offers Sign in and loses nothing.
 */
type Reader = { known: false } | { known: true; email: string | null };

function useReader(): Reader {
  const [reader, setReader] = useState<Reader>({ known: false });
  useLayoutEffect(() => {
    const local = readLocalSessionUser();
    if (local) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- the
         session lives in the device's own storage, which a server render does
         not have: it is adopted after mount, before the first paint. */
      setReader({ known: true, email: local.email ?? "" });
      return;
    }
    let cancelled = false;
    resolveUser().then((auth) => {
      if (cancelled) return;
      setReader({ known: true, email: auth.state === "signed-in" ? (auth.user.email ?? "") : null });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return reader;
}

/**
 * The account, first, because it is what a reader opening Settings from the
 * You tab most often came for. Three screens and one switch, each named for
 * what it holds. Signed out it is one row.
 */
function AccountSection({ reader }: { reader: Reader }) {
  const { t } = useTranslate();
  if (!reader.known) return null;
  if (reader.email === null) {
    return (
      <Section id="account" title={t("settings.account")}>
        <LinkRow
          href="/signin?next=/settings"
          label={t("common.signIn")}
          description={t("ui.syncAcrossDevicesOptional")}
        />
      </Section>
    );
  }
  return (
    <Section id="account" title={t("settings.account")}>
      <LinkRow href="/account/profile" label={t("account.tabs.profile")} description={reader.email || undefined} />
      <LinkRow href="/account/security" label={t("account.tabs.security")} />
      <LinkRow
        href="/account/notifications"
        label={t("settings.notifications")}
        description={t("settings.notificationsHint")}
      />
      <SupporterMarkRow />
    </Section>
  );
}

/**
 * The one preference here that reaches other readers: whether Community shows
 * a mark beside this account's name while a Plus or Pro subscription runs.
 * It sat under the You tab's list, and on the Data tab. Its own component, so
 * the account's row is asked for only when there is an account.
 */
function SupporterMarkRow() {
  const { t } = useTranslate();
  const [showMark, toggleShowMark] = useShowSupporterMark();
  return (
    // Stacked: the hint is three sentences, and beside the switch it was
    // squeezed into a column six lines tall.
    <Row label={t("settings.showSupporterMark")} description={t("settings.showSupporterMarkHint")} stacked>
      <Choice
        value={showMark ? "on" : "off"}
        options={[
          { value: "on", label: t("common.on") },
          { value: "off", label: t("common.off") },
        ]}
        onChange={(v) => {
          if ((v === "on") !== showMark) toggleShowMark();
        }}
        label={t("settings.showSupporterMark")}
      />
    </Row>
  );
}

/** What the reader has gathered: take it away, or delete the account. Export
 *  needs no account (it writes what is on the device), deleting one does. */
function DataSection({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslate();
  return (
    <Section id="data" title={t("account.tabs.data")}>
      <LinkRow href="/account/export" label={t("settings.export")} description={t("settings.exportHint")} />
      {signedIn ? <LinkRow href="/account/data#danger" label={t("account.deleteAccount")} /> : null}
    </Section>
  );
}

/** About Purify itself. These four closed the You tab's list. On a phone this
 *  is where giving lives: the lamp that stood in each tab's bar went in 1.7
 *  (the owner: it "does nothing useful there"). */
function AboutSection({ developer }: { developer: boolean }) {
  const { t } = useTranslate();
  return (
    <Section id="about" title={t("settings.eyebrow")}>
      {/* No second line under these: each name says what it opens. */}
      <LinkRow href="/privacy" label={t("footer.privacy")} />
      <LinkRow href="/support" label={t("nav.supportPurify")} />
      <LinkRow href="/whats-new" label={t("nav.whatsNew")} />
      <LinkRow href="/about" label={t("nav.about")} />
      {developer ? <LinkRow href="/account/developer" label={t("ui.developer")} /> : null}
    </Section>
  );
}

/** The last row of the last screen, where a reader looks for it. */
function SignOutSection() {
  const { t } = useTranslate();
  return (
    <Section>
      <Link
        href="/signout"
        data-sign-out=""
        className="tap-press flex items-center px-5 py-4 font-sans text-ui text-crimson-soft transition-colors hover:bg-paper/[0.04]"
      >
        {t("common.signOut")}
      </Link>
    </Section>
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
    <Section id="space" title={t("settings.space")} hint={t("settings.spaceHint")}>
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
 * Animations, the owner's decision of 2026-09-29 (lib/ui/motionPreference.ts):
 * the Windows app always has this toggle; a browser shows it only once the
 * browser has asked for less motion or the reader has already chosen, since
 * otherwise there is nothing to override; the phone apps never show it, their
 * motion is always on unless the device is slow. Hidden on the server, since
 * none of it is knowable there.
 */
function motionRowVisible(): boolean {
  const platform = motionPlatform();
  return (
    platform === "desktop" ||
    (platform === "web" && (osPrefersReducedMotion() || motionPreference() !== "os"))
  );
}

function MotionSection() {
  const { t } = useTranslate();
  const reduced = useReducedMotion();
  const visible = useSyncExternalStore(subscribeReducedMotion, motionRowVisible, () => false);

  if (!visible) return null;
  return (
    <Section title={t("settings.motion")} hint={t("settings.motionHint")}>
      <Row label={t("settings.animations")} description={t("settings.animationsHint")}>
        <Choice
          value={reduced ? "off" : "on"}
          options={[
            { value: "on", label: t("common.on") },
            { value: "off", label: t("common.off") },
          ]}
          onChange={(v) => setMotionPreference(v)}
          label={t("settings.animations")}
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

/**
 * The home screen widget, in a shell that has one (lib/widget/tip.ts: the
 * Android app today). The card on Today says it once and goes; this row is
 * where the steps stay. Anywhere else the section is not rendered, since it
 * would point at a widget that is not there.
 */
function WidgetSection() {
  const { t } = useTranslate();
  const platform = useWidgetPlatform();
  const [open, setOpen] = useState(false);
  if (!platform) return null;
  return (
    <>
      <Section title={t("settings.widget")}>
        <Row label={t("settings.widgetRow")} description={t("settings.widgetHint")}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-4 font-sans text-ui text-paper transition-colors hover:border-paper/40"
          >
            {t("widgetTip.show")}
          </button>
        </Row>
      </Section>
      <WidgetTipSheet open={open} onClose={() => setOpen(false)} platform={platform} />
    </>
  );
}

function Body() {
  const { t } = useTranslate();
  const { size, setSize, font, setFont } = useReaderPrefs();
  const { on: interlinearOn, toggle: toggleInterlinear } = useInterlinear();
  const [calStyle, pickCalStyle] = useCalendarStyleDefault();
  const reader = useReader();
  const signedIn = reader.known && reader.email !== null;

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
      <AccountSection reader={reader} />

      <SpaceSection />

      <Section
        id="reading"
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

      <Section id="calendar" title={t("settings.calendar")} hint={t("settings.calendarHint")}>
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

      <MotionSection />

      <Section id="language" title={t("settings.language")}>
        <div className="px-5 py-4">
          <LanguagePicker />
        </div>
      </Section>

      <DiscordSection />

      <WidgetSection />

      <DataSection signedIn={signedIn} />
      <AboutSection developer={reader.known && isDeveloperEmail(reader.email ?? "")} />
      {signedIn ? <SignOutSection /> : null}
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
