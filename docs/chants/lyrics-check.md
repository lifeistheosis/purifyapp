# The chants' words, checked line by line (build 93, 2026-11-11)

The owner, in his walk of build 93: "Oh yeah, also the lyrics on some of the
chants is wrong, so fix that." The arbiter's rule for it: every chant in
every language under `data/chants/timing/`, each line checked against what
the recording actually sings (a speech-recognition pass, run in our own
container with a free model, nothing uploaded anywhere) and against a
published text of that chant in that language (verbatim, cited); wrong lines
mended from the published text; any line that cannot be confirmed hidden, so
the recording still plays with the rest; the timings kept true to the words.

## How it was checked

- **The hearing.** Each recording was fetched from Purify's own bucket (or
  the app's own files for the Prayer Rope Anthem) and heard by Whisper
  large-v3 (`Systran/faster-whisper-large-v3`, int8, on this container's
  processor; nothing was sent anywhere), unprompted, in the version's
  language, so the model was never handed the words it was checking. First
  each printed line's own stretch of the recording, from its timing file and
  a quarter of a second either side, heard on its own. Where the chant's
  long notes left a short stretch with too little to go on (the model then
  writes things like "subscribe to the channel"), the whole recording was
  heard at once, each word with its time, and the words laid on the lines
  by time; for the Greek, also verse by verse and with voice detection on.
  Doubtful lines were heard again with each word's time. The tables give
  the best hearing of each line, as the model wrote it.
- **The published texts.** Each version names its own in its words-source
  line and in its chant's `sources`: Van Dyck's Arabic Bible (1865),
  the King James Version and the other public-domain English psalters in
  `docs/chants/psalm-135-english.md`, Brenton's Septuagint (1851), the
  Karadžić and Daničić Bible (1868) and Hapgood's Service Book (1906).
- **What is shown.** A line is shown when the recording sings its words and
  they are its printing's words verbatim. A refrain sung after every verse
  (the Alleluia, the "for his mercy endures for ever") is shown wherever it
  falls once the model has heard it in its own words in several of its
  repetitions: the model loses the rest in the long notes of the chant.
- **Two places with no printing.** The Prayer Rope Anthem is a song of our
  own time and no printed text of it is known: its English and French are
  shown because every line is heard as written. The Arabic Psalm 135's first
  verse and refrain are the Antiochian wording the owner took down beside
  the recording, and the model hears them word for word; no public-domain
  printing of that wording has been found. Both are named to the arbiter.
