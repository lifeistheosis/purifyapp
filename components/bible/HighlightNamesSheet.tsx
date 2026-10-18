"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import { Sheet } from "@/components/ui/Sheet";
import { highlightVars, useHighlightNames } from "@/lib/bible/highlightColors";
import { NAME_IDEA_KEYS, NAME_MAX, cleanName } from "@/lib/bible/highlightPalette";
import { useVisibleFrame } from "@/lib/ui/viewport";

/**
 * What each highlight colour means (1.7.1): a small sheet with one line per
 * colour, reached from the picker on a verse or a paragraph (its "Names"),
 * from Saved's colours, and from the key under a chapter.
 *
 * Each line is the colour's disc and its name, typed in place. A colour with
 * no name shows what it is called, greyed, where the name would go. Under
 * them, ideas to tap instead of typing: the owner's own three ("Promises",
 * "To pray over", "Questions") and three more. An idea goes into the line
 * being written and the caret moves on to the next colour with no name, the
 * keyboard staying up (preventDefault on the press keeps the field's focus);
 * with no line being written, it goes to the first colour with no name.
 *
 * The names are kept as they are written, when a line is left, and all of
 * them when the sheet goes, however it goes: Done, the close button, a drag,
 * the backdrop, Escape or Android's back (lib/bible/highlightColors.ts).
 *
 * It is the shared Sheet, so it follows the finger and its backdrop blurs in
 * step, and it stands on the on-screen keyboard (`keyboard`), so the line
 * being written and Done are never under the keys. A line focused while the
 * keyboard rises is brought into view inside the sheet as it settles.
 *
 * `focusId`: the colour it was opened for. A colour with no name yet gets the
 * caret, so the reader can type at once; one with a name is only shown.
 *
 * Every verse and every paragraph can open it, so each carries one; it is
 * mounted only while open and through its closing slide, and a shut one
 * costs a state and an effect.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  focusId?: string | null;
};

/** How long a closing sheet stays mounted: its slide is 300ms. */
const UNMOUNT_AFTER_MS = 400;

