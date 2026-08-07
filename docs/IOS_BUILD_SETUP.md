# iOS builds

Purify's iOS app is built and signed entirely on a GitHub macOS runner. There is
no Mac in this project, and none is needed: the one step that normally requires
Keychain Access, generating the certificate signing request, is done below with
the `openssl` that ships in Git Bash.

The workflow is **Actions → "iOS build (signed)" → Run workflow**. It builds the
same local-first bundle the Android app ships (the static export plus the content
package, so the app opens with no signal), signs it with the distribution
certificate, and uploads it to App Store Connect for TestFlight.

> The old "iOS build (unsigned)" workflow is gone. It produced an `.ipa` that
> needed AltStore or Sideloadly to install, expired after 7 days, could not do
> push (the unsigned build stripped the entitlement), and, more seriously,
> wrapped the remote website rather than bundling the app, which is the shape
> the App Store rejects under guideline 4.2. It is in git history if the free
> sideload path is ever wanted again.

---

## One-time setup

### 1. App Store Connect

Create the app record for bundle id `net.purifyapp.purify`. Note the **Adam ID**
(the numeric id in the App Store URL). It goes into `iosStoreUrl` in
`lib/appUpdate/release.ts`, which currently carries a zeroed placeholder;
`release.test.ts` fails the build if `iosBuildNumber` is raised while that
placeholder is still in place.

For Purify Plus, also complete the **Paid Apps agreement** including banking and
tax, then create the subscription group and the `plus` / `pro` products. This is
the slowest item in the whole launch and nothing about it is technical: start it
first.

### 2. The distribution certificate, without a Mac

```bash
openssl genrsa -out purify_dist.key 2048
openssl req -new -key purify_dist.key -out purify_dist.csr \
  -subj "/emailAddress=lifeistheosis@gmail.com/CN=Purify Distribution/C=US"
```

Upload `purify_dist.csr` at developer.apple.com → Certificates → **Apple
Distribution**, download the resulting `distribution.cer`, then:

```bash
openssl x509 -inform DER -in distribution.cer -out distribution.pem

# Confirm Apple issued this certificate against THIS key before going further.
# The two MD5s must match; if they do not, the .cer belongs to a different CSR.
openssl x509 -noout -modulus -in distribution.pem | openssl md5
openssl rsa  -noout -modulus -in purify_dist.key  | openssl md5

# The default export (AES-256-CBC with PBKDF2) is what macOS 15 wants. Apple's
# DTS has confirmed macOS 15 was updated to read modern PKCS#12 crypto, where
# macOS 14 could only read the legacy shape, so -legacy is the flag for OLD
# runners, not a general requirement. The workflow no longer depends on either
# answer: it re-wraps the bundle into both shapes on the runner and imports
# whichever one the Security framework there accepts.
#
# Type the password, or paste it from somewhere you can see every character.
# See the warning below about what a stray control character does here.
openssl pkcs12 -export -inkey purify_dist.key -in distribution.pem \
  -name "Apple Distribution: Edgar Augustin" \
  -out purify_dist.p12 -passout pass:CHOOSE_A_PASSWORD
base64 -w0 purify_dist.p12 > purify_dist.p12.b64
```

Reading a `-legacy` bundle back also needs the flag
(`openssl pkcs12 -legacy -in purify_dist.p12 ...`). Without it OpenSSL 3 reports
`Algorithm (RC2-40-CBC) unsupported`, which looks like a corrupt file and is not.

> **The password must contain no whitespace or control characters, and you must
> be able to see all of it.** The first certificate generated here was exported
> with a password ending in a carriage return, picked up from a file. Nothing
> displays that: not the terminal, not the text file it was stored in, not the
> GitHub secret form. Every human-readable copy of the password was the 32
> visible characters, and those 32 characters do not open the bundle. Three
> runs of the workflow failed on it, each reporting only
> `security: SecKeychainItemImport: The user name or passphrase you entered is
> not correct`, which was true and gave nothing to act on. `security` says that
> sentence for a wrong password, a truncated secret, and a cipher it does not
> implement alike. The workflow now checks the password with `openssl` first,
> which distinguishes the three, and tolerates the trailing carriage return with
> a loud warning so a build is never blocked by it again.

