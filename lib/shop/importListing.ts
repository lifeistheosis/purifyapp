/**
 * Read a distributor's product page and turn it into a draft EIKON listing.
 *
 * Pure: HTML in, a draft out. No network here at all, which is what lets the
 * whole thing be tested against saved pages and lets the same parser run on a
 * page the server fetched AND on a page the owner pasted in after clearing a
 * CAPTCHA himself.
 *
 * WHERE THE FACTS COME FROM, best first:
 *
 *  1. JSON-LD (`<script type="application/ld+json">` with @type Product). This
 *     is the shop telling search engines what it sells, in its own words, and
 *     it carries price, SKU, brand, availability and images in one object.
 *     Most Shopify, BigCommerce, WooCommerce and Squarespace stores emit it.
 *  2. Shopify's own product JSON, which the route fetches from `<url>.json`
 *     when the link looks like a Shopify product. Cleanest of the lot when it
 *     is there: real variants, real SKUs.
 *  3. OpenGraph and Twitter meta, which almost every store has: title,
 *     description, image, and often product:price:amount.
 *  4. Microdata (itemprop), for the older carts.
 *  5. The bare document: <title>, the first <h1>, meta description.
 *
 * Whatever answers first wins per field, so a page with good JSON-LD and a bad
 * <title> still reads correctly. Every draft records which source it came from
 * so the panel can say so, and nothing here is ever saved without the owner
 * opening it as a draft and pressing Save.
 *
 * REGEX, NOT A DOM PARSER, on purpose. This runs in a route on Render where a
 * new dependency is a new thing that can break a deploy, and the four sources
 * above are all either JSON inside one script tag or attributes on meta tags.
 * The one place that would want a real parser, turning a description's HTML
 * into text, is handled by stripping tags, which is the right amount of work
 * for text a human is about to edit anyway.
 */

export type ParsedListing = {
  title: string | null;
  /** Plain text, paragraphs kept. The owner edits this before it ships. */
  description: string | null;
  /** What the DISTRIBUTOR charges. Never the shop's retail price. */
  priceCents: number | null;
  currency: string | null;
  sku: string | null;
  brand: string | null;
  /** "In stock", "Out of stock", or whatever the page said. */
  availability: string | null;
  material: string | null;
  dimensions: string | null;
  /** Absolute URLs, de-duplicated, best image first. */
  images: string[];
  canonicalUrl: string | null;
  source: ListingSource;
  /** Anything the owner should know before trusting a field. */
  warnings: string[];
};

export type ListingSource = "json-ld" | "shopify" | "microdata" | "meta" | "html" | "none";

const MAX_DESCRIPTION = 8000;
const MAX_IMAGES = 8;

/* ── text helpers ────────────────────────────────────────────────────────── */

// mdash becomes a comma deliberately: supplier copy is full of em dashes and
// this repo does not ship them. Catching it here means the owner is not
// deleting them by hand out of every imported description.
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: ",",
  ndash: "-",
  hellip: "...",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  times: "x",
  deg: " degrees",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeChar(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeChar(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function safeChar(code: number): string {
  if (!Number.isFinite(code) || code < 9 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** HTML to readable text: paragraphs and list items survive, tags do not. */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t ]+/g, " ");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_DESCRIPTION);
}

function clean(s: unknown, max = 300): string | null {
  if (typeof s !== "string") return null;
  const out = decodeEntities(s.replace(/\s+/g, " ")).trim().slice(0, max);
  return out || null;
}

/**
 * A money string to cents.
 *
 * Handles "$24.99", "24.99 USD", "1,299.00" and the European "24,99", which is
 * the one that can silently produce a price 100x wrong: a comma is a decimal
 * separator when it is followed by exactly two digits and there is no dot.
 */
export function toCents(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw * 100);
  if (typeof raw !== "string") return null;
  const m = raw.replace(/\s/g, "").match(/-?[\d.,]+/);
  if (!m) return null;
  let n = m[0];
  const lastDot = n.lastIndexOf(".");
  const lastComma = n.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // Both separators present, so the LATER one is the decimal point and the
    // earlier one groups thousands. "1,299.50" and "1.299,50" are the same money
    // written by two continents.
    const decimalIsComma = lastComma > lastDot;
    n = decimalIsComma ? n.split(".").join("").replace(",", ".") : n.split(",").join("");
  } else if (lastComma >= 0) {
    // Comma alone. Two digits after it is a decimal, anything else is grouping.
    n = /,\d{2}$/.test(n) ? n.replace(",", ".") : n.split(",").join("");
  }
  const value = Number.parseFloat(n);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

