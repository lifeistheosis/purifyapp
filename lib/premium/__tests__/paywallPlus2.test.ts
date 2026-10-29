// Purify Plus, the owner's second round of 1.8 (2026-10-28: "add every single
// thing we left out"), on the paywall he locked as R2 the day before:
//
//   1. the button is his pick B, "Start 7 days free", when the store grants
//      this reader a trial, in the trial's own length and the reader's
//      language; with no trial it says "Join Plus";
//   2. "Renews automatically until you cancel" in the small print of every
//      place that sells: the sheet, the apps' screen and the website;
//   3. two or three of the stores' own reviews, word for word, after the
//      features and before the plans;
//   4. the website's /pricing drawn as R2, with its legal lines, Pro and the
//      EIKON Box's terms;
//   5. every line of the apps' screen and the Pro rows in all 21 languages.
//
// What a reader would notice if this broke: a trial promised that the store
// did not grant, a number in the button that is not the store's, a plan that
// renews without saying so, a review someone did not write or words changed
// in one, or English in the middle of a screen in their own language.

import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlansDock, PlusReviews, type BuyPlace } from "@/components/billing/KeptPaywall";
import { BilledLine, PaywallReadyView, PlusOwnedFoot, ProOwnedFoot, SignedOutFoot } from "@/components/billing/PlusPaywall";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { STORE_NAME } from "@/components/marketing/storeBits";
import type { PlusOffers } from "@/lib/billing/offers";
import { getMessages } from "@/lib/i18n";
import { resolvePluralKey } from "@/lib/i18n/plural";
import type { LocaleCode } from "@/lib/i18n/locales";
import { APP_REVIEWS_DEFAULT } from "@/lib/marketing/storeRatings";
import { PAYWALL_REVIEW_COUNT, paywallReviews } from "@/lib/premium/paywallReviews";
import { PREMIUM_PLAN_DE, PREMIUM_PLAN_EN } from "@/lib/premium/plans";
import { PRO_ROWS, PRO_TERMS, SOON_LABEL } from "@/lib/premium/plusRows";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const code = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/** Source with its comments taken out: a comment may say what the code may not. */
const bare = (p: string) =>
  code(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const MESSAGES = path.join(ROOT, "lib/i18n/messages");
const CATALOGS = Object.fromEntries(
  fs
    .readdirSync(MESSAGES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(MESSAGES, f), "utf8")) as Record<string, string>]),
);
const EN = CATALOGS.en;

/** What React writes for a piece of text. */
const html = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

type ProviderProps = Parameters<typeof MessagesProvider>[0];
function render(node: ReactElement, lang = "en"): string {
  return renderToString(createElement(MessagesProvider, { locale: lang, messages: getMessages(lang) } as ProviderProps, node));
}
/** A catalog line with its places filled, as t() fills them. */
function say(lang: string, key: string, fill: Record<string, string> = {}): string {
  const m = getMessages(lang);
  return Object.entries(fill).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), m[key] ?? key);
}
/** "7 days" as the app counts days in a language. */
function days(lang: string, n: number): string {
  return resolvePluralKey(getMessages(lang), "plans.days", n, lang as LocaleCode).split("{count}").join(String(n));
}

/** The words this round added, every one in every language. */
const NEW_KEYS = [
  "plus.cta.trial",
  "plus.cta.join",
  "plus.cta.joinPro",
  "plus.fine.renews",
  "plus.screen.signedOut",
  "plus.screen.signIn",
  "plus.screen.billedApple",
  "plus.screen.billedGoogle",
  "plus.screen.unavailable",
  "plus.screen.proTitle",
  "plus.screen.proBody",
  "plus.screen.plusTitle",
  "plus.screen.plusBody",
  "plus.screen.tierUnavailable",
  "plus.screen.bothApple",
  "plus.screen.bothGoogle",
  "plus.screen.bothWeb",
  "plus.screen.restoreError",
  "plus.web.getOnPlay",
  "plus.promise.supporters",
  ...PRO_ROWS.flatMap((r) => [r.name, r.body]),
  PRO_TERMS,
];

