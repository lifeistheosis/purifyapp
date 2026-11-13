// The page that shows the email look (index.html, written by build.mjs).
// Its own colours are the kit's Dark and its clean light, handed over by build.mjs as
// it read them from the kit's tokens; its faces are named, never fetched. The emails it
// shows are Dark on every screen (round 3).

const tokens = (w) => `--ground:${w.ground};--raised:${w.raised};--ink:${w.ink};--body:${w.body};--quiet:${w.quiet};--line:${w.line};--rule:${w.rule}`;

const shot = (file, caption, alt) =>
  `<figure><img src="shots/${file}" width="390" loading="lazy" alt="${alt}"><figcaption>${caption}</figcaption></figure>`;

const CONTENT = `
<main>
<header>
  <p class="small">docs/brand/kit/email &middot; 13 November 2026</p>
  <h1>The Purify email look</h1>
  <p class="lede">One look for every email Purify sends, drawn from the app itself and made for a phone first, with its first season: the Nativity Fast, which begins on 15 November. Every email is in the app's default colours, on every screen. No parchment.</p>
  <span class="rule"></span>
</header>

<section>
  <h2>The reader email</h2>
  <p>The Sunday email is the sample. The same pieces carry the monthly note and a release letter. It opens the way a chapter opens in the app: a centred title, a line under it, the short rule. The week is set as a leaf of the calendar, the day in the margin and the name beside it. The week's saint stands as Today's card stands, with the app's own button. It is one column at a phone's width, and every button and link is 44 tall.</p>
  <div class="row">
    ${shot("reader.dark.png", "Dark, the app's own default, on every screen", "The reader email: the masthead, the title The week ahead, five days of the calendar, and the week's saint on a raised card with one button.")}
  </div>
</section>

<section>
  <h2>In the Nativity Fast</h2>
  <p>From 15 November to 24 December the same email, in the same default colours, opens on the night of the app's own Nativity card. The star stands a little higher each day of the fast, so each of the six Sunday emails shows it higher than the last. Each day says its fast in the calendar's own words, and one line opens the path for the fast.</p>
  <div class="row">
    ${shot("reader-nativity-fast.dark.png", "In the fast, the same default colours", "The season's email: a night sky with a star just above the horizon, the line Nativity Fast, day 1 of 40, and each day of the week with its fast.")}
    ${shot("reader-nativity-fast.no-pictures.png", "With every picture blocked", "The season's email with no pictures shown: the wordmark, the words that say what the star does, and every line of the email are still there.")}
  </div>
</section>

<section>
  <h2>The owner's brief</h2>
  <p>The same look, for the one reader it is made for. What needs him comes first. Three figures, then three small charts drawn in the email itself with table cells: seven days of visitors, money in by source in the money chart's own colours, and what was opened most. A mail client runs no script, so every number a chart needs is also said in words. A figure that could not be read says so. Every figure shown here is a sample, made up for the drawing.</p>
  <div class="row">
    ${shot("brief.dark.png", "Dark", "The owner's brief: what needs him, three figures, a chart of seven days, money in by source, what was opened most, and what goes out today.")}
  </div>
</section>

<section>
  <h2>Why it looks this way</h2>
  <p>Each choice, its reason, and what it does for the reader. Yes or no is yours.</p>
  __WHY__
</section>

<section>
  <h2>What is the app's own</h2>
  <div class="scroll"><table>
    <thead><tr><th>In the email</th><th>Where the app has it</th></tr></thead>
    <tbody>
      <tr><td>Every colour</td><td>The design kit's tokens (docs/brand/kit/tokens.css), and the app's stylesheet for what the kit does not carry. Read when the emails are built. None is typed in.</td></tr>
      <tr><td>One palette</td><td>Dark, the app's default, on a dark screen and on a light one, in a fast and out of it. Never parchment.</td></tr>
      <tr><td>The cross and the wordmark</td><td>public/purify-cross-mark.png.</td></tr>
      <tr><td>The opening: title, line, short rule</td><td>A chapter's head in the reader (the page-open pieces).</td></tr>
      <tr><td>The saint's card and its button</td><td>Today's card, and the saint's own picture from the library.</td></tr>
      <tr><td>The night and its star</td><td>The Nativity card on Today, by its own numbers (lib/reading/nativityStar.ts).</td></tr>
      <tr><td>A feast's mark and each fast's colour</td><td>The calendar's rubric and its fasting registers.</td></tr>
      <tr><td>The brief's three money colours</td><td>The admin panel's money chart.</td></tr>
      <tr><td>The faces</td><td>Lora and DM Sans where a reader has them, Georgia and Arial everywhere else. Named, never fetched.</td></tr>
    </tbody>
  </table></div>
</section>

<section>
  <h2>The check</h2>
  <p>Run with <code>node docs/brand/kit/email/check.mjs</code> on 13 November 2026. All of it passed.</p>
  <div class="scroll"><table>
    <thead><tr><th>What was held</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>checkMock, all fifteen rules, on each of the three emails at 360, 390, 412 and 1032 wide, with its pieces on each of the five palettes, and in Arabic's direction.</td><td>Passed, twelve runs of twelve.</td></tr>
      <tr><td>At each width nothing runs past the screen's edge and no word is cut by its box.</td><td>Passed.</td></tr>
      <tr><td>The file a mail client gets wears Dark piece by piece, on a dark screen and on a light one, and no colour is written in it that is not Dark's own.</td><td>Passed.</td></tr>
      <tr><td>No script, no handler, no stylesheet or font fetched. Every picture has its words.</td><td>Passed.</td></tr>
      <tr><td>No parchment: no email and no page here holds the app's Light paper.</td><td>Passed.</td></tr>
      <tr><td>Each email under 100KB of HTML, so Gmail never clips it, and each picture under 100KB.</td><td>Passed: 12, 14 and 24KB.</td></tr>
      <tr><td>No picture on the heritage list.</td><td>Passed: none of four.</td></tr>
    </tbody>
  </table></div>
  <p>Named allowances: the night is a dark island on every palette, as the card is in the app, and two of the money chart's colours are one on both of the panel's themes.</p>
  <p>Not done here, and still to do before any send: a look in real Gmail, Apple Mail and Outlook, with the phone set light and set dark. These pictures are drawn by a browser, which honours more than Outlook does. A mail app that lightens a dark email by force has not been met; that look would show it. In Outlook on Windows the corners will be square and the faces Georgia and Arial; nothing depends on either.</p>
</section>

<section>
  <h2>For the build</h2>
  <ul>
    <li>The pictures need a home on the main web before a send. In these files they sit in img/ beside the email.</li>
    <li>The night is one picture for each day of the fast. The build script draws any day; only day 1 is drawn so far.</li>
    <li>Each day's fast comes from the calendar the app already has. The Sunday email does not carry it yet.</li>
    <li>The Sunday email now names 20 and 21 November by the saint alone, so both read &ldquo;The Most Holy Theotokos&rdquo;. The sample uses the commemoration's own name. The arbiter has this as a finding.</li>
    <li>Dark is written inline and nothing turns it: the head tells a mail client the email is dark already. The kit's first email template, which was light first, gave way to these files, so the kit holds one email look.</li>
  </ul>
</section>
</main>
`;

