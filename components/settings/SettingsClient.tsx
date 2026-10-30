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
//   Testers mode   (1.8) under Your space, for admins alone: the server says
//                  who (app/api/admin/whoami).
//   Data           Export your library, Delete account.
//   Purify         Privacy, Support Purify, What's new, About.
//   Sign out
//
// From 1.8 it is made of lit panels, the owner's pick A of round 3 (Homebase/
// boards/purify-master/variants/r3-01-settings, locked 2026-10-30), after his
// note 9 of build 80 ("it feels vibe coded, like clicking buttons on a
// screen"): each group a raised panel, each row led by its glyph on a lit
// plate, each choice a carved track, on and off a switch (./LitPanel.tsx).
// The three he named are drawn anew: the size on a verse of John with a
// slider (./ReaderSize.tsx), the reading modes as small pages in their own
// colours (./ReadingModePages.tsx), First focus as onboarding's picture
// cards (./FirstFocus.tsx). The rest works as it did.
//
// No new words: every heading and row is a line the catalogs already held,
// but for Testers mode, which is new in 1.8 and has its own.
// lib/nav/__tests__/oneSettings.test.ts holds this list and the You tab's;
// lib/settings/__tests__/litPanels.test.ts holds how it is drawn.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";

import { LanguagePicker } from "@/components/i18n/LanguagePicker";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FONT_CLASSES, ReaderPrefsProvider, useReaderPrefs, type ReaderFont } from "@/components/reader/ReaderPrefs";
import { Bell } from "@/components/ui/icons/Bell";
import { Bolt } from "@/components/ui/icons/Bolt";
import { Book } from "@/components/ui/icons/Book";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Church } from "@/components/ui/icons/Church";
import { Compass } from "@/components/ui/icons/Compass";
import { Cross } from "@/components/ui/icons/Cross";
import { Erase } from "@/components/ui/icons/Erase";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Info } from "@/components/ui/icons/Info";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Lock } from "@/components/ui/icons/Lock";
import { Share } from "@/components/ui/icons/Share";
import { Shield } from "@/components/ui/icons/Shield";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { Sun } from "@/components/ui/icons/Sun";
import { User } from "@/components/ui/icons/User";
import { Wheat } from "@/components/ui/icons/Wheat";
import { Wind } from "@/components/ui/icons/Wind";
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
import { useIsAdmin } from "@/lib/admin/useIsAdmin";
import { useSpace } from "@/lib/onboarding/useSpace";
import { useTesting } from "@/lib/onboarding/useTesting";
import { backToMyOwn, testAs, testFirstOpen } from "@/lib/onboarding/testers";
import { saveSpaceToAccount } from "@/lib/onboarding/accountSync";
import {
  refreshDayOne,
  writeDepth,
  writeFastingRule,
  writeFocus,
  writeIntent,
  writeLevel,
} from "@/lib/onboarding/state";
import { BACKGROUNDS, FASTING_RULES, LEVELS, depthFor, focusFor } from "@/lib/onboarding/space";
import { isDeveloperEmail } from "@/lib/dev/developer";
import { useShowSupporterMark } from "@/lib/profile/useShowSupporterMark";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { resolveUser } from "@/lib/supabase/resolveUser";

import { FirstFocus, useOnboardedAgain } from "./FirstFocus";
import { ButtonRow, LinkRow, Plate, Row, Section, Switch, Track } from "./LitPanel";
import { ReaderSizeRow } from "./ReaderSize";
import { ReadingModePages } from "./ReadingModePages";
import { AlphaGlyph, FacesGlyph, GlobeGlyph } from "./glyphs";

const FACES: readonly ReaderFont[] = ["serif", "display", "sans"];

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
          icon={<User size={18} strokeWidth={1.7} />}
          label={t("common.signIn")}
          description={t("ui.syncAcrossDevicesOptional")}
        />
      </Section>
    );
  }
  return (
    <Section id="account" title={t("settings.account")}>
      <LinkRow
        href="/account/profile"
        icon={<User size={18} strokeWidth={1.7} />}
        label={t("account.tabs.profile")}
        description={reader.email || undefined}
      />
      <LinkRow href="/account/security" icon={<Lock size={17} />} label={t("account.tabs.security")} />
      <LinkRow
        href="/account/notifications"
        icon={<Bell size={17} />}
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
    <Row
      icon={<Cross size={17} />}
      label={t("settings.showSupporterMark")}
      description={t("settings.showSupporterMarkHint")}
      control={
        <Switch
          on={showMark}
          onChange={(on) => {
            if (on !== showMark) toggleShowMark();
          }}
          label={t("settings.showSupporterMark")}
        />
      }
    />
  );
}

/** What the reader has gathered: take it away, or delete the account. Export
 *  needs no account (it writes what is on the device), deleting one does. */
