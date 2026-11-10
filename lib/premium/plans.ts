// The Purify premium plan, single-sourced.
//
// Standard / Plus / Pro tier content, prices, the opening offer, and the
// freewill-gift copy live here so the marketing showcase (/premium) and Your
// plan can never drift on what a tier costs or includes. Prices and
// subscription terms are a release stop-condition: change them deliberately,
// in one place, EN and DE together.
//
// The paywall no longer reads this file (1.8). Its three places, the upgrade
// sheet, the apps' screen and the website's /pricing, take every price from
// the store at runtime, and their words from the catalogs in all twenty-one
// languages: the Plus rows in lib/premium/plusRows.ts PLUS_ROWS, and the Pro
// rows and the EIKON Box's terms in PRO_ROWS and PRO_TERMS there, whose
// English and German are this file's own, held to it letter for letter by
// lib/premium/__tests__/paywallPlus2.test.ts. Change a Pro row here and there
// together.
//
// The ladder (Beta 2.1): Standard is the complete Orthodox foundation,
// free forever. Plus is utility, the premium reading and study
// experience (reading modes, sync, notes, collections). Pro is luxury,
// everything in Plus plus the EIKON Box and EIKON member benefits.
// Free EIKON shipping belongs to PRO, not Plus.
//
// The Community supporter mark and the Discord season frames joined the
// Plus list on 2026-09-28: both shipped in 1.4 and both are Plus-only in the
// code (lib/community/authorMark.ts, components/desktop/usePlusCustom.ts).
//
// Ambience under the reading and Remember a verse joined it in 1.7.2: both
// shipped as Plus in 1.7 (components/billing/UpgradeModal.tsx locks them)
// and the list had never said so.
//
// Reading modes moved from Pro to Plus on 2026-08-12 by the owner's call.
// Two things the copy must not claim, both fixed in that same change: it
// named Parchment, which is the FREE Light palette under the name it used
// to carry (lib/reader/readingModes.ts FREE_THEMES), and it named Focus,
// which nothing gates anywhere in the codebase. What is listed here has to
// be something a reader actually cannot have without paying.
//
// From 1.9 the row counts them: nineteen, which is Candlelight, Monastery and
// the seventeen looks in their four families (the owner's word, 2026-11-10,
// "all recs", on the three lines drafted for him; the other two are the
// sheet's title and body, plus.palettes.title and plus.palettes.body, and
// the row's short name, plus.active.modes, is the title's first words). His
// lines said twenty and eighteen: Fire came out of the looks the same day
// ("remove fire"), and the numbers followed it, nothing else in the lines. A
// number in words goes stale the day a look is added or dropped, so
// lib/premium/__tests__/plans.test.ts reads it against the registry. The two
// palettes earned by reading are not in the count.

// Numeric plan prices in cents, the single source for any MATH (the
// localized copy strings below cannot be parsed). Used by the admin
// revenue/subscriptions estimate (lib/premium/mrr.ts) and the EIKON Box
// budget (lib/premium/boxBudget.ts). These MIRROR the display strings
// (plusPriceMonthly and the rest, below, and the Terms), and the test holds
// them together; changing a real price is still a release stop-condition.
// Plus read $4.99 and $38.99 here, its price from 2026-07-24, for two weeks
// after the app and the Terms moved to $9.99 and $71.99 (2026-10-18), so the
// estimate counted every Plus member at half; set right on the owner's word
// of 2026-10-31 ("fix all of them"). A member still billed the old $4.99 is
// counted at the list price now, as the estimate counts everyone.
export const PLAN_PRICE_CENTS = {
  plusMonthly: 999,
  plusYearly: 7199,
  proMonthly: 1999,
  proYearly: 19900,
} as const;

/**
 * The yearly plan's free trial, in days, as the stores grant it on a first
 * subscription (2026-10-18; plusTrial below says it in words). The Plus page
 * reads it in every language (lib/premium/planWords.ts), so no sentence
 * carries the number typed in; the paywall reads the store's own offer.
 * lib/premium/__tests__/planWords.test.ts holds it to the English and German.
 */
export const PLUS_TRIAL_DAYS = 7;

export type PlanFeature = {
  /** Stable slug, shared across locales. Renderers key icons off it and
   * the parity test pins EN/DE against drift. */
  id: string;
  title: string;
  sub: string;
  /** Marks a perk that is promised but not yet live (e.g. Studio Audio).
   * Renderers show the locale's `soonLabel` pill next to the title. */
  soon?: boolean;
};

