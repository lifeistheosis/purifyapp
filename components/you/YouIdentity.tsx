"use client";

// Who the reader is, standing on the Ladder at the top of the You tab (1.8,
// note 71): the owner's pick A of r3-25, "the Ladder, then the day"
// (Homebase/boards/purify-master/variants/r3-25-you.html). Their picture,
// ringed in white; their name large in the reading serif; under it their
// patron saint; and under those their badges.
//
// Since 1.9 (build 98 note 11, You and Profile as one design) it is the one
// piece Profile wears at its top too (components/profile/ReaderIdentity.tsx),
// and the whole of it is the way into Profile, with one chevron: the line
// "Your profile" under the name went, and is said to a screen reader only.
// Profile stays a row of Settings too, with the account. In 1.9 a campaign a
// reader ran will stand by their badges (note 70).
//
// Signed out, Sign in stands where the name stands: the one ask on the
// screen, with the line on where their things are kept above it. A reader
// who gave this device a name without an account (lib/profile/localAccount.ts)
// is called by it, with Sign in as the line under it.
//
// Until 1.8 this was a row under the picture: the picture, the name and
// "Member since", which itself replaced a card that said "Welcome back".

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderAvatar } from "@/components/profile/ReaderAvatar";
import { ReaderIdentity } from "@/components/profile/ReaderIdentity";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { User } from "@/components/ui/icons/User";
import { cn } from "@/lib/cn";
import { useLocalAccount } from "@/lib/profile/localAccount";
import { useMyBadges } from "@/lib/profile/myBadges";
import { useMyCard } from "@/lib/profile/myCard";
import { useMyPicture } from "@/lib/profile/myPicture";

/** Who is here: not known yet, nobody, or a reader with a name. */
export type YouWho = { state: "unknown" } | { state: "out" } | { state: "in"; id: string; name: string };

const NAME = "words-halo block truncate font-heading text-[30px] font-bold leading-[1.15] tracking-[-0.01em] text-paper";
// The ink itself, not nine tenths of it: "Optional", the word under Sign in since the sign-in lines
// were rewritten, stands on a lighter part of the Ladder than the line it replaced, and at 90 percent
// it measured 4.40:1 on Candlelight (scripts/words-on-pictures.mjs, 2026-11-11; 4.99:1 at the ink).
const UNDER = "words-halo mt-1 flex items-center gap-1.5 font-sans text-detail text-paper";

function Chevron({ size = 13 }: { size?: number }) {
  return <ChevronLeft size={size} aria-hidden className="shrink-0 -scale-x-100 opacity-70 rtl:scale-x-100" />;
}

export function YouIdentity({ who }: { who: YouWho }) {
  const { t } = useTranslate();
  const local = useLocalAccount();
  if (who.state === "in") return <SignedIn id={who.id} name={who.name} />;

  // Signed out, and while the device has not yet said who is here: the same
  // height, so nothing under it moves when it does.
  const known = who.state === "out";
  return (
    <div data-you-who={who.state} aria-hidden={known ? undefined : true} className={cn(!known && "invisible")}>
      <p className="words-halo words-halo-close mb-2.5 font-sans text-caption text-paper you-hero-line">{t("ui.privateOnThisDeviceNo")}</p>
      <Link
        href="/signin?next=/account"
        data-you-signin={known ? "" : undefined}
        tabIndex={known ? undefined : -1}
        className="tap-press flex items-center gap-[15px] rounded-2xl"
      >
        {local ? (
          <span className="you-hero-ring inline-flex shrink-0 rounded-full">
            <ReaderAvatar name={local.name} picture={null} size={66} />
          </span>
        ) : (
          <span className="you-hero-empty grid size-[66px] shrink-0 place-items-center rounded-full text-paper/70">
            <User size={28} strokeWidth={1.8} />
          </span>
        )}
        <span className="min-w-0">
          <span className={NAME}>{local ? local.name : t("common.signIn")}</span>
          <span className={UNDER}>
            {local ? t("common.signIn") : t("common.optional")}
            <Chevron />
          </span>
        </span>
      </Link>
    </div>
  );
}

function SignedIn({ id, name }: { id: string; name: string }) {
  const { t } = useTranslate();
  const me = useMyPicture();
  const badges = useMyBadges(id);
  const card = useMyCard();
  return (
    <div data-you-who="in">
      {/* The whole of it opens Profile: the picture travels there, and the name with it. */}
      <Link href="/account/profile" data-you-identity="" className="tap-press block rounded-2xl">
        <ReaderIdentity
          name={name}
          picture={me.state === "in" ? me.picture : null}
          patron={card?.patronSaint ?? null}
          badges={badges}
          carry="from"
          ring
          nameClass={NAME}
          lineClass={UNDER}
          end={<Chevron size={17} />}
        />
        <span className="sr-only">{t("profile.yourProfile")}</span>
      </Link>
    </div>
  );
}
