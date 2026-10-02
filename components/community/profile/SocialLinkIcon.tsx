import { Instagram } from "@/components/ui/icons/Instagram";
import { LinkChain } from "@/components/ui/icons/LinkChain";
import { TikTok } from "@/components/ui/icons/TikTok";
import type { SocialNetwork } from "@/lib/profile/socialLinks";

/**
 * A small mark for each network a profile can link to, in the app's own line
 * set: drawn here rather than lifted from the networks' brand files, the same
 * rule the verified tick follows. Instagram and TikTok reuse the footer's
 * marks; the rest are a letter or a simple shape in the same stroke.
 */
export function SocialLinkIcon({ kind, size = 16 }: { kind: SocialNetwork; size?: number }) {
  if (kind === "instagram") return <Instagram size={size} />;
  if (kind === "tiktok") return <TikTok size={size} />;
  if (kind === "website") return <LinkChain size={size} />;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  switch (kind) {
    case "x":
      return (
        <svg {...common}>
          <path d="M5 4l14 16M19 4L5 20" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
          <path d="M10.5 9.5v5l4.2-2.5z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.6 1.6-1.6h1.5V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.4H9v3h2.5V21" />
        </svg>
      );
    case "threads":
      return (
        <svg {...common}>
          <path d="M16.6 11.2c-.5-2.6-2.4-3.8-4.6-3.8-2.9 0-4.7 2.2-4.7 5.1 0 3 1.9 5.3 5.1 5.3 2.4 0 4.6-1.4 4.6-3.6 0-1.7-1.3-2.7-3.2-2.7-1.8 0-3 1-3 2.3 0 1.1.9 1.9 2.2 1.9" />
          <circle cx="12" cy="12" r="9.5" />
        </svg>
      );
    case "bluesky":
      return (
        <svg {...common}>
          <path d="M12 11.2C10.6 8.4 7.4 5 4.8 5 3.6 5 3.4 6.4 3.6 7.6c.4 2.2 1.6 4.3 4.6 4.6-3.2.5-4 2.4-2 4.3 2.2 2.1 4.4.6 5.8-2.1 1.4 2.7 3.6 4.2 5.8 2.1 2-1.9 1.2-3.8-2-4.3 3-.3 4.2-2.4 4.6-4.6.2-1.2 0-2.6-1.2-2.6-2.6 0-5.8 3.4-7.2 6.2z" />
        </svg>
      );
  }
}