**Done for Purify on 2026-08-06, replaced 2026-08-07.** Certificate
`Apple Distribution: Edgar Augustin (KFBT4D3T4L)`, valid until **2027-08-07**,
verified to match the private key. The certificate and key never changed; only
the bundle around them did. `purify_dist_modern.p12` in
`C:\Users\Leona\purify-keys` is the replacement: same leaf (SHA-256 fingerprint
`99:C1:D0:20:…:9B:99`), same private key, wrapped as AES-256-CBC/PBKDF2 with a
SHA-256 MAC, and opened by the 32 visible characters with nothing appended.
`purify_dist_modern.p12.b64` next to it is what `IOS_DIST_CERT_P12_BASE64`
should hold. The original `purify_dist.p12` is kept only as the record of what
went wrong.

That folder is the one irreplaceable thing here: without `purify_dist.key` the
certificate is useless and you would revoke and start over.

Keep `purify_dist.key` somewhere safe. Losing it means revoking the certificate
and starting over, and Apple caps distribution certificates per team. The root
`.gitignore` already ignores `*.p12`, `*.cer`, and `*.mobileprovision`, but none
of these files should be in the repo at all.

### 3. App Store Connect API key

App Store Connect → **Users and Access → Integrations → App Store Connect API →
Team Keys** → generate a key with the **App Manager** role.

The `.p8` downloads **once**. If it is lost, revoke it and make a new one.

This is used instead of an Apple ID plus app-specific password because that
approach is 2FA-fragile, ties CI to one person's account, and cannot create or
update provisioning profiles, which the build needs to do whenever the app's
capabilities change.

### 4. Repository secrets

Settings → Secrets and variables → Actions:

| Secret | Where it comes from |
|---|---|
| `APPLE_TEAM_ID` | developer.apple.com → Membership details |
| `IOS_DIST_CERT_P12_BASE64` | `purify_dist_modern.p12.b64` from step 2 |
| `IOS_DIST_CERT_PASSWORD` | the password chosen in step 2, visible characters only |
| `APPSTORE_API_KEY_ID` | the 10-character Key ID from step 3 |
| `APPSTORE_API_ISSUER_ID` | the UUID above the key list on that page |
| `APPSTORE_API_PRIVATE_KEY_BASE64` | base64 of `AuthKey_XXXXXXXXXX.p8` |
| `NEXT_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat → iOS app → public SDK key (`appl_…`) |
| `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Cloud → Credentials → OAuth client → iOS |
| `GOOGLE_REVERSED_CLIENT_ID` | the same id reversed (`com.googleusercontent.apps.…`) |

The rest (`NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SITE_URL`, and so on) are the
same secrets the Android workflow already uses.

### 5. Sign in with Apple

Required by App Store review guideline 4.8, because Purify offers Google
sign-in. All of this is dashboard work:

1. developer.apple.com → App ID `net.purifyapp.purify` → enable **Sign in with
   Apple**.
2. Create a **Services ID** (e.g. `net.purifyapp.purify.web`) with domain
   `purifyapp.net` and return URL
   `https://<supabase-ref>.supabase.co/auth/v1/callback`. This is the web half.
3. Create a **Sign in with Apple key** (`.p8`); note the Key ID and Team ID.
4. Supabase → Authentication → Providers → **Apple**. The Client IDs field must
   contain **both** the Services ID (for web) **and** the bundle ID
   `net.purifyapp.purify` (native ID tokens carry the bundle id as their
   audience). Paste the `.p8`, Key ID, and Team ID.

The entitlement itself is already in `ios/App/App/App.entitlements`, and
automatic signing enables the capability on the App ID from there.

### 6. Google sign-in on iOS

