import type { MetadataRoute } from "next";
import { SITE_URL as SITE } from "@/lib/site";

// Static for the Android export (output:export); unchanged on the website.
export const dynamic = "force-static";

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
  // Added 2026-05: bring the disallow list up to twenty-two named agents
  // covering the major model-training and AI-assistant crawlers active
  // today. The privacy page advertises this exact count.
  "Diffbot",
  "FacebookBot",
  "YouBot",
  "Timpi",
  "MistralAI-User",
  "DuckAssistBot",
  "Scrapy",
  "PanguBot",
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
