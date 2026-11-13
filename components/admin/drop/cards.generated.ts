// Written by `node scripts/drop.mjs cards <folder>`. Do not edit: run it again.
//
// Small copies of each release's card stills, for the Drop tab. Imported, and
// not placed under public/, so they ride in the admin page's own bundle and
// never in the apps: scripts/native-build.mjs leaves the admin tree out.

import type { StaticImageData } from "next/image";

import c1_5_01_cover from "@/docs/plans/v1.5/cards/01-cover.webp";
import c1_5_02_whats_new from "@/docs/plans/v1.5/cards/02-whats-new.webp";
import c1_5_03_greek from "@/docs/plans/v1.5/cards/03-greek.webp";
import c1_5_04_job from "@/docs/plans/v1.5/cards/04-job.webp";
import c1_5_05_community from "@/docs/plans/v1.5/cards/05-community.webp";
import c1_5_06_shop from "@/docs/plans/v1.5/cards/06-shop.webp";
import c1_5_07_phone from "@/docs/plans/v1.5/cards/07-phone.webp";
import c1_5_08_close_app_store from "@/docs/plans/v1.5/cards/08-close-app-store.webp";
import c1_5_08_close_google_play from "@/docs/plans/v1.5/cards/08-close-google-play.webp";
import c1_9_01_cover from "@/docs/plans/v1.9/cards/01-cover.webp";
import c1_9_02_journal from "@/docs/plans/v1.9/cards/02-journal.webp";
import c1_9_03_verse from "@/docs/plans/v1.9/cards/03-verse.webp";
import c1_9_04_bibles from "@/docs/plans/v1.9/cards/04-bibles.webp";
import c1_9_05_study from "@/docs/plans/v1.9/cards/05-study.webp";
import c1_9_06_close from "@/docs/plans/v1.9/cards/06-close.webp";

export type DropCard = { file: string; label: string; src: StaticImageData };

export const DROP_CARDS: Readonly<Record<string, DropCard[]>> = {
  "1.5": [
    { file: "01-cover", label: "Cover", src: c1_5_01_cover },
    { file: "02-whats-new", label: "Whats new", src: c1_5_02_whats_new },
    { file: "03-greek", label: "Greek", src: c1_5_03_greek },
    { file: "04-job", label: "Job", src: c1_5_04_job },
    { file: "05-community", label: "Community", src: c1_5_05_community },
    { file: "06-shop", label: "Shop", src: c1_5_06_shop },
    { file: "07-phone", label: "Phone", src: c1_5_07_phone },
    { file: "08-close-app-store", label: "Close app store", src: c1_5_08_close_app_store },
    { file: "08-close-google-play", label: "Close google play", src: c1_5_08_close_google_play },
  ],
  "1.9": [
    { file: "01-cover", label: "Cover", src: c1_9_01_cover },
    { file: "02-journal", label: "Journal", src: c1_9_02_journal },
    { file: "03-verse", label: "Verse", src: c1_9_03_verse },
    { file: "04-bibles", label: "Bibles", src: c1_9_04_bibles },
    { file: "05-study", label: "Study", src: c1_9_05_study },
    { file: "06-close", label: "Close", src: c1_9_06_close },
  ],
};