// Letters that NFKD will not take apart, because they are their own letters
// rather than an accent sitting on a Latin one. Without these, "Mikołaja"
// slugs to "miko-aja". Greek and Cyrillic are left alone on purpose: there is
// no honest one-to-one for them, and a title in either is one the owner should
// be typing a slug for himself.
const LETTER_SWAPS: [RegExp, string][] = [
  [/ł/g, "l"],
  [/đ|ð/g, "d"],
  [/ø/g, "o"],
  [/æ/g, "ae"],
  [/œ/g, "oe"],
  [/ß/g, "ss"],
  [/þ/g, "th"],
];

/** A title to a URL slug the product schema will accept. */
export function slugify(title: string): string {
  let text = decodeEntities(title).toLowerCase();
  for (const [re, to] of LETTER_SWAPS) text = text.replace(re, to);
  return (
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120)
      .replace(/-+$/g, "") || "listing"
  );
}

/** Make a slug unique against what the shop already has. */
export function uniqueSlug(base: string, taken: readonly string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; i < 200; i++) {
    const next = `${base.slice(0, 116)}-${i}`;
    if (!used.has(next)) return next;
  }
  return `${base.slice(0, 110)}-${Date.now().toString(36)}`;
}

function absolute(url: string, base: string): string | null {
  try {
    const u = new URL(decodeEntities(url.trim()), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/* ── the page's own tags ─────────────────────────────────────────────────── */

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z:_-][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

/** Every meta tag as key to content, keyed by property or name. */
export function metaTags(html: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const a = attrs(tag);
    const key = (a.property || a.name || a.itemprop || "").toLowerCase();
    const content = a.content ?? "";
    if (!key || !content) continue;
    (out[key] ??= []).push(content);
  }
  return out;
}

function firstTagText(html: string, tag: string): string | null {
  const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? clean(htmlToText(m[1]), 200) : null;
}

/* ── JSON-LD ─────────────────────────────────────────────────────────────── */

type Json = Record<string, unknown>;

export function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, "");
    try {
      out.push(JSON.parse(raw));
    } catch {
      // A store with a broken block is not a reason to fail the import; the
      // meta tags below usually carry the same four facts.
    }
  }
  return out;
}

function typeOf(node: Json): string[] {
  const t = node["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

/** Walk @graph, arrays and nested nodes for the first Product. */
export function findProductNode(blocks: unknown[]): Json | null {
  const queue: unknown[] = [...blocks];
  let guard = 0;
  while (queue.length && guard++ < 5000) {
    const node = queue.shift();
    if (Array.isArray(node)) {
      queue.push(...node);
      continue;
    }
    if (!node || typeof node !== "object") continue;
    const obj = node as Json;
    if (typeOf(obj).some((t) => /product/i.test(t))) return obj;
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") queue.push(v);
    }
  }
  return null;
}

function offerOf(node: Json): Json | null {
  const raw = node.offers ?? node.offer;
  const first = Array.isArray(raw) ? raw[0] : raw;
  return first && typeof first === "object" ? (first as Json) : null;
}

function imagesFrom(value: unknown, base: string): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") {
      const abs = absolute(v, base);
      if (abs) out.push(abs);
    } else if (v && typeof v === "object") {
      const url = (v as Json).url ?? (v as Json).contentUrl;
      if (typeof url === "string") {
        const abs = absolute(url, base);
        if (abs) out.push(abs);
      }
    }
  };
  if (Array.isArray(value)) value.forEach(push);
  else push(value);
  return out;
}

