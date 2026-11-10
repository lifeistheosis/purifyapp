// A link to something only the website has.
//
// The apps' export sets some of the website aside (scripts/native-build.mjs,
// STASH_PATHS): the support form, robots.txt, llms.txt and more. A link to
// one of those, written as a path, is a dead tap inside the apps: the shell
// answers an address it does not hold with the front door, or with nothing.
// Three such links were found by the optimization audit of 2026-11-10
// (docs/1.9-build/notes/optimization-fable.md, item 3): the shop's policies
// to /support/contact, and the privacy page to /robots.txt and /llms.txt.
//
// On the website the path is the link, as before. In the apps it is the
// website's own address, which the shell hands to the phone's browser.
// lib/nav/__tests__/websiteHref.test.ts holds every page to it.
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { SITE_URL } from "@/lib/site";

/** `path` on the website; the website's full address for it in the apps. */
export function websiteHref(path: string, inApps: boolean = IS_STATIC_EXPORT): string {
  if (!inApps) return path;
  return `${SITE_URL.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
