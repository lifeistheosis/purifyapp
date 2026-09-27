// The Windows app, for the website's "Download for Windows".
//
// Published 2026-09-27 as an asset on a GitHub Release of the public
// repository, never under public/, which ships inside every web deploy and
// both phone apps. Unsigned for now, by the owner's choice: Windows shows
// "Windows protected your PC" on first run until the installer is signed
// (docs/DESKTOP.md, "Before a public release"). A new desktop build is a new
// release and a new url here; the app itself loads purifyapp.net, so most
// changes never need one.

export const WINDOWS_DOWNLOAD = {
  version: "1.4.0",
  url: "https://github.com/lifeistheosis/purifyapp/releases/download/desktop-v1.4.0/Purify_1.4.0_x64-setup.exe",
} as const;

/** A Windows computer. Not a phone, a console or anything else that names
 *  Windows in its user agent without being able to run the installer. */
export function isWindowsComputer(userAgent: string): boolean {
  return /Windows NT/i.test(userAgent) && !/Windows Phone|Mobile|Xbox/i.test(userAgent);
}
