import type { MetadataRoute } from "next";
import { SITE_URL as SITE } from "@/lib/site";
import {
  ANSWER_ENGINES,
  USER_TRIGGERED,
  TRAINING_BOTS,
  NEVER_CRAWLABLE,
  SCRIPTURE_PREFIX,
  TRAINABLE_PREFIX,
} from "@/lib/seo/aiCrawlers";

// Static for the Android export (output:export); unchanged on the website.
export const dynamic = "force-static";

// The three-tier AI policy, why each tier exists, and the rule that it has to
// stay in step with the privacy page, all live in lib/seo/aiCrawlers.ts.
// This file only renders it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: NEVER_CRAWLABLE,
      },
      // Tiers 1 and 2: the whole library except Scripture.
      {
        userAgent: [...ANSWER_ENGINES, ...USER_TRIGGERED],
        allow: "/",
        disallow: [...NEVER_CRAWLABLE, SCRIPTURE_PREFIX],
      },
      // Tier 3: /saints and nothing else. Both spellings are listed because
      // robots.txt resolves by longest match, so a bare "/saints" request
      // would otherwise fall through to the "/" disallow.
      {
        userAgent: [...TRAINING_BOTS],
        allow: [TRAINABLE_PREFIX, `${TRAINABLE_PREFIX}/`],
        disallow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
