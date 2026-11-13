// The page for his look: the account and order emails' shell, before and
// after it was brought to Dark (his calls of 2026-11-13 about 18:53 UTC, the
// apply round of Updates 28). Built from the kit's own template
// (docs/brand/kit/artifact-template.html): its style whole, its pieces as
// they are. The stills are render.mjs's: the real emails as the app builds
// them, at a phone's width.
//
//   node docs/1.9-build/drafts/emails-round-3/shell/page.mjs <before dir> <after dir> <out dir>

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [BEFORE, AFTER, OUT] = process.argv.slice(2).map((p) => path.resolve(p));
fs.mkdirSync(path.join(OUT, "stills"), { recursive: true });

const template = fs.readFileSync("docs/brand/kit/artifact-template.html", "utf8");
const style = /<style>[\s\S]*?<\/style>/.exec(template)[0];
const fonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(template)[0];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Each still as a JPEG, so the page is light on a phone's signal; its size read from the file. */
function still(dir, name, as) {
  const to = path.join(OUT, "stills", `${as}.jpg`);
  const size = execFileSync("python3", ["-c", "import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGB')\nim.save(sys.argv[2], quality=86, optimize=True)\nprint(im.width, im.height)", path.join(dir, `${name}-390.png`), to], { encoding: "utf8" }).trim().split(" ").map(Number);
  return { src: `stills/${as}.jpg`, width: size[0], height: size[1] };
}
const fig = (s, alt, caption) => `<figure class="k-figure"><img src="${s.src}" alt="${esc(alt)}" loading="lazy" width="${s.width}" height="${s.height}"><figcaption>${esc(caption)}</figcaption></figure>`;
const pair = (name, what) =>
  `<div class="k-pair">
      ${fig(still(BEFORE, name, `${name}-before`), `${what}, before: the page the darker well, quiet words in a purple grey, a 35px Unsubscribe.`, "Before")}
      ${fig(still(AFTER, name, `${name}-after`), `${what}, after: Dark's own page, inks and grey, a 44px Unsubscribe.`, "After")}
    </div>`;
const why = (rows) => `<div class="k-table-wrap"><table class="k-table"><caption>Why it looks this way. Only the colours and one size move; the words, the layout and the cross stay where a reader knows them.</caption>
<thead><tr><th scope="col">The choice</th><th scope="col">Why, and what it does for a reader</th></tr></thead>
<tbody>
${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("\n")}
</tbody></table></div>`;
const note = (label, words) => `<div class="k-note"><span class="k-eyebrow">${esc(label)}</span><p>${esc(words)}</p></div>`;

const body = `
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">The emails, round 3</span>
    <h1>Account and order emails</h1>
    <p class="k-lede">The shell they are built in, brought to Dark as you decided. Before and after, at a phone's width.</p>
    <p class="k-meta">13 November 2026. Three real emails as the app builds them. Nothing here is sent.</p>
  </header>

  <section class="k-section" aria-labelledby="s-words">
    <h2 id="s-words">What you said</h2>
    ${note("About 16:44 UTC", "“keep all the emails default Purify colors”")}
    ${note("About 18:53 UTC", "“all recs”: the account and order emails' shell brought to Dark too, with before and after stills in the apply round.")}
    <p>The welcome, every order and shop email and every support reply are built in one shell. It was near Dark and not Dark. These are the stills you have not yet seen.</p>
  </section>

  <section class="k-section" aria-labelledby="s-stills">
    <h2 id="s-stills">Before and after</h2>
    <h3>The welcome</h3>
    <p>An account email. It keeps its line for the first week's guide.</p>
    ${pair("welcome", "The welcome email")}
    <h3>An order, confirmed</h3>
    <p>An order email with its amounts and its quiet note.</p>
    ${pair("order-confirmed", "The order confirmation")}
    <h3>An order, on its way</h3>
    <p>The tracking number is the value the eye lands on. The order number and tracking number are samples.</p>
    ${pair("order-shipped", "The order on its way")}
  </section>

  <section class="k-section" aria-labelledby="s-why">
    <h2 id="s-why">Why</h2>
    ${why([
      ["The page is the app's page, and the letter the app's card", "The page was the app's darkest well. The emails you approved stand on Dark's page, so one email and the next now share one ground. It reads as the app before a word is read."],
      ["Quiet words in Dark's own grey", "The small line, the note, the sign-off and the foot were a purple grey the app does not have. Now they are the grey the app uses for the same words."],
      ["Running text, the heading and the button in Dark's inks", "The body is Dark's body ink and the heading and button its white, as in the reader email you approved. The button is a little brighter, so the one thing to tap stands out."],
      ["Unsubscribe is 44px tall", "It was 35px, under the house's least for a thing to tap. The check found it when the shell was measured. A thumb finds it at once."],
      ["Everything else stays", "The words, the order of things, the cross, the card's shape and the first-week line are unchanged. A reader who knows these emails finds everything where it was."],
    ])}
  </section>

  <section class="k-section" aria-labelledby="s-checked">
    <h2 id="s-checked">How it was checked</h2>
    <p>CHECKED</p>
  </section>

  <section class="k-section" aria-labelledby="s-yes">
    <h2 id="s-yes">Your look</h2>
    <p>This is your call of 18:53, drawn. If anything here is not what you meant, say which and it goes back. It reaches readers only with the merge.</p>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">On the 1.9 branch. The main web has none of it until the merge.</p>
  </footer>
</main>
`;

const checked = process.env.CHECKED ?? "Not yet checked.";
const html = `<title>Account and order emails</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
${style}
${body.replace("<p>CHECKED</p>", `<p>${esc(checked)}</p>`)}`;
fs.writeFileSync(path.join(OUT, "account-and-order-emails.html"), html);
console.log(`${path.join(OUT, "account-and-order-emails.html")}: ${(html.length / 1024).toFixed(0)} KB`);
