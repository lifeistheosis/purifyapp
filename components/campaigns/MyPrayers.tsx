"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  intentionLabel,
  statusLabel,
  type PrayerCampaign,
} from "@/lib/campaigns/campaigns";
import { fetchMyPrayers, type MyPrayers as MyPrayersData } from "@/lib/campaigns/client";

export function MyPrayers() {
  const [data, setData] = useState<MyPrayersData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchMyPrayers().then((d) => {
      setData(d);
      setLoaded(true);
    });
  }, []);

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[620px]">
        <Link
          href="/campaigns"
          className="font-sans text-caption text-paper/50 hover:text-paper/80"
        >
          ← All campaigns
        </Link>
        <h1 className="mt-4 font-display-serif text-title text-paper">
          My prayers
        </h1>

        {!loaded ? (
          <p className="mt-8 font-sans text-ui text-paper/40">Gathering…</p>
        ) : !data || data.userId == null ? (
          <div className="mt-6 rounded-2xl border border-paper/10 bg-black/20 p-6 text-center">
            <p className="font-serif text-lede text-paper/80">
              Sign in to see the campaigns you are praying.
            </p>
            <Link
              href="/signin?next=/campaigns/mine"
              className="mt-4 inline-flex rounded-pill bg-paper px-6 py-3 font-sans text-ui font-semibold text-night hover:bg-paper/90"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat value={data.joined.length} label="Praying" />
              <Stat value={data.totalPrayerDays} label="Prayers offered" />
              <Stat value={data.created.length} label="Started" />
            </div>

            <Group title="Campaigns you are praying">
              {data.joined.length === 0 ? (
                <Empty>
                  You have not joined a campaign yet.{" "}
                  <Link href="/campaigns" className="text-gold-pale underline">
                    Find one to pray.
                  </Link>
                </Empty>
              ) : (
                data.joined.map((j) => (
                  <Row
                    key={j.campaign.id}
                    campaign={j.campaign}
                    trailing={
                      j.prayer_days > 0
                        ? `${j.prayer_days} day${j.prayer_days === 1 ? "" : "s"}`
                        : undefined
                    }
                  />
                ))
              )}
            </Group>

            <Group title="Campaigns you started">
              {data.created.length === 0 ? (
                <Empty>
                  You have not started a campaign.{" "}
                  <Link href="/campaigns/new" className="text-gold-pale underline">
                    Start one.
                  </Link>
                </Empty>
              ) : (
                data.created.map((c) => <Row key={c.id} campaign={c} />)
              )}
            </Group>
          </>
        )}
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4 text-center">
      <p className="font-display-serif text-title text-paper tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-sans text-caption text-paper/50">{label}</p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
        {title}
      </p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-paper/10 bg-black/20 p-5 font-sans text-ui text-paper/55">
      {children}
    </p>
  );
}

function Row({
  campaign,
  trailing,
}: {
  campaign: PrayerCampaign;
  trailing?: string;
}) {
  const closed = statusLabel(campaign.status);
  return (
    <Link
      href={`/campaigns/detail?id=${campaign.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-paper/10 bg-paper/[0.03] px-4 py-3 transition-colors hover:border-paper/25"
    >
      <span className="min-w-0">
        <span className="block truncate font-sans text-ui font-semibold text-paper">
          {campaign.title}
        </span>
        <span className="block font-sans text-caption text-paper/50">
          {intentionLabel(campaign.intention)}
          {closed ? ` · ${closed}` : ""}
        </span>
      </span>
      {trailing ? (
        <span className="shrink-0 font-sans text-caption text-paper/45 tabular-nums">
          {trailing}
        </span>
      ) : null}
    </Link>
  );
}