function availabilityText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const tail = value.split(/[/#]/).pop() ?? value;
  const spaced = tail.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase() : null;
}

/* ── the parser ──────────────────────────────────────────────────────────── */

function empty(): ParsedListing {
  return {
    title: null,
    description: null,
    priceCents: null,
    currency: null,
    sku: null,
    brand: null,
    availability: null,
    material: null,
    dimensions: null,
    images: [],
    canonicalUrl: null,
    source: "none",
    warnings: [],
  };
}

function dedupe(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    // Shopify and friends serve the same file at a dozen widths. Keying on the
    // path without the query keeps one of each picture, not eight of the first.
    let key = u;
    try {
      const parsed = new URL(u);
      key = parsed.origin + parsed.pathname.replace(/_\d+x\d*(?=\.[a-z]+$)/i, "");
    } catch {
      /* keep the raw string as the key */
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
    if (out.length >= MAX_IMAGES) break;
  }
  return out;
}

/**
 * Parse a fetched (or pasted) product page.
 *
 * `baseUrl` resolves relative image paths and is what the draft records as the
 * supplier link, so pass the URL the HTML actually came from.
 */
export function parseListing(html: string, baseUrl: string): ParsedListing {
  const out = empty();
  if (!html || !html.trim()) {
    out.warnings.push("The page was empty.");
    return out;
  }

  const meta = metaTags(html);
  const metaOne = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = meta[k]?.[0];
      if (v) return clean(v, 1000);
    }
    return null;
  };

  const node = findProductNode(jsonLdBlocks(html));
  if (node) {
    const offer = offerOf(node);
    out.source = "json-ld";
    out.title = clean(node.name, 200);
    out.description = node.description ? htmlToText(String(node.description)) : null;
    out.priceCents = toCents(
      offer?.price ??
        offer?.lowPrice ??
        (offer?.priceSpecification as Json | undefined)?.price ??
        node.price,
    );
    out.currency = clean(offer?.priceCurrency ?? node.priceCurrency, 8);
    out.sku = clean(node.sku ?? node.mpn ?? offer?.sku, 120);
    out.brand =
      clean(typeof node.brand === "object" ? (node.brand as Json)?.name : node.brand, 200) ??
      clean(typeof node.manufacturer === "object" ? (node.manufacturer as Json)?.name : node.manufacturer, 200);
    out.availability = availabilityText(offer?.availability ?? node.availability);
    out.material = clean(node.material, 300);
    out.dimensions = clean(node.size ?? node.depth ?? node.width, 200);
    out.images = imagesFrom(node.image, baseUrl);
  }

  // Meta fills whatever JSON-LD did not carry. A store can have one and not
  // the other, and plenty have both with only one of them correct.
  const metaTitle =
    metaOne("og:title", "twitter:title", "product:title") ?? firstTagText(html, "h1") ?? firstTagText(html, "title");
  const metaDescription = metaOne("og:description", "twitter:description", "description");
  const metaPrice = metaOne(
    "product:price:amount",
    "og:price:amount",
    "twitter:data1",
    "product:price",
  );

  if (!out.title && metaTitle) {
    out.title = clean(metaTitle, 200);
    if (out.source === "none") out.source = meta["og:title"] ? "meta" : "html";
  }
  if (!out.description && metaDescription) {
    out.description = htmlToText(metaDescription);
    if (out.source === "none") out.source = "meta";
  }
  if (out.priceCents === null && metaPrice) {
    out.priceCents = toCents(metaPrice);
    if (out.source === "none") out.source = "meta";
  }
  out.currency ??= metaOne("product:price:currency", "og:price:currency");
  out.sku ??= metaOne("product:retailer_item_id", "product:sku");
  out.brand ??= metaOne("product:brand", "og:site_name");
  out.availability ??= availabilityText(metaOne("product:availability", "og:availability") ?? undefined);

  const metaImages = (meta["og:image"] ?? [])
    .concat(meta["og:image:secure_url"] ?? [], meta["twitter:image"] ?? [])
    .map((u) => absolute(u, baseUrl))
    .filter((u): u is string => Boolean(u));
  out.images = dedupe([...out.images, ...metaImages]);

  // Microdata, for carts that predate all of the above.
  if (!out.title || out.priceCents === null) {
    const micro = microdata(html, baseUrl);
    out.title ??= micro.title;
    if (out.priceCents === null) out.priceCents = micro.priceCents;
    out.sku ??= micro.sku;
    if (out.images.length === 0) out.images = micro.images;
    if (out.source === "none" && (micro.title || micro.priceCents !== null)) out.source = "microdata";
  }

  // Last resort, and the one that carries the small carts: read the markup
  // itself for a price, a gallery and a stock line.
  if (out.priceCents === null) {
    const bare = priceInMarkup(html);
    out.priceCents = bare.cents;
    out.currency ??= bare.currency;
    if (out.source === "none" && bare.cents !== null) out.source = "html";
  }
  if (out.images.length === 0) {
    out.images = imagesInMarkup(html, baseUrl);
    if (out.source === "none" && out.images.length) out.source = "html";
  }
  out.availability ??= stockInMarkup(html);

  out.canonicalUrl = canonical(html, baseUrl) ?? baseUrl;

  if (!out.title) out.warnings.push("No product name found. Type one before saving.");
  if (out.priceCents === null) {
    out.warnings.push("No price found on the page. Put the distributor's cost in yourself.");
  }
  if (out.images.length === 0) out.warnings.push("No pictures found. Add them by hand.");
  return out;
}

