"use client";

import { SafetyLine } from "@/components/campaigns/SafetyLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useCampaignPart } from "@/lib/campaigns/useCampaignsOpen";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";

/** The id of the page's own heading: its bar takes the name once this has gone up under it. */
export const RULES_TITLE = "campaign-rules-title";

/**
 * The rules as numbered lines. The rule about pictures stands fourth, where
 * the notes drafted it (3.2), and only while the server has pictures
 * switched on (lib/campaigns/parts.ts): a rule about something a reader
 * cannot do would only puzzle them.
 */
const RULES = ["campaigns.rules.1", "campaigns.rules.2", "campaigns.rules.3", "campaigns.rules.4", "campaigns.rules.5"] as const;
const PICTURES_RULE = "campaigns.rules.pictures";
const PICTURES_RULE_AFTER = 3;


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
  const pictures = useCampaignPart("pictures");
  const rules: string[] = pictures ? [...RULES.slice(0, PICTURES_RULE_AFTER), PICTURES_RULE, ...RULES.slice(PICTURES_RULE_AFTER)] : [...RULES];
  return (
    <section data-campaign-rules="" className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[640px]">
        <h1 id={RULES_TITLE} className="font-serif text-title font-bold leading-[1.1] tracking-[-0.01em] text-paper">
          {t("campaigns.rules.title")}
        </h1>
        <ol className="mt-6 space-y-4">
          {rules.map((key, i) => (
            <li key={key} className="flex gap-3.5">
              <span aria-hidden className="w-5 shrink-0 font-serif text-body font-semibold tabular-nums leading-[1.6] text-paper/70">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 font-serif text-body leading-[1.6] text-paper/90">{t(key)}</p>
            </li>
          ))}
        </ol>
        <div className="mt-9 border-t border-paper/10 pt-5 font-sans text-caption leading-[1.6] text-paper/70">
          {/* Always there, for a reader in danger or one who fears for someone (./SafetyLine.tsx). */}
          <SafetyLine className="leading-[1.6]" />
          <p className="mt-3">{t("shop.campaignsAreThePrayersOf")}</p>
          <p className="mt-2 select-text">{t("campaigns.contact", { email: SUPPORT_EMAIL })}</p>
        </div>
      </div>
    </section>
  );
}
