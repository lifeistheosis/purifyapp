# The Christ edit: a ten second promo cut one-to-one to a template

His word, 2026-11-22 about 00:35 UTC (in the ad stage 1 chat), with a 9.9 second video saved from TikTok: "Okay, now I want you to make app promo with this exact style, but instead of people, do Christ. I want you to make it as one-to-one as possible with the template. And yeah, like if you need to crop out the icon, do the 3D of the icon going up with the effects, make it as one-to-one as possible with and matching the audio from effects to visuals to transitions, one-to-one. Let's do it."

His word on the first cut, about 00:52 UTC: "Use the audio from the second clip because that's the full audio, and also ensure it's one-to-one in every single aspect. For example, the part in the edit where it transitions the multiple faces, put like multiple icons of Christ and like showcase his face, and do that like effect with the faces where like kind of like blurs or warps. But yeah, like make it one-to-one with the edit. And I put you on max, so"

His word on the second cut, about 03:05 UTC: "Okay, so the edit in itself is perfect, but notice, like, what I want you to do is that for the first two sections, like where the two images of Christ come up, make it come up like how it comes up in the example video. So instead of just like floating up, it like is flat and then it stands up while also zooming in. Other than that, the video is perfect."

His word after that, about 03:27 UTC: "Also, I know in the example he used blue at the end. I want you to just use black or like a dark background, maybe like a glow. Just don't do blue though."

**Status, 2026-11-22 about 03:45 UTC: the second cut stands, with the two figures in the dome tipping and standing as the template's do and the end dark with a white glow, no blue; it waits for his yes or no.** 9.9 seconds, 594 frames, 1080 by 1920 at 60 frames a second, H.264. Nothing is posted. The full sound he sent at about 03:00 UTC is under the preview (see "The sound"). The files are out of git, in `.promo/v1.9-video/christ2/`, and are lost when the container goes; he has both.

The first cut was an HTML stage (`make.mjs`) timed by eye. It is at commit `646414ee8` with its own `assets.py` and `screens.mjs`. The second cut replaces it: the template was measured frame by frame, and the film is built from those measures.

## The template, measured

`template.json` holds every measure, in the template's own pixels and frames. The file he sent is a split screen: the upper half is a fan edit of a television character, the lower half someone's remake of it. The upper half is what is measured: 9.913 seconds, 297 frames at 30 a second.

| Frames | Seconds | What the template does |
|---|---|---|
| 0 to 19 | 0.00 to 0.63 | a black-and-white cut-out figure stands in a white dome on a starry black, then tips back whole, like a card hinged below it, until it lies nearly flat and is gone |
| 19 to 24 | 0.63 to 0.80 | the dome stands empty, growing |
| 24 to 43 | 0.80 to 1.43 | a second figure lies tipped back nearly flat at the foot of the dome and stands up whole, coming nearer as it stands, drawn out by its speed; it settles large |
| 44 to 53 | 1.47 to 1.77 | a white flash, fullest at frame 48 |
| 50 to 60 | 1.68 to 2.00 | a window opens over the figure, grows, and is flown through |
| 60, 76, 91, 105 | 2.00, 2.53, 3.03, 3.50 | four shots cut on the beat, each pushing in, each hit a flash; a word on each beat |
| 63, 78, 93, 108 | | three frames after each cut, one soft frame (a twitch), its word drawn out sideways |
| 121 to 150 | 4.03 to 5.00 | the fourth shot goes on, soft, and a window opens on the man's head and grows to fill the frame; in it a new face about every frame and a half, each melting into the next |
| 151 to 177 | 5.03 to 5.90 | one held shot with a question on it: it comes in soft, finds its focus slowly, and leaves in warm light |
| 178 to 205 | 5.93 to 6.83 | faces again, full frame, then the window shrinks back onto the head of the shot beneath |
| 206 to 207 | 6.87 to 6.90 | the shot beneath is drawn out sideways, brightening |
| 208 to 215 | 6.93 to 7.17 | the answer shot: grey, blown out, pulling back fast from the face |
| 216 to 234 | 7.20 to 7.80 | the same shot in colour, jumped up a little, finding its focus; the answer stands from frame 223 |
| 236 to 293 | 7.87 to 9.77 | the dome again, the same play 234 frames later, with cyan and blue light on it and its figures crisp |
| 294 to 296 | 9.80 to 9.90 | the first shot again, bright; the film loops |

How each was measured: the dome by fitting a circle to its edge; the figures by following the head, and their tipping by following head and shirt in the second dome's crisp frames and fitting a hinged card seen by a camera to them (half a pixel off on average); the flash by the frame's brightness; the window by its width; the cuts by eye and by brightness; each shot's push by matching points between frames with the words masked out; the faces' cuts by eye, frame by frame; the second dome's light by sampling fixed points and setting each beside the same point 234 frames earlier; every frame's brightness and sharpness.