// Stand-in figures, as the store would hand them over. Not prices: the
// paywall's code may hold none, and these never reach it but through props.
const P = { year: "Y-PRICE", yearMonth: "Y-MONTH", month: "M-PRICE" };
const WITH_TRIAL: PlusOffers = {
  yearly: { price: P.year, amount: 10, perMonth: P.yearMonth, trial: { unit: "day", count: 7 } },
  monthly: { price: P.month, amount: 2, perMonth: null, trial: null },
};
const NO_TRIAL: PlusOffers = {
  yearly: { price: P.year, amount: 10, perMonth: P.yearMonth, trial: null },
  monthly: { price: P.month, amount: 2, perMonth: null, trial: null },
};

function dock(props: Partial<Parameters<typeof PlansDock>[0]> & { place: BuyPlace }, lang = "en"): string {
  return render(
    createElement(PlansDock, { offers: WITH_TRIAL, plan: "yearly", onPlan: () => {}, busy: null, onBuy: () => {}, ...props }),
    lang,
  );
}
/** The text of the action, whether it buys here (a button) or leads on (a link). */
function action(out: string): string {
  const m = /class="[^"]*min-h-\[50px\][^"]*"[^>]*>([^<]*)<\/(?:button|a)>/.exec(out);
  return m?.[1] ?? "";
}

describe("the button: his pick B", () => {
  it("says the store's own trial when it grants this reader one", () => {
    for (const lang of ["en", "el", "ru", "ar", "de"]) {
      const out = dock({ place: "store" }, lang);
      expect(action(out), lang).toBe(html(say(lang, "plus.cta.trial", { trial: days(lang, 7) })));
    }
    expect(action(dock({ place: "store" }))).toBe("Start 7 days free");
  });

  it("says the trial's own length, whatever the store gives", () => {
    const fortnight: PlusOffers = { ...WITH_TRIAL, yearly: { ...WITH_TRIAL.yearly!, trial: { unit: "day", count: 14 } } };
    expect(action(dock({ place: "web", offers: fortnight }))).toBe("Start 14 days free");
    const month: PlusOffers = { ...WITH_TRIAL, yearly: { ...WITH_TRIAL.yearly!, trial: { unit: "month", count: 1 } } };
    expect(action(dock({ place: "web", offers: month }))).toBe("Start 1 month free");
  });

  it("says Join Plus when the plan chosen has no trial, or no trial was granted", () => {
    expect(action(dock({ place: "store", plan: "monthly" }))).toBe("Join Plus");
    expect(action(dock({ place: "store", offers: NO_TRIAL }))).toBe("Join Plus");
    expect(action(dock({ place: "web", offers: NO_TRIAL, tier: "pro" }))).toBe("Join Pro");
    for (const lang of ["el", "fr", "ka"]) {
      expect(action(dock({ place: "store", offers: NO_TRIAL }, lang)), lang).toBe(html(say(lang, "plus.cta.join")));
    }
  });

  it("says Join Plus where no price was given at all, and leads to /pricing", () => {
    const out = dock({ place: "store", offers: null, href: "/pricing" });
    expect(action(out)).toBe("Join Plus");
    expect(out).toContain('href="/pricing"');
  });

  it("holds no number of its own: the length is the store's, in the catalog only a place to fill", () => {
    for (const key of ["plus.cta.trial", "plus.cta.join", "plus.cta.joinPro"]) expect(EN[key], key).not.toMatch(/\d/);
    for (const [lang, m] of Object.entries(CATALOGS)) expect(m["plus.cta.trial"], lang).toContain("{trial}");
    const kept = bare("components/billing/KeptPaywall.tsx");
    expect(kept).toContain('trial ? t("plus.cta.trial", { trial })');
    expect(kept).toContain("chosen?.trial ? trialWords(chosen.trial, tn, locale) : null");
    // The old words, A on his sheet 3, are gone from the code and the catalogs.
    expect(kept).not.toMatch(/"plus\.join(Pro)?"/);
    for (const m of Object.values(CATALOGS)) expect(m["plus.join"]).toBeUndefined();
  });
});