import { campaignsEnabled } from "@/lib/campaigns/flags";

export type PremiumPlanCopy = {
  // Standard, the always-free tier.
  freeTitle: string;
  freeItems: string[];
  freeFoot: string;
  // The pill label rendered next to `soon` features.
  soonLabel: string;
  // Purify Plus.
  plusTitle: string;
  plusLede: string;
  plusItems: PlanFeature[];
  plusPriceMonthly: string;
  plusPriceYearly: string;
  /** The yearly plan's free trial (2026-10-18): first subscriptions only, as the stores grant it. */
  plusTrial: string;
  plusPromise: string;
  // Purify Pro.
  proTitle: string;
  proLede: string;
  proItems: PlanFeature[];
  proPriceMonthly: string;
  proPriceYearly: string;
  proNote: string;
  proInApp: string;
  // The freewill-gift ("light a lamp") panel.
  supportKicker: string;
  supportLine: string;
  supportCta: string;
  supportFoot: string;
};

export const PREMIUM_PLAN_EN: PremiumPlanCopy = {
  freeTitle: "Standard, always free",
  freeItems: [
    "The Scriptures, with the Greek beside them",
    "Every saint’s life, and the Fathers’ own writings",
    "Theology: doctrine, apologetics, and the Councils",
    "Orthodox History, from Pentecost onward",
    "The daily prayers, the hours, and the akathists",
    "The whole Church calendar, its fasts, and the fasting tracker",
    "Your journal, by the Church’s day, and your notes on verses",
    "Prayer Campaigns, prayed together",
  ],
  freeFoot: "No ads. No tracking. No surprise locks. For anyone who needs it.",
  soonLabel: "Coming soon",
  plusTitle: "Purify Plus",
  plusLede: "The reading and study tools.",
  plusItems: [
    {
      id: "cross-refs",
      title: "Cross-references",
      sub: "Hold a verse in either Testament and see the passages it echoes, with their words beside it",
    },
    {
      id: "word-study",
      title: "Greek word study",
      sub: "Tap a Greek word and see every place it stands, in the Septuagint and the New Testament, with the verse beside each",
    },
    {
      id: "ambience",
      title: "Ambience while you read",
      sub: "Rain, birdsong or a church bell, softly under what you read",
    },
    {
      id: "journal",
      title: "The full journal",
      sub: "Covers from the icons, notebooks and tags, headings, checklists and callouts, a font of your own, search, and the pages from this day in past months brought back to you",
    },
    {
      id: "plans",
      title: "Reading plans",
      sub: "The Psalter by kathisma, the four Gospels a chapter a day, Proverbs in a month, with your streak kept",
    },
    {
      id: "remember",
      title: "Remember a verse",
      sub: "The verses you save, brought back until you know them by heart",
    },
    {
      id: "reading-modes",
      title: "Reading modes",
      sub: "Nineteen reading modes, from Candlelight to the Holy Mountain, in the Scriptures and the writings of the Fathers",
    },
    {
      id: "florilegium",
      title: "Custom collections & Florilegium",
      sub: "Your own collections of verses and the Fathers' lines, each with a note beside it",
    },
    {
      id: "sync",
      title: "Your notes on every device",
      sub: "Notes, highlights, bookmarks and collections are free on the device you write them on. Plus carries them to every device you sign in on.",
    },
    {
      id: "immersive-history",
      title: "Immersive History",
      sub: "The great events told year by year, with a map that follows them",
    },
    {
      id: "supporter-mark",
      title: "Your mark in Community",
      sub: "A small gold cross beside your name. It carries no weight in the feed, and you can turn it off",
    },
    {
      id: "discord-frames",
      title: "Discord status, framed",
      sub: "In the Windows app, your Discord portrait framed in the color of the Church's season",
    },
  ],
  plusPriceMonthly: "$9.99 / month",
  plusPriceYearly: "$71.99 / year",
  plusTrial: "Yearly saves 40% and begins with 7 days free, on a first subscription.",
  plusPromise:
    "A promise already made stays made: pre-launch supporters keep lifetime cross-device sync, no subscription required. That promise covers sync itself; the wider Plus tools belong to the subscription.",
  proTitle: "Purify Pro",
  proLede: "Everything in Plus, and the members' layer.",
  proItems: [
    {
      id: "everything-plus",
      title: "Everything in Purify Plus",
      sub: "All of it, uncapped",
    },
    {
      id: "studio-audio",
      title: "Studio Audio",
      sub: "Professionally narrated Scripture, saints, and Orthodox History",
      soon: true,
    },
    {
      id: "eikon-box",
      title: "The EIKON Box",
      sub: "A curated monthly box of Orthodox devotional goods: an icon, a prayer rope, incense, a booklet, or seasonal gifts. Each month we open a box and you claim yours in the app while the window is open.",
    },
    {
      id: "eikon-benefits",
      title: "EIKON member benefits",
      sub: "Free shipping on every order, members’ discount codes, and early access to new releases",
    },
  ],
  proPriceMonthly: "$19.99 / month",
  proPriceYearly: "$199 / year",
  proNote:
    "The EIKON Box is claimed, not sent automatically. Each month we open a box, you claim it in the app inside the claim window, and we gather and ship to the number claimed. Contents vary month to month and no specific item is promised. A box you do not claim before the window closes is not carried over and is not refunded. United States addresses for now.",
  proInApp: "Get Purify Pro in the Android app",
  supportKicker: "Purify is kept by those it helps.",
  supportLine:
    "If the app has carried you, you can carry it a little in return. Beyond Plus and Pro, a freewill gift is always welcome and never required.",
  supportCta: "Light a lamp",
  supportFoot: "Entirely optional. Give once, or not at all.",
};

