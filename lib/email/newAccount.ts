/**
 * Is this sign-in a new account, for the welcome email?
 *
 * The welcome is sent from the auth callback, which runs on EVERY sign-in, not
 * just the first. Keyed welcome:<user> alone it would still go once per
 * person, but "once" would mean the first time each existing reader signs in
 * after this ships: a "Welcome to Purify" to someone who has used it since
 * May. So the account must also be young.
 *
 * Seven days, not minutes, because a sign-up confirmation link can sit in an
 * inbox for a day or two before it is clicked, and the account's created_at is
 * when they signed up, not when they confirmed.
 */

export const WELCOME_WINDOW_MS = 7 * 86_400_000;

export function isNewAccount(createdAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  const age = now.getTime() - created;
  // A small negative age is clock skew between Supabase and this server.
  return age > -60_000 && age < WELCOME_WINDOW_MS;
}
