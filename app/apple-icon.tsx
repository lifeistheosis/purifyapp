import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// Pre-render once at build time so the route is compatible with the Android
// static export (output:export); the website still serves the same icon.
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The real Purify cross, embedded (not redrawn), sized for the iOS home screen.
const CROSS = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/purify-cross-mark.png"),
).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#101013",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "82%",
            height: "82%",
            borderRadius: "50%",
            background: "#0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* height ~60% of the 147px disc; width follows the 0.569 aspect */}
          <img src={CROSS} width={50} height={88} alt="" />
        </div>
      </div>
    ),
    { ...size },
  );
}
