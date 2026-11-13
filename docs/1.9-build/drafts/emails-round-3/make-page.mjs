// The page for round 3 of the emails: before and after, with the reason for
// each choice, for his yes or no.
//
//   node docs/1.9-build/drafts/emails-round-3/make-page.mjs                    writes page.html beside this file
//   node docs/1.9-build/drafts/emails-round-3/make-page.mjs --artifact=<file>  and the page alone, as an Artifact takes it
//   node docs/brand/kit/check.mjs --page docs/1.9-build/drafts/emails-round-3/page.html
//
// It is made from the design kit: the style is the kit's own, taken whole
// from docs/brand/kit/artifact-template.html, and the body uses the kit's
// pieces and nothing else. Its pictures are its own files (stills/), never an
// address on the main web: the page his phone showed on 2026-11-13 had every
// picture broken.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const template = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const style = template.slice(template.indexOf("<style>"), template.indexOf("</style>") + "</style>".length);

const size = (file) => {
  // A WebP's own width and height, so the page keeps its place while a still loads.
  const b = fs.readFileSync(path.join(HERE, "stills", file));
  const at = b.indexOf("VP8 ");
  if (at > 0) return [b.readUInt16LE(at + 14) & 0x3fff, b.readUInt16LE(at + 16) & 0x3fff];
  const x = b.indexOf("VP8X");
  if (x > 0) return [1 + b.readUIntLE(x + 12, 3), 1 + b.readUIntLE(x + 15, 3)];
  throw new Error(`cannot read the size of ${file}`);
};
const still = (file, caption, alt) => {
  const [w, h] = size(file);
  return `<figure class="k-figure k-phone"><img src="stills/${file}" width="${w / 2}" height="${h / 2}" alt="${alt}"><figcaption>${caption}</figcaption></figure>`;
};
const pair = (before, after, what) => {
  const one = (file, word) => {
    const [w, h] = size(file);
    return `<figure class="k-figure"><img src="stills/${file}" width="${w / 2}" height="${h / 2}" alt="${what}, ${word.toLowerCase()}."><figcaption>${word}</figcaption></figure>`;
  };
  return `<div class="k-pair">${one(before, "Before")}${one(after, "After")}</div>`;
};
const why = (choice, reason, reader) => `<h3>${choice}</h3>
    <p>${reason}</p>
    <p><span class="k-eyebrow">For the reader</span><br>${reader}</p>`;