- **What is hidden.** Everything else: the nearest public-domain wording
  where the singers sing another (note 78's `nearest` lines), words a model
  heard only in part (note 78's `unsure` lines), and any line this check
  could not hear as printed. A hidden line keeps its place and its time in
  the data (`hidden`, with its reason), and reaches no reader: the page does
  not carry it and the timing file the app is given leaves it out
  (`lib/chants/timing.server.ts`, `servedTiming`). Words a listener confirms
  later lift it. `lib/chants/__tests__/lyricsCheck.test.ts` holds every
  verdict below.
- **Mended.** No line needed mending: where the singing and the printing
  differ, the singers sing another wording, not a slip in ours, and no
  public-domain printing has their words.

Still, as a reader meets it on the Android export: `docs/chants/lyrics-check/hidden-and-shown.png` (the Paschal Canon and the Arabic Prayer Rope Anthem with no line shown, and the Arabic Psalm 117 with its confirmed lines).

## The count

| Version | Shown | Hidden |
|---|---|---|
| The Prayer Rope Anthem, English | 24 | 0 |
| The Prayer Rope Anthem, Français | 24 | 0 |
| The Prayer Rope Anthem, العربية | 0 | 21 |
| Psalm 117, العربية | 30 | 18 |
| Psalm 135, العربية | 30 | 10 |
| Psalm 135, English | 90 | 14 |
| Psalm 135, Ελληνικά | 93 | 11 |
| Psalm 135, Srpski | 100 | 4 |
| The Paschal Canon, English | 0 | 53 |

No line was mended: where the singing and the printing differ, the singers sing another wording, not a slip in ours, and no public-domain printing has their words. Where the model writes a Serbian word in its other spelling (do vijeka for doveka), it is taken as the same word.

## The Prayer Rope Anthem's Arabic, and a reply for the Discord

The reader's report (the Discord, 2026-10-24): the Arabic words have wrong words and spellings, and the reader offers to write the correct ones. Where the Arabic came from: an automatic transcription of the recording (its own words-source line, and `docs/licensing/audio-provenance.md`), with no printed text of the anthem behind it; this check's model hears several lines as "subscribe to the channel" and "translation by Nancy Qanqar", a speech model's known inventions on Arabic music. It cannot be verified, so every Arabic line is hidden and the recording plays in full. A reply for Edgar to post, thanking the reader and asking for the words:

> Thank you for telling us about the Arabic words of the Prayer Rope Anthem. We have hidden them for now, so the recording still plays without wrong words on the screen.
> If you can, please send us the correct Arabic, line by line as it is sung, and we will check it against the singing and put it back.

When the words come, they are checked against the singing, laid on the timing with `scripts/chants/time-words.mjs`, and their lines lose `hidden`.

## The Prayer Rope Anthem, English (`prayer-rope-anthem/en`)
24 of 24 lines shown, 0 hidden.

| # | Shown | Printed | Heard by the model |
|---|---|---|---|
| 1 | yes | I will hold my prayer rope till I rise up to the sky, | I will hold my prayer up till I rise up to the sky. |
| 2 | yes | the prayer is so short, but strong and can defy. | The prayer is so short, but strong and can defy. |
| 3 | yes | As I say the prayer more, my enemy will lose the war. | As I say the prayer more, my enemy will lose the war. |
| 4 | yes | The prayer I say at first you will hear in every place: | The prayer I say at first you will hear in every place. |
| 5 | yes | Most Holy Trinity, save us all by Thy grace. | Most holy Trinity, save us all by Thy grace. |
| 6 | yes | As I say the prayer more, my enemy will lose the war. | As I say the prayer more, my enemy will lose the war. |
| 7 | yes | I will say out loud again the second prayer that will be: | I will say out loud again the second prayer that will be, |
| 8 | yes | Lord Jesus Christ, have mercy on me. | Lord Jesus Christ, have mercy on me. |
| 9 | yes | As I say the prayer more, my enemy will lose the war. | As I say the prayer more, my enemy will lose the war. |
| 10 | yes | Third prayer I say out loud is to the Mother of our God: | Third prayer I say out loud is to the Mother of our God. |
| 11 | yes | Most Holy Theotokos, save us all. | Most holy Theotos the Apostle. |
| 12 | yes | As I say the prayer more, my enemy will lose the war. | As I say the prayer more, my enemy will lose the war. |
| 13 | yes | Fourth to thee, Saint John, I pray, to wash all my sins away: | For to this end, John, I pray, to wash all my sins away. |
| 14 | yes | Baptizer of Christ, intercede for us all. | Baptizer of Christ, intercede for us all. |
| 15 | yes | As I say the prayer more, my enemy will lose the war. | As I say the prayer more, my enemy will lose the war. |
| 16 | yes | Fifth I pray to all the saints, who struggled hard with no complaints: | Fifth, I pray to all these saints who struggled hard with no complaints. |
| 17 | yes | All Saints of God, intercede for us all. | All saints of God intercede for us all. |
| 18 | yes | As I say the prayer more, my enemy will lose the war. | As I say the prayer more, my enemy will lose the war. |
| 19 | yes | At the end I pray to thee, O holy angels I don't see: | At the end I pray to thee, O holy angels, I don't see or can see. |
| 20 | yes | Archangels of God, intercede for us all. | angels of God intercede for us all. |
| 21 | yes | As I say the prayer more, my enemy will lose the war. | As I say the prayer more, my enemy will lose the war. |
| 22 | yes | I will hold my prayer rope till I rise up to the sky, | I will hold my prayer rope till I rise up to the sky. |
| 23 | yes | the prayer is so short, but strong and can defy. | The prayer is so short but strong and can defy. |
| 24 | yes | As I say the prayer more, my enemy will lose the war. | As I say the prayer more, my enemy will lose the war. |

## The Prayer Rope Anthem, Français (`prayer-rope-anthem/fr`)
24 of 24 lines shown, 0 hidden.

| # | Shown | Printed | Heard by the model |
|---|---|---|---|
| 1 | yes | Je tiendrai mon chapelet jusqu'à ce que je monte au ciel. | Je tiendrai mon chapelet jusqu'à ce que je monte au ciel. |
| 2 | yes | La prière est si courte, mais forte et peut défendre. | La prière est si courte, mais forte et peut défendre. |
| 3 | yes | Plus je récite la prière, plus l'ennemi perdra la guerre. | Plus je récite la prière, plus l'ennemi perdra la guerre. |
| 4 | yes | La première prière que je récite, vous l'entendrez partout. | La première prière que je récite, vous l'entendrez partout. |
| 5 | yes | Très sainte Trinité, sauve-nous par votre grâce. | Très sainte Trinité, sauve-nous par votre grâce. |
| 6 | yes | Plus je récite la prière, plus l'ennemi perdra la guerre. | Plus je récite la prière, plus l'ennemi perdra la guerre. |
| 7 | yes | Je vais la réciter à nouveau à haute voix, la deuxième prière. | Je vais la réciter à nouveau à haute voix la deuxième prière. |
| 8 | yes | Seigneur Jésus-Christ, aie pitié de nous. | Seigneur Jésus-Christ, aies pitié de nous. |
| 9 | yes | Plus je récite cette prière, plus l'ennemi perdra la guerre. | Plus je récite cette prière, plus l'ennemi perdra la guerre. |
| 10 | yes | Je proclame la troisième prière à la mère de notre Dieu. | Je proclame la troisième prière à la mère de notre Dieu. |
| 11 | yes | Très sainte Théotokos, sauve-nous. | Très sainte Théotokos, sauve-nous. |
| 12 | yes | Plus je récite cette prière, plus l'ennemi perdra la guerre. | Plus je récite cette prière, plus l'ennemi perdra la guerre. |
| 13 | yes | Quatrième prière, je prie Saint Jean pour purifier ma décadence. | Quatrième prière, je prie Saint Jean pour purifier ma décadence. |
| 14 | yes | Baptiseur du Christ, intercède pour nous tous. | Baptiseur du Christ, intercède pour nous tous. |
| 15 | yes | Plus je récite cette prière, plus l'ennemi perdra la guerre. | Plus je récite cette prière, plus l'ennemi perdra la guerre. |
| 16 | yes | Cinquième prière, je prie tous les saints qui ont lutté durement. | Cinquième prière, je prie tous les saints qui ont lutté durement. |
| 17 | yes | Tous les saints de Dieu, intercédez pour nous tous. | Tous les saints de Dieu intercèdent pour nous tous. |
| 18 | yes | Plus je récite cette prière, plus l'ennemi perdra la guerre. | Plus je récite cette prière, plus l'ennemi perdra la guerre. |
| 19 | yes | À la fin, je prie pour vous, saints anges que je ne peux voir. | A la fin je prie pour vous, aux saints anges que je ne peux voir. |
| 20 | yes | Archanges de Dieu, intercédez pour nous tous. | Archange de Dieu, intercédé pour nous tous. |
| 21 | yes | Plus je récite cette prière, plus l'ennemi perdra la guerre. | Plus je récite cette prière, plus l'ennemi perdra la guerre. |
| 22 | yes | Je tiendrai mon chapelet jusqu'à ce que je monte au ciel. | Je tiendrai mon chapelet jusqu'à ce que je monte au ciel. |
| 23 | yes | La prière est si courte mais forte et peut défendre. | La prière est si courte, mais forte et peut défendre. |
| 24 | yes | Plus je récite cette prière, plus l'ennemi perdra la guerre. | Plus je récite cette prière, plus l'ennemi perdra la guère. |

## The Prayer Rope Anthem, العربية (`prayer-rope-anthem/ar`)
0 of 21 lines shown, 21 hidden.

Why a line is hidden:

1. An automatic transcription with no printed text behind it, which a reader who knows Arabic reports has wrong words and spellings (the Discord, 2026-10-24); not shown until a listener's words are checked against the singing.

| # | Shown | Printed | Heard by the model |
|---|---|---|---|
| 1 | no (1) | قد أمسكت المسبحة كي يرفع عني دعائي | قبل أن سكت المسبحة لكي يرفع النعاء |
| 2 | no (1) | بقوة الصلاة أرتقي بين السماء، | اشتركوا في القناة |
| 3 | no (1) | بتكرارها الكثير سوف أغلب الشرير. | بتكرارها الكثير سوف أغلب الشرير |
| 4 | no (1) | هذه أولى الصلاة تسمعونها في الحين | هذه أولى الصلاة تسمعونها في الحين |
| 5 | no (1) | أيها الثالوث القدوس خلّصنا أجمعين، | أيها الثلوث القدوس صلصنا أجمعين |
| 6 | no (1) | بتكرارها الكثير سوف أغلب الشرير. | اشتركوا في القناة |
| 7 | no (1) | الصلاة الثانية سأتلوها صادحًا: | الصلاة الثانية سنتلوها صالحا |
| 8 | no (1) | ربي يسوع المسيح يا ابن الله ارحمني، | ربي يسوع المسيح يا ابن الله ارحمني |
| 9 | no (1) | بتكرارها الكثير سوف أغلب الشرير. | بتكرار الكثير سوف أغلب الشرير |
| 10 | no (1) | الصلاة الثالثة لوالدة الإله، | الصلاة الثالثة لوالدة الليلة |
| 11 | no (1) | أيتها الفائقة القداسة خلّصينا، | اشتركوا في القناة |
| 12 | no (1) | بتكرارها الكثير سوف أغلب الشرير. | اشتركوا في القناة |
| 13 | no (1) | الصلاة الرابعة ليوحنا المعمدان، | الصلاة الرابعة ليحنى النعمة |
| 14 | no (1) | يا صابغ المسيح تشفّع لعبيدك، | اشتركوا في القناة |
| 15 | no (1) | بتكرارها الكثير سوف أغلب الشرير. | بتكرارها الكثير سنفهم له الشريف |
| 16 | no (1) | الصلاة الخامسة لجميع القديسين، | الصلاة الغامسة لجميع القديسين |
| 17 | no (1) | يا قديسي الله تشفّعوا بنا، | يا قدس الله تشفع بنا |
| 18 | no (1) | بتكرارها الكثير سوف أغلب الشرير. | ترجمة نانسي قنقر |
| 19 | no (1) | وختامًا صلاة للملائكة، | وختاما صاغور للملائكة الصلاة |
| 20 | no (1) | يا رؤساء الأجناد تشفّعوا بنا، | يا رواس الأجناد تشفع بنا |
| 21 | no (1) | بتكرارها الكثير سوف أغلب الشرير. | بِتَكْرَارِ أَسْيَثِيكْ سَوْفَ أَغْلِمُ الشِّرِّينَ |

## Psalm 117, العربية (`psalm-117/ar`)
30 of 48 lines shown, 18 hidden.

Why a line is hidden:

1. Van Dyck's words, not the words sung: the singers sing this verse in other words (heard whole by a speech model, Whisper large-v3, 2026-11-11), and no public-domain printing of their wording has been found.

2. The singers' words differ from Van Dyck's here (the speech model hears افتحوا لي أبواب البر فأدخلها), and no public-domain printing has the words sung.

| # | Shown | Printed | Heard by the model |
|---|---|---|---|
| 1 | yes | اِحْمَدُوا ٱلرَّبَّ لِأَنَّهُ صَالِحٌ، | احمدوا الرب لأنه صالح |
| 2 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إلى الأبد رحمته |
| 3 | yes | هَلِّلُويَا. | موسيقى |
| 4 | no (1) | اِحْمَدُوا ٱلرَّبَّ لِأَنَّهُ صَالِحٌ، | يقول خالف رب جميعا إنه صالح |
| 5 | no (1) | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | اشتركوا في القناة |
| 6 | yes | هَلِّلُويَا. | موسيقى |
| 7 | no (1) | مِنَ ٱلضِّيقِ دَعَوْتُ ٱلرَّبَّ فَأَجَابَنِي مِنَ ٱلرُّحْبِ. | من وسط الضيط دعوت الرب فاستجاب لي ورحب بي |
| 8 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إله الأبدي رحمته |
| 9 | yes | هَلِّلُويَا. | آللويا |
| 10 | no (1) | ٱلِٱحْتِمَاءُ بِٱلرَّبِّ | اشتركوا في القناة |
| 11 | no (1) | خَيْرٌ مِنَ ٱلتَّوَكُّلِ عَلَى إِنْسَانٍ. | خير من الاتقان على الإنسان |
| 12 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إله الأمد رحمته |
| 13 | yes | هَلِّلُويَا. | اشتركوا في القناة |
| 14 | no (1) | ٱلِٱحْتِمَاءُ بِٱلرَّبِّ | قال اعطي مادو على الرب |
| 15 | no (1) | خَيْرٌ مِنَ ٱلتَّوَكُّلِ عَلَى ٱلرُّؤَسَاءِ. | خير من الاعتماد على الرؤس |
| 16 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إله الأبدي رحمته |
| 17 | yes | هَلِّلُويَا. | موسيقى |
| 18 | no (1) | قُوَّتِي وَتَرَنُّمِي ٱلرَّبُّ، وَقَدْ صَارَ لِي خَلَاصًا. | اشتركوا في القناة |
| 19 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | اشتركوا في القناة |
| 20 | yes | هَلِّلُويَا. | شكرا للمشاهدة |
| 21 | no (1) | يَمِينُ ٱلرَّبِّ مُرْتَفِعَةٌ. يَمِينُ ٱلرَّبِّ صَانِعَةٌ بِبَأْسٍ. | يمين الرب رفعتني يمين الرب قد أبدت عزتها |
| 22 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إله أبدي رحمته |
| 23 | yes | هَلِّلُويَا. | هالي لويا |
| 24 | no (1) | تَأْدِيبًا أَدَّبَنِي ٱلرَّبُّ، وَإِلَى ٱلْمَوْتِ لَمْ يُسْلِمْنِي. | اشتركوا في القناة |
| 25 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | اشتركوا في القناة |
| 26 | yes | هَلِّلُويَا. | اشتركوا في القناة |
| 27 | no (2) | اِفْتَحُوا لِي أَبْوَابَ ٱلْبِرِّ. أَدْخُلْ فِيهَا وَأَحْمَدِ ٱلرَّبَّ. | اشتركوا في القناة |
| 28 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إله أبدي رحمته |
| 29 | yes | هَلِّلُويَا. | اشتركوا في القناة |
| 30 | no (1) | هَذَا ٱلْبَابُ لِلرَّبِّ. ٱلصِّدِّيقُونَ يَدْخُلُونَ فِيهِ. | اشتركوا في القناة |
| 31 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إله الأمد رحمته |
| 32 | yes | هَلِّلُويَا. | اشتركوا في القناة |
| 33 | no (1) | أَحْمَدُكَ لِأَنَّكَ ٱسْتَجَبْتَ لِي وَصِرْتَ لِي خَلَاصًا. | إياك أحمد لأنك استجبت لي وصرت لي مخلصا |
| 34 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إلى الأبد رحمته أبدا |
| 35 | yes | هَلِّلُويَا. | هالي لويا |
| 36 | no (1) | ٱلْحَجَرُ ٱلَّذِي رَفَضَهُ ٱلْبَنَّاؤُونَ قَدْ صَارَ رَأْسَ ٱلزَّاوِيَةِ. | ترجمة نانسي قنقر |
| 37 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إلى الأبد رحمته الله |
| 38 | yes | هَلِّلُويَا. | موسيقى |
| 39 | yes | مِنْ قِبَلِ ٱلرَّبِّ كَانَ هَذَا، وَهُوَ عَجِيبٌ فِي أَعْيُنِنَا. | من قبل الرب كان هذا وهو عجيب في أعيننا |
| 40 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إلى الأبد رحمته |
| 41 | yes | هَلِّلُويَا. | موسيقى |
| 42 | no (1) | هَذَا هُوَ ٱلْيَوْمُ ٱلَّذِي صَنَعُهُ ٱلرَّبُّ، نَبْتَهِجُ وَنَفْرَحُ فِيهِ. | هذا هو اليوم الذي صنعه الرب فلنفرق ولا تهلل |
| 43 | no (1) | آهِ يَارَبُّ خَلِّصْ! آهِ يَارَبُّ أَنْقِذْ! | يا رب خلص يا رب وفق |
| 44 | no (1) | إِلَهِي أَنْتَ فَأَحْمَدُكَ، إِلَهِي فَأَرْفَعُكَ. | أنت هو إلهي فليك أحمد أنت هو إلهي فليك أعظم |
| 45 | no (1) | أَحْمَدُكَ لِأَنَّكَ ٱسْتَجَبْتَ لِي وَصِرْتَ لِي خَلَاصًا. | إياك أحمد لأنك استجبت لي وصرت لي مخالصا |
| 46 | yes | ٱحْمَدُوا ٱلرَّبَّ لِأَنَّهُ صَالِحٌ، | احمدوا ربا لأنه صالح |
| 47 | yes | لِأَنَّ إِلَى ٱلْأَبَدِ رَحْمَتَهُ. | لأن إله الأبد رحمته |
| 48 | yes | هَلِّلُويَا. | موسيقى |

## Psalm 135, العربية (`psalm-135/ar`)
30 of 40 lines shown, 10 hidden.

Why a line is hidden:

1. The nearest public-domain wording (Van Dyck's), not the words sung: the choir sings this half verse in the Antiochian Church's own Arabic, and no public-domain printing of that wording has been found.

2. Sung long, with a breath halfway, perhaps as a second Alliluia; not shown until a listener who knows the chant confirms it.

| # | Shown | Printed | Heard by the model |
|---|---|---|---|
| 1 | yes | اعترفوا للرب فإنه صالح، | اعترفوا للرب فإنه صالحون |
| 2 | yes | الليلويا. | موسيقى |
| 3 | yes | فإن إلى الأبد رحمته. | فإنا إلى الأبد رحمته |
| 4 | yes | الليلويا. | آللويا |
| 5 | no (1) | ٱحْمَدُوا إِلَهَ ٱلْآلِهَةِ، | اعترفوا لإله الآلهة |
| 6 | yes | الليلويا. | موسيقى |
| 7 | yes | فإن إلى الأبد رحمته. | فإنا إلى الأبد رحمته |
| 8 | yes | الليلويا. | اشتركوا في القناة |
| 9 | no (1) | ٱحْمَدُوا رَبَّ ٱلْأَرْبَابِ، | اعترفوا لرب الأرباب |
| 10 | yes | الليلويا. | موسيقى |
| 11 | yes | فإن إلى الأبد رحمته. | فإن إلى الأبد رحمته |
| 12 | yes | الليلويا. | أمودّو |
| 13 | no (1) | ٱلصَّانِعَ ٱلْعَجَائِبَ ٱلْعِظَامَ وَحْدَهُ، | صانع العجائب العظام وحده |
| 14 | yes | الليلويا. | موسيقى |
| 15 | yes | فإن إلى الأبد رحمته. | فإن إلى الأبد رحمته |
| 16 | yes | الليلويا. | آللويا |
| 17 | no (1) | ٱلصَّانِعَ ٱلسَّمَاوَاتِ بِفَهْمٍ، | صانع السماوات بفضل طين |
| 18 | yes | الليلويا. | موسيقى |
| 19 | yes | فإن إلى الأبد رحمته. | فإن إله الأبد رحمته أكبر |
| 20 | yes | الليلويا. | موسيقى |
| 21 | no (1) | ٱلْبَاسِطَ ٱلْأَرْضَ عَلَى ٱلْمِيَاهِ، | مؤسس الأرض على المياه |
| 22 | yes | الليلويا. | موسيقى |
| 23 | yes | فإن إلى الأبد رحمته. | فإنا إلى الأبد رحمته |
| 24 | yes | الليلويا. | أمودّو |
| 25 | no (1) | ٱلَّذِي فِي مَذَلَّتِنَا ذَكَرَنَا، | لأن الرب ذكرنا فيما ذلتنا |
| 26 | yes | الليلويا. | أمودّو |
| 27 | yes | فإن إلى الأبد رحمته. | فإنا إلى الآبد رحمته |
| 28 | yes | الليلويا. | آمين |
| 29 | no (1) | وَنَجَّانَا مِنْ أَعْدَائِنَا، | وأنقذنا من أعدائنا |
| 30 | yes | الليلويا. | اشتركوا في القناة |
| 31 | yes | فإن إلى الأبد رحمته. | فإنا إلى الآبد رحمته |
| 32 | yes | الليلويا. | آللويا |
| 33 | no (1) | ٱلَّذِي يُعْطِي خُبْزًا لِكُلِّ بَشَرٍ، | الذي يرزق كل جسد طعاما |
| 34 | yes | الليلويا. | موسيقى |
| 35 | yes | فإن إلى الأبد رحمته. | فإنا إلى الآبد رحمته |
| 36 | yes | الليلويا. | موسيقى |
| 37 | no (1) | ٱحْمَدُوا إِلَهَ ٱلسَّمَاوَاتِ، | اعترفوا لإله السماء |
| 38 | yes | الليلويا. | اشتركوا في القناة |
| 39 | yes | فإن إلى الأبد رحمته. | فإنا إلى الأبد رحمته |
| 40 | no (2) | الليلويا. | موسيقى |

## Psalm 135, English (`psalm-135/en`)
90 of 104 lines shown, 14 hidden.

Why a line is hidden:

1. The nearest public-domain wording, not the words sung: the choir sings this half verse from a modern psalter, and no public-domain printing has its words (docs/chants/psalm-135-english.md).

2. The choir sings "O give thanks unto the Lord of heaven" (heard by a speech model, Whisper large-v3, 2026-11-11), and no public-domain printing has that wording; the King James line has "God of heaven".

| # | Shown | Printed | Heard by the model |
|---|---|---|---|
| 1 | yes | O give thanks unto the Lord; for he is good: | O give thanks unto the Lord, for he is good. |
| 2 | yes | Alleluia. | Hallelujah. |
| 3 | yes | for his mercy endureth for ever. | For his mercy endureth forever. |
| 4 | yes | Alleluia. | Alleluia. |
| 5 | yes | O give thanks unto the God of gods: | Oh, give thanks unto the God of God's honor. |
| 6 | yes | Alleluia. | Hallelujah. |
| 7 | yes | for his mercy endureth for ever. | For his mercy endureth forever. |
| 8 | yes | Alleluia. | Alleluia. |
| 9 | yes | Oh give thanks unto the Lord of lords; | Give thanks unto the Lord of Lords. |
| 10 | yes | Alleluia. | Hallelujah. |
| 11 | yes | for his mercy endureth for ever. | For his mercy endureth forever. Amen. |
| 12 | yes | Alleluia. | Alleluia. |
| 13 | no (1) | To him who alone has wrought great wonders: | To him who alone hath brought great wonders on |
| 14 | yes | Alleluia. | Hallelujah. |
| 15 | yes | for his mercy endureth for ever. | For his mercy endureth forever on earth. |
| 16 | yes | Alleluia. | Alleluia. |
| 17 | no (1) | To him who made the heavens by understanding; | To Him that made the heavens with understanding. |
| 18 | yes | Alleluia. | Hallelujah. |
| 19 | yes | for his mercy endureth for ever. | For his mercy endureth forever. |
| 20 | yes | Alleluia. | Alleluia. |
| 21 | no (1) | To him who established the earth on the waters; | To him that established the earth upon the waters of the sea. |
| 22 | yes | Alleluia. | Oh |
| 23 | yes | for his mercy endureth for ever. | For His mercy endureth forever on earth. |
| 24 | yes | Alleluia. | Alleluia to Him. |
| 25 | no (1) | To him who alone made great lights; | To Him who alone hath made great light. |
| 26 | yes | Alleluia. | Alleluia. |
| 27 | yes | for his mercy endureth for ever. | His mercy endureth forever. Amen. |
| 28 | yes | Alleluia. | Alleluia. |
| 29 | no (1) | the sun to rule the day: | The sun for dominion of the day. |
| 30 | yes | Alleluia. | Hallelujah. |
| 31 | yes | for his mercy endureth for ever. | His mercy endureth forever on earth. |
| 32 | yes | Alleluia. | Hallelujah. |
| 33 | no (1) | The moon and the stars to rule the night; | The moon and the stars for dominion of the night. |
| 34 | yes | Alleluia. | Hallelujah. |
| 35 | yes | for his mercy endureth for ever. | His mercy endureth forever on |
| 36 | yes | Alleluia. | Alleluia. |
| 37 | no (1) | To him that smote Egypt in their firstborn: | To him that's most Egypt with their firstborn. |
| 38 | yes | Alleluia. | Hallelujah. |
| 39 | yes | for his mercy endureth for ever. | For his mercy endureth forever. Amen. |
| 40 | yes | Alleluia. | (nothing) |
| 41 | no (1) | And brought Israel out of the midst of them; | And led forth Israel out of the midst of them. |
| 42 | yes | Alleluia. | Oh |
| 43 | yes | for his mercy endureth for ever. | For his mercy endureth forever. |
| 44 | yes | Alleluia. | Hallelujah. |
| 45 | no (1) | with a strong hand, and a high arm: | With a strong and a lofty arm |
| 46 | yes | Alleluia. | Hallelujah. |
| 47 | yes | for his mercy endureth for ever. | For his mercy endureth forever again. |
| 48 | yes | Alleluia. | Hallelujah. |
| 49 | no (1) | To him which divided the Red sea into parts: | To him that divided the Red Sea into parts. |
| 50 | yes | Alleluia. | Hallelujah. |
| 51 | yes | for his mercy endureth for ever. | His mercy endureth forever. |
| 52 | yes | Alleluia. | Alleluia. |
| 53 | yes | And led Israel through the midst thereof: | and let it rail through the midst thereof. |
| 54 | yes | Alleluia. | Alleluia. |
| 55 | yes | for his mercy endureth for ever. | His mercy endureth forever. Amen. |
| 56 | yes | Alleluia. | Alleluia. |
| 57 | yes | and overthrew Pharao and his host in the Red Sea: | And overthrew Pharaoh and his host in the Red Sea. |
| 58 | yes | Alleluia. | Hallelujah. |
| 59 | yes | for his mercy endureth for ever. | For his mercy endureth forever. Amen. |
| 60 | yes | Alleluia. | Alleluia. |
| 61 | yes | To him that led his people through the wilderness; | To him that led his people through the wilderness. |
| 62 | yes | Alleluia. | Hallelujah. |
| 63 | yes | for his mercy endureth for ever. | For his mercy endureth forever. Amen. |
| 64 | yes | Alleluia. | Alleluia. |
| 65 | yes | To him that smote great kings; | To him that's loved, great kings alleluia. |
| 66 | yes | Alleluia. | Hallelujah. |
| 67 | yes | for his mercy endureth for ever. | His mercy endureth forever. |
| 68 | yes | Alleluia. | Alleluia. |
| 69 | yes | and slew mighty kings; | And slew mighty kings on high. |
| 70 | yes | Alleluia. | Hallelujah. |
| 71 | yes | for his mercy endureth for ever. | His mercy endureth forever. |
| 72 | yes | Alleluia. | Alleluia. |
| 73 | yes | Sihon king of the Amorites: | Sion, king of the Amorites, on... |
| 74 | yes | Alleluia. | Hallelujah. |
| 75 | yes | for his mercy endureth for ever. | His mercy and o'er with forever on. |
| 76 | yes | Alleluia. | Alleluia. |
| 77 | no (1) | And Og the king of Bashan: | And our King of the land, Abbas, on our land. |
| 78 | yes | Alleluia. | Hallelujah. |
| 79 | yes | for his mercy endureth for ever. | For his mercy endureth forever on. |
| 80 | yes | Alleluia. | Alleluia. |
| 81 | yes | and gave their land for an inheritance: | and gave their land for an inheritance on earth. |
| 82 | yes | Alleluia. | Hallelujah. |
| 83 | yes | for his mercy endureth for ever. | His mercy endureth forever. |
| 84 | yes | Alleluia. | Hallelujah. |
| 85 | yes | an inheritance for Israel his servant; | An inheritance for Israel, his servant on earth. |
| 86 | yes | Alleluia. | Hallelujah. |
| 87 | yes | for his mercy endureth for ever. | For His mercy endureth forever. |
| 88 | yes | Alleluia. | Alleluia. |
| 89 | no (1) | because in our affliction the Lord remembered us; | For in our humiliation the Lord remembered us all. |
| 90 | yes | Alleluia. | Hallelujah. |
| 91 | yes | for his mercy endureth for ever. | His mercy and new wrath forever all. |
| 92 | yes | Alleluia. | Alleluia. |
| 93 | yes | and redeemed us from our enemies; | And redeemed us from our enemies. |
| 94 | yes | Alleluia. | Hallelujah. |
| 95 | yes | for his mercy endureth for ever. | For his mercy endureth forever. |
| 96 | yes | Alleluia. | Alleluia. |
| 97 | no (1) | Who giveth food to all flesh: | He that giveth food to all flesh and blood. |
| 98 | yes | Alleluia. | Hallelujah. |
| 99 | yes | for his mercy endureth for ever. | For His mercy endureth forever. |
| 100 | yes | Alleluia. | Hallelujah. |
| 101 | no (2) | O give thanks unto the God of heaven: | O give thanks unto the Lord of heaven. Amen. |
| 102 | yes | Alleluia. | Hallelujah. |
| 103 | yes | for his mercy endureth for ever. | His mercy adoreth forever. |
| 104 | yes | Alleluia. | Alleluia. |

## Psalm 135, Ελληνικά (`psalm-135/el`)
93 of 104 lines shown, 11 hidden.

Why a line is hidden:

1. Not confirmed in the singing: a speech model (Whisper large-v3, 2026-11-11) could not hear this half verse, on its own, with its verse or in the whole recording, and no listener has confirmed it.

2. Heard only in part by a speech model (Whisper large-v3, 2026-11-11), not enough to confirm its words, and no listener has confirmed them.

| # | Shown | Printed | Heard by the model |
|---|---|---|---|
| 1 | yes | Ἐξομολογεῖσθε τῷ Κυρίῳ, ὅτι ἀγαθὸς, | Εξομολογήστε το Κύριο ότι αγαθός αλληλούρια, ότι στον αιώνα το έλεος αυτού αλληλούρια. |
| 2 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 3 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 4 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 5 | yes | Ἐξομολογεῖσθε τῷ Θεῷ τῶν θεῶν, | Εξομολογήστε τον Θεό, τον Θεόν, Αλληλούρια, ο Όντιστον Θεόν, Αλληλούρια. |
| 6 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 7 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 8 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 9 | yes | Ἐξομολογεῖσθε τῷ Κυρίῳ τῶν κυρίων, | Εξομολογήστε τον Κύριο, τον Κύριον αληνούρια, ότι σωτερό θα το έλεγε ως αυτού αληνούρια. |
| 10 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 11 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 12 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 13 | yes | Τῷ ποιήσαντι θαυμάσια μεγάλα μόνῳ, | Φύσανε τα μάσια με καραμόνο, αληνούρια, που όρθιστον αιώνα, το έλεος αυτού, αληνούρια. |
| 14 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 15 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 16 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 17 | no (1) | Τῷ ποιήσαντι τοὺς οὐρανοὺς ἐν συνέσει, | (not heard: the model wrote only "Υπότιτλοι AUTHORWAVE", on its own, with its verse and in the whole recording) |
| 18 | yes | Ἀλληλούϊα. | (not heard) |
| 19 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (not heard) |
| 20 | yes | Ἀλληλούϊα. | (not heard) |
| 21 | yes | Τῷ στερεώσαντι τὴν γῆν ἐπὶ τῶν ὑδάτων, | ου στερεός αντιθυγήνε πι τον υδάτο, αληλουρία, ού διστον και όλα, ο ελεός αυτού, αληλουρία. |
| 22 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 23 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 24 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 25 | yes | Τῷ ποιήσαντι φῶτα μεγάλα μόνῳ, | Πόθησα τη φωτά μου για να μόνο αλληλούια Πόθησον εγώ να το έλεγω σ'αυτό αλληλούια |
| 26 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 27 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 28 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 29 | no (1) | Τὸν ἥλιον εἰς ἐξουσίαν τῆς ἡμέρας, | (not heard: the model wrote only "Υπότιτλοι AUTHORWAVE", on its own, with its verse and in the whole recording) |
| 30 | yes | Ἀλληλούϊα. | (not heard) |
| 31 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ· | (not heard) |
| 32 | yes | Ἀλληλούϊα. | (not heard) |
| 33 | no (1) | Τὴν σελήνην καὶ τοὺς ἀστέρας εἰς ἐξουσίαν τῆς νυκτός, | (not heard: the model wrote only "Υπότιτλοι AUTHORWAVE", on its own, with its verse and in the whole recording) |
| 34 | yes | Ἀλληλούϊα. | (not heard) |
| 35 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (not heard) |
| 36 | yes | Ἀλληλούϊα. | (not heard) |
| 37 | no (1) | Τῷ πατάξαντι Αἴγυπτον σὺν τοῖς πρωτοτόκοις αὐτῶν, | (not heard: the model wrote only "Υπότιτλοι AUTHORWAVE", on its own, with its verse and in the whole recording) |
| 38 | yes | Ἀλληλούϊα. | (not heard) |
| 39 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (not heard) |
| 40 | yes | Ἀλληλούϊα. | (not heard) |
| 41 | no (1) | Καὶ ἐξαγαγόντι τὸν Ἰσραὴλ ἐκ μέσου αὐτῶν, | (not heard: the model wrote only "Υπότιτλοι AUTHORWAVE", on its own, with its verse and in the whole recording) |
| 42 | yes | Ἀλληλούϊα. | (not heard) |
| 43 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ· | (not heard) |
| 44 | yes | Ἀλληλούϊα. | (not heard) |
| 45 | yes | Ἐν χειρὶ κραταιᾷ καὶ ἐν βραχίονι ὑψηλῷ, | Ευχηρήκατε αγέναν Χίον Υψηλό, Αλληλούια, ότι στον αιώνα του έλεος αυτού, Αλληλούια. |
| 46 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 47 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 48 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 49 | no (1) | Τῷ καταδιελόντι τὴν ἐρυθρὰν θάλασσαν εἰς διαιρέσεις, | (not heard: the model wrote only "Υπότιτλοι AUTHORWAVE", on its own, with its verse and in the whole recording) |
| 50 | yes | Ἀλληλούϊα. | (not heard) |
| 51 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ· | (not heard) |
| 52 | yes | Ἀλληλούϊα. | (not heard) |
| 53 | yes | Καὶ διαγαγόντι τὸν Ἰσραὴλ διὰ μέσου αὐτῆς, | και δι' αγαγόντιτον η λαϊδία μέσου αυτοίς, αλληλούρια, ότι στον αιώνα το έλεος αυτού, αλληλούρια, |
| 54 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 55 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ· | (heard with its verse, above) |
| 56 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 57 | yes | Καὶ ἐκτινάξαντι Φαραὼ καὶ τὴν δύναμιν αὐτοῦ εἰς θάλασσαν ἐρυθράν, | και χειράξαν τη Φαραώ και τη δύναμη να ακούει στ' άρασ' αχρέητα, αλληλούρια, ότι στον αιώνα το έλεγαν σ' αυτού, αλληλούρια. |
| 58 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 59 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 60 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 61 | no (1) | Τῷ διαγαγόντι τὸν λαὸν αὐτοῦ ἐν τῇ ἐρήμῳ, | (not heard: the model wrote only "Υπότιτλοι AUTHORWAVE", on its own, with its verse and in the whole recording) |
| 62 | yes | Ἀλληλούϊα. | (not heard) |
| 63 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (not heard) |
| 64 | yes | Ἀλληλούϊα. | (not heard) |
| 65 | yes | Τῷ πατάξαντι βασιλεῖς μεγάλους, | το παράξαν οι βασίλισσες μεγάλους, αλληλούρια, ότι στον αιώνα το έλεγαν σ' αυτού, αλληλούρια. |
| 66 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 67 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 68 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 69 | yes | Καὶ ἀποκτείναντι βασιλεῖς κραταιούς, | και από δίχαντη βασιλής κατέωσα, αλληλούια, ότι στον αιώνα το έλεωσα αυτό, αλληλούια. |
| 70 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 71 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 72 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 73 | yes | Τὸν Σηὼν βασιλέα τῶν Ἀμοῤῥαίων, | τον σιων βασιλέα, τον αμωρέα, αλληλούια, ό,τι στον αιώνα το έμενα σαν του αλληλούια. |
| 74 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 75 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 76 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 77 | yes | Καὶ τὸν Ὢγ βασιλέα τῆς Βασάν, | και το λόγο βασιλέα την βάσαν, αλληλούρια, ότι ζωναιώνα το έλεος αυτού, αλληλούρια. |
| 78 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 79 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 80 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 81 | no (1) | Καὶ δόντι τὴν γῆν αὐτῶν κληρονομίαν, | (not heard: the model wrote only "Υπότιτλοι AUTHORWAVE", on its own, with its verse and in the whole recording) |
| 82 | yes | Ἀλληλούϊα. | (not heard) |
| 83 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ· | (not heard) |
| 84 | yes | Ἀλληλούϊα. | (not heard) |
| 85 | no (1) | κληρονομίαν Ἰσραὴλ δούλῳ αὐτοῦ, | (not heard: the model wrote only "Υπότιτλοι AUTHORWAVE", on its own, with its verse and in the whole recording) |
| 86 | yes | Ἀλληλούϊα. | (not heard) |
| 87 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (not heard) |
| 88 | yes | Ἀλληλούϊα. | (not heard) |
| 89 | yes | Ὅτι ἐν τῇ ταπεινώσει ἡμῶν ἐμνήσθη ἡμῶν ὁ Κύριος, | Ότι εν τίνα πυρόσιμον εμείς τιμών ο Κύριος. Αλληλούρια! Ότι στον αιώνα το έλεος αυτού. Αλληλούρια! |
| 90 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 91 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 92 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 93 | yes | Καὶ ἐλυτρώσατο ἡμᾶς ἐκ τῶν ἐχθρῶν ἡμῶν, | και έριγκαν σαν το ειμάς εκ των εκτών ημών, Αλληλούια, ότι στον αιώνα το έλεγαν σαν του, Αλληλούια. |
| 94 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 95 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 96 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 97 | no (2) | Ὁ διδοὺς τροφὴν πάσῃ σαρκὶ, | Όλοι τους προθυμάσεις αρχεί, Αλληλούια, όλοι στον αιώνα, το έλεος αυτού, Αλληλούια. |
| 98 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 99 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 100 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 101 | no (2) | Ἐξομολογεῖσθε τῷ Θεῷ τοῦ οὐρανοῦ, | Εξομολογήστε τον Θεό δουλειά του, αλληλούια, πότι στον αιώνα του έλεος αυτού, αλληλούια. |
| 102 | yes | Ἀλληλούϊα. | (heard with its verse, above) |
| 103 | yes | ὅτι εἰς τὸν αἰῶνα τὸ ἔλεος αὐτοῦ. | (heard with its verse, above) |
| 104 | yes | Ἀλληλούϊα. | (heard with its verse, above) |

## Psalm 135, Srpski (`psalm-135/sr`)
100 of 104 lines shown, 4 hidden.

Why a line is hidden:

1. Daničić's u dostojanje, not the words sung: the singer sings u nasleđe here (and sluzi svojemu in verse 22), and no public-domain printing of that wording has been found.

2. The singer sings koji nas se seti (heard by a speech model, Whisper large-v3, 2026-11-11), where Daničić has koji nas se opomenu, and no public-domain printing has the words sung.

3. The singer sings svakomu telu (heard twice by a speech model, Whisper large-v3, 2026-11-11), where Daničić has svakom telu, and no public-domain printing has the words sung.

| # | Shown | Printed | Heard by the model |
|---|---|---|---|
| 1 | yes | Slavite Gospoda, jer je dobar; | Славите Господа, је, је, добара |
| 2 | yes | Aliluja. | Велуја, је, |
| 3 | yes | jer je doveka milost Njegova; | је, је, добара Велуја. |
| 4 | yes | Aliluja. | Славите |
| 5 | yes | Slavite Boga nad bogovima; | Славите Бога на хубавима, |
| 6 | yes | Aliluja. | аллилуја, је |
| 7 | yes | jer je doveka milost Njegova. | је дједов је камирос његова, |
| 8 | yes | Aliluja. | аллилуја. Славите |
| 9 | yes | Slavite Gospodara nad gospodarima; | Славите Господа над Господарим, |
| 10 | yes | Aliluja. | алилуја, је |
| 11 | yes | jer je doveka milost Njegova; | је рједа вједа милост његова, |
| 12 | yes | Aliluja. | алилуја. |
| 13 | yes | Onog, koji jedan tvori čudesa velika; | Онога који један твори чунде саверник, |
| 14 | yes | Aliluja. | аллилуја, је |
| 15 | yes | jer je doveka milost Njegova; | је једовјека милост његова, |
| 16 | yes | Aliluja. | аллилуја. Који |
| 17 | yes | Koji je stvorio nebesa premudro; | Који је створио небеса фрему Рави |
| 18 | yes | Aliluja. | Рави Луја, је |
| 19 | yes | jer je doveka milost Njegova; | је љедовјека милост његова |
| 20 | yes | Aliluja. | Луја. |
| 21 | yes | Utvrdio zemlju na vodi; | Утврди јо жебна води, али |
| 22 | yes | Aliluja. | али Тројија, је |
| 23 | yes | jer je doveka milost Njegova; | је рједо вјека милост његова, али |
| 24 | yes | Aliluja. | али Тројија. |
| 25 | yes | Stvorio velika videla; | Stvorio velika vidjela, |
| 26 | yes | Aliluja. | iluija, jer |
| 27 | yes | jer je doveka milost Njegova; | je do vijeka milost njegova, |
| 28 | yes | Aliluja. | iluija. |
| 29 | yes | Sunce, da upravlja danom; | Сонце дају правља даном, |
| 30 | yes | Aliluja. | алитуја, је |
| 31 | yes | jer je doveka milost Njegova; | је једовјед камилос њекова, |
| 32 | yes | Aliluja. | алитуја. Neseci |
| 33 | yes | Mesec i zvezde, da upravljaju noću; | Neseci seste da upravljaju noću, |
| 34 | yes | Aliluja. | Haliluja, jer |
| 35 | yes | jer je doveka milost Njegova; | jednoveka milost njegova, |
| 36 | yes | Aliluja. | Haliluja. |
| 37 | yes | Koji pobi Misir u prvencima njegovim; | Који бор би виширо првенцима његовим, |
| 38 | yes | Aliluja. | аллилуја, јед |
| 39 | yes | jer je doveka milost Njegova; | јед једовјека милост његова, |
| 40 | yes | Aliluja. | аллилуја. |
| 41 | yes | Izvede iz njega Izrailja; | Изведе из њега Израилја, |
| 42 | yes | Aliluja. | авилуја, јер |
| 43 | yes | jer je doveka milost Njegova; | јер је до века милост његова, |
| 44 | yes | Aliluja. | авилуја. Ротом, |
| 45 | yes | Rukom krepkom i mišicom podignutom; | Ротом, грепом и мишицом, позитом, |
| 46 | yes | Aliluja. | аллилуја, јер |
| 47 | yes | jer je doveka milost Njegova; | је до вјека милост његов |
| 48 | yes | Aliluja. | аллилуја. Који |
| 49 | yes | Koji razdvoji Crveno More; | разбоји црвено море |
| 50 | yes | Aliluja. | Авилуја, је |
| 51 | yes | jer je doveka milost Njegova; | је рједом јека милост његова |
| 52 | yes | Aliluja. | Авилуја. и |
| 53 | yes | I provede Izrailja kroz sred njega; | провете Израиња крошљење |
| 54 | yes | Aliluja. | алилуија, је |
| 55 | yes | jer je doveka milost Njegova; | је тјездовјета милосње топа |
| 56 | yes | Aliluja. | алилуија. А |
| 57 | yes | A Faraona i vojsku njegovu vrže u more crveno; | А фараона и бојском ње кудраше у море црпено |
| 58 | yes | Aliluja. | авилуја, је |
| 59 | yes | jer je doveka milost Njegova; | је љедове камиво сњегова |
| 60 | yes | Aliluja. | авилуја. ПРЕПРЕД |
| 61 | yes | Prevede narod svoj preko pustinje; | ПРЕПРЕД ДЕНАРА СВОЈ ПРЕКО ПУСТИНЈЕ |
| 62 | yes | Aliluja. | АЛИЛУЈА, ЈЕ |
| 63 | yes | jer je doveka milost Njegova; | ЈЕ РЈЕДО МЈЕ КАМИЛОС, ЈЕ РЈЕДО |
| 64 | yes | Aliluja. | АЛИЛУЈА. |
| 65 | yes | Pobi careve velike; | Поби цареве велике, |
| 66 | yes | Aliluja. | аллилуја, је |
| 67 | yes | jer je doveka milost Njegova; | је љедовека милост његова, |
| 68 | yes | Aliluja. | аллилуја. И |
| 69 | yes | I izgubi careve znatne; | И зуби цареве знатне |
| 70 | yes | Aliluja. | Аллилоја, је |
| 71 | yes | jer je doveka milost Njegova; | је до вјека милост његова |
| 72 | yes | Aliluja. | Аллилоја. Сиона |
| 73 | yes | Siona, cara amorejskog; | Сиона цара Аморейска |
| 74 | yes | Aliluja. | Галилуја, је |
| 75 | yes | jer je doveka milost Njegova; | је је до века милост његова |
| 76 | yes | Aliluja. | Галилуја. |
| 77 | yes | I Oga, cara vasanskog; | (nothing) |
| 78 | yes | Aliluja. | је |
| 79 | yes | jer je doveka milost Njegova; | је до вјека милост његова, |
| 80 | yes | Aliluja. | алилуја. |
| 81 | no (1) | I dade zemlju njihovu u dostojanje; | I date zemlju njihovu u nasleđe, |
| 82 | yes | Aliluja. | aviluija, jer |
| 83 | yes | jer je doveka milost Njegova; | je do vijeka milost njegova, |
| 84 | yes | Aliluja. | aviluija. У |
| 85 | no (1) | U dostojanje Izrailju, sluzi svom; | У нас свеће Израилјуш, лози својему, |
| 86 | yes | Aliluja. | алилоија, јер |
| 87 | yes | jer je doveka milost Njegova; | јер је до века милост његова, |
| 88 | yes | Aliluja. | алилоија. који |
| 89 | no (2) | Koji nas se opomenu u poniženju našem; | који нас се сети у понишењу наше |
| 90 | yes | Aliluja. | Мавилуја, јер |
| 91 | yes | jer je doveka milost Njegova; | јер је до века милост његова |
| 92 | yes | Aliluja. | Мавилуја. |
| 93 | yes | I izbavi nas od neprijatelja naših; | Избави нас од непријателја нашим, |
| 94 | yes | Aliluja. | аллилуија, је |
| 95 | yes | jer je doveka milost Njegova; | је дједовека милост његова, |
| 96 | yes | Aliluja. | аллилуија. |
| 97 | no (3) | Koji daje hranu svakom telu; | Који даје грану свакому телу, |
| 98 | yes | Aliluja. | алилуија, је |
| 99 | yes | jer je doveka milost Njegova; | је је до века милост његова, |
| 100 | yes | Aliluja. | алилуија. |
| 101 | yes | Slavite Boga nebeskog; | Славите Бога Нескога, |
| 102 | yes | Aliluja. | Аллилуја, је је |
| 103 | yes | jer je doveka milost Njegova. | је до века милост његова, |
| 104 | yes | Aliluja. | Аллилуја. |

## The Paschal Canon, English (`paschal-canon/en`)
0 of 53 lines shown, 53 hidden.

Why a line is hidden:

1. Hapgood's English (1906), not the words sung: the recording sings an English translation of our own time, which is not in the public domain, and its words differ from Hapgood's in every hymn (heard by a speech model, Whisper large-v3, 2026-11-11).

| # | Shown | Printed | Heard by the model |
|---|---|---|---|
| 1 | no (1) | The Day of Resurrection! Let us be illumined, O ye people! The Passover, the Passover of the Lord! From death unto life, and from earth unto heaven hath Christ our God brought us over, singing a song of victory! | This is a day of resurrection. Let us be radiant, O people. Pasta, the Lord's pasta. For Christ our God has passed us from death to life and from earth to heaven. We will sing the song of victory. Glory to the Lord. |
| 2 | no (1) | Let us purify our senses and we shall behold Christ, radiant with the light ineffable of the Resurrection, and shall hear him say, in accents clear: Rejoice! as we sing the song of victory. | Let us lend our senses that we may behold Christ, who lives like lightning in the unapproachable light of the resurrection. And we shall clearly hear him say rejoice as we sing the hymn of victory. |
| 3 | no (1) | For meet is it that the heavens should rejoice, and that the earth should be glad, and that the whole world, both visible and invisible, should keep the Feast. For Christ is risen, the everlasting joy! | It is worthy for the heavens to rejoice and the earth to be glad. The whole world, visible and invisible, celebrate. For Christ, our everlasting joy, is risen from the dead. |
| 4 | no (1) | Christ is risen from the dead, trampling down Death by death, and upon those in the tomb bestowing life. | Christ is risen from the dead. By death he has trampled upon death. And to those in the tombs he is bestowing light. |
| 5 | no (1) | Jesus having risen from the grave, as he foretold, hath given unto us life eternal, and great mercy. | Jesus, having risen from the grave as he foretold, has bestowed to us eternal life and great mercy. |
| 6 | no (1) | O come, let us quaff a beverage new, not from a barren rock miraculously called forth; but the Fountain of Immortality springing from the tomb of Christ: on whom also we are founded. | Let us drink a new drink, not one wondrously brought forth from a barren rock, but from the fount of incorruption, which springs forth from the tomb of Christ, in whom we are established. |
| 7 | no (1) | Now are all things filled with light; heaven, and earth, and the places under the earth. All Creation doth celebrate the Resurrection of Christ, on whom also it is founded. | Now all things are filled with life, heaven and earth, and the deepest parts of the earth. Let all creation celebrate the rising of Christ, in which it is established. |
| 8 | no (1) | Yesterday, O Christ, was I buried with thee, and to-day I rise again with thy rising. Yesterday was I crucified with thee: Do thou thyself glorify me, O Saviour, in thy kingdom. | I was buried with you, O Christ. Today I arise in your resurrection. Yesterday I was crucified with you. O Savior, glorify me with yourself in your kingdom. |
| 9 | no (1) | Christ is risen from the dead, trampling down Death by death, and upon those in the tomb bestowing life. | Christ is risen from the dead. By death he has trampled upon death. And to those in the tombs he is bestowing life. |
| 10 | no (1) | Jesus having risen from the grave, as he foretold, hath given unto us life eternal, and great mercy. | Jesus having risen from the grave as he foretold, let's be so to us eternal life and great mercy. |
| 11 | no (1) | When they who with the Marys came, forestalling the dawn, and found the stone rolled away from the sepulchre, they heard from the Angel: Why seek ye among the dead, as he were mortal, him who abideth in everlasting light? Behold the grave-clothes. Go quickly, and proclaim to the world that the Lord is risen, and hath slain Death. For he is the Son of God who saveth mankind. | Why they who with Mary came, anticipating the dawn, and found the stone rolled away from the sepulcher, they heard from the angel, Why seek you among the dead, as though he were mortal man, him who abides in everlasting life? Behold the grave close, go quickly and proclaim to the world the Lord is risen and has put death to death for he is the Son of God who saved the race of man. |
| 12 | no (1) | May Habakkuk, divinely speaking, now stand with us in watch divine, and show the radiant Angel crying clearly: To-day is salvation come into the world: For Christ is risen, in that he is almighty. | The inspired prophet Habakkuk now stands with us in holy vision. He is like a shining angel who cries with a piercing voice. Today salvation has come to the world, for Christ is risen as a powerful. |
| 13 | no (1) | Christ revealed himself as of the male sex when he opened the Virgin's womb, and as mortal was called the Lamb. Without blemish, also, is our Passover, in that he tasted not corruption; and as very God perfect was proclaimed. | Christ revealed himself as a man when he was born from the virgin's womb. As a mortal, he was called the Lamb. As one not tasting corruption, our pastor is blameless. And as true God, he is proclaimed perfect. |
| 14 | no (1) | Christ, the blessed Crown, like unto a yearling Lamb, of his own good will did sacrifice himself for all, a Passover of purification: and from the grave did he, the glorious Sun of Righteousness, shine forth again upon us. | Christ, our blessed crown, as a healing lamb, was sacrificed for us, according to his free will. The bosom of purification, and once again from the grave, the beautiful sun of righteousness has shone on us. |
| 15 | no (1) | David, the ancestor of our God, danced with leaping before the symbolical Ark of the Covenant. Let us also, the holy people of God, beholding the fulfilment of the symbol, rejoice in godly wise: For Christ is risen, in that he is almighty. | Let us as the holy people of God, having beheld the fulfillment of the symbols, rejoice with divine inspiration. For Christ is risen, the all-powerful one. |
| 16 | no (1) | Christ is risen from the dead, trampling down Death by death, and upon those in the tomb bestowing life. | Christ is risen from the dead, by death he has trampled upon death, and to those in the tombs he is bestowing life. |
| 17 | no (1) | Jesus having risen from the grave, as he foretold, hath given unto us life eternal, and great mercy. | Jesus, having risen from the grave as he foretold, has bestowed to us eternal life and great mercy. |
| 18 | no (1) | Right early let us wake, and unto the Lord bring a song instead of myrrh, and we shall behold Christ, the Sun of Righteousness, who lighteth the life of all mankind. | Let us rise early at the break of dawn and offer a hymn instead of word to the Master. And let us behold Christ, the Son of Righteousness, who caused his life to rise for all. |
| 19 | no (1) | When they who were led captive in the bonds of Hell beheld thy loving-kindness infinite, O Christ, they hastened to the light with joyful feet, exalting the Passover Everlasting. | When those held by the chains of Hades saw your boundless compassion, O Christ, they came quickly to the light with a joyful stare, proclaiming and raising the eternal pastor. Glory to you, O Christ, the Lord. |
| 20 | no (1) | Bearing lights, let us go forth to meet Christ, who cometh forth from the grave like a bridegroom. And with the hierarchy of Angels who love and praise, let us celebrate the ransoming Passover of God. | Let us who carry bright lights go forth and be prised, who comes as a bridegroom from the tomb. And let us celebrate the saving cross of God with all those who love this feast. |
| 21 | no (1) | Christ is risen from the dead, trampling down Death by death, and upon those in the tomb bestowing life. | Christ is risen from the dead. By death he has trampled upon death. And to those in the tombs he is bestowing life. Jesus Christ is risen from the dead. |
| 22 | no (1) | Jesus having risen from the grave, as he foretold, hath given unto us life eternal, and great mercy. | Jesus, having risen from the grave, has he foretold, has he shown to us eternal life and great mercy. |
| 23 | no (1) | Thou didst descend into the nethermost parts of the earth, O Christ, and didst shatter the bonds eternal which held the prisoners in captivity: and after three days thou didst rise again from the grave, like Jonah from the whale. | You descended into the depths of the earth and shattered the everlasting bars which kept the dead captive. And like Jonah from the well, you arose a prize from the tomb on the third day. Glory to you, Lord Jesus Christ. |
| 24 | no (1) | O Christ, who didst not break the Virgin's gate by thy birth, thou didst rise again from the dead, having kept intact the seals; and thou hast opened unto us the gates of Paradise. | You preserve the seals in Taddo Christ when you arose from the grave, as you did not break the seal of the virgin in your birth, and you opened for us the gates of paradise. Glory to you, Lord Jesus Christ. |
| 25 | no (1) | O my Saviour, the sacrifice living and unslain, which, inasmuch as thou art God could not be slain! When thou, of thine own will, hadst offered up thyself unto the Father, thou didst raise up with thee also, in that thou thyself didst rise from the grave, Adam, the father of our race. | O my Savior, the living and unsacrificed offering, as God of your own free will you offered yourself to the Father, and by being resurrected from the grave, you resurrected the entire race of Adam. |
| 26 | no (1) | Christ is risen from the dead, trampling down Death by death, and upon those in the tomb bestowing life. | Christ is risen from the dead, by death he has trampled upon death, and to those in the tombs he is bestowing life. |
| 27 | no (1) | Jesus having risen from the grave, as he foretold, hath given unto us life eternal, and great mercy. | Jesus, having risen from the grave as he foretold, has bestowed to us eternal life and great mercy. |
| 28 | no (1) | Though thou didst descend into the grave, O Deathless One, yet didst thou annihilate the power of Hell, and didst rise again as conqueror, O Christ our God, announcing unto the Myrrh-bearing Women: Rejoice! and giving peace unto thine Apostles, and bestowing Resurrection upon the fallen. | Even though you descended into the grave, O immortal one, you overthrew the power of Hades, Christ our God, and rose victorious. You greeted the myrrh bearers, gave peace to your apostles, and granted resurrection to the fallen. And granted resurrection to the fallen. |
| 29 | no (1) | The Myrrh-bearing Women forestalled the dawn, ere the rising of the sun, seeking, as it were day, the Sun which had once set in the tomb, and crying one to another: O friends! Come, let us anoint with sweet-smelling spices the life-bringing and buried body of him who raiseth again in the flesh fallen Adam, which lieth in the grave. Let us go, let us seek, like the Wise Men, and let us fall down in worship before him, and bring unto him an offering of myrrh; not unto him in swaddling-clothes, but in his winding-sheet. And let us weep and cry aloud: Arise, O Master, who givest Resurrection unto the fallen! | early in the morning before sunrise, as if it were already day, myrrh-bearing maidens sought the sun, who previously descended into the grave. And they cried to one another, Come, friends, let us anoint with fragrant spices the life-giving and buried body of Christ, who has resurrected the fallen Adam. Let us hasten, as did the Magi, and adore Christ, and bring our myrrh as a gift to Him, who is wrapped not in swaddling clothes, but in a shroud. Let us weep and exclaim, Arise, Master, and grant it resurrection to the fallen. And grant it resurrection to the fallen. |
| 30 | no (1) | In that we have beheld the Resurrection of Christ, let us bow down before the holy Lord Jesus, the only sinless One. Thy Cross do we adore, O Christ, and thy holy Resurrection we laud and glorify: for thou art our God, and we know none other beside thee, we call upon thy Name. O come, all ye faithful, let us adore Christ's holy Resurrection: for lo, through his Cross is joy come into all the world. Ever blessing the Lord, let us sing his Resurrection: for in that he endured the Cross, he hath destroyed Death by death. | Having beheld the resurrection of Christ, let us worship the Holy Lord Jesus, the only sinless one. We venerate your cross, O Christ, and we praise and glorify your holy resurrection. You are our God. We know no other than you, and we call upon your name. Come, all you faithful, let us venerate the holy resurrection of Christ. For behold, through the cross joy has come to all the world. the Lord let us praise his resurrection for enduring the cross for us he has destroyed death by death having |
| 31 | no (1) | Jesus having risen from the grave, as he foretold, hath given unto us life eternal, and great mercy. | Having risen from the grave as he foretold, Jesus has granted us eternal life and great mercy. |
| 32 | no (1) | He who delivered the Holy Children from the fiery furnace, when he was made man did suffer like unto a mortal; and through his Passion he doth clothe the mortal in the dignity of immortality, he, the only God of our fathers, blessed and exceedingly glorified. | He who saved the three children in the furnace becomes man and suffers as a mortal. That through suffering he may clothe mortality within corruption. He alone is blessed and most glorious, the God of our fathers. |
| 33 | no (1) | The godly-wise women followed after thee in haste with sweet-smelling spices. But him whom they sought with tears as dead, they joyfully adored as the living God, and announced unto thy disciples, O Christ, the glad tidings of the mystical Passover. | The women followed after you with murry haste, and with tears they searched for him who was dead. Yet worship with joy the living Lord, proclaiming to your disciples of Christ the good news of the mystical paschal. Glory to the Lord. |
| 34 | no (1) | We celebrate the death of Death, the annihilation of Hell, the beginning of a life new and everlasting. And in ecstasy we sing praises unto the author thereof, the only God of our fathers, blessed and exceeding glorious. | We celebrate the death of death, the destruction of Hades, and the beginning of a new eternal life. And as we leave with joy, we end the cause with grace. The only blessed and most glorified, the God of our fathers. |
| 35 | no (1) | For holy, in very truth, and worthy of all solemn triumph, is this redeeming and radiantly effulgent night, the harbinger of the bright-beaming Day of the Resurrection, on which the Light Eternal that hath no bounds shone forth in the flesh from the grave for all mankind. | How truly sacred and most festive is this bright night of salvation, which now proclaims the radiant day of resurrection. On this night, the timeless light arose, buddhly from the tomb, and has shone forth on us. |
| 36 | no (1) | Christ is risen from the dead, trampling down Death by death, and upon those in the tomb bestowing life. | Christ is risen from the dead, by death he has trampled upon death, and to those in the tombs he is bestowing life. |
| 37 | no (1) | Jesus having risen from the grave, as he foretold, hath given unto us life eternal, and great mercy. | Jesus having risen from the grave as he foretold, has bestowed to us eternal life and great mercy. |
| 38 | no (1) | This is the chosen and holy Day, like unto no other, the King and Lord of Sabbaths, the Feast of Feasts, and the Triumph of Triumphs: Wherein let us bless Christ forevermore! | This is the chosen and holy day, the first of Sabbaths, the King and Lord. It is a feast of all feasts, a festival of festivals, in which we bless Christ unto all the ages. |
| 39 | no (1) | O come, on this auspicious day of the Resurrection, let us partake of the fruit from the new vine of divine gladness, of the kingdom of Christ, in song magnifying him as God forevermore. | Come to the new fruit of the vine of divine gladness in the glorious day of resurrection. Let us partake in the kingdom of Christ and praise him as God unto the ages. |
| 40 | no (1) | Cast thine eyes about thee, O Zion, and behold! For lo! from the West and from the North, and from the Sea and from the East, as to a light by God illumined, have thy children assembled unto thee, blessing Christ forevermore. | Lift up your eyes, O Zion, and see around you. Behold your children come to you. From the north, from the west, from the sea and the east, all divinely illuminated stars. In you they bless Christ unto all the ages. Glory to you, O God, in the highest. |
| 41 | no (1) | O Father Almighty, the Word and the Spirit, one Essence in Three Persons, exceeding high and most divine! Into thee have we been baptized, and thee will we bless unto all the ages. | We bless you unto all the ages. |
| 42 | no (1) | Christ is risen from the dead, trampling down Death by death, and upon those in the tomb bestowing life. | Christ is risen from the dead. By death he has trampled upon death. And to those in the tombs he is bestowing life. |
| 43 | no (1) | Jesus having risen from the grave, as he foretold, hath given unto us life eternal, and great mercy. | Jesus, having risen from the grave as he foretold, has bestowed to us eternal life and great mercy. |
| 44 | no (1) | My soul doth magnify him who, of his own good will, suffered and was buried, and rose again on the third day. | Let us honor and magnify the Theotokos, the Mother of Life, with hymns. Magnify, O my soul, him who suffered willingly and was buried and arose from the grave on the third day. |
| 45 | no (1) | Shine, shine, O New Jerusalem! for the glory of the Lord is risen upon thee. Keep high holiday now and be glad, O Zion! And rejoice thou, O pure Birth-giver of God, in the rising again of him whom thou didst bear! | (nothing) |
| 46 | no (1) | My soul doth magnify the Life-giver, who rose again from the grave on the third day. | Magnify all my soul, Christ the giver of life, who arose from the grave on the third day. |
| 47 | no (1) | O how divine! O how loving-kind! O how most sweet is thy word, O Christ! For thou hast faithfully promised to be with us, even unto the end of the world. Having, therefore, this firm foundation of hope, we faithful do rejoice. | Thank you. |
| 48 | no (1) | Christ the New Passover, the living Sacrifice, the Lamb of God, taketh away the sins of the world. | is the new pastor the living sacrificial victim the lamb of god that takes away the sin of the world |
| 49 | no (1) | O Christ, the Passover great and most holy! O Wisdom, Word and Power of God! Grant that we may more perfectly partake of thee in the day which knoweth no night of thy kingdom. | Oh great and most sacred cross of Christ, oh wisdom and word and power of God, grant that we partake of you fully in the unending day of your kingdom. |
| 50 | no (1) | The Angel cried unto her who is full of grace: Hail, O Pure Virgin! And again, I say: Hail! Thy Son is risen from his three days' sojourn in the grave, and hath raised up the dead: Rejoice, O ye people! | The angel cried to her, who is full of grace. O conversion, rejoice, and again I say rejoice. For your son has risen from the grave on the third day. |
| 51 | no (1) | Shine, shine, O New Jerusalem! for the glory of the Lord is risen upon thee. Keep high holiday now and be glad, O Zion! And rejoice thou, O pure Birth-giver of God, in the rising again of him whom thou didst bear! | (nothing) |
| 52 | no (1) | Christ is risen from the dead, trampling down Death by death, and upon those in the tomb bestowing life. | Christ is risen from the dead, by death he has trampled upon death, and to those in the tombs he is bestowing life. |
| 53 | no (1) | Jesus having risen from the grave, as he foretold, hath given unto us life eternal, and great mercy. | Jesus, having risen from the grave as he foretold, has bestowed to us eternal life and great mercy. |
