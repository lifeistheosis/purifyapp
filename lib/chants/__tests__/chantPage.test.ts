// A chant's own page, sheet r3-18 (Homebase/boards/purify-master/variants/
// r3-18-chant-page), the owner's pick of 2026-10-31: "a mix of A and B. I want
// the player to be at the bottom, like how A has it. But I want the options.
// Actually, how B has it." B's page (the icon across the top with the name and
// who sings it on it, the doors Words, About and Versions, the sung words
// leading with the English under the line being sung) with A's player docked
// at the foot over the tab bar instead of B's Play row. His notes 56 to 61
// (r18/BUILD-80-NOTES.md).
//
// What a reader would notice if this broke: Back walking through the doors
// instead of leaving, or a page come back to on the wrong door (58); Play half
// under the tab bar, or two players at once (60); Share or the words jumping
// when the list of recordings answers or another version is chosen (61).
//
// Rendered to static markup with the app's own words: react-dom/server needs
// no DOM, and the first markup is the first frame, the website's and the
// apps' alike, before anything has answered. The walk on the native export
// measures the boxes themselves (docs in the report of the r3-18 build).

import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ChantPage } from "@/components/chants/ChantPage";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { CHANT_DOOR_EVENT, CHANT_DOORS, chantDoorAddress, chantDoorFromHash, keepChantDoor } from "@/lib/chants/doors";
import { chantBySlug, chantIndex, indexRow } from "@/lib/chants/registry.server";
import { getMessages } from "@/lib/i18n";
import { shouldShowBack } from "@/lib/nav/backBar";

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const css = fs.readFileSync("app/globals.css", "utf8");
const pageSource = fs.readFileSync("components/chants/ChantPage.tsx", "utf8");
const route = fs.readFileSync("app/(app)/chants/[slug]/page.tsx", "utf8");

/** The page as it first draws for a reader in `locale`, who is offered the version in their language. */
function firstFrame(slug: string, locale: string): string {
  const chant = chantBySlug(slug)!;
  const related = (chant.related ?? []).map((s) => chantIndex().find((r) => r.slug === s)!).filter(Boolean);
  return renderToStaticMarkup(
    createElement(
      MessagesProvider,
      { locale, messages: getMessages(locale) } as ProviderProps,
      createElement(ChantPage, { chant, row: indexRow(chant), related }),
    ),
  );
}

/** Every control's opening tag, in order, with its words left out: what the first frame draws, and where. */
function controls(html: string): string[] {
  return [...html.matchAll(/<[a-z]+ [^>]*data-chant-control="[^"]+"[^>]*>/g)].map((m) =>
    m[0].replace(/ aria-label="[^"]*"/g, "").replace(/ lang="[^"]*"/g, ""),
  );
}

/** The buttons in the dock, by what they say they do. */
function dock(html: string): string {
  const at = html.indexOf('data-chant-control="dock"');
  return html.slice(html.lastIndexOf("<", at), html.indexOf("</section>", at));
}

