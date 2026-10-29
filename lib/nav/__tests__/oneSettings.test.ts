// One Settings: the You tab keeps the reader's own rows and one door, and
// everything about the account and the app is behind that door, once.
//
// What a reader would notice if this broke: the You tab's list growing back
// into eleven rows under the word "Account", three of them leading into each
// other ("Account and security" to a dashboard of four tabs, "Settings" to a
// screen whose last group led back into the dashboard, and "Export your
// library" in all three). The owner said of that list on his own phone,
// 2026-10-13: "there is technically 3 sections that all have similar names.
// profile, settings, account. like it needs to be even more simplified. if
// you have to delete sections and add them into one then do that".
//
// This reads the source. How the two screens are drawn in a built app is
// section 28 of scripts/export-walk.mjs.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old list is not read as the list. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const YOU = "components/mobile/YouMobile.tsx";
/** The reader's own name at the top of the You tab (1.8), the one account screen it opens. */
const YOU_NAME = "components/you/YouIdentity.tsx";
const SETTINGS = "components/settings/SettingsClient.tsx";
const SIGNED = "app/(app)/account/(signed)";

describe("the You tab's rows", () => {
  const you = code(YOU);
  const list = you.slice(you.indexOf("const settings: SettingsItem[] = [];"), you.indexOf("if (!reader.known)"));

  it("are the reader's own things, and one door", () => {
    const hrefs = [...list.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      "/signin?next=/account",
      "/pricing",
      "/account/eikon-box",
      "/prayers/personal",
      "/campaigns/mine",
      "/settings",
    ]);
  });

  it("are all the rows there are: the reader's name above them is the one other door", () => {
    // 1.8: the reader's own name and picture, at the top, open their Profile,
    // the one account screen that is about who they are. Profile keeps its
    // row in Settings too; nothing else of the account is named on You.
    expect(you).toMatch(/<YouIdentity\b/);
    const name = code(YOU_NAME);
    expect([...name.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(["/account/profile"]);
  });

  it("name no account screen, nothing about Purify, and do not sign out", () => {
    for (const gone of [
      "/account/profile",
      "/account/security",
      "/account/data",
      "/account/sessions",
      "/account/export",
      "/account/developer",
      "/privacy",
      "/support",
      "/whats-new",
      "/about",
      "/signout",
    ]) {
      expect(you.includes(`"${gone}"`), gone).toBe(false);
    }
  });

  it("end on the one door, under the bar every tab wears, loading or loaded", () => {
    // Until 1.7 the same door stood in this screen's header as well, a gear
    // the other tabs did not have. In 1.7 every tab took one bar
    // (MobileHeader), the same things on its right on all five (the owner,
    // 2026-10-16), so the door is the list's last row, and only there.
    expect(you.match(/<MobileHeader\b/g)).toHaveLength(2);
    expect(you.match(/<MobileHeader titleKey="nav\.you" \/>/g)).toHaveLength(2);
    for (const gone of ["SettingsDoor", "data-settings-door", "trailing=", "extra="]) {
      expect(you.includes(gone), gone).toBe(false);
    }
    const hrefs = [...list.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.at(-1)).toBe("/settings");
    expect(hrefs.filter((h) => h === "/settings")).toHaveLength(1);
  });

  it("have no heading over them", () => {
    // It said "Account" signed in and "Settings" signed out, over rows that
    // were neither.
    expect(you.includes('t("nav.account")')).toBe(false);
    expect(you.slice(you.lastIndexOf("data-you-rows")).includes("MobileSectionLabel")).toBe(false);
  });
});

describe("the one Settings", () => {
  const source = code(SETTINGS);
  const hrefsOf = (name: string) => {
    const at = source.indexOf(`function ${name}(`);
    expect(at, name).toBeGreaterThan(-1);
    const end = source.indexOf("\nfunction ", at + 10);
    return [...source.slice(at, end).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  };

  it("draws its groups in this order", () => {
    const body = source.slice(source.indexOf("function Body()"), source.indexOf("export function SettingsClient"));
    const drawn = [...body.matchAll(/<((?:[A-Z][A-Za-z]*)?Section)\b/g)].map((m) => m[1]);
    expect(drawn).toEqual([
      "AccountSection",
      "SpaceSection",
      "TestersSection", // 1.8, admins alone: lib/onboarding/__tests__/testers.test.ts
      "Section", // Reading
      "Section", // The calendar
      "MotionSection",
      "Section", // Language
      "DiscordSection",
      "WidgetSection",
      "DataSection",
      "AboutSection",
      "SignOutSection",
    ]);
  });

  it("opens every account screen from one row, and nothing twice", () => {
    expect(hrefsOf("AccountSection")).toEqual(["/signin?next=/settings", "/account/profile", "/account/security", "/account/notifications"]);
    expect(hrefsOf("DataSection")).toEqual(["/account/export", "/account/data#danger"]);
    expect(hrefsOf("AboutSection")).toEqual(["/privacy", "/support", "/whats-new", "/about", "/account/developer"]);
    expect(hrefsOf("SignOutSection")).toEqual(["/signout"]);
    const all = [...source.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("uses only words the catalog already had", () => {
    const keys = [
      "settings.account",
      "common.signIn",
      "ui.syncAcrossDevicesOptional",
      "account.tabs.profile",
      "account.tabs.security",
      "settings.notifications",
      "settings.notificationsHint",
      "settings.showSupporterMark",
      "settings.showSupporterMarkHint",
      "account.tabs.data",
      "settings.export",
      "settings.exportHint",
      "account.deleteAccount",
      "settings.eyebrow",
      "footer.privacy",
      "nav.supportPurify",
      "nav.whatsNew",
      "nav.about",
      "ui.developer",
      "common.signOut",
    ];
    const en = getMessages("en");
    for (const key of keys) {
      expect(en[key], key).toBeTruthy();
      expect(source.includes(`t("${key}")`), key).toBe(true);
    }
  });

  it("draws Testers mode only once the server has said the reader is an admin", () => {
    // The list of admins never reaches the screen: the section asks
    // /api/admin/whoami (lib/admin/useIsAdmin.ts) and draws nothing until it says yes.
    const at = source.indexOf("function TestersSection(");
    const testers = source.slice(at, source.indexOf("\nfunction ", at + 10));
    expect(testers).toMatch(/const admin = useIsAdmin\(signedIn\);/);
    expect(testers).toMatch(/if \(!admin\) return null;/);
    expect(source).not.toMatch(/ADMIN_EMAILS|adminEmails|isAdminEmail/);
    expect(code("lib/admin/useIsAdmin.ts")).toMatch(/apiFetch\("\/api\/admin\/whoami"/);
  });

  it("is named once on a phone", () => {
    // The bar says Settings; the large heading under it is the desktop's.
    const page = code("app/(app)/settings/page.tsx");
    // Back the way the reader came, Account as the floor (1.8): a fixed
    // address here and on Account sent each back to the other.
    expect(page).toMatch(/<MobileTopBar titleKey="settings\.title" back backFallback="\/account" \/>/);
    expect(page).toMatch(/<header className="mb-10 hidden md:block native-md-hidden">/);
  });
});

describe("the account's screens on a phone", () => {
  it("each exist, under the one gate", () => {
    for (const screen of ["profile", "security", "notifications", "data", "sessions"]) {
      expect(existsSync(join(root, SIGNED, screen, "page.tsx")), screen).toBe(true);
    }
  });

  it("each wear a bar with their own name and a way back to their row", () => {
    const bar = code("components/account/AccountTopBar.tsx");
    // Profile has two ways in from 1.8 (its row, and the reader's name on the
    // You tab), so its way back is the way the reader came, with its row as
    // the floor.
    expect(bar.includes(`{ path: "/account/profile", titleKey: "account.tabs.profile", back: "/settings", came: true }`)).toBe(true);
    expect(bar).toMatch(/if \(screen\.came\) return <MobileTopBar [^>]*\bback backFallback=\{screen\.back\}/);
    for (const [path, titleKey, back] of [
      ["/account/security", "account.tabs.security", "/settings"],
      ["/account/notifications", "settings.notifications", "/settings"],
      ["/account/data", "account.tabs.data", "/settings"],
      ["/account/sessions", "account.tabs.sessions", "/account/security"],
    ]) {
      expect(bar.includes(`{ path: "${path}", titleKey: "${titleKey}", back: "${back}" }`), path).toBe(true);
    }
    const layout = code(`${SIGNED}/layout.tsx`);
    expect(layout).toMatch(/<AccountTopBar \/>/);
    expect(layout.includes("<MobileTopBar")).toBe(false);
  });

  it("have no tabs: those are the desktop dashboard's", () => {
    const layout = code(`${SIGNED}/layout.tsx`);
    const desktop = layout.slice(layout.indexOf('<div className="hidden md:block native-md-hidden"'));
    expect(desktop.indexOf("<AccountTabs />")).toBeGreaterThan(-1);
    expect(layout.indexOf("<AccountTabs />")).toBeGreaterThan(layout.indexOf('className="hidden md:block native-md-hidden"'));
    expect(layout.match(/<AccountTabs \/>/g)).toHaveLength(1);
  });

  it("give each thing one home", () => {
    // Data is what is synced, the reader's data and the danger zone. What
    // has another home on a phone is the desktop's only.
    const data = code(`${SIGNED}/data/page.tsx`);
    expect(data).toMatch(
      /<div className="hidden md:contents native-md-hidden"[^>]*>\s*<ProfileSettings \/>\s*<PushOptIn \/>\s*<EmailPreferences \/>\s*<PatronSaintPicker \/>\s*<\/div>/,
    );
    // Reminders and email: the Notifications screen.
    const notifications = code(`${SIGNED}/notifications/page.tsx`);
    expect(notifications).toMatch(/<PushOptIn \/>\s*<EmailPreferences \/>/);
    // The patron saint: the Profile screen, on a phone.
    expect(code("components/profile/ProfileTabClient.tsx")).toMatch(/<div className="mt-6 md:hidden native-md-block">\s*<PatronSaintPicker \/>/);
    // Where the account is signed in: under Security, on a phone.
    expect(code("components/account/security/SecurityTabClient.tsx")).toMatch(/<div className="md:hidden native-md-block"[^>]*>\s*<ProfileDevices \/>/);
  });

  it("keep the id the Delete account row opens", () => {
    expect(code("components/profile/ProfileDanger.tsx")).toMatch(/<section id="danger"/);
  });
});

describe("the search", () => {
  it("opens each account screen where its row does", () => {
    const corpus = code("lib/search/buildCorpus.ts");
    for (const href of ["/settings#account", "/account/profile", "/account/security", "/account/notifications", "/account/export"]) {
      expect(corpus.includes(`href: "${href}"`), href).toBe(true);
    }
    // Notifications are not "on the Data tab" any more.
    expect(corpus.includes('href: "/account/data"')).toBe(false);
  });
});
