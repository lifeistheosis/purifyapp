import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { churchDayLine } from "@/lib/journal/churchDay";
import { coverById } from "@/lib/journal/covers";
import { shareTitle } from "@/lib/journal/share";
import { getSharedPage } from "@/lib/journal/sharedPage";

// The preview a shared journal page's link shows (1.9, step 3, "its preview
// is drawn the way a profile's is"): the page's title and the Church's day on
// night, over its cover darkened so the words read when it has one, and the
// cross and the name on both. Drawn from the same safe copy as the page
// (lib/journal/sharedPage.ts), so it shows nothing the page does not.

export const runtime = "nodejs";
export const alt = "A page made with Purify";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CROSS = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/purify-cross-mark.png")).toString("base64")}`;

function coverData(id: string | undefined): string | null {
  const cover = coverById(id);
  if (!cover) return null;
  const file = join(process.cwd(), "public", cover.src);
  if (!existsSync(file)) return null;
  return `data:image/jpeg;base64,${readFileSync(file).toString("base64")}`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shared = await getSharedPage(id);
  const title = shared ? shareTitle(shared.page) || "Purify" : "Purify";
  const day = shared ? churchDayLine(new Date(shared.createdAt), "new").headline : null;
  const cover = shared ? coverData(shared.page.cover) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#101013", color: "#f4f1ea", fontFamily: "serif" }}>
        {cover ? (
           
          <img src={cover} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover" }} />
        ) : null}
        {cover ? <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(180deg, rgba(16,16,19,0.55) 0%, rgba(16,16,19,0.92) 70%)" }} /> : null}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 80px 150px", width: "100%" }}>
          {day ? <div style={{ display: "flex", fontSize: 30, fontFamily: "sans-serif", opacity: 0.8 }}>{day.slice(0, 80)}</div> : null}
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, marginTop: 16, lineHeight: 1.08, maxWidth: 1040 }}>{title.slice(0, 90)}</div>
        </div>
        <div style={{ position: "absolute", right: 70, bottom: 56, display: "flex", alignItems: "center", gap: 16, fontFamily: "sans-serif" }}>
          { }
          <img src={CROSS} width={34} height={60} alt="" />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>Purify</div>
        </div>
      </div>
    ),
    size,
  );
}
