/**
 * The takedown list as the website serves it: the committed list, less every
 * recording switched off from the admin (admin item A7, Edgar's yes of
 * 2026-11-09; the table is supabase/migrations/20261110002921_chant_pulls.sql).
 *
 * Every installed app asks /audio/chants/live.json which recordings may play
 * and fails closed (lib/chants/live.ts): a recording the list does not name
 * does not play, and a pulled one is taken off the phone. The list used to be
 * a file only, so a takedown waited on a change to the code and a push of the
 * website. The committed list (data/chants-live.json) is still the base; a
 * switch in the admin now moves a recording from live to pulled within
 * minutes (the list is kept five), at the same address, for the apps already
 * installed.
 *
 * Pure. Tested in lib/chants/__tests__/pulls.test.ts.
 */

export type LiveListFile = { v: 1; live: string[]; pulled: string[] };

/** "<slug>/<variant id>", as the list names a recording (lib/chants/media.ts, variantRef). */
export const REF = /^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The base list with these recordings taken down: out of `live`, into
 * `pulled`. A ref that is not a recording's shape is ignored, so a stray row
 * can never empty the list or add to it anything but a takedown.
 */
export function withPulls(base: LiveListFile, pulled: readonly string[]): LiveListFile {
  const down = new Set(pulled.filter((r) => REF.test(r)));
  if (down.size === 0) return { v: 1, live: [...base.live], pulled: [...base.pulled] };
  return {
    v: 1,
    live: base.live.filter((r) => !down.has(r)),
    pulled: [...new Set([...base.pulled, ...down])],
  };
}
