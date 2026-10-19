# What R8 must leave alone in the Purify Android app, and why.
#
# R8 (minifyEnabled in build.gradle, on since 2026-10-04) removes code that
# nothing refers to and renames the rest. Code that is only ever reached by
# NAME is invisible to it: a class named in a JSON file, a method found by
# reflection, a field read from C. Each rule here protects one of those.
#
# A missing rule does not fail the build. It fails on a phone. When this
# file, a Capacitor plugin or a native dependency changes, install the
# release APK and open the app before the AAB goes to Play (docs/RELEASE.md,
# "The Android app is shrunk").
#
# Most of the protecting is done by rules the libraries ship themselves,
# which Gradle applies without being asked:
#
#   - Capacitor keeps every plugin class and its @PluginMethod methods
#     (node_modules/@capacitor/android/capacitor/proguard-rules.pro). The
#     bridge reads plugin class names out of capacitor.plugins.json and calls
#     their methods by the name JavaScript sends.
#   - @capgo/capacitor-social-login keeps its own classes, and with them all
#     of com.getcapacitor, okhttp3, Google sign-in, Credential Manager and
#     com.auth0.android.jwt.
#   - RevenueCat, Firebase, Play services, Compose, Kotlin and SQLCipher keep
#     what they need of their own.
#   - The default file (proguard-android-optimize.txt) keeps
#     @JavascriptInterface methods, native method names, enums, Parcelable
#     CREATORs and the annotations reflection reads.
#   - MainActivity, DayWidgetProvider and every other class the manifest
#     names are kept by the build itself.
#
# What follows is what none of those covers, or covers more narrowly than is
# worth trusting.

# ── Crash reports ───────────────────────────────────────────────────────
# Line numbers survive the renaming, so a stack trace Play has turned back
# with the mapping file (it rides inside the AAB) still points at a line.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── SQLCipher, under @capacitor-community/sqlite ────────────────────────
# The database's C library finds Java classes, fields and methods by name.
# Version 4.10.0 ships a short list of them. The library has since widened
# its own rules to the whole package, and these are those. The plugin's own
# guide names the package SQLCipher used before; it is kept as well, in case
# a version of the plugin goes back to it.
-keep,includedescriptorclasses class net.zetetic.database.** { *; }
-keep,includedescriptorclasses interface net.zetetic.database.** { *; }
-keepclasseswithmembernames class net.zetetic.database.** {
    native <methods>;
}
-dontwarn net.zetetic.database.**
-keep class net.sqlcipher.** { *; }
-dontwarn net.sqlcipher.**

# ── Gson, under com.auth0.android:jwtdecode (Sign in with Apple) ────────
# Gson reads generic types at run time, and R8's full mode drops them unless
# told to keep them. These are the lines R8's own notes give for Gson; the
# Gson that jwtdecode brings predates Gson shipping them itself.
-keepattributes Signature
-keep,allowobfuscation,allowshrinking class com.google.gson.reflect.TypeToken
-keep,allowobfuscation,allowshrinking class * extends com.google.gson.reflect.TypeToken

# ── Named, and never shipped ────────────────────────────────────────────
# Compile-time annotations and optional back ends that a library mentions
# and the app does not carry. They are absent from today's build too, and
# nothing loads them at run time; without these lines R8 stops the build on
# each one. All four come from Tink, under androidx.security:security-crypto,
# which the SQLite plugin uses.
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn com.google.api.client.http.**
-dontwarn org.joda.time.**

# ── Left to go, on purpose ──────────────────────────────────────────────
# com.google.androidbrowserhelper comes with @capgo/capacitor-social-login,
# which imports TwaLauncher and never calls it, and the library ships no keep
# rules. With nothing reaching it, R8 removes all of it, and with it the
# calls Play named on 1.7: "Your app uses deprecated APIs or parameters for
# edge-to-edge" (Window.setStatusBarColor, setNavigationBarColor and
# getStatusBarColor, from its trusted.Utils and WebViewFallbackActivity).
# No rule here may keep it. Its manifest's <queries> stays, which is what
# lets the sign-in plugin find a browser for Custom Tabs.
