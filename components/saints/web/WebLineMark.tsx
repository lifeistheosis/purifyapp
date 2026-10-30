import { cn } from "@/lib/cn";

/**
 * A kind's line, drawn as the web draws it (round 3, r3-06, the key): solid
 * for disciples and councils, dashed for a moment of the Church's history,
 * dotted for a Life that names them. Beside a kind's name on the key and on
 * the card, so the key finally says what each line means. Inherits
 * `currentColor`; decorative, the word beside it says the kind.
 */
export function WebLineMark({
  line,
  width = 16,
  className,
}: {
  line: "solid" | "dash" | "dot";
  width?: number;
  className?: string;
}) {
  const dot = line === "dot";
  return (
    <svg
      aria-hidden
      width={width}
      height={6}
      viewBox={`0 0 ${width} 6`}
      className={cn("inline-block shrink-0 align-middle", className)}
    >
      <line
        x1={dot ? 1.2 : 0}
        y1={3}
        x2={width}
        y2={3}
        stroke="currentColor"
        strokeWidth={dot ? 2.2 : 1.6}
        strokeLinecap={dot ? "round" : undefined}
        strokeDasharray={line === "dash" ? "4 3.2" : dot ? "0.1 4.2" : undefined}
      />
    </svg>
  );
}
