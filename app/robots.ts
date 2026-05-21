import type { MetadataRoute } from "next";

const SITE = "https://purify.app";

// The ABS / Biblica licenses prohibit using the Scripture content to train
// generative AI / LLMs. Block known AI crawlers so the licensed text is not
// scraped into training corpora.
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "CCBot",
  "Google-Extended",
  "anthropic-ai",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Applebot-Extended",
  "Bytespider",
  "Amazonbot",
  "Meta-ExternalAgent",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin"],
      },
      // AI/LLM training & scraping crawlers: disallowed everywhere.
      { userAgent: AI_BOTS, disallow: "/" },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
