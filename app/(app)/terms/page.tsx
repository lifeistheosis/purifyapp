import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description:
    "The terms under which Purify and the EIKON shop are offered: what the service is, how purchases work, what we promise, what we do not, and how disputes are handled.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

const H2 =
  "mt-12 font-sans text-title-sm md:text-title font-bold text-paper leading-[1.15]";
const H3 = "mt-7 font-sans text-ui font-semibold text-paper";
const P = "mt-4 font-serif text-body text-paper/85 leading-[1.7]";
const A =
  "text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper";

export default function TermsPage() {
  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto w-full max-w-[760px]">
        <p className="mb-4 font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55">
          Terms of Service
        </p>
        <h1 className="font-sans text-display-sm font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display">
          The terms, plainly.
        </h1>
        <p className="mt-6 font-serif text-body leading-[1.7] text-paper/65">
          Effective July 17, 2026. These terms are a binding agreement
          between you and Purify (&ldquo;Purify,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us&rdquo;), covering the website at purifyapp.net, the
          Purify mobile applications, and the EIKON shop. By using Purify or
          placing an order, you agree to them. They include a{" "}
          <strong className="text-paper">
            binding arbitration clause and a class-action waiver
          </strong>{" "}
          (below), which affect how disputes are resolved. Please read them.
        </p>

        <h2 className={H2}>1. Who may use Purify</h2>
        <p className={P}>
          Purify is for people aged 13 and older. If you are under 18, you
          may use it only with a parent or guardian&rsquo;s involvement, and
          only that adult may make purchases. By using Purify you confirm
          you meet these requirements and that any information you give us is
          accurate.
        </p>

        <h2 className={H2}>2. What Purify is</h2>
        <p className={P}>
          Purify is an Orthodox Christian reading, prayer, and study
          platform: Scripture, the prayer book, the lives and writings of
          the saints, the Church calendar, the councils, and study surfaces
          built on them. It also includes EIKON, a shop for icons and
          devotional goods (Section 6). Purify is offered as a devotional
          and educational resource.
        </p>

        <h2 className={H2}>3. Not professional advice</h2>
        <p className={P}>
          Purify is not a substitute for a priest, a parish, or a spiritual
          father, and it is not medical, psychological, legal, financial, or
          other professional advice. Nothing here diagnoses, treats, or
          prevents any condition. If you are in crisis or need care, contact
          a qualified professional or emergency services. Decisions you make
          in reliance on the app are your own.
        </p>

        <h2 className={H2}>4. Accounts and sync</h2>
        <p className={P}>
          The core of Purify is free and requires no account. Anything you
          save without an account (highlights, notes, bookmarks, reading
          progress) is stored on your device and never reaches our servers.
          Signing in is optional and exists to synchronize your saved
          reading and to place orders. You are responsible for the accuracy
          of the email you register, for activity under your account, and
          for keeping your credentials to yourself. You may delete your
          account, and every server-side row attached to it, at any time
          from the account page; deletion is immediate and cascades.
        </p>

        <h2 className={H2}>5. Acceptable use</h2>
        <p className={P}>
          Do not use Purify to break the law, to infringe anyone&rsquo;s
          rights, to probe or disrupt the service, to scrape it at abusive
          volume, to resell or redistribute our content or catalog, or to
          attempt access to another person&rsquo;s account or data. We may
          suspend or terminate access that threatens the service, violates
          these terms, or is used fraudulently. Honest personal use,
          including reading offline, printing a prayer for personal use, and
          quoting passages with their sources, is the point of the project;
          you do not need permission for it.
        </p>

        <h2 className={H2}>6. The EIKON shop</h2>
        <p className={P}>
          EIKON is our online shop for Orthodox icons and devotional goods.
          Items are sourced from selected suppliers, inspected, packaged, and
          fulfilled by us. The following terms apply to every purchase, in
          addition to the store&rsquo;s posted shipping and return policies.
        </p>

        <h3 className={H3}>Orders and acceptance</h3>
        <p className={P}>
          Placing an order is an offer to buy; a sale is formed only when we
          accept it and charge your payment method. We may decline or cancel
          any order, before or after it is placed, including for suspected
          fraud, stock or sourcing problems, delivery-area limits, or errors
          in price or description. If we cancel a paid order we refund it in
          full. Pricing or description errors do not bind us, and we may
          correct them and give you the choice to proceed or cancel.
        </p>

        <h3 className={H3}>Prices, payment, and tax</h3>
        <p className={P}>
          Prices are in US dollars and may change at any time before you
          order. Payment is processed by our payment provider; we do not
          receive or store your full card details. You are responsible for
          any sales, use, or import taxes and duties that apply to your
          order and location, which may be added at checkout or billed
          separately where required by law.
        </p>

        <h3 className={H3}>Shipping and fulfillment</h3>
        <p className={P}>
          Each listing shows an estimated dispatch window. Because many
          items are obtained from suppliers, inspected, and repackaged before
          they ship, dispatch commonly takes one to three weeks; estimates
          are good-faith targets, not guarantees, and delivery times depend
          on the carrier. If we cannot ship within a materially longer time
          than estimated, we will notify you and offer to wait or to cancel
          for a refund. We ship within the United States only unless a
          listing says otherwise. Risk of loss passes to you when we hand the
          package to the carrier; title passes on delivery.
        </p>

        <h3 className={H3}>Returns and refunds</h3>
        <p className={P}>
          Our current return and refund terms are on the store and each
          store page. In general, standard stocked items may be returned
          within 30 days if unused and undamaged, with the buyer paying
          return shipping for change-of-mind returns; we cover it when an
          item arrives incorrect, damaged, or materially misdescribed.
          Special-order items may not be cancellable once the supplier order
          is placed. Nothing here removes rights you have under applicable
          consumer-protection law regarding non-delivery or defective goods.
        </p>

        <h3 className={H3}>Product descriptions, images, and variation</h3>
        <p className={P}>
          We describe items honestly and label how each is made. Photographs
          may be representative rather than the exact physical item, and
          natural materials such as wood, print, and resin vary in grain,
          tone, and finish; such variation is not a defect. We do not
          promise that any item will match a photo exactly or be fit for a
          particular purpose beyond ordinary use.
        </p>

        <h3 className={H3}>Product safety</h3>
        <p className={P}>
          Some items are combustible. Incense, resin, and charcoal produce an
          open flame, heat, embers, and smoke: use them only on a
          heat-resistant surface with ventilation, never leave them burning
          unattended, and keep them, and all small parts, away from children
          and pets. You are responsible for using every product safely and
          as intended. To the fullest extent permitted by law, we are not
          liable for harm resulting from misuse.
        </p>

        <h2 className={H2}>7. Optional paid features and subscriptions</h2>
        <p className={P}>
          The whole spiritual core of Purify, the Scriptures, the prayers, the
          saints and the Fathers, the calendar and its fasts, and the fasting
          tracker, is free and stays free. Some optional features are offered
          by subscription on top of that core. Any charge is shown clearly
          before you confirm it, paid features never paywall what is free
          today, and we do not sell your personal data. Purify is offered in
          three tiers: Standard (free), Purify Plus, and Purify Pro.
        </p>
        <h3 className={H3}>Purify Plus</h3>
        <p className={P}>
          Purify Plus is an optional auto-renewing subscription. The standard
          prices are US $9.99 per month or US $99 per year (local prices are
          shown in the store before you confirm). New subscribers receive an
          introductory opening discount of 50% off the first year; after the
          first year the subscription renews automatically at the then-current
          standard price, until you cancel. Plus is the premium reading and
          study layer: it carries your library, notes, highlights, and
          collections across every device you sign in on.
        </p>
        <h3 className={H3}>Purify Pro</h3>
        <p className={P}>
          Purify Pro is an optional auto-renewing subscription that includes
          everything in Purify Plus and adds the premium experience layer:
          premium reading modes in the app, the EIKON Box, and EIKON member
          benefits. The EIKON Box is a curated box of Orthodox devotional
          goods, such as an icon, a prayer rope, incense, a booklet, or
          seasonal items, mailed to active members each month. Its contents
          are a curated selection that varies month to month; no specific
          item is promised, and a box cannot be exchanged for cash. EIKON
          member benefits include free standard shipping on EIKON shop orders
          while your Pro subscription is active (without Pro, shipping is
          charged at the rate shown at checkout) and periodic discount codes
          for the EIKON shop. The standard prices are US $19.99 per month or
          US $199 per year. New subscribers receive the same introductory 50%
          discount for the first year, after which Pro renews at the
          then-current standard price until you cancel. The box is sent only
          while your subscription is active and a valid shipping address is
          on file. Discount codes apply to eligible EIKON items, may not be
          combined with other offers, and have no cash value.
        </p>
        <h3 className={H3}>Billing, cancellation, and refunds</h3>
        <p className={P}>
          A Purify subscription can be purchased on Android through Google
          Play, or on the web. On Android, Google Play is the biller: cancel at
          any time in the Play Store under Subscriptions. On the web, the
          subscription is billed through our web billing provider and processed
          by Stripe; you can cancel from the manage-subscription link on the
          pricing page. Either way, cancellation takes effect at the end of the
          current billing period and you keep your subscription until then;
          canceling Pro also stops any future monthly item after the current
          period, and a monthly item already shipped is not refundable.
          Renewals, cancellations, and refunds for purchases made through Apple
          or Google are governed by that platform&rsquo;s billing terms; web
          purchases are governed by these terms and the provider&rsquo;s rules.
          A single account holds one subscription entitlement across every
          device, however it was purchased. Deleting the app does not cancel a
          subscription.
        </p>

        <h2 className={H2}>8. Content, copyright, and your submissions</h2>
        <p className={P}>
          The liturgical and patristic texts we carry are in the public
          domain; we claim nothing over them. Some Scripture translations and
          other works are used under license from their rightsholders and
          carry the notices those licenses require; those works remain the
          property of their owners and are provided for personal,
          non-commercial reading only. Our editorial writing, curation,
          software, product photography, and the Purify and EIKON names and
          marks are ours or our licensors&rsquo; and may not be copied or
          resold. When you send us content, a support message, a review, or a
          request, you grant us a non-exclusive, royalty-free license to use
          it to operate and improve the service. If you believe something we
          publish infringes a right you hold, write to{" "}
          <a href="mailto:support@purifyapp.net" className={A}>
            support@purifyapp.net
          </a>{" "}
          with the details and we will review it promptly.
        </p>

        <h2 className={H2}>9. Third-party services</h2>
        <p className={P}>
          Purify relies on third parties for hosting, payments, email,
          authentication, notifications, and licensed Scripture. Your use of
          those features is also subject to those providers&rsquo; terms and
          privacy practices, and we are not responsible for their services.
          The{" "}
          <Link href="/privacy" className={A}>
            privacy policy
          </Link>{" "}
          lists who they are and what data they receive.
        </p>

        <h2 className={H2}>10. No warranty</h2>
        <p className={P}>
          Purify, the EIKON shop, and everything in them are provided
          &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We work
          carefully, and the calendar, the texts, and the readings are
          checked against their sources, but we do not warrant that the
          service or any product will be uninterrupted, error-free, or fit
          for a particular purpose. To the fullest extent permitted by law,
          we disclaim all implied warranties, including merchantability,
          fitness for a particular purpose, and non-infringement. Some
          jurisdictions do not allow certain disclaimers, so parts of this
          section may not apply to you.
        </p>

        <h2 className={H2}>11. Limitation of liability</h2>
        <p className={P}>
          To the fullest extent permitted by law, Purify and the people who
          build it are not liable for indirect, incidental, special,
          consequential, exemplary, or punitive damages, or for lost profits,
          lost data, or business interruption, arising from the service, the
          shop, or any product, even if advised of the possibility. Where
          liability cannot be excluded, our total liability for any claim is
          limited to the greater of the amount you paid us for the item or
          service giving rise to the claim in the prior twelve months, or
          one hundred US dollars. Nothing in these terms limits liability
          that cannot lawfully be limited, including for death or personal
          injury caused by our negligence, or for fraud.
        </p>

        <h2 className={H2}>12. Indemnification</h2>
        <p className={P}>
          You agree to indemnify and hold harmless Purify and the people who
          build it from claims, losses, and reasonable legal costs arising
          from your misuse of the service, your violation of these terms or
          of any law, or your infringement of another&rsquo;s rights.
        </p>

        <h2 className={H2}>
          13. Dispute resolution, arbitration, and class-action waiver
        </h2>
        <p className={P}>
          <strong className="text-paper">Please read this carefully.</strong>{" "}
          First, we both agree to try to resolve any dispute informally:
          contact us at{" "}
          <a href="mailto:support@purifyapp.net" className={A}>
            support@purifyapp.net
          </a>{" "}
          and give us 30 days to work it out before starting a formal
          proceeding.
        </p>
        <p className={P}>
          If we cannot, you and we agree that any dispute arising out of or
          relating to Purify, the shop, or these terms will be resolved by{" "}
          <strong className="text-paper">
            final and binding individual arbitration
          </strong>
          , administered by the American Arbitration Association under its
          Consumer Arbitration Rules, rather than in court, except that
          either of us may bring an individual claim in small-claims court.{" "}
          <strong className="text-paper">
            You and we waive the right to a jury trial and the right to
            participate in a class, collective, or representative action.
          </strong>{" "}
          Arbitration is on an individual basis only.
        </p>
        <p className={P}>
          <strong className="text-paper">Your right to opt out:</strong> you
          may reject this arbitration agreement within 30 days of first
          accepting these terms by emailing{" "}
          <a href="mailto:support@purifyapp.net" className={A}>
            support@purifyapp.net
          </a>{" "}
          with your name and a clear statement that you opt out; doing so does
          not affect any other part of these terms.
        </p>

        <h2 className={H2}>14. Governing law and venue</h2>
        <p className={P}>
          These terms are governed by the laws of the State of Florida,
          without regard to its conflict-of-laws rules. To the extent a
          dispute is not subject to arbitration, it will be brought only in
          the state or federal courts located in Florida, and you consent to
          their jurisdiction.
        </p>

        <h2 className={H2}>15. Changes to these terms</h2>
        <p className={P}>
          We may revise these terms as the service grows. When we do, the
          effective date above changes, and material changes are noted on
          the{" "}
          <Link href="/whats-new" className={A}>
            what&rsquo;s new page
          </Link>
          . Continuing to use Purify, or placing a new order, after a change
          takes effect means you accept the revised terms.
        </p>

        <h2 className={H2}>16. General</h2>
        <p className={P}>
          If any part of these terms is held unenforceable, the rest remains
          in effect. Our not enforcing a term is not a waiver of it. You may
          not assign these terms; we may assign them to a successor. We are
          not liable for delays or failures caused by events beyond our
          reasonable control. These terms, together with the{" "}
          <Link href="/privacy" className={A}>
            privacy policy
          </Link>
          , are the entire agreement between you and us about the service and
          replace any prior understanding.
        </p>

        <h2 className={H2}>17. Contact</h2>
        <p className={P}>
          Questions about these terms, or notices of any kind, reach us at{" "}
          <a href="mailto:support@purifyapp.net" className={A}>
            support@purifyapp.net
          </a>
          , or through the paths on the{" "}
          <Link href="/faq" className={A}>
            FAQ
          </Link>
          .
        </p>
      </article>
    </section>
  );
}
