import type { Loaders } from "@/components/i18n/useInReadersLanguage";

import type { SaintWords } from "./SaintInReadersLanguage";

/**
 * Each saint's life written in another language, by the saint (1.9, the
 * reader's language in the apps: 55 lives in German). Its own file,
 * data/saints/<saint>/i18n/<lang>.json, named here only inside import(), so
 * each is a chunk of its own that the device loads when the reader's language
 * is one of them and the page never carries (components/i18n/
 * useInReadersLanguage.ts; the councils' documents and the lessons load the
 * same way). The chunks sit inside the bundle's _next, where the export's
 * guard against the translated corpus lets them be (scripts/native-build.mjs).
 *
 * A life given a new language needs its line here:
 * lib/i18n/__tests__/readersLanguagePages.test.ts holds every file to its
 * loader and every loader to its file.
 */
export const LIFE_LOADERS: Record<string, Loaders<SaintWords>> = {
  "alexander-of-alexandria": { de: () => import("@/data/saints/alexander-of-alexandria/i18n/de.json").then((m) => m.default as SaintWords) },
  "anianus-of-alexandria": { de: () => import("@/data/saints/anianus-of-alexandria/i18n/de.json").then((m) => m.default as SaintWords) },
  "anthony-the-great": { de: () => import("@/data/saints/anthony-the-great/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-andrew": { de: () => import("@/data/saints/apostle-andrew/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-bartholomew": { de: () => import("@/data/saints/apostle-bartholomew/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-james-alphaeus": { de: () => import("@/data/saints/apostle-james-alphaeus/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-james-zebedee": { de: () => import("@/data/saints/apostle-james-zebedee/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-john": { de: () => import("@/data/saints/apostle-john/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-jude": { de: () => import("@/data/saints/apostle-jude/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-matthew": { de: () => import("@/data/saints/apostle-matthew/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-matthias": { de: () => import("@/data/saints/apostle-matthias/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-paul": { de: () => import("@/data/saints/apostle-paul/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-peter": { de: () => import("@/data/saints/apostle-peter/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-philip": { de: () => import("@/data/saints/apostle-philip/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-simon-zealot": { de: () => import("@/data/saints/apostle-simon-zealot/i18n/de.json").then((m) => m.default as SaintWords) },
  "apostle-thomas": { de: () => import("@/data/saints/apostle-thomas/i18n/de.json").then((m) => m.default as SaintWords) },
  "archangel-michael": { de: () => import("@/data/saints/archangel-michael/i18n/de.json").then((m) => m.default as SaintWords) },
  "athanasius-the-great": { de: () => import("@/data/saints/athanasius-the-great/i18n/de.json").then((m) => m.default as SaintWords) },
  "augustine-of-hippo": { de: () => import("@/data/saints/augustine-of-hippo/i18n/de.json").then((m) => m.default as SaintWords) },
  "basil-the-great": { de: () => import("@/data/saints/basil-the-great/i18n/de.json").then((m) => m.default as SaintWords) },
  "constantine-the-great": { de: () => import("@/data/saints/constantine-the-great/i18n/de.json").then((m) => m.default as SaintWords) },
  "cyril-of-alexandria": { de: () => import("@/data/saints/cyril-of-alexandria/i18n/de.json").then((m) => m.default as SaintWords) },
  "cyril-of-jerusalem": { de: () => import("@/data/saints/cyril-of-jerusalem/i18n/de.json").then((m) => m.default as SaintWords) },
  "ephraim-the-syrian": { de: () => import("@/data/saints/ephraim-the-syrian/i18n/de.json").then((m) => m.default as SaintWords) },
  "epiphanius-of-salamis": { de: () => import("@/data/saints/epiphanius-of-salamis/i18n/de.json").then((m) => m.default as SaintWords) },
  "eustathius-of-antioch": { de: () => import("@/data/saints/eustathius-of-antioch/i18n/de.json").then((m) => m.default as SaintWords) },
  "florian-of-lorch": { de: () => import("@/data/saints/florian-of-lorch/i18n/de.json").then((m) => m.default as SaintWords) },
  "gregory-of-nyssa": { de: () => import("@/data/saints/gregory-of-nyssa/i18n/de.json").then((m) => m.default as SaintWords) },
  "gregory-palamas": { de: () => import("@/data/saints/gregory-palamas/i18n/de.json").then((m) => m.default as SaintWords) },
  "gregory-theologian": { de: () => import("@/data/saints/gregory-theologian/i18n/de.json").then((m) => m.default as SaintWords) },
  "hermione-of-ephesus": { de: () => import("@/data/saints/hermione-of-ephesus/i18n/de.json").then((m) => m.default as SaintWords) },
  "hosius-of-cordova": { de: () => import("@/data/saints/hosius-of-cordova/i18n/de.json").then((m) => m.default as SaintWords) },
  "ignatius-of-antioch": { de: () => import("@/data/saints/ignatius-of-antioch/i18n/de.json").then((m) => m.default as SaintWords) },
  "irenaeus-of-lyons": { de: () => import("@/data/saints/irenaeus-of-lyons/i18n/de.json").then((m) => m.default as SaintWords) },
  "isidora-of-tabenna": { de: () => import("@/data/saints/isidora-of-tabenna/i18n/de.json").then((m) => m.default as SaintWords) },
  "john-chrysostom": { de: () => import("@/data/saints/john-chrysostom/i18n/de.json").then((m) => m.default as SaintWords) },
  "john-of-damascus": { de: () => import("@/data/saints/john-of-damascus/i18n/de.json").then((m) => m.default as SaintWords) },
  "marina-the-great-martyr": { de: () => import("@/data/saints/marina-the-great-martyr/i18n/de.json").then((m) => m.default as SaintWords) },
  "mary-magdalene": { de: () => import("@/data/saints/mary-magdalene/i18n/de.json").then((m) => m.default as SaintWords) },
  "mary-of-egypt": { de: () => import("@/data/saints/mary-of-egypt/i18n/de.json").then((m) => m.default as SaintWords) },
  "maximus-the-confessor": { de: () => import("@/data/saints/maximus-the-confessor/i18n/de.json").then((m) => m.default as SaintWords) },
  "meletius-of-antioch": { de: () => import("@/data/saints/meletius-of-antioch/i18n/de.json").then((m) => m.default as SaintWords) },
  "nectarius-of-constantinople": { de: () => import("@/data/saints/nectarius-of-constantinople/i18n/de.json").then((m) => m.default as SaintWords) },
  "nektarios-of-aegina": { de: () => import("@/data/saints/nektarios-of-aegina/i18n/de.json").then((m) => m.default as SaintWords) },
  "nicholas-the-wonderworker": { de: () => import("@/data/saints/nicholas-the-wonderworker/i18n/de.json").then((m) => m.default as SaintWords) },
  "olympias-the-deaconess": { de: () => import("@/data/saints/olympias-the-deaconess/i18n/de.json").then((m) => m.default as SaintWords) },
  "paisios-the-athonite": { de: () => import("@/data/saints/paisios-the-athonite/i18n/de.json").then((m) => m.default as SaintWords) },
  "papias-of-hierapolis": { de: () => import("@/data/saints/papias-of-hierapolis/i18n/de.json").then((m) => m.default as SaintWords) },
  "polycarp-of-smyrna": { de: () => import("@/data/saints/polycarp-of-smyrna/i18n/de.json").then((m) => m.default as SaintWords) },
  "prochorus-the-deacon": { de: () => import("@/data/saints/prochorus-the-deacon/i18n/de.json").then((m) => m.default as SaintWords) },
  "seraphim-of-sarov": { de: () => import("@/data/saints/seraphim-of-sarov/i18n/de.json").then((m) => m.default as SaintWords) },
  "spyridon-of-trimythous": { de: () => import("@/data/saints/spyridon-of-trimythous/i18n/de.json").then((m) => m.default as SaintWords) },
  "symeon-the-new-theologian": { de: () => import("@/data/saints/symeon-the-new-theologian/i18n/de.json").then((m) => m.default as SaintWords) },
  "theodosius-the-great": { de: () => import("@/data/saints/theodosius-the-great/i18n/de.json").then((m) => m.default as SaintWords) },
  "theotokos": { de: () => import("@/data/saints/theotokos/i18n/de.json").then((m) => m.default as SaintWords) },
};
