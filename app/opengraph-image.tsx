import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Purify, Orthodox prayer, calendar, and Scripture";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "100px",
          background:
            "linear-gradient(180deg, #161219 0%, #1f1924 60%, #2a2030 100%)",
          color: "#f8f4ea",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "#d4af37",
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#161219",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            ✦
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              color: "#d4af37",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            Purify
          </div>
        </div>
        <div
          style={{
            fontSize: 108,
            lineHeight: 1.05,
            letterSpacing: -2,
            fontWeight: 700,
            color: "#f8f4ea",
            maxWidth: 940,
          }}
        >
          Find God&rsquo;s peace in prayer.
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 30,
            color: "rgba(248,244,234,0.75)",
            fontFamily: "sans-serif",
            maxWidth: 940,
            lineHeight: 1.35,
          }}
        >
          Daily prayer, the saint of the day, fasting status, the Septuagint
          and KJV with patristic commentary.
        </div>
      </div>
    ),
    { ...size },
  );
}