describe("renews automatically until you cancel", () => {
  const renews = (lang: string) => html(say(lang, "plus.fine.renews"));

  it("stands in the held plans wherever they sell, before the words for cancelling", () => {
    for (const lang of ["en", "el", "ar"]) {
      for (const place of ["store", "web"] as const) {
        const out = dock({ place }, lang);
        const cancel = html(say(lang, place === "store" ? "plus.billedThroughStore" : "plus.billedOnWeb"));
        const terms = html(say(lang, "plus.fine.trialYear", { trial: days(lang, 7), price: P.year }));
        expect(out, `${lang} ${place}`).toContain(`${terms} ${renews(lang)} ${cancel}`);
      }
    }
    // In the apps the store's small print stands even before a price has come.
    expect(dock({ place: "store", offers: null, href: "/pricing" })).toContain(renews("en"));
  });

  it("stands in the sheet, on the apps' screen and on the website", () => {
    // The sheet and both screens sell only through the held plans...
    expect(bare("components/billing/UpgradeModal.tsx")).toMatch(/<PlansDock\s/);
    expect(bare("components/billing/PlusPaywall.tsx")).toMatch(/<PlansDock\s/);
    expect(bare("components/billing/WebPaywall.tsx")).toMatch(/<ReadyBottom\s+place="web"/);
    // ...and where nothing is priced yet, signed out, the line is said too.
    expect(render(createElement(SignedOutFoot, { place: "store" }))).toContain(`${renews("en")} ${html(EN["plus.screen.billedGoogle"])}`);
    expect(render(createElement(SignedOutFoot, { place: "web" }))).toContain(`${renews("en")} ${html(EN["plus.billedOnWeb"])}`);
    expect(render(createElement(BilledLine, { place: "store" }), "uk")).toContain(renews("uk"));
    expect(bare("components/billing/WebPaywall.tsx")).toContain('<SignedOutFoot place="web" />');
    expect(bare("components/billing/PlusPaywall.tsx")).toContain('<SignedOutFoot place="store" />');
  });

  it("is in every catalog, in the reader's language", () => {
    for (const [lang, m] of Object.entries(CATALOGS)) {
      expect(m["plus.fine.renews"]?.trim(), lang).toBeTruthy();
      if (lang !== "en") expect(m["plus.fine.renews"], lang).not.toBe(EN["plus.fine.renews"]);
    }
  });
});

