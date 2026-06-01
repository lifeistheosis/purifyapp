"use client";

// Audience tab — who's reading. Countries / regions / languages bar charts,
// device + auth donuts, 30-day window.

import { useEffect, useState } from "react";
import { Card, DataTable } from "../primitives";
import { BarChart, Donut, SERIES_COLORS } from "../charts";

type Audience = {
  windowDays: number;
  total: number;
  countries: { name: string; code: string | null; count: number }[];
  regions: { country: string; region: string; code: string | null; count: number }[];
  languages: { code: string; count: number }[];
  browsers: { name: string; count: number }[];
  devices: { mobile: number; desktop: number };
  auth: { signedIn: number; anonymous: number };
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  ro: "Romanian",
  el: "Greek",
  ru: "Russian",
  fr: "French",
  de: "German",
  sr: "Serbian",
  uk: "Ukrainian",
  it: "Italian",
  pt: "Portuguese",
  bg: "Bulgarian",
  ar: "Arabic",
};

function flag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function AudienceTab() {
  const [data, setData] = useState<Audience | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/audience", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Signed-in vs anonymous">
          <Donut
            segments={[
              {
                name: "Signed in",
                value: data.auth.signedIn,
                color: SERIES_COLORS[0],
              },
              {
                name: "Anonymous",
                value: data.auth.anonymous,
                color: SERIES_COLORS[1],
              },
            ]}
            label={`${data.total} sess.`}
          />
        </Card>
        <Card title="Device mix">
          <Donut
            segments={[
              { name: "Mobile", value: data.devices.mobile, color: SERIES_COLORS[2] },
              { name: "Desktop", value: data.devices.desktop, color: SERIES_COLORS[4] },
            ]}
            label="30d"
          />
        </Card>
        <Card title="Browser families">
          <Donut
            segments={data.browsers.map((b, i) => ({
              name: b.name,
              value: b.count,
              color: SERIES_COLORS[i % SERIES_COLORS.length],
            }))}
            label="30d"
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top countries · 30 days">
          <BarChart
            rows={data.countries.map((c) => ({
              label: `${flag(c.code)}  ${c.name}`,
              value: c.count,
            }))}
          />
        </Card>
        <Card title="Top languages · 30 days" subtitle="Drives translation priority.">
          <BarChart
            rows={data.languages.map((l) => ({
              label: `${LANG_NAMES[l.code] ?? l.code} · ${l.code}`,
              value: l.count,
            }))}
          />
        </Card>
      </div>

      <Card title="Top regions · 30 days" subtitle="State / province, scoped by country.">
        <DataTable
          rows={data.regions}
          rowKey={(r) => `${r.country}-${r.region}`}
          csvFilename="regions-30d.csv"
          columns={[
            {
              key: "flag",
              label: "",
              render: (r) => <span>{flag(r.code)}</span>,
              csv: () => "",
            },
            {
              key: "region",
              label: "Region",
              render: (r) => r.region,
              csv: (r) => r.region,
            },
            {
              key: "country",
              label: "Country",
              render: (r) => r.country,
              csv: (r) => r.country,
            },
            {
              key: "count",
              label: "Sessions",
              align: "right",
              render: (r) => r.count,
              csv: (r) => r.count,
            },
          ]}
        />
      </Card>
    </div>
  );
}
