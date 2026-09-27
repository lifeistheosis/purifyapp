import { describe, expect, it } from "vitest";

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
});
