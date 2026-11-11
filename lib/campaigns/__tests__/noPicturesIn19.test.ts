// Prayer campaigns launch in 1.9 without pictures.
//
// His word, 2026-11-11 at about 14:43 UTC: "So this is the plan. We're gonna
// fully launch campaign in version 1.9. In version 1.9.1, we'll include those
// extra legal additions." So campaigns open to every reader in 1.9 with no
// picture anywhere, and pictures come in 1.9.1 with what they wait for
// (docs/1.9-build/OWNER-STEPS.md: P1 the automatic check's key, P2 NCMEC,
// P4 PhotoDNA, P5 the first real picture). A planned feature of 1.9.1, by
// his word, and not a fault of 1.9.
//
// What a reader would notice if this broke: a way to add a picture in 1.9; a
// store build with the pictures' controls asleep in it; or a line that
// speaks of a picture no 1.9 campaign can have. A creator taking a campaign
// down was told "The picture is deleted with it" until that day.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PICTURES_IN_STORE_BUILDS } from "@/lib/campaigns/flags";
import { CAMPAIGN_PARTS } from "@/lib/campaigns/parts";
import en from "@/lib/i18n/messages/en.json";
import { CAMPAIGNS_FREE_KEY, FREE_KEYS } from "@/lib/premium/planWords";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const words = en as Record<string, string>;
const PICTURE = /picture|photo|image/i;

