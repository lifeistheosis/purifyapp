# Silver Night, Mist: every surface that takes the illustrations, and one prompt
# for each picture (his word, 2026-11-27: "make me designs for everything we will
# implement the photos to actually. we are going all in on design.").
# Writes PLAN.md (the record) and prompts.html (the page he copies from).
#   python3 -I docs/brand/art/prompts.py
import html, json, os
HERE = os.path.dirname(os.path.abspath(__file__))

def style(aspect):
    return ("Use the attached image as the style reference and match it exactly: black and grayscale only, near-black silhouettes, "
            "pure neutral white light with soft halos, layered mist, soft airbrushed gradients like a modern animated film, gentle grain. "
            f"{aspect}. Scene: ")
END = " Keep the subject large and clear, with the bottom third darker and simpler. No color or warm tint, no gold, no sparkles, no faces, no captions."
END_EMPTY = " Leave plenty of dark empty space around one small, quiet subject. No color or warm tint, no gold, no sparkles, no faces, no captions."

SURFACES = [
 {"key":"sections","name":"Section mastheads","aspect":"16:9","where":"The head of Bible, Prayers, Discover, Reading and You, and Today's picture (components/mobile/SectionMasthead.tsx, lib/media/sections.ts).","note":"Made: Reading. Each is the first thing a section shows, so each names the place at a glance.",
  "items":[
   ("Today","A monk high in an open bell tower at sunrise, seen from behind, pulling the ropes of several bells, the valley far below filled with mist and the first pale light on the horizon."),
   ("Bible","Two hands opening a large old book on a dark wooden table, a soft white glow rising from its pages and catching the dust floating in the air."),
   ("Prayers","A woman in a headscarf kneeling in prayer at the back of a dark, empty church, seen from behind, one hanging lamp glowing far ahead near the front."),
   ("Discover","Seen from high above: a monastery on a rocky headland wrapped in sea fog, its many domes and courtyards, a winding path down to a small harbor with one boat."),
   ("You","A person seen from behind on a window seat at night, a blanket over their shoulders and a prayer rope in their hand, looking out at snow falling over a sleeping town with one church dome."),
 ]},
 {"key":"onboarding","name":"Onboarding's answer cards","aspect":"4:3","where":"\"What are you looking for?\", the picture on each answer (lib/onboarding/pictures.ts). Saints, the Fathers, councils, history, beliefs and feasts take Discover's pictures; these five have their own.","note":"Made: Quiet, A daily rule. A reader's first look at Purify's art.",
  "items":[
   ("The Gospels","Four old leather-bound books standing upright together on a stone shelf, lit softly from one side, a small cross on each spine."),
   ("The Liturgy","Looking down the length of a church from the balcony: worshippers standing in rows as silhouettes, incense rising, and at the far end the open central doors glowing with candlelight, a priest in vestments standing there. Generic figures, not copied from any icon."),
   ("Study","A young person seen from behind, sitting cross-legged on a wooden floor surrounded by open books and loose notes, a small lamp beside them, a tall arched window with the night behind."),
 ]},
 {"key":"empty","name":"Empty states","aspect":"1:1","where":"What a page shows when it has nothing yet: bookmarks, the journal, search, offline, notifications.","note":"Made: Offline. Smaller and quieter than the doors: one subject and a lot of dark.",
  "items":[
   ("No bookmarks yet","A single loose ribbon bookmark lying on an empty wooden table in a soft round pool of light."),
   ("Journal, first page","A fountain pen resting on a blank page, its nib catching a soft light."),
   ("Search found nothing","A small rowing boat with a lantern drifting on a calm, misty lake at night, the far shore lost in fog."),
   ("No notifications","A small hand bell resting still on a wooden windowsill, snow falling softly outside."),
 ]},
 {"key":"email","name":"Email headers","aspect":"2:1","where":"The picture at the top of each letter to readers (lib/email/).","note":"Made: A new release, Where you left off. A reader sees one in their inbox before the app.",
  "items":[
   ("The first week","Seven flat stepping stones crossing a still pond toward a small chapel on the far bank, morning mist lying on the water."),
   ("The fasting companion","A monastery kitchen garden at first light, a monk kneeling among the rows of vegetables, mist rising from the soil, the monastery walls behind."),
 ]},
 {"key":"banners","name":"Today's banners","aspect":"21:9","where":"New banner looks a reader can choose on Today (public/themes/), beside the ones they have.","note":"Added as choices, never replacing a reader's own.",
  "items":[
   ("Monastery Coast","A long rocky coastline at night, small chapels strung along the cliffs, sea mist rolling in, a few windows lit."),
   ("Snow Domes","A snowy town at night seen from a hill: rooftops and several church domes under snow, smoke rising from chimneys, soft lit windows."),
   ("Desert Dawn","A desert at first light: dunes softened by mist, a small domed chapel beside a lone palm, a line of travelers with camels far away."),
 ]},
 {"key":"theology","name":"Theology's subjects","aspect":"4:3","where":"The four bands at the head of Theology (public/theology/subjects/). Today they are real icons.","note":"Made: The Last Judgment. These show each subject by its signs: no icon's composition is recreated.",
  "items":[
   ("The Holy Trinity","Three flames of equal height rising from a single oil lamp in a dark church, their light meeting in one soft glow."),
   ("The Mystical Supper","Close on two hands breaking a round loaf of bread above a cup on a wooden table, lit by one lamp, the room dark around them."),
   ("The Triumph of Orthodoxy","The great doors of a cathedral thrown open at dawn, the faithful pouring out onto the steps with lit candles, bells swinging in the tower above."),
 ]},
]

