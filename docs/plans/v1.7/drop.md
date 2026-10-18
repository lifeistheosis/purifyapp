# Purify 1.7: the drop

Written out by `node scripts/drop.mjs kit` from `drop.json`. Do not edit this
file: change `drop.json` and write it out again. The rules are in `docs/DROP.md`.

A calmer Purify to read, pray and listen. Covers 1.7 and 1.7.1, carried by the 1.7.1 builds (Android 0, iOS 0).

## The day

No drop day set yet. `node scripts/drop.mjs days` lists the next ones on the Church's calendar.

## What the release is

- ✨ **A calmer Purify.** One top bar on every tab, new Today, Discover and You screens, and quieter pages across the app.
- 🔥 **Your streak, in view.** A flame and your count beside Premium on every tab, and a flame that grows the longer you keep it.
- 📖 **A cleaner Scripture screen.** Before you read for every book, paragraphs, the minutes left in a chapter, and John 1 read aloud to you.
- 🎵 **Chants.** In the Kitchen's place on Discover, with the words lit as they are sung. The first is the Prayer Rope Anthem, in English, French and Arabic.
- 🙏 **Prayers that read like lyrics.** Every prayer flows down the page line by line, and Pray with plays a chant on a loop while you pray.
- 📚 **A reading room of the Church Fathers.** Covers as posters, rows by theme and by tradition, short reads, a search with filters, and a page for every book.
- 📜 **Orthodox History.** One quiet timeline, and twenty events written in full from their sources, each with a picture, in English for now.
- ⛪ **Your first Liturgy.** A gentle guide to your first visit to a parish, one card at a time, from Start here.
- 📅 **A calendar made for your phone.** The month fits the screen, and the day you choose shows its fast, its saints and its readings.
- 🌧️ **With Purify Plus.** Remember the verse, ambience under your reading and your prayers, reading plans as guided days, and your journal with your notes on verses.

Also:

- A new player: a slim bar above the tabs while something plays, and Now playing with live captions and a sleep timer.
- Search opens on the day, with its saint, readings and fast.
- The five Hours set out as your day, each at its time on your own clock.
- Your rule: a morning and an evening rule of your own, prayed through with Pray my rule.
- Learn to pray goes in order, and the next lesson is always named.
- Today's readings in one go, from each reading to the next.
- Saved is one list of everything you starred and highlighted, with chips to narrow it down.
- Walkthroughs read like Scripture, with each note under its verse.
- A fast day says what it keeps from as well as what it allows.
- Search knows both ways of numbering the Psalms.
- The Verse of the Day names its book in your language.
- Saint pages made for a phone: The icon at the top, and the Life, the Writings and the Miracles on one switch.
- An Orthodox dictionary: 100 words you meet in church, each with its Greek and a sentence or two in plain words.
- Learn to Pray draws the Sign of the Cross: the hand, and the four touches in their order.
- Search in the Bible opens on a screen of its own.
- On John 1, a play button on the reading bar reads the chapter aloud.
- Icons cut clean, with no white at their edges.

## What may not be said

- "audio Bible": read aloud is John 1 alone for now, in a demo voice; no other chapter is read aloud yet
- "narrat": John 1 is read by a demo voice, not a narrator; narrated Scripture is Studio Audio, Purify Pro's promise for real narrators, still to come
- "voices": there is one reading voice, the demo; a choice of voices is planned, not built
- "library of chants": Chants has one chant so far, the Prayer Rope Anthem, sung in English, French and Arabic; more wait on recordings
- "choir": no choir or singer is named for a recording, and no recording is claimed as ours
- "full Akathist": the Akathist to the Theotokos shows only its opening Kontakion for now; the other stanzas return as each is checked against a public-domain printing
- "whole Akathist": the same: only the opening Kontakion is shown for now
- "every language": History's twenty events and the dictionary's words are in English for now, and read aloud is English only
- "translated": History and the dictionary are in English for now, and the translation of Community posts is not built
- "screen off": chant with the screen off has not been seen working on a phone
- "season banner": earnable season banners are not built

## The notes

- 1.7: queued (revision 604fb1c1-e88f-4fda-8543-76e72ed7d4a3), 2026-10-18
- 1.7.1: written

## Before anything goes out

*First, so every link leads to the right note.*

### The 1.7 note

`note-1.7` · The note in the app · Admin, Patch notes · Yours · In your queue

~~~text
Accept it in Admin, Patch notes. Until the notes are accepted, What's New shows the release before this one, and there is no release email to send.
~~~

### Bring the accepted notes back into the app

`step-pull-notes` · A step · Ours, on your word · To do

