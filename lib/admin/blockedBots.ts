// The 22-bot list lives in app/robots.ts (next/metadata format). Re-export
// here for the Crawler Audit admin tab so a single source of truth controls
// both the published robots.txt and the panel that audits it.

export const BLOCKED_BOTS = [
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
  "Diffbot",
  "FacebookBot",
  "YouBot",
  "Timpi",
  "MistralAI-User",
  "DuckAssistBot",
  "Scrapy",
  "PanguBot",
] as const;

export const BOT_HINT_RE = /(bot|crawl|spider|GPT|AI\b|http-client)/i;
