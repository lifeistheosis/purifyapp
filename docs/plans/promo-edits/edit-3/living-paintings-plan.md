# The whisper, 1:1: living paintings

His words (2026-11-25), sending reference 2 again: "copy this reference 1:1 this a style where it's a static art and they edit it so that it moves. do more research on this editing style and let's edit our version 1:1".

## What reference 2 really does (measured again)

The file he sent is byte for byte reference 2 (sha256 bf54926c...). Optical flow on it, a camera fitted to each 0.2 s and what moves apart from the camera measured: in most shots the camera hardly moves (zoom and pan near zero) while parts of the picture move by 2 to 47 pixels. The paintings themselves move: the woman at the start turns her head; the angel at 12 to 14 s tilts its head, breathes, its wing and hair move, and it comes toward the lens. Version 2 moved a camera over still paintings, so it missed the style's heart.

## The style

Image-to-video AI animates each still painting into a short clip (a few seconds): small natural motion (a head turns, breath, hair and cloth stir, eyes move) and a slow camera move; the edit then cuts those living clips like coverage of a scene, with crush and develop between paintings, the stare into the lens, the angels under black frames. Reference 2 is a CapCut export; CapCut's own image-to-video (Dreamina) and Kling are the usual tools. The makers' own advice: subtle motion; large gestures break a painting's identity and it reads as a video with painted textures (Kling's painting page).

## What would be made

Version 2 rebuilt 1:1: its paintings, each animated once (one clip of 5 s per painting, about 12 clips), cut on every beat and every hi-hat as now, its crush and develop, the Mother's stare on the drop, the Child's stare near the end, the angels, the card.

Guardrails: only Western paintings are animated. An icon is never redrawn (CLAUDE.md), so Our Lady of Vladimir is not animated: it stays still or gives its place to a Western painting. Every clip is checked frame by frame and thrown out if a face changes (Christ, the Mother, the Child). Prompts ask for steady camera moves; the cuts stay on the beats (no bounce).

## Cost (Higgsfield's own quotes, 2026-11-25)

- Kling 3.0 standard, 5 s, no sound: 7.5 credits a clip. Pro (higher quality): 8.75 a clip. About 12 clips: 90 to 105 credits; with retries for faces that change, about 120 to 140.
- Seedance 2.5 at 1080p: 80 credits a clip, about 1,000 for the set.
- The Higgsfield account holds 0 credits on the free plan, so credits would have to be bought first.
- Without AI, a hand-built 2.5D move (figures cut out and moved at their own depth) costs nothing but no face turns or breathes: it would not be 1:1.

## His choice, and what was made

He chose "No AI, free 2.5D" over every paid model. So nothing was generated and no credit spent. `depth_maps.py` estimates each painting's depth once with Depth Anything V2 Small (Apache-2.0, run on the CPU with onnxruntime) and saves it beside the paintings (`.promo/edit-3/raw/depth/`). The whisper (`whisper.py`, `depth_move`) now moves through each painting in depth on every shot: half of each shot's move is the camera's, the other half is depth, so what is near slides against what is far and the subject holds still, at a steady speed (up to 100 px across a full step of depth on a slide, 15% on a push). Our Lady of Vladimir has no depth map: a depth move bends parts of a picture against each other, which would redraw the icon, so it keeps a plain camera move. Every cut on the beats and the hats stays where it was.

## His picks and his rule (2026-11-25)

His words: "Don't use 2, don't use 3, don't use 4, don't use 6, don't use 7, don't use 9, don't use 10. Make sure there's no Roman Catholic schismatic saints that the East doesn't accept. And make sure there's no Roman Catholic theology like the adoration."

Kept from the first sheet: 1 Ribera (Saints Anne and Catherine of Alexandria are saints of the undivided Church, venerated in the East; Catherine kisses the Child's hand, no ring, so not the Western "mystic marriage"), 5 Caravaggio (Peter's denial, Matthew 26), 8 Zurbarán's Crucifixion (the title in three tongues, John 19:20; four nails, as the Orthodox icon has them), 11 Berlinghiero (a Hodegetria in the Byzantine manner, a plain camera move as for an icon). Out: Murillo, the Young Virgin, El Greco's Adoration, Emmaus, Rembrandt's Head of Christ, both Bellinis. The angels at the end came from two of those, so the ending needs new angels.