~~~text
After the notes are accepted, or edited in Admin: node scripts/patch-notes.mjs pull --apply, then commit. The apps carry the files and never the tables, so an edit that is only in Admin is not in a build.
~~~

### Everything in 1.7, in one note

`notes-all` · Every line of the release, in one note · Wherever the whole list is wanted · Ready

> Written out from the notes themselves each time the kit is made.

## With the store submissions

*When the builds are handed to Apple and Google.*

Each build is walked on a real phone before it goes to its store, from [docs/PHONE-WALK.md](../../PHONE-WALK.md):

- Android not walked yet
- iPhone not walked yet

### What's new, for Google Play

`play-whats-new` · Google Play, What's new · Play Console, the release, Release notes · Ready · 21 languages, the longest 449 of 500 characters

> Your notes in 21 languages, each between its own tags: paste the whole text into Release notes and Play Console files each language under its own. Each is held to 500 characters.

~~~text
<en-US>
✨ A calmer Purify, rebuilt almost everywhere
🔥 Your streak on every tab, with a flame that grows
🎵 Chants, with the words lit as they are sung
🙏 Prayers that flow like lyrics, and Pray with chant
📚 A new reading room with covers by theme and tradition
⛪ Your first Liturgy: a guide for newcomers
📜 Orthodox History, rewritten with pictures
📅 A calendar made for your phone
</en-US>
<el-GR>
✨ Ένα πιο ήρεμο Purify, ανανεωμένο σχεδόν παντού
🔥 Το σερί σας σε κάθε καρτέλα, με φλόγα που μεγαλώνει
🎵 Ψαλμωδίες, με τα λόγια να φωτίζονται καθώς ψάλλονται
🙏 Προσευχές που κυλούν σαν στίχοι, και Προσευχή με ψαλμωδία
📚 Νέο αναγνωστήριο με εξώφυλλα ανά θέμα και παράδοση
⛪ Η πρώτη σας Θεία Λειτουργία: οδηγός για νεοφερμένους
📜 Ορθόδοξη Ιστορία, ξαναγραμμένη με εικόνες
📅 Ένα ημερολόγιο φτιαγμένο για το κινητό σας
</el-GR>
<ro>
✨ Un Purify mai liniștit, refăcut aproape peste tot
🔥 Seria ta pe fiecare filă, cu o flacără care crește
🎵 Cântări, cu cuvintele luminate pe măsură ce sunt cântate
🙏 Rugăciuni care curg ca versurile, și Rugăciune cu cântare
📚 O nouă sală de lectură, cu coperți după temă și tradiție
⛪ Prima ta Liturghie: un ghid pentru cei nou-veniți
📜 Istoria Ortodoxă, rescrisă, cu imagini
📅 Un calendar făcut pentru telefonul tău
</ro>
<fil>
✨ Mas payapang Purify, binago halos saanman
🔥 Ang streak mo sa bawat tab, may lumalaking apoy
🎵 Mga Awit, na umiilaw ang mga salita habang inaawit
🙏 Mga panalanging parang liriko, at Manalangin nang may awit
📚 Bagong silid-aklatan, ayon sa tema at tradisyon
⛪ Ang iyong unang Liturhiya: gabay para sa mga baguhan
📜 Kasaysayang Ortodokso, muling isinulat na may mga larawan
📅 Isang kalendaryong ginawa para sa iyong telepono
</fil>
<ru-RU>
✨ Более спокойный Purify, обновлённый почти везде
🔥 Ваша серия на каждой вкладке, с растущим пламенем
🎵 Песнопения: слова подсвечиваются по мере пения
🙏 Молитвы текут, как слова песни, и Молитва с пением
📚 Новая читальня с обложками по темам и традициям
⛪ Ваша первая Литургия: путеводитель для новичков
📜 История Православия, написанная заново, с иллюстрациями
📅 Календарь, созданный для вашего телефона
</ru-RU>
<es-ES>
✨ Un Purify más sereno, renovado casi por completo
🔥 Tu racha en cada pestaña, con una llama que crece
🎵 Cantos, con la letra iluminada mientras se canta
🙏 Oraciones que fluyen como letras de canciones, y Orar con canto
📚 Una nueva sala de lectura con portadas por tema y tradición
⛪ Tu primera Liturgia: una guía para quienes llegan por primera vez
📜 Historia Ortodoxa, reescrita y con imágenes
📅 Un calendario hecho para tu teléfono
</es-ES>
<fr-FR>
✨ Un Purify plus paisible, repensé presque partout
🔥 Votre série sur chaque onglet, avec une flamme qui grandit
🎵 Chants : les paroles s'illuminent au fil du chant
🙏 Des prières qui défilent comme des paroles, et Prier avec le chant
📚 Une nouvelle salle de lecture, par thème et tradition
⛪ Votre première Liturgie : un guide pour les nouveaux venus
📜 Histoire orthodoxe, réécrite et illustrée
📅 Un calendrier pensé pour votre téléphone
</fr-FR>
<de-DE>
✨ Ein ruhigeres Purify, fast überall neu gestaltet
🔥 Deine Serie auf jedem Tab, mit wachsender Flamme
🎵 Gesänge, deren Worte beim Singen aufleuchten
🙏 Gebete, die wie Liedtexte fließen, und Mit Gesang beten
📚 Ein neuer Lesesaal mit Covern nach Thema und Tradition
⛪ Deine erste Liturgie: ein Wegweiser für Neue
📜 Orthodoxe Geschichte, neu geschrieben und bebildert
📅 Ein Kalender, gemacht für dein Handy
</de-DE>
<sr>
✨ Мирнији Purify, обновљен скоро свуда
🔥 Ваш низ на врху сваке картице, са пламеном који расте
🎵 Појање, са речима које светле док се поје
🙏 Молитве које теку као стихови песме, и Молитва уз појање
📚 Нова читаоница са корицама по темама и традицијама
⛪ Ваша прва Литургија: водич за оне који први пут долазе
📜 Историја Православља, поново написана, са сликама
📅 Календар направљен за ваш телефон
</sr>
<uk>
✨ Спокійніший Purify, оновлений майже всюди
🔥 Ваша серія вгорі кожної вкладки, з полум'ям, що росте
🎵 Піснеспіви: слова підсвічуються під час співу
🙏 Молитви, що линуть, як слова пісні, і Молитва зі співом
📚 Нова читальня з обкладинками за темами й традиціями
⛪ Ваша перша Літургія: путівник для новачків
📜 Історія Православ'я, написана наново, з ілюстраціями
📅 Календар, створений для вашого телефона
</uk>
<it-IT>
✨ Un Purify più sereno, rinnovato quasi ovunque
🔥 La tua serie su ogni scheda, con una fiamma che cresce
🎵 Canti, con le parole che si illuminano mentre si cantano
🙏 Preghiere che scorrono come una canzone, e Pregare con il canto
📚 Una nuova sala di lettura con copertine per tema e tradizione
⛪ La tua prima Liturgia: una guida per chi arriva per la prima volta
📜 Storia Ortodossa, riscritta e illustrata
📅 Un calendario pensato per il tuo telefono
</it-IT>
<pt-BR>
✨ Um Purify mais sereno, renovado em quase tudo
🔥 Sua sequência em cada aba, com uma chama que cresce
🎵 Cânticos, com a letra iluminada enquanto se canta
🙏 Orações que fluem como letras de música, e Orar com cântico
📚 Uma nova sala de leitura com capas por tema e tradição
⛪ Sua primeira Liturgia: um guia para quem chega pela primeira vez
📜 História Ortodoxa, reescrita e com imagens
📅 Um calendário feito para o seu celular
</pt-BR>
<bg>
✨ По-спокоен Purify, обновен почти навсякъде
🔥 Вашата поредица на всеки раздел, с растящ пламък
🎵 Песнопения с думи, които светват, докато се пеят
🙏 Молитви, които текат като текст на песен, и Молитва с песнопение
📚 Нова читалня с корици по теми и традиции
⛪ Вашата първа Литургия: пътеводител за новодошлите
📜 История на Православието, написана наново, с изображения
📅 Календар, създаден за вашия телефон
</bg>
<ar>
✨ Purify أكثر هدوءًا، بتصميم جديد في كل مكان تقريبًا
🔥 سلسلتك في أعلى كل تبويب، بلهب يكبر
🎵 التراتيل، تضيء كلماتها أثناء الترتيل
🙏 صلوات تنساب كأبيات الترنيمة، والصلاة مع الترتيل
📚 قاعة قراءة جديدة بأغلفة حسب الموضوع والتقليد
⛪ قداسك الإلهي الأول: دليل للقادمين الجدد
📜 التاريخ الأرثوذكسي، مكتوب من جديد مع صور
📅 تقويم مصمم لهاتفك
</ar>
<tr-TR>
✨ Daha sakin bir Purify, neredeyse her yerde yenilendi
🔥 Serin her sekmenin üstünde, büyüyen bir alevle
🎵 İlahiler: sözler söylenirken parlıyor
🙏 Şarkı sözleri gibi akan dualar ve İlahiyle dua
📚 Konu ve geleneğe göre kapaklarla yeni bir okuma salonu
⛪ İlk Liturjiniz: yeni gelenler için bir rehber
📜 Ortodoks Tarihi, yeniden yazıldı ve resimlendi
📅 Telefonunuz için yapılmış bir takvim
</tr-TR>
<ka-GE>
✨ უფრო მშვიდი Purify, თითქმის ყველგან განახლებული
🔥 თქვენი სერია ყველა ჩანართზე, მზარდი ალით
🎵 საგალობლები: სიტყვები ნათდება გალობისას
🙏 ლოცვები, რომლებიც სიმღერის სიტყვებივით მიედინება, და ლოცვა გალობით
📚 ახალი სამკითხველო ყდებით, თემისა და ტრადიციის მიხედვით
⛪ თქვენი პირველი ლიტურგია: გზამკვლევი ახალმოსულთათვის
📜 მართლმადიდებლური ისტორია, ხელახლა დაწერილი, სურათებით
📅 კალენდარი, შექმნილი თქვენი ტელეფონისთვის
</ka-GE>
<hu-HU>
✨ Nyugodtabb Purify, szinte mindenhol megújulva
🔥 A sorozatod minden lap tetején, egy növekvő lánggal
🎵 Énekek: a szavak éneklés közben felragyognak
🙏 Imák, amelyek dalszövegként áradnak, és Imádság énekkel
📚 Új olvasóterem borítókkal, téma és hagyomány szerint
⛪ Az első Liturgiád: útmutató újonnan érkezőknek
📜 Ortodox történelem, újraírva, képekkel
📅 Telefonra készült naptár
</hu-HU>
<id>
✨ Purify yang lebih tenang, diperbarui hampir di semua bagian
🔥 Rangkaianmu di setiap tab, dengan api yang tumbuh
🎵 Kidung, dengan kata-kata yang menyala saat dinyanyikan
🙏 Doa yang mengalir seperti lirik lagu, dan Berdoa dengan kidung
📚 Ruang baca baru dengan sampul menurut tema dan tradisi
⛪ Liturgi pertama Anda: panduan bagi pendatang baru
📜 Sejarah Ortodoks, ditulis ulang dengan gambar
📅 Kalender yang dibuat untuk ponselmu
</id>
<ne-NP>
✨ अझ शान्त Purify, लगभग सबैतिर नयाँ बनाइएको
🔥 हरेक ट्याबको माथि तपाईंको लगातारता, बढ्दै जाने ज्वालासहित
🎵 भजनहरू, गाउँदै गर्दा शब्दहरू उज्यालो हुन्छन्
🙏 गीतका बोलजस्तै बग्ने प्रार्थनाहरू, र भजनसहित प्रार्थना
📚 विषय र परम्पराअनुसार आवरणसहित नयाँ पठन कक्ष
⛪ तपाईंको पहिलो लिटर्जी: नयाँ आउनेहरूका लागि मार्गदर्शन
📜 अर्थोडक्स इतिहास, चित्रसहित फेरि लेखिएको
📅 तपाईंको फोनका लागि बनाइएको पात्रो
</ne-NP>
<pl-PL>
✨ Spokojniejszy Purify, odnowiony prawie wszędzie
🔥 Twoja seria na każdej karcie, z rosnącym płomieniem
🎵 Śpiewy ze słowami, które rozświetlają się podczas śpiewu
🙏 Modlitwy płynące jak tekst piosenki oraz Modlitwa ze śpiewem
📚 Nowa czytelnia z okładkami według tematu i tradycji
⛪ Twoja pierwsza Liturgia: przewodnik dla nowych osób
📜 Historia Prawosławia, napisana od nowa, z ilustracjami
📅 Kalendarz stworzony dla Twojego telefonu
</pl-PL>
<ur>
✨ زیادہ پرسکون Purify، تقریباً ہر جگہ نیا
🔥 ہر ٹیب کے اوپر آپ کا تسلسل، بڑھتے ہوئے شعلے کے ساتھ
🎵 ترتیلیں، جن کے الفاظ گاتے ہوئے روشن ہوتے ہیں
🙏 دعائیں جو گیت کے بولوں کی طرح رواں ہیں، اور ترتیل کے ساتھ دعا
📚 نیا مطالعہ خانہ، موضوع اور روایت کے لحاظ سے سرورق کے ساتھ
⛪ آپ کا پہلا قداس: نئے آنے والوں کے لیے رہنما
📜 آرتھوڈوکس تاریخ، تصاویر کے ساتھ نئے سرے سے لکھی گئی
📅 آپ کے فون کے لیے بنایا گیا کیلنڈر
</ur>
~~~

