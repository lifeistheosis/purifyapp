# Purify Admin, his own Android app

His word, 2026-11-24: "can you make the admin panel into a custom android app for me", and "yes option 2" (a real APK, sideloaded, over the Chrome install).

## What it is

`android-admin/`: a Trusted Web Activity, package `net.purifyapp.admin`, label "Purify Admin", that opens `https://purifyapp.net/admin` in Chrome's own engine, full screen. It holds no code of the panel: every deploy of main is in it at once, and it needs a new APK only to change its name, icon or start address.

Why a Trusted Web Activity and not a WebView: the website signs in with Google by a redirect, and Google refuses sign-in inside a WebView. A TWA is Chrome, so it shares Chrome's sign-in and cookies, Google sign-in works, and the login and admin check are exactly the website's. Nothing about access changes.

Not on Play and not for readers. The icon is Purify's own (`public/icon-512.png`); a different one is his call.

## Full screen needs the site's word

Chrome shows the app without an address bar only when `https://purifyapp.net/.well-known/assetlinks.json` names the app's package and its key's SHA-256. That file is `public/.well-known/assetlinks.json`, and it reaches the site with a push to main (his word). Until then the app works with a thin address bar at the top. The file names only this app; the reader app makes no app-link claim today, so nothing else changes.

Key fingerprint: `B7:0B:90:8C:AF:37:B9:6D:CC:65:AB:77:05:D7:E8:04:1A:CC:0D:03:CA:ED:65:6D:A0:39:28:0C:15:07:B1:0F`.

## The signing key

`purify-admin.jks`, alias `admin`, made 2026-11-24, outside the repo (`*.jks` is ignored). Sent to him with its password file to keep: an update to the installed app must be signed with the same key. Lost, the fix is to uninstall and install a new build with a new key and a new fingerprint in assetlinks.json; nothing else is at stake, since the app holds no secret and the panel's access is the website's login.

## Build

```
cd android-admin
echo "sdk.dir=$HOME/android-sdk" > local.properties
ADMIN_KEYSTORE=/path/purify-admin.jks ADMIN_KEYSTORE_PASSWORD=... gradle assembleRelease
```

Gradle 8.14, Android Gradle Plugin 8.13, compile and target SDK 35, min SDK 24, androidbrowserhelper 2.5.0. Built 2026-11-24 in a cloud container: signed, verified with apksigner, label, package and start address read back from the APK. Not yet run on a phone: his install is the first run.
