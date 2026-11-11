"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { MY_RULE_PARTS, type MyRulePart } from "@/lib/prayers/myRule";
import { ruleCarry, ruleHeadArt } from "@/lib/prayers/serviceArt";

/**
 * The head of Your rule (1.8, the owner's pick A of round r3-27, "A with a
 * rule"; Homebase/boards/purify-master/variants/r3-27-your-rule.png).
 *
 * The icon of the part being made fills the top of the screen from its very
 * top, under the clear bar (MobileTopBar `overlay`), fades in and melts into
 * the page, as on Prayers and a saint's page: the Anastasis over the morning,
 * Christ Pantocrator over the evening, as the prayer book stands its own
 * Morning and Evening prayers (lib/prayers/serviceArt.ts, ruleHeadArt; a
 * pairing on the clergy list, docs/editorial-standards.md, item 26). The
 * page's name and its line stand on the picture's lower half, and Pray my
 * rule in its light, with the part and its length beside it, once the part
 * has a prayer in it.
 *
 * The part is the device's (the hour, the address), so the picture waits for
 * it: `part` is null until then, the box keeps its place from the first
 * paint, and the picture fades in once it is known. Both parts' pictures
 * stand in the box from then on, the other one unseen, so the switch under
 * the head crosses from one to the other (globals.css, "Your rule: the icon
 * above, the steps below"; on the motion switch).
 */
export function RuleHead({
  part,
  pray,
  start,
}: {
  /** The part shown, once the device has said which; null before. */
  part: MyRulePart | null;
  /** Pray my rule for the part shown, and its length; null for an empty part. */
  pray: { href: string; meta: string } | null;
  /** An empty part's start, in Pray my rule's place; null when the part has prayers or is not known yet. */
  start: { label: string; onStart: () => void } | null;
}) {
  const { t } = useTranslate();
  return (
    <header className="rule-head relative">
      {/* The picture of Your rule's tile on Prayers travels into this, and back out of it (1.9; lib/ui/routeMotion.ts,
          "A picture that leads to its own page"). The whole box takes the name, not the icon alone: it arrives with its
          shade and melted into the page, exactly as it then stands. One box, so one thing wears the name, and it is
          the half shown: the tile chose the same half by the same rule (lib/prayers/myRule.ts, openingPart). */}
      <div
        data-rule-picture={part ?? undefined}
        data-carry-into={part ? ruleCarry(part) : undefined}
        className="rule-head-picture under-topbar picture-melt relative -mx-5 overflow-hidden md:mx-0"
      >
        {part
          ? MY_RULE_PARTS.map((p) => {
              const art = ruleHeadArt(p);
              const on = p === part;
              return (
                // Plain <img>, as the Prayers head's: the apps' export serves
                // files as they are. Both are the app's own files.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p}
                  src={art.src}
                  alt={on ? art.alt : ""}
                  aria-hidden={on ? undefined : true}
                  width={art.width}
                  height={art.height}
                  decoding="async"
                  fetchPriority={on ? "high" : "low"}
                  data-part={p}
                  data-on={on ? "" : undefined}
                  className="rule-head-img"
                  style={{ objectPosition: art.focus }}
                />
              );
            })
          : null}
        <div aria-hidden className="rule-head-shade" />
      </div>

      <div className="rule-head-words relative">
        <h1 id="mine-title" className="rule-head-title text-title font-bold leading-[1.1] tracking-[-0.01em] text-paper md:text-heading">
          {t("prayers.mine.title")}
        </h1>
        <p className="rule-head-line mt-2 max-w-[46ch] font-sans text-detail leading-[1.5] text-paper/75">{t("prayers.mine.intro")}</p>
        {/* Pray my rule, or an empty part's start in its place: the row is
            always there and one height (build 93 note 16), so Morning and
            Evening below it never move under the finger, nor when the device
            says which part. */}
        <div data-mine-action="" className="mt-4 flex h-12 flex-nowrap items-center">
          {/* What stands here comes in with the list below on each switch
              (rule-action-follow), as the icon above crosses to its own. */}
          {pray ? (
            <div key={`pray-${part}`} className="rule-action-follow flex min-w-0 items-center gap-x-3.5">
              <Link
                href={pray.href}
                data-mine-pray
                className="rule-pray tap-press inline-flex min-h-12 items-center gap-1.5 rounded-pill bg-paper ps-6 pe-5 font-sans text-ui font-semibold text-night"
              >
                {t("prayers.mine.pray")}
                <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
              </Link>
              <span data-mine-pray-meta className="rule-head-line min-w-0 truncate font-sans text-detail text-paper/65">
                {pray.meta}
              </span>
            </div>
          ) : start ? (
            // A long start (Romanian's is 39 letters) takes two lines inside
            // the pill rather than run off a phone's screen; the row keeps its
            // height either way.
            <button
              key={`start-${part}`}
              type="button"
              data-mine-start=""
              onClick={start.onStart}
              className="rule-action-follow rule-pray tap-press inline-flex min-h-12 min-w-0 items-center gap-1.5 rounded-pill bg-paper py-1 ps-6 pe-5 text-start font-sans text-ui font-semibold leading-tight text-night"
            >
              {start.label}
              <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
