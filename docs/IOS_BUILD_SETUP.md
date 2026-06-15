# iOS test builds (free, no Apple Developer account)

iOS has no sideloadable-APK equivalent: a downloaded `.ipa` won't install on an
iPhone unless it's signed for that device. The **free** way to test on a real
device is to build an **unsigned** `.ipa` and re-sign it on install with your
own Apple ID via AltStore or Sideloadly.

## Build it

GitHub → **Actions** → **"iOS build (unsigned)"** → **Run workflow** (branch of
your choice). No secrets or Apple account required. It publishes
`Purify-unsigned.ipa` to the rolling **`ios-release`** GitHub Release.

(The job runs on a macOS runner, which costs more CI minutes than the Linux
Android job. It's manual-dispatch only, so it never runs on its own.)

## Install on an iPhone (free)

Use either tool — both re-sign the `.ipa` with a **free** Apple ID:

- **AltStore** (https://altstore.io): install AltServer on a Mac/PC, plug in the
  iPhone, then install the downloaded `.ipa` from the Releases page. AltStore can
  refresh the app over Wi-Fi.
- **Sideloadly** (https://sideloadly.io): plug in the iPhone, drag the `.ipa`,
  sign in with a free Apple ID, install.

### Free-Apple-ID limits (Apple's, not ours)

- The app **expires after 7 days** — re-sign/reinstall weekly (AltStore can
  auto-refresh while AltServer is running).
- Up to **3 sideloaded apps** per free Apple ID at once.
- Push notifications **do not work** on these builds (APNs needs the paid
  account + the entitlement, which the unsigned build strips). General app/UI
  testing works fine — the shell loads purifyapp.net like the real app.

## When you outgrow free

For more than a couple of phones, or for push, enroll in the **Apple Developer
Program** ($99/yr) and switch to **ad-hoc** (signed `.ipa` for registered device
UDIDs, installs straight from the Release link) or **TestFlight** (testers
install via the TestFlight app). Those need signing secrets in the repo; ask and
we'll add a signed-build workflow. Native push setup is in
`docs/NATIVE_PUSH_SETUP.md`.