### What's New in This Version, for the App Store

`appstore-whats-new` · App Store, What's New in This Version · App Store Connect, the version, What's New in This Version · Ready · 3869 of 4000 characters

~~~text
Purify 1.7 is the biggest update yet: a calmer Purify to read, pray and listen.

YOUR STREAK
- A flame and your count sit beside Premium at the top of every tab, and a tap opens your streak. The flame grows as you keep it: Spark, Candle, Lamp, Crown and All flame.

A CALENDAR FOR YOUR PHONE
- The month fits the screen, and the arrows or a swipe turn it. The day you choose shows its fast, its saints with their icons, and its readings.

A CALMER APP
- One top bar on every tab: the tab's name, then Premium, search and the bell, always in the same place.
- Cleaner, quieter pages for Today, Discover, You, the Scripture, the prayers and the saints.
- Search opens on the day, with its saint, readings and fast, then what you opened last.

CHANTS
- Chants takes the Kitchen's place. Every chant has its own page with its words, where it comes from and its versions, and the words light up as they are sung. The first is the Prayer Rope Anthem, in English, French and Arabic.

PRAYER
- Prayers flow down the page like lyrics, and the sign of the Cross is drawn beside the line where a prayer calls for it.
- Pray with: a chant on a loop while you pray, or ambience with Purify Plus.
- The Hours as the day, each at its time, with the Hour you are in lit.
- Learn to pray goes in order, and the next lesson is always named.
- Your rule: make a morning and an evening rule of your own from the whole prayer book, and pray it through with Pray my rule.

