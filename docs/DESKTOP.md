# Purify for the desktop

Windows, macOS and Linux, built with Tauri 2. Source in `desktop/`. Written
2026-09-25. Nothing here has shipped: there is no signed build and no
download page yet. See "Before a public release".

## What it is

A native window around **https://purifyapp.net**, plus what only a native
app can do. Today that is Discord Rich Presence.

| | |
|---|---|
| Loads | The live site. Not a bundled copy. |
| So | The desktop app is always the current Purify with no release of its own. Sign-in, sync, community and the shop work exactly as on the web. The site's service worker (`public/sw.js`) gives it the same offline reading the website has. |
| Engine | The system webview: WebView2 (Chromium) on Windows, WKWebView on macOS (the same engine as the iOS app), WebKitGTK on Linux. No bundled browser, so the installer is a few MB, not 100+. |
| Layout | The website's desktop layout. It is not the Capacitor shell, so `html.is-native`, the tab bar and the phone screens never appear. |
| Native code | Rust, about 1,000 lines, roughly half of it tests: `presence.rs` (what may be shown), `discord.rs` (the Discord connection), `nav.rs` (where the window may go), `lib.rs` (wiring). |

Why Tauri and not Electron: an order of magnitude smaller, the same engines
the phone apps are already tested on, and a permission system that lets the
live site call exactly three native commands and nothing else. Electron would
have shipped a full Chromium and a Node runtime the site does not need.

## Discord Rich Presence

A reader can let Discord show their friends what they are doing in Purify.

**Off until the reader turns it on**, in Settings > Discord status, which
appears only inside the desktop app. Three levels:

| Level | Discord shows |
|---|---|
| Off (default) | Nothing. The app does not even connect to Discord. |
| In Purify | "In Purify", and a "Visit Purify" button to the front page. |
| What I read | Scripture by book and chapter ("Reading Scripture", "John 3"), a saint or a study by name, with an "Open in Purify" button to that page. |

Whatever the level, some things are never described:

- **Which prayer.** Prayer shows only as "At prayer".
- **Private rooms.** Community, account, shop, saved, support and admin pages
  show only "In Purify", and the button never points at them.
- **Time.** No timestamps are sent, so Discord shows no running clock. Purify
  keeps no timers on prayer or reading (C3).

How it works:

1. `components/desktop/DesktopPresenceBridge.tsx` (root layout) waits 1.2s
   after each navigation, then asks `lib/desktop/activity.ts` what the page
   is. That module is pure and unit tested.
2. It calls the desktop app through `window.__TAURI__` (`lib/desktop/bridge.ts`).
   In a browser or the phone apps there is no such global and nothing happens.
3. `presence.rs` treats the request as untrusted, because it comes from a
   remote page. It refuses unknown fields, strips control and bidi characters,
   holds text to Discord's limits, fixes the picture to our own asset, and
   allows a button only to a public page of purifyapp.net.
4. `discord.rs` talks to the Discord app over its local socket or named pipe.
   It works on one background thread, merges rapid changes (Discord accepts
   about 5 updates per 20 seconds), retries a missing Discord every 15s, and
   disconnects entirely when presence is turned off. Quitting Purify clears
   the status.

Nothing is sent to Purify's servers. The socket is local; Discord shows the
status under its own privacy policy.

## Security model

- The window loads purifyapp.net. Stripe Checkout and email sign-in stay in
  the window, because they return to Purify. Google and Apple sign-in open in
  the reader's own browser (below). Every other link opens in the reader's
  browser. `file:`, `javascript:` and
  `data:` are refused. `nav.rs`, tested, including lookalike hosts.
- `target="_blank"` and `window.open` never open a second webview.
- **The page can call four commands and nothing else**:
  `presence_set`, `presence_clear`, `presence_status`, `auth_open`
  (`capabilities/main.json`, remote URL `https://purifyapp.net/*` only).
  `auth_open` opens only a Supabase `/auth/v1/authorize` URL for Google or
  Apple whose `redirect_to` is `purify://auth-callback`, anything else is
  refused (`auth.rs`, tested). No
  file, shell, window or opener access. Verified in the running app: a call
  to the opener plugin from the page is denied.
- The site's CSP gains `ipc: http://ipc.localhost` in `connect-src`
  (`lib/security/headers.ts`). Those are the bridge's transport. A browser
  never reaches either. Without them the bridge still works, over a slower
  fallback, but every desktop session would file a CSP violation report.
- Development builds only: `PURIFY_DESKTOP_URL` loads a local server and a
  second capability grants that origin (`capabilities/dev.json`). A release
  build ignores both.

## Google and Apple sign-in

Google refuses sign-in inside embedded app windows ("This browser or app may
not be secure"), so in the desktop app the provider page opens in the
reader's own browser, the way RFC 8252 and Google both ask:

1. The sign-in button (`components/auth/OAuthButtons.tsx`) asks Supabase for
   the provider URL with `redirect_to=purify://auth-callback?next=...` and
   hands it to `auth_open`. The one-time PKCE verifier stays in the app
   window's cookies. The page says "Sign-in opened in your browser".
2. The reader signs in there. Supabase sends the browser to the `purify://`
   link, and the OS hands it to the app (a second launch passes it to the
   running one and exits).
3. The app turns the link into `https://purifyapp.net/api/auth/callback
   ?code=...` and loads that in its window, where the verifier is. The site's
   own callback exchanges the code, exactly as on the web. The app never
   holds a token.

The link is untrusted input: it becomes a callback only with a well-formed
code or provider error, only the five known parameters, and a `next` that is
a plain site path. A desktop build older than this refuses `auth_open`, and
the page then falls back to the old in-window redirect.

## Running it

```
# One time: the Tauri CLI, kept out of the website's package.json
cd desktop && npm ci

# Against a local Next.js server on :3000 (npm run dev in the repo root)
npm run dev                 # PURIFY_DESKTOP_URL=http://localhost:3000 tauri dev

# Tests: presence validation, the Discord protocol against a fake Discord,
# the navigation rules
npm test                    # cargo test
```

### Walking a branch on Windows

`desktop/test-local.cmd` (double-click it) is the whole loop: it starts this
checkout's production build on :3000 (`npm run start`, building first if
there is no build), opens the debug app pointed at it, and stops the website
when the app closes. The window then shows the branch, not purifyapp.net, so
a release can be walked on Windows before anything is deployed.