The second sheet (12 to 22, `.promo/edit-3/choose/whisper-paintings-2.jpg`, The Met, European Paintings, public domain) holds Gospel scenes only, chosen by the rule: nothing titled or composed as an Adoration (a Western Nativity of the Virgin kneeling before the Child on the ground follows the vision of Bridget of Sweden, a saint after the schism, and was left out), no Immaculate Conception, Sacred Heart, Assumption, Coronation, Eucharistic host or rosary, no saint the East does not share, no penitent Magdalen. Named to him: Champaigne's Annunciation (13) has a shaft of light toward the Mother, which the no-rays rule would crop round or leave out.

His next word: "22 19 20 change" (asked which he meant: "Replace those three"). So the three Lamentations by Pulzone, Ludovico Carracci and Morales are out, and the set stands at 1, 5, 8, 11, 12 to 18 and 21. A third sheet (`.promo/edit-3/choose/whisper-paintings-3.jpg`, 23 to 28) offers Gospel moments in their place, none a Lamentation: Ribera's Tears of Saint Peter (Matthew 26:75; it follows the denial), Rembrandt's and Luti's Woman of Samaria (John 4), El Greco's Christ Healing the Blind (John 9), Gossart's Christ Carrying the Cross, Juan de Flandes's Marriage at Cana (John 2).

His next word: "24 27 25 28 replace". Kept from the third sheet: 23 (Ribera, The Tears of Saint Peter) and 26 (El Greco, Christ Healing the Blind). The set stands at 1, 5, 8, 11, 12 to 18, 21, 23, 26 (14 paintings). A fourth sheet (`whisper-paintings-4.jpg`, 29 to 32): Poussin's Agony in the Garden (night, angels), Caracciolo's Calling of Saint Matthew (Matthew 9:9), Mattia Preti's Saint John the Baptist Preaching, Raphael's Agony in the Garden. Named to him: in Raphael's the angel brings a chalice, which Western painters often show with the host; it is checked close before it is used.

His last pick: "31 is good". **The set, final (15):** 1 Ribera (Holy Family with Saints Anne and Catherine), 5 Caravaggio (Denial of Peter), 8 Zurbarán (Crucifixion), 11 Berlinghiero (Madonna, plain camera move), 12 Luca Giordano (Annunciation), 13 Philippe de Champaigne (Annunciation; crop round the shaft of light), 14 Carlo Maratti (Flight into Egypt), 15 Luca Giordano (Flight into Egypt), 16 Jacopo Bassano (Baptism), 17 Sébastien Bourdon (Baptism), 18 Domenichino (Lamentation), 21 Moretto (Christ in the Wilderness), 23 Ribera (Tears of Saint Peter), 26 El Greco (Christ Healing the Blind), 31 Mattia Preti (Saint John the Baptist Preaching). Files: `.promo/edit-3/raw/met/` (1, 5, 8), `raw/met_435658.jpg` (11), `raw/met2/<id>.jpg` (the rest; ids in pictures.json once used).

**The order, the Gospel in the song's phrases:** the build: the Annunciation twice, as two cameras on one scene (Giordano, then Champaigne); the break: the Mother and Child (Berlinghiero); the Flight into Egypt (Maratti, Giordano) into the pause. The drop: Ribera's Mother looking into the lens, the Holy Family widening (two phrases). Then the Forerunner preaching (Preti) and the Baptism (Bassano) into the song's stop; after it the Baptism again (Bourdon), the Wilderness (Moretto), and the blind man healed (El Greco) into the silence. The last part: Peter's denial and his tears (Caravaggio, Ribera); the Cross (Zurbarán); the Lamentation (Domenichino); the angels (Giordano's, Maratti's, Domenichino's) with black between them once a beat; the card. Every painting moves in depth but Berlinghiero's; every beat and hat a cut.
