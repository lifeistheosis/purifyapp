import { describe, expect, it } from "vitest";

import fs from "node:fs";
import path from "node:path";

import { WINDOWS_DOWNLOAD, isWindowsComputer } from "../download";

const UA = {
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
  firefoxWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  ipad: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  android:
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  windowsPhone:
    "Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.15063",
  xbox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edge/44.18363.8131",
};

describe("isWindowsComputer", () => {
  it("offers the Windows app to Windows browsers", () => {
    expect(isWindowsComputer(UA.chromeWindows)).toBe(true);
    expect(isWindowsComputer(UA.edgeWindows)).toBe(true);
    expect(isWindowsComputer(UA.firefoxWindows)).toBe(true);
  });

  it("does not offer it where it cannot run", () => {
    expect(isWindowsComputer(UA.safariMac)).toBe(false);
    expect(isWindowsComputer(UA.ipad)).toBe(false);
    expect(isWindowsComputer(UA.android)).toBe(false);
    expect(isWindowsComputer(UA.windowsPhone)).toBe(false);
    expect(isWindowsComputer(UA.xbox)).toBe(false);
  });
});

describe("WINDOWS_DOWNLOAD", () => {
  it("points at a release asset of the public repository, never the site", () => {
    expect(WINDOWS_DOWNLOAD.url).toMatch(
      /^https:\/\/github\.com\/lifeistheosis\/purifyapp\/releases\/download\/desktop-v[\d.]+\/[^/]+\.exe$/,
    );
    expect(WINDOWS_DOWNLOAD.url).toContain(`desktop-v${WINDOWS_DOWNLOAD.version}/`);
  });

  // The link and the app it downloads move together: a new installer is a new
  // version in desktop/src-tauri/tauri.conf.json and a new release here.
  it("offers the version the desktop app is built as", () => {
    const conf = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "desktop", "src-tauri", "tauri.conf.json"), "utf8"),
    ) as { version: string };
    expect(WINDOWS_DOWNLOAD.version).toBe(conf.version);
    expect(WINDOWS_DOWNLOAD.url).toContain(`Purify_${conf.version}_x64-setup.exe`);
  });
});

// The 1.4.0 installer copied only purify-desktop.exe. The app is built on the
// GNU toolchain, where the exe loads WebView2Loader.dll at start, so every
// install on a PC without a stray copy of the DLL died with "WebView2Loader.dll
// was not found" (reported 2026-09-28). The hook that ships it must stay wired.
describe("Windows installer", () => {
  it("installs WebView2Loader.dll beside the app, and removes it on uninstall", () => {
    const srcTauri = path.join(process.cwd(), "desktop", "src-tauri");
    const conf = JSON.parse(fs.readFileSync(path.join(srcTauri, "tauri.conf.json"), "utf8")) as {
      bundle: { windows?: { nsis?: { installerHooks?: string } } };
    };
    const hooks = conf.bundle.windows?.nsis?.installerHooks;
    expect(hooks, "bundle.windows.nsis.installerHooks").toBeTruthy();
    const nsh = fs.readFileSync(path.join(srcTauri, hooks as string), "utf8");
    expect(nsh).toMatch(/!macro NSIS_HOOK_POSTINSTALL[\s\S]*WebView2Loader\.dll[\s\S]*File "\$\{PURIFY_WV2_LOADER\}"[\s\S]*!macroend/);
    expect(nsh).toMatch(/!macro NSIS_HOOK_POSTUNINSTALL[\s\S]*Delete "\$INSTDIR\\WebView2Loader\.dll"[\s\S]*!macroend/);
  });
});