function DataSection({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslate();
  return (
    <Section id="data" title={t("account.tabs.data")}>
      <LinkRow
        href="/account/export"
        icon={<Share size={17} />}
        label={t("settings.export")}
        description={t("settings.exportHint")}
      />
      {signedIn ? <LinkRow href="/account/data#danger" icon={<Erase size={17} />} label={t("account.deleteAccount")} /> : null}
    </Section>
  );
}

/** About Purify itself. These four closed the You tab's list. On a phone this
 *  is where giving lives: the lamp that stood in each tab's bar went in 1.7
 *  (the owner: it "does nothing useful there"); its row wears the lit candle. */
function AboutSection({ developer }: { developer: boolean }) {
  const { t } = useTranslate();
  return (
    <Section id="about" title={t("settings.eyebrow")}>
      {/* No second line under these: each name says what it opens. */}
      <LinkRow href="/privacy" icon={<Shield size={17} />} label={t("footer.privacy")} />
      <LinkRow href="/support" icon={<Lampada size={18} />} label={t("nav.supportPurify")} />
      <LinkRow href="/whats-new" icon={<Sparkle size={16} />} label={t("nav.whatsNew")} />
      <LinkRow href="/about" icon={<Info size={17} />} label={t("nav.about")} />
      {developer ? <LinkRow href="/account/developer" icon={<Bolt size={16} strokeWidth={1.7} />} label={t("ui.developer")} /> : null}
    </Section>
  );
}

/** The last row of the last screen, where a reader looks for it. */
function SignOutSection() {
  const { t } = useTranslate();
  return (
    <Section>
      <Link href="/signout" data-sign-out="" className="set-row set-link font-sans text-ui font-semibold text-crimson-soft">
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
 *
 * Each choice says under it what it means, in onboarding's own words, and
 * First focus is onboarding's picture cards with the Day 1 they give
 * (./FirstFocus.tsx, which says how it reads and writes the answers).
 */
function SpaceSection() {
  const { t } = useTranslate();
  const { level, intent, fasting } = useSpace();
  const again = useOnboardedAgain();
  return (
    <Section id="space" title={t("settings.space")} hint={t("settings.spaceHint")}>
      <Row
        icon={<HaloedHead size={18} />}
        label={t("settings.level")}
        sub={level ? t(`onboard.level.${level}Sub`) : null}
      >
        <Track
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
      <Row
        icon={<Wheat size={22} strokeWidth={1.35} />}
        label={t("settings.fasting")}
        description={t("settings.fastingHint")}
        sub={t(`onboard.fasting.${fasting}Sub`)}
      >
        <Track
          value={fasting}
          options={FASTING_RULES.map((f) => ({ value: f, label: t(`onboard.fasting.${f}`) }))}
          onChange={(f) => {
            writeFastingRule(f);
            void saveSpaceToAccount();
          }}
          label={t("settings.fasting")}
        />
      </Row>
      <Row icon={<Compass size={17} strokeWidth={1.7} />} label={t("settings.focus")}>
        <FirstFocus
          intent={intent}
          level={level}
          again={again}
          label={t("settings.focus")}
          onPick={(i) => {
            writeIntent(i);
            writeFocus([focusFor(i)]);
            refreshDayOne();
            void saveSpaceToAccount();
          }}
        />
      </Row>
    </Section>
  );
}

/**
 * Testers mode (1.8), for admins alone. The owner, 2026-10-28: "add a testers
 * mode for admins (I am able to easily switch the preference of my user to
 * test out what different backgrounds see (Catholic protestant inquiring
 * etc)". Drawn only once the server has said this reader is an admin
 * (app/api/admin/whoami); the list never comes here.
 *
 * Where the reader comes from and how familiar they are switch at a tap, on
 * this device only, so every screen that reads the reader's type shows that
 * reader at once. First open shows the welcome questions again, as a new
 * reader meets them. Back to my own puts the admin's answers back exactly.
 * The first switch keeps them; while the mode is on nothing is counted,
 * nothing reaches the account, and a mark on every screen says so
 * (lib/onboarding/testers.ts, components/onboarding/TestersMark.tsx).
 */
function TestersSection({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslate();
  const router = useRouter();
  const admin = useIsAdmin(signedIn);
  const testing = useTesting();
  const { level, background } = useSpace();
  if (!admin) return null;
  return (
    <Section id="testers" title={t("testers.title")} hint={t("testers.hint")}>
      <Row icon={<Church size={18} />} label={t("testers.from")}>
        <Track
          value={background}
          options={BACKGROUNDS.map((b) => ({ value: b, label: t(`onboard.background.${b}`) }))}
          onChange={(b) => testAs({ background: b })}
          label={t("testers.from")}
          cols={3}
        />
      </Row>
      <Row icon={<HaloedHead size={18} />} label={t("settings.level")}>
        <Track
          value={level}
          options={LEVELS.map((l) => ({ value: l, label: t(`onboard.level.${l}`) }))}
          onChange={(l) => testAs({ level: l })}
          label={t("settings.level")}
        />
      </Row>
      <ButtonRow
        icon={<Sparkle size={16} />}
        label={t("testers.firstOpen")}
        description={t("testers.firstOpenHint")}
        onClick={() => {
          testFirstOpen();
          router.push("/");
        }}
      />
      <ButtonRow
        icon={<User size={18} strokeWidth={1.7} />}
        label={t("testers.back")}
        description={t("testers.backHint")}
        onClick={() => backToMyOwn()}
        disabled={!testing}
      />
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
      <Row
        icon={<Wind size={18} />}
        label={t("settings.animations")}
        description={t("settings.animationsHint")}
        control={<Switch on={!reduced} onChange={(on) => setMotionPreference(on ? "on" : "off")} label={t("settings.animations")} />}
      />
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
        <Row
          icon={<Sun size={18} />}
          label={t("settings.widgetRow")}
          description={t("settings.widgetHint")}
          control={
            <button type="button" onClick={() => setOpen(true)} className="set-btn hit-44">
              {t("widgetTip.show")}
            </button>
          }
        />
      </Section>
      <WidgetTipSheet open={open} onClose={() => setOpen(false)} platform={platform} />
    </>
  );
}

function Body() {
  const { t } = useTranslate();
  // The size is ReaderSizeRow's, which asks as the Bible does (BIBLE_START_SIZE).
  const { font, setFont } = useReaderPrefs();
  const { on: interlinearOn, toggle: toggleInterlinear } = useInterlinear();
  const [calStyle, pickCalStyle] = useCalendarStyleDefault();
  const reader = useReader();
  const signedIn = reader.known && reader.email !== null;

  const faceNames: Record<ReaderFont, string> = {
    serif: t("bible.fontSerif"),
    display: t("settings.fontDisplay"),
    sans: t("settings.fontSans"),
  };

  return (
    <>
      <AccountSection reader={reader} />

      <SpaceSection />

      <TestersSection signedIn={signedIn} />

      <Section
        id="reading"
        title={t("settings.reading")}
        hint={t("settings.readingHint")}
      >
        <Row icon={<Book size={18} />} label={t("ui.readingMode")}>
          <ReadingModePages />
        </Row>
        <Row icon={<FacesGlyph />} label={t("ui.readerFont")} description={t("settings.fontHint")}>
          <Track
            faces
            value={font}
            options={FACES.map((f) => ({
              value: f,
              label: faceNames[f],
              // Each face drawn in itself, its name under it; the letters
              // left to right in every language, as the plate's are.
              face: (
                <>
                  <span aria-hidden dir="ltr" className={cn("set-face", FONT_CLASSES[f])}>
                    <span>A</span>
                    <span>a</span>
                  </span>
                  <span className="set-face-name">{faceNames[f]}</span>
                </>
              ),
            }))}
            onChange={setFont}
            label={t("ui.readerFont")}
          />
        </Row>
        <ReaderSizeRow />
        <Row
          icon={<AlphaGlyph />}
          label={t("ui.interlinearByDefault")}
          description={t("settings.interlinearHint")}
          control={
            <Switch
              on={interlinearOn}
              onChange={(on) => {
                if (on !== interlinearOn) toggleInterlinear();
              }}
              label={t("ui.interlinearByDefault")}
            />
          }
        />
      </Section>

      <Section id="calendar" title={t("settings.calendar")} hint={t("settings.calendarHint")}>
        <Row icon={<Calendar size={18} />} label={t("ui.calendarReckoning")}>
          <Track
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

      {/* The picker names the language itself, in its own words, so the row
          has its globe and the picker and no second "Language". */}
      <Section id="language" title={t("settings.language")}>
        <div className="set-row">
          <div className="set-lab">
            <Plate>
              <GlobeGlyph />
            </Plate>
            <LanguagePicker />
          </div>
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

/**
 * Up once the screen has been drawn as the device holds it. The choices here
 * are read from the device after the page is put together, so on a page
 * loaded whole a choice can change under the first frame; their motion waits
 * for this, a whole frame later, and the screen opens still (app/globals.css,
 * "Settings: lit panels").
 */
function useLive(): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setLive(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return live;
}

export function SettingsClient() {
  const live = useLive();
  // ReadingModePages and the font and size rows read ReaderPrefs, which is
  // provided per route rather than globally.
  return (
    <ReaderPrefsProvider>
      <div className="set-root" data-live={live ? "" : undefined}>
        <Body />
      </div>
    </ReaderPrefsProvider>
  );
}