export function HighlightNamesSheet(props: Props) {
  const [alive, setAlive] = useState(props.open);
  if (props.open && !alive) setAlive(true);
  useEffect(() => {
    if (props.open || !alive) return;
    const timer = window.setTimeout(() => setAlive(false), UNMOUNT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [props.open, alive]);
  return alive ? <NamesSheet {...props} /> : null;
}

function NamesSheet({ open, onClose, focusId = null }: Props) {
  const { t } = useTranslate();
  const { colors, names, colorName, setName } = useHighlightNames();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // The line with the caret, if any.
  const [writing, setWriting] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const frame = useVisibleFrame();

  // Every opening starts from what is kept, not from lines left half typed.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDrafts({ ...names });
      setWriting(null);
    }
  }

  // The colour it was opened for: the caret in its line when it has no name
  // yet, once the sheet has risen (a field focused mid-slide moves with it).
  useEffect(() => {
    if (!open || !focusId) return;
    const timer = window.setTimeout(() => {
      const el = inputs.current[focusId];
      if (!el) return;
      el.scrollIntoView({ block: "nearest" });
      if (!el.value) el.focus({ preventScroll: true });
    }, 460);
    return () => window.clearTimeout(timer);
  }, [open, focusId]);

  // The keyboard rose or moved: keep the line being written in view.
  useEffect(() => {
    if (!open || !writing) return;
    inputs.current[writing]?.scrollIntoView({ block: "nearest" });
  }, [open, writing, frame]);

  const draftOf = (id: string) => drafts[id] ?? names[id] ?? "";
  const unnamed = colors.filter((c) => !cleanName(draftOf(c.id))).map((c) => c.id);

  function close() {
    for (const c of colors) setName(c.id, draftOf(c.id));
    onClose();
  }

  const taken = new Set(colors.map((c) => cleanName(draftOf(c.id)).toLocaleLowerCase()).filter(Boolean));
  const ideas = NAME_IDEA_KEYS.map((k) => t(k)).filter((idea) => !taken.has(cleanName(idea).toLocaleLowerCase()));

  function takeIdea(idea: string) {
    const into = writing ?? unnamed[0] ?? null;
    if (!into) return;
    setDrafts((d) => ({ ...d, [into]: idea }));
    setName(into, idea);
    if (!writing) return;
    // On to the next colour without a name, so the next idea lands there.
    // After this render, not now: the line being left keeps what it holds
    // when it loses the caret, and until the render it still holds the old.
    const next = unnamed.find((id) => id !== into);
    window.setTimeout(() => {
      if (next) inputs.current[next]?.focus();
      else inputs.current[into]?.blur();
    }, 0);
  }

  return (
    <Sheet open={open} onClose={close} title={t("bible.highlightColors")} desktop keyboard bodyClassName="pb-4">
      <p className="font-sans text-detail leading-snug text-paper/70">{t("bible.highlightNames.intro")}</p>

      <ul className="mt-3 divide-y divide-paper/10 border-y border-paper/10">
        {colors.map((c, i) => {
          const draft = draftOf(c.id);
          return (
            <li key={c.id} className="flex min-h-12 items-center gap-3">
              <span
                aria-hidden
                data-hl-color={c.id}
                style={highlightVars(c.id)}
                className="h-[22px] w-[22px] shrink-0 rounded-full bg-[var(--hl-swatch)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]"
              />
              <input
                ref={(el) => {
                  inputs.current[c.id] = el;
                }}
                type="text"
                data-hl-name={c.id}
                value={draft}
                maxLength={NAME_MAX}
                placeholder={colorName(c.id)}
                aria-label={t("bible.highlightMeaningFor", { color: colorName(c.id) })}
                enterKeyHint={i < colors.length - 1 ? "next" : "done"}
                autoComplete="off"
                autoCapitalize="sentences"
                onFocus={() => setWriting(c.id)}
                onChange={(e) => {
                  const value = e.target.value;
                  setDrafts((d) => ({ ...d, [c.id]: value }));
                }}
                onBlur={() => {
                  setName(c.id, draftOf(c.id));
                  setWriting((w) => (w === c.id ? null : w));
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const next = colors[i + 1];
                  if (next) inputs.current[next.id]?.focus();
                  else e.currentTarget.blur();
                }}
                className="h-12 min-w-0 flex-1 bg-transparent font-sans text-ui text-paper placeholder:text-paper/65 focus:outline-none"
              />
              {draft ? (
                <button
                  type="button"
                  aria-label={t("bible.highlightNames.clear", { color: colorName(c.id) })}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setDrafts((d) => ({ ...d, [c.id]: "" }));
                    setName(c.id, "");
                    inputs.current[c.id]?.focus();
                  }}
                  className="tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper/60 hover:text-paper active:bg-paper/10"
                >
                  <Close size={15} />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {ideas.length > 0 && (writing || unnamed.length > 0) ? (
        <>
          <p className="mt-4 font-sans text-caption font-semibold text-paper/70">{t("bible.highlightNames.ideas")}</p>
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ideas.map((idea) => (
              <button
                key={idea}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => takeIdea(idea)}
                className="tap-press inline-flex min-h-9 shrink-0 items-center rounded-pill border border-paper/15 px-4 font-sans text-detail font-semibold text-paper/75 hover:border-paper/35 hover:text-paper active:bg-paper/10"
              >
                {idea}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="min-w-0 font-sans text-caption leading-snug text-paper/70">{t("bible.highlightNames.kept")}</p>
        <button
          type="button"
          onClick={close}
          className="tap-press inline-flex h-11 shrink-0 items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
        >
          {t("common.done")}
        </button>
      </div>
    </Sheet>
  );
}