SCRIPTURE
- A cleaner chapter screen: one row for the translation, the book and the Greek, the chapter's name on one line, and a slim strip of chapters. On iPad, the text stands in the middle of the screen.
- Before you read: the first chapter of every book opens with what it is, who wrote it and when.
- Paragraphs: almost every chapter can read like a printed Bible.
- The minutes left in a chapter, and the next chapter waiting by name at the end.
- Today's readings in one go, from each reading to the next.
- Listen to John 1, the first chapter Purify reads aloud, with the verse being read lit as it goes.

THE LIBRARY
- The reading room: books with covers, rows by theme and by tradition, short reads, search with filters, and a page for every book.
- Saint pages made for a phone: the icon at the top, and a switch between the Life, the Writings and the Miracles.
- Orthodox History: one quiet timeline, and twenty events written in full from their sources, each with a picture.
- An Orthodox dictionary: 100 words you meet in church, each with its Greek.
- Walkthroughs read like Scripture, with each note under its verse.

NEW TO ORTHODOXY
- Start here is made for a phone, and leads to Your first Liturgy: a guide to your first visit, one card at a time, from what kind of parish it is to what to expect before, during and after, with a reminder on Today as the day comes near.

YOUR SAVED
- Saved is one list of everything you starred and highlighted, with chips to narrow it down. Swipe a row away to remove it, with Undo.