describe("the doors, kept in the address (r3-18 B, note 58)", () => {
  it("opens the door the # names, and Words for any other", () => {
    expect(CHANT_DOORS).toEqual(["words", "about", "versions"]);
    expect(chantDoorFromHash("")).toBe("words");
    expect(chantDoorFromHash("#about")).toBe("about");
    expect(chantDoorFromHash("#Versions")).toBe("versions");
    expect(chantDoorFromHash("#words")).toBe("words");
    expect(chantDoorFromHash("#lyrics")).toBe("words");
    expect(chantDoorFromHash("#%E0%A4%A")).toBe("words");
  });

  it("writes the door into the page's own address, with no # for Words", () => {
    const at = { pathname: "/chants/psalm-135/", search: "?from=home" };
    expect(chantDoorAddress("words", at)).toBe("/chants/psalm-135/?from=home");
    expect(chantDoorAddress("about", at)).toBe("/chants/psalm-135/?from=home#about");
    expect(chantDoorAddress("versions", { pathname: "/chants/psalm-135", search: "" })).toBe("/chants/psalm-135#versions");
  });

  it("replaces the address, never pushes it, so Back leaves the page and never walks the doors", () => {
    const replaceState = vi.fn();
    const pushState = vi.fn();
    const heard: string[] = [];
    const win = {
      location: { pathname: "/chants/psalm-135/", search: "" },
      history: { replaceState, pushState },
      dispatchEvent: (e: Event) => {
        heard.push(e.type);
        return true;
      },
    } as unknown as Window;
    keepChantDoor("about", win);
    keepChantDoor("words", win);
    expect(replaceState.mock.calls).toEqual([
      [null, "", "/chants/psalm-135/#about"],
      [null, "", "/chants/psalm-135/"],
    ]);
    expect(pushState).not.toHaveBeenCalled();
    expect(heard).toEqual([CHANT_DOOR_EVENT, CHANT_DOOR_EVENT]);
    for (const file of ["lib/chants/doors.ts", "components/chants/ChantDoors.tsx", "components/chants/ChantPage.tsx"]) {
      expect(fs.readFileSync(file, "utf8"), file).not.toContain("pushState");
    }
  });

  it("reads the door in the first render on the device, Words on the server", () => {
    const doors = fs.readFileSync("components/chants/ChantDoors.tsx", "utf8");
    expect(doors).toMatch(/useSyncExternalStore\(\s*subscribe,\s*\(\) => chantDoorFromHash\(window\.location\.hash\),\s*\(\) => CHANT_DOORS\[0\],\s*\)/);
    expect(doors).toContain('window.addEventListener("hashchange", onChange);');
  });

  it("draws three doors as tabs, each controlling its own part, and names nothing as a door is named", () => {
    const html = firstFrame("psalm-135", "en");
    for (const door of CHANT_DOORS) {
      expect(html, door).toMatch(new RegExp(`<button id="chant-tab-${door}" type="button" role="tab" aria-selected="${door === "words"}" aria-controls="chant-panel-${door}"`));
      expect(html, door).toMatch(new RegExp(`<div id="chant-panel-${door}" role="tabpanel" aria-labelledby="chant-tab-${door}"`));
      // A browser scrolls a #name in the address to the element with that id.
      expect(html, door).not.toContain(`id="${door}"`);
    }
    // Words opens first; About and Versions are in the page, hidden, so a
    // search engine still reads them.
    expect(html).toMatch(/<div id="chant-panel-words" role="tabpanel" aria-labelledby="chant-tab-words" class=/);
    expect(html).toMatch(/<div id="chant-panel-about" role="tabpanel" aria-labelledby="chant-tab-about" hidden=""/);
    expect(html).toMatch(/<div id="chant-panel-versions" role="tabpanel" aria-labelledby="chant-tab-versions" hidden=""/);
    expect(html).toContain("Where it comes from");
  });
});

