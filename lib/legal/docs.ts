// The three texts a reader agrees to, and how the legal sheet names and finds
// them (build 90 note 1; components/legal/LegalSheet.tsx). Pure, so the tests
// can read it under node.

export type LegalDoc = "terms" | "privacy" | "shop-policies";

/** Each document's own page. */
export const LEGAL_HREF: Readonly<Record<LegalDoc, string>> = {
  terms: "/terms",
  privacy: "/privacy",
  "shop-policies": "/shop/policies",
};

/** The sheet's title: the words the reader tapped, as the catalog says them. */
export const LEGAL_TITLE_KEY: Readonly<Record<LegalDoc, string>> = {
  terms: "ui.termsOfServiceX",
  privacy: "ui.privacyPolicyX",
  "shop-policies": "shop.eikonShippingReturns",
};

/** The document an address inside a legal text names, and its place, when it is one of the three. */
export function legalDocOf(href: string): { doc: LegalDoc; hash: string } | null {
  const [path, hash = ""] = href.split("#");
  const clean = path.replace(/\/+$/, "") || "/";
  for (const doc of Object.keys(LEGAL_HREF) as LegalDoc[]) {
    if (LEGAL_HREF[doc] === clean) return { doc, hash };
  }
  return null;
}

/**
 * The language a text is in for this reader: the Privacy Policy has a German
 * of its own, the Terms are English for everyone, and the shop's policy is in
 * the catalog, so in the reader's own language (null).
 */
export function textLang(doc: LegalDoc, locale: string): "en" | "de" | null {
  if (doc === "shop-policies") return null;
  return doc === "privacy" && locale === "de" ? "de" : "en";
}
