import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";

export const metadata = {
 title: "Privacy",
 description:
 "What Purify records, what we don't, where it lives, how long we keep it, and the third parties involved.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export default async function PrivacyPage() {
 const locale = await getServerLocale();
 if (locale === "de") return <PrivacyDe />;
 const m = getMessages(locale);
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <TranslationDisclaimer />
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {t(m, "privacy.eyebrow")}
 </p>
 <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {t(m, "privacy.h1")}
 </h1>
 <p className="mt-6 font-serif text-body text-paper/65 leading-[1.7]">
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
 <h2 className="mt-12 font-sans text-title-sm md:text-title font-bold text-paper leading-[1.15]">
 On this device vs signed in
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Purify works privately on this device with no account; signing in
 exists to keep your reading synchronized across devices. When you
 open{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 you pick one of the two paths. Neither is the default; the choice
 is presented plainly.
 </p>
 <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="rounded-md border border-paper/12 bg-paper/[0.02] p-5">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
 On this device (no account)
 </p>
 <p className="font-serif text-body text-paper/85 leading-[1.65]">
 Highlights, notes, bookmarks, your prayer streak, and reader
 preferences (font, size) are stored in your browser&rsquo;s{" "}
 <code className="font-mono text-ui text-paper/70">localStorage</code>.
 We do not see or receive any of it. There is no row for you in
 our database. The trade-off: it lives on this device only, and
 goes away if you clear browser data.
 </p>
 <p className="mt-3 font-sans text-caption text-paper/55 leading-[1.55]">
 To remove the name you claimed on this device, open /account
 and click &ldquo;Remove this name.&rdquo; To wipe all local
 data, clear site data for this origin in your browser settings.
 </p>
 </div>
 <div className="rounded-md border border-gold/30 bg-gold/[0.04] p-5">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold mb-2">
 Signed in (synchronized)
 </p>
 <p className="font-serif text-body text-paper/85 leading-[1.65]">
 The same items go to our Supabase Postgres database so they
 sync across every device you sign in on. We store: your email
 (used to sign you in and to send confirmations on
 password/email changes), an Argon2 hash of your password
 (never the password itself), a display name, and a
 <code className="font-mono text-ui text-paper/70"> profiles </code>
 row with your account creation date plus a boolean flag for
 whether you&rsquo;ve set a password. Highlights, notes,
 bookmarks, and prayer-rule check-offs travel as their own rows.
 If you sign in with Google or Apple, we additionally store an
 <code className="font-mono text-ui text-paper/70"> identities </code>
 row linking your account to that provider; we never see your
 Google/Apple password, only the OAuth token.
 </p>
 <p className="mt-3 font-sans text-caption text-paper/55 leading-[1.55]">
 To delete the account and every server-side row it created,
 use the &ldquo;Delete account&rdquo; button on /account. The
 deletion is immediate and cascades.
 </p>
 </div>
 </div>
 <p className="mt-5 font-serif text-body text-paper/80 leading-[1.7]">
 If you start on this device and later sign in, your existing
 highlights, notes, and bookmarks are pushed to your account on
 first sign-in; nothing on the device is removed. Prayer streaks,
 reader preferences, and calendar style stay on this device only,
 they have no server table yet. Signing out never deletes what is
 saved on the device.
 </p>
 <p className="mt-3 font-serif text-body text-paper/80 leading-[1.7]">
 Nothing in either path is sold, shared, or used to train models.
 The analytics described below are separate from both: they record
 page views in aggregate, without your account identity, whether you
 are signed in or not.
 </p>

 {/* What we record */}
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 What we record
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 The only thing the site records about a visit is an anonymous,
 ephemeral session, used for the small &ldquo;who is reading
 right now&rdquo; view that helps us understand whether the work
 is finding anyone. From your browser, on every page load:
 </p>
 <ul className="mt-3 space-y-2 font-serif text-lede text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
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
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 On the server, when a session is first seen, we additionally
 derive and store:
 </p>
 <ul className="mt-3 space-y-2 font-serif text-lede text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
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
 className="text-link hover:text-paper underline underline-offset-2"
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
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 If you sign in to sync your highlights and bookmarks, Supabase
 stores the email address you signed in with and the rows you
 create (highlights, notes, prayer-rule check-offs, bookmarks).
 None of that is joined to the anonymous session above; the two
 sit in separate tables and are not correlated.
 </p>

 {/* What we don't */}
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 What we don&rsquo;t
 </p>
 <ul className="mt-3 space-y-3 font-serif text-lede text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
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
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Where it lives
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
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
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 How long we keep it
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
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
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Third parties the site touches
 </p>
 <ul className="mt-3 space-y-3 font-serif text-lede text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
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
 <li>
 <strong>Amazon Associates</strong>, when a Licensed Works
 entry on a saint profile or elsewhere links to a book on
 amazon.com, the link carries our affiliate tag. Purify
 participates in the Amazon Associates program and may
 earn a commission on qualifying purchases. Amazon receives
 nothing from us about your identity; what they collect from
 your click is governed by their own policy.
 </li>
 </ul>

 {/* Prayer features — what's local, what's synced */}
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 The prayer features
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 The morning and evening rules, the prayer rope, the Jesus
 Prayer lessons, and the diptychs are all local-first. By default
 every count, every check-off, every name on your diptych lives
 in your browser&rsquo;s <code>localStorage</code> on this device
 and never reaches us. Specifically:
 </p>
 <ul className="mt-3 space-y-2 font-serif text-lede text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <em>Rule completions</em>: the dates you finished the morning
 or evening rule, kept under{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.prayers.&#123;ruleId&#125;.dates
 </code>{" "}
 (a rolling 30-day list, no streak integer).
 </li>
 <li>
 <em>Prayer rope sessions</em>: each session&rsquo;s knot count
 and the prayer line you chose, under{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.rope.sessions
 </code>.
 </li>
 <li>
 <em>Diptychs</em>: the lists of those for whom you pray (living
 + reposed), under{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.intentions.living
 </code>{" "}
 and{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.intentions.departed
 </code>. These are plain JSON in your browser; we are not
 pretending they are encrypted at rest.
 </li>
 <li>
 <em>Push reminders (opt-in)</em>: if you turn on prayer
 reminders in /account, the browser&rsquo;s native Web Push API
 negotiates a subscription endpoint with your push service
 (Google for Chrome / Firefox / Edge; Mozilla for Firefox on
 Linux; Apple for Safari). We store that endpoint, the keys it
 returned, and the two times you picked, in a{" "}
 <code className="font-mono text-ui text-paper/70">
 push_subscriptions
 </code>{" "}
 table. We do not send notification content through any third
 party; the payload is signed with our VAPID key directly from
 our server. Turn it off at any time on the same page.
 </li>
 </ul>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 If you sign in, the same shapes mirror to
 four Supabase tables &mdash;{" "}
 <code className="font-mono text-ui text-paper/70">prayer_completions</code>,{" "}
 <code className="font-mono text-ui text-paper/70">intentions_living</code>,{" "}
 <code className="font-mono text-ui text-paper/70">intentions_departed</code>,{" "}
 <code className="font-mono text-ui text-paper/70">rope_sessions</code>{" "}
 &mdash; so the data follows you across devices. Each has the
 same row-level lock as bookmarks and annotations (your rows only
 visible to your <code>auth.uid()</code>). They are never joined to
 the anonymous analytics tables.
 </p>

 {/* AI bots */}
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 The AI-crawler policy
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
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
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 What lives in your browser
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 If you aren&rsquo;t signed in, your reader preferences (font,
 size, translation choice), your bookmarks, and any streak counters
 are kept in your browser&rsquo;s <code>localStorage</code> on
 this device. They never leave it. Clear your site data and they
 reset; we have no copy.
 </p>

 {/* Changes */}
 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Changes to this page
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
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
 <h2 className="mt-16 font-sans text-title-sm md:text-title font-bold text-paper leading-[1.15]">
 Offline cache (the service worker)
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 If you add Purify to your home screen, a small service worker
 (<code className="font-mono text-ui text-paper/70">/sw.js</code>)
 caches the pages and assets you&rsquo;ve already visited so the
 app keeps working on a bad signal. Caches are named
 {" "}<code className="font-mono text-ui text-paper/70">purify-v*-html</code>,
 {" "}<code className="font-mono text-ui text-paper/70">purify-v*-static</code>,
 and {" "}<code className="font-mono text-ui text-paper/70">purify-v*-assets</code>.
 They store only public, public-domain page HTML, the Next.js
 build output, fonts, saint icons, and the manifest. Authenticated
 API calls (Supabase, our analytics endpoint, the licensed
 translation API) are never intercepted and never cached, so your
 session stays on the network where it belongs.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 To clear the cache, uninstall the home-screen app, or in your
 browser settings, clear site data for the Purify origin. We can
 also bump the cache version on a release, which evicts the old
 caches automatically the next time the app opens.
 </p>

 {/* Closing */}
 <div className="mt-16 pt-10 border-t border-paper/10">
 <p className="font-serif text-body text-paper/65 leading-[1.7]">
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

function PrivacyDe() {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 Datenschutz
 </p>
 <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 Was wir aufzeichnen und was nicht.
 </h1>
 <p className="mt-6 font-serif text-body text-paper/65 leading-[1.7]">
 Die Kurzfassung steht auf der{" "}
 <Link
 href="/about"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 Über-Seite
 </Link>
 . Diese hier ist die Langfassung: jedes Feld, das wir aufzeichnen,
 jeder Ort, wohin es geht, jeder Dritte, den die Seite berührt, und
 wie lange wir etwas davon aufbewahren. Wenn etwas hier falsch ist,
 schreib uns; wir bringen es in Ordnung.
 </p>

 <h2 className="mt-12 font-sans text-title-sm md:text-title font-bold text-paper leading-[1.15]">
 Lokales Profil gegen öffentliches Konto
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Wenn du{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 öffnest, wählst du einen von zwei Wegen. Keiner ist voreingestellt;
 die Wahl wird schlicht vorgelegt.
 </p>
 <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="rounded-md border border-paper/12 bg-paper/[0.02] p-5">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
 Lokales Profil
 </p>
 <p className="font-serif text-body text-paper/85 leading-[1.65]">
 Markierungen, Notizen, Lesezeichen, deine Gebets-Strähne und die
 Lese-Einstellungen (Schrift, Größe) werden im{" "}
 <code className="font-mono text-ui text-paper/70">localStorage</code>{" "}
 deines Browsers gespeichert. Wir sehen oder empfangen nichts
 davon. Es gibt keine Zeile für dich in unserer Datenbank. Der
 Tausch: es lebt nur auf diesem Gerät und geht weg, wenn du
 Browserdaten löschst.
 </p>
 <p className="mt-3 font-sans text-caption text-paper/55 leading-[1.55]">
 Um ein lokales Profil aufzulösen, öffne /account und klicke auf
 &bdquo;Dieses lokale Profil aufgeben&ldquo;. Um alle lokalen
 Daten zu löschen, lösche die Seitendaten für diese Herkunft in
 deinen Browser-Einstellungen.
 </p>
 </div>
 <div className="rounded-md border border-gold/30 bg-gold/[0.04] p-5">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold mb-2">
 Öffentliches Konto
 </p>
 <p className="font-serif text-body text-paper/85 leading-[1.65]">
 Dieselben Posten gehen in unsere Supabase-Postgres-Datenbank,
 damit sie sich auf jedem Gerät abgleichen, auf dem du dich
 anmeldest. Wir speichern: deine E-Mail (um dich anzumelden und
 um Bestätigungen bei Paßwort- oder E-Mail-Änderungen zu
 senden), einen Argon2-Hash deines Paßworts (nie das Paßwort
 selbst), einen Anzeigenamen und eine{" "}
 <code className="font-mono text-ui text-paper/70">profiles</code>{" "}
 -Zeile mit dem Erstellungsdatum deines Kontos sowie ein
 Boolesches Kennzeichen, ob du ein Paßwort gesetzt hast.
 Markierungen, Notizen, Lesezeichen und
 Gebetsregel-Abhakungen wandern als eigene Zeilen. Wenn du dich
 mit Google oder Apple anmeldest, speichern wir zusätzlich eine{" "}
 <code className="font-mono text-ui text-paper/70">identities</code>{" "}
 -Zeile, die dein Konto mit jenem Anbieter verbindet; wir sehen
 nie dein Google- oder Apple-Paßwort, nur das OAuth-Token.
 </p>
 <p className="mt-3 font-sans text-caption text-paper/55 leading-[1.55]">
 Um das Konto und jede serverseitige Zeile, die es geschaffen
 hat, zu löschen, benutze die Schaltfläche &bdquo;Konto
 löschen&ldquo; auf /account. Die Löschung ist sofort und
 wirkt kaskadierend.
 </p>
 </div>
 </div>
 <p className="mt-5 font-serif text-body text-paper/80 leading-[1.7]">
 Wenn du von einem lokalen Profil zu einem öffentlichen Konto
 wechselst, werden deine bestehenden Markierungen, Notizen und
 Lesezeichen bei der ersten Anmeldung in dein Konto geschoben.
 Gebets-Strähnen, Lese-Einstellungen und Kalenderstil bleiben nur
 auf diesem Gerät; sie haben noch keine Servertabelle.
 </p>
 <p className="mt-3 font-serif text-body text-paper/80 leading-[1.7]">
 Nichts auf beiden Wegen wird verkauft, geteilt oder zum Training
 von Modellen gebraucht. Die unten beschriebene Analytik ist von
 beiden getrennt: sie zeichnet Seitenaufrufe in Summe auf, ohne
 deine Konto-Identität, ob du angemeldet bist oder nicht.
 </p>

 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Was wir aufzeichnen
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 Das Einzige, was die Seite über einen Besuch aufzeichnet, ist eine
 anonyme, vergängliche Sitzung, die für die kleine &bdquo;Wer liest
 gerade jetzt&ldquo;-Ansicht gebraucht wird, die uns hilft zu
 verstehen, ob die Arbeit jemanden findet. Vom Browser, bei jedem
 Seitenaufruf:
 </p>
 <ul className="mt-3 space-y-2 font-serif text-lede text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 Eine zufällige <em>Sitzungs-Kennung</em>, die der Browser beim
 ersten Besuch erzeugt, in <code>sessionStorage</code> für die
 Lebenszeit des Tabs gehalten, nie über Browser-Neustarts
 hinweg behalten.
 </li>
 <li>
 Der <em>Pfad</em> der besuchten Seite (z. B.{" "}
 <code>/bible/john/1</code>). Niemals Suchparameter, niemals
 Formulareingaben.
 </li>
 <li>
 Der <em>Verweiser</em>, falls dein Browser einen gesandt hat,
 damit wir sehen können, wenn ein Verweis von anderswo jemanden
 hereingebracht hat.
 </li>
 </ul>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Auf dem Server leiten wir zusätzlich, wenn eine Sitzung erstmals
 gesehen wird, ab und speichern:
 </p>
 <ul className="mt-3 space-y-2 font-serif text-lede text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 Deinen <em>User-Agent</em>-String (Browser + Betriebssystem),
 auf 300 Zeichen gekürzt. Wird benutzt, um Telefone von Desktops
 in Summe zu unterscheiden.
 </li>
 <li>
 Eine <em>grobe, städtische Verortung</em>, Land, Region,
 Stadt und die ungefähre geographische Lage der Stadt,,
 hergeleitet aus deiner Anfrage-IP über{" "}
 <a
 href="https://ipwho.is/"
 target="_blank"
 rel="noopener noreferrer"
 className="text-link hover:text-paper underline underline-offset-2"
 >
 ipwho.is
 </a>
 . Deine IP selbst wird <em>nicht</em> gespeichert; nur die
 städtischen Felder oben.
 </li>
 <li>
 Das von deinem Browser erklärte{" "}
 <em>primäre Sprach-Etikett</em> (der erste Eintrag im{" "}
 <code>Accept-Language</code>-Header, jedes Regionsuntereintrag
 entfernt, z. B. &bdquo;es&ldquo; oder &bdquo;ru&ldquo;). Wird
 nur gebraucht, um zu entscheiden, welche UI-Übersetzungen
 vorzuziehen sind; nichts Feinkörnigeres als das Land, das wir
 bereits halten, wird behalten.
 </li>
 </ul>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Wenn du dich anmeldest, um deine Markierungen und Lesezeichen
 abzugleichen, speichert Supabase die E-Mail-Adresse, mit der du
 dich angemeldet hast, sowie die Zeilen, die du erstellst
 (Markierungen, Notizen, Gebetsregel-Abhakungen, Lesezeichen).
 Nichts davon wird mit der anonymen Sitzung oben verknüpft; die
 beiden liegen in getrennten Tabellen und werden nicht in Beziehung
 gesetzt.
 </p>

 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Was wir nicht tun
 </p>
 <ul className="mt-3 space-y-3 font-serif text-lede text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>Keine Drittwerbung. Keine Werbe-SDKs, keine Werbe-Cookies.</li>
 <li>
 Kein Verhaltensprofil, keine seitenübergreifende Verfolgung,
 kein Fingerabdruck.
 </li>
 <li>Kein Verkauf oder Teilen irgendwelcher Nutzerdaten mit Dritten.</li>
 <li>
 Kein E-Mail-Rundbrief, keine Push-Mitteilungen, keine
 &bdquo;Komm zurück&ldquo;-Kampagnen. Die Seite reicht nicht zu
 dir hinaus.
 </li>
 <li>
 Keine Analytik, die mit deiner Konto-Identität verknüpft wird.
 Die angemeldeten Abgleichsdaten und die anonymen Besuchsdaten
 leben in verschiedenen Tabellen und werden nie verbunden.
 </li>
 <li>
 Keine Nutzung deines Lesens zum Trainieren eines Sprachmodells.
 Die lizenzierten Schrift-Lizenzen verbieten es, und unsere{" "}
 <Link
 href="/robots.txt"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 Robots-Regel
 </Link>{" "}
 sperrt die genannten KI-Crawler von der ganzen Seite aus.
 </li>
 </ul>

 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Wo es wohnt
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 Alle Sitzungs- und Seitenaufrufzeilen werden in eine
 Supabase-Postgres-Datenbank geschrieben, die wir verwalten, in
 zwei Tabellen: <code>analytics_sessions</code> (eine Zeile je
 Sitzung, mit der groben Verortung und dem User-Agent) und{" "}
 <code>analytics_pageviews</code> (eine Zeile je Seitenaufruf, die
 eine Sitzungs-Kennung mit einem Pfad verbindet). Schreibvorgänge
 geschehen serverseitig mit einem Service-Role-Schlüssel; nichts,
 was die Analytik betrifft, wird dem Browser ausgesetzt. Eine
 kleine Admin-Seite läßt uns die Live-Zahlen sehen; sie ist die
 einzige Leserin.
 </p>

 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Wie lange wir es behalten
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 Anonyme Sitzungs- und Seitenaufruf-Zeilen, die älter als 90 Tage
 sind, werden von einem geplanten Auftrag gelöscht. Abgleichsdaten,
 die an dein Konto gebunden sind (Markierungen, Lesezeichen usw.),
 werden so lange behalten, wie dein Konto besteht; die Löschung
 deines Kontos von{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 entfernt diese Zeilen.
 </p>

 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Dritte, die die Seite berührt
 </p>
 <ul className="mt-3 space-y-3 font-serif text-lede text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong>Supabase</strong>, gehostetes Postgres und Auth.
 Speichert deine Abgleichsdaten und die anonymen
 Analytik-Tabellen.
 </li>
 <li>
 <strong>Render</strong>, Webhosting. Sieht denselben
 HTTP-Anfrageverkehr, den jeder Hoster sieht.
 </li>
 <li>
 <strong>API.Bible</strong> (American Bible Society),
 wenn du die NKJV, NIV oder NLT liest, holen wir dieses einzelne
 Kapitel zur Anfragezeit von API.Bible und senden das vom Verlag
 verlangte FUMS-Nutzungs-Token. Gemeinfreie Übersetzungen (KJV,
 Brenton-LXX) berühren das nie. Siehe{" "}
 <Link
 href="/about"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /about
 </Link>{" "}
 für die Lizenz-Einzelheiten.
 </li>
 <li>
 <strong>ipwho.is</strong>, freie serverseitige
 IP&rarr;Stadt-Auflösung, nur beim ersten Treffer einer anonymen
 Sitzung gebraucht, danach sechs Stunden lang serverseitig
 zwischengespeichert, damit die IP nicht erneut nachgeschlagen
 wird.
 </li>
 <li>
 <strong>Buy Me a Coffee</strong>, nur auf{" "}
 <Link
 href="/support"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /support
 </Link>
 , wenn du dich zum Spenden entscheidest. Ihre Bezahlseite sammelt,
 was sie von einem Spender sammelt; die Seite empfängt einen
 Webhook, der die Gesamtsumme der Spende aufzeichnet, nicht
 deine Identität.
 </li>
 <li>
 <strong>Discord</strong>, ein externer Verweis, nicht
 eingebettet. Kein Discord-Code läuft auf Purify.
 </li>
 <li>
 <strong>Amazon-Partner-Programm</strong>, wenn ein
 Eintrag der lizenzierten Werke auf einem Heiligen-Profil oder
 anderswo auf ein Buch bei amazon.com verweist, trägt der
 Verweis unsere Partner-Kennung. Purify nimmt am
 Amazon-Partner-Programm teil und kann an qualifizierten Käufen
 eine Provision verdienen. Amazon empfängt von uns nichts über
 deine Identität; was sie aus deinem Klick erheben, regelt ihre
 eigene Richtlinie.
 </li>
 </ul>

 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Die KI-Crawler-Regel
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 Die Verleger der lizenzierten Schrift verlangen, daß ihr Text
 nicht in Trainings-Korpora für Sprachmodelle eingespeist wird,
 und wir dehnen dieselbe Haltung auf die patristische und gemeinfreie
 Arbeit aus.{" "}
 <Link
 href="/robots.txt"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 Unsere Robots-Datei
 </Link>{" "}
 sperrt die zweiundzwanzig namentlich bekannten KI-Crawler aus
 der ganzen Seite aus, GPTBot, OAI-SearchBot, ChatGPT-User,
 CCBot, Google-Extended, anthropic-ai, ClaudeBot, Claude-Web,
 PerplexityBot, Applebot-Extended, Bytespider, Amazonbot,
 Meta-ExternalAgent, cohere-ai, Diffbot, FacebookBot, YouBot,
 Timpi, MistralAI-User, DuckAssistBot, Scrapy und PanguBot. Wir
 fügen weitere hinzu, sobald wir von ihnen erfahren.
 </p>

 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Was in deinem Browser wohnt
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 Wenn du nicht angemeldet bist, werden deine Lese-Einstellungen
 (Schrift, Größe, Übersetzungswahl), deine Lesezeichen und alle
 Strähnen-Zähler im <code>localStorage</code> deines Browsers auf
 diesem Gerät gehalten. Sie verlassen es nie. Lösche deine
 Seitendaten, und sie setzen sich zurück; wir haben keine Kopie.
 </p>

 <p className="mt-10 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
 Änderungen an dieser Seite
 </p>
 <p className="mt-3 font-serif text-body text-paper/85 leading-[1.7]">
 Wenn wir ändern, was aufgezeichnet wird, oder einen Dritten
 hinzufügen, der deinen Verkehr sieht, wird diese Seite zuerst
 aktualisiert und die Änderung im nächsten{" "}
 <Link
 href="/whats-new"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /whats-new
 </Link>
 -Brief aufgeführt. Wir ändern die Haltung nicht im stillen.
 </p>

 <h2 className="mt-16 font-sans text-title-sm md:text-title font-bold text-paper leading-[1.15]">
 Offline-Zwischenspeicher (der Service-Worker)
 </h2>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Wenn du Purify auf deinen Startbildschirm legst, speichert ein
 kleiner Service-Worker (
 <code className="font-mono text-ui text-paper/70">/sw.js</code>
 ) die bereits besuchten Seiten und Anlagen zwischen, damit die
 App bei schlechtem Signal weiterläuft. Die Zwischenspeicher heißen{" "}
 <code className="font-mono text-ui text-paper/70">purify-v*-html</code>,{" "}
 <code className="font-mono text-ui text-paper/70">purify-v*-static</code>{" "}
 und{" "}
 <code className="font-mono text-ui text-paper/70">purify-v*-assets</code>.
 Sie speichern nur öffentliches, gemeinfreies Seiten-HTML, die
 Next.js-Bauausgabe, Schriften, Heiligen-Ikonen und das Manifest.
 Authentifizierte API-Aufrufe (Supabase, unser Analytik-Endpunkt,
 die lizenzierte Übersetzungs-API) werden nie abgefangen und nie
 zwischengespeichert, damit deine Sitzung im Netz bleibt, wo sie
 hingehört.
 </p>
 <p className="mt-4 font-serif text-body text-paper/85 leading-[1.7]">
 Um den Zwischenspeicher zu leeren, deinstalliere die
 Startbildschirm-App, oder lösche in deinen Browser-Einstellungen
 die Seitendaten für die Purify-Herkunft. Wir können auch die
 Cache-Version bei einer Veröffentlichung erhöhen, was die alten
 Zwischenspeicher beim nächsten Öffnen der App automatisch
 räumt.
 </p>

 <div className="mt-16 pt-10 border-t border-paper/10">
 <p className="font-serif text-body text-paper/65 leading-[1.7]">
 Fragen, Korrekturen oder ein Datenschutz-Anliegen? Schreib an{" "}
 <a
 href="mailto:team@purify.app"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 team@purify.app
 </a>
 , und wir melden uns bei dir.
 </p>
 </div>
 </article>
 </section>
 );
}
