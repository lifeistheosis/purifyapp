# Auth setup checklist (v6.2)

The v6.2 release introduced email+password auth plus Google / Apple
OAuth. The code ships ready, but four external steps are required
before the system is live end-to-end.

---

## 1. Apply the schema migration

In Supabase Dashboard → SQL Editor, run the contents of
`supabase/migrations/20260526_profiles_has_password.sql`.

This adds `profiles.has_password` (used by the middleware to gate
legacy magic-link users into the set-password interstitial) and a
`mark_password_set()` RPC the client calls after a successful
password change.

Verify with:

```sql
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'profiles'
   and column_name = 'has_password';
```

Until this is applied the middleware silently fails open (no
set-password gate). Already done as of 2026-05-26.

---

## 2. Supabase Auth settings

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://purifyapp.onrender.com`
- **Redirect URLs** (add each):
  - `https://purifyapp.onrender.com/api/auth/callback`
  - `https://purifyapp.onrender.com/reset`
  - `http://localhost:3000/api/auth/callback` (for local dev)
  - `http://localhost:3000/reset` (for local dev)

In Supabase Dashboard → Authentication → Providers → Email:

- **Enable email confirmations**: ON. Without this, signup users
  land signed in immediately and can use unverified addresses.
- **Secure password change**: ON (re-auth required for password
  rotation). The client also re-authenticates explicitly, but the
  server-side guard is belt-and-suspenders.
- **Minimum password length**: 8.
- **Leaked password protection**: ON if your Supabase tier
  supports it (free tier does).

---

## 3. Google Sign-In

Free. ~10 minutes of clicks.

1. **Google Cloud Console** → create or pick a project →
   **APIs & Services → Credentials** → **Create credentials** →
   **OAuth client ID**.
2. Application type: **Web application**.
3. Authorized JavaScript origins:
   - `https://purifyapp.onrender.com`
   - `http://localhost:3000`
4. Authorized redirect URIs (Supabase provides the exact URL — copy
   it from the Supabase dashboard → Authentication → Providers →
   Google → "Callback URL (for OAuth)"). It looks like
   `https://<your-project-ref>.supabase.co/auth/v1/callback`.
5. **Save**. Copy the **Client ID** and **Client secret**.
6. **Supabase Dashboard → Authentication → Providers → Google** →
   toggle ON → paste the Client ID + Secret → **Save**.

Test: open `/signin`, click **Continue with Google**, complete the
Google flow. You should land on `/account/profile`.

---

## 4. Apple Sign-In

**Requires an Apple Developer account ($99/year).** If you don't
have one, leave the button wired — clicks will surface a clear
error rather than silently failing.

1. **Apple Developer → Identifiers** → register a new **App ID**
   (or pick an existing one) with **Sign in with Apple** capability
   enabled.
2. **Identifiers** → **Services IDs** → register a new Services ID
   (this is what Supabase will use as the "client id"). Enable
   **Sign in with Apple**, configure the Web Authentication:
   - Primary App ID: the one above.
   - Domains: `purifyapp.onrender.com`
   - Return URLs: the Supabase callback URL (see Google step 4
     for where to find it).
3. **Keys** → register a new key with **Sign in with Apple**
   enabled. Configure it for the Primary App ID. Download the
   `.p8` key file (only available once — save it).
4. Note your **Team ID** (top-right of the developer portal),
   **Key ID** (from the key you just made), and **Services ID**
   (the identifier you registered in step 2).
5. **Supabase Dashboard → Authentication → Providers → Apple** →
   toggle ON. Fill in:
   - **Client ID**: the Services ID from step 2.
   - **Secret key**: this is a generated JWT, not the `.p8`
     contents directly. Supabase provides an inline form to mint
     it from the Team ID + Key ID + `.p8` private key.
6. **Save**.

Test: open `/signin`, click **Continue with Apple**.

---

## 5. Ongoing: legacy users

Any user who signed up under the old magic-link flow has
`profiles.has_password = false` (or, post-migration, true only if
they'd ever hit the reset-password endpoint). On their next
sign-in, the middleware will redirect them to `/set-password` and
hold them there until they pick one. After that, every subsequent
sign-in is a normal password + optional OAuth flow.

If a legacy user truly can't get back in (lost the magic-link,
hasn't picked a password yet), they should use `/forgot` — the
reset flow also satisfies the set-password gate.
