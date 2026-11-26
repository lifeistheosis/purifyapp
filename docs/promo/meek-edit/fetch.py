"""Fetch what the edit is made from, into .promo/meek-edit/ (out of git), and check it.

  python fetch.py

The pictures (art.json), the two faces from their open-licence packages, and
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
    ("@fontsource/comic-relief@5.3.0", "files/comic-relief-latin-700-normal.woff2",
     "138cf98c989b64ff955952473ee94ce505e1890675413a8061a6e608dee3ded8", "ComicRelief-Bold.ttf"),          # OFL 1.1
    ("@fontsource/permanent-marker@5.3.0", "files/permanent-marker-latin-400-normal.woff2",
     "4884fec2c73aa52a2461073c1b87d1ceb80f400520391b43f97ca7d3c39eeb24", "PermanentMarker-Regular.ttf"),  # Apache 2.0
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
