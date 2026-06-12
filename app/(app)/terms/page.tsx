import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description:
    "The terms under which Purify is offered: what the service is, what you may do with it, what we promise, and what we do not.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

const H2 =
  "mt-12 font-sans text-title-sm md:text-title font-bold text-paper leading-[1.15]";
const P = "mt-4 font-serif text-body text-paper/85 leading-[1.7]";

export default function TermsPage() {
  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          Terms of Service
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          The terms, plainly.
        </h1>
        <p className="mt-6 font-serif text-body text-paper/65 leading-[1.7]">
          Effective June 12, 2026. These terms govern your use of Purify,
          the website at purifyapp.net and the Purify mobile applications.
          By using Purify you agree to them. They are written to be read,
          not skimmed past; the whole page takes a few minutes.
        </p>

        <h2 className={H2}>What Purify is</h2>
        <p className={P}>
          Purify is an Orthodox Christian reading, prayer, and study
          platform: Scripture, the prayer book, the lives and writings of
          the saints, the Church calendar, the councils, and study
          surfaces built on them. The texts we publish are public-domain
          translations and editions, or our own editorial writing; each
          text names its source. Purify is offered as a devotional and
          educational resource. It is not a substitute for a priest, a
          parish, or a spiritual father.
        </p>

        <h2 className={H2}>Free use, accounts, and sync</h2>
        <p className={P}>
          The core of Purify is free and requires no account. Anything you
          save without an account (highlights, notes, bookmarks, reading
          progress) is stored on your device and never reaches our
          servers. Signing in is optional and exists to synchronize your
          saved reading across devices. You are responsible for the
          accuracy of the email you register and for keeping your
          credentials to yourself. You may delete your account, and every
          server-side row attached to it, at any time from the account
          page; deletion is immediate and cascades.
        </p>

        <h2 className={H2}>Future paid features</h2>
        <p className={P}>
          Everything in the app today is free. If optional paid features
          arrive later, they will be presented clearly before any charge,
          they will never paywall what is free today, and they will be
          governed by the store&rsquo;s billing terms on the platform
          where you purchase them. We do not sell your data in either
          case.
        </p>

        <h2 className={H2}>Acceptable use</h2>
        <p className={P}>
          Do not use Purify to break the law, to probe or disrupt the
          service, to scrape it at abusive volume, or to attempt access to
          another person&rsquo;s account or data. We may suspend access
          that threatens the service or other users. Honest personal use,
          including reading offline, printing a prayer for personal use,
          and quoting passages with their sources, is the point of the
          project; you do not need permission for it.
        </p>

        <h2 className={H2}>Content and copyright</h2>
        <p className={P}>
          The liturgical and patristic texts we carry are in the public
          domain; they belong to everyone and we claim nothing over them.
          Our editorial writing, the curation, the interface, and the
          Purify name and mark are ours. If you believe something we
          publish infringes a right you hold, write to us and we will
          review it promptly.
        </p>

        <h2 className={H2}>No warranty</h2>
        <p className={P}>
          Purify is provided as-is and as-available. We work carefully,
          and the calendar, the texts, and the readings are checked
          against their sources, but we do not warrant that the service
          will be uninterrupted or error-free. To the fullest extent
          permitted by law, we disclaim implied warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement.
        </p>

        <h2 className={H2}>Limitation of liability</h2>
        <p className={P}>
          To the fullest extent permitted by law, Purify and the people
          who build it are not liable for indirect, incidental, special,
          consequential, or punitive damages, or for loss of data arising
          from your use of the service. Where liability cannot be
          excluded, it is limited to the amount you paid us in the twelve
          months before the claim, which for the free service is nothing.
          Nothing in these terms limits liability that cannot lawfully be
          limited.
        </p>

        <h2 className={H2}>Changes</h2>
        <p className={P}>
          We may revise these terms as the service grows. When we do, the
          effective date above changes, and material changes are noted on
          the{" "}
          <Link
            href="/whats-new"
            className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
          >
            what&rsquo;s new page
          </Link>
          . Continuing to use Purify after a change takes effect means you
          accept the revised terms.
        </p>

        <h2 className={H2}>Privacy</h2>
        <p className={P}>
          How we handle data, every field, every third party, every
          retention window, is its own page:{" "}
          <Link
            href="/privacy"
            className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
          >
            the privacy policy
          </Link>
          . It is part of these terms.
        </p>

        <h2 className={H2}>Contact</h2>
        <p className={P}>
          Questions about these terms reach us through the contact paths
          on the{" "}
          <Link
            href="/faq"
            className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
          >
            FAQ
          </Link>
          .
        </p>
      </article>
    </section>
  );
}