def prompt(s, scene):
    return style(s["aspect"]) + scene + (END_EMPTY if s["key"] == "empty" else END)

# PLAN.md
lines = ["# Silver Night, Mist: every surface, and a prompt for each picture","",
 "His word, 2026-11-27: \"make me designs for everything we will implement the photos to actually. we are going all in on design.\"","",
 "Every prompt is for Gemini with `ref/mist-reference.jpg` attached. The page to copy from is `prompts.html` (published as an artifact). What he has picked, and how each was checked, is `PICKED.md`; this file is written by `prompts.py`, so nothing is added to it by hand.","",
 "## Saints, yes; a specific icon, never","","His words, 2026-11-27: \"no recreations of holy icons by the way\", then \"no restrictions on making saints just no recreatings specific iconagraphy just generic depictions\". Saints and the clergy may be drawn as generic, unnamed figures; no prompt copies a particular icon's composition or a named saint's likeness, and a result that does is redone.","",
 "## What stays real","",
 "The saints' icons (`public/saints/`), the history pictures (`public/history/`), the authors' and councils' covers (`public/covers/`) and the prayers' service icons stay real: they are the content, and the editorial rules forbid invented artwork for the saints and history (`docs/editorial-standards.md`). The illustrations are for the places that lead to content: doors, mastheads, cards, empty states, letters and banners.","",
 "## The order","",
 "Discover's doors, then the mastheads, onboarding's cards, Plus, the empty states, the letters, the banners; Theology's four only at his word. Each picture comes to him before it ships, and each screen it lands on passes checkMock (a title over a picture still needs 4.5 to 1).","",
 "## How they go in","",
 "Each picture is saved as `public/art/<surface>/<name>` in AVIF and WebP, like the others, and takes the place of the old one in its map (DiscoverMobile's entries, `lib/onboarding/pictures.ts`, `lib/media/sections.ts`, the Plus pages). Each is recorded in `docs/licensing/SECTION_MEDIA.md` as Purify's own, made with Gemini. Discover's doors are 4:3 tiles while Discover shows wide bands today: his call on the layout comes first.",""]
total = 0
for s in SURFACES:
    lines += [f"## {s['name']} ({len(s['items'])}, {s['aspect']})","",f"Where: {s['where']} {s['note']}",""]
    for n, scene in s["items"]:
        lines += [f"**{n}**","","```",prompt(s, scene),"```",""]
        total += 1
open(os.path.join(HERE, "PLAN.md"), "w", encoding="utf-8").write("\n".join(lines))

