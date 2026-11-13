/**
 * Where a life of ours is read from, paragraph by paragraph (1.9, St. Xenia's
 * profile, the owner's word of 2026-11-13: "a full on refining on saint Xenia
 * of Petersburg's profile"; docs/1.9-build/BRAINSTORM.md).
 *
 * An older saint's page carries a life in our own words, marked for the
 * clergy review (lib/saints/month.ts). Where such a life is rewritten from
 * named sources, each of its English paragraphs names here the books its facts
 * are read from, and the page lists those books under the life
 * (components/saints/SaintLife.tsx), in the order the life first leans on
 * them. A quotation inside the life is still held by lib/saints/lifeQuotes.ts,
 * and only a public-domain text may stand behind one: the other books are
 * read for facts, told in our words, never copied.
 *
 * `at` is where each was read, for the review; it is never shown or fetched.
 * Held by lib/saints/__tests__/xeniaLife.test.ts.
 *
 * No imports: the saint's page reads it cheaply, as it reads lifeQuotes.ts.
 */

export type LifeSourceBook = {
  /** As the line under the life names it. */
  name: string;
  /** Public domain, so its own words may be quoted (lib/saints/lifeQuotes.ts). */
  publicDomain: boolean;
  /** Where it was read, for the review. Never shown, never fetched. */
  at: string;
};

export const LIFE_SOURCE_BOOKS = {
  // The oldest Life of her we found in print, drawn from the city police
  // gazette's accounts of 1847 and the memories of an old woman whose aunt had
  // known her; it copies the words on her gravestone (her 26, 45 and 71 years).
  bulgakovsky: {
    name: "D. G. Bulgakovsky, The Servant of God Xenia, or Andrei Feodorovich the Holy Fool (St. Petersburg, 1890; 2nd edition 1891), in Russian",
    publicDomain: true,
    at: "https://azbyka.ru/otechnik/Dmitrij-Bulgakovskij/raba-bozhija-ksenija-ili-yurodivyj-andrej-fedorovich/",
  },
  // The oldest account of her we found: a history of the cemetery, pages 194
  // and 195, read on the page images.
  opatovich: {
    name: "S. I. Opatovich, The Smolensk Cemetery in St. Petersburg, Russkaya Starina VIII (1873), in Russian",
    publicDomain: true,
    at: "https://archive.org/details/russkajastarinag41873t8kn8avgust46/page/n75",
  },
  // "The year of her death is also unknown, but she probably died before 1777."
  sambikin: {
    name: "Archbishop Dimitry (Sambikin), Menologion of the Saints, January (Kamenets-Podolsk, 1896), in Russian",
    publicDomain: true,
    at: "https://azbyka.ru/otechnik/Dimitrij_Sambikin/mesjatseslov-janvar/#0_110",
  },
  // Page 510: born about 1732, died about 1803, widowed about 1758.
  rbs: {
    name: "Russian Biographical Dictionary, volume Knappe to Kuechelbecker (St. Petersburg, 1903), in Russian",
    publicDomain: true,
    at: "https://archive.org/details/russkijbiograficheskijslovart9knap39/page/510",
  },
  azbyka: {
    name: "Azbyka.ru, Blessed Xenia of Petersburg, the Life for January 24, in Russian",
    publicDomain: false,
    at: "https://azbyka.ru/days/sv-ksenija-peterburgskaja",
  },
  oca: {
    name: "The Orthodox Church in America, Lives of the Saints, Blessed Xenia of St. Petersburg, January 24",
    publicDomain: false,
    at: "https://www.oca.org/saints/lives/2021/01/24/100297-blessed-xenia-of-st-petersburg",
  },
  htc: {
    name: "Holy Trinity Church, Lives of the Saints, St. Xenia of Petersburg, January 24",
    publicDomain: false,
    at: "https://www.holytrinityorthodox.com/iconoftheday/los/January/24-10.htm",
  },
  mileant: {
    name: "Bishop Alexander (Mileant), Blessed Xenia of St. Petersburg (Holy Protection Russian Orthodox Church, Los Angeles, 2000)",
    publicDomain: false,
    at: "https://fatheralexander.org/booklets/english/saints/xenia_petersburg.htm (the same English: https://orthochristian.com/44559.html)",
  },
  acrod: {
    name: "The American Carpatho-Russian Orthodox Diocese, St. Xenia of St. Petersburg, Russia",
    publicDomain: false,
    at: "https://www.acrod.org/orthodox-christianity/articles/saints/st-xenia-petersburg",
  },
  mayer: {
    name: "Olga Mayer, The Mind Can't Explain Foolishness for Christ (OrthoChristian.com)",
    publicDomain: false,
    at: "https://orthochristian.com/150722.html",
  },
  // The history her foretellings stand in: the Empress Elizabeth's death on
  // January 5, 1762 (the new calendar), and Ivan VI's life and death.
  eb1911: {
    name: "Encyclopaedia Britannica, 11th edition (1911), Elizabeth Petrovna and Ivan VI",
    publicDomain: true,
    at: "https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Elizabeth_Petrovna and https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Ivan",
  },
} as const satisfies Record<string, LifeSourceBook>;