const FACES_1 = "--serif:Lora,Georgia,'Times New Roman',serif;--sans:'DM Sans',Arial,Helvetica,sans-serif";
const FACES_2 = "--serif:Georgia,'Noto Serif','Times New Roman',serif;--sans:'Segoe UI',Roboto,-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif";
const style = (D, L, faces = FACES_1) => `
/* One column for words, and each email at a phone's width beside its other scheme. */
:root{${tokens(D)};color-scheme:dark;${faces}}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){${tokens(L)};color-scheme:light}}
:root[data-theme="light"]{${tokens(L)};color-scheme:light}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--body);font-family:var(--serif);font-size:17px;line-height:1.65}
main{max-width:1240px;margin:0 auto;padding-block:48px 72px;padding-left:max(20px, env(safe-area-inset-left, 0px));padding-right:max(20px, env(safe-area-inset-right, 0px))}
header{text-align:center;padding-bottom:20px}
h1{margin:6px 0 0;color:var(--ink);font-weight:400;font-size:clamp(32px,5vw,44px);line-height:1.15;text-wrap:balance}
h2{margin:0;color:var(--ink);font-weight:600;font-size:24px;line-height:1.25}
p{margin:12px 0 0;max-width:68ch}
h3{margin:26px 0 0;color:var(--ink);font-weight:600;font-size:19px;line-height:1.3}
h3+p{margin-top:6px}
.for{color:var(--quiet);font-family:var(--sans);font-size:15px;line-height:22px}
.for .small{display:block;margin:0}
.small,figcaption,th{font-family:var(--sans);font-size:12px;line-height:18px;font-weight:600;color:var(--quiet)}
.small{margin:0 auto}
.lede{margin:14px auto 0;font-style:italic;color:var(--quiet);font-size:19px;line-height:1.5;max-width:52ch}
.rule{display:block;width:28px;height:1px;margin:26px auto 0;background:var(--rule)}
section{margin-top:56px}
.row{display:flex;flex-wrap:wrap;gap:28px 24px;margin-top:24px;align-items:flex-start}
figure{margin:0;flex:0 1 390px;min-width:0}
figure img{display:block;width:100%;max-width:100%;height:auto;border:1px solid var(--line);border-radius:20px}
figcaption{margin-top:10px}
.scroll{overflow-x:auto;margin-top:18px}
table{border-collapse:collapse;width:100%;max-width:900px;font-size:16px;line-height:1.5}
th{text-align:start;padding:0 16px 8px 0;border-bottom:1px solid var(--rule)}
td{padding:11px 16px 11px 0;border-bottom:1px solid var(--line);vertical-align:top}
td:first-child{color:var(--ink);width:44%}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;color:var(--ink)}
ul{margin:16px 0 0;padding-inline-start:20px;max-width:68ch}
li{margin-top:8px}
`;

