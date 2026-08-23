"use client";

/**
 * A parish group inside one campaign.
 *
 * A reader joins the global campaign and may additionally pray with a small
 * named group: their parish, their household, a few friends. The group shows
 * who is praying alongside them, what the group has offered together, and a
 * way into a conversation with just those people.
 *
 * It is not a leaderboard. The roster carries no per-member count and is
 * ordered by when people arrived, so there is nothing to rank and nothing to
 * sort. `GroupMember` has no score field at all, which means a ranking
 * cannot be added here by accident: it would take a schema change, in the
 * open, on purpose.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  createGroup,
  fetchMyGroup,
  joinGroup,
  leaveGroup,
} from "@/lib/campaigns/client";
import {
  isValidGroupName,
  normalizeInviteCode,
  sortMembers,
  type CampaignGroup as Group,
  type GroupMember,
} from "@/lib/campaigns/groups";
import { cn } from "@/lib/cn";

const field =
  "w-full rounded-lg border border-paper/15 bg-night px-3.5 py-2.5 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40";

type Mode = "idle" | "creating" | "joining";

export function CampaignGroup({
  campaignId,
  joined,
}: {
  campaignId: string;
  joined: boolean;
}) {
  const { t } = useTranslate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetchMyGroup(campaignId);
    setGroup(res.group);
    setMembers(res.members);
    setLoaded(true);
  }, [campaignId]);

  useEffect(() => {
    if (!joined) return;
    let alive = true;
    void fetchMyGroup(campaignId).then((res) => {
      if (!alive) return;
      setGroup(res.group);
      setMembers(res.members);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [campaignId, joined]);

  const onCreate = useCallback(async () => {
    if (busy || !isValidGroupName(name)) return;
    setBusy(true);
    setError(null);
    const res = await createGroup(campaignId, name.trim());
    setBusy(false);
    if (res.ok) {
      setName("");
      setMode("idle");
      await load();
    } else {
      setError(res.error ?? t("campaigns.loadFailed"));
    }
  }, [busy, campaignId, load, name, t]);

  const onJoin = useCallback(async () => {
    const normalized = normalizeInviteCode(code);
    if (busy || normalized.length !== 6) return;
    setBusy(true);
    setError(null);
    const res = await joinGroup(normalized);
    setBusy(false);
    if (res.ok) {
      setCode("");
      setMode("idle");
      await load();
    } else {
      setError(res.error ?? t("campaigns.loadFailed"));
    }
  }, [busy, code, load, t]);

  const onLeave = useCallback(async () => {
    if (busy || !group) return;
    setBusy(true);
    setError(null);
    const res = await leaveGroup(group.id);
    setBusy(false);
    if (res.ok) {
      setGroup(null);
      setMembers([]);
    } else {
      setError(res.error ?? t("campaigns.loadFailed"));
    }
  }, [busy, group, t]);

  // Only offered to someone already praying this campaign. A group is a room
  // inside the campaign, not a way into it.
  if (!joined || !loaded) return null;

  if (group) {
    const roster = sortMembers(members);
    return (
      <section className="mt-6 rounded-2xl border border-gold/25 bg-gold/[0.04] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold-pale/70">
              {t("campaigns.yourGroup")}
            </p>
            <h3 className="mt-1 truncate font-display-serif text-title-sm text-paper">
              {group.name}
            </h3>
          </div>
          {/* "n praying, n prayers together" was here. The second figure is a
              shared prayer tally, which is the thing being removed everywhere
              else in this release. The first went with it rather than being
              reworded: the roster of names is rendered directly below, so the
              count was restating what the reader can already see, and leaving
              a lone number under a heading is how a scoreboard starts. */}
        </div>

        {roster.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {roster.map((m) => (
              <li
                key={m.user_id}
                className="rounded-pill border border-paper/12 px-3 py-1 font-sans text-caption text-paper/70"
              >
                {m.member_name}
              </li>
            ))}
          </ul>
        ) : null}

        {group.invite_code ? (
          <div className="mt-4 rounded-lg border border-paper/10 bg-night px-4 py-3">
            <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/45">
              {t("campaigns.inviteCode")}
            </p>
            <p className="mt-1 font-sans text-title-sm font-semibold tracking-[3px] text-paper">
              {group.invite_code}
            </p>
            <p className="mt-1 font-sans text-caption text-paper/45">
              {t("campaigns.shareThisCode")}
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Into Conversations, scoped to this group. The hash selects the
              panel; the group is carried so the composer can post to it. */}
          <Link
            href={`/community#group-${group.id}`}
            className="inline-flex items-center rounded-pill bg-paper px-4 py-2 font-sans text-detail font-semibold text-night"
          >
            {t("campaigns.groupThread")}
          </Link>
          <button
            type="button"
            onClick={() => void onLeave()}
            disabled={busy}
            className="font-sans text-caption font-semibold text-paper/45 hover:text-paper/80 disabled:opacity-50"
          >
            {t("campaigns.leaveGroup")}
          </button>
        </div>
        {error ? (
          <p className="mt-2 font-sans text-detail text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
      <p className="font-sans text-ui font-semibold text-paper">
        {t("campaigns.startAGroup")}
      </p>
      <p className="mt-1 font-sans text-caption leading-relaxed text-paper/50">
        {t("campaigns.startAGroupBody")}
      </p>

      {mode === "creating" ? (
        <div className="mt-4 space-y-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={t("campaigns.groupName")}
            className={field}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (busy || !isValidGroupName(name)) return;
              void onCreate();
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void onCreate()}
              disabled={busy || !isValidGroupName(name)}
              className="rounded-pill bg-paper px-5 py-2 font-sans text-detail font-semibold text-night disabled:opacity-50"
            >
              {t("campaigns.create")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setError(null);
              }}
              className="font-sans text-caption font-semibold text-paper/45 hover:text-paper/80"
            >
              {t("campaigns.cancel")}
            </button>
          </div>
        </div>
      ) : mode === "joining" ? (
        <div className="mt-4 space-y-2.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={12}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t("campaigns.inviteCode")}
            className={cn(field, "tracking-[3px] uppercase")}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (busy || normalizeInviteCode(code).length !== 6) return;
              void onJoin();
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void onJoin()}
              disabled={busy || normalizeInviteCode(code).length !== 6}
              className="rounded-pill bg-paper px-5 py-2 font-sans text-detail font-semibold text-night disabled:opacity-50"
            >
              {t("campaigns.join")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setError(null);
              }}
              className="font-sans text-caption font-semibold text-paper/45 hover:text-paper/80"
            >
              {t("campaigns.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("creating")}
            className="rounded-pill border border-paper/20 px-4 py-2 font-sans text-detail font-semibold text-paper/80 hover:border-paper/40"
          >
            {t("campaigns.startAGroup")}
          </button>
          <button
            type="button"
            onClick={() => setMode("joining")}
            className="rounded-pill border border-paper/20 px-4 py-2 font-sans text-detail font-semibold text-paper/80 hover:border-paper/40"
          >
            {t("campaigns.joinAGroup")}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-2 font-sans text-detail text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