export const PREMIUM_PLAN_DE: PremiumPlanCopy = {
  freeTitle: "Standard, immer kostenlos",
  freeItems: [
    "Die Schriften, mit dem Griechischen daneben",
    "Jedes Leben eines Heiligen und die Schriften der Väter selbst",
    "Theologie: Lehre, Apologetik und die Konzilien",
    "Orthodoxe Geschichte, von Pfingsten an",
    "Die täglichen Gebete, die Horen und die Akathiste",
    "Der ganze Kirchenkalender, seine Fasten und der Fastentracker",
    "Dein Tagebuch, nach dem Tag der Kirche, und deine Notizen zu den Versen",
    "Gebetskampagnen, gemeinsam gebetet",
  ],
  freeFoot:
    "Keine Werbung. Kein Tracking. Keine überraschenden Sperren. Für jeden, der sie braucht.",
  soonLabel: "Bald verfügbar",
  plusTitle: "Purify Plus",
  plusLede: "Die Werkzeuge fürs Lesen und Studieren.",
  plusItems: [
    {
      id: "cross-refs",
      title: "Querverweise",
      sub: "Halte einen Vers in einem der beiden Testamente gedrückt und sieh die Stellen, die er anklingen lässt, mit ihrem Wortlaut daneben",
    },
    {
      id: "word-study",
      title: "Griechische Wortstudie",
      sub: "Tippe auf ein griechisches Wort und sieh jede Stelle, an der es steht, in der Septuaginta und im Neuen Testament, mit dem Vers daneben",
    },
    {
      id: "ambience",
      title: "Klangkulisse beim Lesen",
      sub: "Regen, Vogelgesang oder eine Kirchenglocke, leise unter dem, was du liest",
    },
    {
      id: "journal",
      title: "Das ganze Tagebuch",
      sub: "Titelbilder aus den Ikonen, Notizbücher und Schlagwörter, Überschriften, Checklisten und Hervorhebungen, eine Schrift nach deiner Wahl, die Suche und die Seiten von diesem Tag in früheren Monaten wieder vor Augen",
    },
    {
      id: "plans",
      title: "Lesepläne",
      sub: "Der Psalter nach Kathismen, die vier Evangelien ein Kapitel pro Tag, die Sprichwörter in einem Monat, mit deiner Serie im Blick",
    },
    {
      id: "remember",
      title: "Einen Vers behalten",
      sub: "Die Verse, die du speicherst, kehren wieder, bis du sie auswendig kannst",
    },
    {
      id: "reading-modes",
      title: "Lesemodi",
      sub: "Neunzehn Lesemodi, von Kerzenlicht bis zum Heiligen Berg, in den Schriften und den Werken der Väter",
    },
    {
      id: "florilegium",
      title: "Eigene Sammlungen & Florilegium",
      sub: "Eigene Sammlungen von Versen und Worten der Väter, jede mit einer Notiz daneben",
    },
    {
      id: "sync",
      title: "Deine Notizen auf jedem Gerät",
      sub: "Notizen, Markierungen, Lesezeichen und Sammlungen sind auf dem Gerät, auf dem du sie schreibst, kostenlos. Plus trägt sie auf jedes Gerät, auf dem du dich anmeldest.",
    },
    {
      id: "immersive-history",
      title: "Immersive Kirchengeschichte",
      sub: "Die großen Ereignisse Jahr für Jahr, mit einer Karte, die ihnen folgt",
    },
    {
      id: "supporter-mark",
      title: "Dein Zeichen in der Gemeinschaft",
      sub: "Ein kleines goldenes Kreuz neben deinem Namen. Es hat kein Gewicht im Feed, und du kannst es ausschalten",
    },
    {
      id: "discord-frames",
      title: "Discord-Status, gerahmt",
      sub: "In der Windows-App dein Discord-Porträt, gerahmt in der Farbe der kirchlichen Zeit",
    },
  ],
  plusPriceMonthly: "9,99 $ / Monat",
  plusPriceYearly: "71,99 $ / Jahr",
  plusTrial: "Jährlich sparst du 40 %, und es beginnt mit 7 kostenlosen Tagen, beim ersten Abo.",
  plusPromise:
    "Ein gegebenes Versprechen bleibt bestehen: Unterstützer aus der Zeit vor dem Start behalten die geräteübergreifende Synchronisierung auf Lebenszeit, ohne Abonnement. Dieses Versprechen gilt der Synchronisierung selbst; die weiteren Plus-Werkzeuge gehören zum Abonnement.",
  proTitle: "Purify Pro",
  proLede: "Alles aus Plus und die Mitgliederebene.",
  proItems: [
    {
      id: "everything-plus",
      title: "Alles aus Purify Plus",
      sub: "Alles, ohne Begrenzung",
    },
    {
      id: "studio-audio",
      title: "Studio-Audio",
      sub: "Professionell eingelesene Schrift, Heilige und orthodoxe Geschichte",
      soon: true,
    },
    {
      id: "eikon-box",
      title: "Die EIKON-Box",
      sub: "Eine kuratierte monatliche Box orthodoxer Andachtsgüter: eine Ikone, eine Gebetsschnur, Weihrauch, ein Büchlein oder saisonale Gaben. Jeden Monat öffnen wir eine Box, und du forderst deine in der App an, solange das Fenster offen ist.",
    },
    {
      id: "eikon-benefits",
      title: "EIKON-Mitgliedervorteile",
      sub: "Kostenloser Versand bei jeder Bestellung, Mitglieder-Rabattcodes und früher Zugang zu Neuem",
    },
  ],
  proPriceMonthly: "19,99 $ / Monat",
  proPriceYearly: "199 $ / Jahr",
  proNote:
    "Die EIKON-Box wird angefordert, nicht automatisch versandt. Jeden Monat öffnen wir eine Box, du forderst sie innerhalb des Anforderungsfensters in der App an, und wir beschaffen und versenden nach der Zahl der Anforderungen. Der Inhalt wechselt von Monat zu Monat, und kein bestimmter Artikel wird versprochen. Eine Box, die du nicht vor Fensterschluss anforderst, wird nicht übertragen und nicht erstattet. Derzeit nur Adressen in den Vereinigten Staaten.",
  proInApp: "Purify Pro in der Android-App holen",
  supportKicker: "Purify wird von denen getragen, denen es hilft.",
  supportLine:
    "Wenn die App dich getragen hat, kannst du sie ein wenig zurücktragen. Über Plus und Pro hinaus ist eine freiwillige Gabe stets willkommen und nie erforderlich.",
  supportCta: "Eine Lampe anzünden",
  supportFoot: "Völlig freiwillig. Einmal geben, oder gar nicht.",
};

