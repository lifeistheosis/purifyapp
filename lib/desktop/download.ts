// The Windows app, for the website's "Download for Windows".
//
// Published 2026-09-27 as an asset on a GitHub Release of the public
// repository, never under public/, which ships inside every web deploy and
// both phone apps. Unsigned for now, by the owner's choice: Windows shows
// "Windows protected your PC" on first run until the installer is signed
// (docs/DESKTOP.md, "Before a public release"). A new desktop build is a new
// release and a new url here; the app itself loads purifyapp.net, so most
// changes never need one.
//
// 1.4.1 (2026-09-28) is 1.4.0 with WebView2Loader.dll in the installer. 1.4.0
// installed the app without it, so on a PC with no stray copy of the DLL the
// app would not start ("WebView2Loader.dll was not found"). See
// desktop/src-tauri/windows/installer-hooks.nsh.

export const WINDOWS_DOWNLOAD = {
  version: "1.4.1",
  url: "https://github.com/lifeistheosis/purifyapp/releases/download/desktop-v1.4.1/Purify_1.4.1_x64-setup.exe",
} as const;

/** A Windows computer. Not a phone, a console or anything else that names
 *  Windows in its user agent without being able to run the installer. */
export function isWindowsComputer(userAgent: string): boolean {
  return /Windows NT/i.test(userAgent) && !/Windows Phone|Mobile|Xbox/i.test(userAgent);
}
