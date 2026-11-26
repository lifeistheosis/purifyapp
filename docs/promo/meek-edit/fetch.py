"""Fetch what the edit is made from, into .promo/meek-edit/ (out of git), and check it.

  python fetch.py

The pictures (art.json), the house faces from their open-licence packages, and
the app's own narration of John 18. Every file is held to the checksum it had
when the edit was made; a file that differs is refused, never used.
"""
import hashlib, json, os, subprocess, sys, tarfile, tempfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
ROOT = os.environ.get("MEEK_WORK") or os.path.join(REPO, ".promo", "meek-edit")
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"}

NARRATION = ("https://audio.purifyapp.net/read/john/18.mp3", "aud/john_18.mp3",
             "93c8a57654384f153df152a455fcbe0a5b329c0c22f7eeca3ae4e0c0e9efc752")
FACES = [  # (package, file inside it, sha256 of that file, the name it is kept under)
    ("@fontsource/dm-serif-display@5.2.5", "files/dm-serif-display-latin-400-normal.woff2",
     "8b0ceabdff07806ce949c228d047d0824bca1bec4c3c3f83ac2cd077a24e55e5", "DMSerifDisplay-Regular.ttf"),
    ("@fontsource/dm-sans@5.2.5", "files/dm-sans-latin-500-normal.woff2",
     "720546bd1109304dfb6076e22b74c2afeaca0b38c819d019eccb1a2e91e6f0be", "DMSans-Medium.ttf"),
    ("@fontsource/lora@5.2.5", "files/lora-latin-500-normal.woff2",
     "800add27cb95a3c2cd75af11c93352a16023aee109c5c979c56bfae3f3f999c2", "Lora-Medium.ttf"),
]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()

def keep(rel, data, want):
    got = sha(data)
    if got != want:
        sys.exit(f"refused: {rel} is not the file the edit was made from ({got} != {want})")
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    print("ok", rel)

def main():
    for p in json.load(open(os.path.join(HERE, "art.json"))):
        rel = f"src/{p['file']}"
        if os.path.exists(os.path.join(ROOT, rel)) and sha(open(os.path.join(ROOT, rel), "rb").read()) == p["sha256"]:
            print("ok", rel, "(already here)")
            continue
        keep(rel, get(p["source"]), p["sha256"])
    url, rel, want = NARRATION
    keep(rel, get(url), want)
    from fontTools.ttLib import TTFont  # pip install fonttools brotli
    with tempfile.TemporaryDirectory() as tmp:
        for pkg, inner, want, name in FACES:
            subprocess.run(["npm", "pack", pkg, "--silent", "--pack-destination", tmp], check=True, capture_output=True)
            tgz = [f for f in os.listdir(tmp) if f.endswith(".tgz") and pkg.split("/")[1].split("@")[0] in f][0]
            with tarfile.open(os.path.join(tmp, tgz)) as t:
                data = t.extractfile("package/" + inner).read()
            if sha(data) != want:
                sys.exit(f"refused: {pkg} {inner} differs from the face the edit was made with")
            src = os.path.join(tmp, os.path.basename(inner))
            open(src, "wb").write(data)
            font = TTFont(src)
            font.flavor = None
            os.makedirs(os.path.join(ROOT, "fonts"), exist_ok=True)
            font.save(os.path.join(ROOT, "fonts", name))
            print("ok", "fonts/" + name)

if __name__ == "__main__":
    main()
