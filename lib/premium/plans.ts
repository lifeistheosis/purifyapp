// The Purify premium plan, single-sourced.
//
// Standard / Plus / Pro tier content, prices, the opening offer, and the
// freewill-gift copy live here so the checkout page (/pricing), the
// marketing showcase (/premium), and the native paywall can never drift
// on what a tier costs or includes. Prices and subscription terms are a
// release stop-condition: change them deliberately, in one place, EN and
// DE together.
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
// Reading modes moved from Pro to Plus on 2026-08-12 by the owner's call.
// Two things the copy must not claim, both fixed in that same change: it
// named Parchment, which is the FREE Light palette under the name it used
// to carry (lib/reader/readingModes.ts FREE_THEMES), and it named Focus,
// which nothing gates anywhere in the codebase. What is listed here has to
// be something a reader actually cannot have without paying.

// Numeric plan prices in cents, the single source for any MATH (the
// localized copy strings below cannot be parsed). Used by the admin
// revenue/subscriptions estimate (lib/premium/mrr.ts). These MIRROR the
// display strings; changing a real price is still a release stop-condition.
export const PLAN_PRICE_CENTS = {
  plusMonthly: 499,
  plusYearly: 3899,
  proMonthly: 1999,
  proYearly: 19900,
} as const;

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
    "Every saint’s life, and the primary writings of the Fathers",
    "Theology: doctrine, apologetics, and the Councils",
    "Orthodox History, from Pentecost onward",
    "The daily prayers, the hours, and the akathists",
    "The whole Church calendar, its fasts, and the fasting tracker",
    "Prayer Campaigns, prayed together",
  ],
  freeFoot: "No ads. No tracking. No surprise locks. For anyone who needs it.",
  soonLabel: "Coming soon",
  plusTitle: "Purify Plus",
  plusLede: "The premium reading and study experience.",
  plusItems: [
    {
      id: "cross-refs",
      title: "Cross-references",
      sub: "Tap a verse in the New Testament and see the passages it echoes, with their words beside it",
    },
    {
      id: "journal",
      title: "Your journal",
      sub: "Every note you write in the Scriptures, dated and gathered in one place, and the ones from this day in past months brought back to you",
    },
    {
      id: "plans",
      title: "Reading plans",
      sub: "The Psalter by kathisma, the four Gospels a chapter a day, Proverbs in a month, with your streak kept",
    },
    {
      id: "reading-modes",
      title: "Premium Reading Modes",
      sub: "Candlelight and Monastery reading, in the Scriptures and the writings of the Fathers",
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
      sub: "The story of the Church in full cinematic dress",
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
  plusPriceMonthly: "$4.99 / month",
  plusPriceYearly: "$38.99 / year",
  plusPromise:
    "A promise already made stays made: pre-launch supporters keep lifetime cross-device sync, no subscription required. That promise covers sync itself; the wider Plus tools belong to the subscription.",
  proTitle: "Purify Pro",
  proLede: "Everything in Plus, and the complete premium experience.",
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
  freeTitle: "Standard, immer frei",
  freeItems: [
    "Die Schriften, mit dem Griechischen daneben",
    "Jedes Leben eines Heiligen und die wichtigsten Schriften der Väter",
    "Theologie: Lehre, Apologetik und die Konzilien",
    "Orthodoxe Geschichte, von Pfingsten an",
    "Die täglichen Gebete, die Horen und die Akathiste",
    "Der ganze Kirchenkalender, seine Fasten und der Fastentracker",
    "Gebetskampagnen, gemeinsam gebetet",
  ],
  freeFoot:
    "Keine Werbung. Keine Verfolgung. Keine überraschenden Sperren. Für jeden, der sie braucht.",
  soonLabel: "Bald verfügbar",
  plusTitle: "Purify Plus",
  plusLede: "Das Premium-Erlebnis fürs Lesen und Studieren.",
  plusItems: [
    {
      id: "cross-refs",
      title: "Querverweise",
      sub: "Tippe auf einen Vers im Neuen Testament und sieh die Stellen, die er anklingen lässt, mit ihrem Wortlaut daneben",
    },
    {
      id: "journal",
      title: "Dein Tagebuch",
      sub: "Jede Notiz, die du in den Schriften schreibst, datiert und an einem Ort gesammelt, und die von diesem Tag in früheren Monaten wieder vor Augen",
    },
    {
      id: "plans",
      title: "Lesepläne",
      sub: "Der Psalter nach Kathismen, die vier Evangelien ein Kapitel pro Tag, die Sprichwörter in einem Monat, mit deiner Serie im Blick",
    },
    {
      id: "reading-modes",
      title: "Premium-Lesemodi",
      sub: "Kerzenlicht und Kloster, in den Schriften und den Werken der Väter",
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
      sub: "Die Geschichte der Kirche in vollem filmischem Gewand",
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
  plusPriceMonthly: "4,99 $ / Monat",
  plusPriceYearly: "38,99 $ / Jahr",
  plusPromise:
    "Ein gegebenes Versprechen bleibt bestehen: Unterstützer aus der Zeit vor dem Start behalten die geräteübergreifende Synchronisierung auf Lebenszeit, ohne Abonnement. Dieses Versprechen gilt der Synchronisierung selbst; die weiteren Plus-Werkzeuge gehören zum Abonnement.",
  proTitle: "Purify Pro",
  proLede: "Alles aus Plus und das vollständige Premium-Erlebnis.",
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
  supportCta: "Eine Kerze anzünden",
  supportFoot: "Völlig freiwillig. Einmal geben, oder gar nicht.",
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
