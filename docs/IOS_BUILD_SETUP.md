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

# -legacy is REQUIRED, not a fallback. OpenSSL 3 defaults to AES-256-CBC with
# PBKDF2, and macOS `security import` cannot read that, so the keychain step in
# ios-release.yml fails with an unhelpful error. -legacy writes PBE-SHA1-3DES,
# which it does read.
openssl pkcs12 -export -legacy -inkey purify_dist.key -in distribution.pem \
  -name "Apple Distribution: Edgar Augustin" \
  -out purify_dist.p12 -passout pass:CHOOSE_A_PASSWORD
base64 -w0 purify_dist.p12 > purify_dist.p12.b64
```

Note that reading a `-legacy` bundle back also needs the flag
(`openssl pkcs12 -legacy -in purify_dist.p12 ...`). Without it OpenSSL 3 reports
`Algorithm (RC2-40-CBC) unsupported`, which looks like a corrupt file and is not.

**Done for Purify on 2026-08-06.** Certificate
`Apple Distribution: Edgar Augustin (KFBT4D3T4L)`, valid until **2027-08-07**,
verified to match the private key, with the key readable out of the bundle and a
wrong password correctly rejected. Artifacts live in `C:\Users\Leona\purify-keys`
alongside the Android upload keystore. **That folder is the one irreplaceable
thing here:** without `purify_dist.key` the certificate is useless and you would
revoke and start over.

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
| `IOS_DIST_CERT_P12_BASE64` | `purify_dist.p12.b64` from step 2 |
| `IOS_DIST_CERT_PASSWORD` | the password chosen in step 2 |
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

Three assertions exist because each failure is invisible until it is expensive:

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

## Related

- `docs/NATIVE_PUSH_SETUP.md` — APNs keys and the delivery cron. iOS talks to
  APNs directly, not through Firebase, so no `GoogleService-Info.plist` is
  needed.
- `AGENTS.md` — the release ritual, including the six version identifiers.
