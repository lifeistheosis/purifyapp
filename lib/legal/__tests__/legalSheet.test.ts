// The Terms and the Privacy Policy open in a sheet wherever the app says you
// agree to them (build 90 note 1; docs/1.9-build/notes/build-90.md).
//
// His words: "when you click on terms and privacy policy, it doesn't actually
// show you the terms or the privacy policy. So I want to have either a pop-up
// show up with the terms, which is preferred actually, and you can easily
// scroll to see, and the privacy policy too." On the onboarding's account
// step the links were plain links, and the page changed beneath the
// onboarding's layer, which stayed on top. The purchase sheets did the same,
// or closed first and lost the reader's place. His yes of 2026-11-10 added
// the shop's shipping and refund policy, in a sheet of its own, the same way.
//
// This holds:
//   1. no place that asks for agreement links to the texts bare, and each
//      uses the sheet's link for every text it names;
//   2. the pages and the sheet draw one text, and no page carries it itself;
//   3. the link is an ordinary link to the page, and a plain tap opens the
//      sheet (a modified click still opens the page on the website);
//   4. the sheet stands over the onboarding's layer and a purchase sheet,
//      and one press of the phone's Back closes it alone;
//   5. a link inside a text to another of the three shows it in the sheet.
//
// What would go wrong if this broke: a reader agreeing to terms they were
// never shown, or losing their place to read them.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LEGAL_HREF, legalDocOf, textLang } from "@/lib/legal/docs";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Every place the app says you agree, with the texts it names. */
const AGREEMENTS: Record<string, Array<"terms" | "privacy" | "shop-policies">> = {
  // The Google and Apple notice: sign-in, sign-up and the onboarding's account step.
  "components/auth/OAuthButtons.tsx": ["terms", "privacy"],
  // The sign-up form's box, on the sign-up page.
  "components/auth/SignUpForm.tsx": ["terms", "privacy"],
  // The onboarding's own form.
  "components/onboarding/OnboardingFlow.tsx": ["terms", "privacy"],
  // The sign-up page's line under the form.
  "app/(auth)/signup/page.tsx": ["terms", "privacy"],
  // The checkout's agreement, in the cart and the buy bar.
  "components/shop/CartClient.tsx": ["terms", "shop-policies"],
  "components/shop/BuyBar.tsx": ["terms", "shop-policies"],
  // Both purchase sheets, where the stores ask for working links beside a subscription.
  "components/billing/PlusPaywall.tsx": ["terms", "privacy"],
  "components/billing/KeptPaywall.tsx": ["terms", "privacy"],
};

describe("the texts a reader agrees to open in a sheet over the screen", () => {
  it("no place that asks for agreement links to them bare", () => {
    for (const file of Object.keys(AGREEMENTS)) {
      const src = read(file);
      expect(src, `${file} links to a text bare`).not.toMatch(/href=["{]["`]?\/(terms|privacy|shop\/policies)\b/);
    }
  });

  it("each uses the sheet's link for every text it names", () => {
    for (const [file, docs] of Object.entries(AGREEMENTS)) {
      const src = read(file);
      expect(src, file).toContain('import { LegalLink } from "@/components/legal/LegalLink";');
      for (const doc of docs) expect(src, `${file}: ${doc}`).toContain(`<LegalLink doc="${doc}"`);
    }
  });

  it("the pages and the sheet draw one text, and no page carries it itself", () => {
    const pages: Record<string, string> = {
      "app/(app)/terms/page.tsx": "<TermsText />",
      "app/(app)/privacy/page.tsx": '<PrivacyText lang="en" />',
      "app/(app)/shop/policies/page.tsx": "<ShopPoliciesText />",
    };
    for (const [page, draws] of Object.entries(pages)) {
      const src = read(page);
      expect(src, page).toContain(draws);
      // The text's own headings live in components/legal, not in the page.
      expect(src, page).not.toMatch(/<h2\b/);
    }
    // The German page is drawn on the device from its own file (1.9, the reader's language in the apps).
    expect(read("components/privacy/PrivacyDe.tsx")).toContain('<PrivacyText lang="de" />');
    const sheet = read("components/legal/LegalSheet.tsx");
    for (const text of ["TermsText", "PrivacyText", "ShopPoliciesText"]) {
      // Fetched when the sheet shows it, never handed to it as a prop.
      expect(sheet).toContain(`import("./${text}").then((m) => m.${text} as Text)`);
    }
  });

  it("the link is an ordinary link to the page, and a plain tap opens the sheet", () => {
    const link = read("components/legal/LegalLink.tsx");
    expect(link).toContain("href={LEGAL_HREF[doc]}");
    expect(link).toContain("if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;");
    expect(link).toContain("e.preventDefault();");
    expect(link).toContain("<LegalSheet key={opening} doc={doc} open={open} onClose={() => setOpen(false)} />");
    expect(LEGAL_HREF).toEqual({ terms: "/terms", privacy: "/privacy", "shop-policies": "/shop/policies" });
  });

  it("the sheet stands over the onboarding's layer and over a purchase sheet", () => {
    const sheet = read("components/legal/LegalSheet.tsx");
    expect(sheet).toMatch(/<Sheet open=\{open\} onClose=\{onClose\} title=\{title\} desktop fill layer="over-all"/);
    const z = (cls: string) => Number(cls.match(/z-\[(\d+)\]/)![1]);
    const base = read("components/ui/Sheet.tsx");
    const overAll = base.match(/layer === "over-all" \? "fixed inset-0 (z-\[\d+\])"/)![1];
    const overPlayer = base.match(/layer === "over-player" \? "fixed inset-0 (z-\[\d+\])"/)![1];
    const onboarding = read("components/onboarding/OnboardingFlow.tsx").match(/lm-hero fixed inset-0 (z-\[\d+\])/)![1];
    expect(z(overAll)).toBeGreaterThan(z(onboarding));
    expect(z(overAll)).toBeGreaterThan(z(overPlayer));
  });

  it("one press of the phone's Back closes the top sheet alone", () => {
    const back = read("lib/platform/useAndroidBack.ts");
    expect(back).toContain("if (onTop(me)) onBackRef.current();");
    expect(back).toContain("stack.push(me);");
    expect(back).toMatch(/const at = stack\.lastIndexOf\(me\);\s*if \(at >= 0\) stack\.splice\(at, 1\);/);
  });

  it("a link inside a text to another of the three shows it in the sheet; any other page goes to the website", () => {
    expect(legalDocOf("/privacy")).toEqual({ doc: "privacy", hash: "" });
    expect(legalDocOf("/terms/")).toEqual({ doc: "terms", hash: "" });
    expect(legalDocOf("/shop/policies#returns")).toEqual({ doc: "shop-policies", hash: "returns" });
    expect(legalDocOf("/about")).toBeNull();
    expect(legalDocOf("/account")).toBeNull();
    const sheet = read("components/legal/LegalSheet.tsx");
    expect(sheet).toContain("onClickCapture={onClickCapture}");
    expect(sheet).toContain("out.href = websiteHref(href, true);");
  });

  it("a German reader is shown the German Privacy Policy, and the Terms stay English for everyone", () => {
    expect(textLang("privacy", "de")).toBe("de");
    expect(textLang("privacy", "fr")).toBe("en");
    expect(textLang("terms", "de")).toBe("en");
    expect(textLang("shop-policies", "ar")).toBeNull();
  });
});