/**
 * The Plus page's own words (its heading, its buttons, its cards' labels), as
 * approved in English and German: moved here from app/(app)/premium/page.tsx
 * word for word on 2026-11-10, when the page began to say every word from the
 * catalogs in all twenty-one languages (lib/premium/planWords.ts).
 * lib/premium/__tests__/planWords.test.ts holds the catalogs' English and
 * German to these, letter for letter. `perYear` is the "or" before the yearly
 * price (premium.orPerYear).
 */
export type PremiumPageCopy = {
  h1: string;
  lede: string;
  seePlus: string;
  seePro: string;
  freeHeading: string;
  plansHeading: string;
  plansSub: string;
  standardName: string;
  standardPrice: string;
  standardPriceSub: string;
  standardTagline: string;
  standardCta: string;
  plusBadge: string;
  plusCta: string;
  proRibbon: string;
  proCta: string;
  perYear: string;
};

export const PREMIUM_PAGE_EN: PremiumPageCopy = {
  h1: "The whole Church, carried with you.",
  lede: "Everything at the heart of Purify is free, and it stays free. Plus and Pro add an optional layer: your reading on every device, the Church in fuller dress, and a way to keep the lamps lit.",
  seePlus: "See Purify Plus",
  seePro: "See Purify Pro",
  freeHeading: "Free, and always",
  plansHeading: "Choose your plan",
  plansSub: "Two optional subscriptions. Cancel anytime. The free core never changes.",
  standardName: "Standard",
  standardPrice: "Free",
  standardPriceSub: "forever",
  standardTagline: "The whole spiritual treasury, for anyone who needs it.",
  standardCta: "Open Purify",
  plusBadge: "Available now",
  plusCta: "Get Purify Plus",
  proRibbon: "Most complete",
  proCta: "Get Purify Pro",
  perYear: "or",
};

