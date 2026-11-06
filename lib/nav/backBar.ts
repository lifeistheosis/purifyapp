/**
 * Which native routes get a back button, and which must not.
 *
 * The rule lives here rather than in components/nav/NativeBackBar.tsx because
 * vitest.config.ts collects `lib/**` only, and this is the fragile half: a
 * hand-written list of routes that must stay in step with a tree of ninety-nine
 * pages. A rule guarded by nothing is a rule that rots. See
 * lib/nav/__tests__/backBar.test.ts, which walks the real app directory.
 *
 * Two kinds of screen must NOT get the bar.
 *
 * The five TAB ROOTS, because "back" from a tab root is meaningless: the tab
 * bar is already the way between them, and a chevron there invites the reader
 * to unwind out of the app.
 *
 * The routes that already show their OWN MobileTopBar, or the reader gets two
 * headers stacked: the pages that mount it directly, and the account routes
 * that inherit it from account/(signed)/layout.tsx. That second group is why
 * the test walks layout chains instead of reading page files. Nothing in
 * /account/profile's own page says it has a header.
 */

/**
 * Tab roots: the five tabs of components/nav/MobileTabBar.tsx, and
 * lib/nav/__tests__/backBar.test.ts reads that file to hold the two together.
 *
 * Nothing held them together before, and it showed. When the bar went from
 * six tabs to five on 2026-10-13 (Shop and Chat became tiles on Discover, You
 * came back as the fifth tab) this list was left as it was: /account, a tab
 * again, kept a chevron that led out of the app's own tab, and /shop and
 * /community, now tapped into from Discover, had none. Found the same day in
 * a picture of the You tab.
 *
 * /shop and /community MUST get the bar now: each is reached by tapping a
 * tile, and without one the reader is exactly as stranded as the report this
 * bar was built for described. /account must not: it is a tab's own screen.
 * (You wears the tab bar every tab wears, MobileHeader, which pins at the
 * top by itself and carries no chevron, so this bar has nothing to add there.)
 */
export const TAB_ROOTS: ReadonlySet<string> = new Set([
  "/",
  "/bible",
  "/discover",
  "/prayers",
  "/account",
]);

/**
 * Routes that already show a MobileTopBar and so bring their own chevron.
 * Kept in step with the tree by lib/nav/__tests__/backBar.test.ts.
 */