/** `standalone`: a whole document, for the repository. Otherwise the page alone, as an Artifact takes it. */
const RETENTION = `
<main>
<header>
  <p class="small">Round 3 &middot; 13 November 2026</p>
  <h1>Three emails that bring a reader back</h1>
  <p class="lede">The first week, where you left off, and the fasting companion, designed again at your word. One version of each, in the very words the sending will send. Yes or no to each is yours.</p>
  <span class="rule"></span>
</header>

<section>
  <h2>What changed</h2>
  <ul>
    <li><strong>Each email has a face.</strong> It opens on one night card, as the app's own cards stand on Today: the step's picture from the app, the step as the title at its foot, and the one button.</li>
    <li><strong>Type that holds in a mail app.</strong> Designed in Georgia and each phone's own sans. No web font is waited on, so nothing falls back to Times.</li>
    <li><strong>The app's own button.</strong> A white pill with its arrow, as wide as its words. Unsubscribe is a plain link.</li>
    <li><strong>Nothing said twice.</strong> The first week's steps are one short strip. The fast's week stands as the app's own calendar does: the days across with their marks, what each fast allows, and the feasts on the calendar's card.</li>
    <li><strong>The app's default colours, everywhere.</strong> Round 3, at your word: Dark in every email, on every screen. No Night sky, no light scheme.</li>
    <li><strong>One button in every email.</strong> The fasting companion had two; it keeps one, its reading plan.</li>
    <li><strong>Only true words.</strong> Every word is the sending's own letter, which claims nothing the server cannot know: not that you have not prayed, not that you have been away, not which day of a fast you joined on, not which calendar you keep.</li>
  </ul>
</section>

<section>
  <h2>The first week</h2>
  <p>Three emails for a reader who turned the guide on. Morning prayers opens on the icon of the Resurrection, the picture the app sets on morning prayers. The calendar opens on the app's own calendar, a real screen of 1.9. Bookmarking a verse opens on the icon the app sets behind a shared verse. Under each, the three steps as one strip, this email's under a heavier rule. It names no day, because a step already done is never sent.</p>
  <div class="row">
    ${shot("first-week-1.dark.png", "Morning prayers", "The first email of the first week: a night card that opens on the icon of the Resurrection, with the title Morning prayers and the button Open the morning prayers, then the three steps as a strip.")}
    ${shot("first-week-3.dark.png", "The calendar", "The second email: the app's calendar for December 2026 with New and Old above it, the title The calendar and the button Open Settings.")}
    ${shot("first-week-7.dark.png", "Bookmark a verse", "The third email: the icon of Christ, the title Bookmark a verse, how to do it, and the button Open the Bible.")}
  </div>
</section>

<section>
  <h2>Pick up where you left off</h2>
  <p>The reader's own place is the title, with one small line over it. Its picture is the cover of the book they were reading. One button back to it. It does not say how long they have been away, because the server does not know that, and it is still the shortest email Purify sends.</p>
  <div class="row">
    ${shot("pick-up.dark.png", "Where you were reading", "Pick up where you left off: a night card that opens on the icon of St Paul, with the small line Where you were reading, the title Romans 8 and the button Open Romans 8.")}
  </div>
</section>

<section>
  <h2>The fasting companion</h2>
  <p>For the Nativity Fast first. It keeps the night of the app's Nativity card, the star at the reader's own day of the fast, and now the title stands under the hill in the same card. The week stands as the app's own calendar does on a phone: the days across, each with the calendar's mark for its fast and the cross on a feast; then what each fast allows, its mark in a disc of its own colour and each rule in the calendar's own sentence under the days that keep it; then the week's feasts on the calendar's card. One button, the fast's reading plan. It gives no counsel, and closes on the calendar's own word that a priest's direction comes first.</p>
  <div class="row">
    ${shot("fast-opening.dark.png", "The opening", "The fasting companion's opening email: the night sky with the star just above the hill, the title The Nativity Fast, its dates, the button Open the reading plan, and the week's seven days each with a fish or a stalk of wheat, what each fast allows and the feasts.")}
    ${shot("fast-week.dark.png", "A week in", "The weekly email: the star a little higher, the title The Nativity Fast, week 2, and that week's fast.")}
    ${shot("fast-opening.no-pictures.png", "With every picture blocked", "The opening email with no pictures shown: the picture's words stand in a band of the night, and the title, the button, the week and its key are all there.")}
  </div>
</section>

<section>
  <h2>Why it looks this way</h2>
  <p>One line for each choice: what it is, why, and what it does for the reader and for the goal, which is that a reader comes back.</p>
  __WHY__
</section>

<section>
  <h2>What waits on your yes</h2>
  <ul>
    <li><strong>The designs</strong>, each of the three.</li>
    <li><strong>The words.</strong> They are the sending's own letters, shown here exactly as they would be sent. The design adds no sentence of its own.</li>
    <li><strong>The switches.</strong> Each email stays off until your yes to its design. Bookmarking a verse is confirmed free for every reader.</li>
  </ul>
</section>

<section>
  <h2>The check</h2>
  <p>Run with <code>node docs/brand/kit/check.mjs</code> on 13 November 2026. It passed: all six emails at 360, 390, 412 and 1032 wide, their pieces on each of the five palettes, in Arabic's direction, and each file a reader gets in Dark's own colours and no others. Each email is 6.5 to 26KB of HTML and no picture is over 64KB. No script, no font fetched, no parchment. No picture, and no file a picture is cut from, is on the heritage list.</p>
  <p>These stills are drawn by a browser in Georgia's open twin and in Roboto, the faces a phone's mail app has. Not done here, and still to do before any send: a look in real Gmail, Apple Mail and Outlook, with the phone set light and set dark. In Outlook on Windows the card's corners will be square; the button is drawn there as its own rounded shape. Gmail keeps a dark email dark, so its forced darkening has nothing to turn.</p>
</section>
</main>
`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `why`: the rows of the README's own table of reasons, so the page and the README say one thing. */
export function page({ standalone, palettes, why = [] }) {
  const reasons = why.map(([choice, reason, reader]) => `<h3>${esc(choice)}</h3>\n  <p>${esc(reason)}</p>\n  <p class="for"><span class="small">For the reader</span>${esc(reader)}</p>`).join("\n  ");
  const head = `<title>Purify email look</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>${style(palettes.Dark.wears, palettes.Light.wears)}</style>`;
  const content = CONTENT.replace("__WHY__", reasons);
  if (!standalone) return `${head}\n${content}`;
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n${head}\n</head>\n<body>${content}</body>\n</html>\n`;
}

/** The retention emails' page: the same style, their own stills and reasons. */
export function retentionPage({ standalone, palettes, why = [] }) {
  const reasons = why.map(([choice, reason, reader]) => `<h3>${esc(choice)}</h3>\n  <p>${esc(reason)}</p>\n  <p class="for"><span class="small">For the reader, and for coming back</span>${esc(reader)}</p>`).join("\n  ");
  const head = `<title>Purify retention emails</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>${style(palettes.Dark.wears, palettes.Light.wears, FACES_2)}</style>`;
  const content = RETENTION.replace("__WHY__", reasons);
  if (!standalone) return `${head}\n${content}`;
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n${head}\n</head>\n<body>${content}</body>\n</html>\n`;
}