export const PREMIUM_PAGE_DE: PremiumPageCopy = {
  h1: "Die ganze Kirche, mit dir getragen.",
  lede: "Alles im Herzen von Purify ist kostenlos und bleibt kostenlos. Plus und Pro fügen eine optionale Schicht hinzu: dein Lesen auf jedem Gerät, die Kirche in vollerem Gewand und ein Weg, die Lampen am Brennen zu halten.",
  seePlus: "Purify Plus ansehen",
  seePro: "Purify Pro ansehen",
  freeHeading: "Kostenlos, für immer",
  plansHeading: "Wähle deinen Plan",
  plansSub: "Zwei optionale Abonnements. Jederzeit kündbar. Der kostenlose Kern ändert sich nie.",
  standardName: "Standard",
  standardPrice: "Kostenlos",
  standardPriceSub: "für immer",
  standardTagline: "Der ganze geistliche Schatz, für jeden, der ihn braucht.",
  standardCta: "Purify öffnen",
  plusBadge: "Jetzt verfügbar",
  plusCta: "Purify Plus holen",
  proRibbon: "Am umfassendsten",
  proCta: "Purify Pro holen",
  perYear: "oder",
};

/**
 * The free-tier line that names Prayer Campaigns, in each locale.
 *
 * Kept as data rather than deleted from the arrays above, so restoring the
 * feature restores the copy with it and the EN/DE lists stay the same length,
 * which lib/premium/__tests__/plans.test.ts asserts.
 */
const CAMPAIGN_FREE_ITEM: Record<string, string> = {
  en: "Prayer Campaigns, prayed together",
  de: "Gebetskampagnen, gemeinsam gebetet",
};

/**
 * The plan copy for a locale, with anything that is currently withdrawn
 * filtered out.
 *
 * WHY THIS FILTER EXISTS. /premium and /pricing both render freeItems, and
 * both were selling "Prayer Campaigns, prayed together" as part of the free
 * foundation while /campaigns answered 404. Confirmed in the built output on
 * 2026-08-26: the string was in the VISIBLE text of out/premium/index.html and
 * out/pricing/index.html, not merely in a bundled chunk.
 *
 * Withdrawing a feature has to reach the pages that advertise it, or the
 * product is promising something it does not have on the two pages people read
 * before paying. The filter is driven by the same flag as the routes, so the
 * copy and the feature can never disagree again.
 *
 * The changelog at /whats-new still names campaigns, and should: it is a
 * record of what shipped on a date, not a claim about today.
 */
export function getPremiumPlan(locale: string): PremiumPlanCopy {
  const plan = locale === "de" ? PREMIUM_PLAN_DE : PREMIUM_PLAN_EN;
  if (campaignsEnabled()) return plan;
  const withdrawn = CAMPAIGN_FREE_ITEM[locale === "de" ? "de" : "en"];
  return {
    ...plan,
    freeItems: plan.freeItems.filter((item) => item !== withdrawn),
  };
}
