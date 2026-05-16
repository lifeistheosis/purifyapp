import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon — same Purify mark, sized for iOS home-screen.
export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            fontSize: 130,
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
