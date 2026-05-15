import { cn } from "@/lib/cn";

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 h-px bg-line my-10", className)} />;
}