export type LifeSourceKey = keyof typeof LIFE_SOURCE_BOOKS;

/** For each saint whose life is listed: the sources of each English paragraph, in order. */
export const LIFE_SOURCES: Readonly<Record<string, readonly (readonly LifeSourceKey[])[]>> = {
  "xenia-of-petersburg": [
    // Her time, her father's name, the years of her birth, her husband.
    ["opatovich", "bulgakovsky", "rbs", "azbyka", "htc", "oca", "acrod"],
    // His sudden death, unprepared, and her grief.
    ["oca", "htc", "opatovich", "bulgakovsky"],
    // Her goods to the poor, her house to Paraskeva Antonova, her relatives' petition.
    ["azbyka", "oca", "mileant", "acrod"],
    // His clothes and his name; taken for mad.
    ["azbyka", "bulgakovsky", "opatovich", "htc", "oca"],
    // The eight years away, and St. Theodore of Sanaxar.
    ["htc", "oca"],
    // Homeless on the Petersburg Side, mocked, and her one anger.
    ["azbyka", "bulgakovsky", "opatovich", "htc", "oca"],
    // The red and the green, the frost, the tsar on horseback.
    ["bulgakovsky", "azbyka", "oca", "mileant"],
    // Her nights in the field.
    ["azbyka", "bulgakovsky", "htc", "oca"],
    // The bricks of the Smolensk church.
    ["bulgakovsky", "azbyka", "oca", "mileant", "acrod"],
    // Mothers, the sick, the traders and the cab drivers.
    ["bulgakovsky", "opatovich", "azbyka", "htc", "oca", "mileant"],
    // The blini, and the two calendars.
    ["bulgakovsky", "opatovich", "sambikin", "mileant", "acrod", "eb1911"],
    // Ivan VI, and "Blood, blood, blood!".
    ["bulgakovsky", "mileant", "acrod", "eb1911"],
    // Okhta, the nettle, and Paraskeva's son.
    ["bulgakovsky", "azbyka", "mileant"],
    // Her repose, her grave, and the words on its stone.
    ["bulgakovsky", "opatovich", "sambikin", "rbs", "oca", "htc", "azbyka", "acrod", "mileant"],
    // The earth of the grave, the chapels, the closed years and the notes.
    ["opatovich", "oca", "htc", "bulgakovsky", "azbyka", "mayer", "acrod"],
    // Her help after death.
    ["bulgakovsky", "mileant", "htc", "oca"],
    // Her glorification and her day.
    ["htc", "azbyka", "acrod"],
  ],
};

/** The books a saint's life is read from, named in the order the life first leans on them: the line under it. Empty for a life not listed. */
export function lifeSourcesOf(slug: string): string[] {
  const rows = LIFE_SOURCES[slug];
  if (!rows) return [];
  return [...new Set(rows.flat())].map((k) => LIFE_SOURCE_BOOKS[k].name);
}