describe("the stores' own reviews", () => {
  const shown = paywallReviews();

  it("are two or three, from the list as it stands, in its order, chosen as shown", () => {
    expect(PAYWALL_REVIEW_COUNT).toBeGreaterThanOrEqual(2);
    expect(PAYWALL_REVIEW_COUNT).toBeLessThanOrEqual(3);
    expect(shown.length).toBeGreaterThanOrEqual(2);
    expect(shown.length).toBeLessThanOrEqual(3);
    // The very entries of the list, not copies that could drift from it.
    for (const r of shown) {
      expect(APP_REVIEWS_DEFAULT, r.id).toContain(r);
      expect(r.shown, r.id).toBe(true);
    }
    expect(shown).toEqual(APP_REVIEWS_DEFAULT.filter((r) => r.shown).slice(0, shown.length));
  });

  it("are drawn in exactly the list's words, names and stores, in every language", () => {
    for (const lang of ["en", "el", "ar", "ru"]) {
      const out = render(createElement(PlusReviews), lang);
      const quotes = [...out.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)].map((m) => m[1]);
      expect(quotes, lang).toEqual(shown.map((r) => `“${html(r.quote)}”`));
      for (const r of shown) {
        expect(out, `${lang} ${r.id}`).toContain(`data-plus-review="${r.id}"`);
        expect(out, `${lang} ${r.id}`).toContain(`>${html(r.name)}</span>`);
        expect(out, `${lang} ${r.id}`).toContain(STORE_NAME[r.store]);
        expect(out, `${lang} ${r.id}`).toContain(`aria-label="${html(say(lang, "home.apps.outOfFive", { rating: r.stars.toFixed(1) }))}"`);
      }
      // A quotation in English stays English, marked so, left to right.
      expect((out.match(/<blockquote lang="en"/g) ?? []).length, lang).toBe(shown.length);
      expect((out.match(/<figure dir="ltr">/g) ?? []).length, lang).toBe(shown.length);
      expect(out, lang).toContain(html(say(lang, "home.reviews.title")));
    }
  });

  it("are never written into the paywall's own code", () => {
    for (const file of [
      "components/billing/KeptPaywall.tsx",
      "components/billing/UpgradeModal.tsx",
      "components/billing/PlusPaywall.tsx",
      "components/billing/WebPaywall.tsx",
      "lib/premium/paywallReviews.ts",
    ]) {
      const src = code(file);
      for (const r of APP_REVIEWS_DEFAULT) {
        expect(src, `${file} ${r.id}`).not.toContain(r.quote.slice(0, 40));
        expect(src, `${file} ${r.id}`).not.toContain(`"${r.name}"`);
      }
    }
    expect(bare("components/billing/KeptPaywall.tsx")).toContain("const reviews = paywallReviews();");
  });

  it("stand after the features and before the plans, wherever the paywall stands", () => {
    const sheet = bare("components/billing/UpgradeModal.tsx");
    const order = ["<PlusFeatureRows", "<PlusReviews", "<PlansDock"].map((s) => sheet.indexOf(s));
    expect(order.every((n) => n > 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));

    for (const place of ["store", "web"] as const) {
      const out = render(
        createElement(PaywallReadyView, {
          place,
          tier: "plus",
          onTier: () => {},
          offers: WITH_TRIAL,
          selected: "yearly",
          onSelect: () => {},
          plusOwned: false,
          busy: null,
          note: null,
          onSubscribe: () => {},
          onRestore: place === "store" ? () => {} : undefined,
          onManage: () => {},
        }),
      );
      const at = ["data-plus-feature=", "data-plus-reviews=", "data-plans-dock="].map((s) => out.indexOf(s));
      expect(at.every((n) => n > 0), place).toBe(true);
      expect(at, place).toEqual([...at].sort((a, b) => a - b));
    }
  });
});