describe("pictures are off everywhere in 1.9", () => {
  it("both switches are off for as long as the app's version is 1.9: the server's, and the store builds' own", () => {
    // 1.9.1 turns them on by his word, with its own steps and its own test; until the version says so, they are off.
    const in19 = CURRENT_VERSION === "1.9";
    expect(in19 ? CAMPAIGN_PARTS.pictures : false).toBe(false);
    expect(in19 ? PICTURES_IN_STORE_BUILDS : false).toBe(false);
  });

  it("off is off on the server: each of the pictures' routes answers 404 before it reads anything, and no picture can be reported", () => {
    const route = read("app/api/campaigns/[id]/pictures/route.ts");
    expect(route.match(/if \(!campaignPart\("pictures"\)\) return NOT_FOUND\(\);/g)).toHaveLength(3);
    expect(read("app/api/campaigns/[id]/report/route.ts")).toContain('if (picture && !campaignPart("pictures"))');
  });

  it("the screens draw nothing of pictures, and ask for none, unless the server says the part is on", () => {
    const page = read("components/campaigns/CampaignPage.tsx");
    expect(page).toContain('const picturesOn = useCampaignPart("pictures") && campaign.days !== null;');
    expect(page).toContain("useCampaignPictures(campaign.id, picturesOn);");
    expect(page).toContain("{picturesOn ? <CampaignPictures");
    // The rule about pictures stands among the rules only while pictures are on.
    const rules = read("components/campaigns/CampaignRules.tsx");
    expect(rules).toContain('const pictures = useCampaignPart("pictures");');
    expect(rules).toMatch(/pictures \? \[\.\.\.RULES\.slice\(0, PICTURES_RULE_AFTER\), PICTURES_RULE, /);
  });
});

describe("no line a reader is shown in 1.9 speaks of a campaign's picture", () => {
  // The pictures' own lines: drawn only by the pictures' part, its sheet, its report and its rule,
  // each of which stands only while the server says pictures are on; and July's take-down line,
  // kept for a campaign that has a picture.
  const OWN = [/^campaigns\.pictures?[A-Z]?/, /^campaigns\.err\.picture/, /^campaigns\.report\.picture/, /^campaigns\.rules\.pictures$/, /^campaigns\.takeDownConfirm$/];

  it("every campaign line that names a picture is one of the pictures' own", () => {
    const naming = Object.keys(words).filter((k) => k.startsWith("campaigns.") && PICTURE.test(words[k]));
    const stray = naming.filter((k) => !OWN.some((own) => own.test(k)));
    expect(stray).toEqual([]);
    // And the pictures' own lines are in the pictures' own files: no other campaign screen says one.
    for (const file of readdirSync(join(process.cwd(), "components/campaigns")).filter((f) => f.endsWith(".tsx"))) {
      if (["CampaignPictures.tsx", "CampaignRules.tsx", "CampaignReportSheet.tsx", "CampaignModeration.tsx", "CampaignPage.tsx"].includes(file)) continue;
      const source = read(`components/campaigns/${file}`);
      for (const key of naming) expect(source, `${file} says ${key}`).not.toContain(`"${key}"`);
    }
  });

  // Before 2026-11-11 July's line was said to every creator: "The picture is deleted with it".
  it("taking a campaign down: with no picture, its creator is asked in words that name none", () => {
    const page = read("components/campaigns/CampaignPage.tsx");
    expect(page).toContain('description={hasPictures ? t("campaigns.takeDownConfirm") : t("campaigns.takeDownConfirmPlain")}');
    expect(page).toContain('const hasPictures = pictures?.state === "ok" && pictures.pictures.pictures.length > 0;');
    // July's line is said nowhere else.
    expect(page.match(/"campaigns\.takeDownConfirm"/g)).toHaveLength(1);
    expect(words["campaigns.takeDownConfirmPlain"]).toBe("Take this campaign down for good? The people praying will no longer see it. This cannot be undone.");
    expect(words["campaigns.takeDownConfirmPlain"]).not.toMatch(PICTURE);
    expect(words["campaigns.takeDownConfirm"]).toMatch(PICTURE);
  });

  it("the plain line is in every language the app has: July's own sentence, without its picture", () => {
    const dir = join(process.cwd(), "lib/i18n/messages");
    const catalogs = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(catalogs).toHaveLength(21);
    for (const file of catalogs) {
      const m = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, string>;
      const plain = m["campaigns.takeDownConfirmPlain"];
      const july = m["campaigns.takeDownConfirm"];
      expect(plain, file).toBeTruthy();
      expect(plain.length, file).toBeLessThan(july.length);
      // It opens and closes as July's does: the question, and that it cannot be undone.
      const sentences = (s: string) => s.split(/(?<=[.?؟۔।;])\s+/);
      expect(sentences(plain)[0], file).toBe(sentences(july)[0]);
      expect(sentences(plain).at(-1), file).toBe(sentences(july).at(-1));
      if (file !== "en.json") expect(plain, file).not.toBe(words["campaigns.takeDownConfirmPlain"]);
    }
  });
});

describe("the free plan's line and the Discover row read true with campaigns open and no pictures", () => {
  it("each names prayer campaigns and nothing else, and stands only where campaigns are open to every reader", () => {
    expect(words[CAMPAIGNS_FREE_KEY]).toBe("Prayer Campaigns, prayed together");
    expect(words["nav.discoverMenu.campaigns"]).toBe("Prayer Campaigns");
    expect((FREE_KEYS as readonly string[]).includes(CAMPAIGNS_FREE_KEY)).toBe(true);
    expect(read("lib/premium/planWords.ts")).toContain("return FREE_KEYS.filter((k) => k !== CAMPAIGNS_FREE_KEY || campaignsEnabled());");
    expect(read("components/nav/DiscoverDropdown.tsx")).toContain('...(campaignsEnabled() ? [{ key: "campaigns", href: "/campaigns" }] : []),');
    const plans = read("lib/premium/plans.ts");
    expect(plans).toContain('en: "Prayer Campaigns, prayed together",');
    expect(plans).toContain('de: "Gebetskampagnen, gemeinsam gebetet",');
  });
});

describe("his steps say the same", () => {
  const steps = read("docs/1.9-build/OWNER-STEPS.md");
  const pictures = steps.slice(steps.indexOf("### Pictures. For 1.9.1"), steps.indexOf("### 23. "));

  it("the pictures' steps are for 1.9.1, the copyright agent is for now, and nothing in 1.9 waits on the rest", () => {
    expect(pictures).toContain("fully launch campaign in version 1.9. In version 1.9.1, we'll include those\nextra legal additions.");
    expect(pictures.replace(/\s+/g, " ")).toContain("**Nothing in 1.9 waits on P1, P2, P4 or P5.**");
    for (const step of ["P1", "P2", "P4", "P5"]) expect(pictures, step).toContain(`**${step} (for 1.9.1). `);
    expect(pictures).toContain("**P3 (now, when the arbiter says). The Copyright Office");
    expect(pictures).not.toMatch(/\*\*P[1245]\. /);
  });
});
