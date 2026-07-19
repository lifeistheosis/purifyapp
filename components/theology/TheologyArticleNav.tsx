// The compact top chrome for an article: the "Theology" breadcrumb back to the
// hub and the mode switcher, so a reader always knows where they are and can
// move between the four modes without returning to an index first.

import Link from "next/link";

import { TheologyNav } from "./TheologyNav";
import { T } from "@/components/i18n/T";

export function TheologyArticleNav({ className = "" }: { className?: string }) {
  return (
    <div className={"w-full border-b border-paper/10 pb-4 " + className}>
      <Link
        href="/theology"
        className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55 hover:text-paper transition-colors"
      >
        <T k="nav.discoverMenu.theology" />
      </Link>
      <div className="mt-3">
        <TheologyNav />
      </div>
    </div>
  );
}