describe("the website's /pricing, as R2", () => {
  const page = bare("app/(app)/pricing/page.tsx");
  const web = bare("components/billing/WebPaywall.tsx");

  function webScreen(tier: "plus" | "pro", lang = "en", offers: PlusOffers = WITH_TRIAL, plusOwned = false) {
    return render(
      createElement(PaywallReadyView, {
        place: "web",
        tier,
        onTier: () => {},
        offers,
        selected: "yearly",
        onSelect: () => {},
        plusOwned,
        busy: null,
        note: null,
        onSubscribe: () => {},
        onManage: () => {},
      }),
      lang,
    );
  }

  it("is the same screen as the apps': the website draws WebPaywall, the apps PlusPaywall", () => {
    expect(page).toMatch(/<WebOnly>\s*<WebPaywall \/>\s*<\/WebOnly>/);
    expect(page).toContain("<PlusPaywall />");
    expect(web).toContain('<TierScreen tier={tier} onTier={onTier} place="web">');
    // The words are looked up on the device, never baked in by the server.
    expect(page).not.toMatch(/getMessages|getServerLocale|\bt\(m,/);
    // Nothing the old page held a price in is left to hold one.
    expect(page).not.toMatch(/PREMIUM_PLAN_EN|PREMIUM_PLAN_DE|plusPrice|proPrice/);
    expect(fs.existsSync(path.join(ROOT, "components/billing/WebPlusCheckout.tsx"))).toBe(false);
  });

  it("sells at the website's own Stripe prices, from its checkout, and no other", () => {
    expect(web).toContain("webOffer(pkgs.yearly, true)");
    expect(web).toContain("webOffer(pkgs.monthly, false)");
    expect(web).toContain("getWebPlusPackages(user.id)");
    expect(web).toContain("getWebProPackages(user.id)");
    // The plan the reader chose, and only that one.
    expect(web).toContain('const pkg = selected === "yearly" ? pkgs.yearly : pkgs.monthly;');
    expect(web).toContain("purchaseWebPlus(userId, pkg)");
    // F-13: the account from the local session, never a network getUser().
    expect(web).toContain("readLocalSessionUser()");
    expect(web).not.toMatch(/auth\.getUser\(/);
    for (const file of ["components/billing/WebPaywall.tsx", "app/(app)/pricing/page.tsx", "lib/premium/paywallReviews.ts"]) {
      const src = bare(file);
      expect(src, file).not.toMatch(/[$€£]\s?\d/);
      expect(src, file).not.toMatch(/71[.,]99|9[.,]99|6[.,]00|19[.,]99|\b199\b/);
    }
  });

  it("keeps its legal lines: the terms in the checkout's price, the renewal, who bills, Terms and Privacy", () => {
    const out = webScreen("plus");
    expect(out).toContain(html(say("en", "plus.fine.trialYear", { trial: days("en", 7), price: P.year })));
    expect(out).toContain(html(EN["plus.fine.renews"]));
    expect(out).toContain(html(EN["plus.billedOnWeb"]));
    expect(out).toContain('href="/terms"');
    expect(out).toContain('href="/privacy"');
    // The website cannot restore a store purchase: no such button there.
    expect(out).not.toContain(html(EN["plus.restore"]));
  });

  it("keeps the promise to the supporters before launch, under Plus, in the reader's language", () => {
    for (const lang of ["en", "de", "el"]) expect(webScreen("plus", lang), lang).toContain(html(say(lang, "plus.promise.supporters")));
    expect(EN["plus.promise.supporters"]).toBe(PREMIUM_PLAN_EN.plusPromise);
    expect(CATALOGS.de["plus.promise.supporters"]).toBe(PREMIUM_PLAN_DE.plusPromise);
    // The apps never carried it, and the design does not add it there.
    const apps = render(
      createElement(PaywallReadyView, {
        place: "store",
        tier: "plus",
        onTier: () => {},
        offers: WITH_TRIAL,
        selected: "yearly",
        onSelect: () => {},
        plusOwned: false,
        busy: null,
        note: null,
        onSubscribe: () => {},
        onRestore: () => {},
        onManage: () => {},
      }),
    );
    expect(apps).not.toContain(html(EN["plus.promise.supporters"]));
  });

  it("keeps Pro, and the EIKON Box's terms under it", () => {
    for (const lang of ["en", "fr", "ur"]) {
      const out = webScreen("pro", lang);
      for (const row of PRO_ROWS) {
        expect(out, `${lang} ${row.id}`).toContain(html(say(lang, row.name)));
        expect(out, `${lang} ${row.id}`).toContain(html(say(lang, row.body)));
      }
      expect(out, lang).toContain(html(say(lang, PRO_TERMS)));
      expect(out, lang).toContain(html(say(lang, SOON_LABEL)));
      expect(out, lang).toContain(html(say(lang, "plus.cta.trial", { trial: days(lang, 7) })));
    }
  });

  it("never sells what a reader already holds, however it was bought, and shows the way to manage it", () => {
    // The entitlement row (a grant, Google Play, a gift) as well as the checkout.
    expect(web).toContain("const held = usePremiumTier();");
    expect(web).toContain('const ownsPro = phase === "subscribed" || held === "pro";');
    expect(web).toContain('const ownsPlus = ownsPro || active === "plus" || held === "plus";');
    expect(web).toContain("<ProOwnedFoot onManage={onManage} />");
    expect(web).toContain("<PlusOwnedFoot onManage={onManage} busy={busy} />");
    // On a first visit the row is given a moment before any plan is shown.
    expect(web).toContain('phase === "ready" && held === "loading" && heldGrace');
    // The Terms name the manage-subscription link on the pricing page as the
    // way to cancel a subscription bought on the web.
    expect(code("app/(app)/terms/page.tsx")).toContain("manage-subscription link on the");
    expect(web).toContain("webManagementURL(user.id)");
    expect(web).toContain('router.push("/account")');
    const owned = render(createElement(PlusOwnedFoot, { onManage: () => {}, busy: null }));
    expect(owned).toContain(html(EN["ui.manageSubscription"]));
    expect(owned).not.toContain(html(EN["plus.restore"]));
    expect(render(createElement(ProOwnedFoot, { onManage: () => {} }))).toContain(html(EN["ui.manageSubscription"]));
  });

  it("where the website cannot sell, says where Plus is bought", () => {
    expect(web).toContain("href={PLAY_STORE_URL}");
    expect(web).toContain('t("plus.web.getOnPlay"');
    expect(EN["plus.web.getOnPlay"]).toContain("{tier}");
  });
});

describe("the apps' screen and the Pro rows, in every language", () => {
  it("say nothing in English that the catalogs do not hold", () => {
    const screen = bare("components/billing/PlusPaywall.tsx");
    for (const english of [
      "Sign in to continue",
      "tied to your account",
      "available to purchase",
      "You have Purify",
      "keeping the lamps lit",
      "Manage subscription",
      "billed for both",
      "Couldn’t check",
      "Billed through",
      "the App Store",
    ]) {
      expect(screen, english).not.toContain(english);
    }
    // The Pro rows from the catalogs, never from the English-and-German plan.
    expect(screen).not.toMatch(/getPremiumPlan|PREMIUM_PLAN_EN|PREMIUM_PLAN_DE|plan\.proItems|plan\.proNote/);
    expect(screen).toContain("PRO_ROWS.map");
    expect(screen).toContain("t(PRO_TERMS)");
  });

  it("draw the states around the ready one in the reader's language", () => {
    for (const lang of ["el", "ka", "pt"]) {
      const out = [
        render(createElement(SignedOutFoot, { place: "store" }), lang),
        render(createElement(ProOwnedFoot, { onManage: () => {} }), lang),
        render(createElement(PlusOwnedFoot, { onManage: () => {}, onRestore: () => {}, busy: null }), lang),
      ].join("");
      for (const key of [
        "plus.screen.signedOut",
        "plus.screen.signIn",
        "plus.screen.billedGoogle",
        "plus.screen.proTitle",
        "plus.screen.proBody",
        "plus.screen.plusTitle",
        "plus.screen.plusBody",
        "ui.manageSubscription",
        "plus.restore",
      ]) {
        expect(out, `${lang} ${key}`).toContain(html(say(lang, key)));
      }
      expect(out, lang).not.toMatch(/plus\.screen\.[a-zA-Z]/);
    }
  });

  it("are the plan's own rows, in its order, its English and German letter for letter", () => {
    expect(PRO_ROWS.map((r) => r.id)).toEqual(PREMIUM_PLAN_EN.proItems.map((i) => i.id));
    expect(PRO_ROWS.map((r) => Boolean(r.soon))).toEqual(PREMIUM_PLAN_EN.proItems.map((i) => Boolean(i.soon)));
    for (const [lang, plan] of [
      ["en", PREMIUM_PLAN_EN],
      ["de", PREMIUM_PLAN_DE],
    ] as const) {
      const m = CATALOGS[lang];
      PRO_ROWS.forEach((row, i) => {
        expect(m[row.name], `${lang} ${row.id}`).toBe(plan.proItems[i].title);
        expect(m[row.body], `${lang} ${row.id}`).toBe(plan.proItems[i].sub);
      });
      expect(m[PRO_TERMS], lang).toBe(plan.proNote);
    }
    expect(EN[SOON_LABEL]).toBe(PREMIUM_PLAN_EN.soonLabel);
    // The EIKON Box still promises no specific item, in English as written.
    expect(EN[PRO_TERMS].toLowerCase()).toContain("no specific item");
  });

  it("hold every new line in all twenty-one catalogs, translated, never the English copied", () => {
    expect(Object.keys(CATALOGS)).toHaveLength(21);
    for (const key of NEW_KEYS) {
      expect(EN[key]?.trim(), key).toBeTruthy();
      for (const [lang, m] of Object.entries(CATALOGS)) {
        if (lang === "en") continue;
        expect(m[key]?.trim(), `${lang} ${key}`).toBeTruthy();
        expect(m[key], `${lang} ${key} is the English`).not.toBe(EN[key]);
      }
    }
  });
});
