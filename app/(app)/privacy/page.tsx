import Link from "next/link";

export const metadata = {
 title: "Privacy",
 description:
 "What Purify records, what we don't, where it lives, how long we keep it, and the third parties involved.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export default function PrivacyPage() {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 Privacy
 </p>
 <h1 className="font-sans text-[36px] md:text-[46px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 What Purify keeps, and what it doesn&rsquo;t.
 </h1>
 <p className="mt-6 font-serif text-[17px] text-paper/65 leading-[1.7]">
 The short version is on the{" "}
 <Link
 href="/about"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 about page
 </Link>
 . This one is the long version: every field we record, every place
 it goes, every third party the site touches, and how long we keep
 any of it. If something here is wrong, write to us; we&rsquo;ll fix
 it.
 </p>

 {/* Two account paths */}
 <h2 className="mt-12 font-sans text-[24px] md:text-[28px] font-bold text-paper leading-[1.15]">
 Local profile vs public account
 </h2>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 When you open{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 you pick one of two paths. Neither is the default; the choice
 is presented plainly.
 </p>
 <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="rounded-md border border-paper/12 bg-paper/[0.02] p-5">
 <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
 Local profile
 </p>
 <p className="font-serif text-[16px] text-paper/85 leading-[1.65]">
 Highlights, notes, bookmarks, your prayer streak, and reader
 preferences (font, size) are stored in your browser&rsquo;s{" "}
 <code className="font-mono text-[14px] text-paper/70">localStorage</code>.
 We do not see or receive any of it. There is no row for you in
 our database. The trade-off: it lives on this device only, and
 goes away if you clear browser data.
 </p>
 <p className="mt-3 font-sans text-[12.5px] text-paper/55 leading-[1.55]">
 To release a local profile, open /account and click &ldquo;Release
 this local profile.&rdquo; To wipe all local data, clear site
 data for this origin in your browser settings.
 </p>
 </div>
 <div className="rounded-md border border-gold/30 bg-gold/[0.04] p-5">
 <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-gold mb-2">
 Public account
 </p>
 <p className="font-serif text-[16px] text-paper/85 leading-[1.65]">
 The same items go to our Supabase Postgres database so they
 sync across every device you sign in on. We store: your email
 (used to sign you in and to send confirmations on
 password/email changes), an Argon2 hash of your password
 (never the password itself), a display name, and a
 <code className="font-mono text-[14px] text-paper/70"> profiles </code>
 row with your account creation date plus a boolean flag for
 whether you&rsquo;ve set a password. Highlights, notes,
 bookmarks, and prayer-rule check-offs travel as their own rows.
 If you sign in with Google or Apple, we additionally store an
 <code className="font-mono text-[14px] text-paper/70"> identities </code>
 row linking your account to that provider; we never see your
 Google/Apple password, only the OAuth token.
 </p>
 <p className="mt-3 font-sans text-[12.5px] text-paper/55 leading-[1.55]">
 To delete the account and every server-side row it created,
 use the &ldquo;Delete account&rdquo; button on /account. The
 deletion is immediate and cascades.
 </p>
 </div>
 </div>
 <p className="mt-5 font-serif text-[17px] text-paper/80 leading-[1.7]">
 If you upgrade from a local profile to a public account, your
 existing highlights, notes, and bookmarks are pushed to your
 account on first sign-in. Prayer streaks, reader preferences, and
 calendar style stay on this device only, they have no server
 table yet.
 </p>
 <p className="mt-3 font-serif text-[17px] text-paper/80 leading-[1.7]">
 Nothing in either path is sold, shared, or used to train models.
 The analytics described below are separate from both: they record
 page views in aggregate, without your account identity, whether you
 are signed in or not.
 </p>

 {/* What we record */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 What we record
 </p>
 <p className="mt-3 font-serif text-[17px] text-paper/85 leading-[1.7]">
 The only thing the site records about a visit is an anonymous,
 ephemeral session, used for the small &ldquo;who is reading
 right now&rdquo; view that helps us understand whether the work
 is finding anyone. From your browser, on every page load:
 </p>
 <ul className="mt-3 space-y-2 font-serif text-[18px] text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 A random <em>session id</em> the browser generates on first
 visit, kept in <code>sessionStorage</code> for the tab&rsquo;s
 lifetime, never persisted across browser restarts.
 </li>
 <li>
 The <em>path</em> of the page you visited (e.g.
 <code>/bible/john/1</code>). Never query strings, never form
 inputs.
 </li>
 <li>
 The <em>referrer</em>, if your browser sent one, so we can
 see when a link from elsewhere brought someone in.
 </li>
 </ul>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 On the server, when a session is first seen, we additionally
 derive and store:
 </p>
 <ul className="mt-3 space-y-2 font-serif text-[18px] text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 Your <em>user-agent</em> string (browser + OS), truncated to
 300 characters. Used to tell phones from desktops in aggregate.
 </li>
 <li>
 A <em>coarse, city-level geolocation</em>, country,
 region, city, and the city&rsquo;s rough lat/long ,
 derived from your request IP via <a
 href="https://ipwho.is/"
 target="_blank"
 rel="noopener noreferrer"
 className="text-[#a4adff] hover:text-paper underline underline-offset-2"
 >ipwho.is</a>. Your IP itself is <em>not</em> stored; only the
 city-level fields above are.
 </li>
 <li>
 Your browser&rsquo;s declared <em>primary language tag</em>
 (the first entry of the <code>Accept-Language</code> header
 with any region subtag stripped, e.g. &ldquo;es&rdquo; or
 &ldquo;ru&rdquo;). Used only to decide which UI translations
 to prioritize; nothing finer-grained than the country we
 already keep is retained.
 </li>
 </ul>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 If you sign in to sync your highlights and bookmarks, Supabase
 stores the email address you signed in with and the rows you
 create (highlights, notes, prayer-rule check-offs, bookmarks).
 None of that is joined to the anonymous session above; the two
 sit in separate tables and are not correlated.
 </p>

 {/* What we don't */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 What we don&rsquo;t
 </p>
 <ul className="mt-3 space-y-3 font-serif text-[18px] text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>No third-party advertising. No ad SDKs, no ad cookies.</li>
 <li>No behavioral profile, no cross-site tracking, no fingerprinting.</li>
 <li>No sale or sharing of any user data with any third party.</li>
 <li>
 No email newsletter, no push notifications, no &ldquo;come
 back&rdquo; campaigns. The site doesn&rsquo;t reach out to you.
 </li>
 <li>
 No analytics joined to your account identity. The signed-in
 sync data and the anonymous visit data live in different tables
 and are never linked.
 </li>
 <li>
 No use of your reading to train a language model. The licensed
 Scripture licenses prohibit it, and our{" "}
 <Link
 href="/robots.txt"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 robots policy
 </Link>{" "}
 blocks the named AI crawlers from the whole site.
 </li>
 </ul>

 {/* Where it lives */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 Where it lives
 </p>
 <p className="mt-3 font-serif text-[17px] text-paper/85 leading-[1.7]">
 All session and pageview rows are written to a Supabase Postgres
 database we control, in two tables: <code>analytics_sessions</code>{" "}
 (one row per session, with the coarse geo + user-agent) and{" "}
 <code>analytics_pageviews</code> (one row per page load, linking
 a session id to a path). Writes happen server-side with a
 service-role key; nothing analytics-related is exposed to the
 browser. A small admin page lets us see the live counts; it is
 the only reader.
 </p>

 {/* Retention */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 How long we keep it
 </p>
 <p className="mt-3 font-serif text-[17px] text-paper/85 leading-[1.7]">
 Anonymous session and pageview rows older than 90 days are
 deleted by a scheduled job. Sync data tied to your account
 (highlights, bookmarks, etc.) is kept as long as your account
 exists; deleting your account from{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 removes those rows.
 </p>

 {/* Third parties */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 Third parties the site touches
 </p>
 <ul className="mt-3 space-y-3 font-serif text-[18px] text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong>Supabase</strong>, hosted Postgres and auth. Stores
 your sync data and the anonymous analytics tables.
 </li>
 <li>
 <strong>Render</strong>, web hosting. Sees the same HTTP
 request traffic any host would.
 </li>
 <li>
 <strong>API.Bible</strong> (American Bible Society), when
 you read the NKJV, NIV, or NLT, we fetch that single chapter
 from API.Bible at request time and emit the publisher&rsquo;s
 FUMS usage token they require us to send. Public-domain
 translations (KJV, Brenton LXX) never touch this. See{" "}
 <Link
 href="/about"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /about
 </Link>{" "}
 for the licensing detail.
 </li>
 <li>
 <strong>ipwho.is</strong>, free, server-side IP&rarr;city
 lookup, used only on the first hit of an anonymous session, then
 cached server-side for six hours so the IP isn&rsquo;t looked up
 again.
 </li>
 <li>
 <strong>Buy Me a Coffee</strong>, only on{" "}
 <Link
 href="/support"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /support
 </Link>{" "}
 when you choose to donate. Their checkout collects whatever
 they collect from a donor; the site receives a webhook that
 records the donation total, not your identity.
 </li>
 <li>
 <strong>Discord</strong>, an external link, not embedded.
 No Discord code runs on Purify.
 </li>
 </ul>

 {/* AI bots */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 The AI-crawler policy
 </p>
 <p className="mt-3 font-serif text-[17px] text-paper/85 leading-[1.7]">
 The licensed-Scripture publishers require that we don&rsquo;t let
 their text be ingested into language-model training corpora, and
 we extend the same posture to the patristic and public-domain
 work. <Link
 href="/robots.txt"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >Our robots file</Link>{" "}
 disallows the twenty-two named AI crawlers we know about ,
 GPTBot, OAI-SearchBot, ChatGPT-User, CCBot, Google-Extended,
 anthropic-ai, ClaudeBot, Claude-Web, PerplexityBot,
 Applebot-Extended, Bytespider, Amazonbot, Meta-ExternalAgent,
 cohere-ai, Diffbot, FacebookBot, YouBot, Timpi, MistralAI-User,
 DuckAssistBot, Scrapy, and PanguBot, from the entire site.
 We&rsquo;ll add others as we learn about them.
 </p>

 {/* Browser storage */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 What lives in your browser
 </p>
 <p className="mt-3 font-serif text-[17px] text-paper/85 leading-[1.7]">
 If you aren&rsquo;t signed in, your reader preferences (font,
 size, translation choice), your bookmarks, and any streak counters
 are kept in your browser&rsquo;s <code>localStorage</code> on
 this device. They never leave it. Clear your site data and they
 reset; we have no copy.
 </p>

 {/* Changes */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 Changes to this page
 </p>
 <p className="mt-3 font-serif text-[17px] text-paper/85 leading-[1.7]">
 If we change what is recorded, or add a third party that sees
 your traffic, this page is updated first and the change is
 listed in the next{" "}
 <Link
 href="/whats-new"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /whats-new
 </Link>{" "}
 letter. We won&rsquo;t change the posture quietly.
 </p>

 {/* Offline cache */}
 <h2 className="mt-16 font-sans text-[24px] md:text-[28px] font-bold text-paper leading-[1.15]">
 Offline cache (the service worker)
 </h2>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 If you add Purify to your home screen, a small service worker
 (<code className="font-mono text-[15px] text-paper/70">/sw.js</code>)
 caches the pages and assets you&rsquo;ve already visited so the
 app keeps working on a bad signal. Caches are named
 {" "}<code className="font-mono text-[15px] text-paper/70">purify-v*-html</code>,
 {" "}<code className="font-mono text-[15px] text-paper/70">purify-v*-static</code>,
 and {" "}<code className="font-mono text-[15px] text-paper/70">purify-v*-assets</code>.
 They store only public, public-domain page HTML, the Next.js
 build output, fonts, saint icons, and the manifest. Authenticated
 API calls (Supabase, our analytics endpoint, the licensed
 translation API) are never intercepted and never cached, so your
 session stays on the network where it belongs.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 To clear the cache, uninstall the home-screen app, or in your
 browser settings, clear site data for the Purify origin. We can
 also bump the cache version on a release, which evicts the old
 caches automatically the next time the app opens.
 </p>

 {/* Closing */}
 <div className="mt-16 pt-10 border-t border-paper/10">
 <p className="font-serif text-[17px] text-paper/65 leading-[1.7]">
 Questions, corrections, or a privacy concern? Write to{" "}
 <a
 href="mailto:team@purify.app"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 team@purify.app
 </a>{" "}
 and we&rsquo;ll get back to you.
 </p>
 </div>
 </article>
 </section>
 );
}