Easy to miss, and it fails in a way that reads like a code bug: Supabase →
Authentication → Providers → **Google** → add the **iOS client ID** to the
authorised client IDs.

Android's native token carries the *web* client id as its audience; iOS carries
the *iOS* client id. Supabase verifies the audience against that list, so
without this every iPhone sign-in fails with "Unacceptable audience in
id_token".

---

## Running a build

**Actions → "iOS build (signed)" → Run workflow.**

| Input | Meaning |
|---|---|
| `local_first` | Leave checked. Unchecking builds the remote-wrapper shape the App Store rejects under 4.2. |
| `upload` | Uncheck to build and sign without delivering to App Store Connect. |
| `build_number` | Leave empty. Only needed to recover from a duplicate-build-number rejection. |

`CFBundleVersion` is the workflow run number, mirroring how Android derives its
`versionCode`. Note that **renaming or recreating the workflow file resets that
counter**, and App Store Connect then rejects the upload as a duplicate; the
`build_number` input is the way out.

The IPA is also published to the rolling `ios-release` GitHub Release, so the
exact artifact sent to Apple can be re-downloaded and inspected.

### After the build is live

Set `iosBuildNumber` in `lib/appUpdate/release.ts` to the number that is
**actually on TestFlight or the App Store**, and fill in the real Adam ID in
`iosStoreUrl`. Do this *after*, never before: a number ahead of the live build
prompts every reader to fetch something that does not exist. `0` means "prompt
nobody" and is the correct resting state.

---

## What the workflow checks for you

Four assertions exist because each failure is invisible until it is expensive:

- **The certificate secrets are diagnosed before they are used.** `openssl`
  opens the bundle first, so the log says which of "wrong password", "truncated
  paste", and "cipher this runner will not read" actually happened, instead of
  `security`'s single sentence for all three. The bundle is then re-wrapped into
  both the modern and the legacy shape and imported until one is accepted, and
  the log names the one that worked. Apple's WWDR G3 intermediate is installed
  in the same step, because the .p12 carries only the leaf and
  `find-identity -v` lists nothing without the issuer, which reads like a
  missing certificate rather than a missing chain.

- **`Package.swift` has no backslashes and declares at least 16 packages.** The
  Capacitor CLI writes that file's dependency paths with `path.relative()`,
  which emits Windows separators when the sync runs on this laptop. Those are
  invalid escape sequences inside Swift string literals. The committed file was
  unparseable for 432 commits and nobody noticed, because nothing ever tried to
  build it. It is untracked now and generated on the runner.
- **The archive carries the Sign in with Apple entitlement.** Without it the
  button compiles, ships, and fails at the tap.
- **The exported IPA carries `aps-environment: production`.** The checked-in
  entitlement says `development`, and `-exportArchive` is supposed to rewrite it.
  When that does not happen, push works perfectly in TestFlight and silently
  never arrives for anyone on the App Store.

## Signing settings live in exactly one place

`App.xcodeproj` uses `CODE_SIGN_STYLE = Automatic` on the target, and the
project-level configurations used to *also* pin `CODE_SIGN_IDENTITY` ("Apple
Development" for Debug, "Apple Distribution" for Release). Those two settings
contradict each other, and the archive refused to start:

```
App has conflicting provisioning settings. App is automatically signed for
development, but a conflicting code signing identity Apple Distribution has
been manually specified.
```

The manual identities are gone. Automatic signing picks from the identities
actually in the keychain, and the workflow imports exactly one, so there is
nothing left to disagree with. Do not add `CODE_SIGN_IDENTITY` back: pairing it
with automatic signing is the failure above, and pairing it with manual signing
would need a provisioning profile regenerated by hand on a Mac every time the
app's capabilities change, which is the thing this pipeline exists to avoid.

## Related

- `docs/NATIVE_PUSH_SETUP.md` — APNs keys and the delivery cron. iOS talks to
  APNs directly, not through Firebase, so no `GoogleService-Info.plist` is
  needed.
- `AGENTS.md` — the release ritual, including the six version identifiers.