PURIFY PLUS
- Remember the verse: one of your saved verses comes back on Today in its first letters, to say from memory.
- Ambience: rain, morning birds, or a bell and stillness under your reading and prayers, with volume, a balance against the reading voice, and a sleep timer.
- Guided reading plans: a word on what to look for, a bar to lead you through, and questions at the end for your journal.
- The journal keeps your own entries and your verse notes in one list by day.

FIXES
- Search knows both numberings of the Psalms.
- The Verse of the Day names its book in your language.
- The calendar now says Pascha is kept on one day by nearly every Orthodox Church.
- The Akathist to the Theotokos shows only words checked line by line against a public domain printing. The rest returns as it is checked.
- Past the last verse of a chapter, the reader's bar names that verse.
~~~

### Promotional text, for the App Store

`appstore-promo` · App Store, promotional text · App Store Connect, the version, Promotional Text · Ready · 142 of 170 characters

> This one can be changed at any time without a new review.

~~~text
New in 1.7: a calmer Purify, your streak in view on every tab, chants with the words lit as they are sung, and a calendar made for your phone.
~~~

### The description, for the App Store

`appstore-description` · App Store, description · App Store Connect, the version, Description · Ready · 3982 of 4000 characters

> The listing itself, sent with this version. The Terms of Use and Privacy Policy lines stay at its end: App Review looks for them in an app that sells a subscription.

~~~text
Purify is an Eastern Orthodox prayer book, Bible and library of the Church Fathers in one calm app. Pray the morning and evening prayers, read the Church's daily Scripture readings, keep the fasts and feasts, and learn the faith from the saints, all in one quiet place. The whole library is free. No ads, and no account needed.

PRAY EVERY DAY

