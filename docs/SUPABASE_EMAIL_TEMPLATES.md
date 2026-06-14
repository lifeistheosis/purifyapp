# Supabase email templates (token_hash / OTP flow)

## Why

The default Supabase email templates use `{{ .ConfirmationURL }}`, which
drives the **PKCE `code` flow**. PKCE stores a one-time `code_verifier` in a
cookie on the browser that *started* the flow. Mobile mail apps open links in
an **in-app browser** — a separate cookie jar from the one the user signed up
in — so the verifier is missing and the callback fails with:

> PKCE code verifier not found in storage.

The fix is the stateless **OTP `token_hash`** flow (`verifyOtp`), which carries
no client-side state and works no matter which browser opens the link. The
callback at `app/api/auth/callback/route.ts` already handles both `token_hash`
and (for OAuth) `code`. To activate it, update the templates below in the
Supabase Dashboard → **Authentication → Email Templates**.

## Templates

Replace the link/button `href` in each template.

**Confirm signup**
```
{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/account/profile
```

**Reset password**
```
{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset
```

**Magic link**
```
{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&next=/account/profile
```

**Change email address**
```
{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=email_change&next=/account/profile
```

## Notes

- `{{ .SiteURL }}` must match the deployed origin (the project's **Site URL**
  under Authentication → URL Configuration → `https://purifyapp.onrender.com`).
- Old `?code=` links already in inboxes still work — the callback retains the
  `exchangeCodeForSession` path — but only when opened in the original browser.
- No code deploy is needed for this step; it is a dashboard change. The code
  side ships with the callback + ForgotForm changes in this commit.
