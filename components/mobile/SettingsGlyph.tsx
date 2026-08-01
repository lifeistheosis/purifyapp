"use client";

// The little outline marks beside each row of a SettingsList.
//
// This lived inline in two files, YouMobile and AccountSettingsLinks, with
// nine of the ten cases byte-identical: about ninety lines of copy that had
// to be edited twice to change one mark. It sits next to SettingsList,
// which is the only thing that renders it.

export type SettingsGlyphKind =
  | "user"
  | "halo"
  | "bell"
  | "lock"
  | "heart"
  | "bolt"
  | "cross"
  | "signout"
  | "sparkle"
  | "box";

export function SettingsGlyph({ kind }: { kind: SettingsGlyphKind }) {
  const props = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "user":
      return (
        <svg {...props}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "halo":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "box":
      return (
        <svg {...props}>
          <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
          <path d="M3 8l9 5 9-5" />
          <path d="M12 13v10" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "heart":
      return (
        <svg {...props}>
          <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...props}>
          <path d="M13 2 3 14h8l-1 8 10-12h-8z" />
        </svg>
      );
    case "cross":
      return (
        <svg {...props}>
          <path d="M12 3v18" />
          <path d="M5 8h14" />
        </svg>
      );
    case "signout":
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...props}>
          <path d="M12 3c.4 4.5 2.5 6.6 7 7-4.5.4-6.6 2.5-7 7-.4-4.5-2.5-6.6-7-7 4.5-.4 6.6-2.5 7-7z" />
        </svg>
      );
  }
}
