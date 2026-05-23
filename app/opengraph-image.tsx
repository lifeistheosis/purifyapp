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
            "radial-gradient(60% 50% at 18% 22%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.05) 40%, rgba(0,0,0,0) 72%), linear-gradient(180deg, #161219 0%, #1f1924 60%, #2a2030 100%)",
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
          {/* Bespoke three-bar Orthodox Cross — matches components/ui/icons/Cross.tsx. */}
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d4af37"
            strokeWidth="1.4"
            strokeLinecap="round"
            style={{ display: "block" }}
          >
            <line x1="12" y1="2.5" x2="12" y2="21.5" />
            <line x1="8.5" y1="6" x2="15.5" y2="6" />
            <line x1="5.5" y1="9.5" x2="18.5" y2="9.5" />
            <line x1="8" y1="16.5" x2="16" y2="14" />
          </svg>
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
