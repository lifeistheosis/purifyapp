"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";

import { FEATURES } from "@/components/gifts/OrderGiftClient";

/** What Plus opens, as the gift pages show it before the gift is theirs: Settings' own rows (components/gifts/OrderGiftClient.tsx). */
export function GiftFeatures() {
  const { t } = useTranslate();
  return (
    <div className="gift-feats mt-7">
      <p className="set-h">{t("orderGift.featuresTitle")}</p>
      <div className="set-panel mt-2.5">
        {FEATURES.map(({ Icon, title, desc }) => (
          <div key={title} className="set-row">
            <div className="set-lab">
              <span className="set-plate">
                <Icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="set-label">{t(title)}</span>
                <span className="set-desc">{t(desc)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
