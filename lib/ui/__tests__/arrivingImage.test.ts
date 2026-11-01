// Pictures never show half arrived (build 85, the owner's note 52: on the
// prayer wall the profile pictures "load in half and then the other half. We
// had this issue previously, but ensure you apply the fix to here also").
//
// The issue before: History's plates in 1.7.2 ("spiratically", a band at a
// time; lib/history/__tests__/calmHistory.test.ts, "never show half arrived")
// and build 81's small pictures, the mini player's cover and a work's byline
// icon ("the photos that load in here load in spiratically and not smoothly").
// The rule is now one piece, lib/ui/useArrivingImage.ts, with its plain <img>
// in components/ui/ArrivingImage.tsx: a picture is drawn as nothing until
// every byte is in and it is decoded, then it fades in on the app's motion
// switch; the placeholder under it holds its box, so nothing moves.
//
// What a reader would notice if this broke: a face, an icon or a cover
// painting itself down the screen a band at a time, a row that jumps when a
// picture comes, a letter showing through a picture with clear parts, a
// fade played to a reader who turned motion off, or a picture that never
// appears at all.
//
// This reads the source and draws the avatars as the server does. How the
// built app draws them, frame by frame on a slow network, is the export walk.

import fs from "node:fs";
import path from "node:path";

import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { ReaderAvatar } from "@/components/profile/ReaderAvatar";
import { SaintAvatar } from "@/components/shop/SaintAvatar";
import { SaintFace } from "@/components/today/SaintFace";
import { ArrivingImage } from "@/components/ui/ArrivingImage";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old way is not read as the way. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the rule whose selector is exactly `selector`. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[{};])\\s*${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css)?.[2] ?? "";
}

/** Every <img> and next/image drawn in a file's code, as written. */
const pictures = (src: string) => [...src.matchAll(/<(img|Image)\b[\s\S]*?\/>/g)].map((m) => m[0]);

/** A component as the server writes it, less the preload React adds for an eager picture. */
const draw = (element: ReactElement) => renderToStaticMarkup(element).replace(/<link rel="preload" as="image"[^>]*\/>/g, "");

/** A picture marked by the hook, listening for its arrival. */
const hooked = (p: string) => /ref=\{ref\}/.test(p) && /onLoad=\{onArrive\}|onArrive\(e\)/.test(p) && /img-arrive/.test(p);
/** A picture with a state of its own that waits for the decode before it shows. */
const decodes = (p: string) => /\.decode\(\)\.then\(done, done\)/.test(p);
/** A preview drawn from a data address in the page itself, 24px wide: it has nothing to download. */
const preview = (p: string) => /src=\{picture\.preview\}/.test(p);

/** Pictures that take the hook themselves: each one is marked, listens and is held. */
const HOOKED = [
  "components/community/CommunityAvatar.tsx",
  "components/profile/ReaderAvatar.tsx",
  "components/shop/SaintAvatar.tsx",
  "components/today/SaintFace.tsx",
  "components/saints/SaintIcon.tsx",
  "components/prayers/PrayerIcon.tsx",
  "components/calendar/PhoneCalendar.tsx",
  "components/player/CoverArt.tsx",
  "components/reading/FeaturedWork.tsx",
  "components/councils/CouncilBookHeader.tsx",
  "components/councils/CouncilFathers.tsx",
  "components/councils/CouncilShelf.tsx",
  "components/settings/FirstFocus.tsx",
];

/** Pictures drawn plainly, through the shared <img>: no bare picture left beside it. */
const DRAWN = [
  "components/community/CampaignCard.tsx",
  "components/community/CommunityHead.tsx",
  "components/community/ComposePage.tsx",
  "components/community/profile/ProfileCard.tsx",
  "components/today/GreetingHeader.tsx",
  "components/today/NameDayCard.tsx",
  "components/history/EventPeople.tsx",
  "components/search/SearchRows.tsx",
  "components/councils/DocumentsDoor.tsx",
  "components/theology/PathMedal.tsx",
  "components/theology/TopicReader.tsx",
  "components/theology/TheologyHub.tsx",
  "components/theology/StepView.tsx",
  "components/theology/TheologyLibrary.tsx",
  "components/theology/WholeIcon.tsx",
  "components/prayers/ArtPlate.tsx",
  // Prayers' Practices in their icons and the prayer book's plates (1.8, note 72).
  "components/mobile/SoftTiles.tsx",
  "components/prayers/PrayerBookContents.tsx",
  "components/desktop/DiscordModes.tsx",
  "components/player/PrayWithChant.tsx",
  "components/onboarding/LookingFor.tsx",
];

