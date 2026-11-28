import { headers } from "next/headers";
import { DiscoverMobile, discoverEntries } from "@/components/mobile/DiscoverMobile";
import { DoorGrid } from "@/components/discover/DoorGrid";
import { FeaturedTodayDesktop } from "@/components/discover/FeaturedTodayDesktop";
import { COUNCILS } from "@/lib/councils/councils";
import { loadAllTopics } from "@/lib/topics/topics";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { NONCE_HEADER } from "@/lib/security/headers";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Discover",
  description:
    "A way into the wider library: Orthodox history, the reading room, the whole theological study of the Faith, and the Councils.",
};

// No `revalidate`: getServerLocale() awaits cookies(), which already makes
// this page dynamic on the web, and under `output: "export"` ISR does not
// exist at all. Anything day-dependent here resolves on the device.

/*
 * Redone 2026-09-26 at the owner's request, in the front page's language
 * (Lora Bold headings, DM Sans for what is read, a small eyebrow over the
 * heading). From 2.0 the library itself is the phone's: its doors, each with
 * its picture, side by side (components/discover/DoorGrid.tsx), where the
 * computer had a row of pills and graphite cards with icons (his word,
 * 2026-11-28, on "the https://purifyapp.net/discover design is outdated").
 * Featured today and the closing prayer stay, once each.
 */

/** The front page's small uppercase section eyebrow. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-detail font-semibold text-paper/60">{children}</p>
  );
}

export default async function DiscoverPage() {
  const locale = await getServerLocale();
  const m = getMessages(locale);

  const topics = await loadAllTopics();

  // Summaries only: the client picks the day's pair, so it needs the
  // candidates, not the whole corpus.
  const featuredTopics = topics.map((tp) => ({
    slug: tp.slug,
    title: tp.title,
    definition: tp.definition ?? "",
    citationCount: 0,
  }));
  const featuredCouncils = COUNCILS.map((c) => ({
    slug: c.slug,
    byname: c.byname,
    year: c.year,
    location: c.location,
  }));

  // The website's per-request nonce, for the small script that lays a
  // reader's own order on the doors before they are drawn (DiscoverMobile).
  // The apps' export has no request, no policy and no nonce, as the root
  // layout says.
  const nonce = IS_STATIC_EXPORT ? undefined : ((await headers()).get(NONCE_HEADER) ?? undefined);

  return (
    <>
      <DiscoverMobile nonce={nonce} />
      <div className="hidden md:contents native-md-hidden">
        <section className="relative overflow-hidden bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
          {/* The front page hero's candle glow, in white, behind the heading. */}
          <div
            aria-hidden
            className="page-halo pointer-events-none absolute inset-x-0 top-0 h-[560px]"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 20% 10%, rgba(255,255,255,0.05) 0%, transparent 65%)",
            }}
          />
          <article className="relative mx-auto w-full max-w-[1240px] px-5 pt-6 pb-10 md:pt-6 md:pb-0">
            {/* Hero */}
            <header className="max-w-[780px]">
              <Eyebrow>{t(m, "discover.eyebrow")}</Eyebrow>
              <h1 className="mt-4 text-heading font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-sm lg:text-display">
                {t(m, "discover.h1")}
              </h1>
              <p className="mt-6 max-w-[560px] font-sans text-ui leading-[1.6] text-paper/75 md:text-lede">
                {t(m, "discover.subtitle")}
              </p>
            </header>

            {/* The library's doors, the phone's own, side by side (2.0, his word
                of 2026-11-28; components/discover/DoorGrid.tsx), where a row of
                pills and cards with icons and no pictures stood. */}
            <nav aria-label={t(m, "discover.eyebrow")} className="mt-12 md:mt-14">
              <DoorGrid
                doors={discoverEntries().map((e) => ({
                  href: e.href,
                  title: e.label,
                  line: e.blurb,
                  picture: e.picture,
                  focus: e.focus,
                  badge: e.badge,
                }))}
              />
            </nav>

            {/* Featured today: one topic and one council, rotating daily.
                Picked on the device, not here: this tree ships into the
                Android export, where a server component's answer to "what
                day is it" is frozen at build time. */}
            <FeaturedTodayDesktop
              topics={featuredTopics}
              councils={featuredCouncils}
              heading={<T k="study.discover.featuredToday" />}
            />

            {/* Quiet colophon to close the page. */}
            <p className="mt-20 text-center font-serif italic text-ui leading-[1.55] text-paper/55">
              <T k="study.colophon1" />
              <br />
              <T k="study.colophon2" />
            </p>
          </article>
        </section>
      </div>
    </>
  );
}
