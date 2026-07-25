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
// experience. Pro is luxury, everything in Plus and the complete premium
// experience (reading modes, the EIKON Box, EIKON member benefits).
// Free EIKON shipping belongs to PRO, not Plus.

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

export type PremiumPlanCopy = {
  // Standard, the always-free tier.
  freeTitle: string;
  freeItems: string[];
  freeFoot: string;
  // The opening-drop line shown under the paid prices.
  openingOffer: string;
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
  openingOffer:
    "Opening offer: 50% off your first year. It renews after at the standard price. Cancel anytime.",
  soonLabel: "Coming soon",
  plusTitle: "Purify Plus",
  plusLede: "The premium reading and study experience.",
  plusItems: [
    {
      id: "sync",
      title: "Cross-device sync",
      sub: "Your library on every device you sign in on. On Android the full app already reads offline; sync carries your own layer with you.",
    },
    {
      id: "notes",
      title: "Notes, highlights & bookmarks",
      sub: "Kept private, carried everywhere",
    },
    {
      id: "florilegium",
      title: "Custom collections & Florilegium",
      sub: "Build your own quote collections. A redesign is on the way.",
    },
    {
      id: "immersive-history",
      title: "Immersive History",
      sub: "The story of the Church in full cinematic dress, with a cinematic expansion coming",
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
      id: "reading-modes",
      title: "Premium Reading Modes",
      sub: "Focus, Candlelight, Monastery, and Parchment reading, in the Scriptures and the writings of the Fathers",
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
      sub: "A curated monthly box of Orthodox devotional goods: an icon, a prayer rope, incense, a booklet, or seasonal gifts. Contents vary month to month.",
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
    "The EIKON Box is a curated surprise: contents vary month to month, and no specific item is promised. It ships while your subscription is active and a shipping address is on file.",
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
  openingOffer:
    "Eröffnungsangebot: 50% Rabatt im ersten Jahr. Danach Verlängerung zum Standardpreis. Jederzeit kündbar.",
  soonLabel: "Bald verfügbar",
  plusTitle: "Purify Plus",
  plusLede: "Das Premium-Erlebnis fürs Lesen und Studieren.",
  plusItems: [
    {
      id: "sync",
      title: "Geräteübergreifende Synchronisierung",
      sub: "Deine Bibliothek auf jedem Gerät, auf dem du dich anmeldest. Auf Android liest die ganze App bereits offline; die Synchronisierung trägt deine eigene Ebene mit dir.",
    },
    {
      id: "notes",
      title: "Notizen, Markierungen & Lesezeichen",
      sub: "Privat gehalten, überallhin getragen",
    },
    {
      id: "florilegium",
      title: "Eigene Sammlungen & Florilegium",
      sub: "Erstelle deine eigenen Zitatsammlungen. Eine Neugestaltung ist unterwegs.",
    },
    {
      id: "immersive-history",
      title: "Immersive Kirchengeschichte",
      sub: "Die Geschichte der Kirche in vollem filmischem Gewand, eine filmische Erweiterung kommt",
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
      id: "reading-modes",
      title: "Premium-Lesemodi",
      sub: "Fokus, Kerzenlicht, Kloster und Pergament, in den Schriften und den Werken der Väter",
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
      sub: "Eine kuratierte monatliche Box orthodoxer Andachtsgüter: eine Ikone, eine Gebetsschnur, Weihrauch, ein Büchlein oder saisonale Gaben. Der Inhalt wechselt von Monat zu Monat.",
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
    "Die EIKON-Box ist eine kuratierte Überraschung: Der Inhalt wechselt von Monat zu Monat, kein bestimmter Artikel wird versprochen. Sie wird versandt, solange dein Abonnement aktiv ist und eine Lieferadresse hinterlegt ist.",
  proInApp: "Purify Pro in der Android-App holen",
  supportKicker: "Purify wird von denen getragen, denen es hilft.",
  supportLine:
    "Wenn die App dich getragen hat, kannst du sie ein wenig zurücktragen. Über Plus und Pro hinaus ist eine freiwillige Gabe stets willkommen und nie erforderlich.",
  supportCta: "Eine Kerze anzünden",
  supportFoot: "Völlig freiwillig. Einmal geben, oder gar nicht.",
};

export function getPremiumPlan(locale: string): PremiumPlanCopy {
  return locale === "de" ? PREMIUM_PLAN_DE : PREMIUM_PLAN_EN;
}
