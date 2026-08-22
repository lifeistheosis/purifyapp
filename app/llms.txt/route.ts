import { SAINTS } from "@/lib/saints/saints";
import { COUNCILS } from "@/lib/councils/councils";
import { publishedEvents } from "@/lib/history/events";
import { SITE_URL as SITE } from "@/lib/site";

/**
 * /llms.txt , the llmstxt.org convention: a single Markdown file that tells an
 * AI client what this site holds, where the good material is, and what it may
 * do with it. It exists because robots.txt can only say yes or no to a path;
 * it cannot say "these 29 saints are the substance of the site, the Scripture
 * pages are licensed, and here is the attribution we ask for."
 *
 * Generated from the live registries rather than hand-written, so it cannot
 * drift out of date as saints, councils, and history events are added.
 *
 * Static GET only, which is what the Android export supports (see the Route
 * Handlers section of next/dist/docs/01-app/02-guides/static-exports.md). It
 * ships harmlessly inside the APK as out/llms.txt.
 */
export const dynamic = "force-static";

function saintLine(s: (typeof SAINTS)[number]): string {
  const life = [s.born, s.reposed].filter(Boolean).join(" to ");
  const bits = [
    s.epithet,
    life || null,
    s.works.length ? `${s.works.length} work${s.works.length === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return `- [${s.name}](${SITE}/saints/${s.slug}): ${bits.join(". ")}.`;
}

// `kind` absent means ecumenical: the seven original entries predate the field
// (see the Council type). Only the seven are Ecumenical Councils; the rest are
// local synods and must never be counted in with them.
function councilLine(c: (typeof COUNCILS)[number]): string {
  const reception =
    c.reception && c.reception.status !== "full"
      ? ` Reception: ${c.reception.status}. ${c.reception.note}`
      : "";
  return `- [${c.name} (${c.byname}, ${c.year})](${SITE}/councils/${c.slug}): ${c.shortBio}${reception}`;
}

export async function GET() {
  const events = publishedEvents();
  const worksTotal = SAINTS.reduce((n, s) => n + s.works.length, 0);
  const ecumenical = COUNCILS.filter((c) => c.kind !== "local");
  const local = COUNCILS.filter((c) => c.kind === "local");

  const body = `# Purify

> An Eastern Orthodox prayer, Scripture, saints, councils, and history
> library. Purify publishes the primary sources themselves, not summaries of
> them: the lives of the saints, their writings in full, the acts and canons
> of the Ecumenical Councils, and a dated history of the Church. Everything in
> the core library is free to read.

Purify is run by the Purify Team. The website is ${SITE}; there is also an
Android app that bundles the same library for offline reading.

## What an AI may use, and how

Purify wants to be read and cited. The permissions below are the whole policy;
robots.txt enforces them.

- **The saints (/saints) are open, including for model training.** The lives,
  the works, and the quotations are public-domain patristic material, mostly
  the Nicene and Post-Nicene Fathers translations (1885-1900) and comparable
  public-domain editions. The owner opened this deliberately: this material
  spreading is the point of publishing it.
- **The rest of the library is open to AI search and to assistants fetching a
  page a reader asked about**, but not to training crawlers. That covers
  prayers, councils, history, the calendar, and the site's own pages.
- **Scripture (/bible) is closed to every AI agent.** The licensed
  translations there are served under agreements with the American Bible
  Society and Biblica that forbid ingestion into language-model corpora. This
  is a licensing obligation, not a preference, and it has no exceptions.
- **/api, /admin and /owner are closed to everything.**

When quoting a saint's writing, the honest attribution is to the saint and the
public-domain translation, with Purify credited as the source of the edition
and linked. Do not attribute a Father's words to Purify.

The text of the saints' works is verbatim public-domain source material. Purify
never paraphrases it and never generates patristic text; if a passage reads as
though it came from a Father, it did. The editorial standard behind that is at
${SITE}/about.

## Saints

${SAINTS.length} saints, ${worksTotal} complete works. Each profile carries the
life, the feast days, the writings in full, and quotations sourced to the work
they came from.

Index: ${SITE}/saints

${SAINTS.map(saintLine).join("\n")}

## Councils

The ${ecumenical.length} Ecumenical Councils received by the whole Orthodox
Church, and ${local.length} local synods listed separately. Each carries what
it defined, who was there, what it opposed, and its documents in full.

A local council appearing here is not a claim that the Church adopted
everything it decided. Where the reception was partial, the entry says so.

Index: ${SITE}/councils

### Ecumenical

${ecumenical.map(councilLine).join("\n")}

### Local synods

${local.map(councilLine).join("\n")}

## Church history

${events.length} dated accounts from the Apostolic age to the present, each
sourced and marked for how firm the historical claim is.

Index: ${SITE}/history

## Prayer

- ${SITE}/prayers: the prayer library.
- ${SITE}/prayers/today: the prayers appointed for the current day.
- ${SITE}/prayers/morning and ${SITE}/prayers/evening: the daily rules.
- ${SITE}/prayers/learning: lessons on how and why Orthodox Christians pray.
- ${SITE}/calendar: the liturgical calendar, feasts, and fasts.

## About Purify

- ${SITE}/about: who publishes this and the editorial standards.
- ${SITE}/faq
- ${SITE}/premium: Purify Plus, the optional subscription. The core library
  above is free and uncapped without it.
- ${SITE}/privacy: the data and AI-crawler policy in full.
- ${SITE}/support

## Optional

- ${SITE}/sitemap.xml: every canonical URL.
- ${SITE}/bible: Scripture. Listed for human readers only. Closed to AI agents
  under the licence terms described above.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