* Today at a glance: the saint of the day, the fast, and the appointed readings, following the Church's official calendar.
* Morning and evening prayers, the Hours, Compline, prayers to the Theotokos and the saints, and a complete Orthodox prayer book.
* Prayers that flow like lyrics, with the sign of the Cross marked where a prayer calls for it.
* Make your own prayer rule for morning and evening, and pray it through.
* Chants: a growing library of Orthodox hymns, with the words lit as they are sung, and the option to pray with chant.
* The church calendar with every feast and fast, Great Lent, the Nativity Fast and the countdown to Pascha. Old Calendar (Julian) supported.
* Seven home screen widgets, from the Verse of the Day to today's saint and fast.

READ THE SCRIPTURES

* The Septuagint Old Testament (Brenton) and the King James New Testament, with the readings for every day.
* Verse by verse commentary from 24 Church Fathers on 26 books of the Bible, among them St John Chrysostom and St Cyril of Alexandria.
* Read the English beside the original Greek, word by word.
* Before you read: what each book is, who wrote it and when.
* Paragraph view, the minutes left in each chapter, and the next chapter waiting at the end.
* Search any verse or passage across the whole Bible, with both numberings of the Psalms.

LEARN THE FAITH

* A reading room of the Church Fathers with covers, by theme and by tradition, from the Desert Fathers to the Russian saints.
* More than 150 saints, with their lives and their writings where they survive in public domain.
* Orthodox History on one timeline from Pentecost to today, written from the sources.
* The Ecumenical Councils in their own words, doctrinal studies, and the Church's answers to the heresies.
* An Orthodox dictionary of the words you meet in church.
* Walkthroughs of books of Scripture, a chapter at a time.

NEW TO ORTHODOXY

* Start here: seven steps for anyone new to the Orthodox Church.
* Your first Liturgy: a gentle guide to a first visit, from what to wear to what you will see.
* Find a parish through the Orthodox jurisdictions' own directories.

TRUSTED TEXTS

Every text names its source. Scripture, the Fathers and the liturgical books are public domain editions, quoted word for word. Nothing is paraphrased and nothing is invented. Where a translator left a passage out, the page says so.

PRIVACY

* Your notes, highlights and bookmarks stay on your device.
* The whole library opens without an account. Sign in only to carry your reading between devices.
* Delete your account any time and it is erased from our servers.

Purify speaks 21 languages, including Greek, Russian, Romanian, Serbian, Arabic and Spanish. The prayers, the Bible and the library work offline.

PURIFY PLUS AND PURIFY PRO

The library stays free. Purify Plus adds guided reading plans, a prayer journal, Remember a verse, ambience while you read and pray, notes, highlights and bookmarks that sync across devices, custom collections and the Florilegium, and Immersive History. Purify Pro adds EIKON member benefits, and Studio Audio as it is released.

Purify Plus: $4.99 per month, or $38.99 per year.
Purify Pro: $19.99 per month, or $199 per year.

Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel any time in your App Store account settings. Payment is charged to your Apple Account on confirmation of purchase.

Purify is made by a small Eastern Orthodox team. The library is free and will stay free.

Terms of Use: https://purifyapp.net/terms
Privacy Policy: https://purifyapp.net/privacy
~~~

### Submit both builds for review

`step-submit` · A step · Yours · To do

~~~text
Android build 0 in Play Console, iOS build 0 in App Store Connect, each once it has been walked on a phone (docs/PHONE-WALK.md).
~~~

## The announcement

*The day you tell people, once the note is showing on the website.*

### The board message above the notes

`board` · The weekly board · Admin, Patch notes, the board message · Ready · 213 of 900 characters

> Eyebrow: This week at Purify. The first line is the headline, the rest is the body.

~~~text
1.7 is here

A calmer Purify, almost everywhere.
Your streak, in view on every tab.
Chants, with the words lit as they are sung.
A new reading room of the Church Fathers.
A calendar made for your phone.
The full note is below.
~~~

### The announcement

`discord-announcement` · Discord · Discord, #announcements · Ready · 1965 of 2000 characters

> Your announcement as you wrote it. It asks readers to update from the App Store or Google Play, so it goes out once the stores serve 1.7: the announcement and the store day as one day (docs/DROP.md, the six moments).

~~~text
Purify 1.7 is here ☦️

The biggest update Purify has ever had. Almost every page has been rebuilt to be calmer and simpler, and there is a lot that is new:

🔥 Your streak now sits beside Premium on every tab, and its flame grows the longer you keep it: Spark, Candle, Lamp, Crown and All flame.
🎵 Chants takes the Kitchen's place. Every chant has its own page, and the words light up as they are sung. The first is the Prayer Rope Anthem, in English, French and Arabic.
🙏 Prayers now flow down the page like lyrics, with the sign of the Cross marked where a prayer calls for it. Pray with chant on any prayer.
🕰️ The Hours as your day, Learn to pray in order, and a prayer rule of your own with Pray my rule.
📖 A cleaner Scripture screen, Before you read for every book of the Bible, paragraph view, the minutes left in a chapter, and today's readings in one go.
📚 A new reading room: the Church Fathers with covers, by theme and by tradition, and a page for every book.
👤 Saint pages made for your phone, with the Life, the Writings and the Miracles.
📜 Orthodox History, rewritten from the sources: twenty events in full, each with a picture.
📅 The calendar, made for your phone: the month fits the screen, and the day you choose shows its fast, its saints and its readings.
⛪ Your first Liturgy: a gentle guide for anyone visiting a parish for the first time.
✝️ Learn to Pray draws the Sign of the Cross, the hand and the four touches in their order.
📕 An Orthodox dictionary of 100 words you meet in church.
🔖 Saved is one clean list, and the walkthroughs read like Scripture.

With Purify Plus:
🌧️ Ambience while you read and pray, with its own volume and a sleep timer
🧠 Remember the verse, to learn your saved verses by heart
🗺️ Guided reading plans, with questions for your journal

Update Purify on the App Store or Google Play and have a look around. Tell us what you think in the suggestions channel. We read every one.

In Christ,
Edgar, the Purify Team
~~~

### The short one

`discord-short` · Discord · Discord, #general or a ping · Ready · 240 of 2000 characters

~~~text
Purify 1.7 is live on the web: a calmer Purify, chants with the words lit as they are sung, prayers that flow like lyrics and a new reading room of the Church Fathers. The apps follow once the stores approve. https://purifyapp.net/whats-new
~~~

### Purify's own post in Community

`community-post` · Purify's own post in Community · Community, signed in as Purify · Ready · 2029 of 4000 characters

~~~text
Purify 1.7 is here ☦️

The biggest update Purify has ever had. Almost every page is calmer and simpler now, and there is a lot that is new:

🔥 Your streak now sits beside Premium on every tab, and its flame grows the longer you keep it: Spark, Candle, Lamp, Crown and All flame.
🎵 Chants takes the Kitchen's place on Discover. Every chant has its own page, and the words light up as they are sung. The first is the Prayer Rope Anthem, in English, French and Arabic.
🙏 Prayers flow down the page like lyrics, with the sign of the Cross marked where a prayer calls for it. Pray with chant on any prayer.
🕰️ The Hours as your day, Learn to pray in order, and a prayer rule of your own with Pray my rule.
📖 A cleaner Scripture screen, Before you read for every book of the Bible, paragraph view, the minutes left in a chapter, and today's readings in one go.
📚 A new reading room: the Church Fathers with covers, by theme and by tradition, and a page for every book.
👤 Saint pages made for your phone, with the Life, the Writings and the Miracles.
📜 Orthodox History, rewritten from the sources: twenty events in full, each with a picture.
📅 The calendar, made for your phone: the month fits the screen, and the day you choose shows its fast, its saints and its readings.
⛪ Your first Liturgy: a gentle guide for anyone visiting a parish for the first time, from Start here on Discover.
✝️ Learn to Pray draws the Sign of the Cross, the hand and the four touches in their order.
📕 An Orthodox dictionary of 100 words you meet in church.
🔖 Saved is one clean list, and the walkthroughs read like Scripture.

With Purify Plus:
🌧️ Ambience while you read and pray, with its own volume and a sleep timer
🧠 Remember the verse, to learn your saved verses by heart
🗺️ Guided reading plans, with questions for your journal

1.7 is on the website now. On your phone, update Purify from the App Store or Google Play when 1.7 arrives there, and have a look around.

Tell us what you think right here in Community. We read every one.

In Christ,
Edgar, the Purify Team
~~~

## The day a store has it

*Each store on its own day, when it shows the version.*

### Tell installed apps there is a newer build

`step-update-prompt` · A step · Ours, on your word · To do

~~~text
When a store shows 1.7: its number goes into lib/appUpdate/release.ts (Android 0, iOS 0), committed and pushed on the owner's word. Each store on its own day, and never before the store is serving the build.
~~~

### In the stores

`discord-stores` · Discord · Discord, #announcements · Ready · 472 of 2000 characters

> Not needed when your announcement goes out on the day the stores have 1.7: it already asks readers to update. If one store approves first, post this for that store alone and name it.

~~~text
Purify 1.7 is in the App Store and on Google Play 📱

