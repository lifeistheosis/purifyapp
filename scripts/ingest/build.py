"""Build verbatim work JSON from public-domain sources.

Reads scripts/ingest/manifest.json, pulls the named paragraph slices out of
pages already downloaded by fetch.sh, and writes data/saints/{saint}/{work}.json.

Every section written here is voice="saint": the Father's own words in a
public-domain translation, quoted exactly. Editorial context lives in
`framing`, which the reader sees in a labelled band and which the JSON-LD
attributes to Purify, never to the saint.

The build refuses to write when the extractor's residue check finds printed
apparatus (Greek glosses, manuscript variants, the editor's initials) still
embedded in the text. Shipping those as a Father's words is exactly the
failure this corpus exists to avoid.

Run:  python scripts/ingest/build.py [--force]
"""
import json
import pathlib
import sys

import ccel

ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = pathlib.Path(__file__).parent / ".cache"
MANIFEST = json.loads((pathlib.Path(__file__).parent / "manifest.json").read_text("utf8"))

force = "--force" in sys.argv
problems, written = [], 0

for key, spec in MANIFEST.items():
    if key.startswith("_"):
        continue
    saint, work = key.split("/")
    sections = []
    # Scoped per work: one bad source must block only its own file, not
    # whichever works happen to be built after it.
    faults = []

    for s in spec["sections"]:
        page = CACHE / (s["url"].rsplit("/", 1)[-1])
        if not page.exists():
            faults.append(f"{key} #{s['n']}: not fetched ({page.name})")
            continue

        paras = ccel.paragraphs(ccel.read(str(page)))
        lo, hi = s["paras"]
        chosen = paras[lo:hi]
        if not chosen:
            faults.append(f"{key} #{s['n']}: slice {lo}:{hi} is empty of {len(paras)}")
            continue

        for p in chosen:
            for flag in ccel.residue(p):
                faults.append(f"{key} #{s['n']}: {flag} in '{p[:60]}...'")

        sections.append({
            "n": s["n"],
            "title": s["title"],
            "voice": "saint",
            "framing": s["framing"],
            "citation": s["citation"],
            "paragraphs": chosen,
        })

    doc = {
        "saint": saint,
        "slug": work,
        "title": spec["title"],
        "subtitle": spec.get("subtitle"),
        "source": spec["source"],
        "sections": sections,
    }

    problems.extend(faults)
    if faults and not force:
        print(f"skipped {key}: {len(faults)} problem(s)")
        continue

    out = ROOT / "data" / "saints" / saint / f"{work}.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", "utf8")
    words = sum(len(" ".join(x["paragraphs"]).split()) for x in sections)
    print(f"wrote {out.relative_to(ROOT)}  {len(sections)} sections, {words} words")
    written += 1

if problems:
    print(f"\n{len(problems)} problem(s):")
    for p in problems[:25]:
        print("  -", p)
    if not force:
        print("\nnothing written. inspect, fix the extractor, or re-run with --force")
        sys.exit(1)
print(f"\n{written} work(s) written")