# prompts.html
cards = []
for s in SURFACES:
    items = "".join(f'<article class="card"><div class="row"><h3>{html.escape(n)}</h3><button type="button" class="copy" data-i="{s["key"]}-{i}">Copy</button></div><p class="p" id="{s["key"]}-{i}">{html.escape(prompt(s, scene))}</p></article>' for i, (n, scene) in enumerate(s["items"]))
    cards.append(f'<section><div class="sec"><h2>{html.escape(s["name"])}</h2><span class="tag">{len(s["items"])} · {s["aspect"]}</span></div><p class="where">{html.escape(s["where"])}</p>{items}</section>')
page = f'''<title>Silver Night Prompts</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root{{--bg:#0B0B0C;--card:#151517;--line:#26262A;--fg:#E8E8EB;--muted:#9A9AA1;--accent:#D9D9DD;color-scheme:dark}}
@media (prefers-color-scheme: light){{:root:not([data-theme="dark"]){{--bg:#F6F6F7;--card:#FFFFFF;--line:#E2E2E6;--fg:#141416;--muted:#5C5C63;--accent:#26262A;color-scheme:light}}}}
:root[data-theme="light"]{{--bg:#F6F6F7;--card:#FFFFFF;--line:#E2E2E6;--fg:#141416;--muted:#5C5C63;--accent:#26262A;color-scheme:light}}
body{{background:var(--bg);color:var(--fg);font:15px/1.55 Inter,system-ui,sans-serif;margin:0}}
main{{max-width:760px;margin:0 auto;padding-block:28px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
h1{{font-size:28px;line-height:1.15;margin:12px 0 6px;text-wrap:balance}} .lede{{color:var(--muted);margin:0 0 18px}}
.ref{{width:100%;border-radius:18px;display:block;margin:0 0 8px}} .cap{{color:var(--muted);font-size:13px;margin:0 0 28px}}
section{{margin-top:34px}} .sec{{display:flex;align-items:baseline;justify-content:space-between;gap:12px}}
h2{{font-size:19px;margin:0}} .tag{{color:var(--muted);font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums}}
.where{{color:var(--muted);font-size:13px;margin:6px 0 12px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 14px 12px;margin-top:10px}}
.row{{display:flex;align-items:center;justify-content:space-between;gap:12px}} h3{{font-size:16px;margin:0}}
.copy{{min-height:44px;min-width:76px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--fg);font:600 14px Inter,system-ui,sans-serif;cursor:pointer}}
.copy:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}} .copy.done{{background:var(--accent);color:var(--bg)}}
.p{{color:var(--muted);font-size:13.5px;margin:8px 0 0;overflow-wrap:anywhere}}
</style>
<main>
<h1>Silver Night: round 3</h1>
<p class="lede">{total} pictures for Purify in the Mist style, one per place in the app. Attach the reference below to each in Gemini, then tap Copy. Saints are generic figures, never a copy of a specific icon. What is already made is named at the head of each part. All new scenes, chosen so the set does not repeat itself.</p>
<img class="ref" src="img/mist-reference.jpg" alt="The reference: a black Orthodox church silhouette with glowing windows under a full moon, in mist." width="2400" height="1792">
<p class="cap">The reference, from your first Gemini run.</p>
{"".join(cards)}
</main>
<script>
document.addEventListener("click",async(e)=>{{const b=e.target.closest(".copy");if(!b)return;const t=document.getElementById(b.dataset.i).textContent;
try{{await navigator.clipboard.writeText(t);}}catch(_){{const r=document.createRange();r.selectNodeContents(document.getElementById(b.dataset.i));const s=getSelection();s.removeAllRanges();s.addRange(r);}}
b.textContent="Copied";b.classList.add("done");setTimeout(()=>{{b.textContent="Copy";b.classList.remove("done");}},1600);}});
</script>
'''
open(os.path.join(HERE, "prompts.html"), "w", encoding="utf-8").write(page)
print(total, "prompts;", sum(1 for s in SURFACES), "surfaces")
