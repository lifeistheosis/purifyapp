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
 {"key":"discover","name":"Discover's doors","aspect":"4:3","where":"Discover, each door's picture (components/mobile/DiscoverMobile.tsx). Six of them also stand on onboarding's answer cards (lib/onboarding/pictures.ts shares them).","note":"Round 1 made eight; round 2 re-prompts six (the README). Saints is redone here because round 1 drew icon figures behind the candles; the other four are still to make.",
  "items":[
   ("Saints (redo: no icon figures)","Inside a dark Orthodox church, a tall stand of thin beeswax candles burning in rows, their flames the only light, a soft haze of incense, the walls behind lost in deep shadow with only the curves of arches showing."),
   ("Theology","Looking straight up into the dome of a dark Orthodox church, a ring of arched windows glowing white around it, the center softly lit, a thin veil of incense haze drifting across."),
   ("Calendar","A monastery on a mountain ridge in silhouette, mist filling the valley below, and across the night sky a gentle arc of the moon's phases from a thin crescent to full."),
   ("Walkthroughs","A lone pilgrim with a walking staff, seen from behind as a silhouette, on a winding path through misty hills toward a small distant chapel with one glowing window, under a full moon."),
   ("Chat","A long wooden table in a monastery refectory at night, candles along its length, people seated together on both sides as soft silhouettes, leaning in to talk, haze in the candlelight."),
 ]},
 {"key":"sections","name":"Section mastheads","aspect":"16:9","where":"The head of Bible, Prayers, Discover, Reading and You, and Today's picture (components/mobile/SectionMasthead.tsx, lib/media/sections.ts).","note":"Each is the first thing a section shows, so each names the place at a glance.",
  "items":[
   ("Today","First light over a sea of mist: a small monastery bell tower rising through it on a hill, a thin pale glow along the horizon, a fading crescent moon still in the sky."),
   ("Bible","An open Gospel book on a tall wooden stand in a dark church, its pages glowing softly, one beeswax candle beside it, incense haze drifting."),
   ("Prayers","A hand holding a single lit beeswax candle in a dark church, rows of candles softly blurred behind it, the flame's glow on the fingers."),
   ("Discover","The long nave of a great dark church seen from its entrance, arches receding into mist, pools of light under hanging lamps, open doorways on either side."),
   ("Reading","Towering shelves of old books in a monastery library at night, a wooden ladder leaning against them, one reading lamp glowing on a long table."),
   ("You","One person seen from behind, standing on a hill at night in a long coat, looking toward a distant church with glowing windows, a few stars above."),
 ]},
 {"key":"onboarding","name":"Onboarding's answer cards","aspect":"4:3","where":"\"What are you looking for?\", the picture on each answer (lib/onboarding/pictures.ts). Saints, the Fathers, councils, history, beliefs and feasts take Discover's pictures; these five have their own.","note":"A reader's first look at Purify's art.",
  "items":[
   ("The Gospels","A Gospel book with a cross on its cover, resting closed on a cloth-covered holy table in a dark church, one candle beside it."),
   ("The Liturgy","Inside an Orthodox church during the Liturgy, seen from the back: the carved wooden screen at the front glowing softly with candlelight, its panels in deep shadow, its central doors open to a soft light, a few worshippers standing as silhouettes, incense haze."),
   ("A daily rule","A quiet corner of a home at night: a hanging glass oil lamp glowing over a small wooden shelf that holds a prayer rope, a candle and a closed prayer book, the wall behind in shadow."),
   ("Quiet","A monk in silhouette sitting on a rock at the edge of a cliff above a sea of mist before dawn, a prayer rope in his hand, the sky still dark."),
   ("Study","A writing desk at night with stacked old books, an open manuscript, a quill and an inkwell, one candle burning, a window with the moon behind."),
 ]},
 {"key":"plus","name":"Purify Plus","aspect":"16:9","where":"The head of the Plus page and the kept-items sheet (components/premium/PlanScreen.tsx, components/billing/KeptPaywall.tsx).","note":"Plus is the whole library: depth, not a lock.",
  "items":[
   ("The whole library","A vast monastery library seen through an arched doorway, tall shelves rising into the dark, soft white light, a reading desk with an open book in the center."),
 ]},
 {"key":"empty","name":"Empty states","aspect":"1:1","where":"What a page shows when it has nothing yet: bookmarks, the journal, search, offline, notifications.","note":"Smaller and quieter than the doors: one subject and a lot of dark.",
  "items":[
   ("No bookmarks yet","A closed old book with a ribbon marker resting on a dark table in a soft round pool of light."),
   ("Journal, first page","An open blank notebook with a pen lying across it on a dark table, one candle beside it."),
   ("Search found nothing","A hand holding a lantern out over a misty path at night, the path fading into fog."),
   ("Offline","A small monastery on a cliff high above the clouds at night, far from everything, a few stars."),
   ("No notifications","A still bell hanging in a quiet belfry arch at night under the moon."),
 ]},
 {"key":"email","name":"Email headers","aspect":"2:1","where":"The picture at the top of each letter to readers (lib/email/).","note":"A reader sees one in their inbox before the app.",
  "items":[
   ("A new release","Dawn breaking over a wide sea of mist, the domes and crosses of a monastery rising through it, the first pale light along the horizon."),
   ("The first week","Stone steps leading up through mist to the open door of a small church, soft light inside."),
   ("Where you left off","An open book left on a stone windowsill at night, a ribbon marker across its page, the moon outside."),
   ("The fasting companion","A simple wooden table by a window at dusk with bread, olives and a cup of water, one candle burning."),
 ]},
 {"key":"banners","name":"Today's banners","aspect":"21:9","where":"New banner looks a reader can choose on Today (public/themes/), beside the ones they have.","note":"Added as choices, never replacing a reader's own.",
  "items":[
   ("Night Mist","A long horizon of misty hills with distant domes and crosses, a full moon low over them."),
   ("Monastery Ridge","A monastery strung along a cliff ridge above a sea of mist at night."),
   ("Candle Row","A long row of thin candles burning on a stand in a dark church, seen low and wide, incense haze."),
 ]},
 {"key":"theology","name":"Theology's subjects (his call)","aspect":"4:3","where":"The four bands at the head of Theology (public/theology/subjects/). Today they are real icons.","note":"His call: keep the real icons, or these, which show each subject by its signs alone: no icon is recreated, and Christ, the Trinity and the saints are never drawn.",
  "items":[
   ("The Holy Trinity","A bishop's three-branched candlestick with three crossed candles burning, raised in a dark church, incense haze around the flames."),
   ("The Mystical Supper","A long table spread with white cloth in a dark upper room, a loaf of bread and a chalice at its center under one hanging lamp, the benches empty."),
   ("The Last Judgment","The end of night: a great cross standing on a dark hill against the first light of dawn breaking along the horizon, mist below."),
   ("The Triumph of Orthodoxy","A procession at night seen from behind: the faithful as silhouettes carrying lit candles and a tall processional cross, walking toward a great church with glowing windows."),
 ]},
]

def prompt(s, scene):
    return style(s["aspect"]) + scene + (END_EMPTY if s["key"] == "empty" else END)

# PLAN.md
lines = ["# Silver Night, Mist: every surface, and a prompt for each picture","",
 "His word, 2026-11-27: \"make me designs for everything we will implement the photos to actually. we are going all in on design.\"","",
 "Every prompt is for Gemini with `ref/mist-reference.jpg` attached. The page to copy from is `prompts.html` (published as an artifact).","",
 "## No recreated icons","","His word, 2026-11-27: \"no recreations of holy icons by the way\". No prompt asks for an icon, an iconostasis's images, or a holy figure, and a result that shows one is redone. Scenes that would invite icons describe the panels as shadow or leave them out.","",
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
<h1>Silver Night: every prompt</h1>
<p class="lede">{total} pictures for Purify in the Mist style, one per place in the app. Attach the reference below to each in Gemini, then tap Copy. No prompt recreates a holy icon.</p>
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
