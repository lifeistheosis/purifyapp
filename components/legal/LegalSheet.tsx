"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";
import { Sheet } from "@/components/ui/Sheet";
import { LEGAL_HREF, LEGAL_TITLE_KEY, legalDocOf, textLang, type LegalDoc } from "@/lib/legal/docs";
import { websiteHref } from "@/lib/nav/websiteHref";

// The Terms of Service, the Privacy Policy and EIKON's shipping and returns,
// in a sheet over whatever asked the reader to agree to them (build 90 note
// 1). His words: "when you click on terms and privacy policy, it doesn't
// actually show you the terms or the privacy policy. So I want to have either
// a pop-up show up with the terms, which is preferred actually, and you can
// easily scroll to see, and the privacy policy too." And his yes of
// 2026-11-10 to the shop's policy in a sheet of its own, the same way.
//
// Why a sheet. The links were plain links to the pages, and on the
// onboarding's account step the page changed BENEATH the onboarding's layer,
// which stayed on top: nothing seemed to happen. Purify Plus's purchase sheet
// did the same, and the other purchase sheet closed first, losing the
// reader's place. Here the text opens over the layer it was asked from
// (layer "over-all", over the onboarding's and over a purchase sheet), at the
// whole height of the screen, with its own scroll and a 44px Close; the
// phone's Back closes it (one press, this sheet alone: lib/platform/
// useAndroidBack.ts); and the reader is where they were.
//
// One text: the pages draw the same components (components/legal/
// TermsText.tsx, PrivacyText.tsx, ShopPoliciesText.tsx). The sheet loads its
// text when it opens: in the apps it is a file inside the app, so it opens
// with no signal; on the website it is one request; no page carries it.
// A German reader is shown the German Privacy Policy, as on the page.
//
// Inside the text: a link to one of the three shows it here; a link to any
// other page opens on the website, so the reader keeps their place (in the
// apps the phone's browser takes it, as every website link there does);
// mail and outside links are as they are.

type Text = ComponentType<{ lang: "en" | "de" }>;

/** Each text, fetched when it is first wanted. */
const LOAD: Readonly<Record<LegalDoc, () => Promise<Text>>> = {
  terms: () => import("./TermsText").then((m) => m.TermsText as Text),
  privacy: () => import("./PrivacyText").then((m) => m.PrivacyText as Text),
  "shop-policies": () => import("./ShopPoliciesText").then((m) => m.ShopPoliciesText as Text),
};

/** Each text once it is here: a sheet that opens after that rises with its words. */
const LOADED: Partial<Record<LegalDoc, Text>> = {};
function load(doc: LegalDoc): Promise<Text> {
  return LOAD[doc]().then((Text) => (LOADED[doc] = Text));
}

/**
 * Fetch a text ahead of its sheet (components/legal/LegalLink.tsx: once the
 * link has been on the page a moment, and again at the first touch). The
 * sheet fetched its text only once it was open, so the Terms rose on
 * "Loading..." for a quarter of a second before their words (Gate 2.0's run,
 * 2026-11-13); fetched ahead, the sheet is drawn with its words from the
 * first frame it rises in.
 */
export function preloadLegal(doc: LegalDoc): void {
  if (!LOADED[doc]) void load(doc).catch(() => {});
}

/**
 * The sheet. It opens on `doc`, the document its link names; a link inside
 * the text may then show another. Its opener mounts it afresh for each
 * opening (LegalLink keys it), so each opening starts on its own document.
 */
export function LegalSheet({ doc, open, onClose }: { doc: LegalDoc; open: boolean; onClose: () => void }) {
  const { t, locale } = useTranslate();
  const [shown, setShown] = useState<LegalDoc>(doc);
  const [place, setPlace] = useState("");
  const [text, setText] = useState<{ doc: LegalDoc; Text: Text } | { doc: LegalDoc; failed: true } | null>(null);
  // A text already here is drawn at once; one still on its way is fetched as the sheet opens.
  const here = LOADED[shown];
  const words = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || here) return;
    let alive = true;
    load(shown)
      .then((Text) => alive && setText({ doc: shown, Text }))
      .catch(() => alive && setText({ doc: shown, failed: true }));
    return () => {
      alive = false;
    };
  }, [open, shown, here]);

  // The text, once it is here for the document shown.
  const Body = here ?? (text !== null && text.doc === shown && "Text" in text ? text.Text : null);
  const ready = Body !== null;

  // A new document, or a place in one: its top, or the place, in the sheet's own scroll.
  useEffect(() => {
    if (!ready) return;
    const scroller = words.current?.parentElement;
    const target = place ? words.current?.querySelector<HTMLElement>(`#${CSS.escape(place)}`) : null;
    if (target) target.scrollIntoView({ block: "start" });
    else scroller?.scrollTo({ top: 0 });
  }, [ready, shown, place]);

  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.("a");
    const href = a?.getAttribute("href") ?? "";
    // Mail, the website's own address in the apps, and outside links: as they are.
    if (!href.startsWith("/")) return;
    // Before the link's own handler, which then stands aside (it checks defaultPrevented).
    e.preventDefault();
    const named = legalDocOf(href);
    if (named) {
      setShown(named.doc);
      setPlace(named.hash);
      return;
    }
    const out = document.createElement("a");
    out.href = websiteHref(href, true);
    out.target = "_blank";
    out.rel = "noreferrer";
    out.click();
  }

  const lang = textLang(shown, locale);
  const title = t(LEGAL_TITLE_KEY[shown]);

  return (
    <Sheet open={open} onClose={onClose} title={title} desktop fill layer="over-all" panelClassName="md:max-w-[720px]" bodyClassName="px-5 pb-10 pt-2">
      {text && text.doc === shown && "failed" in text ? (
        // Only on the website, offline before the text was ever fetched: the page itself, in a tab of its own.
        <p className="pt-4 font-sans text-ui text-paper/75">
          <a href={LEGAL_HREF[shown]} target="_blank" rel="noreferrer" className="text-paper underline underline-offset-2">
            {title}
          </a>
        </p>
      ) : (
        <div
          ref={words}
          data-legal-sheet={shown}
          onClickCapture={onClickCapture}
          // Each text says its own language where it is written, under the
          // reader's own heading and note (build 90 note 4): the Terms and the
          // Privacy Policy their English or German, the shop's the reader's.
        >
          {lang === "en" && locale !== "en" ? <TranslationDisclaimer /> : null}
          {Body ? <Body lang={lang ?? "en"} /> : <p className="pt-4 font-sans text-ui text-paper/55">{t("common.loading")}</p>}
        </div>
      )}
    </Sheet>
  );
}
