"use client";

// Users tab — paginated, searchable profile list + signup chart + OAuth mix.

import { useEffect, useState } from "react";
import { Card, DataTable, Toolbar, ToolbarButton } from "../primitives";
import { LineChart, Donut, SERIES_COLORS } from "../charts";
import { CountUp } from "../CountUp";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  joined_at: string;
  has_password: boolean | null;
};
type Payload = {
  total: number;
  offset: number;
  pageSize: number;
  query: string;
  profiles: Profile[];
  providers: { google: number; apple: number; email: number; other: number };
  signupsByDay: { date: string; count: number }[];
};

export function UsersTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ offset: String(offset) });
    if (debouncedSearch) params.set("q", debouncedSearch);
    fetch(`/api/admin/users?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [offset, debouncedSearch]);

  if (!data) {
    return <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>;
  }

  const lastPage = Math.max(0, Math.floor((data.total - 1) / data.pageSize) * data.pageSize);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Total users">
          <p className="font-sans text-display-sm font-bold tabular-nums leading-none text-paper">
            <CountUp value={data.total} />
          </p>
        </Card>
        <Card title="OAuth provider mix · sample" subtitle="Most recent 200 users.">
          <Donut
            segments={[
              { name: "Email", value: data.providers.email, color: SERIES_COLORS[0] },
              { name: "Google", value: data.providers.google, color: SERIES_COLORS[1] },
              { name: "Apple", value: data.providers.apple, color: SERIES_COLORS[2] },
              { name: "Other", value: data.providers.other, color: SERIES_COLORS[4] },
            ]}
            size={120}
          />
        </Card>
        <Card title="Signups · last 30 days">
          <LineChart
            labels={data.signupsByDay.map((p) => p.date.slice(5))}
            series={[
              {
                name: "Signups",
                color: SERIES_COLORS[3],
                data: data.signupsByDay.map((p) => p.count),
              },
            ]}
            height={140}
          />
        </Card>
      </div>

      <Card
        title="Profiles"
        subtitle={`${data.total} total · showing ${offset + 1}–${Math.min(
          offset + data.pageSize,
          data.total,
        )}`}
        action={
          <Toolbar>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              placeholder="Search email…"
              className="rounded-md border border-paper/20 bg-paper/[0.04] px-2 py-1 font-sans text-caption text-paper placeholder:text-paper/40 focus:outline-none focus:border-gold/60 w-44"
            />
            <ToolbarButton
              onClick={() => setOffset(0)}
              variant={offset === 0 ? "primary" : "default"}
            >
              First
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setOffset(Math.max(0, offset - data.pageSize))}
            >
              Prev
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                setOffset(Math.min(lastPage, offset + data.pageSize))
              }
            >
              Next
            </ToolbarButton>
            <ToolbarButton onClick={() => setOffset(lastPage)}>Last</ToolbarButton>
          </Toolbar>
        }
      >
        <DataTable
          rows={data.profiles}
          rowKey={(r) => r.id}
          csvFilename={`profiles-page-${offset / data.pageSize + 1}.csv`}
          columns={[
            {
              key: "email",
              label: "Email",
              render: (r) => r.email ?? "—",
              csv: (r) => r.email ?? "",
            },
            {
              key: "name",
              label: "Name",
              render: (r) => r.display_name ?? "—",
              csv: (r) => r.display_name ?? "",
            },
            {
              key: "auth",
              label: "Auth",
              render: (r) =>
                r.has_password ? "password" : r.has_password === false ? "OAuth" : "—",
              csv: (r) =>
                r.has_password ? "password" : r.has_password === false ? "OAuth" : "",
            },
            {
              key: "joined",
              label: "Joined",
              render: (r) => new Date(r.joined_at).toLocaleDateString(),
              csv: (r) => r.joined_at,
            },
          ]}
        />
      </Card>
    </div>
  );
}
