import { describe, expect, it } from "vitest";

import { storeForDevice } from "../mobileWeb";
import { NATIVE_UA_TOKEN } from "../token";

const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

describe("the mobile website", () => {
  it("sends Android to Google Play and iPhone to the App Store", () => {
    expect(storeForDevice(ANDROID_CHROME, 5)).toBe("googlePlay");
    expect(storeForDevice(IPHONE_SAFARI, 5)).toBe("appStore");
  });

  it("knows an iPad asking for the desktop site from a Mac", () => {
    expect(storeForDevice(IPAD_DESKTOP_MODE, 5)).toBe("appStore");
    expect(storeForDevice(IPAD_DESKTOP_MODE, 0)).toBeNull();
  });

  it("is nothing on a desktop browser", () => {
    expect(storeForDevice(WINDOWS_CHROME, 0)).toBeNull();
    expect(storeForDevice("", 0)).toBeNull();
  });

  it("is nothing inside the store apps, which already are the app", () => {
    expect(storeForDevice(`${ANDROID_CHROME} ${NATIVE_UA_TOKEN}`, 5)).toBeNull();
    expect(storeForDevice(`${IPHONE_SAFARI} ${NATIVE_UA_TOKEN}`, 5)).toBeNull();
  });
});
