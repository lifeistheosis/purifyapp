// The page that shows the email look (index.html, written by build.mjs).
// Its own colours are the app's Dark and the emails' clean light, handed over by build.mjs as
// it read them from app/globals.css; its faces are named, never fetched.

const tokens = (w) => `--ground:${w.ground};--raised:${w.raised};--ink:${w.ink};--body:${w.body};--quiet:${w.quiet};--line:${w.line};--rule:${w.rule}`;

const shot = (file, caption, alt) =>
  `<figure><img src="shots/${file}" width="390" loading="lazy" alt="${alt}"><figcaption>${caption}</figcaption></figure>`;

const CONTENT = `
<main>
<header>
  <p class="small">docs/brand/kit/email &middot; 13 November 2026</p>
  <h1>The Purify email look</h1>
  <p class="lede">One look for every email Purify sends, drawn from the app itself and made for a phone first, with its first season: the Nativity Fast, which begins on 15 November. Dark leads. No parchment.</p>
  <span class="rule"></span>
</header>

<section>
  <h2>The reader email</h2>
  <p>The Sunday email is the sample. The same pieces carry the monthly note and a release letter. It opens the way a chapter opens in the app: a centred title, a line under it, the short rule. The week is set as a leaf of the calendar, the day in the margin and the name beside it. The week's saint stands as Today's card stands, with the app's own button. It is one column at a phone's width, and every button and link is 44 tall.</p>
  <div class="row">
    ${shot("reader.dark.png", "Dark, the app's own default", "The reader email on a dark screen: the masthead, the title The week ahead, five days of the calendar, and the week's saint on a raised card with one button.")}
    ${shot("reader.light.png", "Light, where the reader's screen is light", "The same email on a light screen: a clean white in the app's ink, with each feast marked in the rubric's red.")}
  </div>
</section>

<section>
  <h2>In the Nativity Fast</h2>
  <p>From 15 November to 24 December the same email wears the app's Night sky, and opens on the night of the app's own Nativity card. The star stands a little higher each day of the fast, so each of the six Sunday emails shows it higher than the last. Each day says its fast in the calendar's own words, and one line opens the path for the fast. The night stays a night on a light screen, as the card does in the app.</p>
  <div class="row">
    ${shot("reader-nativity-fast.dark.png", "Dark, in the Night sky look", "The season's email on a dark screen: a night sky with a star just above the horizon, the line Nativity Fast, day 1 of 40, and each day of the week with its fast.")}
    ${shot("reader-nativity-fast.light.png", "Light", "The season's email on a light screen: the night stays dark at the head of a clean white page.")}
    ${shot("reader-nativity-fast.no-pictures.png", "With every picture blocked", "The season's email with no pictures shown: the wordmark, the words that say what the star does, and every line of the email are still there.")}
  </div>
</section>

<section>
  <h2>The owner's brief</h2>
  <p>The same look, for the one reader it is made for. What needs him comes first. Three figures, then three small charts drawn in the email itself with table cells: seven days of visitors, money in by source in the money chart's own colours, and what was opened most. A mail client runs no script, so every number a chart needs is also said in words. A figure that could not be read says so. Every figure shown here is a sample, made up for the drawing.</p>
  <div class="row">
    ${shot("brief.dark.png", "Dark", "The owner's brief on a dark screen: what needs him, three figures, a chart of seven days, money in by source, what was opened most, and what goes out today.")}
    ${shot("brief.light.png", "Light", "The owner's brief on a light screen.")}
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
      <tr><td>Dark, and the light</td><td>Dark is the app's default and leads. On a light screen the email is a clean white in the app's own ink for a white page. Never parchment.</td></tr>
      <tr><td>The cross and the wordmark</td><td>public/purify-cross-mark.png, and the same mark in the light page's ink.</td></tr>
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
      <tr><td>checkMock, all fifteen rules, on each of the three emails at 360, 390, 412 and 1032 wide, on Dark, Black, Candlelight, Monastery and the email's clean light, and in Arabic's direction. The season's email on Night sky as well.</td><td>Passed, twelve runs of twelve.</td></tr>
      <tr><td>At each width nothing runs past the screen's edge and no word is cut by its box.</td><td>Passed.</td></tr>
      <tr><td>The file a mail client gets wears the same colours as the checked drawing, piece by piece, on a dark screen and on a light one.</td><td>Passed: 115, 135 and 250 pieces.</td></tr>
      <tr><td>No script, no handler, no stylesheet or font fetched. Every picture has its words.</td><td>Passed.</td></tr>
      <tr><td>No parchment: no email and no page here holds the app's Light paper.</td><td>Passed.</td></tr>
      <tr><td>Each email under 100KB of HTML, so Gmail never clips it, and each picture under 100KB.</td><td>Passed: 14, 17 and 27KB.</td></tr>
      <tr><td>No picture on the heritage list.</td><td>Passed: none of four.</td></tr>
    </tbody>
  </table></div>
  <p>Named allowances: the night is a dark island on every palette, as the card is in the app, and two of the money chart's colours are one on both of the panel's themes.</p>
  <p>Not done here, and still to do before any send: a look in real Gmail, Apple Mail and Outlook, light and dark. These pictures are drawn by a browser, which honours more than Outlook does. In Outlook on Windows the corners will be square and the faces Georgia and Arial; nothing depends on either.</p>
</section>

<section>
  <h2>For the build</h2>
  <ul>
    <li>The pictures need a home on the main web before a send (the night, the mark in ink). In these files they sit in img/ beside the email.</li>
    <li>The night is one picture for each day of the fast. The build script draws any day; only day 1 is drawn so far.</li>
    <li>Each day's fast comes from the calendar the app already has. The Sunday email does not carry it yet.</li>
    <li>The Sunday email now names 20 and 21 November by the saint alone, so both read &ldquo;The Most Holy Theotokos&rdquo;. The sample uses the commemoration's own name. The arbiter has this as a finding.</li>
    <li>Dark is the scheme written inline, and the email turns light only where a client says the screen is light. The kit's first email template, which was light first, gave way to these files, so the kit holds one email look.</li>
  </ul>
</section>
</main>
`;

const style = (D, L) => `
/* One column for words, and each email at a phone's width beside its other scheme. */
:root{${tokens(D)};color-scheme:dark;--serif:Lora,Georgia,'Times New Roman',serif;--sans:'DM Sans',Arial,Helvetica,sans-serif}
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
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `why`: the rows of the README's own table of reasons, so the page and the README say one thing. */
export function page({ standalone, palettes, why = [] }) {
  const reasons = why.map(([choice, reason, reader]) => `<h3>${esc(choice)}</h3>\n  <p>${esc(reason)}</p>\n  <p class="for"><span class="small">For the reader</span>${esc(reader)}</p>`).join("\n  ");
  const head = `<title>Purify email look</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>${style(palettes.Dark.wears, palettes.Light.wears)}</style>`;
  const content = CONTENT.replace("__WHY__", reasons);
  if (!standalone) return `${head}\n${content}`;
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n${head}\n</head>\n<body>${content}</body>\n</html>\n`;
}
