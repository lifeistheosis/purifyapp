import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Purify placeholder mark: gold "P" on the near-black brand surface.
// This is the file Next.js serves for the browser tab icon.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#161219",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: "#d4af37",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            fontFamily: "Georgia, serif",
          }}
        >
          P
        </div>
      </div>
    ),
    { ...size },
  );
}
