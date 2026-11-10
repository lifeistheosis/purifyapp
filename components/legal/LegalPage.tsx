import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { T } from "@/components/i18n/T";
import { WAY_FACT, WAY_H2, WAY_TRAY } from "@/components/theology/wayStyle";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Lock } from "@/components/ui/icons/Lock";
import { Quill } from "@/components/ui/icons/Quill";
import { Truck } from "@/components/ui/icons/Truck";
import { LEGAL_HREF, LEGAL_TITLE_KEY, type LegalDoc } from "@/lib/legal/docs";
import { shopEnabled } from "@/lib/shop/flags";

import { LegalContents } from "./LegalContents";
import { LEGAL_PAGE_NAME } from "./legalStyle";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/** Each text's mark: the pen an agreement is signed with, the lock on what is yours, the van a parcel rides in. */
const MARK: Readonly<Record<LegalDoc, Icon>> = { terms: Quill, privacy: Lock, "shop-policies": Truck };

/** Each page's own name, the words its head says, and its bar after it (the page draws the bar, with the same words). */
const NAME: Readonly<Record<LegalDoc, string>> = { terms: "terms.eyebrow", privacy: "privacy.eyebrow", "shop-policies": "shop.eikonShippingReturns" };

const DOCS: readonly LegalDoc[] = ["terms", "privacy", "shop-policies"];

/**
 * The frame the three legal pages share (1.9; his word of 2026-11-10, "can
 * you revamp the TOS design?", and his yes to the Privacy Policy and the
 * shop's policy taking the same look): the Terms of Service, the Privacy
 * Policy and EIKON's shipping and returns, in the house style Theology's
 * pages wear (components/theology/LeafPage.tsx).
 *
 * The text is theirs and is not touched here: each is one component, drawn
 * by its page and by the sheet (./TermsText.tsx, ./PrivacyText.tsx,
 * ./ShopPoliciesText.tsx, ./LegalSheet.tsx). The frame gives it:
 *
 *  - a head: the text's mark on a plate and the page's name, small, over the
 *    text's own title. The bar over the page is the page's to draw, as every
 *    page's is (lib/nav/__tests__/backBar.test.ts), and it takes this name
 *    once the head has gone up under it (LEGAL_PAGE_NAME; the shop's policy
 *    stands under the shop's own tabs and has none);
 *  - on a wide page, its contents as a rail beside it (./LegalContents.tsx;
 *    a phone has them folded under the opening words, inside the text);
 *  - at its foot, the other texts, as rows (the shop's only where the shop
 *    is open).
 *
 * Until 1.9 each page was a label and a column of text, nineteen screens of
 * a phone for the Terms, with nothing to find a section by.
 */
export function LegalPage({ doc, children }: { doc: LegalDoc; children: ReactNode }) {
  const Mark = MARK[doc];
  // The shop's policy is a way in to the shop, so it stands at the foot only where the shop is open (lib/shop/flags.ts).
  const others = DOCS.filter((d) => d !== doc && (d !== "shop-policies" || shopEnabled()));
  return (
    <section data-legal-page={doc} className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
      {/* A computer: the rail and the text side by side, and the text's own folded list stands down. The
          rail's column runs the text's whole height, so the rail can stay with the reader as the text
          goes by. Never in the apps: a tablet there keeps the app's own shell and the folded list
          (app/globals.css, the native-md-* rules, which stand outside the layers and so win). */}
      <div className="mx-auto w-full max-w-[640px] lg:grid lg:max-w-[968px] lg:grid-cols-[240px_minmax(0,640px)] lg:gap-x-[88px] lg:[&_[data-legal-contents=fold]]:hidden native-md-block">
        <aside className="hidden pt-[68px] lg:block native-md-hidden">
          <LegalContents rail />
        </aside>
        <article className="mx-auto w-full min-w-0 max-w-[640px]">
          <header data-legal-head="" className="flex items-center gap-3">
            <span aria-hidden className="theology-plate grid size-11 shrink-0 place-items-center rounded-[13px] text-paper">
              <Mark size={22} />
            </span>
            <p id={LEGAL_PAGE_NAME} className="min-w-0 font-sans text-detail font-semibold text-paper/60">
              <T k={NAME[doc]} />
            </p>
          </header>

          <div data-legal-text="" className="mt-5">
            {children}
          </div>

          <section aria-labelledby="legal-also" data-legal-also="" className="mt-12">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="legal-also" className={WAY_H2}>
                <T k="study.related" />
              </h2>
              <span className={WAY_FACT}>{others.length}</span>
            </div>
            <ul className={`${WAY_TRAY} mt-2.5`}>
              {others.map((d) => {
                const Glyph = MARK[d];
                return (
                  <li key={d} className="theology-rule">
                    <Link href={LEGAL_HREF[d]} className="theology-row flex min-h-[56px] items-center gap-3 rounded-[14px] px-2 py-2.5">
                      <span aria-hidden className="theology-plate grid size-8 shrink-0 place-items-center rounded-[10px] text-paper/85">
                        <Glyph size={17} />
                      </span>
                      <span className="min-w-0 flex-1 font-serif text-[15.5px] font-semibold leading-[1.26] text-paper/92">
                        <T k={LEGAL_TITLE_KEY[d]} />
                      </span>
                      <ChevronRight size={14} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </article>
      </div>
    </section>
  );
}
