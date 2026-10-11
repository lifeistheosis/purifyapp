// Start here (/start): a short path for someone new to Orthodoxy.
//
// Many of Purify's readers are inquirers and catechumens (the Community's
// questions say so every week), and the app met them with a whole library
// and no first step. This is the first step, and the six after it.
//
// It adds nothing to read. Every step opens something the app already has:
// the first three lessons, a reading plan, the day's catechism, the
// calendar, the parish finder. So there is no new teaching here to be wrong
// about, only an order, and the order ends where it should: at a parish.
//
// The words for each step are catalog lines (lib/i18n/messages), so they
// follow the reader's language. They are about the faith, which makes them
// the owner's to approve; what ships on this branch is a draft.

export type StartStep = {
  id: string;
  /** Where the step leads. Always a screen the app has. */
  href: string;
  titleKey: string;
  bodyKey: string;
};

export const START_STEPS: readonly StartStep[] = [
  { id: "prayer", href: "/prayers/learning/what-is-prayer", titleKey: "start.step.prayer.title", bodyKey: "start.step.prayer.body" },
  { id: "cross", href: "/prayers/learning/sign-of-the-cross", titleKey: "start.step.cross.title", bodyKey: "start.step.cross.body" },
  { id: "morning", href: "/prayers/learning/morning-rule", titleKey: "start.step.morning.title", bodyKey: "start.step.morning.body" },
  { id: "gospel", href: "/plans/gospels", titleKey: "start.step.gospel.title", bodyKey: "start.step.gospel.body" },
  { id: "catechism", href: "/catechism", titleKey: "start.step.catechism.title", bodyKey: "start.step.catechism.body" },
  { id: "day", href: "/calendar", titleKey: "start.step.day.title", bodyKey: "start.step.day.body" },
  { id: "parish", href: "/parishes", titleKey: "start.step.parish.title", bodyKey: "start.step.parish.body" },
];
