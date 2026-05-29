import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_LOCALE, type LocaleCode } from "./locales";

/**
 * Locale-aware content loaders. Pattern:
 *   data/{kind}/{id}.{locale}.json   — locale variant (sibling file)
 *   data/saints/{slug}/i18n/{locale}.json — saint bio overrides
 *
 * Loaders always fall back to the English source. Callers can check the
 * returned `isLocalized` flag to render a "Translation in progress" banner
 * when the fallback fired.
 */

export type SaintBioOverrides = {
  shortBio?: string;
  epithet?: string;
  byname?: string;
  life?: string[];
  titles?: string[];
  // Matches the Saint registry shape so overrides can be merged in directly.
  greatFeasts?: { name: string; date: string; href?: string }[];
};

/** Read a saint's locale-specific bio override file, returning null if absent. */
export async function getSaintBioOverrides(
  slug: string,
  locale: LocaleCode,
): Promise<SaintBioOverrides | null> {
  if (locale === DEFAULT_LOCALE) return null;
  const file = path.join(
    process.cwd(),
    "data",
    "saints",
    slug,
    "i18n",
    `${locale}.json`,
  );
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as SaintBioOverrides;
  } catch {
    return null;
  }
}

/**
 * Try to read a saint work file in the requested locale, falling back to
 * the English source if absent. Returns `{ data, isLocalized }` so the page
 * can render a banner when fallback fired.
 */
export async function getLocalizedWorkJson<T = unknown>(
  saintSlug: string,
  workSlug: string,
  locale: LocaleCode,
): Promise<{ data: T; isLocalized: boolean } | null> {
  const tryLocale =
    locale === DEFAULT_LOCALE
      ? null
      : path.join(
          process.cwd(),
          "data",
          "saints",
          saintSlug,
          "i18n",
          locale,
          `${workSlug}.json`,
        );
  const fallback = path.join(
    process.cwd(),
    "data",
    "saints",
    saintSlug,
    `${workSlug}.json`,
  );

  if (tryLocale) {
    try {
      const raw = await fs.readFile(tryLocale, "utf8");
      return { data: JSON.parse(raw) as T, isLocalized: true };
    } catch {
      /* fall through to English */
    }
  }
  try {
    const raw = await fs.readFile(fallback, "utf8");
    return { data: JSON.parse(raw) as T, isLocalized: false };
  } catch {
    return null;
  }
}

/**
 * Read a prayer JSON file with locale fallback. Pattern:
 *   data/prayers/rules/{id}.{locale}.json → data/prayers/rules/{id}.json
 */
export async function getLocalizedPrayerJson<T = unknown>(
  rel: string,
  locale: LocaleCode,
): Promise<{ data: T; isLocalized: boolean } | null> {
  const base = path.join(process.cwd(), "data", "prayers", rel);
  const tryLocale = locale === DEFAULT_LOCALE ? null : base.replace(
    /\.json$/,
    `.${locale}.json`,
  );
  if (tryLocale) {
    try {
      const raw = await fs.readFile(tryLocale, "utf8");
      return { data: JSON.parse(raw) as T, isLocalized: true };
    } catch {
      /* fall through */
    }
  }
  try {
    const raw = await fs.readFile(base, "utf8");
    return { data: JSON.parse(raw) as T, isLocalized: false };
  } catch {
    return null;
  }
}
