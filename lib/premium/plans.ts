// The Purify premium plan, single-sourced.
//
// Standard / Plus / Pro tier content, prices, the opening offer, and the
// freewill-gift copy live here so the checkout page (/pricing) and the
// marketing showcase (/premium) can never drift on what a tier costs or
// includes. Prices and subscription terms are a release stop-condition:
// change them deliberately, in one place, EN and DE together.

// Numeric plan prices in cents, the single source for any MATH (the copy
// strings above are localized and cannot be parsed). Used by the admin
// revenue/subscriptions estimate (lib/premium/mrr.ts). These MIRROR the
// display strings; changing a real price is still a release stop-condition.
export const PLAN_PRICE_CENTS = {
  plusMonthly: 999,
  plusYearly: 9900,
  proMonthly: 1999,
  proYearly: 19900,
} as const;

export type PlanFeature = { title: string; sub: string };

export type PremiumPlanCopy = {
  // Standard, the always-free tier.
  freeTitle: string;
  freeItems: string[];
  freeFoot: string;
  // The opening-drop line shown under the paid prices.
  openingOffer: string;
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
    "Every saint’s life, and the primary writings of the Fathers",
    "The Scriptures, with the Greek beside them",
    "The daily prayers, the hours, and the akathists",
    "The whole Church calendar, its fasts, and the fasting tracker",
    "Prayer Campaigns and the Trapeza recipe board",
  ],
  freeFoot: "No ads. No tracking. No surprise locks. For anyone who needs it.",
  openingOffer:
    "Opening offer: 50% off your first year. It renews after at the standard price. Cancel anytime.",
  plusTitle: "Purify Plus",
  plusLede:
    "An optional subscription that carries the gathered reading layer across every device you sign in on.",
  plusItems: [
    { title: "Cross-device sync", sub: "Your library on every device you sign in on" },
    { title: "Notes, highlights & bookmarks", sub: "Kept private, carried everywhere" },
    { title: "Custom collections & Florilegium", sub: "Build your own quote collections" },
    { title: "Immersive History", sub: "The story of the Church in full cinematic dress" },
    { title: "Free EIKON shop shipping", sub: "On every order while your subscription is active" },
  ],
  plusPriceMonthly: "$9.99 / month",
  plusPriceYearly: "$99 / year",
  plusPromise:
    "A promise already made stays made: pre-launch supporters keep lifetime cross-device sync, no subscription required. That promise covers sync itself; the wider Plus tools belong to the subscription.",
  proTitle: "Purify Pro",
  proLede:
    "Everything in Plus, and a members’ layer for those who want to keep the lamps lit and carry a little of the Church home each month.",
  proItems: [
    { title: "Everything in Purify Plus", sub: "All of it, uncapped" },
    { title: "A devotional icon, mailed monthly", sub: "A small blessing to your door, every month" },
    { title: "EIKON shop discount codes", sub: "Members’ codes for the shop, now and then" },
    { title: "Free EIKON shipping", sub: "Carried over from Plus" },
  ],
  proPriceMonthly: "$19.99 / month",
  proPriceYearly: "$199 / year",
  proNote:
    "The monthly item may vary and is sent while your subscription is active and a shipping address is on file.",
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
    "Jedes Leben eines Heiligen und die wichtigsten Schriften der Väter",
    "Die Schriften, mit dem Griechischen daneben",
    "Die täglichen Gebete, die Horen und die Akathiste",
    "Der ganze Kirchenkalender, seine Fasten und der Fastentracker",
    "Gebetskampagnen und das Trapeza-Rezeptboard",
  ],
  freeFoot:
    "Keine Werbung. Keine Verfolgung. Keine überraschenden Sperren. Für jeden, der sie braucht.",
  openingOffer:
    "Eröffnungsangebot: 50% Rabatt im ersten Jahr. Danach Verlängerung zum Standardpreis. Jederzeit kündbar.",
  plusTitle: "Purify Plus",
  plusLede:
    "Ein freiwilliges Abonnement, das die gesammelte Leseschicht auf jedes Gerät trägt, auf dem du dich anmeldest.",
  plusItems: [
    { title: "Geräteübergreifende Synchronisierung", sub: "Deine Bibliothek auf jedem Gerät, auf dem du dich anmeldest" },
    { title: "Notizen, Markierungen & Lesezeichen", sub: "Privat gehalten, überallhin getragen" },
    { title: "Eigene Sammlungen & Florilegium", sub: "Erstelle deine eigenen Zitatsammlungen" },
    { title: "Immersive Kirchengeschichte", sub: "Die Geschichte der Kirche in vollem filmischem Gewand" },
    { title: "Kostenloser EIKON-Versand", sub: "Bei jeder Bestellung, solange dein Abonnement aktiv ist" },
  ],
  plusPriceMonthly: "9,99 $ / Monat",
  plusPriceYearly: "99 $ / Jahr",
  plusPromise:
    "Ein gegebenes Versprechen bleibt bestehen: Unterstützer aus der Zeit vor dem Start behalten die geräteübergreifende Synchronisierung auf Lebenszeit, ohne Abonnement. Dieses Versprechen gilt der Synchronisierung selbst; die weiteren Plus-Werkzeuge gehören zum Abonnement.",
  proTitle: "Purify Pro",
  proLede:
    "Alles aus Plus und eine Mitglieder-Ebene für alle, die die Lampen am Brennen halten und jeden Monat ein wenig der Kirche nach Hause tragen möchten.",
  proItems: [
    { title: "Alles aus Purify Plus", sub: "Alles, ohne Begrenzung" },
    { title: "Eine Ikone, monatlich per Post", sub: "Jeden Monat ein kleiner Segen an deine Tür" },
    { title: "EIKON-Rabattcodes", sub: "Mitglieder-Codes für den Shop, ab und zu" },
    { title: "Kostenloser EIKON-Versand", sub: "Aus Plus übernommen" },
  ],
  proPriceMonthly: "19,99 $ / Monat",
  proPriceYearly: "199 $ / Jahr",
  proNote:
    "Der monatliche Artikel kann variieren und wird versandt, solange dein Abonnement aktiv ist und eine Lieferadresse hinterlegt ist.",
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
