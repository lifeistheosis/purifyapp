# Audio provenance — v9.9 submission audit (2026-06-12)

Every audio file bundled under `public/audio/` was audited for documented
distribution rights ahead of the App Store submission. Policy applied:
**a track ships only if its source and license are documented here.**

**Amended 2026-10-16 (1.7, Chants), the owner's decision:** a track ships only
if its source is documented here and either its licence is documented (a
licence, public domain, or our own recording) or it is recorded here, in the
Chants section below, as **not licensed** by the owner's decision of
2026-10-16. He chose to carry the popular, widely reposted chant recordings,
avoiding the choirs whose own recordings they are known to be, and took the
risk knowingly ("this is a risk I am willing to take ... it's more of a
tradition"). No row here may ever state a licence that does not exist. Each
such recording streams and never ships inside the apps (`public/audio/chants/`
is set aside by `scripts/native-build.mjs`, and since 1.8 a recording is kept
in Purify's bucket instead, below), credits its performer where known, and can
be taken down from every installed app with one edit (its takedown line).

**Amended 2026-10-30 (1.8), the owner's decision on six recordings:** "Add all
6 now". The six chant recordings he downloaded on 2026-10-28
(`Homebase/boards/purify-master/r18/CHANTS-INTAKE.md`) go live, each credited
by name, and each is taken down with one edit if a choir objects. For these six
this overrides the rule of 2026-10-16 above of avoiding the choirs whose own
recordings they are known to be: five of them are (two of Eikona's, the Mount
Lebanon Orthodox Choir with Theodoros Vassilikos, the Choir of Beirut, and the
Beirut men's choir), and he chose to carry them anyway. They are not licensed,
and their rows say so. The rule of 2026-10-16 still stands for every recording
after these. On the same day, "R2, like the Bible audio": they play from
Purify's own bucket at audio.purifyapp.net, as the Bible read aloud does
(`lib/chants/media.ts`), and are not in the repository.

## Removed (no documented rights)

All three ambience tracks were removed from the repo and from
`AMBIENCE_TRACKS` in `lib/ambience/ambience.ts`. The ambience controller
hides itself while the catalogue is empty, so no dead UI remains.

| File | Shelf label (last) | Reason removed |
| --- | --- | --- |
| `public/audio/ambience/shadows-of-evil.mp3` | Evening Strings | Filename matches a Call of Duty: Black Ops III map; presumed commercial game soundtrack. No license on file. Copyright / store-review risk. |
| `public/audio/ambience/bo2.mp3` | Still Orchestra | Filename matches Call of Duty: Black Ops II; presumed commercial game soundtrack. No license on file. Copyright / store-review risk. |
| `public/audio/ambience/campfire.mp3` | Campfire | Likely a generic fire-crackle loop, but no source or license is documented anywhere in the repo. Removed under the same policy; lowest risk of the three and the best candidate for restoration. |

Also not shipping: `valley` (64MB source, already excluded via
`.gitignore` long before this audit; never in the bundle).

## Retained

| File | What it is | Rights basis |
| --- | --- | --- |
| `public/audio/ambience/rain.mp3` | Ambience (1.7): Rain | "Rain against the window" by cori, PDSounds record 600, **public domain**. Source: https://commons.wikimedia.org/wiki/File:Rain_against_the_window.ogg (licence on that page). Acquired 2026-10-15; a 50 s loop cut from it by Homebase/tools/tts-bakeoff/ambience.py. |
| `public/audio/ambience/birds.mp3` | Ambience (1.7): Morning birds | "Reggelirigók" (morning thrushes) by Ödönke, **public domain**. Source: https://commons.wikimedia.org/wiki/File:Reggelirig%C3%B3k.ogg (licence on that page). Acquired 2026-10-15; a 60 s loop cut from it by the same script. |
| `public/audio/ambience/peal.mp3` | Ambience (1.8): Cathedral bells | "St. Nicholas Cossack Cathedral church bells chiming" (the bells of St Nicholas Cossack Cathedral, Omsk) by Zabuhailo, **CC0** (Freesound 178648). Source: https://commons.wikimedia.org/wiki/File:St._Nicholas_Cossack_Cathedral_church_bells_chiming_-_Zabuhailo.ogg (licence template `cc-zero` on that page, read 2026-10-21). Acquired 2026-10-21 under the owner's "start doing the ambiance"; a 60 s loop cut from it by Homebase/tools/tts-bakeoff/ambience18.py. |
| `public/audio/ambience/sea.mp3` | Ambience (1.8): The sea | "On a pebble beach" by earthcalling, **public domain** (PDSounds 343; templates `PD-pdsounds.org`, `PD-author`). Source: https://commons.wikimedia.org/wiki/File:On_a_pebble_beach.ogg, read from the page's own MP3 transcode. Acquired 2026-10-21; a 30 s loop by the same script. |
| `public/audio/ambience/wind.mp3` | Ambience (1.8): Wind | "Killiney Hill Storm Floris 20250804 1537" by Karlunun, **CC0** (own work; template `self|cc-zero`). Source: https://commons.wikimedia.org/wiki/File:Killiney_Hill_Storm_Floris_20250804_1537.ogg. Acquired 2026-10-21; a 45 s loop from its first 56 s, leaving out the two hard gusts near its end. |
| `public/audio/read/` (every file) | Read-aloud (1.8): the Bible read aloud, one `<book>/<chapter>.mp3` for every chapter made so far, each with its verse timings in the `.json` beside it. In 1.8 the New Testament, 260 chapters (John 1, the demo reading of 1.7, among them, made again with the rest). | **First-party**: synthesised from 2026-10-20 by Homebase/tools/tts-bakeoff/read_bible.py with the Kokoro-82M model (Apache-2.0, github.com/thewh1teagle/kokoro-onnx, voice af_heart, the owner's pick of 2026-10-20) reading the app's own Bible text (the KJV for the New Testament, public domain), and encoded by publish_read.py from lossless masters kept outside the repo. No outside recording. The recordings play from Purify's own Cloudflare R2 bucket at audio.purifyapp.net (1.8, `lib/readAloud/chapters.ts`), uploaded by Homebase/tools/r2/upload.mjs, and are not in the repository; the timings and the list stream from the website, and `public/audio/read/` is set aside from the apps by `scripts/native-build.mjs`. |
| `public/audio/ambience/bell.mp3` | Ambience (1.7): Bell and stillness | **First-party**: synthesised by Homebase/tools/tts-bakeoff/ambience.py on 2026-10-15 (a quiet room and a bell struck twice a minute). No outside material. |

## Chants (1.7): recordings the owner sends, not licensed

Every chant recording, one row each: the Anthem's three under
`public/audio/chants/`, on the website, and every one since in Purify's bucket
on Cloudflare R2 (1.8, the owner's word of 2026-10-30), named by its address
there. None is in the apps' bundle, and none since the Anthem's is in the
repository. **Takedown:** move the recording's `<slug>/<id>` from `live` to
`pulled` in `public/audio/chants/live.json` and push the website; every app
stops offering it within minutes (`lib/chants/live.ts`), with no store
release, and the website stops with it. A bucket recording can also be
deleted from the bucket, which the list does not need. The data test
(`lib/chants/__tests__/data.test.ts`) fails if a chant recording has no row
here, if a row's last cell is not its own takedown line, or if a row in this
section names any licence other than none.

| File | Chant and version | Where it came from | Performer | Licence | Received | Decision | Takedown |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `public/audio/chants/prayer-rope-anthem/en.mp3` | The Prayer Rope Anthem, English | Not recorded. Until 1.7 this file was `public/audio/prayer-rope-anthem.mp3`, and its row here called it a first-party Purify production with an open action for the owner to confirm, which was never closed; nothing in the repo says who made the recording. Recorded here as not licensed until he says otherwise. | not known | none | in the repo since 2026-06 or earlier | owner's decision 2026-10-16; **owner to confirm the source** | `prayer-rope-anthem/en` |
| `public/audio/chants/prayer-rope-anthem/fr.mp3` | The Prayer Rope Anthem, French | Shared with its synchronised words by BOX on the Purify Discord (the Alpha v9.6 patch note of 2026-06-08 and the code's own comment say so). Until 1.7 `public/audio/prayer-rope-anthem-fr.mp3`, wrongly called first-party here. | not known (shared by BOX) | none | in the repo since 2026-06 or earlier | owner's decision 2026-10-16; **owner to confirm the source** | `prayer-rope-anthem/fr` |
| `public/audio/chants/prayer-rope-anthem/ar.mp3` | The Prayer Rope Anthem, Arabic | Shared by Silouan on the Purify Discord, as a link (the Alpha v9.6 patch note of 2026-06-08 and the code's own comment say so). Until 1.7 `public/audio/prayer-rope-anthem-ar.mp3`, wrongly called first-party here. Its words are an automatic transcription, not yet checked. | not known (shared by Silouan) | none | in the repo since 2026-06 or earlier | owner's decision 2026-10-16; **owner to confirm the source** | `prayer-rope-anthem/ar` |
| `https://audio.purifyapp.net/chants/psalm-117/ar.mp3` | Psalm 117, Arabic | YouTube: "Psalm 117 (Arabic) - Give thanks to the Lord", with its Arabic title beside it, uploaded by ܝܘܣܦ ܓܘܪܓܝܣ (@user-wf1kl6dy3h) on 2016-08-09, 5:56 (https://www.youtube.com/watch?v=o3LLR8zPvVk). YouTube's music panel on that page names the track "Ihmadou Al Rab" by Choir of Beirut, from the album "Psalms - مزامير". | Choir of Beirut | none | 2026-10-28 | owner's decision 2026-10-30 ("Add all 6 now") | `psalm-117/ar` |
| `https://audio.purifyapp.net/chants/paschal-canon/en.mp3` | The Paschal Canon, English | YouTube: "The Paschal Canon", uploaded by Orthodox Christian Chants on 2017-04-27, 29:19, described "Chanted by Eikona" (https://www.youtube.com/watch?v=FgzUkaaMB1I); YouTube's music panel names its parts as Eikona's Ode 1 and Odes 3 to 9. Both notes the owner filed (beside this recording and beside the Arabic Psalm 135) link this upload. | Eikona | none | 2026-10-28 | owner's decision 2026-10-30 ("Add all 6 now") | `paschal-canon/en` |

The Anthem's cover, `public/audio/art/anthem.jpg`, is a square crop of St
Andrei Rublev's Holy Trinity (Commons, File:Angelsatmamre-trinity-rublev-1410.jpg,
public domain; the shop carries the same picture, `docs/licensing/SHOP_MEDIA.md`).
It stays in the bundle.

## Restoring the ambience shelf

Restored in 1.7 (2026-10-15) with the three tracks in the table above. The
old floating ambience controller was retired; ambience now lives in the
reader's settings (components/bible/ReaderSettingsMenu.tsx) and plays through
lib/ambience/player.ts. The steps below still apply to any track added.

1. Source tracks with explicit licenses (CC0 / purchased license /
   first-party recordings). Freesound CC0 and paid library loops both
   qualify; "found on YouTube" does not.
2. Record each track in the Retained table above: file, source URL,
   license, date acquired, proof (receipt or license text) location.
3. Re-add entries to `AMBIENCE_TRACKS`; the controller reappears
   automatically.
4. Keep files under ~5MB or host externally (see the `valley` note in
   `lib/ambience/ambience.ts`).
