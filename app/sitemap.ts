import type { MetadataRoute } from "next";
import { allChapterParams, BOOKS } from "@/lib/bible/books";
import { SAINTS } from "@/lib/saints/saints";
import { COUNCILS } from "@/lib/councils/councils";
import { SITE_URL as SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const STATIC = [
    "/",
    "/whats-new",
    "/pricing",
    "/about",
    "/faq",
    "/support",
    "/bible",
    "/saints",
    "/councils",
    "/calendar",
    "/prayers",
    "/prayers/today",
    "/prayers/morning",
    "/prayers/evening",
    "/prayers/learning",
    "/saved",
    "/account",
  ];

  const entries: MetadataRoute.Sitemap = STATIC.map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    changeFrequency: p === "/" || p === "/prayers/today" ? "daily" : "weekly",
    priority: p === "/" ? 1 : 0.7,
  }));

  // Every Bible chapter.
  for (const { book, chapter } of allChapterParams()) {
    entries.push({
      url: `${SITE}/bible/${book}/${chapter}`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    });
  }
  // Bible book root (chapter 1 is the implicit landing; the explicit
  // book index is covered by the per-chapter URLs above).
  for (const b of BOOKS) {
    entries.push({
      url: `${SITE}/bible/${b.slug}/1`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.55,
    });
  }

  // Saints + works.
  for (const s of SAINTS) {
    entries.push({
      url: `${SITE}/saints/${s.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
    for (const w of s.works) {
      entries.push({
        url: `${SITE}/saints/${s.slug}/${w.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  // Councils + documents.
  for (const c of COUNCILS) {
    entries.push({
      url: `${SITE}/councils/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    });
    for (const d of c.documents) {
      entries.push({
        url: `${SITE}/councils/${c.slug}/${d.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.55,
      });
    }
  }

  return entries;
}