/** Pictures with fallbacks and holds of their own, which keep their own state and decode before they show. */
const OWN = [
  "components/history/EventPlate.tsx",
  "components/councils/CouncilHero.tsx",
  "components/saints/SaintHeroPicture.tsx",
  "components/covers/WorkCover.tsx",
  "components/walkthrough/NoteFigures.tsx",
  "components/reading/FeaturedWork.tsx",
];

describe("the rule, in one place", () => {
  const hook = code("lib/ui/useArrivingImage.ts");

  it("shows a picture only once it is in and decoded", () => {
    // The load is heard, then the decode is waited for, whichever way it ends.
    expect(hook).toMatch(/const onArrive = useCallback\(\(e: SyntheticEvent<HTMLImageElement>\) => \{/);
    expect(hook).toContain("decoded(img).then(done, done);");
    expect(hook).toContain('return typeof img.decode === "function" ? img.decode() : Promise.resolve();');
    // A decode the browser never answers cannot keep a loaded picture away for good.
    expect(hook).toContain("window.setTimeout(done, DECODE_WAIT_MS);");
    expect(hook).toContain("const DECODE_WAIT_MS = 1500;");
    // Shown by the mark on the element, and only if it still holds the picture that loaded.
    expect(hook).toContain('if ((img.currentSrc || img.src) === loaded) img.dataset.arrived = "";');
  });

  it("reads a picture that finished before the page could listen, and hands a broken one to its fallback", () => {
    expect(hook).toContain("useLayoutEffect(() => {");
    expect(hook).toMatch(/if \(img\.complete && img\.naturalWidth > 0\) \{\s*img\.dataset\.arrived = "";/);
    expect(hook).toContain("delete img.dataset.arrived;");
    expect(hook).toMatch(/if \(img\.complete && img\.currentSrc\) \{[\s\S]*?onBroken\?\.\(img\)/);
    // A new element under the same address is looked at afresh; the same one is left alone.
    expect(hook).toContain("seen.current.img === img && seen.current.src === src");
    // Not React state: nothing renders twice for it.
    expect(hook).not.toMatch(/useState/);
  });

  it("is drawn as nothing until it has arrived, from the server's page on, and fades in on the app's motion switch", () => {
    expect(rule(".img-arrive")).toMatch(/transition: opacity 320ms var\(--ease-house\);/);
    expect(rule(".img-arrive:not([data-arrived])")).toMatch(/opacity: 0;\s*transition: none;/);
    expect(rule(':where([data-motion="reduce"]) .img-arrive')).toMatch(/transition: none;/);
    // The old mark, set by script only, let the server's page paint its bands.
    expect(css).not.toContain("[data-arriving]");
    for (const rel of [...HOOKED, ...DRAWN, "components/ui/ArrivingImage.tsx", "lib/ui/useArrivingImage.ts"]) {
      expect(code(rel), rel).not.toMatch(/data-arriving|dataset\.arriving/);
      // The motion switch is the app's, never the system's.
      expect(code(rel), rel).not.toMatch(/prefers-reduced-motion/);
    }
  });

  it("is never written without the script that shows it, or the picture would stay unseen", () => {
    // .img-arrive hides a picture until the hook marks it, so a class written
    // by hand, without the hook or the shared picture beside it, hides it for good.
    const walk = (dir: string): string[] =>
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.posix.join(dir, e.name);
        if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : walk(rel);
        return /\.tsx?$/.test(e.name) ? [rel] : [];
      });
    const bare: string[] = [];
    for (const rel of [...walk("app"), ...walk("components")]) {
      if (rel === "components/ui/ArrivingImage.tsx") continue;
      if (!fs.readFileSync(path.join(ROOT, rel), "utf8").includes("img-arrive")) continue;
      const src = code(rel);
      if (/\bimg-arrive(?!-under)\b/.test(src) && !/useArrivingImage\(/.test(src)) bare.push(rel);
    }
    expect(bare).toEqual([]);
    // It reads every file under app/ and components/: past the 30s default on a busy PC.
  }, 120_000);

  it("lets the placeholder under a picture step away once the picture is in, after its fade", () => {
    expect(rule(".img-arrive[data-arrived] + .img-arrive-under")).toMatch(/visibility: hidden;\s*transition: visibility 0s 320ms;/);
    expect(rule(':where([data-motion="reduce"]) .img-arrive[data-arrived] + .img-arrive-under')).toMatch(/transition: none;/);
  });

  it("gives a plain picture the rule whole: its mark, its ear and a new element for a new address", () => {
    const shared = code("components/ui/ArrivingImage.tsx");
    expect(shared).toContain("const { ref, onArrive } = useArrivingImage(src, onBroken);");
    expect(shared).toContain("key={src}");
    expect(shared).toContain("ref={ref}");
    expect(shared).toMatch(/onLoad=\{\(e: SyntheticEvent<HTMLImageElement>\) => \{\s*onArrive\(e\);\s*onLoad\?\.\(e\);/);
    expect(shared).toContain('className={cn("img-arrive", className)}');
    const html = draw(createElement(ArrivingImage, { src: "/saints/icons/theotokos.jpg", className: "absolute inset-0" }));
    expect(html).toBe('<img src="/saints/icons/theotokos.jpg" alt="" class="img-arrive absolute inset-0"/>');
  });
});

describe("every face, icon and cover", () => {
  it("that takes the hook marks each of its pictures and listens for it", () => {
    for (const rel of HOOKED) {
      const src = code(rel);
      expect(src, rel).toMatch(/useArrivingImage\(/);
      expect(pictures(src).filter(hooked).length, rel).toBeGreaterThan(0);
    }
  });

  it("that keeps its own state waits for the decode before it shows (1.7.2's rule)", () => {
    for (const rel of OWN) expect(pictures(code(rel)).filter(decodes).length, rel).toBeGreaterThan(0);
    // The saint's page draws its icons through the shared picture, under the hero and without one.
    expect(code("components/saints/SaintHeroPicture.tsx").match(/<ArrivingImage\s+src=\{iconUrl\}/g)).toHaveLength(2);
  });

  it("that is drawn plainly goes through the shared picture", () => {
    for (const rel of DRAWN) {
      const src = code(rel);
      expect(src, rel).toContain('import { ArrivingImage } from "@/components/ui/ArrivingImage";');
      expect(src, rel).toMatch(/<ArrivingImage\b/);
    }
  });

  it("leaves no picture beside them outside the rule", () => {
    for (const rel of [...HOOKED, ...OWN, ...DRAWN]) {
      for (const p of pictures(code(rel))) {
        expect(hooked(p) || decodes(p) || preview(p), `${rel}: ${p.slice(0, 160)}`).toBe(true);
      }
    }
  });

  it("covers Community and the reader's own pictures wherever they are drawn", () => {
    // Every picture in Community and the profile goes through the rule; a new
    // one has to be added to a list above, which is the point.
    const walk = (dir: string): string[] =>
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.posix.join(dir, e.name);
        if (e.isDirectory()) return e.name === "__tests__" ? [] : walk(rel);
        return /\.tsx$/.test(e.name) ? [rel] : [];
      });
    const known = new Set([...HOOKED, ...DRAWN, ...OWN]);
    for (const rel of [...walk("components/community"), ...walk("components/profile")]) {
      const src = code(rel);
      if (!pictures(src).length && !/<ArrivingImage\b/.test(src)) continue;
      // The crop sheet shows the reader's own file from the device, already whole.
      if (rel === "components/profile/ImageCropSheet.tsx") continue;
      expect(known.has(rel), `${rel} draws a picture outside the rule`).toBe(true);
    }
    // The phone header's avatar is the reader's own picture, drawn by ReaderAvatar.
    const small = code("components/today/UserAvatarSmall.tsx");
    expect(small).toContain("<ReaderAvatar name={me.name} picture={me.picture} size={40} />");
    expect(pictures(small)).toEqual([]);
  });
});

describe("an avatar as the server draws it", () => {
  const picture = "https://avbqyvjgcrucjwevwixt.supabase.co/storage/v1/object/public/avatars/a.jpg";

  it("in Community: the disc, its ring and the initial at once, the picture over them unseen until it arrives", () => {
    const html = draw(createElement(CommunityAvatar, { name: "ortho.seb", url: picture, size: 40 }));
    // Its box is its size before anything loads, so the row never moves.
    expect(html).toMatch(/^<span class="relative inline-flex shrink-0" style="width:40px;height:40px">/);
    expect(html).toContain("box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--color-paper) 15%, transparent)");
    // The picture fills the disc from above it, and the server's page shows none of it.
    expect(html).toMatch(/<img src="[^"]+" alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" class="img-arrive absolute inset-0 h-full w-full object-cover"\/>/);
    expect(html).not.toContain("data-arrived");
    // The initial is just after it, so it can step away once the picture is in.
    expect(html).toMatch(/class="img-arrive [^"]*"\/><span aria-hidden="true" class="img-arrive-under">O<\/span>/);
  });

  it("in Community, with no picture: the initial alone, read as before", () => {
    const html = draw(createElement(CommunityAvatar, { name: "Rav3nn.", url: null, size: 36 }));
    expect(html).not.toContain("<img");
    expect(html).toContain('<span class="img-arrive-under">R</span>');
  });

  it("in the app's chrome: the reader's initials stand in the picture's place until it has arrived", () => {
    const html = draw(createElement(ReaderAvatar, { name: "Edgar Augustin", picture, size: 40 }));
    expect(html).toMatch(/^<span aria-hidden="true" data-reader-avatar="" class="relative inline-flex shrink-0" style="width:40px;height:40px">/);
    expect(html).toMatch(/<img src="[^"]+" alt="" decoding="async" referrerPolicy="no-referrer" class="img-arrive absolute inset-0 h-full w-full rounded-full border border-paper\/15 bg-paper\/\[0\.06\] object-cover"\/><span aria-hidden="true" class="lm-avatar [^"]* img-arrive-under" style="width:40px;height:40px;[^"]*">EA<\/span>/);
    expect(html).not.toContain("data-arrived");
    // With no picture, the initials alone, as before.
    const none = draw(createElement(ReaderAvatar, { name: "Edgar Augustin", picture: null, size: 40 }));
    expect(none).not.toContain("<img");
    expect(none).not.toContain("img-arrive-under");
  });

  it("for the day's saint: his face unseen until it is whole, the AVIF first", () => {
    const html = draw(
      createElement(SaintFace, {
        picture: { kind: "cover", src: "/covers/authors/basil-the-great.v1.jpg", avif: "/covers/authors/basil-the-great.v1.avif", fallback: "/saints/icons/basil-the-great.jpg", focusY: 20 },
      }),
    );
    expect(html).toMatch(/^<picture class="contents"><source type="image\/avif" srcSet="\/covers\/authors\/basil-the-great\.v1\.avif"\/><img src="\/covers\/authors\/basil-the-great\.v1\.jpg" alt="" aria-hidden="true" decoding="async" class="img-arrive h-full w-full object-cover"/);
    expect(html).not.toContain("data-arrived");
    expect(html).not.toMatch(/transition-opacity|duration-500/);
  });

  it("in the shop: the hover's zoom moves the frame, and the picture in it arrives on its own", () => {
    const html = draw(
      createElement(SaintAvatar, {
        saint: { shortName: "Apostle Peter", iconUrl: "/saints/icons/apostle-peter.jpg" },
        sizes: "64px",
        className: "size-16",
        imageClassName: "transition-transform group-hover:scale-[1.06]",
      }),
    );
    expect(html).toMatch(/^<span aria-hidden="true" class="relative block shrink-0 overflow-hidden rounded-full bg-night-soft ring-1 ring-inset ring-paper\/\[0\.08\] size-16"><span class="absolute inset-0 block transition-transform group-hover:scale-\[1\.06\]"><img /);
    expect(html).toMatch(/<img [^>]*class="img-arrive object-cover object-\[50%_20%\]"/);
    expect(html).not.toContain("data-arrived");
    // ShopBySaint's zoom is on that frame, so the arrival keeps its own fade.
    expect(code("components/shop/ShopBySaint.tsx")).toContain('imageClassName="transition-transform duration-500 ease-house group-hover:scale-[1.06]');
  });
});

describe("nothing moves when a picture comes", () => {
  it("gives every small saint's icon a frame of its own size that stands at once", () => {
    // The name day's icon was as wide as the picture, nothing until it came,
    // so the patron's name jumped across when it did.
    expect(code("components/today/NameDayCard.tsx")).toMatch(/<span aria-hidden className="relative h-14 w-\[42px\] shrink-0 overflow-hidden rounded-\[8px\] bg-paper\/\[0\.05\] ring-1 ring-paper\/10">\s*<ArrivingImage src=\{saint\.iconUrl\}/);
    expect(code("components/today/GreetingHeader.tsx")).toMatch(/<span aria-hidden className="relative h-\[78px\] w-\[62px\] shrink-0 overflow-hidden rounded-\[12px\] bg-paper\/\[0\.05\] ring-1 ring-paper\/14">/);
    expect(code("components/history/EventPeople.tsx")).toMatch(/<span aria-hidden className="relative h-12 w-12 shrink-0 overflow-hidden rounded-\[10px\] bg-paper\/\[0\.05\] ring-1 ring-paper\/10">/);
    expect(code("components/calendar/PhoneCalendar.tsx")).toContain('<span className="relative h-14 w-[42px] shrink-0 overflow-hidden rounded-md bg-paper/[0.06] ring-1 ring-inset ring-paper/10">');
  });

  it("keeps the head of Community's entrance on its frame, apart from the picture's arrival", () => {
    const head = code("components/community/CommunityHead.tsx");
    expect(head).toMatch(/<span className="community-head-img absolute inset-0">\s*<ArrivingImage\s+src=\{COMMUNITY_PICTURE\}/);
  });

  it("lets a card's dimming and its picture's fade share one transition", () => {
    expect(rule(".ob-pick img")).toMatch(/transition: filter 320ms var\(--ease-house\), opacity 320ms var\(--ease-house\);/);
    expect(rule(".set-root .set-focus-card img:not([data-arrived])")).toMatch(/opacity: 0;\s*transition: none;/);
  });
});
