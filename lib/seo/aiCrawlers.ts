/**
 * The AI-crawler policy, in one place so it can be unit-tested and so the
 * privacy page and robots.txt cannot drift apart.
 *
 * It replaced a sitewide disallow of all 22 named agents (pre-2026-08) that
 * was written for the ABS / Biblica Scripture terms but applied far past them:
 * the licensed translations only ever render under /bible, and everything else
 * on the site is public domain or Purify's own editorial work.
 *
 * Three tiers:
 *
 *   1. ANSWER_ENGINES , crawlers that index in order to answer a question and
 *      cite a source. They send readers back.
 *
 *   2. USER_TRIGGERED , fetchers that run only because a person pasted a
 *      Purify link into an assistant. Blocking these meant a reader who asked
 *      ChatGPT or Claude about one of our pages got a 403 instead of the page.
 *
 *   3. TRAINING_BOTS , corpus builders for model training. Confined to
 *      /saints, which the owner opened deliberately: the saints' lives, works,
 *      and quotations are public-domain patristic material (NPNF and other PD
 *      translations) and putting them into training corpora spreads them.
 *
 * Tiers 1 and 2 get the whole library except Scripture. Tier 3 gets /saints
 * and nothing else. No tier is ever allowed into /bible.
 *
 * Any change here must be mirrored in the AI-crawler section of
 * app/(app)/privacy/page.tsx (EN and DE), which names these agents to readers.
 * Leaving them out of sync makes the privacy page false.
 */

/** Tier 1: cite-and-link-back search crawlers. */
export const ANSWER_ENGINES = [
  "OAI-SearchBot",
  "PerplexityBot",
  "DuckAssistBot",
  "YouBot",
] as const;

/** Tier 2: fetch-on-a-person's-request agents. */
export const USER_TRIGGERED = [
  "ChatGPT-User",
  "Claude-User",
  "Perplexity-User",
  "MistralAI-User",
] as const;

/** Tier 3: model-training corpus crawlers. Saints only. */
export const TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "Amazonbot",
  "Meta-ExternalAgent",
  "cohere-ai",
  "Diffbot",
  "FacebookBot",
  "Timpi",
  "PanguBot",
  "Scrapy",
] as const;

/** Closed to every crawler, AI or otherwise. */
export const NEVER_CRAWLABLE = ["/api/", "/admin"];

/**
 * Licensed Scripture (NKJV / NIV / NLT via API.Bible) renders under this
 * prefix. The ABS / Biblica agreements forbid its ingestion, so no AI agent of
 * any tier is allowed in, including the ones we otherwise welcome.
 */
export const SCRIPTURE_PREFIX = "/bible";

/** The one tree open to model-training crawlers. */
export const TRAINABLE_PREFIX = "/saints";

/** Every AI agent we name, across all three tiers. */
export function allNamedAiAgents(): string[] {
  return [...ANSWER_ENGINES, ...USER_TRIGGERED, ...TRAINING_BOTS];
}

/**
 * Resolve a path against robots.txt longest-match semantics for one rule.
 * Used by the tests to assert the policy actually does what it reads like.
 */
export function isAllowed(
  path: string,
  rule: { allow: string[]; disallow: string[] },
): boolean {
  const longest = (patterns: string[]) =>
    patterns
      .filter((p) => path.startsWith(p))
      .reduce((best, p) => Math.max(best, p.length), -1);

  const allow = longest(rule.allow);
  const disallow = longest(rule.disallow);
  // Ties go to Allow, which is what Google and the major AI crawlers do.
  return allow >= disallow;
}
