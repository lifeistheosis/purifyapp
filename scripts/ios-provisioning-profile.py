#!/usr/bin/env python3
"""Create or reuse an App Store provisioning profile, via the App Store Connect API.

Why this exists
---------------
The iOS workflow used to archive with automatic signing. Automatic signing asks
Apple for an *iOS App Development* profile, development profiles require at
least one registered device, and this team has none and wants none: nobody here
installs builds by cable, the artifact goes to TestFlight. So every archive died
with

    Communication with Apple failed: Your team has no devices from which to
    generate a provisioning profile.
    No profiles for 'net.purifyapp.purify' were found.

which reads like a missing certificate and is nothing of the kind.

An App Store profile has no device list, so it sidesteps that entirely. The
usual way to get one is to click through the developer portal and paste the
.mobileprovision into CI as another secret. This mints it from the API key the
workflow already holds instead, which keeps the secret count where it is and,
more importantly, means the profile is rebuilt whenever the app's capabilities
change rather than silently going stale against them. Push and Sign in with
Apple are both live on this App ID; a profile predating either would strip the
entitlement at signing and the failure would not surface until a notification
quietly failed to arrive in production.

Reads from the environment:
    ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH   the App Store Connect API key
    BUNDLE_ID                                  e.g. net.purifyapp.purify
    PROFILE_NAME                               the profile's name in the portal
    OUT_PATH                                   where to write the .mobileprovision

Writes the profile to OUT_PATH and prints "UUID=<uuid>" and "NAME=<name>".

Standard library only, plus the openssl binary for the ES256 signature. macOS
runners ship no PyJWT and installing one to sign a 100-byte token is not worth
the supply chain.
"""

import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = "https://api.appstoreconnect.apple.com/v1/"
PROFILE_TYPE = "IOS_APP_STORE"


def die(msg):
    print("::error::%s" % msg)
    sys.exit(1)


def b64url(raw: bytes) -> bytes:
    return base64.urlsafe_b64encode(raw).rstrip(b"=")


def der_to_raw(der: bytes) -> bytes:
    """DER SEQUENCE{INTEGER r, INTEGER s} -> the fixed 64 bytes JWS ES256 wants.

    openssl emits DER. JWS wants r and s as bare 32-byte big-endian values, so
    the leading zero DER adds to keep integers positive has to come off and
    short values have to be padded back up.
    """
    if not der or der[0] != 0x30:
        die("openssl did not return a DER SEQUENCE for the JWT signature.")
    idx = 2 if der[1] < 0x80 else 2 + (der[1] & 0x7F)
    out = b""
    for _ in range(2):
        if der[idx] != 0x02:
            die("Malformed DER signature from openssl.")
        length = der[idx + 1]
        value = der[idx + 2 : idx + 2 + length].lstrip(b"\x00")
        out += value.rjust(32, b"\x00")
        idx += 2 + length
    return out


def make_token(key_id: str, issuer: str, key_path: str) -> str:
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    now = int(time.time())
    # Apple rejects anything longer than 20 minutes.
    payload = {"iss": issuer, "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"}
    signing_input = (
        b64url(json.dumps(header, separators=(",", ":")).encode())
        + b"."
        + b64url(json.dumps(payload, separators=(",", ":")).encode())
    )
    proc = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", key_path],
        input=signing_input,
        capture_output=True,
    )
    if proc.returncode != 0:
        die("openssl could not sign the JWT: %s" % proc.stderr.decode("utf-8", "replace").strip())
    return (signing_input + b"." + b64url(der_to_raw(proc.stdout))).decode()


def call(token, path, method="GET", body=None):
    req = urllib.request.Request(
        API + path,
        method=method,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body is not None else None,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:600]
        die("App Store Connect %s %s -> %s %s" % (method, path, e.code, detail))
    except Exception as e:  # noqa: BLE001 - network shape varies, the message is what matters
        die("App Store Connect %s %s failed: %s" % (method, path, e))


