import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Every named AI / LLM crawler gets explicit, full access. Naming them is not
// strictly required (the `*` rule already allows them) but several of these
// agents are opt-in by convention: Google-Extended and Applebot-Extended in
// particular are read as "excluded" by some tooling unless allowed by name.
// An explicit Allow removes the ambiguity.
const AI_CRAWLERS = [
  "Google-Extended", // Gemini / AI Overviews grounding
  "GPTBot", // OpenAI training
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT live browsing
  "ClaudeBot", // Anthropic crawler
  "Claude-User", // Claude live browsing
  "Claude-SearchBot", // Claude search index
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended", // Apple Intelligence
  "Amazonbot",
  "Bytespider",
  "CCBot", // Common Crawl, feeds most open training sets
  "cohere-ai",
  "Diffbot",
  "FacebookBot",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "MistralAI-User",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /api/ is JSON plumbing, not content. Nothing readable lives there
        // and crawling it only burns crawl budget.
        disallow: ["/api/"],
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
