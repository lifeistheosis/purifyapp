// The on-phone voice's section in Settings, as proposed (1.9): the app's own
// section, from the export, held to checkMock on all five palettes, and four
// stills for the owner (scale 2): before the download, waiting for Wi-Fi,
// downloading, and on the phone with the voices under it.
//
// The section is in no release. It is drawn only in an export made with the
// preview on, so this is run as:
//
//   NEXT_PUBLIC_PHONE_VOICE_PREVIEW=1 npm run build:android
//   node scripts/mock-phone-voice.mjs [folder]
//
// and the export is made again without it before anything else is built.
import fs from "node:fs";
import path from "node:path";

import { checkMock, openPhone, printMockCheck } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const dir = process.argv[2] ?? "phone-voice";
fs.mkdirSync(dir, { recursive: true });
const { browser, page } = await openPhone({ scale: 2 });
let ok = true;
try {
  for (const state of ["none", "wifi", "fetching", "ready"]) {
    await go(page, `/settings/?voice=${state}`);
    // The state is read from the address as the page opens: open it afresh.
    await page.reload({ waitUntil: "load" });
    const section = page.locator("section#voice");
    await section.waitFor({ timeout: 20000 });
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    ok = printMockCheck(await checkMock(page, "section#voice"), `the on-phone voice, ${state}`) && ok;
    const shot = path.join(dir, `phone-voice-${state}.png`);
    await section.screenshot({ path: shot });
    console.log(`Still: ${shot}`);
  }
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