export const OWN_HEADER_PATTERNS: RegExp[] = [
  /^\/bible\/[^/]+\/[^/]+$/, // bible/[book]/[chapter]
  // saints/[slug] (1.7): the page's own bar, clear over the saint's picture
  // and solid with his name once it scrolls away, with the same way back.
  /^\/saints\/[^/]+$/,
  /^\/saints\/[^/]+\/[^/]+$/, // saints/[slug]/[work]
  // Start here and Your first Liturgy (1.7): phone pages with their own bar,
  // whose way back has a floor (Discover, and Start here).
  /^\/start$/,
  /^\/start\/first-liturgy$/,
  // The walkthroughs (1.7): phone pages with their own bar, whose way back
  // leads up, to Discover, to the walkthroughs, and from a chapter to its walk.
  /^\/walkthroughs$/,
  /^\/walkthroughs\/[^/]+$/,
  /^\/walkthroughs\/[^/]+\/[^/]+$/,
  // A doctrine's own page (1.8, round 3 r3-04): the bar starts clear over
  // the subject's icon and turns solid with the study's name, as a saint's
  // does, its way back leading to Theology. The doctrine index
  // (/theology/doctrine) and the Creed line by line (/theology/creed) are
  // pages of their own kinds, below.
  /^\/theology\/(?!(?:doctrine|creed)$)[^/]+$/,
  // The pages behind Theology's four buttons (1.9, build 89 note 2):
  // Doctrine, Topics, Heresies and Apologetics each wear their own bar,
  // whose title arrives once the page's heading has gone up under it, whose
  // way back leads to Theology and whose search opens turned to Theology
  // (components/theology/WayPage.tsx). Each wore this back bar, a chevron
  // with no name, until then.
  /^\/theology\/doctrine$/,
  /^\/topics$/,
  /^\/heresies$/,
  /^\/apologetics$/,
  // The pages those list, and the Creed line by line (1.9, his "everything
  // in 1.9" of 2026-11-10): a topic, a heresy and an answer each wear their
  // own bar too, the page's name once its heading has gone up under it, the
  // way back to its list and the search turned to Theology
  // (components/theology/LeafPage.tsx); the Creed's leads back to Theology.
  // These were the last of Theology to wear the back bar with no name.
  /^\/topics\/[^/]+$/,
  /^\/heresies\/[^/]+$/,
  /^\/apologetics\/[^/]+$/,
  /^\/theology\/creed$/,
  // Theology's hub, a step of its path and a study read part by part (1.8,
  // round 3 r3-13): phone pages with their own bar, whose search opens
  // turned to Theology. The hub leads back to Discover, a step to the hub
  // (its bar clear over the step's icon), a study's reading to the study.
  /^\/theology$/,
  /^\/theology\/path\/[^/]+$/,
  /^\/theology\/[^/]+\/read$/,
  // The pages under Prayers (1.7, the owner's note 16): every rule, the Hours,
  // the akathists, Learn to pray, Your rule and today's prayers are phone
  // pages with their own bar, which takes the page's name once its heading
  // has scrolled away and leads back up, to Prayers or to the page above.
  /^\/prayers\/[^/]+$/,
  /^\/prayers\/[^/]+\/[^/]+$/,
  // Your saved, the journal and the reading plans (1.7, the owner's notes 21
  // to 23): phone pages with their own bar, whose title arrives once the
  // page's heading has scrolled away. Saved leads back to You, the journal and
  // the plans to the Bible, a plan to the plans.
  /^\/saved$/,
  // The order gift (1.8, r3-39 C): purifyapp.net/gift, where the EIKON card's
  // QR lands. Its own bar starts clear over the card in the light and takes
  // the page's name once the ticket's heading has scrolled away.
  /^\/gift$/,
  /^\/journal$/,
  /^\/plans$/,
  /^\/plans\/[^/]+$/,
  // A Purify collection (1.7.1): a reading page with its own bar, back to the
  // reading room.
  // The reading room (fresh eyes M3, 1.9): its own bar, Back to Discover.
  /^\/reading$/,
  /^\/reading\/collections\/[^/]+$/,
  // Orthodox History (1.7, the owner's note 20): the timeline and each
  // event are phone pages with their own bar, so the apps show one bar and
  // not the back bar as well. The timeline's leads back to Discover, an
  // event's to the timeline.
  /^\/history$/,
  /^\/history\/[^/]+$/,
  // The calendar (1.7.1): a phone page with its own bar, whose way back
  // leads to Discover, where its tile is.
  /^\/calendar$/,
  /^\/privacy$/,
  /^\/terms$/,
  // Photo credits (1.9): reached from About, with its own bar as About's
  // other pages have.
  /^\/credits$/,
  // The GNU GPL beside the Almeida (1.9): its own bar, as the credits page has.
  /^\/credits\/gpl$/,
  /^\/settings$/,
  // The reading modes' own page (1.9): every palette on its shelf, opened
  // from Settings' Reading mode row, with its own bar and the way back to
  // Settings.
  /^\/settings\/reading-mode$/,
  // The rest of what is reached from You and its Settings (1.8): Purify's
  // rows (Support Purify and the FAQ it opens, What's new, About), Export
  // your library and Developer, and the Florilegium, Saved's first row. Each
  // wore this back bar, a chevron with no name, until 1.8; now each wears its
  // own bar, whose title arrives once the page's heading has gone up under it.
  /^\/about$/,
  /^\/support$/,
  /^\/faq$/,
  /^\/whats-new$/,
  /^\/florilegium$/,
  // A gathering and a starter's page (1.9, build 89 notes 6 and 12): each a
  // page of its own with its own bar, back to the Florilegium. A gathering's
  // address is florilegium/<id> on the website and florilegium/gathering in
  // the apps (lib/florilegium/href.ts); one pattern holds both.
  /^\/florilegium\/[^/]+$/,
  /^\/florilegium\/begin\/[^/]+$/,
  /^\/account\/(export|developer)$/,
  // The (signed) account group: the bar comes from the LAYOUT, not the pages,
  // which is why it cannot be spotted by reading page files. Its siblings
  // /account/developer and /account/export are outside the group and mount
  // their own (1.8, above), so the two lists say each route by name rather
  // than /account/*.
  /^\/account\/(data|eikon-box|notifications|profile|security|sessions)$/,
  // The Community profile editor sits inside the same group and its layout.
  /^\/account\/profile\/edit$/,
  // Reading paths and the Fathers on everyday struggles (1.8): phone pages
  // with their own bar. The paths and the struggles lead back to the reading
  // room, a path to the paths, a struggle to the struggles.
  /^\/reading\/paths$/,
  /^\/reading\/paths\/[^/]+$/,
  /^\/fathers-on$/,
  /^\/fathers-on\/[^/]+$/,
  // The Ecumenical Councils (1.8, the owner's pick of r3-03): the councils,
  // a council's page (its bar clear over its icon, as a saint's is) and a
  // document, which is a book in the room's reader; and the councils'
  // shelves in the reading room. The councils lead back to Discover, a
  // council to the councils, a document to its shelf, a shelf to its council.
  /^\/councils$/,
  /^\/councils\/[^/]+$/,
  /^\/councils\/[^/]+\/[^/]+$/,
  /^\/reading\/councils$/,
  /^\/reading\/councils\/[^/]+$/,
  // A chant's own page (1.8, sheet r3-18 B, the owner's pick of 2026-10-31):
  // its bar clear over the chant's icon, as a saint's is, with the way back
  // and Share, solid with the chant's name once the name has gone up under
  // it. It leads back to Chants. Not Chants itself, which keeps the back bar.
  /^\/chants\/[^/]+$/,
  // Prayer campaigns (1.9): the board, a campaign's own page (its bar
  // clear over its picture, as a saint's is, with the way back and the •••),
  // the reader's own campaigns and the rules. The board and a campaign lead
  // back to Pray together, the reader's own to You, the rules to the board.
  // Not Starting one (/campaigns/new), which holds the whole screen with its
  // own way out as making a post does, nor the old address /campaigns/[id],
  // which only sends a reader on to the campaign's page.
  /^\/campaigns$/,
  /^\/campaigns\/(detail|mine|rules)$/,
];

