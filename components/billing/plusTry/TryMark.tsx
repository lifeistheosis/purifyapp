"use client";

// Try your mark in Community (r3-07 A): a post as Community's feed heads it
// (components/community/CommunityClient.tsx): the picture, the name, and
// beside it the small cross a subscriber wears (components/community/
// SupporterMark.tsx, the real mark). Under it the switch the reader has in
// Settings, "Show my supporter mark", to see the name with it and without.
//
// The name and picture are the reader's own when signed in
// (lib/profile/myPicture.ts, read only). The post's words are an example,
// marked so, in the Bible's own words. The switch here is the preview's
// alone: the reader's setting is not changed by it.

import { useState } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { SupporterMark } from "@/components/community/SupporterMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useMyPicture } from "@/lib/profile/myPicture";

import { johnVerse, useJohnReference } from "./TryBible";
import { ExampleTag, TrySwitch, TryWindow } from "./TryKit";

/** The verse the example post shares: John 1:4. */
const POST_VERSE = 4;

export default function TryMark({ row }: TryProps) {
  const { t } = useTranslate();
  const me = useMyPicture();
  const reference = useJohnReference();
  const [on, setOn] = useState(true);
  const name = me.state === "in" ? me.name : t("nav.you");
  const picture = me.state === "in" ? me.picture : null;

  return (
    <>
      <TryWindow label={t(row.name)}>
        <div className="px-4 pb-16 pt-5">
          <article className="rounded-2xl border border-paper/10 bg-night-soft p-4">
            <div className="flex items-center gap-3">
              <CommunityAvatar name={name} url={picture} />
              <span className="flex min-w-0 items-center gap-1 font-sans text-ui font-semibold text-paper">
                <span className="truncate">{name}</span>
                <SupporterMark tier={on ? "plus" : null} />
              </span>
              <ExampleTag className="ms-auto shrink-0" />
            </div>
            <p className="mt-3 font-serif text-body leading-[1.6] text-paper/90">{johnVerse(POST_VERSE)}</p>
            <p className="mt-1.5 font-sans text-caption text-paper/50">{reference(POST_VERSE)}</p>
          </article>
        </div>
      </TryWindow>

      {/* As Settings asks it: the question, then On and Off. */}
      <p className="mt-4 font-sans text-ui font-semibold text-paper">{t("settings.showSupporterMark")}</p>
      <TrySwitch
        label={t("settings.showSupporterMark")}
        value={on ? "on" : "off"}
        onChange={(v) => setOn(v === "on")}
        options={[
          { id: "on", label: t("common.on") },
          { id: "off", label: t("common.off") },
        ]}
        className="mt-2"
      />
    </>
  );
}
