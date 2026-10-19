"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AddToPrayersSheet, type WallPick } from "@/components/community/AddToPrayersSheet";
import { AskPrayersSheet } from "@/components/community/AskPrayersSheet";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Orans } from "@/components/ui/icons/Orans";
import { Plus } from "@/components/ui/icons/Plus";
import { SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { fetchPrayerWall, type PrayerRequest } from "@/lib/community/client";
import { relativeTime } from "@/lib/community/relativeTime";
import { useWallNames } from "@/lib/prayers/useWallNames";
import { activeWallName, wallId } from "@/lib/prayers/wallNames";
import { saveMyProfile, sayPrayed } from "@/lib/profile/client";

/**
 * The prayer wall: everyone asking for prayers right now, in one list, with
 * how many have prayed and the "I prayed" answer beside each
 * (app/api/community/prayer-wall). Asking is at the top, and it lapses on its
 * own after two weeks.
 *
 * From 1.7.1 a request can say what it asks prayers for (AskPrayersSheet),
 * in a short field that goes through the word filter and moderation as a post
 * does; the words stand under the name. Until the server can keep them
 * (`intentions` false), asking is the one tap it was. And any reader can add
 * someone to their own next prayers (AddToPrayersSheet), where the name is
 * commemorated in the rule (lib/prayers/wallNames.ts): only the name as shown
 * and those words go with it, on the reader's own device.
 */
export function PrayerWall({
  signedIn,
  onOpenProfile,
}: {
  signedIn: boolean;
  onOpenProfile: (handle: string, seed: { handle: string; name: string; avatar: string | null }) => void;
}) {
  const { t, tn, locale } = useTranslate();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [intentions, setIntentions] = useState(false);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState<WallPick | null>(null);
  const carried = useWallNames();

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await fetchPrayerWall();
      if (!alive) return;
      if (res.state === "ok") {
        setRequests(res.requests);
        setIntentions(res.intentions);
        setState("ok");
      } else {
        setState((s) => (s === "ok" ? s : "error"));
      }
    })();
    return () => {
      alive = false;
    };
  }, [version]);

  const mine = requests.find((r) => r.mine) ?? null;

  async function pray(r: PrayerRequest) {
    if (busy || r.prayed || r.mine) return;
    setBusy(r.handle);
    setRequests((list) => list.map((x) => (x.handle === r.handle ? { ...x, prayed: true, count: x.count + 1 } : x)));
    const res = await sayPrayed(r.handle);
    setBusy(null);
    if (res.ok) {
      setRequests((list) => list.map((x) => (x.handle === r.handle ? { ...x, count: res.count } : x)));
    } else {
      setRequests((list) => list.map((x) => (x.handle === r.handle ? { ...x, prayed: false, count: Math.max(0, x.count - 1) } : x)));
      setNotice(t("profile.prayFailed"));
    }
  }

  async function ask(on: boolean) {
    if (busy) return;
    // With somewhere to keep the words, asking opens the field for them.
    if (on && intentions) {
      setNotice(null);
      setAsking(true);
      return;
    }
    setBusy("me");
    setNotice(null);
    const res = await saveMyProfile({ prayerRequest: on });
    setBusy(null);
    if (res.ok) {
      setNotice(on ? t("community.wallAsked") : t("community.wallWithdrawn"));
      setVersion((v) => v + 1);
    } else {
      setNotice(res.code === "unavailable" ? t("profile.notOpenYet") : t("profile.err.saveFailed"));
    }
  }

  function openAdd(r: PrayerRequest) {
    setPick({ id: wallId(r.handle, r.since), name: r.name, intention: r.intention ?? null });
    setAdding(true);
  }

  return (
    <section aria-labelledby="prayer-wall-heading" className="space-y-4">
      <div className="rounded-2xl border border-sage/30 bg-sage/[0.06] p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage/15 text-sage-soft" aria-hidden="true">
            <Orans size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="prayer-wall-heading" className="font-serif text-lede text-paper">
              {t("community.wallTitle")}
            </h2>
            <p className="mt-1 font-sans text-detail leading-relaxed text-paper/65">{t("community.wallBody")}</p>
            {signedIn ? (
              <button
                type="button"
                onClick={() => void ask(!mine)}
                disabled={busy === "me"}
                className={cn(
                  "mt-3 inline-flex min-h-11 items-center rounded-pill px-5 font-sans text-detail font-semibold transition-colors disabled:opacity-60",
                  mine ? "border border-paper/25 text-paper/85 hover:border-paper/45" : "bg-paper text-night hover:bg-paper/90",
                )}
              >
                {mine ? t("community.wallWithdraw") : t("community.wallAsk")}
              </button>
            ) : (
              <Link
                href="/signin?next=/community"
                className="mt-3 inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night"
              >
                {t("community.signIn")}
              </Link>
            )}
            {notice ? (
              <p role="status" className="mt-2 font-sans text-caption text-paper/70">
                {notice}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {state === "loading" ? (
        <div aria-busy aria-label={t("community.gathering")}>
          <SkeletonList rows={3} />
        </div>
      ) : state === "error" ? (
        <div className="rounded-2xl border border-paper/10 bg-black/20 p-6 text-center">
          <p className="font-sans text-ui text-paper/75">{t("community.loadFailed")}</p>
          <button
            type="button"
            onClick={() => {
              setState("loading");
              setVersion((v) => v + 1);
            }}
            className="mt-3 inline-flex items-center rounded-pill bg-paper px-5 py-2 font-sans text-ui font-semibold text-night"
          >
            {t("community.tryAgain")}
          </button>
        </div>
      ) : requests.length === 0 ? (
        <p className="py-8 text-center font-sans text-ui text-paper/55">{t("community.wallEmpty")}</p>
      ) : (
        <ul className="divide-y divide-paper/8 overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]">
          {requests.map((r) => {
            const added = !r.mine && activeWallName(carried, wallId(r.handle, r.since)) !== null;
            return (
              <li key={r.handle} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(r.handle, { handle: r.handle, name: r.name, avatar: r.avatar })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <CommunityAvatar name={r.name} url={r.avatar} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate font-sans text-ui font-semibold text-paper">
                        {r.mine ? t("community.wallYou") : r.name}
                      </span>
                      <span className="block truncate font-sans text-caption text-paper/55">
                        {t("community.wallAskedAgo", { when: relativeTime(r.since, locale) })} · {tn("profile.prayedCount", r.count)}
                      </span>
                    </span>
                  </button>
                  {!r.mine && signedIn ? (
                    <button
                      type="button"
                      onClick={() => void pray(r)}
                      disabled={r.prayed || busy === r.handle}
                      aria-pressed={r.prayed}
                      className={cn(
                        "inline-flex min-h-11 shrink-0 items-center rounded-pill px-4 font-sans text-detail font-semibold transition-colors",
                        r.prayed ? "border border-sage/40 text-sage-soft" : "bg-paper text-night hover:bg-paper/90",
                      )}
                    >
                      {r.prayed ? t("profile.prayed") : t("profile.pray")}
                    </button>
                  ) : null}
                </div>
                {/* The request's own words, and the way into the reader's own
                    prayers, under the name: indented to the name's column. */}
                {r.intention || !r.mine ? (
                  <div className="ps-[52px]">
                    {r.intention ? (
                      <p className="mt-1.5 break-words font-serif text-ui leading-relaxed text-paper/85">{r.intention}</p>
                    ) : null}
                    {!r.mine ? (
                      <button
                        type="button"
                        onClick={() => openAdd(r)}
                        aria-haspopup="dialog"
                        className={cn(
                          // A line of the row, not a second button beside "I prayed": its
                          // ink is 36px tall and its touch 44 (hit-44), so the list keeps
                          // its rhythm.
                          "hit-44 -ms-1 mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-pill px-1 font-sans text-caption font-semibold transition-colors",
                          added ? "text-sage-soft" : "text-paper/65 hover:text-paper",
                        )}
                      >
                        {added ? <Check size={14} /> : <Plus size={14} />}
                        {added ? t("community.wallInMyPrayers") : t("community.wallAdd")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {signedIn ? (
        <AskPrayersSheet
          open={asking}
          onClose={() => setAsking(false)}
          onAsked={() => {
            setAsking(false);
            setNotice(t("community.wallAsked"));
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
      <AddToPrayersSheet
        key={pick?.id ?? "none"}
        open={adding}
        pick={pick}
        onClose={() => setAdding(false)}
        onDone={(message) => {
          setAdding(false);
          setNotice(message);
        }}
      />
    </section>
  );
}