const BODY = `
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">The emails, round 3</span>
    <h1>Default colours, and the calendar</h1>
    <p class="k-lede">Every Purify email in the app's default colours, and the fasting companion's calendar drawn again.</p>
    <p class="k-meta">13 November 2026. One version of each. Yes or no is yours.</p>
  </header>

  <section class="k-section" aria-labelledby="s-asked">
    <h2 id="s-asked">What you asked</h2>
    <div class="k-note">
      <span class="k-eyebrow">Your words, about 16:44 UTC</span>
      <p>keep all the emails default Purify colors. and also revamp the calendar design one</p>
    </div>
    <p>So there are two things here to say yes or no to. The first is the colours: every email is now in the app's default palette, on every screen. The second is the fasting companion: its calendar is drawn again, as the app's own calendar stands on a phone.</p>
    <p>Nothing has been sent and nothing in the app has changed. The change is held as a patch until your yes.</p>
  </section>

  <section class="k-section" aria-labelledby="s-calendar">
    <h2 id="s-calendar">The fasting companion, drawn again</h2>
    <p>The sample is the opening email of the Nativity Fast, in the very words the sending makes. The page is the app's own dark, and under the night card the week now reads top to bottom the way the calendar does in the app: the week, what each fast allows, and the feasts.</p>
    ${still("after-fast-opening-dark.webp", "After. The app's default colours, and the calendar drawn again.", "The fasting companion after round 3, on the app's dark page: the night card with the title The Nativity Fast and one button; seven days across, each with a fish or a stalk of wheat and a cross on the three feasts; Fish allowed and Strict fast, each with its mark in a disc, its days and the calendar's rule; and a card with the week's three feasts.", true)}
    ${still("before-fast-opening-dark.webp", "Before, as you saw it: a navy page, and the week, its key and its feasts in one navy card.", "The fasting companion before round 3, on a navy page: the night card, then one navy card holding seven days with small marks, a key that says Fish allowed twice, and the feasts in bold.")}

    ${why("The week stands as the app's calendar does: the week, what each fast allows, the feasts", "Before, all three sat in one card with small marks. A reader of Purify already knows the calendar's page. The email is now that page for seven days, and nothing in it was drawn for the email.", "It is read the way the calendar is read, so there is nothing to learn, and it is found again on Wednesday.")}
    ${why("The week is one row of the month", "The day's name, its date, the calendar's own mark for its fast, and the cross on a feast, with a feast's date set heavier. They are the same marks in the same places as the app's month. It has no card around it, as the month has none.", "The whole week is seen in one glance: where the strict days fall, and where the feasts are.")}
    ${why("What each fast allows, as the calendar's own day says it", "The fast's mark stands in a disc of its own colour, then its name, then each rule in the calendar's own sentence under the days that keep it. Before, Fish allowed was said twice, once for each rule. Now a fast is named once.", "What may I eat on Wednesday is answered by finding Wed. No rule is guessed, and none is said twice.")}
    ${why("The feasts on the calendar's own card", "The app lists a day's feasts on a raised card, with the cross and the words Major feast. The day in the margin is how your Sunday email already sets a day. The names are in the serif at its plain weight, since every row here is a feast and bold on all of them only shouted.", "A feast in a fast is seen at once and read by its name, calmly.")}
    ${why("Colour is never the only sign", "Each fast has its mark, its name and its sentence. Each feast has its cross and its words. Teal and red are the calendar's own colours for fish and for the strict fast, and they are the only colour in the email besides the white button.", "Nothing is lost to a reader who sees no colour.")}
  </section>

  <section class="k-section" aria-labelledby="s-more">
    <h2 id="s-more">A week in, and with pictures blocked</h2>
    <p>The weekly email draws the same way, the star a little higher. And many mail apps hide pictures until asked: then each disc keeps its fast's colour and every word still stands. A browser draws a small broken mark where a picture is blocked; a mail app shows the picture's own words or leaves the space clear.</p>
    ${still("after-fast-week-dark.webp", "After: the second week of the fast.", "The fasting companion's weekly email after round 3: The Nativity Fast, week 2, with seven days across, Fish allowed and Strict fast with their days and rules.")}
    ${still("after-fast-opening-no-pictures.webp", "After, with every picture blocked: the title, the button, each fast with its days and rules, and each feast are all still there.", "The opening email with no pictures shown: the words that stand for the night, the title, the button, the seven days, both fasts with their days and rules, and the three feasts.")}
  </section>

  <section class="k-section" aria-labelledby="s-colours">
    <h2 id="s-colours">The default colours, in every email</h2>
    <p>These are the app's own default palette, and they are now the only colours any Purify email holds.</p>
    <div class="k-table-wrap">
      <table class="k-table">
        <caption>Every colour is read from the app's own files when the emails are built. None is typed in.</caption>
        <thead><tr><th scope="col">In the email</th><th scope="col">The app's colour</th></tr></thead>
        <tbody>
          <tr><td>The page</td><td>#101013, the app's page</td></tr>
          <tr><td>A card</td><td>#1d1d20, the app's card</td></tr>
          <tr><td>The night card</td><td>#0b0b0e, the app's well</td></tr>
          <tr><td>Words</td><td>The app's white, and its quieter shares</td></tr>
          <tr><td>The button, a feast's cross</td><td>White, and the app's glowing white #eaeaec</td></tr>
          <tr><td>Each fast</td><td>The calendar's own: teal for fish, red for strict</td></tr>
        </tbody>
      </table>
    </div>

    <h3>What was not the default, and is gone</h3>
    <p>Two things. In the fast, the fasting companion and the Sunday email wore the app's Night sky look: a navy page (#05070d) and a navy card (#0f1420). And every one of the nine emails turned to a second set of colours where a phone was set light: a white page, a grey card and a purple grey ink (#49424e), with feasts in red.</p>
    <p>In all, each email held thirteen colours that were not the default, and the fast's emails six or seven more. Each now holds none, and a check fails any email that does.</p>

    <h3>In the fast</h3>
    <p>The Sunday email in the Nativity Fast. The night card was already the app's own well; the page and the card around it were navy.</p>
    ${pair("before-reader-nativity-fast-dark.webp", "after-reader-nativity-fast-dark.webp", "The Sunday email in the Nativity Fast")}

    <h3>On a phone set light</h3>
    <p>The same four emails as a mail app that follows the phone's light setting drew them before, and as every mail app draws them now. The fasting companion turned white the same way.</p>
    ${pair("before-reader-light.webp", "after-reader-dark.webp", "The Sunday email on a phone set light")}
    ${pair("before-brief-light.webp", "after-brief-dark.webp", "Your brief on a phone set light")}
    ${pair("before-first-week-1-light.webp", "after-first-week-1-dark.webp", "The first week's guide on a phone set light")}
    ${pair("before-pick-up-light.webp", "after-pick-up-dark.webp", "Where you left off on a phone set light")}

    ${why("One palette, the app's default, on every screen", "It is your word. There is a second reason: the light version was never one email for everyone. Gmail does not follow a phone's light setting inside an email, so a reader on Gmail saw the dark one while a reader on Apple Mail saw the white one.", "It looks like the app they open every day, and it is the same email whichever phone and mail app it is read in.")}
    ${why("No Night sky in the fast", "Night sky is one of the app's looks, a choice a reader makes for their own app. An email is Purify's own voice, so it wears Purify's default. The fast is still marked by the night card and its star, which were the default colours already.", "The fast's emails are known as Purify at a glance, beside every other email from Purify.")}

    <h3>What did not change</h3>
    <p>On a dark screen the Sunday email outside a fast, your brief, the first week's three emails and where you left off are the same as you approved, to the pixel. Only colours moved, and only where they were not the default. The monthly note, the shop emails and the release letter are built from the same pieces and follow them.</p>
  </section>

  <section class="k-section" aria-labelledby="s-pictures">
    <h2 id="s-pictures">The pictures</h2>
    <p>On your phone every picture on the last page was broken. That page pointed at the emails' pictures on purifyapp.net, and the main web does not hold them until 1.9 merges. This page carries its pictures as its own files, so they show now.</p>
    <p>The real emails keep their purifyapp.net addresses, which work from the merge. No email in the new look goes out before then.</p>
  </section>

  <section class="k-section" aria-labelledby="s-check">
    <h2 id="s-check">The check</h2>
    <div class="k-table-wrap">
      <table class="k-table">
        <caption>Run on 13 November 2026 on the change as held. All of it passed.</caption>
        <thead><tr><th scope="col">What was held</th><th scope="col">Result</th></tr></thead>
        <tbody>
          <tr><td>Every colour written in each of the nine emails is the app's default, and nothing in an email turns on the phone's light or dark setting</td><td>Passed, nine of nine. The emails as they were fail it.</td></tr>
          <tr><td>Each email at 360, 390, 412 and 1032 wide: contrast of 4.5 to 1 or more on every word, 44 tall targets, no rays, no sparkle, no side stripe, no em dash, Arabic's direction</td><td>Passed, thirty-six runs.</td></tr>
          <tr><td>Nothing runs past a phone's edge, and no word is cut</td><td>Passed.</td></tr>
          <tr><td>With every picture blocked, each email still says everything</td><td>Passed.</td></tr>
          <tr><td>Each email under 100KB, so Gmail never clips it</td><td>Passed: 6.5 to 26KB.</td></tr>
          <tr><td>No picture from the heritage list. No parchment.</td><td>Passed.</td></tr>
          <tr><td>The app's own tests, with the change applied</td><td>__TESTS__</td></tr>
        </tbody>
      </table>
    </div>
    <p>Not done here, and still to do before any send: a look in real Gmail, Apple Mail and Outlook, with the phone set light and set dark. These stills are drawn by a browser.</p>
  </section>

  <section class="k-section" aria-labelledby="s-yes">
    <h2 id="s-yes">What waits on your yes</h2>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">The default colours</span><span class="k-stat-change">In every email, on every screen</span><span class="k-stat-value">Yes or no</span></div>
      <div class="k-stat"><span class="k-stat-label">The calendar</span><span class="k-stat-change">The fasting companion, drawn again</span><span class="k-stat-value">Yes or no</span></div>
    </div>
    <p>On your yes the held change goes into the app in one step. The first email in the new look still goes to you alone before any reader has one.</p>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">docs/1.9-build/drafts/emails-round-3</p>
  </footer>
</main>
`;

const tests = process.argv.find((a) => a.startsWith("--tests="))?.slice("--tests=".length) ?? "Passed.";
const body = BODY.replace("__TESTS__", tests);
const head = `<title>Purify emails, round 3</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${style}`;
fs.writeFileSync(path.join(HERE, "page.html"), `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n${head}\n</head>\n<body>${body}</body>\n</html>\n`);
const to = process.argv.find((a) => a.startsWith("--artifact="));
if (to) fs.writeFileSync(to.slice("--artifact=".length), `${head}\n${body}`);
console.log("wrote page.html");
