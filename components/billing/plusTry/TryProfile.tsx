"use client";

// Try profile extras (r3-07 A): the Community profile card as the profile
// editor's live card draws it (components/community/profile/ProfileEditor.tsx,
// from ProfileCard.tsx's own pieces, r3-28 A since 1.8): the effect over the
// card, the light or the banner at the top, the picture in its frame, the
// name, and the card in a two-colour theme. Under it, the frames, the
// effects and the themes, to try each on.
//
// It is the reader's own card where there is one: a signed-in reader's
// profile is read (lib/profile/client.ts, fetchMyProfile, a read and nothing
// more) and dressed here, the way the editor lets every reader try a look on
// before Plus. Nothing is saved: the server keeps Plus's looks for
// subscribers alone (lib/profile/cosmetics.ts, visibleCosmetics), and a
// preview sends it nothing.

import { useEffect, useMemo, useState } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { ProfileAboutDoor, ProfileFace, ProfileTop, profileSurface, surfaceClass } from "@/components/community/profile/ProfileCard";
import { ProfileEffect } from "@/components/community/profile/ProfileEffect";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { cn } from "@/lib/cn";
import { fetchMyProfile } from "@/lib/profile/client";
import { DECORATIONS, EFFECTS, SEASONAL_DECORATIONS, SEASONAL_EFFECTS, THEMES, inSeason, type Cosmetics } from "@/lib/profile/cosmetics";
import { useMyPicture } from "@/lib/profile/myPicture";
import type { MyProfile } from "@/lib/profile/publicProfile";
import { readLocalSessionUser } from "@/lib/supabase/localSession";

import { TryStrip, TrySwitch, TryTile, TryWindow } from "./TryKit";

type Kind = "frame" | "effect" | "theme";

const NONE: Cosmetics = { bannerColor: null, bannerUrl: null, themePrimary: null, themeAccent: null, decoration: null, effect: null };

/** The look a preview opens in: a frame, a light over the card, and a quiet theme. */
const FIRST = { decoration: "halo", effect: "candlelight", theme: "theophany" } as const;

export default function TryProfile({ row }: TryProps) {
  const { t } = useTranslate();
  const me = useMyPicture();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [kind, setKind] = useState<Kind>("frame");
  const [decoration, setDecoration] = useState<string | null>(FIRST.decoration);
  const [effect, setEffect] = useState<string | null>(FIRST.effect);
  const [theme, setTheme] = useState<string | null>(FIRST.theme);

  // The reader's own card, when they are signed in.
  useEffect(() => {
    if (!readLocalSessionUser()) return;
    let live = true;
    void fetchMyProfile().then((r) => {
      if (live && r.ok) setProfile(r.profile);
    });
    return () => {
      live = false;
    };
  }, []);

  const [now] = useState(() => new Date());
  const frames = useMemo(() => [...DECORATIONS, ...SEASONAL_DECORATIONS.filter((d) => inSeason(d, now))], [now]);
  const effects = useMemo(() => [...EFFECTS, ...SEASONAL_EFFECTS.filter((e) => inSeason(e, now))], [now]);
  const chosenTheme = THEMES.find((th) => th.id === theme) ?? null;

  const name = profile?.name ?? (me.state === "in" ? me.name : t("nav.you"));
  const avatar = profile?.avatar ?? (me.state === "in" ? me.picture : null);
  const cosmetics: Cosmetics = {
    ...(profile?.cosmetics ?? NONE),
    decoration,
    effect,
    themePrimary: chosenTheme?.primary ?? null,
    themeAccent: chosenTheme?.accent ?? null,
  };
  const shown = {
    name,
    handle: profile?.handle ?? "",
    avatar,
    status: profile?.status ?? null,
    badges: profile?.badges ?? [],
    cosmetics,
    clergy: profile?.clergy ?? null,
    bio: profile?.bio ?? null,
    patronSaint: profile?.patronSaint ?? null,
    favoriteVerse: profile?.favoriteVerse ?? null,
    joinedAt: profile?.joinedAt ?? null,
    parish: profile?.parish ?? null,
    links: profile?.links ?? [],
    private: false,
  };
  const surface = profileSurface(cosmetics);

  return (
    <>
      <TryWindow label={t(row.name)}>
        <div className="px-4 pb-16 pt-5">
          <div
            className={cn("relative overflow-hidden rounded-2xl border shadow-xl", surfaceClass(surface), surface.themed ? "border-white/10" : "border-paper/10")}
            style={surface.style}
          >
            <ProfileEffect effect={cosmetics.effect} quiet />
            <div className="relative z-10 px-4 pb-5 pt-9">
              <ProfileTop cosmetics={cosmetics} height={220} />
              <ProfileFace profile={shown} nameAs="p" compact />
              {/* What they wrote about themselves, when there is a profile to read. */}
              {profile ? (
                <div className="mt-5">
                  <ProfileAboutDoor profile={shown} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </TryWindow>

      <TrySwitch
        label={t(row.name)}
        value={kind}
        onChange={setKind}
        options={[
          { id: "frame", label: t("profile.frame") },
          { id: "effect", label: t("profile.effect") },
          { id: "theme", label: t("profile.theme") },
        ]}
      />

      {kind === "frame" ? (
        <TryStrip label={t("profile.frame")}>
          {frames.map((d) => (
            <TryTile key={d} on={decoration === d} onClick={() => setDecoration(decoration === d ? null : d)}>
              {/* Its own solid ground, as over a banner: on the chosen tile's paper its faint tint and its initial vanished. */}
              <CommunityAvatar name={name} url={avatar} size={34} decoration={d} ring={1} />
              <span className="block font-sans text-[12px] font-semibold leading-[1.15]">{t(`profile.frameName.${d}`)}</span>
            </TryTile>
          ))}
        </TryStrip>
      ) : kind === "effect" ? (
        <TryStrip label={t("profile.effect")}>
          {effects.map((fx) => (
            <TryTile key={fx} on={effect === fx} onClick={() => setEffect(effect === fx ? null : fx)}>
              <Sparkle size={22} />
              <span className="block font-sans text-[12px] font-semibold leading-[1.15]">{t(`profile.effectName.${fx}`)}</span>
            </TryTile>
          ))}
        </TryStrip>
      ) : (
        <TryStrip label={t("profile.theme")}>
          {THEMES.map((th) => (
            <TryTile key={th.id} on={theme === th.id} onClick={() => setTheme(theme === th.id ? null : th.id)}>
              <span
                aria-hidden
                className="block h-7 w-7 rounded-full ring-1 ring-inset ring-white/20"
                style={{ background: `linear-gradient(180deg, ${th.primary} 0%, ${th.primary} 50%, ${th.accent} 50%, ${th.accent} 100%)` }}
              />
              <span className="block font-sans text-[12px] font-semibold leading-[1.15]">{t(`profile.theme.${th.id}`)}</span>
            </TryTile>
          ))}
        </TryStrip>
      )}
    </>
  );
}
