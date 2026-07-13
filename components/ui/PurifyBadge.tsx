import { PurifyMark } from "./PurifyMark";

/**
 * The Purify brand badge: the real Orthodox cross (PurifyMark) centered in the
 * black disc with a hairline ring. One cross everywhere: the badge, the nav
 * mark, and the wordmark all render the same PurifyMark, so nothing drifts.
 *
 * Use where the brand should read at display size (the Plus paywall hero).
 */
export function PurifyBadge({
  size = 72,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "#0a0a0a",
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.28)",
      }}
    >
      <PurifyMark size={Math.round(size * 0.62)} className="text-paper" />
    </span>
  );
}
