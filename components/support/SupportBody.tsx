import Link from "next/link";

import { T } from "@/components/i18n/T";

/**
 * Support this work (1.9, his words of 2026-11-11: "explain how and where the
 * profits would go ... sourcing products, tithing to the church, running
 * maintenance, etc., and that they could support through either the
 * subscription or buying a product from the store").
 *
 * One page, the same in the apps and on the website: where what Purify earns
 * goes, the two ways to help (Purify Plus, or something from the EIKON shop),
 * the free core, and a way to write. It replaced a page that asked for
 * donations through Buy Me a Coffee on the website and said, in the apps,
 * that nothing was locked behind a payment, which stopped being true with
 * Plus. Every word is the catalog's, so every reader reads their own
 * language, the German as well (it was written into this file until now).
 *
 * The giving to the Church is Purify's own, from what it earns: never tied
 * to a reader's purchase, never called a donation or charity (a store does
 * not let an app raise money for a charity through its purchases, and some
 * US states regulate a sale said to benefit one). No figure is given (his
 * word, 2026-11-11: "you don't have to be too specific on the percentages").
 * Both ways to help are the app's own pages, so the stores' rule on outside
 * payment (Apple 3.1.1) is kept in the apps.
 */

const SECTION = "px-5 md:px-8 py-16 md:py-24";
const LABEL = "font-sans text-caption font-semibold text-paper/55";

/** Where it goes, in its order: the shop's pieces, the Church, the app. */
const GOES = [
  { title: "support.goesShop.title", body: "support.goesShop.body" },
  { title: "support.goesChurch.title", body: "support.goesChurch.body" },
  { title: "support.goesApp.title", body: "support.goesApp.body" },
] as const;

/** The two ways to help: both open the app's own pages. */
const WAYS = [
  { href: "/pricing", title: "plus.badge", body: "support.wayPlus.body", cta: "premium.seePlus" },
  { href: "/shop", title: "shop.eikon", body: "support.wayShop.body", cta: "support.wayShop.cta" },
] as const;

export function SupportBody() {
  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto w-full max-w-[760px]">
        <p className="mb-4 font-sans text-detail font-semibold text-paper/55">
          <T k="support.eyebrow" />
        </p>
        <h1 id="support-title" className="font-sans text-display-sm font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display">
          <T k="support.title" />
        </h1>
        <p className="mt-6 font-serif text-body leading-[1.7] text-paper/85">
          <T k="support.lead" />
        </p>

        {/* Where it goes */}
        <section className="mt-12" aria-labelledby="support-goes">
          <h2 id="support-goes" className={`${LABEL} mb-4`}>
            <T k="support.whereItGoes" />
          </h2>
          <ul className="divide-y divide-paper/8 overflow-hidden rounded-md border border-paper/12">
            {GOES.map((g) => (
              <li key={g.title} className="bg-paper/[0.02] px-5 py-4">
                <p className="font-sans text-ui font-semibold leading-tight text-paper">
                  <T k={g.title} />
                </p>
                <p className="mt-1.5 font-serif text-detail leading-[1.6] text-paper/75">
                  <T k={g.body} />
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Two ways to help */}
        <section className="mt-12" aria-labelledby="support-ways">
          <h2 id="support-ways" className={`${LABEL} mb-4`}>
            <T k="support.twoWays" />
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {WAYS.map((w) => (
              <Link
                key={w.href}
                href={w.href}
                className="group block rounded-md border border-paper/15 bg-paper/[0.03] p-5 transition-colors hover:border-paper/35 hover:bg-paper/[0.06]"
              >
                <p className="font-sans text-body font-semibold leading-tight text-paper">
                  <T k={w.title} />
                </p>
                <p className="mt-2 font-serif text-detail leading-[1.6] text-paper/70">
                  <T k={w.body} />
                </p>
                <p className="mt-4 font-sans text-caption font-semibold text-paper/80 underline decoration-paper/30 underline-offset-4 transition-colors group-hover:text-paper">
                  <T k={w.cta} />
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* The core stays free */}
        <section className="mt-12 rounded-lg border border-paper/12 bg-paper/[0.02] p-6" aria-labelledby="support-free">
          <h2 id="support-free" className={`${LABEL} mb-3`}>
            <T k="support.coreStaysFree" />
          </h2>
          <p className="font-serif text-body leading-[1.7] text-paper/85">
            <T k="support.coreFree" />
          </p>
        </section>

        {/* Write to us */}
        <section className="mt-10 rounded-lg border border-paper/12 bg-paper/[0.03] p-6" aria-labelledby="support-write">
          <h2 id="support-write" className={`${LABEL} mb-3`}>
            <T k="ambassador.contact" />
          </h2>
          <p className="font-serif text-body leading-[1.7] text-paper/85">
            <T k="ui.questionsCorrectionsOrAText" />{" "}
            <Link href="/faq" className="underline decoration-paper/30 underline-offset-4 hover:text-paper">
              <T k="footer.faq" />
            </Link>
            <T k="ui.anythingElseReachesUsThrough" />
          </p>
        </section>

        {/* Closing */}
        <p className="mt-14 text-center font-serif text-lede italic text-paper/70">
          <T k="support.gladYouAreHere" />
        </p>
        <p className="mt-2 text-center font-sans text-caption text-paper/55">
          <T k="whatsnew.fromTheTeam" />
        </p>
      </article>
    </section>
  );
}
