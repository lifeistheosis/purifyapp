import Link from "next/link";

import { LEGAL_EMAIL, LEGAL_NAME, SUPPORT_EMAIL } from "@/lib/legal/entity";

import { LegalContents } from "./LegalContents";
import { LEGAL_A, LEGAL_H1, LEGAL_H2, LEGAL_H3, LEGAL_LEAD, LEGAL_P, LEGAL_UL } from "./legalStyle";

// The Terms of Service, from their heading to their end: one text, drawn by
// the page (app/(app)/terms/page.tsx) and by the sheet that opens wherever the
// app says you agree to them (components/legal/LegalSheet.tsx; build 90 note
// 1). Moved here word for word from the page on 2026-11-10, so the two can
// never say different things. English only, as the page always was.

// The look is the three legal texts' shared one (./legalStyle.ts, 1.9).
const H2 = LEGAL_H2;
const H3 = LEGAL_H3;
const P = LEGAL_P;
const A = LEGAL_A;
// A list inside the Terms, in the privacy page's own list style.
const UL = LEGAL_UL;


export function TermsText() {
  // The Terms are English for every reader, heading and all, and say so with
  // their direction (build 90 note 4), so an Arabic reader reads them left to
  // right, as English is set.
  return (
    <div lang="en" dir="ltr">
        <h1 className={LEGAL_H1}>
          The terms, plainly.
        </h1>
        <p className={LEGAL_LEAD}>
          Effective August 14, 2026. These terms are a binding agreement
          between you and {LEGAL_NAME} (&ldquo;Purify,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us&rdquo;), covering the website at purifyapp.net, the
          Purify mobile applications, and the EIKON shop. By using Purify or
          placing an order, you agree to them. They include a{" "}
          <strong className="text-paper">
            binding arbitration clause and a class-action waiver
          </strong>{" "}
          (below), which affect how disputes are resolved. Please read them.
        </p>
        {/* The text's own headings, folded, as a way through it (./LegalContents.tsx). */}
        <LegalContents />

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
        {/* 1.9: tests of two versions (lib/ab/). His item 140, "all recs" of
            2026-11-10, word for word; lib/analytics/__tests__/moreCounting.test.ts
            holds it. The lawyer still reads it (his 113). */}
        <p className={P}>
          Purify changes as we learn what helps its readers. At times two
          readers are shown different versions of the same screen while we
          find out which serves them better. A test never changes what you
          have already paid for, the price you are shown is the price you
          pay, and no test changes the texts of Scripture, the prayers or
          the Fathers. What is counted, and how, is in the Privacy Policy.
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
          Purify Plus is an optional auto-renewing subscription. The prices are
          US $9.99 per month or US $71.99 per year (local prices are shown in
          the store before you confirm). A first subscription to the yearly
          plan begins with a 7-day free trial; cancel before it ends and you
          are not charged. The subscription renews automatically
          at the then-current price, until you cancel. Plus is the premium
          reading and study layer: it carries your library, notes, highlights,
          and collections across every device you sign in on.
        </p>
        <h3 className={H3}>Purify Pro</h3>
        <p className={P}>
          Purify Pro is an optional auto-renewing subscription that includes
          everything in Purify Plus and adds the premium experience layer:
          premium reading modes in the app, the EIKON Box, and EIKON member
          benefits. The prices are US $19.99 per month or US $199 per year. Pro
          renews automatically at the then-current price until you cancel.
        </p>
        <p className={P}>
          The EIKON Box is claimed, not sent automatically. Each month we open
          a box and announce it in the app. While the claim window for that box
          is open, an active Pro member may claim it once and give a shipping
          address. We then gather and ship to the number of boxes claimed. A
          box you do not claim before its window closes is not carried over to
          a later month, is not replaced, and is not refunded or exchanged for
          cash or credit. Your subscription pays for the Purify Pro tier as a
          whole, not for a box in any particular month. One box per member per
          month. Contents are a curated selection that varies month to month;
          no specific item is promised. You must be an active Pro member at the
          moment you claim. If your subscription ends after you have claimed
          but before that box ships, we still send it. We ship to United States
          addresses at present, and you are responsible for the accuracy of the
          address you give us. If a box comes back to us as undeliverable we
          will write to the email on your account; we may reship once at our
          discretion, and we are not obliged to reship a second time. We may
          cancel a drop before it ships, in which case nothing further is owed
          to you.
        </p>
        <p className={P}>
          EIKON member benefits include free standard shipping on EIKON shop
          orders while your Pro subscription is active (without Pro, shipping
          is charged at the rate shown at checkout) and periodic discount codes
          for the EIKON shop. Discount codes apply to eligible EIKON items, may
          not be combined with other offers, and have no cash value.
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
          canceling Pro means you may no longer claim a new box once your paid
          period ends; a box you have already claimed will still be sent, and a
          box already shipped is not refundable.
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
          <a href={`mailto:${LEGAL_EMAIL}`} className={A}>
            {LEGAL_EMAIL}
          </a>{" "}
          with the details and we will review it promptly.
        </p>

        {/* What readers post (his yes of 2026-11-10, "and yes those terms
            are good", to docs/1.9-build/drafts/terms-posts.md). Inside
            section 8, so no section is renumbered. */}
        <h3 className={H3}>What you post</h3>
        <p className={P}>
          Parts of Purify let you post for other people to see: prayer
          campaigns with their updates and pictures, Community posts and
          replies, comments, shared journal pages, shop reviews, and the
          name, picture and banner on your profile. What you post is made by
          you, not by Purify. It is not our view, and we do not vouch for it,
          even where a moderator has looked at it before it is shown.
        </p>
        <p className={P}>
          Your words and pictures stay yours. When you post them, you give
          us a worldwide, non-exclusive, royalty-free licence to store them,
          to prepare them for display (for example, to resize a picture or
          remove the hidden data a photo carries), and to show them in the
          Purify apps and on our website to the people you share them with.
          The licence ends when you or we delete them, apart from what the
          law requires us to keep.
        </p>
        <p className={P}>When you post, you confirm that:</p>
        <ul className={UL}>
          <li>
            the words and pictures are yours to share, or you have
            permission from whoever owns them;
          </li>
          <li>
            anyone you name or show has agreed to it, or their family has if
            they have died, or you are the parent or guardian of the child;
          </li>
          <li>
            you share nothing private about another person, such as their
            health, without their permission; and
          </li>
          <li>what you post keeps to these terms and to the law.</li>
        </ul>
        <p className={P}>
          You are responsible for what you post, and you, not Purify, answer
          for it.
        </p>

        <h3 className={H3}>Prayer campaigns</h3>
        <p className={P}>
          A prayer campaign is a request for prayer that you start and keep.
          When you start one, you accept these terms for it, and you confirm
          the line you tick before it is created. You can edit it, end it,
          close its comments, or take it down at any time.
        </p>

        <h3 className={H3}>What we may remove</h3>
        <p className={P}>
          We may refuse, hide, or remove any prayer campaign, post, reply,
          comment, picture, or shared page, at any time and for any reason,
          and we may limit or close an account that breaks these terms. We do
          not have to watch what is posted, and leaving something up does not
          mean we agree with it. When we remove something you posted, we tell
          you why, unless the law or someone&rsquo;s safety stops us.
        </p>

        <h3 className={H3}>Reports, and pictures that are not the poster&rsquo;s own</h3>
        <p className={P}>
          If something posted in Purify breaks the law or these terms, or
          names you or someone in your care without your agreement, report it
          from its page or write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={A}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p className={P}>
          If a picture or other work posted in Purify is yours and was used
          without your permission, write to{" "}
          <a href={`mailto:${LEGAL_EMAIL}`} className={A}>
            {LEGAL_EMAIL}
          </a>{" "}
          with:
        </p>
        <ul className={UL}>
          <li>your signature (your full name, typed, is enough);</li>
          <li>the work that is yours;</li>
          <li>where it is in Purify (its link);</li>
          <li>your name, postal address, and email or phone;</li>
          <li>
            a statement that you believe in good faith that the use is not
            allowed by you, your agent, or the law; and
          </li>
          <li>
            a statement, under penalty of perjury, that your notice is
            accurate and that you own the work or may act for its owner.
          </li>
        </ul>
        <p className={P}>
          We take the work down while we look into it and tell the person who
          posted it, who may write back to{" "}
          <a href={`mailto:${LEGAL_EMAIL}`} className={A}>
            {LEGAL_EMAIL}
          </a>{" "}
          if they believe it was a mistake. We close the accounts of people
          who repeatedly post others&rsquo; work without permission.
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
          <a href={`mailto:${LEGAL_EMAIL}`} className={A}>
            {LEGAL_EMAIL}
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
          <a href={`mailto:${LEGAL_EMAIL}`} className={A}>
            {LEGAL_EMAIL}
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
          <a href={`mailto:${LEGAL_EMAIL}`} className={A}>
            {LEGAL_EMAIL}
          </a>
          , or through the paths on the{" "}
          <Link href="/faq" className={A}>
            FAQ
          </Link>
          .
        </p>
    </div>
  );
}