## Ours

`edit.py` builds the film from `template.json`. Time is counted in the template's frames; the film is 1080 by 1920 at 60 frames a second. Motion is blurred as a camera blurs it: each frame is the mean of several moments within one template frame's time, never across a cut. The template's own picture is read as the middle band of the 9:16 frame.

| The template's | Ours | Why |
|---|---|---|
| the figure that stands first | Christ, cut whole with His halo from a late 19th century Pantocrator (`pantocrator19`) | a clear, bright panel that reads at once when small |
| the figure that rises | Christ, cut whole with His halo from the Sinai Pantocrator, the app's own icon | the app's icon is the one that fills the dome longest |
| the window, and the shot it opens into | the app's Today, flown through into the app | the promo's turn from Christ to the app is the template's own turn from the figure to its clips |
| shots 1 and 2 | the app's Today, then John 14 in the app's Bible with verse 6 above the word | his choice of "Icon details + app"; "the way" and "the truth" stand on the app |
| shot 3, its calmest | `pantocrator19`, head and shoulders | |
| shot 4, a hand thrown at the lens, pulling back | the blessing hand of the Vysotsky Pantocrator, pulling back to the whole icon | the same move |
| the first run of faces | a window opening on His face in that same shot, with eight icons of Him melting one into the next | his word: "put like multiple icons of Christ and like showcase his face" |
| the question shot | the Sinai Pantocrator | the question over the oldest icon of Him there is |
| the second run of faces | the same eight icons, full frame, then the window closing onto His face in the question shot | |
| the answer shot, grey then colour | a Pantocrator on a chased gold ground (`golden`) | gold, red and blue: the turn from grey to colour is seen at once |
| the second dome, lit in cyan and blue | the first again on black, with a soft white glow about the dome | his word: "just use black or like a dark background, maybe like a glow. Just don't do blue though" |

**The figures tip and stand as the template's do** (his word on the second cut; `tilt_of`, `figure_at`). The first cut-out tips back whole about a line far below the frame and sinks into the dome's shadow; the second lies tipped back about 64 degrees at the foot of the dome and stands up in twelve frames, its head small and squat at first and growing as it comes upright. Each is one flat picture turning as a card turns: the whole of it tips, and nothing in it moves against the rest. In the second dome each figure keeps the template's own clock there (`second_dome_clock`): it holds a frame and jumps, and the second figure is in sight a frame and a half sooner.