/* ── the bare page ───────────────────────────────────────────────────────── */

// Small distributors run carts that emit none of the above: no JSON-LD, no
// OpenGraph, no microdata, just a heading, a price in a tag that says price,
// and a gallery. Verified against a live page while building this, which is
// how the gap was found: title and description came through and the two facts
// that matter most, cost and pictures, did not.

const CURRENCY_BY_SYMBOL: Record<string, string> = {
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
};

/** A price out of any tag whose class or id says price, else the first
 *  currency-marked number on the page. */
export function priceInMarkup(html: string): { cents: number | null; currency: string | null } {
  const tagged = /<([a-z0-9]+)\b[^>]*(?:class|id)\s*=\s*["'][^"']*price[^"']*["'][^>]*>([\s\S]{0,160}?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagged.exec(html))) {
    const text = decodeEntities(htmlToText(m[2]));
    const cents = toCents(text);
    // Zero is what an empty "price" wrapper reads as, and a free product is
    // not what anyone is importing.
    if (cents !== null && cents > 0) {
      return { cents, currency: CURRENCY_BY_SYMBOL[text.trim()[0]] ?? null };
    }
  }
  const loose = htmlToText(html).match(/([$£€¥])\s?(\d[\d.,]*)/);
  if (loose) {
    const cents = toCents(loose[2]);
    if (cents !== null && cents > 0) return { cents, currency: CURRENCY_BY_SYMBOL[loose[1]] ?? null };
  }
  return { cents: null, currency: null };
}

// Chrome, a cart badge, a payment logo and a tracking pixel are all <img>.
const NOT_A_PRODUCT_IMAGE = /logo|icon|sprite|badge|pixel|spacer|blank|loading|avatar|placeholder|favicon|flag|payment|trustpilot|\.svg(\?|$)/i;

/** Pictures out of a plain page, best effort, in document order. */
export function imagesInMarkup(html: string, base: string): string[] {
  const out: string[] = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const a = attrs(tag);
    const raw = a.src || a["data-src"] || a["data-original"] || (a.srcset ?? "").split(/\s|,/)[0];
    if (!raw || raw.startsWith("data:")) continue;
    const named = `${raw} ${a.class ?? ""} ${a.alt ?? ""}`;
    if (NOT_A_PRODUCT_IMAGE.test(named)) continue;
    const width = Number(a.width || 0);
    const height = Number(a.height || 0);
    // A declared size under 100px is furniture, not the product.
    if ((width && width < 100) || (height && height < 100)) continue;
    const abs = absolute(raw, base);
    if (abs) out.push(abs);
  }
  return dedupe(out);
}

/** "In stock", "Out of stock", or nothing, from the page's own words. */
export function stockInMarkup(html: string): string | null {
  const text = htmlToText(html);
  if (/\bout of stock\b|\bsold out\b/i.test(text)) return "Out of stock";
  if (/\bin stock\b/i.test(text)) return "In stock";
  if (/\bbackorder|pre[\s-]?order\b/i.test(text)) return "On backorder";
  return null;
}

function canonical(html: string, base: string): string | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const a = attrs(tag);
    if ((a.rel ?? "").toLowerCase() === "canonical" && a.href) return absolute(a.href, base);
  }
  return null;
}