Update Purify to get it inside the app:
• A calmer Purify, almost everywhere
• Your streak, in view on every tab
• Chants, with the words lit as they are sung
• Prayers that flow like lyrics, and Pray with chant
• A new reading room of the Church Fathers
• A calendar made for your phone

App Store: https://apps.apple.com/app/id6798897857
Google Play: https://play.google.com/store/apps/details?id=net.purifyapp.purify
~~~

### The release email

`email-release` · The release email · Admin, Email, the release email · To do

> It needs the release's note accepted. Before a store has the build it describes things a reader in the app cannot open yet.

~~~text
Its words are in lib/whatsNew/releaseEmail.ts, so the email that is read is the email that is sent. Read it first: node scripts/release.mjs email. Send it from Admin, Email, in place of that week's Sunday email.
~~~

### A letter to people who should hear it from you

`letter` · A letter from your own mail · Your own mail, one address at a time or in BCC · Ready

~~~text
Purify 1.7 is out

[Name],

Purify 1.7 is out, on purifyapp.net and in the stores. It is the biggest update Purify has had: a calmer Purify to read, pray and listen.

What is new, briefly:
- A calmer Purify. One top bar on every tab, new Today, Discover and You screens, and quieter pages across the app.
- Your streak, in view. A flame and your count beside Premium on every tab, and a flame that grows the longer you keep it.
- Chants. In the Kitchen's place on Discover, with the words lit as they are sung. The first is the Prayer Rope Anthem, in English, French and Arabic.
- Prayers that read like lyrics. Every prayer flows down the page line by line, and Pray with plays a chant on a loop while you pray.
- A reading room of the Church Fathers. Covers, rows by theme and by tradition, short reads, a search with filters, and a page for every book.
- A calendar made for your phone. The month fits the screen, and the day you choose shows its fast, its saints and its readings.
- Your first Liturgy. A gentle guide to your first visit to a parish, one card at a time, from Start here.

The Scriptures, the saints, the prayers and the calendar stay free.

If anything in Purify is wrong, or could serve you better, tell us. We read everything.

Edgar, the Purify Team
purifyapp.net
~~~

### The release cards

`cards` · The cards · Instagram and TikTok, from the files · Waits

Waits on: the card set has not been made yet (purify-ads, the social team)

### The caption for the cards, on Instagram

`instagram-caption` · Instagram caption · Instagram, the caption · Ready · 436 of 2200 characters

~~~text
Purify 1.7 is here: a calmer Purify to read, pray and listen. Orthodox chants with the words lit as they are sung, prayers that flow like lyrics, a reading room of the Church Fathers, your streak in view on every tab, and a calendar made for your phone. The Scriptures, the saints, the prayers and the calendar stay free. Find Purify: Orthodox Hub on the App Store and on Google Play. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

### The caption for the cards, on TikTok

`tiktok-caption` · TikTok caption · TikTok, the caption · Ready · 257 of 2200 characters

~~~text
Purify 1.7 is here: Orthodox chants with the words lit as they are sung, prayers that flow like lyrics a reading room of the Church Fathers, and your streak in view on every tab. Find Purify: Orthodox Hub. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

## A few days later

*Once most phones have updated.*

### A notification to every reader

`push` · A notification · Admin, Push · Ready · 117 of 300 characters

> Opens /whats-new. A notification may carry no digits, so it cannot name the version. Send yourself one first.

~~~text
A calmer Purify

Chants with the words lit as they are sung, a reading room of the Church Fathers, and a calendar made for your phone.
~~~

### Try this first

`discord-try` · Discord · Discord, a thread under the announcement · Ready · 478 of 2000 characters

~~~text
Four things to try in 1.7:

1. Chants. Open Chants on Discover, play the Prayer Rope Anthem, and follow the words as they light up.
2. Pray with chant. On any prayer page, tap Chant beside Pray with, then Play while I pray.
3. Your first Liturgy. Open Start here on Discover, then Your first Liturgy, and go through it one card at a time.
4. Your streak. Tap the flame beside Premium to see every flame you can reach.

Tell us what you find, and what breaks. We read everything.
~~~

## A week later: the numbers

*Once the release has had its first week.*

- Not read out yet.

### The first week's numbers

`numbers` · Read-only SQL · Supabase, the SQL editor · Yours · To do

> Run it in Supabase and read us the rows: we keep them in your words with node scripts/drop.mjs numbers 1.7 --words "...". It only reads. Written out from lib/drop/numbers.ts each time the kit is made, so it counts this drop's own week. Which version an app is on is not in the database: Play Console and App Store Connect show that.
