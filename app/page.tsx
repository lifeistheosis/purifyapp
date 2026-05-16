import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/nav/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionScroller } from "@/components/SectionScroller";

const features = [
  {
    title: "Daily prayer",
    body: "Begin and end each day with guided morning and evening prayer.",
  },
  {
    title: "Scripture & saints",
    body: "Read the appointed Gospel, Epistle, and life of the saint for every day.",
  },
  {
    title: "Quiet reflection",
    body: "Short meditations on the Jesus Prayer, the Psalms, and the Fathers.",
  },
];

const categories = [
  "Morning prayers",
  "Evening prayers",
  "Akathists",
  "The Jesus Prayer",
  "Daily Gospel",
  "Lives of saints",
  "Psalter",
  "Great Lent",
];

const challenges = [
  { eyebrow: "40-day journey", title: "Great Lent with the Fathers" },
  { eyebrow: "Beginner", title: "Learn the Jesus Prayer" },
  { eyebrow: "Family", title: "Praying with your children" },
];

// Each section: full viewport min-height, snap-aligned, flex-centered.
// pt offsets the 72px sticky navbar so content centers in the visible area.
const sectionBase =
  "snap-start md:[min-height:100dvh] flex items-center px-5 md:px-8 pt-24 md:pt-20 pb-16 md:pb-12";

export default function Home() {
  return (
    <>
      <SectionScroller />
      <Navbar />
      <main className="flex-1">
      {/* HERO */}
      <section
        className={`${sectionBase} relative overflow-hidden`}
        style={{
          background:
            "linear-gradient(180deg, #000000 0%, #1a1a1a 55%, #ffffff 100%)",
        }}
      >
        <div className="mx-auto max-w-[1240px] w-full grid grid-cols-1 xl:grid-cols-2 gap-12 items-center">
          <div className="text-paper">
            <Link
              href="/whats-new"
              className="group inline-flex items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.06] px-3 py-1.5 mb-5 hover:bg-paper/10 hover:border-paper/35 transition-colors duration-150"
            >
              <span
                className="font-sans text-[10px] font-semibold uppercase tracking-[1.5px] px-2 py-0.5 rounded-pill"
                style={{ color: "#161219", backgroundColor: "#d4af37" }}
              >
                New
              </span>
              <span className="font-sans text-[13px] text-paper/85 group-hover:text-paper transition-colors">
                Beta v1.1 · 3 new saints, polish patch
              </span>
              <span className="text-paper/55 group-hover:text-paper transition-colors text-[13px]">
                →
              </span>
            </Link>
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/70 mb-4">
              The #1 Orthodox prayer app
            </p>
            <h1 className="font-sans text-[40px] md:text-[52px] lg:text-[64px] font-bold leading-[1.02] tracking-[-0.025em]">
              Find God&rsquo;s peace in prayer.
            </h1>
            <p className="font-sans text-[17px] md:text-[18px] text-paper/85 mt-5 max-w-[520px]">
              Pray daily with the prayers of the Church. Scripture, saints,
              and quiet reflection, all in one place.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <Button variant="inverse">Try Purify for Free</Button>
              <Button
                variant="tertiary"
                className="!text-paper hover:!text-paper/80"
              >
                Watch the trailer →
              </Button>
            </div>
          </div>
          <div className="hidden xl:flex justify-center items-center">
            <div
              className="rounded-[36px] bg-night/70 backdrop-blur border border-paper/15 shadow-lg flex items-center justify-center"
              style={{
                height: "min(70dvh, 520px)",
                aspectRatio: "9 / 19",
              }}
            >
              <span className="font-sans text-paper/90 text-[22px] font-bold tracking-[-0.01em]">
                Purify
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className={`${sectionBase} bg-night`}>
        <div className="mx-auto max-w-[1240px] w-full">
          <div className="text-center max-w-[720px] mx-auto mb-16">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
              Why Purify
            </p>
            <h2 className="font-sans text-[32px] md:text-[44px] lg:text-[56px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
              A companion for the praying life.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((f) => (
              <div key={f.title} className="text-center">
                <div className="mx-auto mb-6 h-14 w-14 rounded-pill bg-paper/10 flex items-center justify-center">
                  <span className="text-paper text-[22px]">✦</span>
                </div>
                <h3 className="font-sans text-[24px] font-semibold text-paper mb-3">
                  {f.title}
                </h3>
                <p className="font-sans text-body text-paper/70 max-w-[320px] mx-auto">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCRIPTURE - white rhythm break */}
      <section className={`${sectionBase} bg-paper text-center`}>
        <div className="mx-auto max-w-[820px] w-full">
          <p className="font-serif text-[36px] md:text-[52px] leading-[1.15] tracking-[-0.01em] text-night">
            &ldquo;The Lord is good to those who trust in him.&rdquo;
          </p>
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-ink-soft mt-7">
            Nahum 1:7
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className={`${sectionBase} bg-night`}>
        <div className="mx-auto max-w-[1240px] w-full">
          <div className="mb-12">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
              Pray with Purify
            </p>
            <h2 className="font-sans text-[32px] md:text-[44px] lg:text-[56px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
              Browse prayers and readings.
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((c) => (
              <a
                key={c}
                href="#"
                className="block rounded-pill border border-paper/15 bg-paper/[0.04] px-5 py-4 font-sans text-[15px] font-medium text-paper text-center hover:bg-paper/10 hover:border-paper/30 transition-colors duration-150"
              >
                {c}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CHALLENGES */}
      <section className={`${sectionBase} bg-night-soft`}>
        <div className="mx-auto max-w-[1240px] w-full">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
                Challenges
              </p>
              <h2 className="font-sans text-[32px] md:text-[44px] lg:text-[56px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
                Pray together.
              </h2>
            </div>
            <Button
              variant="tertiary"
              className="!text-paper hover:!text-paper/80"
            >
              See all challenges →
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {challenges.map((ch) => (
              <div
                key={ch.title}
                className="rounded-lg bg-night border border-paper/8 p-8 hover:border-paper/20 transition-colors duration-200"
              >
                <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
                  {ch.eyebrow}
                </p>
                <h3 className="font-sans text-[24px] font-semibold text-paper mb-5">
                  {ch.title}
                </h3>
                <Button
                  variant="tertiary"
                  className="!text-paper hover:!text-paper/80"
                >
                  Join challenge →
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={`${sectionBase} bg-night`}>
        <div className="mx-auto max-w-[1100px] w-full">
          <h2 className="font-sans text-[40px] md:text-[56px] lg:text-[72px] font-bold text-paper leading-[1.02] tracking-[-0.03em]">
            Start your prayer journey today!
          </h2>
          <div className="mt-10">
            <Button variant="inverse" className="text-[16px]">
              Try Purify for Free
            </Button>
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </>
  );
}
