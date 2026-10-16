import type { ChantKind, ChantTradition } from "./types";

/**
 * The catalog keys a chant's words come from. Computed, so
 * lib/i18n/__tests__/keysExist.test.ts cannot see them: lib/chants/__tests__/
 * data.test.ts holds every chant's two lines, and every tradition's and
 * kind's name, to all twenty-one catalogs instead.
 */
export const chantTitleKey = (key: string) => `chants.item.${key}.title`;
export const chantLineKey = (key: string) => `chants.item.${key}.line`;
export const traditionKey = (tradition: ChantTradition) => `chants.tradition.${tradition}`;
export const kindKey = (kind: ChantKind) => `chants.kind.${kind}`;
