import type { Struggle } from "./struggles";

/** Each struggle's heading and the line under it, by key (lib/i18n/messages). */
export const STRUGGLE_TITLE: Readonly<Record<Struggle, string>> = {
  anxiety: "struggles.anxiety.title",
  anger: "struggles.anger.title",
  grief: "struggles.grief.title",
  temptation: "struggles.temptation.title",
  loneliness: "struggles.loneliness.title",
  despondency: "struggles.despondency.title",
  pride: "struggles.pride.title",
  forgiveness: "struggles.forgiveness.title",
};

export const STRUGGLE_BLURB: Readonly<Record<Struggle, string>> = {
  anxiety: "struggles.anxiety.blurb",
  anger: "struggles.anger.blurb",
  grief: "struggles.grief.blurb",
  temptation: "struggles.temptation.blurb",
  loneliness: "struggles.loneliness.blurb",
  despondency: "struggles.despondency.blurb",
  pride: "struggles.pride.blurb",
  forgiveness: "struggles.forgiveness.blurb",
};