def plist_value(blob: bytes, key: str):
    """Pull one <key>/<string> pair out of an embedded plist.

    A .mobileprovision is a CMS envelope wrapping a plain-text plist. `security
    cms -D` is the tidy way to read it and exists only on macOS; this script is
    also run and tested off a Mac, so the plist is read directly. The fields
    wanted here (UUID, Name) are plain strings.
    """
    text = blob.decode("latin-1")
    marker = "<key>%s</key>" % key
    at = text.find(marker)
    if at < 0:
        return None
    start = text.find("<string>", at)
    end = text.find("</string>", start)
    if start < 0 or end < 0:
        return None
    return text[start + len("<string>") : end]


def main():
    key_id = os.environ.get("ASC_KEY_ID", "").strip()
    issuer = os.environ.get("ASC_ISSUER_ID", "").strip()
    key_path = os.environ.get("ASC_KEY_PATH", "").strip()
    bundle_id = os.environ.get("BUNDLE_ID", "").strip()
    profile_name = os.environ.get("PROFILE_NAME", "").strip()
    out_path = os.environ.get("OUT_PATH", "").strip()
    for name, value in (
        ("ASC_KEY_ID", key_id),
        ("ASC_ISSUER_ID", issuer),
        ("ASC_KEY_PATH", key_path),
        ("BUNDLE_ID", bundle_id),
        ("PROFILE_NAME", profile_name),
        ("OUT_PATH", out_path),
    ):
        if not value:
            die("%s is empty." % name)

    token = make_token(key_id, issuer, key_path)

    found = call(token, "bundleIds?filter[identifier]=%s&limit=200" % bundle_id)
    match = [b for b in found.get("data", []) if b["attributes"].get("identifier") == bundle_id]
    if not match:
        die(
            "No bundle id %s in this team. Create the App ID in the developer portal first."
            % bundle_id
        )
    bundle_pk = match[0]["id"]
    print("Bundle id %s -> %s" % (bundle_id, bundle_pk))

    certs = call(token, "certificates?filter[certificateType]=DISTRIBUTION&limit=200")
    cert_ids = [c["id"] for c in certs.get("data", [])]
    if not cert_ids:
        die("This team has no Apple Distribution certificate, so no App Store profile can exist.")
    for c in certs.get("data", []):
        print(
            "Distribution certificate: %s (expires %s)"
            % (c["attributes"].get("name"), c["attributes"].get("expirationDate"))
        )

    # Any existing profile under this name is deleted rather than reused. A
    # profile is a frozen snapshot of the App ID's capabilities at the moment it
    # was issued, so reusing one is how a build silently loses an entitlement it
    # is supposed to carry. Recreating costs one API call and cannot go stale.
    existing = call(token, "profiles?limit=200")
    for p in existing.get("data", []):
        if p["attributes"].get("name") == profile_name:
            print("Deleting the previous %s profile so capabilities are picked up." % profile_name)
            call(token, "profiles/%s" % p["id"], method="DELETE")

    created = call(
        token,
        "profiles",
        method="POST",
        body={
            "data": {
                "type": "profiles",
                "attributes": {"name": profile_name, "profileType": PROFILE_TYPE},
                "relationships": {
                    "bundleId": {"data": {"type": "bundleIds", "id": bundle_pk}},
                    "certificates": {
                        "data": [{"type": "certificates", "id": i} for i in cert_ids]
                    },
                },
            }
        },
    )
    attrs = created.get("data", {}).get("attributes", {})
    content = attrs.get("profileContent")
    if not content:
        die("Apple accepted the profile but returned no profileContent.")
    blob = base64.b64decode(content)
    with open(out_path, "wb") as fh:
        fh.write(blob)

    uuid = plist_value(blob, "UUID")
    name = plist_value(blob, "Name")
    if not uuid:
        die("Could not read a UUID out of the profile Apple returned.")

    print("Created %s (%s), %d bytes" % (name, attrs.get("profileType"), len(blob)))
    print("Expires %s" % attrs.get("expirationDate"))
    # A profile that does not grant what the entitlements file asks for strips
    # it at signing, and nothing complains until the feature is dead in
    # production. Report what it actually carries.
    text = blob.decode("latin-1")
    for entitlement in ("aps-environment", "com.apple.developer.applesignin"):
        print("  %-34s %s" % (entitlement, "present" if entitlement in text else "MISSING"))
    print("UUID=%s" % uuid)
    print("NAME=%s" % (name or profile_name))


if __name__ == "__main__":
    main()