describe("the dock, over the tab bar (A's player, note 60)", () => {
  const rule = (selector: string) => css.match(new RegExp(`\\n${selector.replace(/[.[\]()]/g, "\\$&")} \\{[^}]*\\}`))?.[0] ?? "";

  it("stands over the tab bar in the apps, and over the mini player and Today's readings bar when they show", () => {
    const native = rule("html.is-native .chant-dock");
    expect(native).toContain("bottom: calc(var(--inset-bottom) + var(--tab-bar-h) + var(--now-playing-h) + var(--readings-flow-h) + 8px);");
    expect(native).toContain("margin-bottom: 8px;");
    const web = rule(".chant-dock");
    expect(web).toContain("position: sticky;");
    expect(web).toContain("bottom: calc(env(safe-area-inset-bottom, 0px) + var(--now-playing-h) + var(--readings-flow-h) + 12px);");
    expect(web).toContain("height: 104px;");
    // Solid: a blurred layer over a moving page drops frames on Android.
    expect(web).not.toContain("backdrop-filter");
  });

  it("is the page's last part, so its place at rest is the place it is held, and nothing runs under it at the end", () => {
    // The column is the screen less the bar at the top and the foot's room,
    // the same terms the dock rises by.
    const screen = rule("html.is-native .chant-screen");
    for (const term of ["var(--inset-top)", "var(--inset-bottom)", "var(--tab-bar-h)", "var(--now-playing-h)", "var(--readings-flow-h)"]) {
      expect(screen, term).toContain(term);
    }
    expect(rule(".chant-screen")).toContain("display: flex;");
    const dockAt = pageSource.indexOf("<ChantDock");
    expect(pageSource.slice(dockAt)).toMatch(/^<ChantDock[\s\S]*?\/>\s*<\/div>\s*<\/section>/);
    expect(rule(".chant-dock")).toContain("margin-top: auto;");
  });

  it("wears the app's own controls: where it is, back 15, Play and forward 15, Play dim until the list of recordings answers", () => {
    const html = dock(firstFrame("psalm-135", "en"));
    expect(html).toContain('data-screen-edge="bottom"');
    const buttons = [...html.matchAll(/<button [^>]*aria-label="([^"]+)"[^>]*>/g)].map((m) => [m[1], m[0]]);
    expect(buttons.map(([label]) => label)).toEqual(["Back 15 seconds", "Play", "Forward 15 seconds"]);
    for (const [, tag] of buttons) expect(tag).toContain('disabled=""');
    expect(buttons[1][1]).toContain('aria-busy="true"');
    expect(buttons[1][1]).toContain("width:54px;height:54px");
    // The line, still, with the version's length, before it plays (534.96 s).
    expect(html).toContain(">0:00</span>");
    expect(html).toMatch(/>-(<!-- -->)?8:54<\/span>/);
  });

  it("puts the mini player aside for this chant's own recordings only", () => {
    expect(pageSource).toContain("useOwnPlayer(row.variants.map((v) => v.audio.src));");
    const store = fs.readFileSync("lib/player/pagePlayer.ts", "utf8");
    // Before the frame is painted, and given back as the page goes.
    expect(store).toMatch(/useIsoLayoutEffect\(\(\) => \{\s*set\(key \? key\.split\("\\n"\) : NONE\);\s*return \(\) => set\(NONE\);\s*\}, \[key\]\);/);
  });
});

