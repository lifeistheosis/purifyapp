// Photos of the house recipes, bundled with the app under public/kitchen-photos.
//
// Chosen 2026-09-28 at the owner's request ("source the images of the meals
// online, high quality"). Every one is from Wikimedia Commons under CC0,
// CC BY or CC BY-SA, its licence and author read from Commons itself rather
// than a search index, and each file was opened and checked before it went
// in: the right dish, nothing that breaks the fast it is shown for, no people
// and no writing. The files are the originals resized to a 1600px long edge
// with their EXIF removed, and nothing more; the page frames them with
// object-fit, so no photo is cropped or otherwise changed.
//
// The credit shows under the photo on the recipe page, with the photo's name
// linking to its Commons page and the licence to its deed, which is the
// attribution these licences ask for.
//
// A photo set from the admin console (trapeza_recipes.photo_url) always wins:
// these fill in only where a house recipe has none. Bundled rather than
// uploaded, so they need no database write and open offline in the apps,
// which ship public/ inside their local bundle.

import type { TrapezaRecipe } from "./recipes";

export type HousePhoto = {
  /** Path under public/. */
  src: string;
  /** The work's name on Commons. */
  title: string;
  author: string;
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  license: string;
  licenseUrl: string;
  /** The file's page on Commons, where its licence is recorded. */
  sourceUrl: string;
  /** object-position for the 4:3 frame, when the centre is not the dish. */
  focus?: string;
};

const BY_SA_4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };

/** Keyed by trapeza_recipes.id. The first three ids are the 20260713 seeds as they exist in production. */
export const HOUSE_PHOTOS: Record<string, HousePhoto> = {
  // Lenten Lentil Soup
  "a04665fa-2de5-4ebf-8172-3a5f71ab1f13": {
    src: "/kitchen-photos/lentil-soup.jpg",
    title: "Fakes soupa",
    author: "Dianeira",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Fakes_soupa.jpg",
  },
  // Xerophagy Chickpea and Herb Salad
  "1fb472fe-e995-496e-bb34-706cc173624e": {
    src: "/kitchen-photos/chickpea-salad.jpg",
    title: "Веган салата",
    author: "Lili Arsova",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%D0%92%D0%B5%D0%B3%D0%B0%D0%BD_%D1%81%D0%B0%D0%BB%D0%B0%D1%82%D0%B0.jpg",
  },
  // Baked Fish with Lemon and Herbs
  "72966950-61d7-484e-b9b7-077ceafc8267": {
    src: "/kitchen-photos/baked-fish.jpg",
    title: "Oven Baked Sea Bass, Trimingham",
    author: "Kolforn",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:-2015-10-04_Oven_Baked_Sea_Bass,_Trimingham.JPG",
  },
  // Kutia for Nativity Eve
  "33b5d839-48b1-4d27-aaef-a47f3897ce2e": {
    src: "/kitchen-photos/kutia.jpg",
    title: "Kutia in traditional ukrainian bowl 2023",
    author: "Віщун",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kutia_in_traditional_ukrainian_bowl_2023.jpg",
  },
  // Uzvar, Dried Fruit Compote
  "2ac7d34a-c893-4dd0-98d0-979f3f07634b": {
    src: "/kitchen-photos/uzvar.jpg",
    title: "Узвар",
    author: "Микола Василечко",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%D0%A3%D0%B7%D0%B2%D0%B0%D1%80_-_20250328_123815.jpg",
    focus: "50% 64%",
  },
  // Boiled Greens with Lemon
  "829faeb2-657a-4e0c-acff-16ce1f745dfe": {
    src: "/kitchen-photos/horta.jpg",
    title: "Vrasta horta",
    author: "Sotiria Simota",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Vrasta_horta.jpg",
  },
  // Fasolada, White Bean Soup
  "7ca67583-82f5-4903-aca8-9cad0eed45ed": {
    src: "/kitchen-photos/fasolada.jpg",
    title: "FASOLADA",
    author: "EUGASTRONOMES",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:FASOLADA.jpg",
    focus: "62% 40%",
  },
  // Mujaddara, Lentils and Rice with Onions
  "39323e50-ec05-4814-bd15-7f43770a257c": {
    src: "/kitchen-photos/mujaddara.jpg",
    title: "Mujaddara Safra with red lentils",
    author: "白と赤茶",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Mujaddara_Safra_with_red_lentils.jpg",
  },
  // Vinegret, Beetroot Salad
  "a03a5de0-ad51-4780-bec9-8264228c07ce": {
    src: "/kitchen-photos/vinegret.jpg",
    title: "Vinegret",
    author: "Loyna, edited by Off-shell",
    license: "CC BY-SA 2.5",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.5/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Vinegret_cleaned.jpg",
  },
  // Prebranac, Baked Beans with Onions
  "35c7fa8d-a290-4548-baef-2404a9dbdf1a": {
    src: "/kitchen-photos/prebranac.jpg",
    title: "Zapečen pasulj prebranac na slavsku trpezu u Srbiji",
    author: "Ljiljana Krupanj",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Zape%C4%8Den_pasulj_prebranac_na_slavsku_trpezu_u_Srbiji.jpg",
    focus: "50% 40%",
  },
  // Briam, Roasted Summer Vegetables
  "c2d40815-20c0-4d08-bb13-454951508fcc": {
    src: "/kitchen-photos/briam.jpg",
    title: "Briam",
    author: "Dianeira",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Briam.jpg",
    focus: "50% 45%",
  },
  // Stuffed Vine Leaves
  "e661bfa4-2a24-4f0f-b884-56c46da5c704": {
    src: "/kitchen-photos/dolmades.jpg",
    title: "Dolmadakia a un restaurant grec, la Xerea, València",
    author: "Joanbanjo",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Dolmadakia_a_un_restaurant_grec,_la_Xerea,_Val%C3%A8ncia.jpg",
  },
  // Salt Cod with Garlic Potato Sauce
  "244dd1cb-1ca7-4453-9273-02dd3b23a4d7": {
    src: "/kitchen-photos/skordalia.jpg",
    title: "Μπακαλιάρος - Σκορδαλιά",
    author: "Klearchos Kapoutsis",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:%CE%9C%CF%80%CE%B1%CE%BA%CE%B1%CE%BB%CE%B9%CE%AC%CF%81%CE%BF%CF%82_-_%CE%A3%CE%BA%CE%BF%CF%81%CE%B4%CE%B1%CE%BB%CE%B9%CE%AC_(4463505646).jpg",
  },
  // Ukha, Clear Fish Soup
  "6a797083-bc77-431f-bcfb-6efb8953e78f": {
    src: "/kitchen-photos/ukha.jpg",
    title: "Уха",
    author: "Pannet",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%D0%A3%D1%85%D0%B0.jpg",
  },
  // Bliny for Cheesefare Week
  "30a535d5-6b89-4d66-bf16-503bbb545797": {
    src: "/kitchen-photos/bliny.jpg",
    title: "Масленичные блины",
    author: "Ростислав Александрович Луценко",
    ...BY_SA_4,
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:%D0%9C%D0%B0%D1%81%D0%BB%D0%B5%D0%BD%D0%B8%D1%87%D0%BD%D1%8B%D0%B5_%D0%B1%D0%BB%D0%B8%D0%BD%D1%8B_01.jpg",
  },
  // Red Eggs for Pascha
  "c8fef50b-c6e4-4c5a-89a4-bd856f2a848e": {
    src: "/kitchen-photos/red-eggs.jpg",
    title: "Easter eggs dyed with onion skins",
    author: "Մարի Ավետիսյան",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Easter_eggs_dyed_with_onion_skins.jpg",
  },
  // Paschal Roast Lamb with Lemon
  "aa0e358a-c9bd-429c-8105-e262b9fc4ae9": {
    src: "/kitchen-photos/roast-lamb.jpg",
    title: "Agnello arrosto con patate, verdure e aromi",
    author: "Roger469",
    ...BY_SA_4,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Agnello_arrosto.03.con_patate,verdure_e_aromi_cotto.jpg",
  },
};

/** The short credit line stored alongside a photo: "Author, Licence". */
export function housePhotoCredit(p: HousePhoto): string {
  return `${p.author}, ${p.license}`;
}

/**
 * A recipe with its house photo filled in, when it has one and no photo of
 * its own. Only curated recipes (author_id null) take one, so a member's
 * recipe can never pick up a house photo by a colliding id.
 */
export function withHousePhoto<T extends TrapezaRecipe>(recipe: T): T {
  if (recipe.photo_url || recipe.author_id) return recipe;
  const p = HOUSE_PHOTOS[recipe.id];
  if (!p) return recipe;
  return {
    ...recipe,
    photo_url: p.src,
    photo_credit: housePhotoCredit(p),
    photo_title: p.title,
    photo_source_url: p.sourceUrl,
    photo_license_url: p.licenseUrl,
    photo_focus: p.focus ?? null,
  };
}