/**
 * How long to wait for the history traversal before giving up on it.
 *
 * This is a DEADLINE, not a delay: nothing waits on it in the normal case,
 * because the fallback is cancelled the instant popstate arrives. It is only
 * spent when the reader really was at the bottom of the stack, where the
 * alternative is a chevron that does nothing at all.
 *
 * Generous on purpose. A short deadline loses a race it must not lose: a
 * traversal delayed past it by a busy main thread would send the reader to
 * Today just as the page they asked for was arriving. Being slow in the rare
 * case is survivable; being wrong in the common one is not.
 */
export const BACK_FALLBACK_MS = 400;

/**
 * Where the back control should land, given whether the history stack moved.
 *
 * THE OBVIOUS CHECK IS WRONG, so this exists to stop it coming back.
 * `window.history.length > 1` looks like it answers "is there something behind
 * us", and it does not: it is the SIZE of the stack, never the POSITION in it,
 * and it never shrinks. Cold-start onto a deep-linked saint (length 1), tap
 * through to a writing (length 2), press back once (still 2, now at the
 * bottom), press back again: the length check passes, history.back() is a
 * no-op at index 0 of a Capacitor WebView, and the reader is left tapping a
 * dead chevron. That is precisely the complaint this bar was built to answer.
 *
 * So the caller does not predict, it observes: it listens for popstate, which
 * a same-document traversal always fires and a no-op at the bottom never does.
 *
 * Safe on the web by construction: NativeBackBar renders under NativeOnly, so
 * "home" can only ever mean Today inside the shell, never a navigation away
 * from someone's browser history.
 */
export function backOutcome(moved: boolean): "stay" | "home" {
  return moved ? "stay" : "home";
}

/**
 * True when NativeBackBar should render on this path.
 *
 * Also called by components/shop/ShopSubTabs.tsx, which has to pin itself
 * below the bar on exactly the routes that have one. Sharing the predicate is
 * what keeps the two from disagreeing about which routes those are.
 */
export function shouldShowBack(pathname: string): boolean {
  if (!pathname) return false;
  // Trailing slashes would otherwise make "/bible/" miss the tab-root check
  // and gain a chevron the real "/bible" does not have.
  const path = pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
  if (TAB_ROOTS.has(path)) return false;
  if (OWN_HEADER_PATTERNS.some((re) => re.test(path))) return false;
  return true;
}