- It needs the **debug** app: `cd desktop && npm run tauri build -- --debug`.
  A release build ignores `PURIFY_DESKTOP_URL` by design and always opens the
  live site.
- Port 3000 is fixed: `capabilities/dev.json` grants the four commands to
  `localhost:3000` only.
- Discord status needs the application id from step 1 below, alone on one
  line in `desktop/discord-client-id.txt` (gitignored). The debug build reads
  it at launch; without it Settings says Discord status is not set up.
- The website build carries whatever `.env.production.local` says. With the
  web purchase key in it the Plus sheet is live and its checkout is real.

Windows builds use the GNU toolchain (`x86_64-pc-windows-gnu`), so no Visual
Studio licence is needed. Two things it needs that MSVC does not: MinGW's
`dlltool` on PATH (WinLibs works), and `crate-type = ["rlib"]` in
`Cargo.toml`, because the cdylib Tauri mobile would want exports more
symbols than GNU ld can number and fails with "export ordinal too large".

Linux needs the webview libraries first:
`libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev librsvg2-dev libayatana-appindicator3-dev libxdo-dev`.

CI: Actions > "Desktop build" (manual only, `.github/workflows/desktop.yml`).
It runs the Rust tests and clippy, then builds unsigned installers for all
three platforms as artifacts.

## What was verified on 2026-09-25

- `cargo test`: 26 tests. `cargo clippy -D warnings`: clean.
- Vitest: `lib/desktop/__tests__/activity.test.ts`, 14 tests, including a
  check that every path the site sends is on the Rust allow list.
- The real app, run on Linux under a virtual display, loading the local site,
  with a fake Discord on the real socket path, driven over WebDriver:
  18 of 18. Nothing is sent before opt-in; Scripture, prayer and the account
  page show exactly as the table above says; a request with a `timestamps`
  field is refused; an off-site button path is dropped; the page cannot call
  the opener plugin; Settings shows the live connection; Off clears the
  status and disconnects.

- Browser sign-in, in the real app the same way, with the system browser
  stubbed to record what it was asked to open: 13 of 13. The Google button
  opens exactly one URL, the Supabase authorize URL with a PKCE challenge and
  `redirect_to=purify://auth-callback?next=%2Faccount%2Fprofile`; the
  verifier stays in the window; the window stays on the sign-in page and says
  to finish in the browser; `auth_open` refuses an off-Supabase URL; a link
  with an off-site `next` loads nothing; a second launch with a good link
  hands it over and exits, and the running window loads
  `/api/auth/callback?code=...`; a cold start from the link does the same.

Not verified here: Windows and macOS builds (the workflow is written but has
not run), a real Discord client, and a real Google or Apple sign-in end to
end, which needs the redirect URL below and a signed build.

## Before a public release (owner)

1. **Create the Discord application.** discord.com/developers > New
   Application, named **Purify** (that name is what Discord shows). Copy the
   Application ID into the repository variable `PURIFY_DISCORD_CLIENT_ID`.
   It is public, not a secret. Under Rich Presence > Art Assets, upload the
   app icon (1024px) with the key **`purify`**. Without the id, builds still
   work and Settings says Discord status is not set up in this build.
2. **Signing.** Unsigned builds warn on first launch. macOS needs a
   Developer ID certificate and notarisation (the Apple account exists for
   iOS). Windows needs a code-signing certificate, or Azure Trusted Signing.
   Both go in as repository secrets, and the workflow gains a signing step.
   Nothing public should ship unsigned; for a premium brand the SmartScreen
   and Gatekeeper warnings are the first impression.
3. **Allow the app's sign-in return address in Supabase.** Supabase >
   Authentication > URL Configuration > Redirect URLs: add
   `purify://auth-callback**`. Until it is there, Google and Apple sign-in in
   the desktop app fail (Supabase sends the browser to the Site URL instead,
   where the code cannot be used). Email sign-in and the website are
   unaffected. Then test one real Google sign-in on a signed build: macOS
   registers `purify://` only for an installed .app, Windows and Linux at
   first launch.
4. **Updates of the app itself.** The site updates itself; the native shell
   does not. `tauri-plugin-updater` with a signing key (a secret) is the
   usual answer, once there is a public build to update.
5. **Privacy page.** A draft line for /privacy, for the owner's wording:
   "In the desktop app you can turn on Discord status. Purify then tells the
   Discord app on your computer what you are doing in Purify, at the level
   you choose, and Discord shows it to your friends under Discord's own
   privacy policy. Nothing about this is sent to Purify. It is off unless you
   turn it on."
6. **A download page.** Not built. It belongs after signing.

## Not built, and why

- **A reading tracker with statistics** (minutes read, chapters per week).
  It would be a timer and a streak by another name, which C3 rules out. The
  reading tracker here is the one that feeds Discord: it knows what the page
  is and nothing about how long. If a record of what has been read is wanted,
  the C3-shaped version is a set that only grows ("books you have opened"),
  like the Study Collections progress in the 1.4 plan.
- **The Mac App Store and the Microsoft Store.** Direct download first. The
  stores add review, sandboxing and a revenue share on Plus, for little reach
  a download page does not already have.
