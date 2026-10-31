"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { knownWeb, loadWeb, rememberWeb } from "@/lib/saints/webFiles";
import { webPathFor, webSlugOfPath } from "@/lib/saints/webGlide";
import type { SaintWebData } from "@/lib/saints/webLayout";
import { prefersReducedMotion } from "@/lib/ui/motion";

import { WebConstellation, type WebArrival, type WebKept, type WebLive } from "./WebConstellation";
import { WebTimeline } from "./WebTimeline";
import { WebViewSwitch, useWebView } from "./WebViewSwitch";

/** The web in the room, and how it came there. */
type Shown = { web: SaintWebData; arrival: WebArrival | null };

/** The page's own web, or one read on this visit, for the saint an address names. */
function webFor(slug: string, page: SaintWebData): SaintWebData | undefined {
  return slug === page.center.slug ? page : knownWeb(slug);
}

/** The window's title names the saint in the middle ("St. Basil the Great, the saint web | Purify"). */
function retitle(from: string, to: string): void {
  if (from !== to && document.title.includes(from)) document.title = document.title.replace(from, to);
}

/**
 * The saint web (1.8): one screen, the same web two ways, and a switch in the
 * top bar between them. The owner's words of 2026-10-27, on round 1's A
 * (Constellation) and B (Thread): "I want that to just be a button, instead
 * of merging the two screens" (boards/purify-master/variants/m01-saint-web).
 *
 * Web shows the saint in the middle and everyone around him; Timeline the
 * same people year by year down his life. On a phone the switch is in the
 * bar (the page mounts it there, WebViewSwitch); on a computer, which has no
 * such bar, it stands beside the page's heading. The heading names the screen
 * for assistive technology on a phone, where the bar carries the switch in
 * the title's place.
 *
 * The build 80 note 55 ("make sure the transition from their web to the other
 * person's web is smooth"): "Center the web here" on a saint's card no longer
 * opens his web as a new page. The screen stays, and his web glides into the
 * room in place of this one (WebConstellation, lib/saints/webGlide.ts), read
 * from the file the build writes for it (lib/saints/webFiles.ts), so it works
 * in the apps' export with no server. The address becomes his web's, as a new
 * entry in the history, and the address is what says which web the room
 * shows: Back and Forward walk the webs this screen has shown, gliding each
 * way, and a reload or a shared link draws that web as its own page. With
 * Purify's motion off the new web is simply there.
 *
 * The saints a reader moved on each web, and the one he chose, are kept here
 * while he stays on the screen, so the Timeline and back, or Back to a web he
 * glided from, finds it as he left it; a new visit starts from the web's own
 * places (round 3, r3-06).
 */
export function SaintWebScreen({ data: page }: { data: SaintWebData }) {
  const { t } = useTranslate();
  const view = useWebView();
  const router = useRouter();
  const wanted = webSlugOfPath(usePathname()) ?? page.center.slug;
  // The page Next restores for an entry this screen pushed is the first web's, under the later address: the address wins.
  const [shown, setShown] = useState<Shown | null>(() => {
    const web = webFor(wanted, page);
    return web ? { web, arrival: null } : null;
  });
  const [kept, setKept] = useState<Record<string, WebKept>>({});
  const live = useRef<WebLive>(null);
  const shownRef = useRef(shown);
  /** The saint the window's title names now. */
  const titled = useRef(page.center.name);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    shownRef.current = shown;
  });

  useEffect(() => {
    mounted.current = true;
    rememberWeb(page);
    // Come back to an entry this screen pushed: the title is the first web's until it says this one.
    const name = shownRef.current?.web.center.name;
    if (name && name !== titled.current) {
      retitle(titled.current, name);
      titled.current = name;
    }
    return () => {
      mounted.current = false;
    };
  }, [page]);

  /** Another saint's web into the room: gliding from the one on the screen, or at once with the motion off. */
  const show = useCallback((web: SaintWebData) => {
    const was = shownRef.current;
    if (was?.web.center.slug === web.center.slug) return;
    rememberWeb(web);
    const glide = was && !prefersReducedMotion() ? (live.current?.snapshot() ?? null) : null;
    const next: Shown = { web, arrival: { from: was?.web.center.slug ?? null, glide } };
    shownRef.current = next;
    setShown(next);
    retitle(titled.current, web.center.name);
    titled.current = web.center.name;
  }, []);

  // The address says which web the room shows. Back and Forward over the
  // entries "Center the web here" pushed change it in place (Next keeps this
  // page), and the room glides to the web it names; a web this visit has not
  // read yet is read first. One the device cannot read is left to the router,
  // which draws the address as its own page.
  useLayoutEffect(() => {
    if (shownRef.current?.web.center.slug === wanted) return;
    const web = webFor(wanted, page);
    if (web) {
      show(web);
      return;
    }
    let on = true;
    void loadWeb(wanted).then((found) => {
      if (!on) return;
      if (found) show(found);
      else router.refresh();
    });
    return () => {
      on = false;
    };
  }, [wanted, page, show, router]);

  /** "Center the web here": his web glides in, and the address becomes his web's, a new step in the history. */
  const center = useCallback(
    (slug: string) => {
      const go = (web: SaintWebData) => {
        if (!mounted.current) return;
        show(web);
        // Pressed twice while his web was being read: one step in the history, not two.
        if (webSlugOfPath(window.location.pathname) === slug) return;
        window.history.pushState({}, "", webPathFor(slug, window.location.pathname));
      };
      const web = knownWeb(slug);
      if (web) {
        go(web);
        return;
      }
      void loadWeb(slug).then((found) => {
        if (found) go(found);
        else if (mounted.current) router.push(`/saints/${slug}/web`);
      });
    },
    [show, router],
  );

  const data = shown?.web ?? null;
  const slug = data?.center.slug ?? page.center.slug;
  const keep = useCallback((next: WebKept) => setKept((k) => ({ ...k, [slug]: { ...k[slug], ...next } })), [slug]);
  const title = t("saints.web.title", { name: (data ?? page).center.short });

  return (
    <section className="bg-night px-5 md:px-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="pt-2 md:flex md:items-end md:justify-between md:gap-6 md:pb-4 md:pt-14">
          <h1 className="sr-only md:not-sr-only md:text-heading md:leading-tight md:text-paper">{title}</h1>
          <div className="hidden md:flex native-md-hidden">
            <WebViewSwitch idBase="saint-web-head" />
          </div>
        </div>
        <div id="saint-web-view" role="tabpanel" aria-labelledby={`saint-web-bar-${view}`}>
          {!data ? (
            // The web the address names, still being read: nothing of another web meanwhile.
            <div aria-busy="true" className="min-h-[60vh]" />
          ) : view === "web" ? (
            <WebConstellation data={data} kept={kept[slug]} onKeep={keep} arrival={shown?.arrival} liveRef={live} onCenter={center} />
          ) : (
            <WebTimeline data={data} />
          )}
        </div>
      </div>
    </section>
  );
}
