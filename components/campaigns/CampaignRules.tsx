"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";

/** The id of the page's own heading: its bar takes the name once this has gone up under it. */
export const RULES_TITLE = "campaign-rules-title";

/** The rules as numbered lines: a rule about pictures joins them with pictures (phase 3). */
const RULES = ["campaigns.rules.1", "campaigns.rules.2", "campaigns.rules.3", "campaigns.rules.4", "campaigns.rules.5"] as const;


/**
 * The rules of praying together (1.9): the short page a reader agrees to
 * before they start a campaign (components/campaigns/StartCampaign.tsx), and
 * can read at any time from the board.
 *
 * THE WORDING IS A DRAFT, shown to testers only. It is the owner's to sign,
 * with the Terms' new section, once a lawyer has read both (item 113 on his
 * page; docs/1.9-build/notes/campaigns-fable.md, 3.2 and 8.3). Campaigns do
 * not open to every reader before that.
 */
export function CampaignRules() {
  const { t } = useTranslate();
  return (
    <section data-campaign-rules="" className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[640px]">
        <h1 id={RULES_TITLE} className="font-serif text-title font-bold leading-[1.1] tracking-[-0.01em] text-paper">
          {t("campaigns.rules.title")}
        </h1>
        <ol className="mt-6 space-y-4">
          {RULES.map((key, i) => (
            <li key={key} className="flex gap-3.5">
              <span aria-hidden className="w-5 shrink-0 font-serif text-body font-semibold tabular-nums leading-[1.6] text-paper/70">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 font-serif text-body leading-[1.6] text-paper/90">{t(key)}</p>
            </li>
          ))}
        </ol>
        <div className="mt-9 border-t border-paper/10 pt-5 font-sans text-caption leading-[1.6] text-paper/70">
          <p>{t("shop.campaignsAreThePrayersOf")}</p>
          <p className="mt-2 select-text">{t("campaigns.contact", { email: SUPPORT_EMAIL })}</p>
        </div>
      </div>
    </section>
  );
}