describe("every control keeps its place from the first frame (note 61)", () => {
  // "ensure that if a button does come up or whatever, it doesn't mess up
  // the screen and move the whole entire UI." Each control is drawn at its
  // full size before anything has answered, and the same for every version.

  it("draws the same controls, in the same boxes, for every version of Psalm 135", () => {
    // A reader is offered the version in their own language: English,
    // Greek, Arabic, Serbian.
    const frames = ["en", "el", "ar", "sr"].map((locale) => ({ locale, html: firstFrame("psalm-135", locale) }));
    const first = controls(frames[0].html);
    expect(first.map((tag) => /data-chant-control="([^"]+)"/.exec(tag)![1])).toEqual(["name", "doors", "words-view", "dock"]);
    for (const { locale, html } of frames) expect(controls(html), locale).toEqual(first);
  });

  it("greys the switch's sound and both for a version sung with none written out, and never takes it away", () => {
    const parts = (html: string) =>
      [...html.matchAll(/<button type="button" role="radio"[^>]*>/g)].map((m) => (m[0].includes('disabled=""') ? "grey" : "on"));
    expect(parts(firstFrame("psalm-135", "en"))).toEqual(["on", "grey", "grey"]);
    expect(parts(firstFrame("psalm-135", "sr"))).toEqual(["on", "grey", "grey"]);
    expect(parts(firstFrame("psalm-135", "el"))).toEqual(["on", "on", "on"]);
    expect(parts(firstFrame("psalm-135", "ar"))).toEqual(["on", "on", "on"]);
  });

  it("holds the Prayer Rope Anthem's controls the same for its three versions, and the Canon's with no switch", () => {
    const anthem = ["en", "fr", "ar"].map((locale) => controls(firstFrame("prayer-rope-anthem", locale)));
    for (const frame of anthem) expect(frame).toEqual(anthem[0]);
    const canon = controls(firstFrame("paschal-canon", "en"));
    expect(canon.map((tag) => /data-chant-control="([^"]+)"/.exec(tag)![1])).toEqual(["name", "doors", "dock"]);
  });

  it("holds the name and who sings it at the icon's foot, so a credit on two lines grows up into the picture", () => {
    const html = firstFrame("psalm-135", "ar");
    expect(html).toMatch(/<div data-chant-control="name" class="absolute inset-x-0 bottom-\[46px\] md:static/);
    // The doors in B's Play row's place, over the icon's melted foot, drawn
    // over it so every tap reaches them.
    expect(html).toMatch(/<header class="under-topbar relative -mb-10 md:mb-0 /);
    expect(html).toMatch(/<div role="tablist" aria-label="[^"]*" data-chant-control="doors" class="chant-doors relative z-\[1\] /);
    const name = html.slice(html.indexOf('data-chant-control="name"'), html.indexOf("</header>"));
    expect(name).toMatch(/<p class="doctrine-shadow mt-\[7px\] line-clamp-2 [^"]*">[^<]*Mount Lebanon Orthodox Choir and Theodoros Vassilikos<\/p>/);
    expect(css).toMatch(/@media \(max-width: 767\.98px\) \{\s*\.chant-hero \{\s*aspect-ratio: 7 \/ 6;\s*max-height: 40vh;\s*max-height: 40svh;/);
  });

  it("lets the words fill the room between the doors and the dock", () => {
    const html = firstFrame("psalm-135", "en");
    expect(html).toMatch(/<div id="chant-panel-words" role="tabpanel" aria-labelledby="chant-tab-words" class="flex min-h-\[180px\] flex-1 flex-col pt-2">/);
    expect(html).toMatch(/<div data-sung-look="page" class="[^"]*absolute inset-0"/);
  });

  it("names every singer in Versions, and says so where nobody is known, never inventing one", () => {
    const html = firstFrame("psalm-135", "en");
    const versions = html.slice(html.indexOf('id="chant-panel-versions"'), html.indexOf('data-chant-control="dock"'));
    expect(versions).toMatch(/<ul class="[^"]*\bchant-versions\b/);
    expect(versions.match(/<li /g)).toHaveLength(4);
    for (const singer of ["Sung by Mount Lebanon Orthodox Choir and Theodoros Vassilikos", "Sung by Eikona", "Sung by Beirut men&#x27;s choir", "Performer not known"]) {
      expect(versions, singer).toContain(singer);
    }
    // Each row's Play is drawn, dim, while the list of recordings is read.
    expect(versions.match(/aria-label="Play: [^"]+"[^>]*disabled=""|disabled=""[^>]*aria-label="Play: /g)?.length ?? 0).toBe(4);
    // No preview here: Play plays the whole version with its words lit.
    expect(versions).not.toContain("Hear part of");
    // The version on the page carries its small lit mark.
    expect(versions.match(/chant-version-dot/g)).toHaveLength(1);
  });
});

describe("Back (note 58)", () => {
  it("is the page's own bar, clear over the icon, back to Chants when nothing of the app is behind it", () => {
    expect(route).toMatch(/<MobileTopBar[\s\S]*?\bback\b[\s\S]*?backFallback="\/chants"[\s\S]*?revealTitleOn="chant-name"[\s\S]*?\boverlay\b/);
    expect(route).toMatch(/trailing=\{\s*<ShareButton\s+titleKey=\{chantTitleKey\(chant\.key\)\}\s+round/);
    expect(firstFrame("psalm-135", "en")).toContain('<h1 id="chant-name"');
    // One bar: the apps' back bar steps aside for it, and stays on Chants.
    expect(shouldShowBack("/chants/psalm-135")).toBe(false);
    expect(shouldShowBack("/chants")).toBe(true);
  });

  it("leaves Chants as it was: the page adds nothing to the history, and gives the mini player back", () => {
    expect(pageSource).not.toMatch(/router\.(push|replace)\(/);
    expect(pageSource).toContain("openChantDoor(next);");
    const store = fs.readFileSync("lib/player/pagePlayer.ts", "utf8");
    expect(store).toContain("return () => set(NONE);");
  });
});
