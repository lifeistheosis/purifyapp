// The Plus features as the paywall shows them in depth (1.8). The owner's
// locked design for the Plus paywall, round 10 refined as R2 (2026-10-27,
// boards/purify-master/variants/10b-paywall.png): "kept by those it helps,
// then the features working, then the plans", the features going "as deep as
// you scroll, each with a small working picture".
//
// Every row is a feature a reader cannot have without Plus today, in the
// words the app already says it with, in all twenty-one languages: the name a
// screen gives it, and the line the upgrade sheet has said about it since the
// feature shipped (plus.<feature>.body). The list the paywall drew before was
// lib/premium/plans.ts, which is written in English and German only; these
// are the same features, and two it never named, Listen offline (1.8) and the
// Community profile's extras, with the new ambience under Ambience.
//
// `feature` is the name a lock opens the upgrade sheet with
// (components/billing/UpgradeModal.tsx, upgrade.open("offline")): that row
// leads the list, lit, and says what the sheet said for that lock before the
// redraw, its headline, what it does and what stays free beside it.
//
// Pure, so the tests can hold every key against every catalog.

/** The locks that open the sheet on one feature (UpgradeFeature less "general"). */
export type PlusLock =
  | "wordstudy"
  | "palettes"
  | "crossrefs"
  | "journal"
  | "offline"
  | "ambience"
  | "plans"
  | "remember"
  | "florilegium"
  | "sync"
  | "history"
  | "profile";

export type PlusRow = {
  /** The lock that opens the sheet on this feature, when one does. */
  feature: PlusLock | null;
  /** The feature's id: lib/premium/plans.ts's where it has one, and the mark it wears (components/premium/PremiumUI.tsx). */
  id: string;
  /**
   * Catalog key of the sheet's own headline for this lock ("Listening offline
   * is part of Purify Plus"), said in place of the name when a reader came
   * for it, so a lock still says why the sheet opened.
   */
  title: string | null;
  /** Catalog key of its name. */
  name: string;
  /** Catalog key of what it does. */
  body: string;
  /** Catalog key of what stays free beside it, said when a reader came for it. */
  keep: string | null;
};

/**
 * In the order the owner's mockup begins (Word study, Candlelight and
 * Monastery, Cross-references, Your journal), then what 1.8 added, then the
 * rest of the Plus list.
 */
export const PLUS_ROWS: readonly PlusRow[] = [
  { feature: "wordstudy", id: "word-study", title: "plus.wordstudy.title", name: "bible.wordStudyTitle", body: "plus.wordstudy.body", keep: "plus.wordstudy.keep" },
  { feature: "palettes", id: "reading-modes", title: "plus.palettes.title", name: "plus.active.modes", body: "plus.palettes.body", keep: "plus.palettes.keep" },
  { feature: "crossrefs", id: "cross-refs", title: "plus.crossrefs.title", name: "bible.crossRefs", body: "plus.crossrefs.body", keep: "plus.crossrefs.keep" },
  { feature: "journal", id: "journal", title: "plus.journal.title", name: "plus.active.journal", body: "plus.journal.body", keep: "plus.journal.keep" },
  { feature: "offline", id: "offline", title: "plus.offline.title", name: "plus.offline.name", body: "plus.offline.body", keep: "plus.offline.keep" },
  { feature: "ambience", id: "ambience", title: "plus.ambience.title", name: "ambience.title", body: "plus.ambience.body", keep: "plus.ambience.keep" },
  { feature: "plans", id: "plans", title: "plus.plans.title", name: "plus.active.plans", body: "plus.plans.body", keep: "plus.plans.keep" },
  { feature: "remember", id: "remember", title: "plus.remember.title", name: "remember.title", body: "plus.remember.body", keep: "plus.remember.keep" },
  { feature: "florilegium", id: "florilegium", title: "plus.florilegium.title", name: "plus.active.florilegium", body: "plus.florilegium.body", keep: "plus.florilegium.keep" },
  { feature: "sync", id: "sync", title: "plus.sync.title", name: "ui.yourReadingOnEveryDevice", body: "plus.sync.body", keep: "plus.sync.keep" },
  { feature: "history", id: "immersive-history", title: "plus.history.title", name: "plus.history.title", body: "plus.history.body", keep: "plus.history.keep" },
  { feature: "profile", id: "profile", title: "plus.profile.title", name: "profile.plusNudgeTitle", body: "plus.profile.body", keep: "plus.profile.keep" },
  { feature: null, id: "supporter-mark", title: null, name: "plus.mark.name", body: "settings.showSupporterMarkHint", keep: null },
  { feature: null, id: "discord-frames", title: null, name: "settings.discord", body: "settings.discordModeHint.plus", keep: null },
];

/** The rows with the one a reader came for first. Any other lock, or none, keeps the order. */
export function plusRowsLedBy(lead: string | null | undefined): readonly PlusRow[] {
  const at = lead ? PLUS_ROWS.findIndex((r) => r.feature === lead) : -1;
  if (at <= 0) return PLUS_ROWS;
  return [PLUS_ROWS[at], ...PLUS_ROWS.slice(0, at), ...PLUS_ROWS.slice(at + 1)];
}

/** Is this the name of a lock with a row of its own? */
export function isPlusLock(name: string | null | undefined): name is PlusLock {
  return PLUS_ROWS.some((r) => r.feature !== null && r.feature === name);
}

// ── Pro ──────────────────────────────────────────────────────────────────
//
// What Pro adds, on the Pro side of the apps' screen and of the website's
// /pricing (components/billing/PlusPaywall.tsx, ProRows). Until the owner's
// second round of 1.8 these rows came from lib/premium/plans.ts, which is
// written in English and German only, so a reader in Athens met them in
// English. They are in all twenty-one catalogs now, the English letter for
// letter the plan's own (lib/premium/__tests__/paywallPlus2.test.ts holds the
// two together), and so are the EIKON Box's terms that stand under them.

export type ProRow = {
  /** The feature's id in lib/premium/plans.ts, and the mark it wears. */
  id: string;
  /** Catalog key of its name. */
  name: string;
  /** Catalog key of what it is. */
  body: string;
  /** Promised and not yet live: it wears the coming-soon pill. */
  soon?: boolean;
};

/** In the plan's own order. Every unmarked row is a live Pro entitlement. */
export const PRO_ROWS: readonly ProRow[] = [
  { id: "everything-plus", name: "plus.pro.everything.name", body: "plus.pro.everything.body" },
  { id: "studio-audio", name: "plus.pro.studioAudio.name", body: "plus.pro.studioAudio.body", soon: true },
  { id: "eikon-box", name: "plus.pro.eikonBox.name", body: "plus.pro.eikonBox.body" },
  { id: "eikon-benefits", name: "plus.pro.eikonBenefits.name", body: "plus.pro.eikonBenefits.body" },
];

/** Catalog key of the EIKON Box's terms, said under the Pro rows wherever they stand. */
export const PRO_TERMS = "plus.pro.boxTerms";

/** Catalog key of the coming-soon pill: the app's own word for it. */
export const SOON_LABEL = "signin.comingSoon";
