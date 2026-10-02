import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { sharedProfile } from "@/lib/profile/shared";

// The preview card a shared profile link shows in a message: the reader's
// banner colour, their name and @handle, and the Purify cross. Drawn from
// the same public projection as the page, so it shows nothing the page does
// not. Pictures are left out on purpose: a reader's photo fetched by a
// preview robot is one more copy of it in somebody else's cache.

export const runtime = "nodejs";
export const alt = "A Purify profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CROSS = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/purify-cross-mark.png")).toString("base64")}`;

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await sharedProfile(handle);
  const name = profile?.name ?? "Purify";
  const at = profile ? `@${profile.handle}` : "purifyapp.net";
  const band = profile?.cosmetics.themePrimary ?? profile?.cosmetics.bannerColor ?? "#2a2a30";
  const base = profile?.cosmetics.themeAccent ?? "#101013";
  const initial = (name[0] ?? "P").toUpperCase();
  const line = profile && !profile.private ? (profile.bio ?? profile.status ?? "") : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(180deg, ${band} 0%, ${base} 100%)`,
          color: "#f4f1ea",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ height: 210, width: "100%", display: "flex", background: band }} />
        <div style={{ display: "flex", flexDirection: "column", padding: "0 80px", marginTop: -90 }}>
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 999,
              border: `10px solid ${band}`,
              background: "#1d1d20",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 88,
              fontWeight: 700,
            }}
          >
            {initial}
          </div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>{name.slice(0, 40)}</div>
          <div style={{ display: "flex", fontSize: 36, marginTop: 8, opacity: 0.75 }}>{at}</div>
          {line ? (
            <div style={{ display: "flex", fontSize: 30, marginTop: 20, opacity: 0.8, maxWidth: 900 }}>{line.slice(0, 110)}</div>
          ) : null}
        </div>
        <div style={{ position: "absolute", right: 70, bottom: 56, display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CROSS} width={34} height={60} alt="" />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>Purify</div>
        </div>
      </div>
    ),
    size,
  );
}
