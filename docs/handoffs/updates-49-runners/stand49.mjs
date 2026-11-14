// Updates 49: a stand-in Plus subscriber for the export, in the browser only.
// The plans are Plus on the gate's export (both stores enforce it on the walk's phone), so a reader who has begun a
// plan is a subscriber. A session for a made-up user goes in the native store (purify.supabase.auth), and every
// Supabase address but the public pictures is answered here: the user, an entitlement row with Plus, empty lists, and
// an empty success for any write. Nothing is sent to production; `sent` lists the writes the page asked for.
const REF = "avbqyvjgcrucjwevwixt";
const b64u = (s) => Buffer.from(s).toString("base64url");

export function subscriberStore() {
  const now = Math.floor(Date.now() / 1000);
  const user = { id: "00000000-0000-4000-8000-000000000049", aud: "authenticated", role: "authenticated", email: "reader49@example.invalid", email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
  const jwt = [b64u(JSON.stringify({ alg: "HS256", typ: "JWT" })), b64u(JSON.stringify({ sub: user.id, aud: "authenticated", role: "authenticated", email: user.email, exp: now + 86400, iat: now, session_id: "s49" })), b64u("stand-in")].join(".");
  const session = { access_token: jwt, token_type: "bearer", expires_in: 86400, expires_at: now + 86400, refresh_token: "stand-in-refresh", user };
  return { user, session, store: JSON.stringify([{ name: `sb-${REF}-auth-token`, value: "base64-" + b64u(JSON.stringify(session)) }]) };
}

/** Routes for the stand-in; call after the main web's routes so these win for Supabase and the site's writes. */
export async function standInSubscriber(ctx, mainWeb) {
  const { user, session, store } = subscriberStore();
  const sent = [];
  await ctx.addInitScript((s) => {
    try {
      if (!localStorage.getItem("purify.supabase.auth")) localStorage.setItem("purify.supabase.auth", s);
    } catch {}
  }, store);
  const entitlement = [{ is_supporter: false, plus_until: "2099-01-01T00:00:00+00:00", plus_source: "play", pro_until: null }];
  await ctx.route(new RegExp(`^https://${REF}\\.supabase\\.co/(?!storage/v1/object/public/)`), async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const m = req.method();
    if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") sent.push(`${m} ${url.pathname}`);
    const json = (status, body) =>
      route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }, body: JSON.stringify(body) });
    if (m === "OPTIONS") return json(200, {});
    if (url.pathname === "/auth/v1/user") return json(200, user);
    if (url.pathname.startsWith("/auth/v1/token")) return json(200, session);
    if (url.pathname.startsWith("/auth/v1/")) return json(200, {});
    if (url.pathname === "/rest/v1/entitlements") return json(200, entitlement);
    if (url.pathname.startsWith("/rest/v1/rpc/")) return json(200, null);
    if (url.pathname.startsWith("/rest/v1/")) return m === "GET" || m === "HEAD" ? json(200, []) : json(201, []);
    return json(200, {});
  });
  await ctx.route(/^https:\/\/purifyapp\.(net|onrender\.com)\/api\//, (route) => {
    const req = route.request();
    if (req.method() !== "GET") {
      sent.push(`${req.method()} ${new URL(req.url()).pathname}`);
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return mainWeb(route);
  });
  return sent;
}