**The words are Scripture, word for word, held to the app's own Bible by the script** (his choice of "Scripture"): on the five beats "I am / the way / the truth / and / the life" (John 14:6); the question "But whom say ye that I am?" (Matthew 16:15); the answer "Thou art the Christ" (Matthew 16:16). They stand where and when the template's words stand: one line in the middle of the frame, capitals 42 pixels high, white turned over on the picture's own colour. The app's sans (his word on the ad's titles). Where each verse is found stands small above the name.

**The name** "Purify" stands small at the foot all through, where the template carries its maker's mark.

**The faces** (`FACES1`, `FACES2`, `plate`, `flow`, `melt`). Every icon is set with His eyes in the same place, so one face cuts and melts into the next in place. A melt is the two whole pictures laid over each other, each following the flow of pixels between them part of the way, soft in its middle. Nothing in a face is drawn or redrawn.

**The light.** The template is a dark film with its light on the face. An icon's gold ground is bright from edge to edge, so each icon shot has its light pooled on His face and let fall toward the edges (`pool`). One soft pool, never beams.

**The pictures** are in `pictures.json`: nine icons, each with what it is, where it is held, its page on Wikimedia Commons and where the film uses it. All are marked Public domain there. None is held in Greece or Italy, so none is on the heritage list. Only the Sinai Pantocrator is in the app. Two are late (`pantocrator19`, `golden`: unnamed Russian painters of the late 19th or early 20th century); the file says so. The app's screens show one picture, St Nicholas's icon on Today, which is not on the heritage list.

## Where ours is not the template's

Each of these is a choice, and each is his to overrule.

1. **A word never stands on His face.** The template's words stand on the man's chin and collar. Ours stand on His neck below His beard, or on His breast, and the picture is held by that point so the word stays there however near the shot comes. So His face sits higher in the frame than the man's does.
2. **The window opens on His breast, below His beard.** The template's opens on the man's face.
3. **Nothing in an icon is redrawn and nothing in it is made to move.** No lit eyes (the template lights the man's eyes in the question shot), no sunglasses, no gestures. An icon moves only whole; in the dome it tips whole, as a card.
4. **The end has no blue** (his word, 03:27 UTC). The template lights its second dome in cyan and blue: pools of cyan low at both sides, a teal and blue ring about the dome, blue coming up from the foot of the picture, cyan left at the edge of the flash, and that light on the last shot. Ours keeps the dark, the template's shapes and its times, and none of the colour: the ring is a soft white glow that grows as the template's ring grows, the dark still rises behind the second figure, the flash is white, and the last shot is the app as it is. A ring and no beams. Measured on the finished file: in the dome at the end, blue leads red and green by no more than 10 levels in 255 in any pixel. The app's own dark page keeps its own cool cast, in the window and in the last shot, as it has where it first comes. `template.json` keeps the template's light as it was measured.
5. **The question is set a little smaller** (capitals 35 high, not 42). At the template's size a line this long would run under the buttons of the apps it is posted in.
6. **Brightness.** The app's Bible page is black with fine letters, far darker than the template's second shot; its light is left on a little so it holds. The icon shots are still about one and a half times as bright as the template's shots after the pooled light. `edit.py ... luma` prints ours beside the template's for every frame.
7. **60 frames a second, not 30.** The second dome keeps the template's stepping, but not its few frames that are a blend of two: ours are crisp throughout that dome.

## The rules, and what no machine checked

`checkMock` reads a page, and this film is composed from pictures, so it cannot be run on it. The first cut passed it at eight moments; the second was looked at frame beside frame against the template and against the rules by eye:

- no rays: the lights are a disc, a ring, pools and whole-frame flashes;
- no four-point star: the points in the dark are round, and there is no star anywhere;
- no side stripe, no parchment, no em dash;
- the app's screens are the native export of main `6700c2e65`, a new reader with no Plus, Dark, Sunday 6 December 2026 (`screens.mjs`), and nothing of the interface is drawn;
- the words are asserted against `data/bible` every time the film is made.

## The sound

The template's song is a commercial recording and is not cleared.

- `purify-christ-edit.mp4`: the **silent master**. This is what is posted, with the sound added inside TikTok or Instagram from the app's own library.
- `purify-christ-edit-PREVIEW-not-for-posting.mp4`: the same picture with the template's sound, **for him to judge the sync only**. Never posted, never an ad, never on the store pages or the website.

The two video files he sent first were one file, byte for byte, and its music stops at about 4.7 seconds, where a voice goes on alone. On 2026-11-22 about 03:00 UTC he sent the sound itself, an MP3 saved from TikTok (9.64 seconds), with the word: "replace with this audio".

It is the same recording at the same speed. Set against the template's own sound, sample by sample, it matches at 0.95, and its first sample falls 0.0891 seconds into the film. `edit.py ... sound <file> 0.0891` lays it there under the film already rendered and pads it with silence to the film's length; the picture is not touched. Measured afterwards: the template's music sits in the preview exactly where it sits in the template (0.0 milliseconds off at 0.2, 2.0 and 3.4 seconds). The music dies away between about 8.9 and 9.5 seconds, so the film's last 0.4 seconds are silent, as the sound itself is.

## Making it again

```
pip install rembg opencv-python-headless fonttools brotli
# the pictures: fetch each page in pictures.json at the width it names into <work>/raw/<name>.jpg
python3 docs/plans/v1.9/video/release/christ-edit/assets.py . .promo/v1.9-video/christ2      # working copies, eye marks, the two cut-outs, the font
node docs/plans/v1.9/video/release/christ-edit/screens.mjs christ2                            # the app's screens; needs the export in out/ (../../ad/README.md)
export TEMPLATE_FRAMES=<a folder of the template's upper half, one 0000.jpg a frame>           # only for the comparisons
python3 docs/plans/v1.9/video/release/christ-edit/edit.py . .promo/v1.9-video/christ2 big <name> 208 212 216 223   # ours beside the template's
python3 docs/plans/v1.9/video/release/christ-edit/edit.py . .promo/v1.9-video/christ2 strip <name> 364 380         # the film's own frames in a row
python3 docs/plans/v1.9/video/release/christ-edit/edit.py . .promo/v1.9-video/christ2 luma                         # brightness and sharpness, ours beside the template's
python3 docs/plans/v1.9/video/release/christ-edit/edit.py . .promo/v1.9-video/christ2 render [sound file [offset]] # every frame, then the files (about eight minutes on four cores)
python3 docs/plans/v1.9/video/release/christ-edit/edit.py . .promo/v1.9-video/christ2 sound <sound file> 0.0891          # a new sound under the film already made
python3 docs/plans/v1.9/video/release/christ-edit/edit.py . .promo/v1.9-video/christ2 frames 0 120                       # some frames again after a change to one part
python3 docs/plans/v1.9/video/release/christ-edit/edit.py . .promo/v1.9-video/christ2 encode <sound file> 0.0891         # the files again from the frames
```

The cut is the tables in `edit.py`: `SHOTS` (each shot's picture, the point held, its push, blur and flash by the template's frame), `FACES1` and `FACES2` (the icons in each run and how near), and the word tables. The template's file is not in the repository: it is someone else's video.
