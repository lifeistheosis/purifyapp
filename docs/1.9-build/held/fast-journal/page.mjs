// The private page for his yes or no: the Fast and the Journal, before and after, with a reason for
// each choice. Built from the kit's own template (docs/brand/kit/artifact-template.html): its style
// whole, its pieces as they are. The stills are the app's own screens from the 1.9 export.
//   node docs/1.9-build/held/fast-journal/page.mjs <before dir> <after dir> <out dir>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [BEFORE, AFTER, OUT] = process.argv.slice(2).map((p) => path.resolve(p));
fs.mkdirSync(path.join(OUT, "stills"), { recursive: true });

const template = fs.readFileSync("docs/brand/kit/artifact-template.html", "utf8");
const style = /<style>[\s\S]*?<\/style>/.exec(template)[0];
const fonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(template)[0];

// Each still as a JPEG, so the page is light on a phone's signal.
const used = new Map();
const still = (dir, name) => {
  const key = `${path.basename(dir)}-${name}`;
  if (!used.has(key)) {
    const to = path.join(OUT, "stills", `${key}.jpg`);
    execFileSync("python3", ["-c", "import sys\nfrom PIL import Image\nImage.open(sys.argv[1]).convert('RGB').save(sys.argv[2], quality=86, optimize=True)", path.join(dir, `${name}.png`), to]);
    used.set(key, `stills/${key}.jpg`);
  }
  return used.get(key);
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fig = (dir, name, alt, caption) =>
  `<figure class="k-figure"><img src="${still(dir, name)}" alt="${esc(alt)}" loading="lazy" width="780" height="1688"><figcaption>${esc(caption)}</figcaption></figure>`;
const wide = (dir, name, alt, caption) =>
  `<figure class="k-figure"><img src="${still(dir, name)}" alt="${esc(alt)}" loading="lazy" width="1600" height="2560"><figcaption>${esc(caption)}</figcaption></figure>`;
const why = (caption, rows) => `<div class="k-table-wrap"><table class="k-table"><caption>${esc(caption)}</caption>
<thead><tr><th scope="col">The choice</th><th scope="col">Why</th></tr></thead>
<tbody>
${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("\n")}
</tbody></table></div>`;
const note = (label, words) => `<div class="k-note"><span class="k-eyebrow">${esc(label)}</span><p>${esc(words)}</p></div>`;

const body = `
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">Build 95, notes 3, 4 and 6</span>
    <h1>The Fast and the Journal</h1>
    <p class="k-lede">Both screens redrawn in the look you approved, for your yes or no.</p>
    <p class="k-meta">13 November 2026. Every picture is the app's own screen from the 1.9 export. Nothing here ships without your yes.</p>
  </header>

  <section class="k-section" aria-labelledby="s-words">
    <h2 id="s-words">Your words</h2>
    ${note("On the Fast and the notebook", "“the fast and the notebook design and system needs to be refined + smoother (notebook is not really optimized + some visual and ux bugs) and the fast is clearly outdated”")}
    ${note("On the journal's bugs", "“whenever you click on a different section in the journal UI the typing pad pops up automatically and it's buggy when it pops up and the overrall journal system is clunky and visuals aren't really that good. even the image system and the quoting system”")}
  </section>

  <section class="k-section" aria-labelledby="s-mended">
    <h2 id="s-mended">Already mended</h2>
    <p>The bugs needed no yes, so they are in the branch now. Each has a test that fails on the old code.</p>
    <div class="k-table-wrap"><table class="k-table">
      <caption>A real keyboard is first seen on your phone. The checks stand one in by making the screen shorter.</caption>
      <thead><tr><th scope="col">What you met</th><th scope="col">What it does now</th></tr></thead>
      <tbody>
        <tr><td>The keyboard came up by itself</td><td>Only your tap where you write brings it. Write, an entry opened, Verse, Quote and More no longer raise it.</td></tr>
        <tr><td>The page jumped when the keyboard came up</td><td>An empty page holds still. The line you are writing stays in sight, wherever in the page it is.</td></tr>
        <tr><td>The keyboard fell after a verse was found</td><td>Verse gives the cursor back to your words.</td></tr>
        <tr><td>The journal dropped as it opened</td><td>Today's card arrives whole. It stood 68px short for a moment, and everything under it moved.</td></tr>
        <tr><td>A highlight sat off its words</td><td>The colour lies under the words, line for line.</td></tr>
      </tbody>
    </table></div>
  </section>

  <section class="k-section" aria-labelledby="s-fast">
    <h2 id="s-fast">The Fast</h2>
    <p>One screen, top to foot. The calendar's words for each day and the pastoral line are unchanged, and the page adds none of its own.</p>
    ${fig(BEFORE, "fast-new-390", "The Fast as it is now: two bordered tiles with a zero in each, then today's card with three outlined pills.", "Before. A new reader's first sight is two zeros.")}
    ${fig(AFTER, "fast-new-390", "The Fast redrawn: a centred opening, today's fast on a dark card with one switch, and one quiet line of count.", "After. Today leads, and a new reader reads one sentence.")}
    ${fig(BEFORE, "fast-marked-390", "The recent fasting days as they are now: three pills on every row.", "Before. Three pills on every recent day, forty-eight on the screen.")}
    ${fig(AFTER, "fast-marked-390", "The recent fasting days redrawn: rows in one tray, one of them open with the switch under it.", "After. A row for each day. A tap opens the same switch under it.")}
    ${why("Why it looks this way", [
      ["It opens as a chapter opens: the mark, a small line, the title, the short rule", "It is how the Bible and the Fathers' works open in the app. The Fast reads as Purify before a word is read."],
      ["Today leads, on the night", "Today's fast is what a reader comes for. It stands first and alone, on the Nativity card's own ground."],
      ["The calendar's own mark beside the day's name", "The grapes, the fish and the wheat are the calendar's. A grey dot said nothing."],
      ["One switch in place of three pills", "Kept, In part and Broke are one choice, so they are one control: the carved switch Settings uses."],
      ["No mark wears a colour", "Kept was green and Broke was red. A companion does not grade. All three are lit alike."],
      ["The count is quiet lines, not tiles", "A new reader reads one sentence under today. The second line appears with the first day kept."],
      ["Recent days are rows in one tray", "Each row shows the day, its fast and your mark. Forty-eight pills became sixteen rows."],
      ["The pastoral line in italics, under the switch", "Its words are unchanged. It stands where the mark is made, on its own type, with no box."],
      ["The way to the calendar is a line of its own", "It was a word inside a sentence. Now a thumb can find it."],
    ])}
    ${note("Named", "For a new reader a gap of one line stands above Recent fasting days. It keeps the second count line's room, so nothing moves under your finger at the first mark.")}
    ${wide(AFTER, "fast-new-800", "The Fast redrawn, on a tablet.", "After, on a tablet.")}
  </section>

  <section class="k-section" aria-labelledby="s-journal">
    <h2 id="s-journal">The Journal</h2>
    <p>What is free and what is Plus is as it was. Writing is free. Search, notebooks, covers and the four extra blocks wear the Plus mark, and the page promises them to no one.</p>
    ${fig(BEFORE, "journal-pages-390", "The Journal as it is now: a left-aligned heading, today's card, and the Write button lying over an entry's words.", "Before. Write lies straight on the words of the list.")}
    ${fig(AFTER, "journal-pages-390", "The Journal redrawn: a centred opening, today's page on a dark card, and Write standing on a fade.", "After. The same opening as the Fast, and the list goes quiet under Write.")}
    ${fig(AFTER, "journal-new-390", "The Journal redrawn for a new reader: under today's page, a row with a question to write from and a pen.", "After, for a new reader. The question is a row to tap, with the pen today's readings wear.")}
    ${fig(AFTER, "list-cover-390", "The journal's list redrawn: a page with a cover shows its picture at the end of its row.", "After. A page with a cover shows it in the list.")}
    ${why("Why it looks this way", [
      ["It opens as a chapter opens, with its one line in italics", "The Fast, the Bible and the journal now open the same way."],
      ["Today's page on the night", "The day is the journal's lead: its weekday, its saint, its fast, and its readings to write from."],
      ["An empty journal's question is a row with a pen", "It was plain words between two lines, and nothing said a tap begins a page."],
      ["Write stays the one button, on a fade", "Your word was one Write button always in reach. It lay on the list's words. Now they go quiet under it, as under the chapter's pill."],
      ["Write stands down for the keyboard", "While you type in the journal's search it no longer rides on the keyboard, over the field."],
      ["A page's cover shows in the list", "The picture you chose is part of how you find the page again."],
    ])}
    ${wide(AFTER, "journal-pages-800", "The Journal redrawn, on a tablet.", "After, on a tablet.")}
  </section>

  <section class="k-section" aria-labelledby="s-page">
    <h2 id="s-page">Quoting and pictures</h2>
    <p>The page you write on. One rule for quotes, and a cover that can be found and seen.</p>
    ${fig(BEFORE, "journal-sheet-390", "A page as it is now: a verse, a quote and a highlighted line, each a small grey line over or under plain words.", "Before. Three kinds of quote, told apart by a small glyph. (Taken with no signal, so the verse's words are not shown.)")}
    ${fig(AFTER, "sheet-quotes-390", "A page redrawn: John 3:16 on a raised card with its reference as a heading, and a quote of one's own in italics on the page.", "After. Scripture is a raised card, its reference first. Your own quote stays on the page, in italics.")}
    ${fig(AFTER, "sheet-cover-390", "A page with a cover: the picture at the head of the page with rounded corners and its credit under it.", "After. The cover at the page's head, cut from where an icon's face is, with its credit.")}
    ${fig(AFTER, "sheet-more-390", "More, redrawn: Heading, Checklist, Divider and Callout, then Add to a notebook and Cover, each with the Plus mark.", "After, as a reader without Plus. Cover has a row of its own, with the Plus mark.")}
    ${fig(AFTER, "sheet-cover-panel-390", "The covers to choose from: one row of upright pictures, the chosen one edged.", "After, as a reader with Plus. One row of pictures, large enough to tell apart.")}
    ${why("Why it looks this way", [
      ["One rule for quotes", "What comes from the app's library is a raised card and opens where it is from. What you type is the page itself."],
      ["Scripture: its reference as a heading, then the words", "The reference is read first, in the reading face. It was a small grey line."],
      ["A Father's words: the words, then the source at their foot", "As an epigraph names its author. The two raised cards each have their own form, so they are not boxes alike, which was your note on build 93."],
      ["A quote of your own stays on the page, in italics", "It is your typing, so it is not raised."],
      ["Remove sits in the card's corner", "It floated beside the words."],
      ["Cover has its own row in More", "It was the last thing in the notebook's panel, under the tags, the font and the alignment."],
      ["Covers are chosen from one row of larger pictures", "They were small squares, five to a row."],
      ["The cover stands at the page's head, rounded", "It was a flat strip from edge to edge, cut through the middle of the icon."],
    ])}
    ${note("Named", "A cover is still Plus, and only from artwork whose rights are verified. The shared page on the website still wears the old quote forms. With your yes it follows.")}
  </section>

  <section class="k-section" aria-labelledby="s-checked">
    <h2 id="s-checked">How it was checked</h2>
    <p>CHECKED</p>
  </section>

  <section class="k-section" aria-labelledby="s-yes">
    <h2 id="s-yes">Yes or no</h2>
    <div class="k-table-wrap"><table class="k-table">
      <caption>Each is separate. A no to one does not hold the others.</caption>
      <thead><tr><th scope="col">Part</th><th scope="col">What a yes ships</th></tr></thead>
      <tbody>
        <tr><td>1. The Fast</td><td>The whole screen as shown.</td></tr>
        <tr><td>2. The Journal</td><td>The opening, today's page, the empty state, Write on its fade.</td></tr>
        <tr><td>3. Quoting and pictures</td><td>The raised cards, the cover's row, its pictures, and the cover in the list.</td></tr>
      </tbody>
    </table></div>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">Held on a local branch until your word.</p>
  </footer>
</main>
`;

const checked = process.env.CHECKED ?? "Not yet checked.";
const html = `<title>The Fast and the Journal</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
${style}
${body.replace("<p>CHECKED</p>", `<p>${esc(checked)}</p>`)}`;
fs.writeFileSync(path.join(OUT, "fast-and-journal.html"), html);
console.log(`${path.join(OUT, "fast-and-journal.html")}: ${(html.length / 1024).toFixed(0)} KB, ${used.size} stills`);