function microdata(html: string, base: string) {
  const grab = (prop: string): string | null => {
    const re = new RegExp(`<([a-z0-9]+)\\b[^>]*itemprop\\s*=\\s*["']${prop}["'][^>]*>`, "i");
    const m = html.match(re);
    if (!m) return null;
    const a = attrs(m[0]);
    if (a.content) return clean(a.content, 500);
    if (prop === "image" && (a.src || a.href)) return a.src || a.href;
    const after = html.slice((m.index ?? 0) + m[0].length);
    const end = after.search(new RegExp(`</${m[1]}>`, "i"));
    return clean(htmlToText(after.slice(0, end < 0 ? 200 : end)), 500);
  };
  const image = grab("image");
  return {
    title: grab("name"),
    priceCents: toCents(grab("price")),
    sku: grab("sku"),
    images: image ? ([absolute(image, base)].filter(Boolean) as string[]) : [],
  };
}

/* ── Shopify ─────────────────────────────────────────────────────────────── */

/** Does this link look like a Shopify product page? Then `<url>.json` exists. */
export function shopifyProductJsonUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/\/products\/[^/]+$/.test(u.pathname)) return null;
    u.search = "";
    u.hash = "";
    return `${u.toString().replace(/\/$/, "")}.json`;
  } catch {
    return null;
  }
}

/**
 * Shopify's product JSON. Cleanest source there is: the first variant's price
 * and SKU are the ones a reseller actually pays and quotes.
 */
export function parseShopifyProduct(json: unknown, baseUrl: string): ParsedListing | null {
  if (!json || typeof json !== "object") return null;
  const product = ((json as Json).product ?? json) as Json;
  if (typeof product.title !== "string") return null;

  const variants = Array.isArray(product.variants) ? (product.variants as Json[]) : [];
  const variant = variants[0] ?? null;
  const images = Array.isArray(product.images)
    ? (product.images as Json[])
        .map((i) => (typeof i?.src === "string" ? absolute(i.src, baseUrl) : null))
        .filter((u): u is string => Boolean(u))
    : [];

  const out = empty();
  out.source = "shopify";
  out.title = clean(product.title, 200);
  out.description = product.body_html ? htmlToText(String(product.body_html)) : null;
  out.priceCents = toCents(variant?.price);
  out.sku = clean(variant?.sku, 120);
  out.brand = clean(product.vendor, 200);
  out.availability =
    variant && "available" in variant ? (variant.available ? "In stock" : "Out of stock") : null;
  out.images = dedupe(images);
  out.canonicalUrl = baseUrl;
  if (variants.length > 1) {
    out.warnings.push(
      `${variants.length} variants on that page. This draft used the first one, ${clean(variant?.title, 60) ?? "unnamed"}.`,
    );
  }
  if (out.priceCents === null) out.warnings.push("No price on the variant. Enter the cost yourself.");
  return out;
}

/* ── the challenge check ─────────────────────────────────────────────────── */

const CHALLENGE_MARKERS: [RegExp, string][] = [
  [/g-recaptcha|recaptcha\/api\.js/i, "reCAPTCHA"],
  [/h-captcha|hcaptcha\.com/i, "hCaptcha"],
  [/cf-turnstile|challenges\.cloudflare\.com/i, "Cloudflare Turnstile"],
  [/cf-browser-verification|just a moment|attention required!/i, "Cloudflare check"],
  [/px-captcha|perimeterx/i, "PerimeterX"],
  [/are you a robot|verify (that )?(you('|’)?re|you are) human|unusual traffic/i, "a bot check"],
];

/**
 * Did the shop hand us a challenge instead of the product?
 *
 * Returns the name of what is in the way, or null. The status codes matter as
 * much as the body: a 403 or 503 with a short page is the shape of a block
 * even when none of the words above appear.
 */
export function challengeIn(html: string, status = 200): string | null {
  for (const [re, name] of CHALLENGE_MARKERS) {
    if (re.test(html)) return name;
  }
  if ((status === 403 || status === 429 || status === 503) && html.length < 60_000) {
    return `an HTTP ${status} block`;
  }
  return null;
}
