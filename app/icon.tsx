import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// Pre-render once at build time so the route is compatible with the Android
// static export (output:export); the website still serves the same icon.
export const dynamic = "force-static";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// The real Purify cross (public/purify-cross.png, tightly cropped) embedded so
// the favicon is the exact site cross, not a redraw. Read at build and inlined
// as a data URI. Cream cross on the black disc.
const CROSS = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/purify-cross-mark.png"),
).toString("base64")}`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "#0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* height 60% of the 64px disc; width follows the 0.569 aspect */}
          <img src={CROSS} width={22} height={38} alt="" />
        </div>
      </div>
    ),
    { ...size },
  );
}
