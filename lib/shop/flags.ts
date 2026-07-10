/**
 * Shop feature flags. The marketplace ships dark: until
 * NEXT_PUBLIC_SHOP_ENABLED is set, /shop routes 404 and no entry points
 * render anywhere in the app. The flag is public (baked into the client
 * bundle) because it only governs visibility, never authorization —
 * every privileged operation is enforced server-side regardless.
 */
export function shopEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_SHOP_ENABLED ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Checkout switch, server-only concern (the client just renders whatever
 * availability the server reports). Requires the master flag, the
 * explicit checkout flag, AND a Stripe secret key; missing any one of
 * them degrades to the "Checkout opens soon" state, never an error.
 */
export function checkoutEnabled(): boolean {
  if (!shopEnabled()) return false;
  const v = (process.env.SHOP_CHECKOUT_ENABLED ?? "").trim().toLowerCase();
  const on = v === "1" || v === "true" || v === "yes";
  return on && Boolean(process.env.STRIPE_SECRET_KEY);
}
