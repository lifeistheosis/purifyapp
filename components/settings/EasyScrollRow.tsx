"use client";

// Easy Scroll in Settings (1.9, build 89 note 7; the arbiter's yes of
// 2026-11-10): on a prayer page a short swipe settles on the next prayer. On
// by default; off here keeps prayer pages scrolling as any page, with
// Purify's motion left on. The praying hands are the Prayers tab's own mark.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Hands } from "@/components/ui/icons/Hands";
import { setEasyScroll, useEasyScrollOn } from "@/lib/prayers/easyScrollSetting";

import { Row, Switch } from "./LitPanel";

export function EasyScrollRow() {
  const { t } = useTranslate();
  const on = useEasyScrollOn();
  return (
    <Row
      icon={<Hands size={18} />}
      label={t("settings.easyScroll")}
      description={t("settings.easyScrollHint")}
      control={<Switch on={on} onChange={setEasyScroll} label={t("settings.easyScroll")} />}
    />
  );
}
