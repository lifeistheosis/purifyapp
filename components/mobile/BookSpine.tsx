import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Tiny vertical spine chip representing one book of the Bible. Rendered
 * inside a horizontal ShelfRow. Coloured band on the left edge encodes
 * the testament/category so a glance at the shelf reads as
 * "Gospels here, Wisdom there" without the user reading every label.
 */
export type SpineTint =
  | "pentateuch"
  | "history"
  | "wisdom"
  | "majorProphets"
  | "minorProphets"
  | "deuterocanon"
  | "gospel"
  | "acts"
  | "paulineEpistle"
  | "catholicEpistle"
  | "revelation";

const BAND: Record<SpineTint, string> = {
  pentateuch: "bg-[#c89e2c]",
  history: "bg-sage",
  wisdom: "bg-[#b7b0a3]",
  majorProphets: "bg-[#6b85b5]",
  minorProphets: "bg-[#4f6b8c]",
  deuterocanon: "bg-[#a86c6c]",
  gospel: "bg-crimson",
  acts: "bg-[#b5854a]",
  paulineEpistle: "bg-[#8a6c2a]",
  catholicEpistle: "bg-[#6b6470]",
  revelation: "bg-[#7400bb]",
};

export function BookSpine({
  href,
  name,
  chapters,
  tint = "history",
}: {
  href: string;
  name: string;
  chapters: number;
  tint?: SpineTint;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex flex-col justify-between shrink-0",
        "h-[120px] w-[68px] rounded-md overflow-hidden",
        "border border-paper/10 bg-paper/[0.03]",
        "active:scale-[0.97] transition-transform",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[4px]", BAND[tint])}
      />
      <span className="px-2 pt-2 pl-3 font-sans text-caption font-semibold text-paper leading-[1.15]">
        {name}
      </span>
      <span className="px-2 pb-2 pl-3 font-sans text-eyebrow uppercase tracking-[1px] text-paper/45">
        {chapters} ch
      </span>
    </Link>
  );
}
