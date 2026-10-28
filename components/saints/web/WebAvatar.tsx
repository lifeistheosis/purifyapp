import { cn } from "@/lib/cn";
import type { WebNode } from "@/lib/saints/webLayout";

/**
 * A saint or a council on the saint web (1.8): the saint's icon in a circle,
 * or his initial in Lora where the app carries no icon of him; a council as a
 * rounded square with its number in the seven. Decorative: the name beside it
 * says who it is.
 */
export function WebAvatar({ node, size, className }: { node: WebNode; size: number; className?: string }) {
  if (node.kind === "council") {
    return (
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center border border-paper/15 bg-night-soft font-serif font-bold leading-none text-paper",
          className,
        )}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), fontSize: Math.round(size * 0.36) }}
      >
        {node.mark}
      </span>
    );
  }
  const { icon, initial } = node.person;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-night-soft",
        icon ? "" : "border border-paper/15 font-serif font-semibold leading-none text-paper/60",
        className,
      )}
      style={{ width: size, height: size, fontSize: icon ? undefined : Math.round(size * 0.38) }}
    >
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- the app's own icon, as it is.
        <img src={icon} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-[50%_20%]" />
      ) : (
        initial
      )}
    </span>
  );
}
