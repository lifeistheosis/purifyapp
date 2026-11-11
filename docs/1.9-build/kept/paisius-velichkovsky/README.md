# St Paisius Velichkovsky's portrait, cut and waiting (2026-11-11)

`paisius-velichkovsky.v2.jpg` is the app's cut (315 by 420, 3:4, mozjpeg at 85) of the one
old portrait of St Paisius on Wikimedia Commons, `File:Paisius.jpg`: an old monk with a long
white beard and grey hair to his shoulders, in a tall black kamilavka and a black habit, his
hands at his breast holding a prayer rope, on a dark ground, with a caption in Church
Slavonic. It was cut from the 1280-pixel copy.

Why it is here and not on his page: its Commons page gives it as public domain
(PD-old-100), but its source is only "English Wikipedia", and it names no painter and no
date. In November the arbiter held it back for that ("names no painter or date, so it waits
until they are found", `lib/saints/iconRights.ts`). It was cut under his word of 2026-11-11
("each saint's oldest picture where no old icon of him exists, public domain") and then
taken back out of the commit before the push, because nothing new had been found about
it; the question is with the arbiter again. A Google Arts and Culture record found on the
way ("Saint Paisius Velichkovsky or Wieliczkowski", 1730/1810) is a small bronze and enamel
travelling icon in the Museo de Artes of the Universidad de los Andes, Santiago, not this
portrait.

If the answer is yes, it goes back as it was: the file to `public/saints/icons/`, his
`iconUrl` in `lib/saints/saints.ts`, its row in `ICON_RIGHTS` (status verified, the
Commons page as evidence, painter and date "not given"), and
`node --experimental-strip-types scripts/emit-saint-briefs.mjs`. If it is no, it stays
here, as the Vault asks: nothing made is deleted.
