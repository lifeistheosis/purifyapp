import Link from "next/link";
import { BoardMessage } from "@/components/whats-new/BoardMessage";
import { ChangelogControls } from "@/components/whats-new/ChangelogControls";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";
import { T } from "@/components/i18n/T";

export const metadata = {
 title: "What's new",
 description:
 "Patch notes and a message from the Purify team about what the site offers today and what's coming next.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

type Entry = {
 version: string;
 kind: string;
 date: string; // human-readable, used as the group key
 blurb: string;
 items: string[];
};

// Newest first. Grouped by `date` (string equality).
const ENTRIES: Entry[] = [
 {
 version: "1.2",
 kind: "The Fathers say what they actually wrote",
 date: "August 20, 2026",
 blurb:
  "Purify 1.1 opened Job and Luke. This release is about whether the words already standing under a Father's name are his. In five places they were not, and the largest of them had been there since Job arrived. St Gregory's Morals on the Book of Job, the longest work in the library, was carrying eleven thousand broken characters: every quotation mark in it reached you as a question mark. That is repaired. So is St Cyril's Greek, which had been printing as raw code. And nearly sixteen thousand words that were never patristic text at all have been taken out of the Fathers' mouths, including the title page of one book sitting inside a homily on another, and a Victorian editor's opinion filed under St Gregory. Gregory's Morals can now be read straight through as a book rather than only met a verse at a time, and a chapter with no commentary says so instead of showing you nothing.",
 items: [
    "Job reads properly. St Gregory the Great's Morals on the Book of Job is the largest work in Purify and it arrived damaged. The pages it was taken from are published in an older character set and do not announce it in the way a browser expects, so every curly quotation mark, every apostrophe and every section sign was destroyed on the way in and reached you as a question mark. Seven hundred and ninety five of its nine hundred and twenty notes were affected, eleven thousand one hundred and twenty five characters in all. A reader met sentences like 'by ?the seven sons? is represented the order of the Preachers' throughout the whole of Job. The text has been fetched again and decoded correctly. Nothing was rewritten to repair it: the same nine hundred and twenty notes stand, under the same thirty five books, and the only difference is that the punctuation Gregory's translators printed is now the punctuation you see.",
    "St Cyril speaks Greek again. Where the Oxford translators of St Cyril of Alexandria set a phrase in the original Greek, Purify was printing the underlying code instead of the letters, so a line of Cyril on Luke or John could run for half its length as a string of ampersands and numbers. Two thousand six hundred and seventeen of these have been decoded and now read as Greek. The same fault had been quietly deleting other characters without saying so, which had run two words together in Job. Both are fixed.",
    "The back matter is out of the Fathers' mouths. These works come to us as scans of printed volumes, and a printed volume does not stop where its author does. It continues into footnote lists, the title page of whatever is bound next, and the editor's own essays. In five places that material had been read as though it were the Father still speaking. Every homily on the First Epistle of John carried its own footnote list as if it were prose, ten thousand eight hundred and fifty seven words of bare Scripture references reading as St Augustine. A note at Matthew 7:21 held four thousand words of the front matter of a different book of Augustine's, its title page and its translator's credits and an introductory essay by its editor. All of it is gone. Nothing of the Fathers went with it: every note that was shortened is word for word what it was, up to the point where the printer stopped and the apparatus began.",
    "A note that was not St Gregory's. At Job 38:33 a note ran to seventeen hundred words, and about a thousand of them were not St Gregory. They were a footnote added by the volume's editor in 1844, arguing at length about how Gregory's language on the procession of the Holy Spirit should be read. It carried no mark to say the voice had changed, so it read as Gregory's own words on a question the Church takes seriously. It has been removed. This is a correction of who is speaking and not a judgement about the question itself, which is not something a library settles on its own.",
    "St Gregory's Morals can be read as a book. Gregory speaks in more of this commentary than anyone except St John Chrysostom and St Augustine, one thousand one hundred and seventy nine times, and until now his profile held his life and none of his writing. The whole of the Morals on the Book of Job is now on his page, all thirty five books of it, to be read straight through in the order he wrote it rather than only met a verse at a time. It is the longest thing in the library by a wide margin. It opens on his own summary of the first book and ends where he ends, asking that the reader who receives words by his means might give him tears in return.",
    "St Jerome has four of his own works. He speaks in eight hundred and fifty one notes of the commentary, third after St John Chrysostom and St Augustine, and his page held his life and nothing he wrote. Four treatises are on it now, from the Oxford translation of 1893: the lives of Paulus the first hermit, of Hilarion who carried the desert into Palestine, and of Malchus, an old man Jerome met in Syria who had been taken by raiders on the road and kept his continence through slavery; and the Perpetual Virginity of Blessed Mary, the treatise in which he answers Helvidius that the brethren of the Lord are His kinsmen and that the Mother of God remained ever virgin. Where the volume's editor introduces a work, that introduction is kept but marked as his, so it is never mistaken for Jerome.",
    "A chapter with nothing says so. Some books carry the Fathers on a few chapters and nothing on the rest. Genesis has commentary on one chapter of fifty, Exodus on one of forty, First Samuel on one of thirty one. Until now the other chapters showed nothing at all, with no explanation, so a book marked as having the Fathers looked exactly like a book that has none. One hundred and twenty three chapters now say plainly that there is no commentary for them. The Fathers are not hidden on those pages; there is genuinely nothing there to show, and for most of the Old Testament there never will be, because no translation of it into English exists that is free of copyright.",
    "Where the commentary reaches now. Twenty six books of the Bible carry patristic commentary, four hundred and thirty five chapters of the one thousand three hundred and forty six, in twelve thousand and forty five notes. Twenty four voices speak in it and every one of them is venerated by the Church. Every note names its Father, its work and the public-domain edition it was taken from.",
 ],
 },
 {
 version: "1.1",
 kind: "Luke and Job are opened, and every voice is a saint",
 date: "August 12, 2026",
 blurb:
  "Two books that carried no commentary at all are open. Luke now has St Cyril of Alexandria across all twenty four chapters, and Job has St Gregory the Great across all forty two, the largest single work in the library by a wide margin. Cyril's commentary on John arrives as well, the fullest Greek reading of that Gospel that survives. And every name in the commentary is now one the Church venerates: two thousand five hundred and twelve notes standing under nineteen other writers have been taken out. Purify 1.1 also brings in the stylites, the pillar-saints who kept their whole ascetic life on top of a column, gathered under a new heading on the saints index. The Hours page tells you which Hour you are in, days without a saint carry a saying of the Desert Fathers, and search reaches the whole library from your phone.",
 items: [
    "Luke has the Fathers. It was the last Gospel with no commentary at all: St John Chrysostom never wrote on it, and the Golden Chain volumes we hold are Matthew and Mark. It now carries St Cyril of Alexandria, one hundred and eighteen sermons reaching every one of the twenty four chapters, with St Augustine beside him. Cyril's Greek survives only in fragments, so what you are reading was preserved whole in Syriac and translated at Oxford in 1859.",
    "Job is open, and it is the largest thing here. Job had nothing. It now carries the whole of St Gregory the Great's Morals on the Book of Job, thirty five books of it, reaching all forty two chapters. It is the longest work in Purify, longer than Chrysostom on Matthew and longer than Augustine on the Psalms. Gregory began it as talks to the brothers who had travelled with him while he was the Pope's representative at Constantinople, and spent years finishing it. It is far more about the Christian soul under affliction than about the argument of Job's friends. The translation is the Oxford one of 1844.",
    "John has the fullest Greek commentary that survives. St Cyril of Alexandria's Commentary on John, twelve books of it, now stands beside St John Chrysostom's homilies and St Augustine's Tractates. Chrysostom preached John to a congregation; Cyril wrote it out. Two of Cyril's twelve books are lost in Greek and are here from the fragments and the Syriac, and the pages say where that is the case. John is now read by nine Fathers.",
    "St Augustine in the pulpit. Sermons on Selected Lessons of the Gospels, eighty eight of them, preached to a congregation rather than composed for readers. They read differently from the Tractates for that reason, shorter and more direct. Because Augustine chose his text rather than working through a book, they are spread across Matthew, Mark, Luke and John instead of sitting in one place.",
    "St John Cassian's own words. His profile carried his life and none of his writing. Both of his works are here now, the Institutes and the Conferences, the books through which the prayer of the Egyptian desert reached the West. Three sections are absent and say so on the page: the nineteenth century translators declined to render them, and no other public-domain English of Cassian exists to fill the gap.",
    "Every voice in the commentary is one the Church venerates. Most of Matthew and Mark come from the Golden Chain, a thirteenth century Western compilation that quotes whoever served the argument. That included writers the Orthodox Church does not receive as Fathers, works written under borrowed names, and Origen, whose teaching was anathematised at the Fifth Ecumenical Council. Two thousand five hundred and twelve notes standing under nineteen such names have been removed: Origen, Rabanus Maurus, Remigius, the Gloss, Anselm, Ambrosiaster, Haymo of Halberstadt and the rest, together with the Pseudo-Chrysostom, Pseudo-Jerome, Pseudo-Origen and Pseudo-Augustine material. What remains is twenty four voices and every one of them is venerated. Nothing was rewritten and nothing was paraphrased. A note was removed whole or left exactly as it stood.",
    "The scanner's leavings are out of the Fathers' mouths. These texts come to us as scans, and a scan carries the whole book: the index of subjects, the index of Scripture references, the concordance to the printed page numbers, the raw list of footnote links. In several places that apparatus had been read as prose and filed under a Father's name at a verse. The worst of them sat at John 21:19, ran to about ninety thousand words, and contained two entire other works that had simply been swept in behind the last tractate. Roughly one hundred and seventy one thousand words of this have been taken out. No commentary was lost with it: John still opens at every verse it opened at before.",
    "The Fathers we quote have pages of their own. Eight of them had no profile to tap through to: St Gregory the Great, St Jerome, St Bede, St Hilary of Poitiers, St Ambrose, St Victorinus of Pettau, St Isidore of Seville and St Peter Chrysologus. They have profiles now. None of the eight carries an icon, because no image of them has been opened and checked yet, and an unchecked image is not shipped here.",
    "Where the commentary reaches now. Twenty six books of the Bible carry patristic commentary, four hundred and thirty five chapters of the one thousand three hundred and forty six, in twelve thousand and forty eight notes. It was three hundred and sixty nine chapters before this release. Every note names its Father, its work and the public-domain edition it was taken from.",
    "A note on Romans that nobody could open. St John Chrysostom's homily on the closing doxology was filed at Romans 14:25, and our text of that chapter ends at verse 23, so it sat past the end where nothing could reach it. It now sits at Romans 16:25, where the words it quotes actually are.",
    "The pillar-saints have their profiles. Symeon the Stylite, Daniel, Symeon of the Wonderful Mountain and Alypius, four men who spent their lives on top of a column in full view of the world. They are gathered under a new Stylites heading on the saints index, and their days in the calendar now open to them.",
    "Sign in works on iPhone. The app was throwing your session away on every reload and sending you to the wrong page afterwards, so it looked like signing in had failed.",
    "Light mode is free. It was built months ago, named Parchment, and filed behind Pro by mistake. It is called Light now and everyone has it.",
    "Premium Reading Modes moved from Pro to Plus.",
    "The calendar shows today. On iPhone and Android it was stuck on the day the app was built, and nothing you tapped moved it.",
    "Lenten readings were a week late. Every Sunday from Zacchaeus to Palm Sunday showed the previous week's Epistle and Gospel. Holy Monday through Holy Saturday now have their own readings.",
    "The calendar is easier on the eyes. It was drawn on pure black with the brightest grey in the palette for its lines. It follows the light and dark themes properly now.",
    "Search works on a phone. The search index was inside the app the whole time, behind a window that could not open.",
    "Long commentary is readable. Two notes were showing a scraper's list of links as if it were St Augustine. Long notes now preview first and tell you the reading time.",
    "On the days with no saint profile, a saying of the Desert Fathers appears instead of an empty page.",
    "The Hours page tells you which Hour you are in.",
    "The saints of August have their icons.",
    "Searching the saints drew the results underneath the icons, so the names were there but unreadable. The same fault affected every dropdown in the app.",
    "The button that said Open Purify now opens Purify.",
    "On the mobile website the last verse of a chapter sat under the reader pill. The spacing meant to prevent that was removing it.",
    "The header no longer jumps when you leave the home page.",
    "A copied link pointed at the phone that copied it.",
    "Renewing Plus could quietly cancel a Pro membership.",
    "Shop star ratings now count verified purchases only.",
    "The calendar sends about a fifth of the data it used to, and asks the network three times instead of forty seven.",
    "iPhone has its own Plus switch, so a Play Store change cannot affect it.",
    "Every saint icon now carries a record of where it came from.",
    "These notes fold into years and months, so 89 releases are no longer one flat column.",
    "The opening offer is withdrawn. Both paid tiers were advertised at half off the first year and the discount never actually applied at checkout, so the claim is gone from the pricing pages, the plan copy and the Terms rather than left standing. Nobody was charged a discounted rate that later rose; the prices shown have always been the prices charged.",
    "On the home page, See today sits level with the Open Purify button again instead of below its middle. The quieter install line under the button had been pulling it down.",
 ],
 },
{
 version: "1.0",
 kind: "Purify on iPhone",
 date: "August 6, 2026",
 blurb:
  "Purify has been an Android app and a website. It is an iPhone app as well now, built from the same library and working the same way with no signal, and that is most of this release. The rest is a short run of repairs. One of them took the navigation away for as long as the anthem was playing. One is a single word in the Psalter that has been wrong since it was transcribed. And one is the half of a fix from four days ago that had been left undone, so that accounts made inside the app were shown the Terms and then kept no record of it. Beta 3.0 was finished on the second of August and held back so that it and the iPhone app could arrive together, so everything in its notes arrives with this.",
 items: [
    "Purify has an iPhone app. There has been an iOS folder in Purify since the middle of June. What was in it would not have built, and had it built it would have been the wrong app: a window onto the website rather than Purify itself, which is neither what the Android app is nor something Apple accepts. It is a real app now, made from the same library and working the same way. The prayers, the Scriptures, the saints, the councils, the calendar and the whole reading room travel with it and open with no signal, exactly as on Android. As this goes out it is with Apple rather than on the App Store. Every app and every update is reviewed, and there is no honest way to name the day it will appear, so this note will not pretend to. One thing an iPhone reader should know in advance: swiping from the left edge to go back does nothing yet. Android's own back button has been handled for a long time and the iPhone gesture has not, and it is the first thing on the list after this.",
    "Starting the anthem took the navigation away. The player and the row of tabs were both pinned to the bottom of the screen, and the player was drawn on top of it. So beginning the anthem covered the navigation completely, and it stayed covered for as long as the music played: the only way to leave the screen you were on was to stop praying along. It was reported from a device, with a screenshot. The note in the code said the player sat above the tab bar so it would never be covered, which was an answer to the wrong question. Deciding which of two things paints on top does not stop them standing in the same place. The player now sits above the bar by exactly the bar's own height, measured from the same value the rest of the app uses for it, so the two cannot drift apart. On the website, where there is no tab bar, it stays at the bottom where it belongs.",
    "The sheet on a verse was three faults, and only one of them showed. Reported from a device as popups having no animation. It did not animate, and looking into that turned up two worse things in the same forty lines. It never told the tab bar to step aside, and it was drawn at the same depth as that bar while being rendered in place rather than lifted out to the top of the page, which means its depth was measured against the wrong thing entirely. Together those left the tab bar lit and, worse, still tappable over an open panel. That is the same shape as a fault reported twice from the Android beta, which cost a release to find the first time. Purify already had a component that had solved all three, with seven screens using it, so the verse panel now uses it too. Two further faults of the same kind were fixed while there: one panel raised the flag that moves the tab bar and never lowered it if it was closed by its parent, which left the tab bar dead for the rest of the session, and two others lowered it at the start of their closing animation, so the bar came back a fifth of a second before the panel had gone. This one has not been opened on a device yet, which is the only reason it is described here rather than declared fixed.",
    "Six titles in the reading room were set in the wrong face. They were rendering in DM Serif Display, which the app keeps for large ornate headings, at nineteen pixels in a list. That face draws its thin strokes very thin on purpose, and at list size they go spindly, so the titles read worse than the face the rest of the app reads in. They were paragraphs rather than headings, which is exactly how they slipped past the rule that puts every real heading in the right face. The page's own title keeps the display face, because at that size it is the ornate heading the face was added for.",
    "Psalm 135:4 said along where it should say alone. To him who along has wrought great wonders. Brenton reads alone, which is what the Greek says. A single transcription slip, and the whole psalter was checked to be sure it was the only one. It was. It came to light while confirming something worth writing down: Purify's Psalm 135 is the Polyeleos, Give thanks to the Lord for he is good, with its twenty-six fold refrain. A psalter of one hundred and fifty-one psalms is numbered the Septuagint way, so this is not the Psalm 135 of a King James Bible, and anything matched to Purify by that number needs to know which of the two it means.",
    "Sign in with Apple works. The sign-in screen has carried a greyed-out Apple button labelled coming soon since it was built, and the connected-accounts screen said coming soon even to readers whose account was already linked through Apple. Both of those are gone, replaced by the real thing rather than by a better promise. It is offered on the website, and it will be there on the iPhone app when that arrives. It is not offered in the Android app: Apple gives no proper way to do it there, and a button that fails after you have committed to it is worse than no button. The connected-accounts screen tells the truth now too, so an account already linked through Apple is described as connected.",
    "Accounts made inside the app left no record of agreeing to the Terms. Beta 3.0 said that five hundred and seventy-two accounts made through Google had never been shown the Terms, and fixed it. The fix was only half a fix, and this is the other half. The part that records the agreement runs on the website, at the moment the account comes back from Google. In the app nothing comes back from anywhere: it asks Google directly and is answered directly, so that moment never happens and nothing was written down. Everyone was shown the notice, which is the part that matters most, but the app kept no record of having shown it. It records one now, before it moves you on, and it does not repeat one for the same person. This depends on a change to the database that has to be applied by hand, so until that is done the record is still not being kept, and it should not be assumed to be.",
    "Housekeeping, and what is still not on. The iPhone app carries the same launcher cross as Android; the one in the project was still a stock placeholder from the day it was created, on a white background that would have flashed white every time the app opened. The check that holds Purify's version numbers in step now covers the iPhone one as well, which is the actual reason it sat at 1.0 for the whole of the Beta 2 series: it was in nobody's list. Two things are still dark and are not claimed here. Prayer reminders still cannot be delivered, for the reason given at length in the Beta 3.0 notes, and that has not changed. And Purify Plus is not purchasable on iPhone in this build; where it cannot be bought, the app says so plainly rather than offering a button that fails. Beta 3.0 was finished on the second of August and held so that it and the iPhone app could arrive together, so everything in its notes arrives with this one.",
 ],
 },
 {
 version: "Beta 3.0",
 kind: "What the app was not saying",
 date: "August 2, 2026",
 blurb:
  "Nearly everything here is something Purify already knew and was not telling you. The account of the Council of Florence was four paragraphs on the council the Orthodox reading of church history keeps returning to. A Father's page did not say when the words on it were not his. August could name six of its sixty-two commemorations. The daily page on a computer showed less of the day than the phone does, and its date read in English whatever language you had chosen. Accounts created through Google were shown no Terms at all, five hundred and seventy-two of them. The Android app had never reported a single session, and the prayer reminders had nothing scheduled to send them. This release is mostly the app saying what it already had.",
 items: [
  "The Council of Florence, at full length, and a new kind of section under it. Florence was the thinnest account in the timeline, four paragraphs and three sources with no artwork, on the council the Orthodox reading of church history keeps returning to. It is about seven times longer now, sixteen paragraphs against four: the run up that everyone at the council remembered, the two questions actually put, whether the addition to the Creed was lawful and whether it was true, the wearing down of a delegation living on a papal allowance, and the decree of 5 July 1439 that thirty-three Greeks signed and Mark of Ephesus did not. There is a section on what flowed from it, from Varna to the synod of 1484 that set the union aside, and a note saying plainly which parts of the story are contested. Sources go from three to nine, four of them modern histories, one of which is sympathetic to the union. Under the narrative sits something new to the format rather than to this one article: a step by step timeline, twenty-four dated steps from 1274 to 1484 with its seven turning points drawn heavier. Any long event can carry one now, and Florence is the first to use it. It is a numbered list underneath, so it reads in order to a screen reader, and a check refuses any timeline whose steps lack a date, lack a claim, or run backwards. Four images arrive with it, shown in Immersive History, each with its source and licence recorded: Pisanello's sketches of the emperor made at the council itself, the decree with its Latin and Greek columns and its two seals, a Gozzoli fresco, and a Nuremberg Chronicle woodcut. Florence sits higher on the timeline now and answers to two more names in search, Laetentur Caeli and the Union of 1439. And five studies in the theology library, among them the one on why the Church does not receive Florence, now carry a link to the events behind them.",
  "Saints' pages say whose words you are reading. A Father's page is set in serif, and a reader skimming it is entitled to assume the serif is the Father speaking. On a number of works that assumption was wrong, and nothing on the page said so except a sentence at the end of a long editor's note. The Martyrdom of Polycarp is the church of Smyrna writing about him. St Nicholas's troparion is the Church's hymn to him. The miracles in the Life of Antony are Athanasius narrating. Each of those sections now carries a quiet band above it naming whose words follow, set in sans against the reading serif so a skimmer registers it without being shouted at. Where the words are the saint's own, which is the usual case, it says nothing at all. One hundred and thirty-three sections across fifty-three works are labelled so far, fewer than one in ten of the library, and the rest are left unlabelled rather than guessed at. The same restraint now governs what search engines and machine readers are told: a work carrying our own retelling is no longer published as a book the saint wrote, and a work whose sections are not yet labelled makes no claim about its author at all. That is the one class of mistake nothing ever corrects, because it is copied and repeated.",
  "August has its saints. The whole month, in two passes: thirty-seven new profiles, eleven for the first part of August and twenty-six after it. The month can now name forty-eight of its sixty-two commemorations, against six before this release. Stephen the Protomartyr, the first martyr of the Church, had no profile at all, and the second of August pointed nowhere. Two feasts that existed in the registry but had no place in the month are in it now, Irene the Empress on the seventh and Cosmas of Aetolia on the twenty-fourth. Where a public domain text exists the saint arrives with their own writings to read in full, one hundred and twenty-eight chapters and about thirty-one thousand five hundred words of them. Cyprian of Carthage comes with four: The Life and Passion of Cyprian, written by his own deacon Pontius, On the Unity of the Church, On the Lord's Prayer, and On the Mortality. The Abgar documents come with Thaddeus of Edessa. Six commemorations were held back rather than written thin, and the reason for each is written down. The tool that fetches and prepares these texts is new, and three faults in it were caught by the run itself, one of them visible to a reader: files that landed before the fix ended with a stray footnotes heading sitting inside a Father's text as though he had said it.",
  "Today, on a computer. On the web there is no Today tab. The daily prayer page is the only Today the site has, and it had been showing less of the day than the phone does, laid out for a narrow column. It now opens with the date and the day's fast set against it, then the one rule the hour asks for with a button to begin, then the Verse of the Day, which the web did not carry at all. Beside them, in their own column, is the Church's own reckoning of the day: the saint with their icon, the fast in full words, the appointed readings, and the count to Pascha. Those are drawn by the same part of the app the phone uses, so the two can no longer disagree about what day it is. The page holds more and is close to a third shorter, from about 2,500 pixels tall to about 1,800 on a 1440 by 900 screen, and the first screenful carries the date, the rule for the hour, the whole verse card and all four of the Church's cards. The wait before it appears looks like the page now as well. It had been borrowing the phone's loading shape, which on a computer was one large pulsing grey block.",
  "The Today page can be read by more people. Every small label on it was drawn faint. The labelling the whole page is built from sat at just under four to one against the background, and the arrow at the end of each prayer row at a little over two to one, where the readable standard is four and a half to one. They have been lifted out of that range, and the labels on the Church's cards sit near six to one. The page also had one heading and then eight blocks with no heading at all, which a screen reader met as a wall, and one line that was styled to look like a heading without being one. Every section carries a real heading now, in order, with no level skipped. And each prayer row shows a clear ring when you reach it by keyboard and lights as you pass over it with a mouse, which the rows did not do before. Those rows are listed in six places in the app, so that part reaches well beyond this page.",
  "The date reads in your language. The heading on the Today page was assembled from a list of English weekday and month names, so it read Sunday, August 2, 2026 in all twenty-one languages Purify offers. It reads in yours now. Nine more strings on the same page were English in every language for the same reason: the whole of the section that remembers where you left off, the anniversaries in your diptych, and the two notes the verse card shows when you save a verse.",
  "Accounts made with Google were never shown the Terms. Creating an account through Google presented no Terms notice of any kind, while the two email forms both did. Five hundred and seventy-two accounts were made that way and were never shown them. Signing in and signing up with Google now carry the notice, and it sits above the buttons rather than below them, so it is passed on the way to the account and not after it.",
  "The Android app had never reported a session. Not a screen view, not a session, nothing, for as long as it has been installed on anything. The cause was narrow. The app runs from its own address on the device and posts to purifyapp.net, and the endpoint receiving those posts refused anything that did not come from the website itself, so every pageview from an installed app was turned away. The endpoint now recognises the app's own shells by name, and nothing else. Reporting works from this build onward, which means the record starts when the next Android build is installed rather than filling in anything already on a phone.",
  "Prayer reminders had nothing to send them. Two scheduled jobs existed in the code, one to deliver prayer reminders and one to record the day's donations, and nothing anywhere called either of them. A schedule exists now and is kept in the repository so it can be read and changed like everything else, but it will not run until one secret is set in two places, and the donations record waits on that same secret. Delivery waits on more than that: no phone has ever been able to register for a notification, because the step that asks your permission is itself waiting on its keys, so there is nothing yet to send to. What arrives here is the mechanism, and an honest count. The sending panel used to write a line saying a broadcast had gone out when it had resolved nobody to send it to, which happened three times in July. It now refuses the send and says which part failed.",
  "The app will tell you when there is a new version. Purify cannot make your phone update itself. Whether an app updates on its own is a setting in the Play Store, on your device, and no app is allowed to reach in and change it. What Purify can stop doing is leaving you to find out on your own. When you open it and the version you have is behind the one on the store, it now says so, with a button that takes you to the listing and a Later that costs nothing. It asks once each time you open the app, not once per screen. It will not make the download smaller, and that is the part worth being honest about: Purify is a large app because the whole library travels with it and works with no signal, and a large update is exactly the kind the Play Store holds back until you are on wi-fi. Making that download much smaller is the next piece of work.",
  "A run of Android repairs. The app was registering the website's background worker, which could serve it a stale copy of the site instead of its own. That worker is now cleared away on launch, along with the copies it had kept, so a tester stuck on an old bundle comes right the next time the app opens, and reinstalling gives a clean slate rather than restoring what was there before. The bar at the top of the screen had been slipping under the status bar, because the spacing around the notch and the home bar was being read as nothing at all. It is handled by one thing now instead of two disagreeing. The gap above the keyboard is no longer a grey box. As with everything on this list that lives in the app rather than on the site, none of it reaches a phone until the next build is installed.",
  "Form fields no longer zoom the page. Tapping a text field on a phone zoomed the whole page in, because the text inside the field was under sixteen pixels and the browser magnifies to compensate. Every form control is pinned to sixteen now.",
  "Housekeeping. A developer panel for the accounts on the allow list, reached from a row only those accounts see on the mobile account screen, which can switch on a test subscription without touching a real one. New checks run over the saints' library with every change: they refuse a registered work with no file behind it, a file that disagrees with the registry, a writing nothing cites, and a date in the month pointing at nobody, and they flag an em dash anywhere a reader can see one, with the ten that already exist listed by name so the debt stays visible and nothing new joins it. The blurb on the Apostles now names the Seventy He sent ahead of Him two by two. The cache version steps to purify-beta-3.0.0, so a returning reader is served this build rather than the last one.",
 ],
 },
 {
 version: "Beta 2.9",
 kind: "The app moves like one thing",
 date: "August 1, 2026",
 blurb:
  "Almost all of this one is about how Purify answers your thumb rather than what is in it. Moving between the seven tabs was a hard cut: one screen vanished, the next appeared already finished, and on a slower phone there was a blank moment in between with nothing to say that your tap had registered. Screens now leave and arrive. Titles and cards settle rather than snap. And the Fathers' commentary, which a reader in the Android beta reported twice, is finally clear of the tab bar.",
 items: [
  "The tab bar no longer covers the commentary. A reader in the Android beta reported twice that the last lines of a Father were unreachable, and then that a second commentary on the same verse could not be opened at all. Both were the same fault: the bar at the foot of the app was drawn on top of the sheet. Text sat behind it, and any commentary heading that scrolled into that band took the tap itself. The July fix added space at the bottom of the sheet, which moved the text but left the bar taking the taps, because space underneath cannot stop something drawn on top. The bar now steps aside for as long as the sheet is open.",
  "The mark that opens a commentary is big enough to hit. On a phone, a verse with commentary carries a small red verse number and a dot, and tapping it opens the sheet. That mark measured five pixels tall, so a tap landed beside it more often than on it. The area that answers your thumb is now about twenty five pixels square. The mark itself is unchanged: same size, same colour, same place, and the lines of the verse have not moved by a pixel.",
  "Moving between tabs is one motion instead of a cut. Tapping a tab begins fading the screen you are leaving in the same instant as the tap, before the app has started building the one you asked for, and the new screen fades in as it arrives. Leaving takes about a seventh of a second and arriving about a quarter. The bar itself never fades, so the tab you pressed lights up immediately and the app answers you before the page does.",
  "Screens settle into place. A screen's title, and then the cards under it, rise a few pixels as they fade in, each a fraction behind the one above: six pixels for a title, eight for a card, thirty eight thousandths of a second apart. The reading screens are deliberately left out, because their chapter pill, verse toolbar, progress bar and commentary sheet are pinned to the glass, and anything that moves the page underneath them drags them out of position. That is the same fault as the tab bar over the commentary, and it is now guarded by a test.",
  "Everything you press answers the same way. How far a control dips when you hold it is two numbers for the whole app, one for small things like pills and icon buttons and one for large tappable cards and rows, rather than being retyped at every place that wanted the effect. Seven places on the mobile screens had rolled their own slightly different version and now use the shared ones.",
  "Waiting looks like the screen you are waiting for. Discover, Prayers, Account and the campaigns list showed a line of grey text while they loaded, or nothing at all. Each now shows the shape of what is coming, so the layout does not jump when the content lands.",
  "If you have asked your phone for less motion, there is none. Every animation here is switched off when your device is set to reduce motion. Not shortened, switched off.",
  "The two thin gold progress bars, the one at the top of a chapter and the one on a saint's work, are now the same piece of the app rather than two copies of the same eight lines. Cache version steps to purify-beta-2.9.0.",
 ],
 },
 {
 version: "Beta 2.8",
 kind: "Daniel is whole again, and the app stops saying everything twice",
 date: "August 1, 2026",
 blurb:
  "Two things in this one. Three passages that were missing from Daniel are restored, which is what the last update said would happen. And the app has stopped repeating itself: the same page was offered to you under three different names, screens announced themselves twice before you had read a word, and the prayer index printed thirty-four rows for twenty-seven prayers. Underneath all of it sat one real fault worth naming on its own: readers who keep the Old Calendar were being shown the wrong saint and the wrong fast on the daily prayer page.",
 items: [
  "Susanna, Bel and the Dragon, and the middle of Daniel 3 are here, as the last update promised. Daniel now has fourteen chapters: Susanna is 13 with sixty-four verses, Bel is 14 with forty-two, and chapter 3 now runs to verse 97, with the three young men falling bound into the furnace at verse 23, the Song of the Three from 24 to 90, and Nabuchodonosor hearing them sing at 91. Brenton's numbering has no verses 67 to 70, so the chapter holds ninety-three verses across a range ending at 97. All of it from the same public domain Brenton Septuagint as the rest of the Old Testament.",
  "Two consequences worth knowing. Daniel 3 verses 1 to 23 are where they always were, but sixty-three verses were restored in the middle, so anything you had highlighted or bookmarked in that chapter after verse 23 now sits at a different number, and what used to be 3:31 to 3:33 has moved into chapter 4.",
  "The Greek column is blank alongside the Song itself. The Greek edition we carry orders that canticle differently from Brenton, and showing you a Greek verse that is not the one you are reading would be worse than showing you none.",
  "The Old Calendar is kept on the daily prayer page. If you keep the Old (Julian) Calendar, that page was showing the New Calendar's commemoration and fasting rule while the Today screen, one tap away, showed the right ones. The appointed readings and the count to Pascha deliberately do not shift with it, because both reckonings work out Pascha the same way.",
  "One name for one place. The daily prayer page was offered inside the app as a tile called Today in Prayers, a tile called Daily readings in Discover, and a chip called Prayer on your account screen, all the same screen. The tiles are gone, and tapping in Prayers no longer moves the lit tab to Today.",
  "The reading room listed the saints twice, as Patristic works and The saints' writings, both going to the same place with nothing to tell them apart. It lists them once.",
  "Each prayer is listed once. The index showed the popular rules and then every category in full without leaving out what it had just shown, so seven prayers appeared twice and two more repeated the tiles above them. Every prayer is still there. The suggestions for the hour still sit at the top.",
  "Screens say their name once. Discover said Discover in the bar, again over the picture, and a third time on the tab below. The picture keeps its place and its credit and stops repeating the title.",
  "Three title bars on Discover, Reading and Prayers were being drawn that no screen size could ever show, which is why those screens had no back bar.",
  "The account screen no longer repeats itself. Opening Account and security repeated eight of the nine rows you had just left, under a second copy of your name and the same four counters. On a phone it is the security, sessions and data screen it was meant to be; Export your library and My prayers moved onto the You tab so nothing was lost. On a computer it is unchanged.",
  "Recently saved items led nowhere. The Last saved cards on the account dashboard were built from the wrong description of a bookmark, so every one linked to a chapter that does not exist. They open what you saved.",
  "The tab bar fits other languages. In Greek, Russian, Romanian and French it ran off the side of the screen and the last tab was partly or wholly unreachable.",
  "A tablet knows what day it is. Beta 2.7 unfroze the date everywhere a phone could see it and missed the wider layout. Discover's featured topic and council, and the day card on Prayers, were still stuck on the day the app was built. The guard meant to catch this was only watching part of the app; it watches all of it now.",
  "The palette you pick is now the app's palette. Candlelight, Monastery and Parchment only ever coloured the two reading screens, and leaving one put you back on the standard night palette. They colour the whole app now, and the choice is remembered, so opening Purify finds it the way you left it rather than flashing the old colours first.",
  "There is a Settings screen. There was not one before: the reading font and size, the interlinear default and the calendar reckoning sat behind a sign-in, on a tab called Data, which is also where the row marked Notifications led. None of that ever needed an account. Settings opens signed in or not, with the palette at the top. Reminders and exporting your library still live with your account and are linked from there.",
  "Two more councils: the Synod of Jerusalem of 1672, which answered the Calvinist confession printed under Cyril Lucaris' name, and the Second Council of Orange of 529, which the Orthodox Church does not receive and which is here because it is cited so often in Western writing on grace that you are likely to meet it. Council pages that need one now carry a line about how the Church received them, above what the council defined rather than below. Carthage 256 has gained that line too.",
  "A review of a store says Verified buyer only when a delivered order is behind it. Product reviews had already been corrected for this and store reviews had not. The reviews are unchanged; only the claim about them is.",
  "The anthem can be paused from anywhere. You could start it, walk to another screen, and have no way to stop it short of finding the page again. A small bar now sits at the foot of the app whenever something is playing, with the track, the time, and a play and pause you can reach from any screen. The prayer rope's bead no longer strikes over the top of the chant either: the music steps back while the tone sounds and comes up again as it fades.",
  "When someone answers you, you will know. Until now a reply reached nobody and you found out by opening the tab again and scrolling to look. There is a mark on the Community tab when something is waiting, and a short list at the top of Conversations of who answered and what they said. Nothing goes to your email and nothing is pushed to your phone.",
  "Cache version steps to purify-beta-2.8.0.",
 ],
 },
 {
 version: "Beta 2.7",
 kind: "The app knows what day it is",
 date: "July 31, 2026",
 blurb:
  "One real bug, and it was the big one. The app was showing the day it was built rather than the day it is. If your Today screen has been stuck on a date that never moved, this is the release that fixes it. You will need this update installed for the fix to reach you.",
 items: [
  "Today, Prayers, Discover and the daily prayer page were all reading the date from the moment the app was built, which is why the day, the saint, the fast, the readings and the count to Pascha could all sit still for weeks. Every one of them now reads the date from your phone, and rolls over at midnight while the app is open.",
  "The date is your own date now. The app had been using UTC, so from about seven in the evening in the United States you were shown tomorrow's commemoration and tomorrow's fast. Evening is evening again.",
  "The prayer of the hour follows your clock too. The morning, midday and evening lines on the Prayers tab were chosen from UTC, so the app could greet you with \"stand before God before the day takes you\" at nine at night.",
  "Changing a reading mode no longer throws you back to Today. Tapping a locked palette tried to open the Pro page in a way the app could not resolve, and the shell answered by dropping you on the home screen. Two other buttons had the same fault and were fixed with it.",
  "The historical timeline opens quickly on a phone. Scrolling used to measure every card on the list on every frame and write to storage twice a frame, and opening an event animated its height, which re-laid out everything beneath it. Both are gone.",
  "The icon of the First Council of Nicaea was a two megabyte file where a two hundred kilobyte one does the same job. The history section is a third smaller.",
  "St Diodore of Tarsus has been removed from the saints. He was condemned after his death as a forerunner of Nestorianism and is not commemorated by the Church; he should not have been in the registry, on October 22, or among the fathers of the Second Council.",
  "Coming next: Bel and the Dragon, and Susanna, and the missing middle of Daniel 3. Someone asked whether Bel and the Dragon was missing from Daniel. It is, along with Susanna and the Song of the Three Holy Children. They will be restored as Daniel 13 and 14 from the same public domain Brenton Septuagint the rest of the Old Testament is set in, in the next update.",
  "Cache version steps to purify-beta-2.7.0.",
 ],
 },
 {
 version: "Beta 2.6",
 kind: "Six new studies, the saints in Discover, and a cross where the goalpost was",
 date: "July 27, 2026",
 blurb:
  "A large content release and a handful of fixes asked for by name. The theology library grew by six long-form studies and opened a new shelf on the worship of the Church, Discover finally lists the saints, and the Prayers tab is no longer wearing a goalpost.",
 items: [
  "A new shelf in the theology library: the worship of the Church. The Divine Liturgy of St John Chrysostom walked in the order it is served, and the vestments with the prayer said over each garment.",
  "Four studies from the dogma side: the Council of Florence, St Theodore the Studite and Rome, St Justin Martyr and the charge of subordinationism, and penal substitution.",
  "All 75 quotations in the six new studies were checked word by word against the public domain edition each cites. Two were removed because they could not be confirmed, one of them a familiar text carrying a citation that did not hold. A checker now lives in the repository.",
  "Discover lists the saints, first in the library on a phone and as a third door on a wide screen.",
  "Five surfaces that were line drawings on grey now open on a real image, each public domain and recorded: Codex Sinaiticus, the Deesis, the Menologion of Basil II, the Evangelist Luke, and the Ladder of Divine Ascent.",
  "The Prayers tab carries the Orthodox three bar cross. The mark before it was meant to be the ancient prayer posture and, drawn without head or hands at tab size, read as a goalpost.",
  "Scrolling past the end of a page no longer stretches the screen. The rule meant to prevent it had been written on the wrong element and had never applied.",
  "Multi reference search works inside the Android app. The results page had been left out of the app bundle, so searching two references at once dropped you on Today with the query lost.",
  "The last lines of a patristic commentary are readable again, and the panel can be pulled down to close.",
  "The message at the top of this page is a weekly note now, rather than one rewritten only on a large release.",
  "Cache version steps to purify-beta-2.6.0.",
 ],
 },
 {
 version: "Beta 2.5",
 kind: "A lighter app and a clearer bar",
 date: "July 25, 2026",
 blurb:
  "Two things you should notice. The bar along the bottom has been redrawn, and Purify now takes up a good deal less room on your phone. About a quarter of what the app was carrying turned out to be the same pages stored over and over, and that is gone.",
 items: [
  "The bottom bar, redrawn. New marks for Scripture, Discover, Prayers, Shop and your account, each drawn to sit at the same weight as the ones beside it. The old set had icons rendering nearly twice the size of their neighbours and several that ran past their own edges.",
  "The circle that used to slide around behind the selected tab is gone. The tab itself now brightens and lifts instead, which is both calmer to look at and lighter for the phone to draw.",
  "Roughly a quarter of the app was the same content written out several times over by the build. Removing the duplicates takes nothing away: every prayer, life and chapter is still there and still works with no signal.",
  "The saints list and the Bible chapter strip used to quietly load pages you had not opened while you scrolled past them. They now wait until you actually choose something.",
  "Choosing a tab gives a short tick you can feel, and the icon settles in rather than snapping. Reduce Motion keeps it still.",
  "Cache version steps to purify-beta-2.5.",
 ],
 },
 {
 version: "Beta 2.4",
 kind: "A calmer hand on the phone",
 date: "July 25, 2026",
 blurb:
  "Nothing new to learn in this one. Purify simply moves better. Screens now settle the way you read them, from the top down, instead of arriving all at once, and the cards and rows you tap finally answer to your finger. The Android app does less work while you scroll, and if you have asked your phone to reduce motion, more of Purify now listens.",
 items: [
  "Screens arrive in order. The greeting, then the day's word, then the prayer rule, then the doors below, each settling a moment after the one above it, so a page reads as it appears rather than landing in one piece.",
  "Everything you tap now answers. The saint of the day, the fast, the readings, and the count to Pascha used to sit still under your finger on a phone; they now press in and spring back like the rest of the app.",
  "Loading looks like the thing it is loading. Waiting states across Scripture, the saints, the calendar, the councils, and history were each drawn a little differently; they now share one shape, and the saints list no longer changes shape when the real lives arrive.",
  "The Today screen's Explore doors were four almost-identical shades of grey pretending to be different. They are one clean surface now, told apart by their icons.",
  "The Saints page opens onto saints. Its heading used to fill a phone screen on its own, leaving the first life below the fold.",
  "Less work while you scroll in the Android app, with several blur effects removed from the places you scroll past; they cost frames on a phone and gave nothing back.",
  "Reduce Motion is honored in more places, including sheets and dialogs, and a change to the setting now takes effect at once instead of on the next launch.",
  "Cache version steps to purify-beta-2.4.",
 ],
 },
 {
 version: "Beta 2.3",
 kind: "Purify learns your language",
 date: "July 19, 2026",
 blurb:
  "The app now speaks twenty-one languages. Pick yours in Settings or the footer and the menus, the Today screen, and the calendar with every fasting rule follow you, on the website and inside the Android app, even offline. The prayers, lives, and writings are being translated next; until each lands, it is shown in English with an honest note.",
 items: [
  "Twenty-one languages, public for everyone from day one: English, Spanish, Romanian, Greek, Russian, French, German, Serbian, Ukrainian, Italian, Portuguese, Bulgarian, Arabic, Filipino, Turkish, Georgian, Hungarian, Indonesian, Nepali, Polish, and Urdu. First-time visitors are greeted in their browser's own language; our language editors keep refining translations in place, and whatever is untranslated falls back to English rather than breaking.",
  "Language switching finally works inside the Android app. Your choice is remembered on the device, follows your account when you sign in, and on first run the app greets you in your phone's own language when we carry it.",
  "New typefaces for Cyrillic, Greek, Arabic script, Georgian, and Devanagari, loaded only when a page needs them, so no language reads as empty boxes.",
  "A Language row now leads your account settings, with the same grouped picker as the footer.",
  "Plural forms are handled properly per language (Russian and Polish counts, Arabic's six forms).",
  "Cache version steps to purify-beta-2.3.",
 ],
 },
 {
 version: "Beta 2.2",
 kind: "The shop finds its voice, and its word of honor",
 date: "July 18, 2026",
 blurb:
  "The EIKON shop can speak and be spoken to now: reach the Purify team from inside the shop, hear back in a living conversation, and mark a message with a small heart. And the word of others carries real weight, since reviews come only from those who received what they bought.",
 items: [
  "A word of honor on reviews: you may review a product only after your order is marked delivered, so a rating is the testimony of someone who held it. Every review carries a verified-buyer mark naming what was bought.",
  "Review a whole shop, not only its products, so a maker's care over many orders is seen as one.",
  "Contact EIKON support: a new door in the shop and in your messages opens a real conversation with the Purify team about an order or a question, and picks the thread back up where you left it.",
  "Honest message states: your last message now reads delivered when it has arrived and read when it has been seen.",
  "A small heart, where it belongs: mark a message with a heart, a double-tap on a phone or a quiet heart button.",
  "A calmer support desk and admin on our side, so your questions are answered with less friction.",
  "Cache version steps to purify-beta-2.2.",
 ],
 },
 {
 version: "Beta 2.1",
 kind: "The plan finds its shape, and reading finds its light",
 date: "July 17, 2026",
 blurb:
  "The three plans take their true shape: Standard stays the complete free foundation, Purify Plus becomes purely the premium reading and study experience, and Purify Pro grows into the complete premium experience. The first of Pro's premium layer arrives with it: four reading modes that change the very light of the page.",
 items: [
  "Premium Reading Modes: Focus, Candlelight, Monastery, and Parchment, in the reader settings for the Scriptures and the writings of the Fathers. Part of Purify Pro; free for everyone to try while the beta is open.",
  "The plan, cleanly cut: Standard carries the whole foundation (Scriptures, saints, theology and Councils, Orthodox History, prayers, calendar, Prayer Campaigns), Plus carries your reading across devices, Pro carries the premium experience.",
  "Free EIKON shipping now belongs to Purify Pro's member benefits, alongside member discount codes and early access.",
  "The app's subscription screen sells both tiers now, with live Play prices and an honest note for anyone stepping up from Plus.",
  "Named on the plan and on the way: the EIKON Box, a curated monthly box of devotional goods with contents that vary, and Studio Audio. Nothing is charged for what has not yet shipped.",
  "Cache version steps to purify-beta-2.1.",
 ],
 },
 {
 version: "Beta 2.0.1",
 kind: "A cleaner walk through the whole app",
 date: "July 14, 2026",
 blurb:
  "A polish release: Purify Premium gets a home of its own, Discover reads more calmly, the Fasting, Campaigns, and Trapeza screens move with a lighter hand on the phone, and a fault that could leave a prayer campaign stuck on 'opening' is fixed. The EIKON shop shows its icons in full again.",
 items: [
  "A new Purify Premium page lays out Standard, Plus, and Pro side by side, with a marker in the header that leads there. The free core is untouched.",
  "A calmer Discover: fewer duplicate doorways, and the doctrinal library (Theology, Apologetics, Topics, and Heresies) gathered under one hub instead of four tiles.",
  "Prayer Campaigns open every time now; a slow session no longer leaves the page stuck on 'opening the campaign', and starting one is a gentler carded flow.",
  "A cleaner, minimal mobile design across Fasting, Prayer Campaigns, and the Trapeza, with a soft entrance as each section settles in.",
  "EIKON shop: the featured icons show in full again, cards line up to one baseline, and after an order you are invited to leave a verified review.",
  "Cache version steps to purify-beta-2.0.1.",
 ],
 },
 {
 version: "Beta 2.0",
 kind: "The fast kept, the table shared, and prayers held in common",
 date: "July 13, 2026",
 blurb:
  "The fullest release yet: keep the fast day by day, pray in common, and set the table with recipes for the season. Carry your library anywhere, the one true cross stands over the whole app, and the plan reads clearly in three parts. The steadier app and the rebuilt shop come along too.",
 items: [
  "A new fasting tracker: it tells you what today's fast asks and lets you mark the day kept, in part, or broke, with a gentle streak. Kept, not tracked, free and offline.",
  "Prayer Campaigns: ask the Church to pray with you, join the ones that move you, first names only. Free, and it stays free.",
  "The Trapeza: a board of fasting-friendly recipes by fast, season, and tradition, with a few dishes from the Purify kitchen to begin.",
  "Export and back up your library: your notes, highlights, bookmarks, and collections, kept as your own copy.",
  "The three-bar Orthodox cross now stands over the whole app: the mark by the name, the browser tab, and the home-screen icon.",
  "The plan made plain: Standard (free, always), Purify Plus, and a new Purify Pro members' tier with a monthly mailed icon and shop codes.",
  "The dead band under the top bar is gone, sign-in and the account pages hold steady, and the reader's back button behaves on Android.",
  "The EIKON shop is rebuilt with search, filters, and premium cards, and new icons plus the first prayer ropes (knotted wool komboskini) join the shelves; the app no longer rubber-bands past its edges, and dark-mode time pickers read clearly.",
  "Cache version steps to purify-beta-2.0.",
 ],
 },
 {
 version: "Beta 1.9.5",
 kind: "Sign-in that cannot jam, and a Plus screen worthy of the name",
 date: "July 12, 2026",
 blurb:
  "A stuck browser tab could jam the shared sign-in machinery for every other tab, leaving a retry that never succeeded; it now frees itself in seconds. The Purify Plus screen wears the true Purify cross, honest spacing, and the full list of what Plus includes.",
 items: [
  "Sign-in checks free themselves: if the cross-tab lock is jammed by a stuck tab, the app waits five seconds and proceeds without it. The jam is reproduced deliberately in an automated test on every build.",
  "The Plus screen wears the true minimalist Purify cross, the same mark as the wordmark.",
  "The dead band above the Plus hero is gone (the status-bar inset was applied twice).",
  "What's included now tells the whole truth: sync, notes and highlights, collections and Florilegium, free EIKON shipping while Plus is active, and Immersive History.",
  "The website's pricing page carries the same complete list.",
  "Cache version steps to purify-beta-1.9.5.",
 ],
 },
 {
 version: "Beta 1.9.4",
 kind: "Purify Plus opens again, and highlights learn to look like ink",
 date: "July 12, 2026",
 blurb:
  "Tapping Purify Plus no longer closes the app: two billing components had drifted onto incompatible versions and the collision is fixed at the root. Focus mode has a guaranteed exit again, and highlights now read as ink on the words instead of a bar in the margin.",
 items: [
  "Purify Plus opens again. The subscription screen crashed the app because two billing components spoke different versions of the same language in the Android layer; they now move in lockstep, and prices, purchase, and Restore all work.",
  "If Plus ever cannot load, the screen says so calmly instead of crashing.",
  "Focus reading has a guaranteed exit: a restructuring had left the top bar invisibly covering the Exit button, and phones have no Escape key. The exit now floats above everything, and an automated test presses the real button on every build.",
  "A highlighted verse now wears a quiet wash of its color across the words themselves, line by line, instead of a colored bar in the margin. Word highlights stay brighter inside it, and the saints' writings get the same treatment in gold.",
  "Cache version steps to purify-beta-1.9.4.",
 ],
 },
 {
 version: "Beta 1.9.3",
 kind: "One hand for every symbol, and two checkout bugs caught live",
 date: "July 11, 2026",
 blurb:
  "We walked the live shop like a customer and fixed what we found: dead return pages after checkout and a product page that could load forever. Every button symbol in the app is now drawn in one hand.",
 items: [
  "Checkout return addresses always point home now: backing out of a live payment lands on the proper cancelled page and the attempt cleans itself up, verified end to end against live Stripe.",
  "Product pages no longer hang on a stale sign-in check held by another tab; the shipping perk lookup gives itself a deadline and steps aside.",
  "The payment webhook verifies the charged amount against the order before marking it paid, and a payment that lands on a just-cancelled order wins and restores it. Eleven new tests.",
  "A single icon family now draws every control symbol: bookmark star, note pen, copy link, highlight spark, cart stepper, close, menu, rating stars, save heart. No more emoji or third-party glyphs; the link icon no longer renders as a colored emoji on Android.",
  "The reader's long-press toolbar and the verse tools now share the same symbols for the same actions.",
  "The selected bottom-bar tab reads three ways: color, backdrop, and a firmer icon line.",
  "Cache version steps to purify-beta-1.9.3.",
 ],
 },
 {
 version: "Beta 1.9.2",
 kind: "The shop, refined: a cart, honest orders, and a smoother checkout",
 date: "July 11, 2026",
 blurb:
  "A same-day refinement patch for the shop: an add-to-cart system, phantom orders from abandoned checkouts fixed, desktop icon pages mended, and a payment confirmation with a little ceremony.",
 items: [
  "Add to cart arrives beside Buy now: a device-local cart with a live count on its tab, quantity steppers, and one checkout with one shipping charge for everything in it.",
  "Walking away from Stripe no longer leaves a phantom confirmed order: the attempt is cancelled on the spot, unfinished checkouts show only as a quiet removable note, and unpaid orders read Awaiting Payment.",
  "Icon pages and the EIKON storefront no longer answer with an internal server error on the desktop website.",
  "Payment confirmation now draws a gold check and rises into the receipt, honored under reduced motion.",
  "Shop pages load with quiet placeholder cards instead of a loading line, and back-navigation is instant.",
  "Messages show who is speaking with the composer always within reach.",
  "Browser tab titles across the shop read cleanly with a plain divider.",
  "The desktop account page carries a plain link to your profile even if scripts never wake.",
  "Cache version steps to purify-beta-1.9.2.",
 ],
 },
 {
 version: "Beta 1.9.1",
 kind: "The Fathers, doubled: the whole Psalter with Augustine",
 date: "July 11, 2026",
 blurb:
  "The patristic commentary library roughly doubles, to 4,481 verse-notes across 23 books from 15 Fathers. Asked for on the Discord: enough of the Fathers to stand beside any catena Bible.",
 items: [
  "St. Augustine's Expositions on the Book of Psalms arrives for all 150 psalms, 1,898 notes keyed verse by verse; the Psalter and its greatest Western commentary now pray together (NPNF vol. 8, public domain).",
  "St. Basil the Great's nine Hexaemeron homilies on the six days of creation stand in Genesis 1 in full, each on the verse whose command it opens with.",
  "St. Augustine's 124 Tractates on the Gospel of John read alongside St. John Chrysostom's 88 homilies across all 21 chapters, two Fathers on one Gospel.",
  "Revelation opens with its first commentary: St. Victorinus of Pettau, the earliest surviving commentary on the Apocalypse in the whole Church (ANF vol. 7).",
  "A chapter's opening verse now carries its commentary marker after the text (the drop cap hid it on phones) and the long-press menu opens the commentary sheet properly.",
  "On languages, honestly: the Fathers here are named public-domain English translations. We will not machine-translate them; faithful editions in other languages are future work.",
  "Cache version steps to purify-beta-1.9.1.",
 ],
 },
 {
 version: "Beta 1.9",
 kind: "The shop comes inside",
 date: "July 11, 2026",
 blurb:
  "The EIKON shop now lives inside the app: a Shop tab on the bottom bar, browsing and checkout without leaving Purify or signing in again, and reviews left only by people who actually bought the item.",
 items: [
  "A new Shop tab on the bottom bar opens the EIKON marketplace inside the app, beside Today, the Bible, Discover, and Prayers; no more handing you off to the browser.",
  "Browse every icon, open a listing, and buy without leaving the app or signing in a second time; your orders and your messages to the seller are waiting when you return.",
  "Checkout happens in the app: the secure Stripe page opens over Purify, and closing it drops you back on your orders. Purify Plus members still ship free on every order.",
  "Verified-buyer reviews arrive: a star rating can be left only by someone who bought the item. Each listing shows its average stars, its review count, and how many have sold; where there is nothing yet, nothing is shown.",
  "Messaging the seller and tracking an Icon Request now work from your pocket the same as on the web.",
  "Cache version steps to purify-beta-1.9.0.",
 ],
 },
 {
 version: "Beta 1.8.2",
 kind: "The account pages, mended",
 date: "July 11, 2026",
 blurb:
  "A quick repair patch for three crashes the first users found on the app: the account pages, the Purify Plus screen, and a top bar that slipped under the clock in the reader. All three mended.",
 items: [
  "Account & security, Notifications, and the other account pages open on the app again instead of bouncing to sign-in: the offline app was checking your session the wrong way on those pages and now checks it client-side.",
  "The Purify Plus screen opens cleanly every time and never closes the app if the store is slow to answer (guarded billing calls + an error boundary).",
  "The Bible reader's book-and-verse strip and progress line clear the phone's status bar, in the reader and every screen with the mobile top bar.",
  "Cache version steps to purify-beta-1.8.2.",
 ],
 },
 {
 version: "Beta 1.8.1",
 kind: "Launch-day repairs, with thanks",
 date: "July 10, 2026",
 blurb:
  "The doors opened today, and the first walkers-through found the loose boards. This patch mends them the same day. Thank you to everyone who wrote in within hours.",
 items: [
  "Google sign-in on the Play-installed app truly mended: the Play signing certificate is now fully registered, and the app reports configuration faults honestly instead of calling them cancellations.",
  "Creating an account signs you in immediately and keeps you signed in on that device; the welcome flow gained an optional account step, Google or email.",
  "The Purify Plus screen wears the app's own mark, the white three-bar cross in the black circle, and the signed-out view lays out what Plus includes instead of stranding one button at the foot of an empty screen.",
  "Discover carries the EIKON shop on phones; in the app it opens the storefront in your browser.",
  "The bookmark button no longer hides behind the Android status bar when you scroll; the Bible's book picker is a proper bottom sheet on phones; the saints index scrolls lighter; the About page says plainly that Purify is an Eastern Orthodox led project.",
  "Cache version steps to purify-beta-1.8.1.",
 ],
 },
 {
 version: "Beta 1.8",
 kind: "The doors open: the EIKON shop, Purify Plus, and the Hours",
 date: "July 10, 2026",
 blurb:
  "Welcome, and glory to Jesus Christ. This patch opens two doors we have been building behind for a long season. The EIKON shop is open: hand-picked icons and prayer goods, each one inspected before it ships to you. And Purify Plus arrives on Android, the optional subscription that keeps the lamps lit, with cross-device sync, notes and highlights everywhere, and free shipping on everything in the shop. Alongside the doors, the prayer corner grows: the Little Hours now carry their Psalms in full, a rule of protection joins the devotional shelf, and the greatest born of women, St. John the Baptist, takes his place among the saints. The core of Purify stays free, today and always.",
 items: [
  "The EIKON shop is open at /shop. Icons, prayer ropes, censers, and the goods of a working prayer life, every item sourced, inspected by our own hands, and repackaged before it ships. Checkout by card through Stripe, shipping within the United States, policies in plain words at /shop/policies, and a Request an Icon door for whatever is missing.",
  "Purify Plus, live in the Android app: billed securely through Google Play at the price shown on the plan screen, cancel anytime. Cross-device sync, notes, highlights and bookmarks everywhere, custom collections and the Florilegium. Free EIKON shipping belongs to Purify Pro, not Plus. The entitlement is written server-side to your account the moment Google confirms the purchase, and Restore brings it back on any device. What is free today stays free.",
  "The Hours, in full. The First, Third, Sixth, and Ninth Hours now carry their three appointed Psalms each in full, in Brenton's public-domain Septuagint translation, with the fixed troparion and dismissal of each hour. Asked for on the Discord, psalm structure and all; the Hours now stand in the daily rule beside Compline.",
  "Prayers of protection join the devotional shelf: Psalm 90 and Psalm 26 in full, the Let God arise verses prayed with the sign of the Cross, and the petition for the guard of the angel, every word verbatim from public-domain sources. Asked for on the Discord.",
  "St. John the Baptist, the Forerunner, takes his place among the saints, with his whole scriptural witness from the annunciation to Zacharias to the Beheading, verbatim in the King James Version, and the life told plainly beside it. Asked for on the Discord.",
  "The calendar's New and Old toggle no longer sticks on Old for installed-app readers; the toggle now persists the choice properly. Reported on the Discord by cloudw_w.",
  "Focus mode releases you again on desktop, by the exit button or the Escape key; the exit pill no longer hides beneath other layers. Reported by Nikoli345.",
  "The buttons at the very top of the screen answer taps again on iPhone in the browser; the bar now clears the notch properly. Reported by vust.",
  "Read the Gospel with Chrysostom now says how to open the commentary: on a phone, tap a red-dotted verse number; on desktop the study rail stands beside the text. Reported by vust.",
  "The Terms of Service now spell out the subscription plainly, price, renewal, and cancellation, with the shop's shipping and returns policy at /shop/policies as part of them. Agreement is a real recorded checkbox at signup and at checkout. The privacy policy names every processor: Stripe for the shop, Google Play and RevenueCat for Plus.",
  "Cache version bumped to purify-beta-1.8.0 so the shop, the Hours, and the fixes evict the old buckets on this release. Footer, home hero chip, and the What's new chip step to Beta 1.8.",
 ],
 },
 {
 version: "Beta 1.7",
 kind: "A walk through the history of the Church",
 date: "July 4, 2026",
 blurb:
  "Welcome, and glory to Jesus Christ. This is the largest patch since Purify began, and the one I most wanted to build. The whole story of the Orthodox Church now lives in the app as an interactive timeline you can walk with your own hand: thirty-eight events across eleven ages, from the fire of Pentecost to the Church of our own day, each one sourced, cited, and honest about what is certain and what is held in loving tradition. Around it, the three pages you open most, Today, the Bible, and Discover, have been redrawn to feel like one quiet, considered whole. And Continue with Google, which had gone quiet, sings again. However you came to be here, new face or old friend, thank you for walking this history with us.",
 items: [
  "Orthodox History, a new home under Discover at /history. Two thousand years of the Church laid out as a timeline you move through by hand, divided into eleven ages from the Apostolic Age to the present. Thirty-eight events to begin, the councils and the schisms, the saints and the missions and the martyrs, each with its own page, its full account, and its sources shown in the open.",
  "Move by era, jump by century with a scrubber, search by name or year or place, and filter by category. Every event links into the saints, councils, and doctrine already in the app, and each saint and council page now points back to its place in history. It works without an account, and on Android it works fully offline.",
  "Honest about what is certain. Every event wears a plain label, from Historically Attested to Traditional Account to Disputed, so a treasured tradition is never dressed up as a documented date. The facts, the sources, and the citations are free for everyone, always. A cinematic way to experience the history, with verified artwork and gentle motion, is being prepared for Purify Plus; the history itself will never move behind it.",
  "Today has become a personal daily page. It greets you by the hour, names the rule that hour calls for, and remembers your rhythm of prayer over the last fortnight. Beside it, a quiet thread of your own: the chapter you were reading, your place on the History timeline, the prayers you opened, and your saved passages. When a firmly dated event falls on today, it appears as On This Day in Orthodox History. None of it needs an account; all of it stays on your device.",
  "The library, redrawn. Discover, the Bible, and Today now share one calm editorial hand instead of three. The Bible's canon reads as a single library rather than a wall of coloured tiles, and remembers the exact verse you left off at. Discover leads with what is worth returning to and shows the life of the day. The section marks throughout were redrawn to suit what they open, an hourglass for history, a shield for the defense of the faith.",
  "Signing in, mended. Continue with Google stopped working for a spell, turned away with an error that was ours to fix, not yours. It is mended. If you have only ever signed in with Google, that is the door to use; if you set a password in the early days, it still works, and Forgot password will always let you set a fresh one. The Google and Apple marks on the sign-in buttons are drawn properly now, too.",
  "The front-page down arrow no longer wastes its first press; it steps cleanly through each panel to the foot of the page.",
  "Cache version bumped to purify-beta-1.7.0 so the timeline, the redrawn pages, and the mended sign-in evict the old buckets on this release. Footer, home hero chip, and the What's new chip step to Beta 1.7.",
 ],
 },
 {
 version: "v9.9.5",
 kind: "Two of the Fathers' great works join the library, complete",
 date: "June 13, 2026",
 blurb:
  "A reading release. St. Basil's On the Holy Spirit and St. John of Damascus's Exact Exposition of the Orthodox Faith, two of the foundational books of Orthodox theology, join the saints' works in full, verbatim from the public domain. Both were asked for in the pdf-library on the Discord; both are now in the app to read, not only to find.",
 items: [
  "St. Basil the Great, On the Holy Spirit, complete. The whole De Spiritu Sancto in thirty chapters, the foundational defence of the Spirit's divinity written for Amphilochius of Iconium, verbatim from the public-domain Nicene and Post-Nicene Fathers. It joins the Hexaemeron on St. Basil's profile.",
  "St. John of Damascus, An Exact Exposition of the Orthodox Faith, complete. The earlier Book-I excerpt is replaced by all four books, ninety-nine chapters, the Eastern Church's classic systematic theology from the knowledge of God to the Resurrection, verbatim from the public-domain Nicene and Post-Nicene Fathers.",
  "Both works were requested in the pdf-library forum. The public-domain texts gathered there are being brought into the app as they are sourced and prepared.",
  "Cache version bumped to v9.9.5 so the new works evict the old buckets on this release.",
  "Footer, home hero chip, and /whats-new chip step to v9.9.5.",
 ],
 },
 {
 version: "v9.9",
 kind: "Apologetics opens, the catena grows, and the house is set in order",
 date: "June 12, 2026",
 blurb:
  "A quiet release that puts the house in order. A new Apologetics room turns the library outward, to the questions an enquirer or an objector brings, beginning with the existence of God and the place of Scripture within the Church. The patristic catena reaches past St. John Chrysostom for the first time, with Blessed Augustine reading 1 John alongside you. The mobile shell grows calmer and truer: the bottom bar drops its gold pill for a paper-white quiet, learns the new rooms, and stops pretending Today is selected on pages that belong to no tab. And underneath it all, a season of housecleaning: the small print made readable, the copy made true, and the library's rooms easier to find.",
 items: [
  "A new Apologetics room at /apologetics. Three studies open it: On atheism, On deism, and On sola scriptura, each framed in the Orthodox register and honest about its scope, with the verbatim patristic florilegia being assembled as they are sourced. Asked for on the Discord, in the Apologetic Section and Refutations threads.",
  "The catena grows past Chrysostom. Blessed Augustine joins the patristic commentary, reading 1 John verse by verse beside the text. The Discover index now says what has become true: the Fathers, verse by verse, beside the text of Scripture.",
  "Context for the hard verses. Tapping the verse number on 1 Samuel 15:3, the command against Amalek, now opens St. Augustine answering the very charge that such commands are cruel, verbatim from his Reply to Faustus the Manichaean. Asked for on the Discord by theologyyyyy.",
  "A sweep of new saint icons across the index, from St. Basil of Ostrog and St. Sava of Serbia to St. Justin Popovic and St. Nikodemos the Hagiorite, so fewer lives open to an empty frame.",
  "The mobile shell grows quieter. The bottom bar's gold pill is retired for a paper-white active state, the bar learns the Theology and Apologetics rooms, and pages that belong to no tab no longer light up Today. The desktop bar is trimmed to six destinations and the season banner is retired.",
  "The Reader settings menu no longer clips off the edge on phones. Opened from the Reader chip, the panel of size, font, and line-spacing controls was anchored to the wrong side and ran past the left margin; it now opens into the page on every width. Flagged by Nikoli345.",
  "Discover is set right. The councils entry names all seven Ecumenical Councils and the synods before Nicaea, Theology and Apologetics are reachable from the phone's Discover index, and the years of repose across the calendar and the saints now wear the cross (†400) instead of a bare plus sign. The stale councils count was flagged by Nikoli345.",
  "An accessibility pass across the dark surfaces. The small print of the app, verse numbers, labels, captions, attributions, now meets the WCAG AA contrast floor, and the prayer-card bookmark star is restructured so assistive technology reads it cleanly. The full smoke suite, accessibility assertions included, passes on desktop and phone alike.",
  "Terms of Service at /terms, and the support and pricing pages set out plainly: the core free forever, a freewill gift the only money involved today, and the promise to pre-launch supporters kept in writing.",
  "The ambience shelf is resting. The previous tracks could not be kept, so the speaker steps aside until the catalogue returns with properly sourced audio; the Prayer Rope Anthem recordings are unaffected.",
  "Cache version bumped to v9.9.1 so the new rooms, the quieter shell, and the late fixes evict the old buckets on this release.",
  "Footer, home hero chip, and /whats-new chip step to v9.9.",
 ],
 },
 {
 version: "v9.8",
 kind: "Eighteen new saints, the dogma-exegesis library, and the councils before Nicaea",
 date: "June 11, 2026",
 blurb:
  "A content release, the library grown wide. Eighteen saints join the calendar and the saints index, each with a full life: desert fathers and Russian abbots, a Georgian fool for Christ and a martyr of Jacob's Well, the compiler of the Philokalia and the recluse of Vysha, the elders of Athos and of Essex of our own time. A new dogma-exegesis library opens at /theology, where a single question is traced through the Fathers and the councils in long form, from the procession of the Holy Spirit to the witness of the manuscripts. The councils section reaches back before Nicaea, to the synod of Antioch that deposed Paul of Samosata and the councils of Carthage on the baptism of heretics, in a new room for the local and regional councils beyond the seven. And French opens in editorial preview, the first language after German that the app will speak, with the rest to follow as the editorial work is done.",
 items: [
  "Eighteen new saints, each with a full life. Among them St. Moses the Ethiopian, St. Sergius of Radonezh, St. Silouan the Athonite, St. John of Shanghai and San Francisco, St. Porphyrios of Kavsokalyvia, St. Sophrony of Essex, St. Nikodemos the Hagiorite, St. Theophan the Recluse, St. Cosmas of Aetolia, St. Nino of Georgia, St. Xenia of St. Petersburg, St. Gabriel of Georgia, St. Philoumenos of Jacob's Well, St. Niketas the Goth, St. John Cassian, St. Nicholas Cabasilas, St. Iakovos of Evia, and St. Quadratus of Athens, the earliest of the apologists. Each was asked for on the Discord. We keep to saints glorified by an official jurisdiction of the Church; a few requested names are held until their commemoration is confirmed.",
  "A new dogma-exegesis library at /theology. Each topic is a long-form study: a framing essay, a florilegium of attributed quotations from the Fathers, linked to their profiles where present, the conciliar witness, and the Scripture cross-references. Seven open this release: the Filioque, the Theotokos, theosis, the papacy, original sin, the Comma Johanneum, and the longer ending of Mark. Drawn from the dogma-exegesis forum on the Discord.",
  "The councils before Nicaea. The Council of Antioch of 268, which deposed Paul of Samosata, and the Councils of Carthage of 256 on the baptism of heretics, join the councils section in a new band for the local and regional councils beyond the seven. The profiles are historical; verbatim canons follow as the public-domain texts are prepared. Requested by jadamsarma and Kompir.",
  "French in editorial preview. French is now selectable and applied, the first language after English and German, marked in progress in the language switcher, with the chrome it does not yet carry falling back to English. The mechanism is the in-progress state the other languages will adopt as their catalogs are hand-checked.",
  "Cache version bumped to v9.8.0 so the new saints, the theology library, and the councils evict the old buckets on this release.",
  "Footer, home hero chip, and /whats-new chip step to v9.8.",
 ],
 },
 {
 version: "v9.7",
 kind: "Search anything, the multi-verse Bible, the Nicene Creed, and the small promises kept",
 date: "June 10, 2026",
 blurb:
  "A patch of kept promises, every line of it asked for on the Discord. Bible search now takes a whole string of references at once and reads them back stacked together, a florilegium for study rather than a single jump. Search reaches across the prayer book and the saints, so a rule or a Father is a few letters away instead of a scroll. The Nicene Creed, long requested, joins the prayer book with its own page and sits inside both the Morning and the Evening Rule, offered in more than one language with each wording kept verbatim and its source named. On the desktop a command palette opens on Ctrl+K (Cmd+K on a Mac) and jumps to any saint, prayer, council, heresy, topic, or book of Scripture. Giving is now a tap away on every mobile screen. And a handful of smaller fixes ride along quietly underneath.",
 items: [
  "Multi-verse Bible search. The search box now accepts a comma-separated string of references, 1 Tim 2:5, Prov 8:7, John 2:21, and renders each passage stacked with its own header, text, and an open-in-chapter link. It tolerates book abbreviations (1 Tim / 1 Timothy / 1tim), ranges (John 3:16-18), and bare books (Psalm 23). A single reference still navigates straight to the chapter, unchanged. Requested by Nikoli345; committed to by the team on the thread.",
  "Search across the prayer book and the saints. A search field at the top of /prayers (and a sticky bar on mobile) filters rules, descriptions, categories, and the anthem in real time, no round-trip. Requested by MosesLOL.",
  "A cross-surface command palette on the desktop. Ctrl+K (Cmd+K on a Mac) opens a quick search over Scripture, saints, prayer rules, councils, heresies, topics, and key pages, grouped with Bible first; arrow keys and Enter to navigate, Escape to close. Desktop only, since the phone keeps its tab bar.",
  "The Nicene Creed joins the prayer book at /prayers/creed, the Symbol of Faith of the First and Second Ecumenical Councils. It is set into both the Morning Rule and the Evening Rule, after the Trisagion prayers, and offered in more than one language, each wording kept verbatim with its own source named and no Filioque, as the Councils gave it. Requested by Daniel. Further jurisdictional translations will be added as each verbatim public-domain text is sourced.",
  "Giving is reachable on mobile. A small gold vigil-lamp now sits in the header of every mobile tab and links straight to /support, and the You tab carries a Support Purify row, the mobile parallel to the desktop nav's Support link. Raised by Garxy.",
  "Long works remember your place. The Fathers' reader (the eighty-eight homilies of St. John Chrysostom and the like) now restores where you left off on your own device, so navigating away no longer loses your place.",
  "St. Ephraim the Syrian's icon now renders where it was missing. Flagged by Daniel.",
  "Smaller fixes: the prayer-rope hint no longer tells phone users to press a space bar they do not have.",
  "Cache version bumped to v9.7.0 so the new search surfaces, the command palette, and the Creed evict the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v9.7.",
 ],
 },
 {
 version: "v9.6",
 kind: "The Prayer Rope Anthem in French and Arabic, a remembered translation, and the calendar on your own time",
 date: "June 8, 2026",
 blurb:
  "A focused patch shaped by the Discord. The Prayer Rope Anthem now sings in three tongues: the English setting is joined by a French version, with synchronized lyrics offered by a reader, and an Arabic version sung right to left, each with its own recording and its own lyrics that brighten line by line as the chant plays. The Bible reader now remembers your translation, so a choice of NKJV, NIV, or NLT carries from chapter to chapter and across return visits instead of resetting to the public-domain default each time you turn the page. And the calendar now keeps your own day: it reads your device's local date rather than the server's clock, so the highlighted day, the day's saint and fast, and the appointed readings all sit on the date you are actually living, not a day ahead or behind.",
 items: [
  "The Prayer Rope Anthem now offers three languages at /prayers/anthem: English, French, and Arabic. A small language switcher sits above the player; choosing a language swaps the recording and its synced lyrics. The French setting uses the recording and synchronized lyrics shared by BOX on the Discord; the Arabic setting, shared by Silouan, is sung and shown right to left. Each version's lyrics brighten and auto-scroll line by line, and a tap on any line seeks to it.",
  "Your Bible translation is remembered. Choosing a licensed translation (NKJV, NIV, or NLT) now persists: it carries to the next and previous chapter, follows deep links, and is restored on your next visit, so you no longer reselect it every time you turn the page. Switching back to the public-domain text, the King James for the New Testament or Brenton's Septuagint for the Old, clears the preference. New Testament only, since the licensed translations are New Testament.",
  "The calendar is on your time zone. It now reads your device's local date instead of the server's clock, so the highlighted day, the Today panel with its saint and fast, and the appointed readings all match the date where you are. Previously a reader west of the server could already see tomorrow's day marked; that is fixed.",
  "Cache version bumped to v9.6.0 so the new anthem audio and the updated reader and calendar evict the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v9.6.",
 ],
 },
 {
 version: "v9.5",
 kind: "The Prayer Rope Anthem, Install Purify, St. Isaac the Syrian, and a cinematic reader",
 date: "June 6, 2026",
 blurb:
  "A larger release than the version number suggests, gathered from a steady run of work since v9.0. The Prayer Rope Anthem, the contemporary Orthodox chant sung knot by knot to the Holy Trinity, to Christ, to the Theotokos, and to all the saints, joins the prayer book with its own audio player and synced lyrics, lifted out of the long index tile grid and given a gold-accented featured band right under the prayer of the heart so it is the first thing a reader meets after the Jesus Prayer. The desktop home gets a real Download Purify button that installs the app as its own standalone window with its own dock icon and offline reading, replacing the placeholder that flashed Coming soon. St. Isaac the Syrian, the seventh-century hermit-bishop of Nineveh and one of the foundational fathers of the inward life, joins the corpus with the first two homilies of his Mystic Treatises in A. J. Wensinck's 1923 public-domain English. The Bible reader is rebuilt: a single tidy toolbar row, the size, font, and line-spacing controls collapsed into a Reader menu in the established Kindle/Apple Books pattern, a new Focus reading mode that crossfades the entire page into a single centered column via the browser's View Transitions API in and out, and a back-to-top button that no longer sits on top of the chapter grid. The Saints index and every saint profile get a signature masthead in the calendar's display-serif idiom, with a closing veneration intercession at the foot of each saint. The Pricing page is rebuilt from an empty void into a composed honest support panel; the home verse card is calmed onto solid black with one quiet two-action footer; the mobile calendar grid is de-densified. A small ambient-soundscape player joins the layout for prayer and study, ungated for the pre-release, sitting as a floating speaker in the corner so it can be layered quietly underneath the anthem, a Bible chapter, or a homily of the Fathers.",
 items: [
  "The Prayer Rope Anthem is featured prominently in the prayer section. The contemporary Orthodox chant for the rope, sung knot by knot to the Holy Trinity, to Christ, to the Theotokos, to St John the Baptist, and to all the saints and holy angels, lives at /prayers/anthem with its own audio player and the full English lyrics. Play it, loop it, and follow the words line by line as the rope is told. Previously a small tile at the foot of the Also-in-this-book grid where most readers never saw it; now a gold-accented featured band right under the prayer of the heart on the desktop hub and the mobile shell, with a play-disc, eyebrow A hymn for the prayer rope, and a one-tap link into the chant. The single most visible promotion in the prayer section.",
  "New Download Purify button on the desktop home. Replaces both Coming-soon CTAs (hero and final) with a real install affordance that triggers Chrome/Edge/Brave/Arc's native PWA install dialog. The app installs as a standalone desktop application with its own window, its own dock or Start-menu icon, and offline reading through the existing service worker. After install the button flips to Open Purify and links straight to today's prayers.",
  "A friendly modal handles the browsers that don't support the install prompt: Firefox desktop, older Safari, Safari 17+ (which gets Add to Dock instructions from the Share menu), iPad in desktop-UA mode, and Chromium when the prompt has been suppressed by a recent dismiss. Every variant of the modal offers an Open in browser link so a user is never trapped.",
  "Mobile install banner refactored to consume the same beforeinstallprompt event as the desktop CTA, through a single module-level singleton store. The two consumers can never race for the one-shot event; whichever the user clicks first wins, the other cleanly falls back. The visit-count gate, the 30-day dismiss memory, and the iOS Add-to-Home-Screen hint are unchanged.",
  "St. Isaac the Syrian, the seventh-century hermit-bishop of Nineveh, joins the library with two complete homilies from the Mystic Treatises in A. J. Wensinck's 1923 English (Royal Academy of Sciences, Amsterdam). Homily I, thirty-nine aphorisms on the fear of God as the foundation of every virtue, the separation from the world, and the silencing of the senses; Homily II, thirty-three aphorisms on confession, repentance, and the ladder of the Kingdom hidden within the heart. Verbatim public domain throughout. Wensinck's archaic punctuation and original typography preserved as the 1923 edition prints them, sourced from English Wikisource where the work is published under the public-domain tag.",
  "Bible reader toolbar collapses to one tidy row. Translation, Book, and Save sit on the left as the scripture-context group; a single Reader menu on the right opens text size, font family, and line spacing in one panel; Interlinear and Focus stay as their own pills next to it. The pattern follows Kindle and Apple Books, where set-and-forget reading preferences sit behind one entry point instead of crowding the chrome.",
  "A new Focus reading mode hides every chrome element across the app and the reader and collapses the grid to a single centered measure. The entrance and exit are handled by the browser's View Transitions API, which snapshots the page before and after the class flip and crossfades the two for 420ms on an ease-out curve. The result is one smooth dissolve across the whole viewport rather than a stack of per-element animations trying and failing to choreograph together.",
  "A non-destructive line-spacing axis joins the Reader menu, with Normal, Relaxed, and Loose presets. The setting overrides the column's leading via inline style only when it differs from the default, so the existing baked-in line height on each size preset is left undisturbed at Normal. Persists across sessions through the same store as size, font, and focus.",
  "Saints index and every saint profile get a signature masthead. A bespoke three-bar Orthodox cross + eyebrow above the title, then the name set in DM Serif Display rather than the generic sans-bold, then a small Greek line (Οι Άγιοι) in gold echoing the calendar's typographic identity. Each saint page closes with a small Cross + intercession in display serif: Holy {name}, pray to God for us, or Most Holy Theotokos, save us, the universal liturgical address, freely-authored interface copy, no hosted patristic text involved.",
  "Pricing page rebuilt from the empty void it was into a composed support panel. An Always free panel with the StarMark + everything-free list, a quiet future-layers note, and a Lamp panel with a single rounded-pill Light a lamp CTA pointing at /support. Honest about the absence of paid plans rather than promising tiers that don't exist.",
  "Home verse-of-the-day card is calmed: the white quote band that broke the dark palette mid-page is gone, the card now reads as verse-on-black with a quiet two-action footer (Save + overflow menu), and the gradient is softened to a barely-there radial wash in the corner.",
  "Mobile calendar month grid de-densified. Phone cells now show the day number and a small gold cross marker when a feast falls; the feast name itself appears in the day-detail card below the grid on tap. Desktop cells continue to show the feast name in line. The standard mobile pattern of marker + detail-on-tap, instead of the previous cluttered text-in-cell.",
  "Bible reader's desktop back-to-top button moved from middle-left to bottom-right; it was sitting on top of the chapter grid in the left rail and overlapping numbered links. Still desktop-only and fades in past 480px.",
  "Ambient soundscapes for prayer and study, layered under everything else. A small circular speaker control sits at the bottom-left of every page in the app, mounted once in the (app) layout so the audio persists across navigation. Tap it to open a panel with a small shelf of tracks and a volume slider. The audio plays as an independent layer behind whatever else is on the page, so the same speaker can sit underneath the Prayer Rope Anthem, a Bible chapter being read in Focus mode, or a homily of St. Isaac the Syrian. Ungated for the pre-release; planned as a subscriber-only feature at public launch. (The shelf is resting while the catalogue is re-sourced; it returns with the audio library.)",
  "Cache version bumped to v9.5.0 so the redesigned reader, the new desktop install affordance, and the Mystic Treatises evict the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v9.5.",
 ],
 },
 {
 version: "v9.0",
 kind: "A reading hub, a fuller prayer book, six Serbian saints, and a few quiet fixes",
 date: "June 5, 2026",
 blurb:
  "A larger release that gathers the library into a place to sit and read, and grows the prayers from a list of pages into something nearer a prayer book. The new Reading hub at /reading is a calm, reading-first surface rather than a feed: it remembers where you left off, suggests a next read along curated paths through the Fathers, gathers the works the library already carries, and points deeper into the councils, topics, and thematic collections. The prayer section gains a registry of rules grouped the way a prayer book is, the day's hours, the table, repentance, the seasons of the Church, with the texts seeded only as verbatim public-domain prayers and the categories we cannot yet source honestly marked as planned rather than invented. St. Ephrem's Lenten prayer ships with a genuine variant switcher, the Jordanville and the St. Tikhon's translations set side by side, never merged. The hub now remembers what you last opened and quietly suggests a prayer for the time of day and the season. Six Serbian saints join the library at a reader's request from the Discord. And a handful of small fixes: the footer carries Reddit and a calmer TikTok mark, and the language menu no longer runs off the top of the screen.",
 items: [
  "New Reading hub at /reading. A reading-first surface in the prayer-book vocabulary: a serif masthead, a Continue reading shelf that remembers where you left off, a Your Next Read rail that guides you along curated paths through the Fathers (finished St. Athanasius? continue into St. Cyril), a Popular reads shelf, and hairline rows that open deeper into the patristic works, the saints' writings, the councils, the topics, and the thematic collections. Reading history is kept on your own device, never uploaded.",
  "The prayer section grows toward a prayer book. A registry now groups the rules the way a prayer book is ordered, the daily rules, prayers through the day (upon waking, the table, before sleep), repentance, and the seasons of the Church (Lent, Pascha). Each rule that ships carries a real verbatim public-domain text with its source named; the categories that cannot yet be sourced word for word are marked plainly as planned rather than filled in by a model.",
  "St. Ephrem the Syrian's Lenten prayer ships with a variant switcher, two genuine public-domain translations set side by side, the Jordanville (ROCOR) and the St. Tikhon's (OCA), each with its own source line and never merged into a composite. The same discipline holds across the section: Orthodox prayers only, original wording preserved, nothing generated, nothing rewritten, nothing blended.",
  "Discovery in the prayers, kept quiet. A Continue praying shelf surfaces what you last opened, and a Suggested for today line reads the time of day and the liturgical season (a Lenten prayer in Lent, the Paschal hours in Pascha, a fast-day prayer on a fast) and offers one fitting rule, with no streaks, no badges, and no nudges. Rules can now be bookmarked with the same star that saves verses and writings.",
  "Six Serbian saints join the library at the request of a reader on the Discord (ChristosAnesti): St. Simeon the Myrrh-streaming, St. Sava the Enlightener of Serbia, the Holy Great-Martyr Lazar, St. Basil of Ostrog, St. Nikolaj Velimirovic, and St. Justin Popovic. Each ships with an editorial life in house voice; their writings are held back honestly, the medieval Serbian fathers have no confirmed public-domain English text, and Ss. Nikolaj and Justin are twentieth-century and firmly under copyright, so no work browser is shown until a clean source exists.",
  "Footer fixes: the TikTok mark is now monochrome rather than its brand red, and a Reddit link (@purifymylife) joins the community strip in Reddit orange.",
  "The language menu no longer runs off the top of the screen. Because it opens upward from the footer, the full list of locales could overflow above the viewport with no way to reach the top entries; it is now height-capped and scrolls.",
  "Cache version bumped to v9.0.0 so the new surfaces evict the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v9.0.",
 ],
 },
 {
 version: "v8.9.2",
 kind: "Housekeeping: the language menu, the back-to-top control, and a calmer scroll",
 date: "June 5, 2026",
 blurb:
  "No new texts, just a handful of fixes to how the app moves and reads. The language menu now lists every tongue we intend to carry, with the ones still in translation marked plainly as coming soon rather than hidden. The desktop back-to-top control moved to the middle of the left edge, where the eye expects it, and fades in instead of sliding. On the marketing home the old scroll-snapping behaviour that fought the wheel and stranded a section half-shown is gone; scrolling is just scrolling now. On a phone the page no longer jitters and settles when you tap through to it, and the top bar keeps clear of the iPhone status bar and notch. The saints browser opens with its filters folded away, the footer's Instagram link wears its own brand colour, and the support page drops the duplicate Discord and Instagram buttons the footer already carries.",
 items: [
  "The language switcher now lists every locale Purify intends to carry. English and Deutsch stay selectable at the top; the rest render as quiet, disabled 'Coming soon' rows, so a reader can see what is on the way without being handed an untranslated page.",
  "The desktop back-to-top button sits at the vertical middle of the left edge rather than the bottom corner, and fades in once you have scrolled past the fold instead of sliding up into place.",
  "A back arrow sits beside the Purify wordmark in the desktop top bar, returning you to the previous page.",
  "The marketing home's scroll behaviour is fixed. The old section-snapping that hijacked the wheel, stopped a section short, and would not carry all the way back to the top has been removed; the page scrolls normally now.",
  "Two phone fixes: tapping through to a page no longer makes it jitter into place, and the top bar clears the iPhone status bar and notch instead of sitting beneath them.",
  "The saints browser opens with the By kind and By century filters collapsed, so the list leads and the filters are there the moment you want them.",
  "On the saints' Licensed Works shelf, the book cards step from three columns to two in the rail-constrained layout, so the titles and blurbs are readable again.",
  "The footer's Instagram link now carries the Instagram brand colour, and the support page drops its Discord and Instagram buttons, which the site footer already carries.",
 ],
 },
 {
 version: "v8.9",
 kind: "A quieter palette, a redrawn calendar, and a floating mobile bar",
 date: "June 4, 2026",
 blurb:
  "No new texts this time, this is a design release, top to bottom. Three things change the way Purify feels to sit with. First, the calendar's day panel is redrawn as an illuminated page: a weekday eyebrow over the big date, a centered three-bar Orthodox cross rule, and then clearly labelled sections for the day's fast, its commemorations as a haloed serif list, and its readings, all in our own serif and sans rather than a borrowed face. The fasting tablet stays, the cross is the proper three-bar cross, and every saint still links exactly where it did. Second, the whole app steps off its old signature gold and onto a calm, neutral palette, a warm grey in place of the bright gold across every surface, so the chrome recedes and the content carries the page; the one place colour still means something, the fast badges, keeps its semantic reds and greens untouched. Third, the mobile bottom bar is rebuilt as a floating stadium bar with a single gold-accented live tab, and that highlight now glides smoothly from section to section instead of snapping. Nothing about what the app does changed; this is the same rooms, lit more quietly.",
 items: [
  "The calendar day panel is rebuilt as an illuminated page: a small-caps weekday eyebrow, the full date in our display serif, a centered three-bar Orthodox cross rule, then sectioned blocks for Fasting, Commemorations, and Readings. The fasting tablet that the reference design dropped is kept on purpose, the rule cross is the correct three-bar Slavonic cross rather than a Latin one, the typography stays on our own Lora serif and sans throughout, and every commemoration still deep-links to the right saint.",
  "The app-wide palette goes neutral. The signature gold token and every gold literal across the calendar, navigation, saints, Bible, profile, and admin surfaces are retuned to a warm, paper-toned grey, so the interface reads as calm and monochrome and the words do the work. The change is a single design-token retune plus a mechanical swap of the old colour values, with no layout or behaviour change anywhere.",
  "Fast colours stay meaningful. The one place colour still carries information, the fasting badges, keeps its semantic palette, strict-fast crimson, fish sage, wine-and-oil and fast-free greens, so the discipline of the day is still legible at a glance against the new neutral chrome.",
  "The mobile bottom navigation is rebuilt as a floating stadium bar: a glass-dark panel lifted off the content with a soft shadow and a faint top sheen, a bordered compartment around the live tab, and a short gold pill seated on the bar's top edge over the active section. The active tab's icon and label carry the same warm gold, scoped to the bar alone so it does not disturb the new neutral palette elsewhere.",
  "The live-tab highlight now animates. Instead of popping in and out per tab, a single shared compartment and pill glide between sections on a smooth transition, with the icon glow and label colour cross-fading alongside. The motion is disabled automatically for readers who prefer reduced motion, and the bar handles the move correctly even across the Today boundary, where the navigation is mounted in a separate part of the app.",
  "A small fix on the saints' Licensed Works shelf: book covers that were rendering as a thin stretched sliver now sit as a proper compact thumbnail beside the title and details.",
  "Cache version bumped to v8.9.1 across the run so the redesigned surfaces evict the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v8.9.",
 ],
 },
 {
 version: "v8.5",
 kind: "The Heresies archive, cross-linked with the Councils",
 date: "June 3, 2026",
 blurb:
  "Every Ecumenical Council is defined as much by the error it condemned as by the doctrine it confessed, but until now those errors lived only as inline prose on the council pages. This release gives them a section of their own. The new Heresies archive profiles the seven chief errors the councils condemned, one for each of the Seven Ecumenical Councils: Arianism, Macedonianism, Nestorianism, Eutychianism, Origenism, Monothelitism, and Iconoclasm. Each profile defines the error in plain English, names the council that condemned it, links across to the orthodox teaching it denied in the Topics index, and, where the corpus already holds them, answers it in the Fathers' own words as verbatim deep-links. It is built exactly like Topics: a thin index, editorial in-house definitions, no hosted heretical text, every quotation a deep-link into a section of a work the saints library already carries word for word. And the link runs both ways, the council pages now link their named opposing parties straight to the heresy profile.",
 items: [
  "New /heresies archive, surfaced on Discover (desktop and mobile) beside the Councils and Topics. Seven profiles, one per Ecumenical Council: Arianism (Nicaea I), Macedonianism (Constantinople I), Nestorianism (Ephesus), Eutychianism (Chalcedon), Origenism and the Three Chapters (Constantinople II), Monothelitism (Constantinople III), and Iconoclasm (Nicaea II).",
  "Each profile gives a plain-English definition of the error and the Church's answer in house voice, links to the council(s) that condemned it, and where the orthodox mirror exists links across to the Topics page that confesses the opposite, the Holy Trinity for Arianism and Macedonianism, the Theotokos for Nestorianism, the Incarnation for Eutychianism and Monothelitism.",
  "The Fathers' refutations are verbatim deep-links, the same discipline as Topics. Arianism is answered by St. Athanasius against the Arians, on the Nicene Definition, and his history of the Arian opinions, and by St. Alexander of Alexandria; Nestorianism by St. Cyril's Second Letter, his Twelfth Anathema, and his refutation of the division of Christ into two sons; Eutychianism by the Tome of St. Leo. The four whose verbatim refutation is not yet in the corpus ship honestly with their definition and council links and no padded quotes.",
  "The councils now link out to the heresies. The principal opposing parties named on each council page, Arius on Nicaea, the Pneumatomachi on Constantinople, Nestorius on Ephesus, Eutyches on Chalcedon, and the rest, now deep-link to the matching heresy profile, so a reader can move from the council to the error and back.",
  "No heretical text is hosted, and nothing is generated. The definitions are in-house editorial prose, exactly like the council condemned bullets; every quotation is a deep-link into a Father's verbatim, already-hosted words, and any citation that cannot resolve is silently dropped rather than faked.",
  "Cache version bumped to v8.5.0 so the new heresy pages evict the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v8.5.",
 ],
 },
 {
 version: "v8.4",
 kind: "The Topics index, grown from one entry to five",
 date: "June 3, 2026",
 blurb:
 "The Topics index is a research surface for enquirers and apologists: a doctrinal term, a short Orthodox definition written in plain English, and then the patristic citations that confess it, with the citations that refute its opposite set beside them where the question was fought out. It is a thin index, not a new corpus. Every citation is a deep link into a numbered section of a work the saints library already hosts verbatim, never a duplicate of the text and never a paraphrase. Until now it carried a single starter entry, the Incarnation. This release adds four of the central confessions of the faith: the Holy Trinity, the Theotokos, Theosis, and the Eucharist, twenty-nine citations in all, every one of them pointing at a real section of a hosted Father that resolves on click. Nothing here is generated; the index simply maps the doctrine to the words the Church already reads.",
 items: [
  "The Holy Trinity. One God in three Persons, defined at Nicaea and Constantinople against the Arian denial of the Son's deity. Affirming citations from St. Cyril of Jerusalem's Catechesis IV, St. Athanasius on the Nicene Definition, St. Gregory the Theologian's First Theological Oration, St. John of Damascus, and St. Alexander of Alexandria; with St. Athanasius against the Arians and his history of Arian opinions set in the refuting column.",
  "The Theotokos. Why the Virgin is rightly called the one who gave birth to God, the test of orthodoxy at Ephesus in 431. Affirming citations from St. Cyril of Alexandria on the title Theotokos, the Magnificat, the Scholia on the name Emmanuel, and the Tome of Leo on the twofold nativity; with St. Cyril's Second Letter to Nestorius, his Twelfth Anathema, and his refutation of the division of Christ into two sons set against the Nestorian error.",
  "Theosis. The goal of the Christian life: by grace a partaker of the divine nature, sharing not the unknowable essence but the uncreated energies of God. Affirming citations from St. Athanasius on the Incarnation, St. Gregory Palamas on essence and energies and the Triads, and St. Symeon the New Theologian on the light that was seen; with Palamas, citing St. Cyril against created energies, set against the reduction of grace to a creature.",
  "The Eucharist. The bread and wine truly become the Body and Blood of Christ, held from the beginning. Affirming citations from St. Ignatius of Antioch to the Smyrnaeans and the Philadelphians around the year 107, St. Justin Martyr's First Apology around 155, St. Cyril of Jerusalem's Mystagogical Catechesis V, and St. Cyril of Alexandria on the life-giving flesh.",
  "Every citation was verified to resolve. All twenty-nine deep links across the four new topics point at a real numbered section of a hosted work; the page silently drops any citation it cannot resolve, so a broken pointer would simply vanish rather than mislead, and none do.",
  "Cache version bumped to v8.4.0 so the new topic pages evict the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v8.4.",
 ],
 },
 {
 version: "v8.3",
 kind: "Chrysostom's Homilies on Acts, now in the reader",
 date: "June 3, 2026",
 blurb:
 "Hard on the heels of Matthew, the same work for Acts. The Bible reader's commentary on the Acts of the Apostles had only five scattered chapters; St. John Chrysostom's Homilies on the Acts of the Apostles, the only complete patristic commentary on Acts to survive, now sits beside the text across the whole book. The fifty-five homilies ship verbatim from the public-domain Nicene and Post-Nicene Fathers, Series 1, Volume 11, the Schaff edition, never paraphrased, never modernized, never filled in by a model. As with Matthew, the NPNF Acts volume does not mark its text verse by verse, so each homily is anchored to the opening verse of the passage it expounds rather than split across every verse. Where Acts previously carried short hand-written summaries of Chrysostom, those are now superseded by his actual words; the notes from the other Fathers on Acts, St. Gregory the Theologian on Pentecost, St. Augustine, St. Basil, and St. Maximus, were preserved untouched.",
 items: [
  "St. John Chrysostom's Homilies on the Acts of the Apostles added to the Bible reader's commentary, growing Acts coverage from five chapters to twenty-seven (chapters 1 through 26 and 28). Each note cites NPNF1-11 and shows in the desktop study rail and the mobile commentary sheet.",
  "The prior hand-curated Chrysostom summaries on Acts were replaced by the verbatim homily text. The other Fathers already present on Acts, St. Gregory the Theologian (Oration 41 on Pentecost), St. Augustine, St. Basil, and St. Maximus the Confessor, were kept exactly as they were.",
  "Honest granularity, the same as Matthew. The NPNF Acts transcription lacks the line-leading verse markers the John pipeline relies on, so each homily is keyed to the first verse of the passage it treats rather than sub-split per verse. Real, verbatim, cited text; no fabricated verse mapping. Acts 27, the voyage and shipwreck, has no homily lemma opening within it and so carries no new note.",
  "The readable work on Chrysostom's profile, Homilies on the Acts of the Apostles, the complete fifty-five homilies, was already present and is unchanged; this release wires its text into the reader as well.",
  "Cache version bumped to v8.3.0 so the new commentary evicts the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v8.3.",
 ],
 },
 {
 version: "v8.2",
 kind: "Chrysostom's Homilies on Matthew, now in the reader",
 date: "June 3, 2026",
 blurb:
 "The Bible reader carries patristic commentary in the study rail, but Matthew had only a handful of scattered notes. This release fills the whole Gospel. St. John Chrysostom's Homilies on the Gospel of Matthew, the earliest complete commentary on the First Gospel to survive, now sits beside the text across all twenty-eight chapters, and the work itself joins his profile in the saints library. The text ships the only way the rest of the library is built: verbatim from a public-domain source, the Nicene and Post-Nicene Fathers, Series 1, Volume 10, the Schaff edition, never paraphrased, never modernized, never filled in by a model. One honest limitation is named plainly: the NPNF Matthew volume, unlike the John volume, does not mark its text verse by verse, so each homily is anchored to the opening verse of the passage it expounds rather than split across every verse. That is coarser than the John commentary, but it is real, correctly-cited Chrysostom, with no invented verse mapping. The existing hand-curated notes on Matthew were preserved; only the prior Chrysostom-on-Matthew notes were refreshed.",
 items: [
  "St. John Chrysostom's Homilies on the Gospel of Matthew added to the Bible reader's commentary across all twenty-eight chapters of Matthew. Where before only chapters 1, 5, 6, 13, and 25 carried any notes, every chapter now shows Chrysostom in the desktop study rail and the mobile commentary sheet, each note citing NPNF1-10.",
  "The work joins Chrysostom's profile in the saints library as Homilies on the Gospel of Matthew, the complete ninety homilies, readable end to end like his Homilies on John, Romans, Acts, and the rest of his hosted corpus.",
  "Honest granularity, named in the source notes. The NPNF Matthew transcription lacks the line-leading verse markers the John pipeline relies on, so each homily is keyed to the first verse of the passage it treats rather than sub-split per verse. Real, verbatim, cited text; no fabricated verse mapping. The four homilies the public-domain transcription merges into their neighbors (53, 54, 58, 79) keep their true homily numbers by roman-numeral derivation, so nothing is mis-cited.",
  "The pre-existing curated Matthew notes were preserved through the merge; only prior Chrysostom-on-Matthew notes were replaced. The Fathers badge on Matthew was already present and is unchanged.",
  "Cache version bumped to v8.2.0 so the new commentary evicts the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v8.2.",
 ],
 },
 {
 version: "v8.1",
 kind: "The prayer section, rebuilt as a quiet prayer book",
 date: "June 2, 2026",
 blurb:
 "The prayers were all there, but the section around them read like a landing page: a full-bleed hero, big marketing prose, chunky tinted cards. This release strips all of that. The whole prayer section, the hub, the mobile shell, every index, and every reader, is rebuilt into one calm visual world that reads like a prayer book rather than a product page. Serif mastheads sit over a single thin gold rule, lists become hairline-divided indexes with quiet right-arrows, gold is used sparingly, the type is smaller, and the negative space is larger. Nothing functional changed. The Morning and Evening Rule still track what you have prayed today, the prayer rope still counts, your diptychs still surface namedays and anniversaries on Today, and bookmarks, audio, and the bilingual German copy all carry through untouched. This is a design patch, plainly: the same prayers, given a quieter room to be said in.",
 items: [
  "Prayer hub (/prayers) and the mobile prayer shell rebuilt. The slideshow hero and the gold-bordered hover cards are gone, replaced by a centered serif masthead (Pray without ceasing. · 1 Thessalonians 5:17) over a thin gold rule, a quiet Today line, the Jesus Prayer set centered as the prayer of the heart, and three hairline-divided indexes: the daily rules, through the day, and the beginning.",
  "Today (/prayers/today) recomposed onto the same prayer-book vocabulary. A calm two-up for the fast and the day's commemoration, a Pray index into the morning and evening rules and the rope, the Jesus Prayer passage, your diptych namedays and anniversaries, and the appointed readings, with all of the calendar, fasting, saint, and reading data preserved exactly.",
  "The five index pages, Diptychs, the Hours, the Akathists, and Learn to pray, restyled to the shared masthead-and-index pattern. Smaller type, more space, the chunky chips and tinted cards retired.",
  "The rule reader (Morning Rule, Evening Rule, the Hours, the akathists) quieted. The bold sans display title becomes a serif masthead, the gold-boxed progress card becomes a single line over a one-pixel gold rule, the completion banner becomes a quiet doxology, and each prayer is a hairline-divided entry rather than a tinted box. Mark-prayed, the bookmark star, and the audio control all behave exactly as before.",
  "The prayer rope (/prayers/rope) given a centered serif masthead and a calmer footer. The stat boxes flatten to plain figures inside a single hairline group, and the pill buttons become quiet text links. The counter, the bell, the haptics, and cross-device session sync are unchanged.",
  "The lesson reader (/prayers/learning) quieted to match. A masthead with a gold rule, the prayer set off by a gold left-border rather than a boxed card, and Try this rendered as a quiet italic note. Bilingual copy preserved.",
  "Cache version bumped to v8.1.0 so the redesigned section evicts the old buckets on this release.",
  "Footer + home hero chip + /whats-new chip step to v8.1.",
 ],
 },
 {
 version: "v8.0",
 kind: "The Seven Ecumenical Councils, complete, and their Fathers made saints",
 date: "May 31, 2026",
 blurb:
 "For a while the councils section stopped at four, with a standing notice that the rest were coming. They are here. Purify now carries all Seven Ecumenical Councils, the full conciliar foundation the Orthodox Church confesses, each one built the only way the rest of the site is built: the defining texts, the Definitions, the Anathemas, the Canons, ship verbatim from a public-domain source, never paraphrased, never modernized, never filled in by a model. The Fifth Council at Constantinople in 553, the Sixth at Constantinople in 680 and 681, and the Seventh at Nicaea in 787 join the four already present, with their own dogmatic documents rendered word for word from the Nicene and Post-Nicene Fathers, Series 2, Volume 14, the Schaff and Wace edition of the Seven Ecumenical Councils, public domain. The honest editorial work, the historical narrative, the lists of what each council defined and condemned, and the cross-links to the Fathers, is ours and in house voice. The texts themselves are the councils' own. With the seventh in place, the coming soon notice on the councils page has retired itself. And the Fathers of those councils are now saints in their own right. Fifteen of them who until now rendered as plain text on the council pages each have a profile, built the same way, an honest life in house voice and the saint's own words only as verbatim public-domain text. The Tome of Leo and the Letter to the Emperors of Agatho of Rome ship word for word; the rest wait works-deferred for a clean source, and every Father a council names now deep-links straight to his life.",
 items: [
  "Fifth Ecumenical Council, Constantinople II, 553, summoned by St. Justinian. It reads Chalcedon through St. Cyril of Alexandria, confesses that one of the Holy Trinity suffered in the flesh, and condemns the Three Chapters and the errors of Origen. Ships with its Fourteen Anathemas, the Capitula, rendered verbatim from the Nicene and Post-Nicene Fathers, Volume 14, with St. Cyril cross-linked where his Christology is named the standard.",
  "Sixth Ecumenical Council, Constantinople III, 680 to 681. Against Monothelitism it defines two natural wills and two natural operations in Christ, the human will freely subject to the divine, and it names the authors of the error, Honorius of Rome among them, exactly as the council named them. Ships with its Definition of Faith, the two-wills horos, verbatim from Volume 14, and cross-links St. Maximus the Confessor, who died for this doctrine before the council vindicated it.",
  "Seventh Ecumenical Council, Nicaea II, 787, under St. Tarasius and the Empress Irene. It defines the veneration of the holy icons, the proskynesis given to the image that passes to its prototype, distinguished from the worship, the latreia, due to God alone, against the iconoclasts and the council of Hieria of 754. Ships with two verbatim documents from Volume 14, the Decree on the Holy Icons and the Twenty-Two Canons, the latter carrying the Ancient Epitome of each canon in the notes, and cross-links St. John of Damascus.",
  "The councils page now lists all seven in order, with the correct ordinal eyebrow on each new profile, Fifth, Sixth, Seventh, and the more councils are coming notice has retired itself now that the set is complete.",
  "Also in this release, the saints' Miracles section. When a saint is glorified as a wonderworker, his profile now carries the account of his signs in the exact words of the source, never a paraphrase, and only when a verbatim public-domain text exists. It ships first for St. Anthony the Great, with ten accounts taken word for word from St. Athanasius's Life of Antony in the Nicene and Post-Nicene Fathers, Series 2, Volume 4. St. Nicholas and St. Mary of Egypt are held back honestly: the texts the app carries for them are retellings, not verbatim translations, so they wait for a clean source.",
  "Fifteen new saint profiles, the Fathers and sovereigns of the later councils who until now rendered as plain text on the council pages. Third Council (Ephesus, 431): St. Celestine of Rome, St. Memnon of Ephesus, St. Juvenal of Jerusalem. Fourth Council (Chalcedon, 451): St. Leo the Great, St. Anatolius of Constantinople, St. Marcian the Emperor, St. Pulcheria the Empress. Fifth Council (Constantinople II, 553): St. Justinian the Great, St. Eutychius of Constantinople. Sixth Council (Constantinople III, 680 to 681): St. Agatho of Rome, St. Sophronius of Jerusalem, St. Martin the Confessor. Seventh Council (Nicaea II, 787): St. Tarasius of Constantinople, St. Irene the Empress, St. Adrian of Rome.",
  "Two verbatim works ship with the new Father profiles. The Tome of Leo, his Letter to Flavian read and acclaimed at Chalcedon in 451, and the Letter to the Emperors of St. Agatho of Rome, the confession of two wills received at the Sixth Council, both rendered word for word from the public-domain Nicene and Post-Nicene Fathers, Series 2, Volume 14.",
  "The other thirteen Father profiles ship works-deferred, the same discipline as the rest of the library. Each carries a full life and, where the source gives them, a verbatim quote, but no hosted work browser until a clean public-domain text of their writings is confirmed. The honest empty shelf is the point, not a paraphrase dressed up as the saint's own voice.",
  "Council pages now deep-link every Father they name. The principalFathers of all seven councils resolve to their saint profiles, so a reader can move from a council straight to the life of the bishop or sovereign who stood at it, with no dead plain-text names left.",
  "The joint commemoration of St. Marcian and St. Pulcheria, kept together by the Church on February 17, is split into two profiles, the soldier raised to the purple and the virgin empress, each with his own life, so neither is read only as the other's consort.",
  "Footer + home hero chip + /whats-new chip step to v8.0.",
 ],
 },
 {
 version: "v7.6",
 kind: "The miracles of the saints, in the exact words of those who saw them",
 date: "May 30, 2026",
 blurb:
 "When the Church glorifies a saint as a wonderworker, the honest question is what actually happened, and who said so. Purify now answers it the only way the rest of the saints library is built: by handing you the exact account in the exact words of the source, never a paraphrase, never modernized, never filled in by a model. A new Miracles section appears on a saint's profile, and only when a verbatim public-domain account of his proclaimed signs exists. It ships first for St. Anthony the Great, whose miracles were written down by St. Athanasius, who knew him, attended him, and poured water on his hands, in the Life of Antony. Ten accounts render word for word from the Nicene and Post-Nicene Fathers, each carrying its chapter citation, each closing on the point Athanasius himself keeps making, that the healing belonged to the Lord and never to the man. The same rule that built the library kept two saints off this release: the accounts of St. Nicholas the Wonderworker and St. Mary of Egypt that the app already carries are editorial retellings, not verbatim public-domain text, and the whole point of a Miracles section is that it is the eyewitness's own words. They wait for a clean source. The empty shelf is the point.",
 items: [
  "New Miracles section on saint profiles. It renders between a saint's quotes and his disciples, only when a verbatim public-domain account of his miracles exists, and degrades to nothing, silently and with no error, when it does not. Same data and rendering machinery as the saints' hosted works: a title, the source citation in gold, an editor's framing where context is needed, and the verbatim account itself, never altered beyond the whitespace and footnote-marker cleanup every hosted text already gets.",
  "St. Anthony the Great ships first, with ten accounts taken word for word from St. Athanasius's Life of Antony in the Nicene and Post-Nicene Fathers (Series 2, Vol. 4, Schaff and Wace, public domain): the officer's daughter freed from the demon, water welling up in the waterless desert, the healing of Fronto and of the child of Busiris, Polycratia of Laodicea relieved at the very hour of his prayer, the youth hidden on the ship, the man brought in chains, the woman at the city gate, the warning that overtook the persecutor Balacius within five days, and Athanasius's own insistence that Antony healed not by commanding but by prayer and the name of Christ.",
  "Honest deferral, the same discipline as the hosted works. St. Nicholas the Wonderworker and St. Mary of Egypt are not in this release. The texts the app already carries for them are editorial retellings of the Synaxarion and of the Life by St. Sophronius, not verbatim public-domain translations, and a Miracles section that paraphrased the eyewitness would defeat its own reason for existing. Both ship the day a clean public-domain text is confirmed.",
  "Footer + home hero chip + /whats-new chip step to v7.6.",
 ],
 },
 {
 version: "v7.5",
 kind: "Four saints: Justin the Philosopher in full, plus Mark of Ephesus, Isaac the Syrian, and Nikon",
 date: "May 30, 2026",
 blurb:
 "A reader on the Discord asked for his patron, St. Mark of Ephesus, and recommended four more corpora alongside him: St. Isaac the Syrian's Ascetical Homilies, St. Justin Martyr's two Apologies and his Dialogue with Trypho, and the Life of St. Nikon the Metanoeite. We took the request the way the whole saints library is built, by the one hard rule that a saint's own words ship only as verbatim public-domain text, never paraphrased, never modernized, never filled in by a model. That rule split the request cleanly. St. Justin Martyr ships in full: a new profile and all three of his works, the First Apology, the Second Apology, and the Dialogue with Trypho the Jew, taken word for word from the Roberts-Donaldson translation in the Ante-Nicene Fathers (1885) by way of Wikisource. St. Mark of Ephesus, St. Isaac the Syrian, and St. Nikon the Metanoeite each get a full profile and a hagiographic life now, with their writings held back honestly until a clean public-domain English text exists, rather than shipping a paraphrase or a corrupted scan. Justin is the earliest voice in the library to describe Baptism and the Eucharist as the Church already practiced them by the year 155, so this is a real deepening of the second-century shelf.",
 items: [
  "New saint: St. Justin Martyr, the Philosopher, with a five-paragraph life that follows the convert-philosopher through the schools he passed through, the old man by the sea, his school at Rome, and his martyrdom under the prefect Rusticus. Two quotes drawn verbatim from the source text: the flame kindled in his soul from the Dialogue, and 'Whatever things were rightly said among all men, are the property of us Christians' from the Second Apology.",
  "New hosted work: The First Apology, all 68 chapters, addressed to the emperor Antoninus Pius around the year 155. Includes the earliest full description we possess of the Eucharist and of Baptism, set under their own chapter headings, with a one-line editorial framing on the opening address and the verbatim Greek (Εὐχαριστία) preserved where the translator left it.",
  "New hosted work: The Second Apology, all 15 chapters, the shorter appeal to the Roman Senate occasioned by the execution of three Christians under the prefect Urbicus. This is where Justin teaches that the whole race shares in the seed of the Word, the Logos, so that whatever was rightly said by anyone belongs to Christians.",
  "New hosted work: The Dialogue with Trypho the Jew, all 142 chapters, the longest surviving second-century conversation between a Christian and a Jew, set at Ephesus over two days. Justin recounts his own search through the schools of philosophy and argues from the Hebrew Scriptures that Jesus is the Christ and that the Church is the true Israel.",
  "New saint: St. Mark of Ephesus (Mark Eugenikos), Pillar of Orthodoxy, with a life covering his learning, his elevation to Ephesus, the Council of Ferrara-Florence of 1438 to 1439, his lone refusal to sign the Union, and the Church's glorification of him. His works, the Encyclical, the Confession of Faith, and the writings against the Filioque, are deferred: the standard English (Pogodin) is under copyright, and no clean public-domain English translation exists yet. The profile renders without a works browser until one does.",
  "New saint: St. Isaac the Syrian, of Nineveh, hermit and bishop, with a life that notes honestly and briefly that he lived in the Church of the East yet his ascetical writings were received and loved throughout the Orthodox Church. His Ascetical Homilies are deferred: the only public-domain English (Wensinck, 1923) survives as corrupted OCR that could not be made exact without inventing corrections, which the verbatim rule forbids. The work ships the day a clean text surfaces.",
  "New saint: St. Nikon the Metanoeite, the preacher of repentance who carried the cry 'Metanoeite' through Asia Minor, newly reconquered Crete, and the Peloponnese, settling at last in Lacedaemon. The Life written by the abbot Gregory is deferred: its only English (Sullivan, 1987) is under copyright.",
  "Editorial note on the deferrals: three of the four corpora are blocked by the absence of a clean public-domain English source, not by effort. Each profile says so plainly. The honest empty shelf is the point, not a paraphrase dressed up as the saint's own voice.",
  "Footer + home hero chip + /whats-new chip step to v7.5.",
 ],
 },
 {
 version: "v7.0",
 kind: "The prayer rope, the diptychs, the Hours, the akathists",
 date: "May 30, 2026",
 blurb:
 "If you came to Purify to pray, this is the patch for you. The prayers section has been rebuilt around four old practices the Church has always carried and that the app, until now, has only gestured at. A digital komvoschini lives at /prayers/rope: tap the rope to advance a knot, pick 33 or 50 or 100, switch the prayer line, count quietly with no streaks and no noise. A pair of diptychs lives at /prayers/personal: the list of those for whom you pray every day, and the list of those who have fallen asleep in the Lord. Their namedays and the anniversaries of their repose surface on /prayers/today on the day, quietly, no notification, no push, just there when you open the page. The Hours, First through Ninth and Small Compline, finally have data and readers at /prayers/hours, with the canonical structure of each Hour standing today and the full Psalmody and variable troparia landing in the next content drop. The Akathists corpus has begun at /prayers/akathists with the seventh-century Akathist to the Theotokos in shell, refrain and all. The Pascha-relative lectionary now composes the Sundays of the Triodion and the Pentecostarion correctly so a Sunday of the Holy Cross renders its proper readings on /prayers/today, not the fixed-calendar miss. Prayer-rule completions and rope sessions and diptych entries all sync across devices for signed-in users, at last, mirroring the marketing copy we’d been carrying for two months. And the streak counter is gone everywhere: replaced by a 14-day rhythm strip and the honest sentence ‘last prayed N days ago’, because a rule is a rule and the day is the day.",
 items: [
  "New /prayers/rope: a digital komvoschini that counts the Jesus Prayer (or any line you pick) on a 33-, 50-, or 100-knot ring. Tap the rope, press space, press enter, any of them advance a knot; backspace fixes a mis-tap. The only headline number is your knots-this-year, which never resets, never panics. Settings drawer toggles optional haptics and an optional bell tone at every 25 knots, both default off because Orthodox practice is silence. Sessions live on this device and sync across devices when you're signed in.",
  "New /prayers/personal: two diptychs, for the living and for the reposed, in the canonical Orthodox shape. Each entry takes a name, an optional relationship (godmother, brother, priest), an optional note, an optional nameday MM-DD (living) or repose date YYYY-MM-DD (departed), and free-form tags. Plain text in your browser by default; mirrored to a private, RLS-locked Supabase table when you sign in. Search appears once you have more than five entries.",
  "Today in your diptych: if a name in your list has a nameday today, or a yearly anniversary of falling asleep today, a small quiet section appears on /prayers/today between the Pray cards and the Readings cards. No push notification, no badge, no nudge, just there when you opened the page anyway, the way it would be at Liturgy.",
  "Rhythm replaces streak everywhere it appeared. The Morning Rule and Evening Rule pages no longer count days in a row, no longer use the word streak, no longer rebuke a missed day. They draw a 14-cell strip showing which of the last 14 days you finished the rule, and a sentence below it: ‘12 of last 14 days · last prayed 3 days ago’ when there's a gap, or ‘Prayed today’ when there isn't. Old streak counters in localStorage are silently re-derived into the new rolling-dates array on first load, so nothing is lost.",
  "New /prayers/hours: First Hour (6 a.m.), Third Hour (9 a.m.), Sixth Hour (noon), Ninth Hour (3 p.m.), and Small Compline (after supper). The canonical structural shell of each Hour, the opening blessing, the three appointed Psalms, the Troparion of the Hour, the dismissal, is in place today; the full Psalm text and variable troparia for fasts and feasts land in the next content drop. The previous ‘Coming soon’ chip on the /prayers landing is replaced with real links to each Hour.",
  "New /prayers/akathists: the Akathists, the long-form standing hymns of the Church. The Akathist to the Most Holy Theotokos, the seventh-century original, ships in shell with the opening Kontakion, the first Ikos, and the refrain pattern (‘Rejoice, O Bride Unwedded!’) wired correctly. The remaining twelve Ikoi and twelve Kontakia are being typeset against the Hapgood 1906 edition and drop next.",
  "Pascha-aware lectionary. /prayers/today and the calendar now compose the appointed readings from both the fixed MM-DD cycle and the movable Pascha-relative cycle, with the movable winning where they overlap. So when Palm Sunday falls on the calendar day a fixed-cycle Saint has, you see Philippians 4 and John 12, not the fixed entry. Triodion (Zacchaeus through Holy Week) and Pentecostarion (Pascha through All Saints) Sundays are in the data; weekday readings will follow.",
  "Audio scaffolding. Each prayer in a rule can now carry an optional MP3 path; the reader renders a native browser audio control when one is present, and a quiet ‘not yet shipped’ line when it isn’t. The recordings themselves, Slavonic and Greek chant from public-domain liturgical sources plus newly commissioned English readings, are a separate content-acquisition track with a budgeted line on /support; this patch is the plumbing for them.",
  "Opt-in prayer reminders. /account → Data now carries a small ‘Prayer reminders’ panel that lets a signed-in user turn on one morning nudge and one evening nudge at the local times of their choosing. Pure browser Web Push API; no third-party notification provider, no analytics on what was clicked. Off by default. Turn it off on the same page whenever it stops being useful.",
  "Cross-device sync for the prayer features, at last. Rule completions, diptychs, and rope sessions push to and pull from new RLS-self-scoped Supabase tables (prayer_completions, intentions_living, intentions_departed, rope_sessions, push_subscriptions). The marketing copy that promised ‘Sign in to sync your prayer life across devices’ now does what it says. Signed-out users continue to work exactly as before with everything on the device.",
  "Offline. The morning and evening rule JSON now rides through the service-worker cache so the rule loads on a bad signal or in airplane mode, and a small ‘Available offline’ pill appears on the page when the cache hit succeeds. Cache version bumped to v7.3.0 so old buckets evict on this release.",
  "Prayer bookmarks. The ★ on each prayer card in the Morning Rule and Evening Rule writes into the same bookmarks list as Bible verses and writing sections, so /saved shows your starred Trisagion alongside your starred verses.",
  "Privacy doc updated end-to-end. Every new localStorage key (purify.intentions.living, purify.rope.sessions, purify.prayers.{ruleId}.dates), every new server table, every push-subscription detail is named. Honest about plain-JSON storage, honest about which third parties are involved (Google / Apple / Mozilla push services, all browser-native).",
  "Admin panel reshaping that landed in the same window. Five new operator panels on /admin (Sustainability, Content Health, i18n Coverage, Service Health, Crawler Audit). The Overview KPIs were reframed from rolling-window numbers, which could shrink between visits as a high-traffic day rolled off the left edge, to lifetime cumulative counts that only ever grow. Charts gained real Y-axes, a calendar heatmap, and a responsive resize. Operator-grade visibility, no user-visible regressions.",
  "Footer + home hero chip + /whats-new chip step to v7.0.",
 ],
 },
 {
 version: "v6.9",
 kind: "Deutsch, the site speaks German now",
 date: "May 29, 2026",
 blurb:
 "Pick German in the footer and the whole site changes language. The home page, the prayer hub, the calendar, /about, /faq, /privacy, /support, /pricing, /topics, every page a casual reader actually opens, render in editorial German written by hand, not by machine. All fifty-six saint biographies, the Morning Rule, the Evening Rule, the v6.8 essence-and-energies florilegium, and the Nicene Creed of 325 ship in German alongside them. New i18n infrastructure means dropping a sibling JSON file into data/saints/{slug}/i18n/de.json, or data/councils/first-nicaea/i18n/de/{document}.json, brings any new surface into German with one file change. Where editorial German has not yet been written (most hosted patristic works, the learning module, akathists, the Bible itself), a small honest banner (Übersetzung im Werden) names the gap and serves the English source. Voice and terminology follow the established wording of the Diözese Berlin und Deutschland (ROCOR) and the Metropolie von Wien.",
 items: [
  "Long-prose pages translated end-to-end into German: the home page (hero, four pillars, where-to-begin pills, three challenge cards, final CTA, Nahum 1:7 marketing pull-quote), the prayer hub (/prayers with all section headers, the Jesus Prayer, the four Hours, akathist + learning cards), the calendar (toggle, feast panel, today's readings, month nav, day scroll, colophon), /about (six sections), /faq (all twelve Q&As), /privacy (every field and third party named), /support (live BMC goal + expense breakdown), /pricing, and /topics index.",
  "All fifty-six saint biographies in the registry ship with full German prose: the Theotokos, the Twelve and St. Mary Magdalene, the apostolic Fathers (Ignatius, Polycarp, Papias, Anianus, Prochorus), the Cappadocians, the Antiochenes, the Alexandrians, Ephraim the Syrian, the Athonites (Palamas, Paisios, Nektarios), Seraphim of Sarov, the desert saints (Anthony, Mary of Egypt), the Confessors (Maximus, Theodore the Studite), and the Fathers of Nicaea and Constantinople I. Each entry covers shortBio, epithet, byname, life paragraphs, and (where present) titles[].",
  "Morning Rule (/prayers/morning) and Evening Rule (/prayers/evening) in full German liturgical wording, Trisagion, Vaterunser, Jesusgebet, Theotokos hymn, Aufstehen aus dem Schlaf, Entlassung, drawn from the Diözese Berlin und Deutschland and the Metropolie von Wien.",
  "The v6.8 essence-and-energies florilegium ships fully in German at /saints/gregory-palamas/essence-and-energies, all eight sections, all editorial notes, with the corrected Cyril of Jerusalem citation and the live-academic-question framing on Pino vs. Loudovikos preserved.",
  "First council document in German: the Symbol of the Faith of the First Council of Nicaea (325), the original 318-Father Creed with the anathemas, the editorial notes on ὁμοούσιον, plus the Eusebian baptismal creed as a third section.",
  "New i18n infrastructure: lib/i18n/localizedContent.ts (saints + works + prayers loaders), lib/councils/load.ts (council documents), and the ContentNotYetTranslated banner with messaging in all 13 ready locales. Every loader falls back to the English source when the locale variant is missing, and surfaces an isLocalized flag so pages can render the banner only on the surfaces that need it. Adding a new German page is now a one-file change.",
  "Editorial discipline: no machine translation. Long-prose content that has not been editorially translated shows 'Übersetzung im Werden' and serves the English source rather than guessing in German at theology the editors have not yet reviewed. As individual works are translated, the banner disappears for that surface.",
  "Still in banner-mode, queued for follow-up German pushes: roughly thirty hosted patristic works (everything except the essence-and-energies florilegium), the remaining three Nicaea documents (the Twenty Canons + the Synodal Letter) and all canons of Constantinople I / Ephesus / Chalcedon, the Jesus Prayer learning module, the Akathists hub, and the Hours preview. The Bible itself is intentionally out of scope, German Orthodox readers cross-check with Luther, Schlachter, or Septuaginta Deutsch.",
  "Footer + home hero chip + /whats-new chip step to v6.9.",
  "Editorial pass v6.9.1: dashes scrubbed across German content, German prose tightened to mirror the English source paragraph for paragraph, and the eleven non-English / non-German locales retired pending editorial review. Only English and Deutsch are shippable in the language switcher today; the others return when their catalogs have been hand-checked.",
 ],
 },
 {
 version: "v6.8",
 kind: "The essence and energies, in the words of the Fathers",
 date: "May 28, 2026",
 blurb:
 "A reader on the Purify Discord (handle: ChristosAnesti) sent in a substantial florilegium on the essence-energies distinction, patristic witnesses spanning Athanasius, Cyril of Jerusalem, Basil, Chrysostom, Cyril of Alexandria, Maximus the Confessor, John of Damascus, Ephraim the Syrian, Gregory Palamas, Gennadios Scholarios, and Nicodemos the Hagiorite, together with the relevant Scripture (Exodus 3:14, Romans 1:20, John 10:38, Ephesians 1:19–20, Philippians 3:21, 1 Corinthians 12:10–11). This patch turns that gift into a curated page on Gregory Palamas's profile, with the citations reframed in calm catechetical voice and drawn from public-domain English translations (Schaff NPNF, Pusey, R. Payne Smith). Alongside it: new quotes on six saints’ profiles, a new St. Ephraim the Syrian profile with his Transfiguration homily, Tikhon Pino's 2023 *Essence and Energies* added to Palamas's licensed shelf as the current standard scholarly treatment, and a new Contributors section on /about so that readers who shape the work can be credited honestly.",
 items: [
  "New hosted page: /saints/gregory-palamas/essence-and-energies, a florilegium of eight sections (the doctrine in one sentence, Scripture's witness, the incomprehensibility of the essence, God known through His operations, the Tabor light, Maximus and John of Damascus on operation, Cyril of Alexandria against created energies, Palamas's own grammar of identity-and-distinction). Each citation drawn from public-domain English; corrections to two contributor citations made in the editorial notes.",
  "Six saints’ profiles gain a new quote tied to the florilegium: Basil the Great (Letter 189 on operations and unity of nature), John Chrysostom (Homily II on Hebrews on the incomprehensibility of the essence), John of Damascus (Exact Exposition III.15 on the fourfold grammar of operation), Maximus the Confessor (200 Chapters on Theology 2.76 on partial knowledge), Cyril of Jerusalem (Catechesis VI.6 on the Cherubim and the unscrutable nature), and Gregory Palamas (150 Chapters 144 on the names of the energies). Each href deep-links to the new florilegium.",
  "New saint profile: St. Ephraim the Syrian. Short life from Nisibis to Edessa, one hosted work, his Sermon on the Transfiguration of the Lord, the 'two suns on the mountain' homily that became a patristic ground for the Palamite reading of the Tabor light as uncreated.",
  "Palamas's Licensed Works shelf grows from 7 to 8: Tikhon Alexander Pino's *Essence and Energies: Being and Naming God in St. Gregory Palamas* (Routledge Research in Byzantine Studies, 2023). The current standard scholarly treatment of the modal grammar of the distinction; the volume to read alongside the florilegium.",
  "New Contributors section on /about. Lists readers who have shipped patches by handle. ChristosAnesti is the first listed.",
  "Editorial guardrails honored: polemical Discord voice stripped; the live academic question (Pino vs. Loudovikos on Palamite ontology) named but not adjudicated; the contributor's mislabel of 'Catechetical Lectures Ch. 2–3' corrected to Catechesis VI.6; the Boulnois/de Durand modern translation of Cyril paraphrased in our own words with PG citation rather than quoted verbatim.",
  "Footer + home hero chip + /whats-new chip step to v6.8.",
 ],
 },
 {
 version: "v6.7",
 kind: "Cyril of Alexandria + the essence-energies shelf",
 date: "May 28, 2026",
 blurb:
 "Two depth patches in one. First, Cyril of Alexandria, the Seal of the Fathers, gets the corpus treatment he deserves: four new hosted works ship from public-domain translations (the Five Tomes Against Nestorius, the Three Epistles with the Twelve Anathemas, selections from the Commentary on Luke, and the Scholia on the Incarnation), plus nine new licensed editions on his Licensed Works shelf (the IVP Ancient Christian Texts Commentary on John in two volumes, the Catholic University FOTC editions of the Letters and the Festal Letters and the Three Christological Treatises, Norman Russell's Routledge introduction, and Daniel Keating's Oxford monograph on deification in Cyril). Second, the essence-energies distinction now has a real shelf. Palamas gains Lossky's two classics, Bradshaw's Aristotle East and West, Meyendorff's foundational Study, and Russell's recent Oxford volume on the making of Palamism. The doctrine's Cappadocian and Maximian roots each get one thematic title on the relevant saint's profile.",
 items: [
  "Cyril of Alexandria hosted-works expand from 1 to 5: Five Tomes Against Nestorius, Three Epistles to Nestorius (with the Twelve Anathemas), Commentary on Luke (Annunciation through Transfiguration), and the Scholia on the Incarnation. All four drawn from public-domain English translations (Pusey's Library of Fathers, R. Payne Smith's Syriac translation, Schaff's NPNF) with editorial framing and section notes.",
  "Cyril's saint profile picks up two quotes for the first time: a passage from the Five Tomes on the meaning of Theotokos, and the Twelfth Anathema from the Third Letter to Nestorius. Both link directly to the new hosted works.",
  "Cyril's Licensed Works section grows from 2 to 11: the IVP Academic Commentary on John (vols 1 and 2, Maxwell translation), the FOTC editions of Three Christological Treatises (King), Letters 1–50 and 51–110 (McEnerney), Festal Letters 1–12 and 13–30 (Amidon), Norman Russell's Cyril of Alexandria (Routledge Early Church Fathers), and Daniel Keating's The Appropriation of Divine Life in Cyril of Alexandria (Oxford).",
  "Essence-energies main shelf lands on Gregory Palamas: Lossky's Mystical Theology of the Eastern Church and The Vision of God (SVS), Bradshaw's Aristotle East and West (Cambridge), Meyendorff's A Study of Gregory Palamas (SVS), and Russell's Gregory Palamas and the Making of Palamism in the Modern Age (Oxford). Palamas's section grows from 2 to 7 entries.",
  "Cappadocian and Maximian roots of the distinction each get one thematic title: Russell's Doctrine of Deification on Basil, Beeley's Gregory of Nazianzus on the Trinity and the Knowledge of God on Gregory the Theologian, Louth's Origins of the Christian Mystical Tradition on Gregory of Nyssa, Thunberg's Microcosm and Mediator on Maximus.",
  "Every new ASIN in this patch was verified against Amazon before shipping. Books that could not be confirmed or that fell outside the Orthodox / trusted academic editorial filter were dropped from the batch.",
  "Footer + home hero chip + /whats-new chip step to v6.7.",
 ],
 },
 {
 version: "v6.6",
 kind: "Licensed Works on the saints",
 date: "May 28, 2026",
 blurb:
 "Each saint's profile can now point readers to printed books beyond the public-domain corpus Purify hosts directly. Where a work is licensed by an Orthodox or scholarly publisher (St. Vladimir's, Paulist, Holy Hesychasterion, Cambridge, Routledge, CUA Press), we link out to a vetted edition on Amazon so readers can buy an authoritative copy. This solves the 'book searching problem' many Orthodox Christians and inquirers face when they want to go deeper than the app itself can carry. Every link in the section participates in the Amazon Associates program, so a click that turns into a purchase quietly funds the next saint Purify ships.",
 items: [
  "New Licensed Works section on saint profiles, beneath the Writings browser. Renders only when curated entries exist for that saint, so profiles without licensed editions stay clean.",
  "Editorial filter, strict and non-negotiable. Books in this section come from St. Vladimir's Seminary Press (Popular Patristics), Paulist Press's Classics of Western Spirituality, Holy Trinity Monastery, Holy Hesychasterion, Ancient Faith Publishing, Cistercian Studies, Catholic University of America's Fathers of the Church, Routledge's Early Church Fathers, or established academic patrology (Andrew Louth, John Behr, John McGuckin, Paul Blowers, Robert Wilken, Benedicta Ward, Eugenia Scarvelis Constantinou). No Sophiology, no schismatic press, no AI-generated reprint mills.",
  "Initial coverage of eighteen saints with verified Amazon ASINs: Athanasius the Great, Basil the Great, Gregory the Theologian, Gregory of Nyssa, Gregory Palamas, John Chrysostom, John of Damascus, Cyril of Alexandria, Cyril of Jerusalem, Irenaeus of Lyons, Maximus the Confessor, Symeon the New Theologian, Ignatius of Antioch, Polycarp of Smyrna, Anthony the Great, Mary of Egypt, Seraphim of Sarov, Paisios the Athonite, Nektarios of Aegina, and the Apostle John. Every ASIN was checked against Amazon before shipping to catch typos and ensure the link resolves to the correct book.",
  "FTC-compliant disclosure runs as a small italic line inside every Licensed Works section, shown once an associate tag is configured. Outbound links carry rel=\"noopener nofollow sponsored\" and open in a new tab.",
  "Plumbing for growth, not just data. A new lib/affiliate/amazon.ts helper builds tagged URLs from ASIN + NEXT_PUBLIC_AMAZON_AFFILIATE_TAG, and a per-saint data/saints/{slug}/licensed-works.json file is the only thing needed to add another saint or another book, no code changes, no migration, no admin UI yet.",
  "Footer + home hero chip + /whats-new chip step to v6.6.",
 ],
 },
 {
 version: "v6.5",
 kind: "Bump the saints, fortified perimeter",
 date: "May 28, 2026",
 blurb:
 "Two big things ship together. First, the Saint Bump system: every saint profile now carries a one-tap 'Bump' button that tells the editorial team which saint's works you want translated and shipped next. We translate corpora in the order readers ask for them, and Bump turns that into a public, transparent queue. Saints whose corpus is fully shipped retire the button to a 'Fully published' gold badge instead, there is nothing left to request. Second, a comprehensive security hardening pass: rate limiting across every public API (Supabase-backed, atomic, multi-instance-safe), a full security-header set with a Content-Security-Policy in report-only mode, end-to-end Zod input validation on every route body, an admin debug-route opt-in flag, and a new SECURITY.md with the disclosure policy. The app now scores A+ on Mozilla Observatory and securityheaders.com, and `npm audit` runs clean for production-runtime dependencies.",
 items: [
 "New Bump button on every saint profile. A signed-in tap toggles a row in the new `saint_bumps` Supabase table; one bump per user per saint; total bump count visible to everyone. The small `?` next to the button opens a popover explaining what a bump is and why we use it. Signed-out users see the count with a 'Sign in to bump' prompt that preserves the return path.",
 "Saints with `complete: true` in the registry retire the bump button to a static 'Fully published' gold badge: every known work attributed to that saint has been translated and shipped, so there is nothing left to request. The help popover explains the state and links to /contact for missing-work reports.",
 "New Supabase migration adds the `saint_bumps` table with RLS so users can only read aggregates and toggle their own row. The API route at `/api/saints/[slug]/bump` returns the fresh count after each toggle so the optimistic UI reconciles instantly. Failed network calls roll back the optimistic state and surface a small error line under the button.",
 "Rate limiting across every public API: 120 events per minute per IP on /api/track, 30 toggles per minute per user on the bump endpoint, 20 per minute on the auth callback (slow magic-link brute force), 5 per minute per user on account delete. Backed by a Supabase `rate_limits` table + atomic `rate_limit_hit` RPC so limits hold across Render instances and survive restarts. Fails open on transient DB errors so a slow database never locks readers out.",
 "Security headers ship across every page: HSTS with preload, X-Content-Type-Options nosniff, X-Frame-Options DENY, strict-origin-when-cross-origin Referrer-Policy, Permissions-Policy locking down camera / microphone / geolocation / interest-cohort, plus Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy at same-origin.",
 "Content-Security-Policy with per-request nonces and `strict-dynamic` for Next's injected scripts, in Report-Only mode for v6.5 while we collect violations. A new /api/csp-report endpoint persists violations to a `csp_reports` table for review; enforcement flips on after a week of clean reports.",
 "Zod input validation on every route body that accepts user input: /api/track, the bump endpoint, the auth callback's `next` parameter (tightened to reject protocol-relative URLs and Windows-path quirks), the admin identities debug endpoint. Malformed requests now return 400 with a typed error instead of silently casting and writing garbage to the database.",
 "Anti-abuse hardening on /api/track: Content-Type must be `application/json`, `sessionId` must match `[a-zA-Z0-9_-]{16,64}`, `path` must start with `/` and contain no nulls / newlines / `..`, and `Sec-Fetch-Site` is checked when the header is present (browsers send it; most bots do not). A per-IP daily cap stops a determined attacker from flooding the analytics table.",
 "Admin debug routes (`identities-debug`, `site-debug`, `geo-debug`) now gate behind an `ADMIN_DEBUG_ENABLED=1` environment flag. With the flag unset they return 404 even for an admin email, invisible by default.",
 "New SECURITY.md at the repository root: how to report vulnerabilities (security@purify.app, 90-day responsible-disclosure window), the supported-versions matrix, the threat model (Supabase is trusted, service-role key never leaves the server, sessions are HttpOnly + Secure + SameSite=Lax), and the dependency-audit policy.",
 "`purify_locale` cookie hardened with `secure: true` in production. `npm audit --omit=dev --audit-level=high` runs clean; dev-only residual vulns (Lighthouse CI `tmp`, `postcss` transitive) are documented in SECURITY.md with a note that they do not ship to the production runtime.",
 "Footer + home hero chip + /whats-new chip step to v6.5.",
 ],
 },
 {
 version: "v6.4.3",
 kind: "The site now opens in your language",
 date: "May 27, 2026",
 blurb:
 "The i18n patch lands end-to-end. Every page-level chrome string (navigation, footer, eyebrows, H1s, button labels, lead paragraphs) now reads through the locale catalog. Thirteen languages ship: English, Spanish, Romanian, Greek, Russian, French, German, Serbian, Ukrainian, Italian, Portuguese, Bulgarian, Arabic. The picker in the footer sets the language for the whole session; the choice now sticks across every navigation. Long-prose surfaces (/about body, /faq Q&A, /privacy detail, /whats-new historical entries) stay in their original English with a discreet 'Translation in progress' banner that names the discipline, the catalog was sized for chrome only because Scripture, the Fathers, the saint biographies, and the council canons should not be passed off as authoritatively translated without editorial review.",
 items: [
 "Server pages wired: /about, /pricing, /support, /faq, /privacy, /account, /topics, /topics/[slug], /saints, /councils, /whats-new. Each uses getServerLocale() + getMessages() server-side and renders eyebrow + H1 through t(m, key).",
 "Saint profile shell components: TitlesSection and LifeSection now read 'His/Her titles' and 'His/Her life' through the catalog with pronoun-aware lookup. DisciplesSection, QuotesSection, and GreatFeastsSection were already wired.",
 "TranslationDisclaimer banner mounted at the top of /about, /faq, /privacy, and /whats-new. Renders only on non-English locales. Names what's translated (UI chrome) and what isn't (body prose pending editorial review).",
 "Locale picker fix: clicking a language now does a hard window.location.reload() so the choice persists across navigations. The previous router.refresh() only repainted the current page; the next Link click served the previously-prefetched payload in the old language.",
 "The thirteen catalogs are hand-produced with Orthodox-aware care for liturgical terms (Glory to God for all things, Pascha, Theotokos, the morning and evening rules). The disclaimer banner discloses that editorial review for theological precision is still in progress.",
 "Footer + home hero chip + /whats-new chip step to v6.4.3.",
 ],
 },
 {
 version: "v6.4.2",
 kind: "Mobile Today + Discover, the menologion vocabulary",
 date: "May 27, 2026",
 blurb:
 "Mobile feedback was that Today felt 'lacking' and the Discover tile icons felt too templatey. This release rebuilds both surfaces inside the calendar's existing manuscript / menologion vocabulary so the mobile shell reads as one visual world instead of a generic prayer-app stack next to an illuminated calendar page. Four generic line-art icons (Book, Compass, Hands, User) are replaced with bespoke Orthodox glyphs (Gospel codex, eight-pointed star, orans figure, haloed head). Today gains four content blocks the old version did not have: appointed Epistle and Gospel inline, a patristic pull-quote tied to the day's saint (with a Desert Fathers fallback on plain days), the fast in plain words, and a Pascha countdown under a small three-bar cross.",
 items: [
 "Four new bespoke icons in components/ui/icons/: Codex (Gospel book with cross incised on the cover and two ribbons), Octogram (eight-pointed Theotokos / Nativity star), Orans (standing figure with raised arms and small halo, the early Christian prayer posture), HaloedHead (face inside a halo ring with eight radiating points). All four follow the existing line-only currentColor convention so they sit beside Cross / Halo / Lampada / Wheat / Grapes naturally.",
 "MobileTabBar icon swap: Book → Codex on the Bible tab, Compass → Octogram on the Discover tab, Hands → Orans on the Prayers tab, User → HaloedHead on the You tab. Sun stays on the Today tab. No more Lucide-style glyphs in the mobile chrome.",
 "New TodayMenologionHero (components/today/TodayMenologionHero.tsx) replaces TodayMobileHero. Top to bottom: hour-aware display-serif greeting, date line in rubric red on fast days and gold on feast days, the day's saint with an illuminated drop cap on the first letter (reuses components/calendar/DropCap.tsx), first sentence of the bio as a serif tease, OrnamentHeadpiece divider, FAST block with the plain-English rule (Strict fast / Wine and oil / Fast released), Appointed Readings block with Epistle + Gospel citations deep-linking into /bible/{book}/{chapter}#v{from}-{to}, a printed-book pull-quote from the day's saint with rubric-red attribution (Desert Fathers fallback rotates by day-of-year through data/today/sayings.json), a centered Pascha countdown under a small three-bar cross, the existing CTA pair, and a quiet colophon at the foot. The old five-chip Hallow-style nav row is gone, the bottom tab bar already does navigation.",
 "Seasonal tone wash on the Today page using the calendar's existing calendarPageVars() + toneFor() helpers, so the whole hero takes on a gold / crimson / green / muted tint based on whether the day is a feast, a strict fast, fast-free, or ordinary. Same --tone CSS variable the calendar already uses; same source of truth.",
 "Discover restructured from a six-card grid to a menologion-index list. Each library section is one printed line: small illuminated glyph on the left, display-serif title, italic serif blurb, thin gold hairline rules between entries, a quiet right-arrow at the end of each row. Header is an OrnamentHeadpiece + rubric eyebrow + display-serif H1; closing colophon at the foot. No more per-tile gradient backgrounds or rounded-2xl borders, the page reads as a service-book table of contents, not a SaaS feature grid.",
 "Mobile-only changes; the desktop home stays exactly as it was. The /calendar page is untouched (it was already the model). Saint profile pages and the Bible reader are unchanged.",
 "Footer + home hero chip + /whats-new chip step to v6.4.2.",
 ],
 },
 {
 version: "v6.4.1",
 kind: "Full UI translation, 13 locales",
 date: "May 27, 2026",
 blurb:
 "The site now auto-translates its UI to the reader's browser language across thirteen locales: English, Spanish, Romanian, Greek, Russian, French, German, Serbian, Ukrainian, Italian, Portuguese, Bulgarian, and Arabic (right-to-left). The Bible text itself is intentionally untouched per the source-honesty discipline; long-prose pages (FAQ bodies, /privacy detail, individual saint biographies, council canons, prayer-book text, /whats-new historical entries) also stay in English, with a small banner naming this honestly. Translation is cookie-driven, so a user's bookmark on any saint's profile keeps working at the same URL, only the chrome around the page repaints. A locale switcher in the footer makes the choice manual when the auto-detected one isn't right.",
 items: [
 "Middleware reads Accept-Language on the first request and sets a year-long `purify_locale` cookie. The root layout reads the cookie server-side, sets <html lang dir>, and mounts a MessagesProvider so every server and client component sees the same active locale. No URL change, /saints/john-chrysostom resolves at the same path in every language.",
 "Thirteen catalogs at lib/i18n/messages/{locale}.json with ~180 keys each, covering nav (Navbar, AppNav, MobileTabBar), Footer, the home hero, /about eyebrows + H1s + H2s, /pricing, /support intro, /faq, /privacy, /account chooser, /signin, /signup, /forgot, /reset, /topics + /topics/[slug], /discover, /calendar shell, /prayers shell, /saints index shell, /councils index shell, /whats-new shell, and the saint-profile shell components (the Disciples and successors section, the Great Feasts section, the In his/her own words section).",
 "Translation provenance is named honestly. Short UI chrome is hand-produced with Orthodox-aware care for liturgical phrases (\"Glory to God for all things\", \"Pascha\", \"Theotokos\", the morning and evening rules). Where prose is longer (the body of the FAQ, the detail of /privacy, individual saint biographies), the text stays in English under a discreet 'Translation in progress' banner that names what's translated and what isn't.",
 "Locale switcher in the footer, just below the Discord and Instagram chips. Native-language labels (Español, Ελληνικά, Русский, العربية…). Writes the cookie and refreshes the route, the whole site repaints in the new locale on the next paint.",
 "Right-to-left for Arabic: <html dir=\"rtl\"> set conditionally, Tailwind logical properties (ms-*, me-*) used where the existing class was direction-sensitive. Most of the site uses centered layouts which translate cleanly; minor visual regressions in RTL are tracked as follow-ups.",
 "Bible reader, individual saint bios, council canons, prayer-book text, and /whats-new historical entry bodies are explicitly out of scope and stay in their published languages. The 'no black-box translations' discipline already named on /about applies here: the site doesn't pass unreviewed translations of Scripture or the Fathers off as authoritative.",
 "Footer + home hero chip + /whats-new chip step to v6.4.1.",
 ],
 },
 {
 version: "v6.4",
 kind: "Roadmap scaffolding from the Discord cycle",
 date: "May 27, 2026",
 blurb:
 "A scaffolding pass from the Discord pre-launch feedback cycle. Five distinct landings: /pricing and /support brought into alignment with the new About; St. Theophylact of Ohrid added to the saints registry (entry stub, awaiting a public-domain English source for his Explanation of the Gospels); the calendar matrix type, registry, and Supabase migration laid down so jurisdictional menologions can later overlay the base; the new /topics route shipped with one starter topic ('The Incarnation') and an editorial schema; and i18n Phase 1, the locale registry plus the English message catalog, in place so contributors can extract strings as they touch each page. The biggest items (jurisdictional menologion patches, Spanish UI chrome, the Theophylact ingest, the topical-index editorial corpus) are all editorial work that begins now on top of the engineering foundation.",
 items: [
 "Pricing and Support copy brought into alignment with the new /about so the three pages read in one voice. Editorial pass only, no behavior changed.",
 "St. Theophylact of Ohrid added to the saints registry. Bio paragraph + one quote + author-name icon mappings. works: [] for now; the Explanation of the Four Gospels lands once a clean public-domain English source is confirmed (see docs/prd/v6.4-community-feedback.md §3). Follows the existing empty-works pattern from St. Marina, St. Hermione, St. Isidora, and St. Olympias.",
 "Calendar matrix scaffolding. lib/calendar/matrix.ts defines the CalendarReckoning and CalendarTradition enums, the CalendarMatrix shape, the CALENDAR_MATRICES registry (ecumenical default only), and the MenologionPatch shape jurisdictional patches will use. supabase/migrations/20260527_profiles_calendar_matrix.sql adds profiles.calendar_reckoning + profiles.calendar_tradition columns with default 'new' / 'ecumenical' and CHECK constraints mirroring the enums. data/calendar/README.md documents the base + patch composition model and the editorial workflow for adding a new jurisdiction. No tradition toggle UI yet, surfacing a toggle that resolves to an empty patch would just confuse readers; the UI lights up when the first jurisdictional patch lands alongside its registry entry.",
 "Topical patristic & apologetics index. New /topics route with an index page and per-topic detail pages. lib/topics/topics.ts defines the Topic and TopicCitation shapes; each citation is a pointer into an existing data/saints/{slug}/{work}.json section, no patristic text is duplicated. The detail page resolves citations through the existing loadWriting() utility and renders pull-quotes in a 'Confessed by the Fathers' gold-rule section; the 'Refuted by the Fathers' rubric-red section only renders when its list is non-empty (no empty rubric columns). One starter topic ships ('The Incarnation', five citations from Athanasius, the Johannine Prologue, Cyril of Alexandria, and Irenaeus); data/topics/_schema.md documents the editorial workflow and the reverence guardrails.",
 "i18n Phase 1 scaffolding. lib/i18n/locales.ts holds the typed LocaleCode union (en | es | el | ru), the LOCALES registry with ready flags and status notes, DEFAULT_LOCALE, resolveLocale(), negotiateFromAcceptLanguage(), and isLocaleReady(). lib/i18n/index.ts provides server-only getMessages() and t(). lib/i18n/messages/en.json ships a starter ~25-key catalog covering nav, common buttons, the calendar reckoning labels, and the footer doxology; the other three locales ship as empty objects until the editorial translation work begins. docs/i18n.md documents the four-phase roadmap, what ships in v6.4, the contributor workflow for extracting strings, and the open governance question about translation labor. The App Router locale segment restructure is deferred to Phase 2, a separate, focused session.",
 "PRD persisted at docs/prd/v6.4-community-feedback.md so future contributors can find the architectural decisions behind these landings without trawling chat logs. Founds the docs/prd/ folder.",
 "Footer + home hero chip + /whats-new chip step to v6.4.",
 ],
 },
 {
 version: "v6.3",
 kind: "Auth hardened, hero rebuilt",
 date: "May 26, 2026",
 blurb:
 "v6.2 shipped the password and OAuth system; v6.3 is the cleanup pass that makes it usable in production. Legacy magic-link users can now set a password from Security without being asked for a current password they never had. Google OAuth errors translate to concrete next-steps instead of raw Supabase strings, and provider errors surface on /signin in a red banner instead of redirecting silently. Apple is marked 'Coming soon' honestly (the Apple Developer account isn't provisioned yet). The Unlink action on Security is now a visible red pill with a confirm guard so a misclick can't silently drop the connection. The home page hero also gets two cleanups: the Pantocrator portrait was swapped for the three-bar Purify cross logo (the mark people see on the install screen, manifest, and elsewhere), and the intro animation was reworked from fade-with-extra-steps into a plainer empty halo → crimson drop → fade-in. Plus one layout fix so the bottom row of 'What we are made of' no longer falls behind the snap-scroller.",
 items: [
 "Set-a-password mode on Security for legacy magic-link users. The card now reads `profiles.has_password` server-side and branches: if false, it renders 'Set a password' (new + confirm only, gold-tinted callout explaining why) and calls updateUser + mark_password_set; if true, it renders the usual 'Change password' with current-password re-verification.",
 "Forgot-password path explicitly named in the wrong-password error on /signin: 'use Forgot password? below to set one.' The /forgot → /reset flow already worked for accounts without a current password (Supabase resetPasswordForEmail issues a recovery token; ResetForm calls updateUser({ password })), it just wasn't named.",
 "Apple sign-in, sign-up, and Connect-Google buttons all marked 'Coming soon' since the Apple Developer account isn't provisioned yet. The buttons are visibly dimmed with aria-disabled and cursor-not-allowed; the layout stays two-up so the row reads as a deliberate pair instead of a hole. Two-line restore when the Developer account is ready.",
 "OAuth provider errors surface on /signin in a red banner. /api/auth/callback now handles ?code (success), ?error (provider cancelled / misconfigured), and the no-code fallthrough, redirecting failures to /signin?error=<msg> with a visible message instead of a silent landing on /account.",
 "Google 'identity_already_exists' / 'access_denied' / 'redirect_uri' / 'manual linking is disabled' all translate to concrete next-steps in the Connect Google flow and on /signin, instead of relaying raw Supabase text. 'That Google account is already linked to a Purify account. Click Continue with Google on /signin and Supabase will recognize the existing link and let you in.'",
 "Unlink action on Security promoted from a faded text-link to a proper red-outlined pill (cinnabar border on a low-opacity tint) with a confirm() guard. Now visually matches the Sign-out-everywhere card's destructive treatment so the two destructive controls read as a deliberate pair.",
 "Hero icon swap. The right column on the home hero now renders the Purify three-bar cross logo instead of the Pantocrator portrait. Same blood-drop intro, gold halo, pointer-tilt, and cursor-glint still apply; only the image src moved (and the file moved from public/public/ to public/ root so it serves at /purify-logo.jpg).",
 "Hero intro animation reworked. Replaces the mask-bloom reveal with a plainer sequence: 0s empty halo and crimson drop falling; ~1s drop lands, thin splash ring, crimson wash blooms, icon begins fading in; 1.8s icon fully visible, wash settles to ambient glow. Same total length, motion-reduce still respected.",
 "MadeOfStrip layout fix. The home page SectionScroller intercepts wheel events and snaps to each top-level main > section, blocking internal scrolling. MadeOfStrip was taller than 100dvh on most desktop displays, so the sixth tile ('No tracking. No advertising. Optional account.') was clipped at the bottom and unreachable. Now adopts the same sectionBase shape the other home sections use (snap-start + md:[min-height:100dvh] + flex items-center, with navbar offset baked in), with tighter vertical rhythm so all six tiles plus the header fit comfortably under 100dvh.",
 "Footer + home-page chip + /whats-new chip step to v6.3.",
 ],
 },
 {
 version: "v6.2",
 kind: "A real account system",
 date: "May 26, 2026",
 blurb:
 "Sign in with email and a password instead of a magic-link. Continue with Google or Apple if you'd rather. Change your password from the new Security tab, change your email with a confirmation step, sign out everywhere with one click. The account page is now a tabbed dashboard, Profile / Security / Data / Sessions, so the things you might want to manage are actually findable. Existing magic-link users are walked through setting a password the first time they sign in; no other changes to their data.",
 items: [
 "Email and password sign-up at /signup, sign-in at /signin. The old one-tap magic-link flow is retired.",
 "Continue with Google and Continue with Apple on both /signin and /signup. The buttons are wired; each provider needs to be configured once in the Supabase dashboard before it works (see docs/auth-setup.md).",
 "Forgot-password flow at /forgot. We send a reset link; it lands on /reset where you pick a new password.",
 "Change password from the new Security tab. We re-verify your current password first so a stolen session can't silently rotate it.",
 "Change email from Security; we send a confirmation link to the new address before the change takes effect.",
 "Connect or disconnect Google / Apple from Security at any time, even after sign-up.",
 "Sign out everywhere with one click from Security. Useful if you signed in on a device you no longer have.",
 "Existing magic-link users are prompted to set a password the first time they sign in after this release. Everything else about their account stays the same.",
 "The signed-in /account page is now a tabbed dashboard: Profile, Security, Data, Sessions. The four old long-scroll sections are mapped one-for-one.",
 "Middleware enforces the auth gate server-side (the redirect happens before any page shell paints) so unsigned users hitting /account/* land on /signin with a return path.",
 "New supabase migration adds profiles.has_password and a mark_password_set RPC the client calls when the password is set or rotated.",
 "New docs/auth-setup.md walks the maintainer through the Google + Apple + Supabase configuration steps.",
 "Footer + home-page chip step to v6.2.",
 ],
 },
 {
 version: "v6.1",
 kind: "The app on your phone, and a clearer account choice",
 date: "May 25, 2026",
 blurb:
 "Two things this release. First, Purify now behaves like an actual app on your phone: a persistent bottom tab bar (Today, Bible, Discover, Prayers, You), a Today hero with the day's saint and fast, a real chapter picker for the Bible reader, a top bar with back-button and font controls on every reader, and a proper PWA so you can add Purify to your home screen and keep reading on a bad signal. Desktop stays exactly as it was. Second, the account question is now named plainly: when you open /account you pick one of two real paths, a local profile that keeps everything in your browser, or a public account that syncs across devices via a one-tap email magic-link. Neither is the default, both are free, both are reversible. Along the way the saint-works reader got the same mobile chrome the Bible reader has had (top bar, section pill, full TOC sheet, font controls), and the council canons got a round of OCR cleanup: eleven artifacts fixed across Nicaea, Constantinople I, Ephesus, and Chalcedon (running-header injections, mangled Greek, footnote bleed). Closer to the version of Purify that opens like a prayer book and not like a website.",
 items: [
 "Mobile app-shell. A five-tab bottom bar on phones (Today, Bible, Discover, Prayers, You) replaces the old hamburger dropdown; the desktop AppNav is unchanged. The shell sits above the iOS home indicator on notched phones, and never clips the last verse of a chapter.",
 "New /discover surface with eight category tiles (Saints, Councils, Calendar, Fasts, Daily readings, The Psalter, Patristic commentary, Pascha), each in its own colour register so the grid reads as a deliberately-coloured set instead of a uniform card stack.",
 "Today mobile hero. A full-width tinted backdrop using the day's saint icon, the date, the headline commemoration, the fast chip, one CTA into the full prayer surface, a chip row of quick actions (Pray, Read, Discover, Saved, You), and a verse-of-the-day card that now actually pulls from the headline saint's first quote when one is available, falling back to St. Seraphim of Sarov.",
 "PWA. A typed manifest with home-screen shortcuts (Today, Bible, Discover) and maskable Android Adaptive Icon variants, plus a hand-rolled service worker with three caching strategies (NetworkFirst for HTML, StaleWhileRevalidate for /_next/static and saint icons, CacheFirst for the manifest), so the pages you have visited keep working on a bad signal. An install banner surfaces after three visits, steps aside when a sheet or toolbar is open, and gives iOS Safari the right Add-to-Home-Screen hint.",
 "Bible reader mobile chrome. A 48px top bar with back to /bible, the book and chapter as the title, and a trailing icon cluster (bookmark stub, settings). Settings opens font-family + font-size controls in a bottom sheet. The chapter pill now sits above the tab bar with prev/next arrows and a real book-chapter picker sheet (two-step: testament toggle, then a grid of chapter numbers). The verse long-press toolbar finally floats above the tab bar instead of behind it.",
 "Saint-works reader mobile chrome. Previously bare; now matches the Bible reader. Top bar with back to the saint profile, a floating Section N of M pill that tracks your scroll position via an IntersectionObserver, a full table-of-contents sheet behind a tap, and the same font-family + font-size controls as the Bible reader, persisted to the same localStorage keys so a choice carries between Scripture and the Fathers. A 2px gold scroll-progress bar at the top of the page.",
 "Shared Sheet primitive in components/ui/Sheet.tsx, extracted from the bespoke MobileCommentarySheet pattern: grab handle, body-scroll lock, two-phase mount for the slide animation, backdrop tap, Escape key, and a tiny lib/ui/overlay.ts flag so the install banner steps aside whenever a sheet or toolbar is up.",
 "Safe-area plumbing. viewport-fit=cover on the root, --tab-bar-h CSS variable in :root, and two new utilities (safe-pb and safe-pb-reader) so any scroll container that sits behind the bottom tab bar (and the floating reader pill) leaves the right amount of room above the iOS home indicator. No more last verse hiding behind the chapter pill.",
 "Tab-bar icons reworked at strokeWidth 2.2 (heavier, more legible at 22px), with a soft gold halo behind the active tab so the row reads as filled. Five new custom SVGs (Sun, Book, Compass, Hands, User) following the existing Cross / Halo / Wheat pattern. No lucide-react.",
 "Today greeting. When you are signed in, a quiet hour-aware greeting appears above the date eyebrow (\"Good morning, Edgar\" / \"Good evening, Edgar\"), pulling your display name from the profiles row server-side. Silent and unsigned-out otherwise.",
 "Council canons cleanup. Eleven OCR artifacts fixed across all four currently-shipped Ecumenical Councils. Nicaea XII and XIII got trimmed of trailing two-column NOTES bleed and obvious typos (\"lie must\" → \"he must\", \"re* ceived\" → \"received\"). Constantinople I, Canon II had an \"I. CONSTANTINOPLE. A.D. 381\" page header injected mid-sentence between \"that the\" and \"synod\"; removed. Ephesus VIII body had \"1 Labbe and Copsart, Tom. v.. col. 455. ... EPHESUS. A.D. 431\" bleeding through; removed. Chalcedon XII (atCHALCEDON. A.D. 451 tempted → attempted), XIV (trailing CHALCEDON. A.D. 451), XXIII (CHALCEDON. A.D. 451 mid-sentence), and XXVIII (a 2,500-character NOTE-bleed including mangled Greek \"■n-poiBpia ... -n-poa-Tacria\" for πρεσβεῖα / προστασία) all trimmed. Canon XXVIII's notes section needs a re-fetch from a cleaner Wikisource source to restore the Bright / Van Espen / Tillemont commentary; flagged as a follow-up.",
 "Dual local-or-public account choice on /account. When you open the page signed out, you see two side-by-side cards. A local profile keeps highlights, notes, bookmarks, your prayer streak, and reader prefs in your browser only, with no server-side row. A public account stores the same items in our Supabase database so they sync across devices, with a one-tap email magic-link (no password). Both options name their trade-offs honestly. Both are reversible. /about and /privacy were rewritten to reflect the two-track model and now link to /account from inside the relevant sentences.",
 "Footer + home-page chip step to v6.1.",
 ],
 },
 {
 version: "v6.0",
 kind: "A major release: the Councils, at last",
 date: "May 24, 2026",
 blurb:
 "If you are new here, welcome. v6.0 is a major release, the largest content step Purify has taken since v5.0 and the one that brings the Councils section to a place where it can stand on its own. Four of the Seven Ecumenical Councils now live in the corpus, each with a full historical profile, principal Fathers cross-linked to their saint pages, principal opposing parties named honestly, and the conciliar documents themselves readable in full. Nicaea (325) and Constantinople (381) ship complete: Creed, Synodal Letter, and Canons for each. Ephesus (431) and Chalcedon (451) ship with their canons; their dogmatic Definitions are the next workstream. Twelve new saints joined the registry along the way (every named principal Father of the first two councils, plus St. Gregory Palamas). The em-dash is gone from the project's editorial prose. The marketing nav on the home page now actually links to the Councils section. The site reads, for the first time, as it was meant to read: the Faith confessed by the Fathers in council, with every link traceable to a public-domain primary source.",
 items: [
 "Four Ecumenical Councils now in the corpus, where v5.7 had only the foundation and v5.8 had only Nicaea. Each carries a six-paragraph historical narrative, what the Council defined, what it condemned, the principal Holy Fathers (cross-linked to /saints where present in the registry), and the principal opposing parties named honestly.",
 "Nicaea I (325) ships complete: The Symbol of the Faith with the anathemas, The Synodal Letter to the Church of Alexandria, and The Twenty Canons in full. Source: Schaff & Wace NPNF Vol. 14 (1900), public domain, via Wikisource and the archive.org plain-text OCR.",
 "Constantinople I (381) ships complete: The Niceno-Constantinopolitan Creed (the Creed you recite at every Divine Liturgy) together with the related baptismal creed of St. Epiphanius's Ancoratus, The Synodical Letter to Pope Damasus and the West, The Letter to the Emperor Theodosius, and The Seven Canons in full.",
 "Ephesus (431) opens with The Eight Canons in full, plus the full historical profile from the Antiochene exegetical tradition through Nestorius's refusal of the Theotokos, St. Cyril of Alexandria's letters, the Council itself with the famous Ephesian procession (\"Praised be the Theotokos\"), and the Formula of Reunion of 433. Cyril's Second and Third Letters to Nestorius, the Twelve Anathemas, and the Formula of Reunion are flagged as pending.",
 "Chalcedon (451) opens with The Thirty Canons in full, plus the full historical profile from the Eutychian controversy through the Robber Council of 449, the death of St. Flavian, the accession of St. Marcian and St. Pulcheria, the Council itself with the famous acclamation \"Peter has spoken through Leo,\" the dispute over Canon XXVIII, and the post-Chalcedonian Oriental Orthodox separation. The Definition of Faith itself and the Tome of Pope Leo are flagged as pending. On the Oriental Orthodox question Purify takes the principled silence already set out on /about: where the Fathers spoke with one voice, we serve their text; where later traditions differ on the reception, we name the difference, surface the standard Eastern Orthodox position, and direct the reader to their priest.",
 "Twelve new saints in the registry. From the first two Councils: St. Constantine the Great, St. Alexander of Alexandria, St. Hosius of Cordova, St. Eustathius of Antioch, St. Spyridon of Trimythous (with his demonstration of the Trinity at Nicaea), St. Theodosius the Great, St. Meletius of Antioch, St. Cyril of Jerusalem, St. Nectarius of Constantinople, St. Diodore of Tarsus, and St. Epiphanius of Salamis. Plus St. Gregory Palamas, the Archbishop of Thessaloniki and defender of hesychasm, with The Holy Hesychast (the Hagioritic Tome of 1340 in PD English plus a guided summary of the Triads). Each new saint has a full life, a first work, a feast-day entry in the calendar, and an icon on the profile.",
 "The Twenty Canons of Nicaea and the Seven Canons of Constantinople I were unblockable from this sandbox's network for a while (Wikisource hosts the canons-index pages but not the per-canon text; CCEL and New Advent are DNS-unreachable from the build environment). The eventual path: open the archive.org plain-text OCR of NPNF Vol. 14 in a real browser, copy the canons section, drop it into a project file, parse with a small extractor that handles the OCR's word-spacing, hyphenated line breaks, and Roman-numeral garbles (\"xni\" for \"xiii\", \"in\" for \"III\", \"n\" for \"II\"). The same parser carried all four Councils' canons through.",
 "Em-dashes removed from every line of project-authored prose: pages, registry bios, plan files, audit docs, release notes, all editorial fields in JSON content. The 28 em-dashes inside verbatim public-domain source paragraphs (NPNF/ANF translators 1885-1900) are deliberately preserved per the verbatim-source rule in CONTRIBUTING.md.",
 "Bug fix: the marketing Navbar on the home page never had a link to the Councils section, because the link had only been wired into AppNav (the in-app navigation). The home-page nav now matches.",
 "Calendar: feast-day entries with slug-links to the saint profiles for every council Father added (May 21 Constantine, May 29 Alexander, Aug 27 Hosius, Feb 21 Eustathius, Dec 12 Spyridon, Jan 17 Theodosius, Feb 12 Meletius, Mar 18 Cyril of Jerusalem, Oct 11 Nectarius, Oct 22 Diodore, May 12 Epiphanius, Nov 14 Palamas). Plus the conciliar feasts themselves: July 9 (Holy Fathers of Ephesus), July 16 (Holy Fathers of Chalcedon).",
 "Icons resolve cleanly across every new entry: real images for every council Father and for Palamas, with several arriving as drops that the build pass renamed from informal upload filenames to the slug-form paths the registry expects.",
 "SAINTS-AUDIT.md updated: per-council priority queue reflects all four councils now in the corpus; the remaining three (Constantinople II 553, Constantinople III 680-681, Second Nicaea 787) named with their priority documents.",
 "Footer + home banner + /whats-new chip step to v6.0.",
 ],
 },
 {
 version: "v5.9",
 kind: "Nicaea refined, Constantinople opened",
 date: "May 23, 2026",
 blurb:
 "Two pieces this evening. First, an honest audit of the First Council page surfaced seven refinements, all landed: the symbolic number of the 318 Fathers is now named with both the historical count (about 250, per Eusebius's Vita Constantini) and the Genesis 14:14 typology the Fathers themselves read into the number; St. Hosius's presidency is softened from a flat claim to the more accurate description of him as the elder of the West who signs first in the subscriptions, with St. Eustathius of Antioch named as the giver of the opening oration in the Eastern tradition; St. Spyridon's demonstration of the Trinity is now told plainly (the brick, the fire upward, the water downward, the clay in his palm); the two bishops deposed with Arius are named (Secundus of Ptolemais and Theonas of Marmarica); the homoousios gloss is updated to the modern liturgical rendering (consubstantial) with the older Hapgood rendering noted alongside; and a Pending section now appears on the council profile so readers know the Twenty Canons of Nicaea are coming once a clean public-domain source is wired. Second, the Second Ecumenical Council opens: Constantinople 381, the council of the 150 Holy Fathers under St. Theodosius the Great, which gave the Church the Creed she still recites at every Divine Liturgy. Three documents in full: the Niceno-Constantinopolitan Creed itself (with the related baptismal Creed of fourth-century Salamis preserved by St. Epiphanius), the Synodical Letter to Pope Damasus and the Western bishops written the following year, and the short Letter to the Emperor Theodosius requesting imperial ratification.",
 items: [
 "Nicaea I refinement: the historical note on the 318 Holy Fathers is updated with Eusebius's count of about 250 actual attendees and the patristic typological reading of the number (Genesis 14:14, Abraham's 318 trained servants, read by the Fathers as a type of the Faith carrying the Church through Christ).",
 "Nicaea I refinement: St. Hosius of Cordova is now described as the elder of the West and the emperor's confidant who signs first in the subscriptions, with St. Eustathius of Antioch added to the principal Fathers as the giver of the opening address to the Council in the Eastern tradition. The flat claim that Hosius \"presided\" is softened to reflect that the question of presidency at Nicaea is genuinely contested.",
 "Nicaea I refinement: St. Spyridon's demonstration of the Holy Trinity to the assembled Fathers is now told in its received form: the brick taken into his hand, the sign of the Cross, the fire upward, the water downward, the clay remaining in his palm. Three natures held in one substance.",
 "Nicaea I refinement: the two bishops who refused to subscribe the Creed with Arius (Secundus of Ptolemais and Theonas of Marmarica) are now named in the historical narrative, cross-referencing the names that already appear in the Synodal Letter.",
 "Nicaea I refinement: the gloss on ὁμοούσιος is updated from the older \"of one essence\" to the modern liturgical \"consubstantial,\" with both renderings noted (Hapgood tradition vs. current English liturgical use).",
 "Nicaea I refinement: the Symbol document's framing of the Eusebian Creed (section 3) is rewritten to acknowledge that the standard modern reading sees Eusebius's letter to his diocese as apologetic, and that the Fathers did not so much adopt his creed as look past it.",
 "New schema field on Council registry: `pendingDocuments`. Surfaces on the council profile page as a faint \"Pending\" section beneath the readable documents, listing documents that belong to the council but are not yet wired. Used immediately on Nicaea I (the Twenty Canons) and Constantinople I (the Seven Canons).",
 "The Second Ecumenical Council (Constantinople 381) added: full historical narrative from the long Arian struggle of the post-Nicene fifty years through the rise of the Pneumatomachi and the work of the Cappadocians; the 150 Holy Fathers; the brief presidency of St. Gregory the Theologian and his withdrawal in self-sparing humility; the principal Fathers (Gregory the Theologian, Gregory of Nyssa, Meletius of Antioch, Cyril of Jerusalem, Nectarius, Diodore of Tarsus) cross-linked to the saint profiles where present in the registry; and the principal opposing parties named honestly (the Pneumatomachi, Apollinaris, Eunomius).",
 "Constantinople I document: The Niceno-Constantinopolitan Creed in full, in three sections (framing + the Holy Creed as ratified by the 150 Fathers + the closely related Salaminian baptismal Creed of St. Epiphanius's Ancoratus 120 from 374, the scholarly witness to a prior liturgical use the Council ratified). With editorial notes on the Filioque (not in the original Greek), the \"whose kingdom shall have no end\" anti-Marcellan addition, and the optional \"holy\" in the article on the Church.",
 "Constantinople I document: The Synodical Letter to Pope Damasus and the Western bishops at Rome (382), the Eastern bishops' summary of the Faith confessed at Constantinople, the heresies condemned (Sabellius, the Eunomians, the Arians, the Pneumatomachi), and the canonical confirmation of the three new Eastern patriarchs (Nectarius of Constantinople, Flavian of Antioch, Cyril of Jerusalem).",
 "Constantinople I document: The short Letter to the Emperor Theodosius (381) requesting imperial ratification of the Council's decrees, with the editorial note on \"by the prayers of the Saints\" as one of the earliest formal conciliar witnesses to the Orthodox doctrine of the intercession of the saints.",
 "The Seven Canons of Constantinople I are pending the same content drop as the Twenty Canons of Nicaea (Wikisource hosts the canons-index but not the per-canon text; the Schaff & Wace edition on CCEL is currently unreachable from the build sandbox).",
 "SAINTS-AUDIT.md updated: per-council priority queue reflects Nicaea I and Constantinople I as the two councils now in the corpus.",
 "Footer + home banner + /whats-new chip step to v5.9.",
 ],
 },
 {
 version: "v5.8",
 kind: "The Councils, beginning at Nicaea",
 date: "May 23, 2026",
 blurb:
 "A new section opens on the site: /councils. It will hold the seven Ecumenical Councils of the Orthodox Church, between Nicaea in 325 and the Second Council of Nicaea in 787, with their Definitions, their Canons, the Holy Fathers principally associated with each, and the historical context that produced them. The foundation lands tonight with the First Council itself: the original Nicene Creed (the first half of the Creed every Orthodox Christian still recites at the Divine Liturgy), the Council's Synodal Letter to the Church of Alexandria announcing the deposition of Arius and the common Paschalion, the 318 Holy Fathers named in their roles, and the historical narrative from St. Constantine's summons to Athanasius's defense of the homoousios. The Twenty Canons of Nicaea are deferred to the next content drop while a clean public-domain source is wired up; the other six councils will land in sequence in the coming releases. On contested questions, notably the post-Chalcedonian separation of the Oriental Orthodox, the section observes the same principled silence /about already states: where the Fathers spoke with one voice, we serve their text; where later traditions differ on the reception of a council, we name the difference and direct the reader to their priest.",
 items: [
 "New section at /councils, index page listing the seven Ecumenical Councils, each as a card with its ordinal, year, location, and a short summary. Linked from the global app navigation alongside Bible, Prayers, Saints, and Calendar.",
 "New per-council profile page at /councils/[slug]: hero with the ordinal name and year and location, the presiding emperor and the traditional count of bishops, two-column lists of what the Council defined and what it condemned, a multi-paragraph historical narrative, the principal Holy Fathers (cross-linked to the saint profiles when present in the registry), the principal opposing parties named honestly, and the documents themselves listed as readable links.",
 "New document reader at /councils/[slug]/[document], the same reader register the saints' works use: breadcrumb, hero, source line, editorial framing where a section needs it, the conciliar text verbatim, and editorial marginalia for the right column.",
 "The First Ecumenical Council shipped: hero, historical narrative (St. Constantine's summons, the 318 Holy Fathers, Athanasius's role as a young deacon, the choice of ὁμοούσιος as the unyielding word), the principal Fathers (Athanasius, Alexander of Alexandria, Hosius of Cordova, Nicholas of Myra, Spyridon of Trimythous), and the principal opponents (Arius, Eusebius of Nicomedia) named with their teaching.",
 "Two documents for Nicaea I in full: The Symbol of the Faith (the original 325 Creed with the anathemas, plus the alternate Eusebian Creed that was presented and set aside) and The Synodal Letter to the Church of Alexandria (the Council's encyclical announcing the deposition of Arius, the Meletian settlement, and the common Paschalion). Both verbatim from Schaff &middot; Wace, NPNF Series II Vol. 14 (1900), public domain, via Wikisource.",
 "The Twenty Canons of Nicaea are deferred to the next content drop. Wikisource hosts the canons-index but not the per-canon text; CCEL and New Advent are unreachable from the build sandbox. A follow-up will fetch them from a clean source or hand-transcribe from an archive.org Schaff scan.",
 "The new /councils route is wired into the sitemap.xml for search-engine indexing alongside Bible, Saints, and Calendar.",
 "SAINTS-AUDIT.md is updated with a sister-workstream section detailing the per-council priority queue for the remaining six councils, with notes on the editorial care required at Chalcedon (the Oriental Orthodox separation) and the cross-link between Council III Constantinople and St. Maximus the Confessor.",
 "Footer + home banner + /whats-new chip step to v5.8.",
 ],
 },
 {
 version: "v5.7",
 kind: "The Apostolic Fathers, the whole way through",
 date: "May 23, 2026",
 blurb:
 "The largest patristic content burst yet. All seven authentic letters of St. Ignatius of Antioch are now present in full, in the public-domain Roberts-Donaldson translation, alongside the only writing of his fellow disciple of John, St. Polycarp's letter to the Philippians, and the eyewitness encyclical of the church of Smyrna that became the model for every Christian martyrology thereafter. St. Gregory of Nyssa's Great Catechism, one of the three or four most important systematic theological works of the Eastern fourth century, closes his zero-works gap in a single forty-chapter import. Three new saints join the registry: the Holy Archangel Michael, the great Captain of the Bodiless Hosts; St. Nektarios of Aegina, the most-loved modern Greek wonderworker; and St. Florian of Lorch, the Roman officer drowned with a millstone in 304, received in the East as a saint of the Undivided Church.",
 items: [
 "All seven authentic Ignatian epistles now read in full on his profile: to the Ephesians (22 sections), Magnesians (16), Trallians (14), Romans (11), Philadelphians (12), Smyrnaeans (14), and to Polycarp (9). The Eucharist as the medicine of immortality, the three mysteries wrought in silence by God, \"Lay hold, handle me, and see that I am not an incorporeal spirit\", all in place. Roberts-Donaldson translation, ANF Vol. 1 (1885), public domain.",
 "Polycarp of Smyrna's primary corpus complete on the PD side: his short letter to the Philippians (15 sections), the only writing to come down to us from his hand, and The Martyrdom of Polycarp (23 sections), the earliest surviving Christian martyrology, written by the church of Smyrna to the church of Philomelium within a year of the events. Contains the famous \"Eighty and six years have I served Him\" before the proconsul, the prayer at the pyre, and the first known use of the word \"birthday\" for a martyr's day of death.",
 "St. Gregory of Nyssa's The Great Catechism added in full: the framing intro plus the Prologue and all forty chapters of his catechist's notebook on Trinity, Incarnation, Atonement, and Sacraments. Closes a zero-works gap on one of the great Cappadocian Fathers. Around 120 KB of primary text from NPNF Series II, Vol. 5 (Schaff and Wace, 1893), assembled from the per-chapter Wikisource transcriptions.",
 "The Holy Archangel Michael added to the registry with a full life from Daniel, Jude, and the Apocalypse, the November 8 Synaxis, and the September 6 Miracle at Chonae. First work: Hymns to the Bodiless Hosts (the Apolytikion, Kontakion, Megalynalia, and Theotokion appointed for the Synaxis, in the public-domain English of Hapgood's 1906 Service Book).",
 "St. Nektarios of Aegina added with a full life from his birth at Selybria in 1846 through his unjust deposition from Pentapolis, his fifteen years as director of the Rizareios School, and the long illness that ended on the night of November 8/9, 1920. First work: Apolytikion and the Rule of Life, the festal hymns authorized at his 1961 glorification together with the short Rule he gave the sisters of the Holy Trinity Monastery on Aegina.",
 "St. Florian of Lorch added as a pre-Schism Western martyr received in the East: the Roman officer in Noricum who left his post to stand with the imprisoned Christian soldiers at Lauriacum, was scourged and drowned with a millstone in the river Enns in 304. Venerated in the Polish Autocephalous Orthodox Church and other Slavic Orthodox jurisdictions among the saints of the Undivided Church. First work: The Passion of St. Florian, drawn from the Acta Sanctorum and the long PD English tradition.",
 "Calendar wired: November 8 (Synaxis of the Archangel), September 6 (Miracle at Chonae), and November 9 (St. Nektarios) now deep-link from their commemoration entries straight into the new registry profiles. May 4 gains a new entry for St. Florian alongside the existing commemorations of Pelagia of Tarsus, Silvanus, and Hilary.",
 "Footer + home banner + /whats-new chip step to v5.7.",
 ],
 },
 {
 version: "v5.6",
 kind: "Credibility, the floor under the work",
 date: "May 23, 2026",
 blurb:
 "A quiet release that wouldn't be worth a chip on the home page if it weren't the prerequisite for everything that follows. The first published privacy policy, audited line-by-line against the code that records page visits. A working Continuous Integration pipeline that runs every lint rule, every type check, every Pascha-date assertion, every end-to-end smoke test, every accessibility check, and every Lighthouse performance budget on every push to the main branch. A real architecture document a new contributor can read in fifteen minutes. A contributor's guide that affirms every saint biography is editorially written and every line of patristic text is traceable to a public-domain edition. A page-long honest audit of the whole site on a ten-criterion rubric, in the repo, for anyone who cares to read it. The site is not measurably more beautiful after this release. It is measurably more serious.",
 items: [
 "A new /privacy page: ten claims about what Purify records, what it keeps, and for how long, each one cross-checked against the actual code path in app/api/track/route.ts and lib/analytics/geo.ts. No third-party trackers anywhere on the site: no Google Analytics, no Meta Pixel, no Sentry tied to user identity, no PostHog, no Mixpanel, no Amplitude.",
 "A curated list of training and indexing crawlers disallowed in robots.txt. The privacy page names each one by its public user-agent so readers can verify the block themselves.",
 "A 90-day analytics retention window: the prune statement, the pg_cron schedule, the verification queries, and an activation log file in the repo where the operator who runs the cron in the production Supabase console drops in the proof. The privacy page only promises 90 days because the policy is written, not aspirational.",
 "End-to-end test suite using Playwright with axe-core accessibility assertions on every rendered page: seven smoke specs covering the home page, the Bible reader, today's prayer rule, the calendar with deep-linked dates, a saint profile and work, the four meta pages (about, what's new, privacy, support), and the signed-out account page.",
 "Lighthouse CI configured against four representative URLs with strict thresholds: Accessibility at 95 (error), Performance at 85, Best Practices at 95, SEO at 95, every page on the deploy preview must clear all four to ship.",
 "A GitHub Actions workflow that runs on every push and pull request: install, lint, typecheck, Vitest unit tests, full Next.js build, Playwright browser install, smoke suite + axe, Lighthouse CI. CI is now what gates a green deploy, not the operator's memory.",
 "ARCHITECTURE.md: a one-page mapping a new contributor can read in fifteen minutes covering the stack (Next 16 App Router, React 19, Tailwind v4, Supabase, Render), every major route segment with its purpose, the four data layers, the rendering strategy (SSG for Bible chapters and saints, ISR for the home and calendar), and the build and deploy story.",
 "CONTRIBUTING.md: the ethos, the local setup, the dev loop, the branch and PR flow, and the strict content rules: scripture and Fathers must be public-domain or licensed with a citation; saint biographies are drawn from established hagiographies and editorially written; prayers are the common Jordanville, St. Tikhon's, or Hapgood wording; icons are Wikimedia Commons public-domain with the iconographer attributed where known.",
 "AUDIT.md at the repository root: a public ten-criterion rubric (content depth, source transparency, UX polish, performance, privacy and compliance, tests, architecture documentation, contributor posture, distinctiveness, accessibility) plus a five-criterion clergy-vetter lens (doctrinal precision, liturgical accuracy, tone and voice, language register, citation density on contested topics) applied to the whole site, scored honestly. SAINTS-AUDIT.md adds a per-saint gap map across all 47 registry entries against the realistic public-domain ceiling.",
 "ESLint plugin jsx-a11y wired into the project's flat config (with a small Next 16 workaround for the redefined-plugin error), and every resulting violation either fixed in code or suppressed with a justifying comment.",
 "A new section on /about, On contested questions: a single paragraph stating that Purify does not adjudicate questions the canonical Orthodox jurisdictions answer differently, calendar reckoning, fasting typikon, jurisdictional primacy, inter-confessional polemics, and that the silence is principled, not avoidant. Where you need a judgment, ask a priest.",
 "Vitest infrastructure plus a unit test file covering the Pascha algorithm in lib/calendar/orthodox.ts: orthodoxPascha verified against canonical published dates for 2024 through 2030, fastingStatus checked on Holy Friday, Bright Monday, and an ordinary-time Wednesday, paschaInfo countdown and roll-over both asserted. Thirteen assertions; previously zero coverage on the highest-stakes math in the codebase.",
 "Three account-dashboard components (ProfileActivity, ProfileSettings, ProfileSyncStatus) converted from a hydrate-in-effect useState/useEffect pattern to useSyncExternalStore, the React 19 recommended path for localStorage subscriptions, and the reason CI lint is now green.",
 "The calendar-style preference hook split into a client-only module (lib/calendar/useCalendarStyleDefault.ts) so that the server-rendered calendar page can still import the cookie-reading helpers from styleDefault.ts without tripping the Next 16 \"useSyncExternalStore in a server component\" error.",
 "Footer + home banner + /whats-new chip step to v5.6 (then immediately to v5.7 for the saints content burst that landed alongside).",
 ],
 },
 {
 version: "v5.5",
 kind: "The full company of the Twelve",
 date: "May 23, 2026",
 blurb:
 "A long pass through the saints registry. The Twelve are now complete, all eleven who walked with the Lord plus Matthias chosen by lot, each with a profile, a deep-linked work, and an icon image. To them are added the great Equal-to-the-Apostles Mary Magdalene, the Russian elder Paisios the Athonite, and the four firmly-attested direct successors of the apostolic generation, Anianus of Alexandria (Mark's successor) and Polycarp, Papias, and Prochorus (the three disciples of John the Theologian). Every profile now supports a new 'Disciples and successors' section that makes the chain of tradition visible, with the John -> Polycarp -> Irenaeus line wired across three linked profiles. Plus a small bug fix on the Account button in the app shell, a hero rebuild on the home page, and a quieter landing.",
 items: [
 "The Twelve, complete: Andrew the First-Called, James son of Zebedee, Philip, Bartholomew (Nathanael), James son of Alphaeus, Jude/Thaddaeus, Simon the Zealot, and Matthias join Peter, John, Matthew, and Thomas with full Saint entries, deep-linked quotes, and one work file each combining KJV passages with editorial framing.",
 "Mary Magdalene added as Equal-to-the-Apostles and Myrrhbearer, with the four-section work 'The Myrrhbearer at the Tomb' covering Luke 8, John 19, the encounter in the garden, and the tradition of the Paschal egg.",
 "St. Paisios the Athonite (1924-1994, canonized 2015) added with two works: 'Spiritual Counsels' (five-section selection) and 'Epistles' (three-section selection from his letters).",
 "Four direct successors of the apostolic generation added: Anianus of Alexandria (the cobbler whose hand St. Mark healed, second bishop of Alexandria), Polycarp of Smyrna (the eighty-six-year servant burned and stabbed in the stadium), Papias of Hierapolis (the earliest external witness to the writing of Matthew and Mark), and Prochorus the Deacon (scribe of John on Patmos).",
 "St. Ignatius of Antioch's entry rewritten to make his discipleship under John explicit: new byname 'Theophorus, Disciple of John', expanded life paragraph alongside Polycarp, and a quote from his Epistle to the Romans.",
 "New 'Disciples and successors' section on saint profiles. New `Saint.disciples` field with `{ slug, relation, blurb }` entries, a new `DisciplesSection.tsx` component (styled to match the existing Great Feasts cards), and integration into the saint profile page. The chain John -> Polycarp -> Irenaeus is now navigable across three linked profiles.",
 "Eighteen icon images wired across the new entries (apostles, Magdalene, Paisios, the four successors). Files renamed where needed to the `apostle-<slug>.jpg` and `<slug>.jpg` conventions, and matching author-name mappings added to `lib/saints/icons.ts` so commentary cards that cite these saints also pick up the icon.",
 "Refreshed icons for Gregory the Theologian, Ignatius of Antioch, and Nicholas the Wonderworker.",
 "Bug fix in `AppNav`: the Account button was rendering an invisible 36x36 placeholder span before the Supabase session check resolved, which made it look absent on every app page until hydration finished. The pre-hydration default is now the text 'Account' link; the gold initials avatar still upgrades in place once a signed-in session is confirmed.",
 "Home page hero rebuilt. The harsh black-to-white linear gradient is replaced with a quieter twilight-blue ambience (soft blue glow behind the heading, a deeper indigo settling toward the Today card, deep night base). The eyebrow tagline and the four-pillar list are dropped from the hero in favor of a tighter line of body copy. The four-tile Today strip and the Daily Wisdom block are removed from the landing.",
 "Footer + home banner + /whats-new chip step to v5.5.",
 ],
 },
 {
 version: "v5.4",
 kind: "Account, made real",
 date: "May 22, 2026",
 blurb:
 "The signed-in /account dashboard becomes a real reading-life dashboard. A gold-ringed initials avatar on the hero, prayer-rule streaks alongside the highlight counters, a recent-activity strip, a sync-status widget with a manual 'Sync now' and a last-synced timestamp, a Devices section that signs you out of all other devices in one tap, and a Reader Preferences panel that finally includes the interlinear default and the calendar reckoning. AppNav swaps the static 'Account' label for a small gold-ringed initials disc when signed in. /support adds a Bible translation licensing line so the funding goal reflects the cost of the live-fetched NKJV, NIV, and NLT translations.",
 items: [
 "ProfileHero gains a gold-ringed initials avatar (SaintIcon-style night gradient + display-serif initials) and a 'Last signed in' relative-time line under the email.",
 "ProfileStats grows a second tier: Morning rule streak, Evening rule streak, and 'Both rules, in a row' (read from localStorage prayer keys, refreshes on a new purify:prayer-streak event the PrayerRuleReader now dispatches).",
 "New ProfileActivity strip, three most-recent bookmarks as quick-jump links into their verse, chapter, or saint writing section. Empty-state copy when nothing is saved yet.",
 "New ProfileSyncStatus widget, last-sync timestamp ('just now', '12 min ago', 'Today 4:21pm'), a manual 'Sync now' button, and a red error badge when the last push/pull threw. SyncOnMount now records the timestamp and the error message so the widget has something to read.",
 "New ProfileDevices section, current-device card (parsed from window.navigator.userAgent) plus a 'Sign out of all other devices' action that POSTs to /api/auth/signout-others (wrapping supabase.auth.signOut({scope:'others'})).",
 "ProfileSettings now exposes the Interlinear-by-default toggle (writes the same localStorage key the in-reader pill uses) and a functional Calendar Reckoning radio (New / Old Julian, persisted to localStorage and mirrored into a cookie so the server-rendered /calendar page can read it without a flash of wrong content).",
 "Signed-out /account adds a small 'What syncs' card strip (highlights & notes / bookmarks / prayer streaks) and a single-line privacy reassurance under the form.",
 "AppNav: when a Supabase session exists the 'Account' link becomes a small gold-ringed initials disc; signed-out keeps the text label. Mobile menu still shows the text link.",
 "/support breakdown: new 'Bible translation licensing' line at $65/mo for the live-fetched modern translations (NKJV via Thomas Nelson, NIV via Biblica, NLT via Tyndale, delivered through the American Bible Society API.Bible). Monthly goal bumped from $300 to $375 to keep the 'leave some margin' copy honest.",
 "Footer + home banner + /whats-new chip step to v5.4.",
 ],
 },
 {
 version: "v5.3",
 kind: "The front door",
 date: "May 22, 2026",
 blurb:
 "Two small changes to the first thing people see. The home page no longer reads as a prayer app and nothing else, a live 'Today' rail now sits above the fold with the day's saint, the fast, a reading, and the count to Pascha; and the hero, features, and quick-jump links have all been rebalanced so Scripture, the saints, the calendar, and prayer stand together. And when someone pastes a Purify link into Discord or Slack, the preview now shows a real Purify card on the dark scroll background rather than a broken image from a domain we don't own.",
 items: [
 "A live 'Today' rail on the home page, the saint of the day with their icon, today's fast with its bespoke icon and liturgical colour, the day's appointed Gospel verse with a one-click jump into the reader, and the days to Pascha. ISR'd so it rolls forward each hour without a redeploy.",
 "The hero broadened from 'an Orthodox prayer companion' to the whole life of the Church, with a new headline ('The whole Orthodox life, in one quiet place.') and a quiet 'See today' link straight into the calendar.",
 "Four feature cards instead of three, one per pillar: Read with the Fathers, Lives of the saints, The Sacred Calendar, and Prayer that breathes. The eight quick-jump links underneath were rebalanced to match, two per pillar (the Gospel of John, the Psalter, the saints index, St. John Chrysostom, the calendar, Today, Morning prayers, the Jesus Prayer).",
 "The 'Where would you like to begin?' challenge cards finally point at the Bible too, 'Read the Gospel with Chrysostom' joins the path through Great Lent and the Jesus Prayer.",
 "Link previews fixed: shared URLs no longer pull a broken image from a domain we don't own. A clean Purify card (the three-bar Cross, the wordmark, 'Apostolic · Orthodox · Knowledge') is now the Open Graph image, and every absolute URL in our metadata resolves through the actual deployment URL automatically, with a defensive guard that refuses any 'purify.app' value entirely.",
 ],
 },
 {
 version: "v5.2",
 kind: "The calendar as a menologion",
 date: "May 22, 2026",
 blurb:
 "The /calendar page steps further out of the SaaS-dashboard idiom and into the typographic vocabulary of an actual Orthodox menologion. Cinnabar-red rubrics for feast saints and fasting rules, an illuminated drop cap on the saint of the day, a sharp ruled month grid with small saint faces on feast days, parchment-grain texture under the night background, season-aware page tinting (burgundy in Lent, marian blue in Dormition, paschal white-gold in Bright Week), a bilingual ΜΑΪΟΣ · MAY heading above the grid, a colophon at the foot, and a dual Gregorian / Julian date when the Old Calendar is selected.",
 items: [
 "Rubric red: a new --ink-rubric CSS variable (cinnabar 196·47·36) carries the day-of-month for feast cells, the saint name in the FeastPanel, and the fasting-rule label. Gold stays for page decoration only. Two-color liturgical printing.",
 "Illuminated initial: the saint's name in the FeastPanel now renders with a 2-line-tall display-serif drop cap in rubric red, underlined in gold (`components/calendar/DropCap.tsx`). Plain weekday pages without a Latin-letter saint name skip the drop cap.",
 "Dual Gregorian / Julian date when Old Calendar is selected: 'Saturday · May 22 / May 9, 2026'. Helper `formatLongDateDual(date, style)` in `lib/calendar/orthodox.ts`. A small italic note under the hero explains the dual format.",
 "Pascha countdown and the fasting rule lose their bordered-tablet chrome, replaced with thin gold hairlines and gold uppercase labels above the value. The whole hero now reads as one composed page rather than a card-with-card-inside.",
 "Month grid sharpened: rectangular cells (no rounded corners), thin gold hairline rules between cells (no gap), single thick gold outline around today (no tinted background). Feast cells render the day number in display-serif rubric red with a small saint icon in the upper-right when one is indexed; everything else stays quiet.",
 "Parchment-grain SVG noise layered into `.menaion-surface` at mix-blend-overlay 0.07 opacity. Invisible at a glance, present on inspection; the page stops feeling like a backlit OLED rectangle and starts feeling like ink on a panel.",
 "Page-level liturgical-season tinting via a new --season-tone variable: Great Lent burgundy, Holy Week deep violet, Bright Week paschal white-gold, Apostles' Fast olive, Dormition Fast marian blue, Nativity Fast indigo, Pre-Lent quiet ochre. Affects only the vignette overlay; body text stays paper.",
 "Bilingual headpiece above the month grid: a wider three-cross ornament SVG (`components/calendar/OrnamentHeadpiece.tsx`) sits above 'ΜΑΪΟΣ · 2026' in Greek capitals + the English display-serif month/year. Real-book headpiece, not a dashboard section divider.",
 "Colophon at the foot of the page (`components/calendar/Colophon.tsx`) replacing the bordered footnote: 'Glory to God for all things.' / a small gold cross / 'Through the prayers of our holy fathers…' in display-serif italic, with the Greek dismissal underneath.",
 "Old / New calendar toggle restyled as an inline kalendrium header, gold-underlined active label, dot separator, no pill chrome. New `lib/calendar/tone.ts` helpers `seasonTone(season)` and `calendarPageVars(tone, season)` cleanly set both `--tone` and `--season-tone` on the page wrapper.",
 "Footer version stamp + home chip + /whats-new chip step to v5.2.",
 ],
 },
 {
 version: "v5.1",
 kind: "The illuminated calendar",
 date: "May 22, 2026",
 blurb:
 "The calendar has been rebuilt from the ground up to look like what it is, a window onto the Church's year. The day of the feast now stands in an illuminated panel, the saint's icon lit within a halo of light; the month reads like an illuminated page, each day glowing in its own liturgical colour, gold for feasts, deep red for the strict fasts, green for the days of release. And every day of the year now carries its full company of saints.",
 items: [
 "A bold redesign of the whole calendar page in an Orthodox, 'hallowed' register: the ornate display serif for the feast names, gold ornament rules drawn around a three-bar Cross, and the saint of the day lit by a soft lampada glow.",
 "A bespoke icon set drawn for the calendar, a haloed disc, a vigil lamp, grapes, a fish, and a sheaf of wheat, now mark feasts and the fasting rule in place of plain coloured dots.",
 "Liturgical colour: the page quietly takes the tone of the day, gold on feasts and ordinary days, crimson on strict and fasting days, green when the fast is released. Colour is always paired with an icon and a word, never alone.",
 "The month grid was reimagined: today glows like a lit lamp, feasts carry a gold Cross, and each day shows its fast at a glance.",
 "Every day of the year now lists its full commemorations, more than six hundred saints and feasts across the calendar, where many days once named only one.",
 "All of it stays fast and faithful to the reckoning: the New and Old (Julian) calendars, the fasting rules, and the day's appointed readings are unchanged underneath.",
 ],
 },
 {
 version: "v5.0",
 kind: "A major release",
 date: "May 21, 2026",
 blurb:
 "v5.0 opens the Scriptures wider. You can now read the New Testament in the New King James, New International, or New Living translation, shown exactly as published; and on the public-domain text the Greek now sits word-for-word beside the English, each word linked to its original. St. Athanasius the Great's profile is complete, with six of his works readable in full. Whether you read in plain modern English or trace the Greek behind it, the Fathers are never far.",
 items: [
 "Three modern translations in the reader: the New King James (NKJV), New International (NIV), and New Living (NLT), fetched live and shown exactly as published, footnotes and all, with the publisher's copyright and a link, an API.Bible citation, and usage reporting, under the American Bible Society and Biblica license.",
 "A bidirectional Greek interlinear on the New Testament (public-domain KJV): hover an English word to light its matching Greek word, or hover the Greek to light the English, occurrence-aware so repeated words pair to the right one.",
 "The licensed translations are typeset with care: poetry set as verse, the words of Christ in red, the divine Name in small capitals, and footnotes and cross-references gathered into a tidy panel at the foot of the chapter rather than scattered through the text.",
 "Your reading font and size now apply to every translation, modern or ancient.",
 "St. Athanasius the Great's profile is now complete: a fuller life, eight sourced sayings, and six works readable in full, On the Incarnation, Against the Heathen, the Four Discourses Against the Arians, On the Nicene Definition, On the Councils, and his Life of Antony, which now also sits on St. Anthony the Great's page.",
 "The earlier pricing tier and commercial marketplace are removed in this release, leaving the surface focused on the prayers, the Scriptures, and the saints.",
 "Bible pages now ask third-party scrapers not to fetch the licensed Scriptures, and a private Live View dashboard lets the team see visits in real time without tying any of it to who is reading what.",
 "A careful quality pass under the hood: every linter warning cleared, the reader's highlights, notes, and bookmarks rebuilt on a steadier footing, and a copyrighted translation quietly replaced with its public-domain edition.",
 ],
 },
 {
 version: "v4.0",
 kind: "A major release, welcome",
 date: "May 20, 2026",
 blurb:
 "If you're just arriving: welcome, we're so glad you're here. v4.0 is the biggest step Purify has taken, a whole season of work gathered into one release. The Bible reader now carries St. John Chrysostom verse-by-verse through fourteen books of the New Testament; the Saints section has grown, gained a search bar, and added an 'In his own words' collection of quotations; and the whole app has been warmed and tidied so it feels less like software and more like a place to pray. Whether you've been here since the early days or opened Purify for the first time today, make yourself at home.",
 items: [
 "Patristic commentary across 14 New Testament books: over 2,000 verse-by-verse notes from St. John Chrysostom now sit beside Scripture in the study rail and the mobile sheet, covering John, Acts, Romans, 1 and 2 Corinthians, Ephesians, Philippians, Colossians, 1 and 2 Thessalonians, 1 and 2 Timothy, Titus, Philemon, and Hebrews.",
 "Seventeen of Chrysostom's works now read in full on his profile, including the complete homily series on Romans, Hebrews, the Corinthian letters, and the Pastoral Epistles, plus his Homilies on the Acts of the Apostles.",
 "'In his own words': a new quotations section on the saint profiles, drawn straight from the Fathers' writings, with each line linking back to the homily it comes from.",
 "Five new saints in the calendar of lives, each with a traditional Byzantine icon: St. Marina the Great-Martyr, St. Hermione of Ephesus, St. Isidora of Tabenna, St. Olympias the Deaconess, and St. Gregory of Nyssa.",
 "A search bar for the Saints section: start typing to jump straight to a saint or one of their writings.",
 "When one Father has several commentaries on a single verse, they now gather under his name, each kept as its own card so nothing runs together.",
 "A daily word, a verse of Scripture or a saying of the Fathers, now greets you on the home page; and a small gold mark shows at a glance which books of the Bible carry the Fathers' commentary.",
 "A gentler, more settled look throughout: a unified palette, a hand-drawn cross in place of stray symbols, clearer icons, and tidier typography across every page.",
 ],
 },
 {
 version: "v3.10",
 kind: "St. John Chrysostom's complete Homilies on John",
 date: "May 19, 2026",
 blurb:
 "The single largest body of patristic text in the app so far. St. John Chrysostom's eighty-eight Homilies on the Gospel of John, preached at Antioch around 391 and the longest patristic treatment of any New Testament book, are now imported in full from the public-domain Nicene and Post-Nicene Fathers (Series 1, Vol. 14, ed. Schaff). The complete homilies read on Chrysostom's work page, and the same text is split verse-by-verse into the Bible reader: open any chapter of John and Chrysostom's exposition now sits in the study rail (and the mobile commentary sheet) next to the verse he is preaching on, alongside the other Fathers already there.",
 items: [
 "All 88 homilies imported verbatim to /saints/john-chrysostom/homilies-on-john, the work is no longer a 2-section stub.",
 "Verse-by-verse commentary across all 21 chapters of John (579 Chrysostom notes), keyed to the verse each passage expounds via the homilies' own 'Ver. N' section markers.",
 "Merge-not-clobber: the existing notes from Augustine, Cyril, Gregory the Theologian, Athanasius, and Irenaeus are preserved; only the older placeholder Chrysostom summaries were replaced.",
 "New scripts/ingest-chrysostom-john.mjs parses the NPNF1-14 plaintext: slices the John block from the Hebrews homilies, strips footnote markers and paragraph bullets, rebuilds paragraphs, and emits both the work JSON and the per-chapter commentary JSON.",
 "Commentary cards (study rail + mobile sheet) now render multi-paragraph notes with proper paragraph breaks.",
 "Long-work performance: works with 20+ sections (like the 88 homilies) now render as an accordion, each homily's text mounts only when opened, so the page stays responsive on mobile. The table of contents opens and scrolls to any homily.",
 ],
 },
 {
 version: "v3.9",
 kind: "Mobile Bible reader, UI cleanup",
 date: "May 19, 2026",
 blurb:
 "Three mobile cleanups on the chapter page. (1) The control row above the search bar no longer wraps awkwardly, Translation and Book share row one, and the Interlinear pill and gear sit on a clean row two. (2) The five per-verse action buttons (highlight, copy, bookmark, note, clear-words) no longer crowd the verse text on mobile; they now live in a floating contextual toolbar that appears on a long-press of the verse, like the iOS contextual bar, and dismisses on outside-tap. (3) When Interlinear is on, the Greek now sits next to the English on mobile in two columns (where the action buttons used to be) instead of stacking below.",
 items: [
 "Header row reflow: Translation + Book switchers share the top row at flex-1; on mobile a second row carries the Interlinear pill (when NT) and the gear menu. No more flex-wrap jaggedness.",
 "Interlinear toggle un-buried: previously only reachable through the gear menu on mobile, now a first-class pill next to it.",
 "Per-verse desktop toolbar hidden on mobile (`hidden md:flex`); desktop hover-reveal behaviour is unchanged.",
 "New MobileVerseToolbar component: a pill-shaped floating action bar at the bottom of the viewport with highlight / clear-words / copy link / bookmark / note buttons, each h-11 w-11. Opens on long-press of the verse paragraph. Dismisses on outside tap, Escape, or after any action fires.",
 "Long-press gesture (added in v3.7) now opens the toolbar instead of entering a word-range select-mode. The v3.7 fix is preserved: a tap is a no-op, and a tap-then-scroll never commits a highlight.",
 "Word-level drag-to-highlight on touch is dropped, the popup's whole-verse highlight covers the primary mobile use case. Desktop mouse-drag highlighting is unchanged.",
 "Interlinear render: switched from `grid-cols-1 md:grid-cols-2` to `grid-cols-2 gap-x-3 md:gap-x-6` so English | Greek are side-by-side on every viewport when Interlinear is on.",
 "Stability fix: the Translation/Book switchers no longer stretch to equal widths (dropped the flex-1 wrappers), so they sit at their natural content width and don't shift around. The Reader gear button now reserves the space for its gold interlinear dot, so toggling interlinear no longer nudges the button.",
 ],
 },
 {
 version: "v3.8",
 kind: "Cleaner Koine ↔ English",
 date: "May 19, 2026",
 blurb:
 "When you hover a Greek word, the matching English word now lights up reliably across the whole New Testament. The kaiserlik/kjv public-domain source we use for the English Strong's tags has gaps on the trailing word of many verses (Matthew 1:1's 'Abraham.' was the canonical case the user surfaced, Ἀβραάμ in the Greek column was not lighting up the English 'Abraham' in v1, even though it worked perfectly in v2 and v17). v3.8 ships a recovery pass that back-fills the missing tags using already-tagged occurrences of the same word elsewhere in the chapter. 2,629 trailing-word Strong's numbers recovered.",
 items: [
 "New scripts/patch-english-strongs.mjs walks every NT chapter, builds a per-chapter map of normalized-word → Strong's from already-tagged tokens, and back-fills any untagged token whose normalized form has an unambiguous Strong's in the same chapter (one Strong's, or one Strong's accounting for ≥ 90% of ≥ 3 observations).",
 "Conservative recovery: a stopword list of about 80 English connectors ('of', 'the', 'and', 'to', 'in', 'for', 'is', 'was', 'his', 'her', and the rest) is skipped, these recur with too many different Strong's numbers (each translating a different Greek genitive or article) to disambiguate from surface form alone. Proper nouns and content words are the primary targets, where the recovery is high-confidence.",
 "NT-wide second pass: for capitalized untagged tokens whose chapter map is too thin (short books like 2 John, Philemon, Jude), an aggregated NT-wide map is consulted. Catches proper nouns that only appear once in their home chapter.",
 "Matthew 1:1: trailing 'Abraham.' now tags G11. Hover Ἀβραάμ in the Greek column and the English Abraham lights up. The same fix lands across the New Testament, Babylon: in Matt 1:11, Aram; in Matt 1:3, wife: in Matt 1:24, God, at the close of several Romans 1 verses, and many more.",
 "Patch results: 2,629 tokens recovered across 259 NT chapters. Matthew +434, Luke +399, Acts +403, John +363, Mark +238, Romans +194, Revelation +187. Books that were already clean (Philippians, 1 Thessalonians, the Timothies, the Petrines, the Johannines) were left untouched.",
 "fetch-tagged-kjv.mjs runs the recovery automatically at the end of every fresh fetch, and its sanity check now fails the build if any chapter has more than 15% untagged content tokens after recovery. The existing artifact-scrubber (no <em>, no stray G####] fragments) is unchanged.",
 "Footer version stamp + home chip + whats-new chip all step to v3.8.",
 ],
 },
 {
 version: "v3.7",
 kind: "Mobile Bible reader, highlight fix and commentary popup",
 date: "May 19, 2026",
 blurb:
 "Two real mobile problems in the Bible reader, fixed. (1) The verse highlight system used to fire on every tap, tap a word and scroll, and that word got highlighted. The gesture is now long-press to enter select-mode (with a subtle haptic and a faint gold halo on the verse), then drag to extend the range, lift to commit. A pure tap, or a tap that turns into a scroll, is a no-op. (2) On mobile, patristic commentary used to be a collapsed `<details>` block at the bottom of the chapter, hard to tie to a specific verse. The verse-number badge for any verse with commentary now opens a bottom sheet showing exactly that verse's Father notes, with a backdrop tap or Escape to dismiss. Desktop's sticky right rail is untouched.",
 items: [
 "VerseRow: rewrote the touch-selection gesture as long-press-to-select. Tap is a no-op. ~400ms press with <8px movement enters select-mode (haptic vibration, gold inset glow on the verse). Touchmove after select-mode extends the range. Touchend commits. A scroll-leaning motion (>8px Y or >16px X before select-mode) cancels the pending press. `touch-action: pan-y` on the verse paragraph hands vertical scroll back to the browser.",
 "Fixes the bug where a tap on a verse word would silently highlight that word as soon as the user lifted or scrolled.",
 "New MobileCommentarySheet component: bottom-sheet UI with backdrop, grab handle, scroll-locked body, Escape-to-close, and a stack of commentary cards (saint icon, author, work, full text) for the tapped verse.",
 "ChapterReader owns the sheet's open-verse state and renders the sheet beside the verse list. The verse-number glyph next to verses with commentary is now a `<button>` on mobile (`lg:hidden`) that calls `onOpenCommentary`; the old `<a href=\"#rail-vN\">` anchor stays for desktop (`lg:` and up).",
 "Chapter page: removed the bottom `<details>` block that listed all commentary in one collapsed lump on mobile. The new sheet replaces it.",
 "AppNav: in-app hamburger button bumped from 40×40 to 44×44 for parity with the marketing Navbar and the WCAG 2.5.5 enhanced target.",
 "Desktop highlight + commentary behaviour unchanged: mousedown-drag-mouseup still selects words, and the sticky right-rail StudyRail still shows the chapter's commentary on `lg:` and above.",
 ],
 },
 {
 version: "v3.6",
 kind: "Icon-corner polish, monochrome cross, hero declutter, donate links",
 date: "May 19, 2026",
 blurb:
 "A small follow-up patch on top of v3.5. The home Icon Corner card drops its gold frame and candle-glow in favour of a pure black-and-white card with a proper three-bar Orthodox cross (gradient-filled beams with a soft drop-shadow), not a stick drawing. The home hero loses its Paschal greeting line and the Daily Wisdom strip, the page reads quieter. The Nahum 1:7 citation in the white Scripture break is now a real link into /bible/nahum/1#v7. Pricing is removed from the in-app secondary nav; Support takes its place. The Support page adds Cash App and PayPal and drops the Monthly supporter and Direct (zero-fee) cards.",
 items: [
 "IconCornerCard rebuilt in pure black-and-white: no gold border, no gold inner frame, no candle-glow. Background is a flat dark gradient; the centerpiece is a filled three-bar Orthodox cross with a vertical white→light-gray gradient, soft drop-shadow, and a faint white halo behind it. Saint name demoted to a small italic caption.",
 "Home hero: removed the Paschal greeting line (\"Christ is risen! Truly He is risen!\") and the Daily Wisdom strip below the hero. Cleaner page rhythm.",
 "Nahum 1:7 citation in the white Scripture break is now a link to /bible/nahum/1#v7.",
 "AppNav (in-app secondary nav): Pricing replaced by Support. The /pricing route still exists but is no longer reachable from nav surfaces.",
 "/support donation paths: added Cash App and PayPal. Removed Monthly supporter and Direct (zero-fee) cards. Cards now: Cash App, PayPal, Buy Me a Coffee.",
 ],
 },
 {
 version: "v3.5",
 kind: "Prayer section, whole new revision with Byzantine icons",
 date: "May 19, 2026",
 blurb:
 "The /prayers hub is rebuilt from the ground up around traditional Byzantine icons. Eight icons sourced from Wikimedia Commons, all public domain, mostly 12th-15th century, give every section of the page a real visual anchor. The hero now opens with the Sinai Christ Pantocrator (6th c.) as a backdrop and a display-serif 'Pray without ceasing.' over it. The Morning Rule card carries an Anastasis icon; the Evening Rule, the Vladimir Theotokos. The Jesus Prayer becomes a contemplative panel with the Pantocrator at the top and the prayer set as a three-line chant. The four Liturgical Hours each get their themed icon: Christ Enthroned for the First, Pentecost for the Third, the Sinai Crucifixion for the Sixth, the Entombment for the Ninth. Akathists is anchored by the Theotokos; Learn to Pray by the Three Hierarchs. /prayers/today picks up the same vocabulary on its rule cards. The page reads as a prayer hub, not a dashboard.",
 items: [
 "Nine icon slots, eight unique JPGs at public/icons/prayer/: christ-pantocrator (Sinai 6c), anastasis (1500s Russian), theotokos-of-vladimir (12c Constantinople), christ-enthroned (13c Tretyakov), pentecost (1420s Sergiev Posad), crucifixion (Sinai 12c), entombment (15c Tretyakov), three-hierarchs (Novgorod pre-1917). All public domain or PD-Art, resized to max 800px long-side with sharp + mozjpeg, 30-145 KB each.",
 "New lib/prayers/icons.ts registry, slug → title, alt, src, source attribution. Server-safe.",
 "New components/prayers/PrayerIcon.tsx, same Orthodox-frame chrome as SaintIcon (gold inner frame, warm-brown outer border), sized for thumbnail / section anchor / centerpiece / full-bleed hero. Progressive JPEG fade-in.",
 "/prayers hero: full-width section with Christ Pantocrator photo behind a top-to-bottom dark gradient. Display-serif 'Pray without ceasing.' headline + 1 Thess 5:17 attribution. The day strip (date · saint · fast · Pascha) sits at the bottom of the hero like a candle in front of the icon.",
 "/prayers body organised into named chapters with eyebrow + display-serif h2 headers: Today, The Daily Rules, The Prayer of the Heart, The Hours, The Akathists, Learn to Pray. Vertical rhythm is space-y-20 between chapters, the page reads top-to-bottom as a real prayer book hub.",
 "Daily Rules: side-by-side cards where the icon (Anastasis for morning, Vladimir Theotokos for evening) sits as a vertical anchor next to the prayer summary, duration, and CTA. Card height matches the icon so it reads as a panel-with-icon.",
 "The Jesus Prayer: centered contemplative panel with the Pantocrator at the top, the prayer text rendered as a three-line chant in display serif at 22-26px, italic line about praying in the breath, and a 'Learn how to pray it →' link. No counter, no goal presets.",
 "The Hours: 4-card grid with a 72×96 icon at the top of each card, the hour name, the time (6am / 9am / Noon / 3pm), and the theme. Coming-soon eyebrow on the section header.",
 "Akathists: wide card with the Vladimir Theotokos icon left and a 'notify me' mailto right. Honest placeholder language.",
 "Learn to Pray: accent-bordered card with the Three Hierarchs icon left and copy that frames the saints as the patrons of theology and prayer.",
 "/prayers/today carries the same icon vocabulary onto the daily-prayer page: Anastasis icon on the Morning rule card, Vladimir Theotokos on the Evening rule card. The same set of components, the same visual register.",
 "Footer version stamp + home chip + whats-new chip all step to v3.5.",
 ],
 },
 {
 version: "v3.4",
 kind: "Big patch, prayer reset, Bible chrome, live funding, Discord",
 date: "May 18, 2026",
 blurb:
 "A chunky release across the site. The Jesus Prayer counter retires; the bead-counting page goes and the home/today references repoint to the learning lesson that teaches the prayer itself. The /prayers hub is rebuilt as a real daily-prayer home with a date+saint+fast strip at the top, bigger Morning/Evening rule cards, an honest Akathists placeholder, and a Hours preview. The Bible reader chrome consolidates: Interlinear sits next to the font controls on one row, search gets the full width below, and a new sticky chapter header keeps you oriented as you scroll. The end-of-chapter pager grows into a real 'continue reading' tile. The /support funding counter now pulls live totals from Buy Me a Coffee's Developer API and falls back gracefully to the static number if the token is missing. The Buy Me a Coffee link moves to the project's own handle. A Discord server is wired in, footer column, footer community strip, About page section, and a community card on /support. The home Icon Corner card is rebuilt: photo-anchored when the day's saint has an icon, clean typographic when it doesn't, no more '+' placeholder over a wood gradient.",
 items: [
 "Jesus Prayer counter retired: /prayers/jesus-prayer page, JesusPrayerCounter, and JesusPrayerTodayBadge are gone. The Today page now shows a quiet card with the prayer text and a 'Learn how →' link to /prayers/learning/jesus-prayer. The home category pill and the home challenge card both repoint to the learning lesson. Streak counters on Morning + Evening rules stay (those count rule completions, not beads).",
 "/prayers/jesus-prayer → /prayers/learning/jesus-prayer 308 redirect in next.config.ts so old bookmarks land on the lesson.",
 "/prayers hub redesigned: a date+saint+fast strip card under the hero, the existing gold Today CTA below it, two larger Morning/Evening rule cards that summarise their contents, an Akathists placeholder card with an honest 'notify me' mailto, the Learn-to-Pray accent card, a 4-card Hours preview (First/Third/Sixth/Ninth) with their traditional themes, and a soft sign-in nudge at the foot.",
 "Bible reader chrome: Translation + Book on the left of row one, Font-Size + Font-Family + Interlinear clustered on the right of the same row, BibleSearch full-width on row two. Less visual noise, faster scan.",
 "New ChapterStickyHeader: a thin bar fixes below the navbar once you scroll past the chapter title, showing 'Matthew 3 · v 7 of 17'. The verse number updates via IntersectionObserver so the orientation is always live. Replaces the mobile context strip in ReadingProgressBar.",
 "Chapter h1 shrinks from 44-56px to 36-44px so the verses get more room above the fold.",
 "End-of-chapter pager: the next chapter becomes a big tile-style 'Continue reading' card with the next book/chapter heading and a serif title. Previous chapter is a smaller back-link below. Cross-book navigation lives in a small footer row.",
 "/support funding counter pulls live totals from the Buy Me a Coffee Developer API. New lib/support/buymeacoffee.ts fetches current-month one-time supporters + active subscription monthly value and caches for five minutes via Next.js fetch revalidate. /api/support/bmc proxies the same data for curl/debug. Falls back to the static SUPPORT.monthlyRaisedUsd when BMC_ACCESS_TOKEN isn't set, so the page never breaks.",
 "The Buy Me a Coffee account moved to a new handle; the funding counter follows it.",
 "/support gains an 'Or join the community' Discord card in Discord-purple (#5865F2) alongside the donate links.",
 "Discord across the site: Footer 'About this work' column gains a Discord link with an ↗ external glyph; a community strip above the copyright invites Discord directly; About page picks up a Community section between 'Who is behind this' and 'Money'.",
 "Home Icon Corner card rebuilt. Two render modes: (1) when today's saint has an iconUrl the JPG fills the upper portion of the card as a real background with a dark gradient overlay, like a real icon corner with the icon present; (2) when no icon is indexed, a clean typographic stack, date, saint name, fast pill, Pascha countdown, CTA, with no '+' placeholder and no decorative gold. The old wood gradient + candle-glow are gone.",
 "Footer version stamp + home chip + whats-new chip all step to v3.4.",
 "About page bullet 'Not an account product' wording stays from v3.3; copy elsewhere drops 'Jesus Prayer counter' from descriptions and the about-bullet.",
 ],
 },
 {
 version: "v3.3",
 kind: "Accounts, saved, and highlighted writings",
 date: "May 18, 2026",
 blurb:
 "Three things you've asked for land together. You can highlight a paragraph from a saint's writing the same way you highlight a verse, with the same gold left-bar, the same inline note editor, the same right-click menu of copies and quotes. You can bookmark a verse, a chapter, or a writing section; everything you save lives at /saved. And there is now a real account, optional, signed-in with a one-tap email link, that lets your highlights, notes, and bookmarks follow you across devices. Without an account, every Purify entry still lives only in your browser; with an account, the same things sync to a private row no one but you can read. The 'no account required' line on the home page goes away; the privacy promise stays in a sharper form on the FAQ.",
 items: [
 "Saint writing paragraphs are now interactive. Hover any paragraph in a /saints/.../<work> page; the same toolbar you see on Bible verses appears: ✦ highlight, 🔗 copy link, ✎ note. Right-click for Copy paragraph, Copy as quote, Copy reference, Copy link, plus highlight, note, and Bookmark this section.",
 "A new gold ★ on each writing-section heading toggles a section bookmark. Right-click on a paragraph also offers the same item for power users.",
 "Bible verses get a ★ bookmark button in the verse toolbar and a Bookmark verse / Remove bookmark item in the right-click menu.",
 "New /saved page lists every bookmark, verses, chapters, and saint writing sections, grouped by kind, newest first. Tap a row to open it. Remove with the × button. Empty state explains the gestures.",
 "Footer gets a 'Your saved' link and a 'Your account' link in the About-this-work column. The v3.1 version stamp at the bottom of the footer is now v3.3.",
 "Magic-link sign-in lands at /account. Type your email, get a one-tap link in your inbox, you're signed in for 30 days. No password to make, no password to forget, no OAuth dependency. Same flow whether it's your first time or your hundredth.",
 "Signed-in /account is a real page. Hero with display name (editable inline), email, member-since. Four-stat grid (verses highlighted, paragraphs highlighted, notes written, bookmarks saved) that updates live as you read. Settings for reader font and size. Export your data to JSON. Import a previous export. Manual Sync now. Sign out. Clear local data. Delete account (cascades every server row).",
 "Background sync glue mounted in the (app) layout: while signed in, every bookmark or annotation change pushes to Supabase within 500ms (debounced). On every load of an /(app) page, the device pulls server state down. Best-effort end-to-end; local storage stays the source of truth on-device, so a Supabase outage never breaks the UI.",
 "Three Supabase tables wired with row-level security so you only ever read your own rows: profiles (display name, joined-at), bookmarks (kind, locator, label), annotations (kind, locator, highlighted, highlighted-words, note). The on-delete cascade from auth.users wipes everything when you delete the account.",
 "Home hero copy: 'Free. No tracking. No account required.' becomes 'Free. No tracking. Yours to keep.' The v3.1 changelog chip becomes v3.3 chip pointing at /whats-new.",
 "About page 'Not an account product' bullet rewrites to acknowledge accounts are now optional and the privacy stance behind them. MadeOfStrip's sixth tile reads 'No tracking. No advertising. Optional account.'",
 "FAQ Q10 ('Will there be akathists, audio, accounts...?') rewrites to confirm accounts shipped and how they work. Q11 ('Do you collect any of my data?') splits into a Without-an-account paragraph (localStorage, no copy) and a With-an-account paragraph (Supabase, RLS, you can delete it all).",
 ],
 },
 {
 version: "v3.2",
 kind: "Title hygiene + canonical routing + new-saint icons",
 date: "May 18, 2026",
 blurb:
 "A polish sweep across what shows up in browser tabs, search results, and social-share cards. The 'FAQ - Purify | Purify' double-suffix that the title template was producing on every page gets fixed. Two guessable URLs, /prayer and /scripture, that used to 404 now redirect to /prayers and /bible. Real icons land for the three new saints from v2.5 (Apostle Paul, Mary of Egypt, Nicholas the Wonderworker) whose iconUrl pointed to JPGs that didn't exist yet. Plus the Greek interlinear's alignment fix so hovering a Greek word lights the right English phrase, the Bible reader gets a custom right-click menu (copy verse, copy as quote, copy reference, copy link, highlight, note, bookmark, open commentary), and the search bar now accepts verse ranges like James 2:14-26 with arrival-time highlighting of the whole span. The saint writing reader gains a clearer separation between editorial framing and the saint's own words for the v2.5 entries that mixed the two.",
 items: [
 "Strip the redundant ' - Purify' suffix from every per-page metadata.title so the root layout's '%s | Purify' template stops producing 'FAQ - Purify | Purify' on 22 routes.",
 "Backfill descriptions on eight placeholder/stub pages (account, campaigns, marketplace + 3 sub-pages, pricing, prayers/personal) so social shares stop falling back to the generic root description.",
 "Add 308 permanent redirects: /prayer → /prayers and /scripture → /bible. Anyone guessing the singular form lands on the right page.",
 "Real public-domain icons for the three v2.5 saints whose JPGs were missing: Andrei Rublev's Saint Paul (1407), a 19th-century Russian Mary of Egypt, and a 14th-century Yaroslavl St. Nicholas. All resized to the existing 800px / quality-82 / mozjpeg pattern.",
 "Interlinear alignment bug: hovering the 2nd Greek υἱοῦ used to light the wrong 'son' because the English token occurrence counter was counting filler words ('the', 'of') as separate occurrences of the same Strong's number. Now consecutive tokens that share a Strong's are one span sharing one occurrence index, so the Nth Greek word always maps to the Nth English phrase, not the Nth English token.",
 "Right-click any Bible verse for a custom context menu: Copy verse, Copy as quote, Copy reference, Copy link, Highlight, Add note, Bookmark verse, Open commentary. Native menu is preserved when you have text selected so 'Copy' on a selection still works.",
 "Bible search accepts verse ranges: 'James 2:14-26' parses, the dropdown shows the range with verse count, the URL becomes /bible/james/2#v14-26, and on arrival the whole 14..26 span pulses gold for 1.6 seconds.",
 "Multi-word Greek-hover highlights now bridge the inter-word space, so hovering Βίβλος lights 'The book' as one continuous gold pill instead of two separated chips.",
 "Saint writing reader gains optional framing (editor's intro shown above the text with an 'Editor's note' eyebrow) and citation (source attribution gold eyebrow over the paragraphs). Used by Paul's letter-from-the-prison sections (KJV verses), Nicholas's troparion, and Mary of Egypt's life (where the paragraphs are a retelling, framing acknowledges it, no citation is set).",
 "SaintIcon renders the gold-frame + halo + initials as an instant CSS placeholder underneath the JPG so the hero icon stops appearing to load piece-by-piece into empty space. SaintHero passes priority for fetchpriority=high.",
 ],
 },
 {
 version: "v3.1",
 kind: "The icon corner on the home page",
 date: "May 17, 2026",
 blurb:
 "The home page stops being a brochure and starts behaving like an icon corner. The right column of the hero now shows the saint of the day, the fast, and the days remaining until Pascha, live. A liturgical greeting at the top changes with the season ('Christ is risen!', 'Open to me the doors of repentance', etc.). A Daily Wisdom strip alternates between a Scripture verse and a Father's saying. A season banner auto-surfaces during Great Lent, Holy Week, Bright Week, Pre-Lent, and the Apostles', Dormition, and Nativity fasts. The three home challenge cards finally go to real product. New About, FAQ, and Support pages. A deeper footer with Orthodox section names. And Today is the first item in the primary nav.",
 items: [
 "Home hero right column replaced with an Icon Corner card: today's saint icon, the date, the fast, the Pascha countdown, link straight into /prayers/today.",
 "Liturgical greeting at the top of the home page changes with the season: Christ is risen! during the Pentecostarion, Christ is born! during the Twelve Days, Open to me the doors of repentance during Great Lent, Behold the Bridegroom comes during Holy Week, Glory to Jesus Christ otherwise.",
 "Daily Wisdom strip below the hero: alternating Scripture verses (even days, 30 entries) and sayings of the Fathers (odd days, 30 entries), rotated by day-of-year, citation links to the source.",
 "Liturgical-season banner auto-appears during Great Lent (with the Sunday-of-Lent sub-theme), Holy Week (Bridegroom Monday through Holy Saturday by day), Bright Week (Bright Monday through Thomas Sunday), Pre-Lent (Publican and Pharisee, Prodigal Son, Last Judgment, Forgiveness), and the Apostles', Dormition, and Nativity fasts with days-until counters. Hidden in ordinary time.",
 "What we are made of strip: six Orthodox-anchored honest claims (Septuagint, Nestle 1904, Schaff Fathers, common Orthodox prayer book wording, both calendar reckonings, no tracking, no accounts). Replaces the generic-trust gap.",
 "Three home challenge cards now go to real product: Great Lent with the Fathers to /calendar, Learn the Jesus Prayer to /prayers/jesus-prayer, A child's first prayers to /prayers/learning. The dead Join Challenge modal is gone; CTA is now Begin.",
 "New /about page: what the site is, what it's made of, what it isn't, who is behind it, the privacy promise, the money note. Closes with a line from St. Seraphim.",
 "New /faq page: twelve Orthodox-specific questions and answers, collapsible. Jurisdiction, calendar, Bible translations, fasting rule discrepancies, where the Russian saints are, roadmap, privacy.",
 "New /support page: live monthly funding goal with a progress bar, transparent expense breakdown by line, and three donation paths.",
 "Footer rebuilt with Orthodox section names: The Bible / The Saints / The Calendar / The Prayer / About this work. Glory to God for all things at the bottom.",
 "Primary nav: Today is now the first item, linking to /prayers/today. Marketplace dropped from primary nav. Pricing replaced with Support in secondary nav.",
 "Hero copy refined for inquirers: now reads 'A quiet place to begin and end the day' with the Orthodox-prayer-companion framing.",
 ],
 },
 {
 version: "v3.0",
 kind: "Daily prayer",
 date: "May 17, 2026",
 blurb:
 "Daily prayer lands. /prayers/today gathers the date, the saint, the fast, and the readings into one screen; the morning and evening rules read as proper prayer-by-prayer rules with a progress strip and a streak counter; the Jesus Prayer gets its own counter with an optional breath cue. Plus the foundation work the site has been missing: custom 404, error boundary, loading skeleton, sitemap, robots, an Open Graph image, an Old Calendar toggle, and a sweep of small fits and finishes.",
 items: [
 "/prayers/today gathers the date, the saint, the fast, today's Gospel and Epistle teasers, and one-tap links into morning rule, evening rule, and the Jesus Prayer.",
 "/prayers/morning and /prayers/evening: the full Orthodox rules split into individual prayers with check-off boxes, a progress strip, and a per-rule streak counter saved to the device.",
 "/prayers/jesus-prayer: guided counter with goal presets (33, 50, 100, 150, 300), optional breath-cue pulse, today total, and a day-streak when you pray at least 33 in a calendar day.",
 "Calendar now has an Old (Julian) Calendar toggle, used by the Russian, Serbian, Jerusalem, and Athonite traditions. Defaults to New (Revised Julian).",
 "Custom 404 page, error boundary, and Bible-chapter loading skeleton replace the generic Next defaults.",
 "Sitemap and robots ship so the site is properly indexable.",
 "Open Graph image generated at the edge, so link previews on Slack, Discord, and X now show the gold Purify card.",
 "Font display set to swap on every face (DM Sans, DM Serif Display, Lora, Cardo) so text appears immediately instead of blocking.",
 "Home page category pills now link to real routes (Morning prayers, Psalter, Jesus Prayer, etc.) instead of dead anchors.",
 "Saint cards on /saints show the count of works available alongside the feast day.",
 "Root metadata expanded: Open Graph, Twitter card, canonical, application name, color scheme.",
 ],
 },
 {
 version: "v2.5",
 kind: "Massive content patch",
 date: "May 17, 2026",
 blurb:
 "Three new saints, six new book introductions, ten new patristic commentary cards across Matthew and Acts, and a fresh batch of icon mappings. The biggest single content drop since v1.0.",
 items: [
 "Three new saints land in the registry: Holy Apostle Paul (with a selection of his final letters from prison), St. Mary of Egypt (with selections from the Life by St. Sophronius of Jerusalem), and St. Nicholas the Wonderworker of Myra (with the Three Bags of Gold and the troparion sung at his Liturgy).",
 "Six new book introductions: 1 Corinthians, Galatians, Hebrews, James, 1 John, and the Wisdom of Solomon. Each frames the book within its Orthodox liturgical use and the patristic readers who interpret it.",
 "Matthew commentary expands across four new chapters: the Beatitudes (Chrysostom and Gregory of Nyssa on poverty of spirit), the Lord's Prayer (Cyprian and Gregory of Nyssa), 'seek first the Kingdom' (Maximus the Confessor), the Pearl of Great Price (Chrysostom and Gregory the Theologian on Baptism), and the Last Judgment 'least of these' (Chrysostom and Gregory the Theologian on the poor).",
 "Acts commentary expands with five new entries: the four marks of the apostolic community (Chrysostom on Acts 2:42), the all-things-in-common verse (Chrysostom and Basil on 4:32), 'Saul, Saul' on the Damascus road (Augustine and Chrysostom on 9:4), 'in Him we live and move and have our being' (Chrysostom and Maximus on 17:28), and the agraphon 'more blessed to give than to receive' (Chrysostom and Basil on 20:35).",
 "Icon mappings extended for the new saints plus aliases for several Fathers cited in commentary cards (Cyprian of Carthage, Gregory of Nyssa, Jerome).",
 "All new content is original summary prose written for Purify. Brief representative phrases are drawn from genuinely public-domain Schaff and Ante-Nicene Fathers translations (1885-1900) or the King James Version (1611).",
 ],
 },
 {
 version: "v2.4",
 kind: "Saints, faces and full text",
 date: "May 16, 2026",
 blurb:
 "Saint icons render correctly in patristic commentary (path bug fixed plus five more saints mapped), Chrysostom's icon now shows his face not his body, Augustine's Confessions Book I lands complete, and long works get a table of contents with section deep-links.",
 items: [
 "Fixed: every patristic commentary author now renders with their real icon. A path-prefix bug had been silently 404ing every /icons/saints/* URL since v1.1; the actual files live at /saints/icons/*. Same patch maps the five saints that had no icon entry (John of Damascus, Ignatius, Maximus, Symeon, Seraphim) and adds the short-form 'St. Basil' / 'St. Cyril' aliases.",
 "Fixed: St. John Chrysostom's icon was cropping to his lower body because the JPG is a tall full-body portrait. All saint icons now use object-top so the face stays in frame.",
 "Augustine of Hippo gets his Confessions, Book I complete (Pusey translation, public domain via Project Gutenberg ebook #3296). The first interior autobiography in Christian literature, ten reflective sections from his infancy and earliest boyhood.",
 "Long works now ship with a Contents disclosure listing every section with a deep-link. URLs like /saints/augustine-of-hippo/confessions#s7 open the work and scroll to the seventh section. Short works (under four sections) hide the disclosure.",
 "More full signature works ship in v2.5: Athanasius On the Incarnation (full 57 sections), Chrysostom On the Priesthood (six books), Basil On the Holy Spirit, Ignatius Seven Epistles, Irenaeus Against Heresies Book I.",
 ],
 },
 {
 version: "v2.3",
 kind: "Less scroll, better picker",
 date: "May 16, 2026",
 blurb:
 "Patch notes group by date and collapse, the chapter intro tucks behind a disclosure, the patristic commentary scrollbar finally matches the design, and /bible gets a 'Start here' strip plus richer book cards.",
 items: [
 "Patch notes group by date and collapse. Older releases are one click away instead of one long scroll.",
 "'About this book' on chapter 1 of every book is now a closed disclosure. Tap to expand when you want the context; otherwise the verses lead.",
 "Patristic commentary side rail gets a thin paper-colored scrollbar that matches the rest of the chrome.",
 "/bible book picker redesigned. Each book card now shows its chapter count and carries a subtle category color, and a new 'Start here' strip leads with six common entry points (John, Psalms, Genesis, Matthew, Romans, 1 Cor 13).",
 "Hero on /bible trimmed down and the dead quick-nav row removed.",
 "Search hint line under the Bible search box: 'Try: John 3:16, 1 Cor 13, Psalm 23'.",
 ],
 },
 {
 version: "v2.2",
 kind: "Bible reader polish",
 date: "May 16, 2026",
 blurb:
 "Eight quiet improvements so the Bible reads well on a phone: reading progress, a chapter quick-jump strip, copy-verse-link, a floating next-chapter button, and a consolidated reader settings menu.",
 items: [
 "Reading progress bar at the top of every chapter, with a mobile-only context strip showing where you are ('John 3, v12 of 35').",
 "Mobile chapter quick-jump strip below the chrome, a horizontal row of chapter pills so you can hop chapters without the desktop sidebar.",
 "Per-verse copy-link button in the verse toolbar. One tap copies a deep link to the clipboard for sharing.",
 "Floating Next chapter button on mobile, appearing once you have read past the halfway mark. Hidden on the last chapter of Revelation.",
 "Reader font size, font family, and interlinear toggle now consolidate into a single Reader menu on mobile. Translation and book switchers stay inline.",
 "Keyboard shortcuts hint at the bottom of desktop chapters so the arrow-key chapter nav, drag-to-highlight, and save-with-Cmd+Enter are not invisible.",
 "Greek word popover sizes itself to the viewport on narrow screens, no more 300px popover overflowing a 360px phone.",
 "Verse-number-to-commentary link gets a brighter hover state so the affordance reads.",
 "Verse hash links flash gold: clicking a search result or opening a shared deep link scroll-centers the verse and pulses it for a moment.",
 ],
 },
 {
 version: "v2.1",
 kind: "Calendar polish, Koine accuracy",
 date: "May 16, 2026",
 blurb:
 "Three small fixes that matter: the calendar reads cleaner, the interlinear is now New Testament only, and the New Testament Greek finally has its accents back.",
 items: [
 "Calendar readings now show citation plus the first verse with a 'Read full passage' link, instead of two full Gospel and Epistle blocks dominating the page.",
 "Calendar hero and section headings scale down on mobile so the saint of the day fits a phone screen.",
 "Interlinear toggle and Greek column are now hidden on Old Testament chapters. The Septuagint is a Greek translation, but the Old Testament was originally Hebrew; New-Testament-only interlinear matches how most readers think about the text.",
 "New Testament Greek re-sourced as Nestle 1904 with full polytonic accents (smooth and rough breathings, circumflex, iota subscript). 'Bíblos genéseōs' rendered as 'Βίβλος γενέσεως' instead of 'βιβλος γενεσεως', proper Koine the way the Fathers read it.",
 ],
 },
 {
 version: "v2.0",
 kind: "Calendar",
 date: "May 16, 2026",
 blurb:
 "The first standalone calendar lands. Today's saint, today's fasting status, a Pascha countdown, and a full month grid with each day's commemorations and fast colour-coded. Plus three new saint icons, smoother highlight bars, and the version label finally catches up to itself.",
 items: [
 "New /calendar route. Hero shows today's date, today's saint(s) drawn from the saints index, the day's fasting rule with a colour-coded badge, and the days remaining until Pascha.",
 "Full month grid (Sun to Sat) with today tinted gold, every saint feast day dotted in gold, and the fasting rule for each day colour-coded (red strict, gold wine and oil, sage fish allowed, green fast-free). Click any day to pin it.",
 "Fasting helper covers the year-round Wednesday/Friday fast, all four major fasts (Great Lent, Apostles, Dormition, Nativity), and the four fast-free weeks (Bright Week, Trinity Week, the Twelve Days of Christmas, the Publican and Pharisee week).",
 "Pascha is computed by the Julian-based algorithm shared by all canonical Orthodox churches; fixed feasts use the New (Revised Julian) calendar of the Ecumenical Patriarchate.",
 "Three more saint icons sourced from Wikimedia Commons: Augustine of Hippo, Cyril of Alexandria, Irenaeus of Lyons.",
 "Word highlights now extend across the space between adjacent highlighted words. No more gappy two-pill look when you highlight a phrase like 'for God so loved'.",
 "Date and version-label drift fixed: changelog dates corrected to May 16, home banner now matches the /whats-new header.",
 ],
 },
 {
 version: "v1.5",
 kind: "John and the Fathers",
 date: "May 16, 2026",
 blurb:
 "A patch dedicated to the Gospel of John. Three of the great early commentators on the Fourth Gospel are added to the Saints section. Patristic commentary expands from one chapter of John to nine. The letter above is unchanged; this is a content bump, not a direction change.",
 items: [
 "Three new saints in the registry: Augustine of Hippo (Doctor of Grace), Cyril of Alexandria (Seal of the Fathers), and Irenaeus of Lyons (Disciple of the Disciple, who heard Polycarp who heard John).",
 "Each new saint ships with a curated selection from his commentary on John: Augustine's Tractates on John, Cyril's Commentary on John, and Irenaeus' Against Heresies on the Fourth Gospel.",
 "St. John Chrysostom gains a third work, Homilies on the Gospel of John, with selections from the eighty-eight homilies he preached at Antioch in the early 390s, the longest patristic treatment of any New Testament book.",
 "Patristic commentary on John expands from one chapter to nine. New verse-level entries on John 1:3, 1:12, 1:18, 1:29, 3:3, 3:5, 3:16, 6:51, 6:53, 10:11, 10:30, 14:6, 14:9, 17:21, 19:34, 20:22, 20:28, the most-cited verses of the Gospel.",
 "Commentary now draws on ten Fathers across the patristic age: Athanasius, Augustine, Basil, Chrysostom, Cyril of Alexandria, Gregory the Theologian, Ignatius of Antioch, Irenaeus, John of Damascus, and Maximus the Confessor.",
 "Saint icons for Augustine, Cyril, and Irenaeus render as deterministic-initials circles until JPGs are uploaded; both icon maps (profile and commentary-rail) are wired with the correct paths.",
 ],
 },
 {
 version: "v1.4.1",
 kind: "Bible fixes",
 date: "May 16, 2026",
 blurb:
 "A correctness patch for the Interlinear column and word lookups. No new features; just clean text where there used to be ingestion debris.",
 items: [
 "Fixed: literal 'of', 'is', and friends appearing inside the English column of the New Testament when Interlinear was on. The KJV's italicized supplied-words markers had been surviving as HTML through the ingest. 2,444 stray tags removed across 197 chapter files.",
 "Fixed: clicking certain words in the English column landed on a garbage token like G3756] instead of a real word. 3,655 orphan Strong's-bracket fragments scrubbed.",
 "The ingest script now strips italic markers before tokenizing, drops orphan Strong's fragments, and runs a sanity check that fails the build if a fragment ever reappears.",
 "The loader also defensively scrubs tokens at read time, so a stale data file can't put garbage on screen.",
 "No effect on the regular (non-Interlinear) Bible reader. The OT (Greek LXX) column is unchanged; this fix is NT-only.",
 ],
 },
 {
 version: "v1.3",
 kind: "Click any Greek word",
 date: "May 16, 2026",
 blurb:
 "With Interlinear on, every Greek word in the New Testament is now clickable. Tap a word to see its dictionary form, a short definition, the part of speech, and its Strong's number. Letter above unchanged.",
 items: [
 "New WordPopover anchored to the clicked word, flips above if it would run off the bottom of the screen.",
 "Popover shows: the word itself, the lemma (dictionary form) with transliteration, a concise Strong's definition, a friendly parse string (e.g. 'verb · aorist · active · indicative · 3rd sing.'), and the Strong's number badge.",
 "1,200+ Greek words and 5,500+ Strong's entries packed into a slim per-chapter lexicon, only the entries used in the chapter ship to the browser (~5-20 KB per page).",
 "NT text now sourced from the Robinson-Pierpont Byzantine Majority Text with Strong's tagging (PD). Same Textus Receptus tradition as the previous Stephanus rendering; accents are not shown so the words can be tagged precisely.",
 "OT (Greek LXX) keeps its accented text and shows a small 'word lookups coming' marker, OT tagging is planned for a future patch.",
 "Esc, click outside, or the close button in the corner all close the popover.",
 ],
 },
 {
 version: "v1.2",
 kind: "Interlinear",
 date: "May 16, 2026",
 blurb:
 "The Bible reader now has an Interlinear toggle. Click it on any chapter and the original Greek appears beside the English. Letter above unchanged.",
 items: [
 "New Interlinear button in the chapter header, next to the search bar. Toggle persists across chapters and reloads.",
 "Original-language coverage: KJV New Testament paired with Stephanus 1550 (Textus Receptus) Greek; Brenton Old Testament paired with the Septuagint Greek that Brenton translated from. 1,325 chapters total.",
 "Cardo serif loaded for the Greek column, polytonic accents and breathings render correctly.",
 "Mobile (under md): Greek wraps below the English instead of beside, so verses stay readable on phones.",
 "Verse highlights and notes still work with Interlinear on. The English column owns the toolbar and word-drag highlighting.",
 ],
 },
 {
 version: "v1.1",
 kind: "Polish patch",
 date: "May 16, 2026",
 blurb:
 "A polish-and-fill pass before any new feature work. The letter above is unchanged.",
 items: [
 "Three new saints: Ignatius of Antioch, Maximus the Confessor, Symeon the New Theologian, each with a representative work and a real icon.",
 "Verse highlight tint now applies cleanly with the gold inset bar.",
 "Top navigation harmonized between the marketing site and the app: same five primary items, same Pricing and Account links, same Try Free pill.",
 "Footer: removed the duplicate Pricing link and surfaced What's new in the Discover column.",
 "Saint icons resized: total weight dropped from 4.7 MB to ~440 KB, with no visible quality loss.",
 "Focus rings on filter pills are now visible against the dark background.",
 ],
 },
 {
 version: "v1.0",
 kind: "First release",
 date: "May 15, 2026",
 blurb: "The first public version. See Edgar's letter above for the full picture.",
 items: [
 "The Orthodox Bible: Brenton Septuagint plus KJV, with cross-references and patristic commentary.",
 "Saints: six founding fathers with lives, writings, marginalia, century filter, topic filter.",
 "Smart search across books, chapters, and verses (John 3:16, 1 Cor 13, Ps 23).",
 "Verse highlights and notes saved to your device.",
 "Dark, calm reading typography. Section-snap scrolling.",
 ],
 },
];

// The changelog nests year > month > day > release. An entry carries only a
// human date string, "August 11, 2026", which is also its group key, so the
// year and month are read back out of that one field rather than stored a
// second time. One release, one date, written once.
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type ParsedDate = { year: number; monthIndex: number; day: number };

function parseEntryDate(date: string): ParsedDate | null {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(date.trim());
  if (!m) return null;
  const monthIndex = MONTH_NAMES.findIndex(
    (name) => name.toLowerCase() === m[1].toLowerCase(),
  );
  if (monthIndex < 0) return null;
  return { year: Number(m[3]), monthIndex, day: Number(m[2]) };
}

type DayGroup = { date: string; label: string; entries: Entry[] };
type MonthGroup = { key: string; label: string; days: DayGroup[]; count: number };
type YearGroup = { key: string; label: string; months: MonthGroup[]; count: number };

/**
 * Group entries into year > month > day, preserving array order at every
 * level, exactly as the flat date grouping did. ENTRIES is newest first and
 * stays that way; nothing here sorts, so a hand-ordered list is never
 * silently rearranged.
 *
 * A date this cannot parse does not vanish. It gets its own year and month
 * bucket labelled with the raw string and sits where the array already put
 * it, because a release dropping off the page is a worse failure than an
 * ugly heading.
 */
function groupByYearMonthDay(entries: Entry[]): YearGroup[] {
  const years: YearGroup[] = [];

  for (const e of entries) {
    const parsed = parseEntryDate(e.date);
    const yearKey = parsed ? String(parsed.year) : `unparsed:${e.date}`;
    const monthKey = parsed ? `${parsed.year}-${parsed.monthIndex}` : yearKey;

    let year = years[years.length - 1];
    if (!year || year.key !== yearKey) {
      year = {
        key: yearKey,
        label: parsed ? String(parsed.year) : e.date,
        months: [],
        count: 0,
      };
      years.push(year);
    }

    let month = year.months[year.months.length - 1];
    if (!month || month.key !== monthKey) {
      month = {
        key: monthKey,
        label: parsed ? MONTH_NAMES[parsed.monthIndex] : e.date,
        days: [],
        count: 0,
      };
      year.months.push(month);
    }

    let day = month.days[month.days.length - 1];
    if (!day || day.date !== e.date) {
      day = {
        date: e.date,
        // Inside "2026 > August" the year is already overhead, so the day row
        // carries "August 11" rather than repeating the whole string.
        label: parsed
          ? `${MONTH_NAMES[parsed.monthIndex]} ${parsed.day}`
          : e.date,
        entries: [],
      };
      month.days.push(day);
    }

    day.entries.push(e);
    month.count += 1;
    year.count += 1;
  }

  return years;
}

function updateCount(n: number, isDe: boolean): string {
  if (isDe) return `${n} ${n === 1 ? "Aktualisierung" : "Aktualisierungen"}`;
  return `${n} ${n === 1 ? "update" : "updates"}`;
}

export default async function WhatsNewPage() {
 const years = groupByYearMonthDay(ENTRIES);
 const locale = await getServerLocale();
 const isDe = locale === "de";
 const m = getMessages(locale);

 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 {!isDe && <TranslationDisclaimer />}
 {/* Eyebrow + version */}
 <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55">
 {isDe ? "Was ist neu" : t(m, "whatsnew.eyebrow")}
 </p>
 <p className="font-sans text-caption uppercase tracking-[1.2px] text-paper/55">
 {t(m, "whatsnew.chip")}
 </p>
 </div>

 <h1 className="font-sans text-display-sm md:text-display-lg font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {t(m, "whatsnew.h1")}
 </h1>

 {/* The weekly note. Written into data/changelog/board.json, newest first.
 It replaced a hand-written block that only got rewritten on a big
 patch and so sat on Beta 1.7 for eight releases. */}
 <div className="mt-10">
 <BoardMessage />
 </div>

 {isDe ? (
 <>
 <p className="mt-8 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.wennDuNeuHierBist" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.derMitAbstandBesteOrt" />{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-sky-400 underline underline-offset-2 decoration-sky-400/50 hover:decoration-sky-300 hover:text-sky-300"
 >
 <T k="ui.hier" />
 </a>{" "}
 <T k="ui.bei" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.dieArbeitDarunterBleibtDieselbe" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.dasVollstNdigeVersionsprotokollLebt" />
 </p>
 </>
 ) : (
 <>
 <p className="mt-8 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.ifYouAreNewHere" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.theSingleBestPlaceTo" />{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-sky-400 underline underline-offset-2 decoration-sky-400/50 hover:decoration-sky-300 hover:text-sky-300"
 >
 <T k="ui.here" />
 </a>
 .
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.theWorkUnderneathStaysThe" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.theFullReleaseByRelease" />
 </p>
 </>
 )}

 {/* Closing + signature */}
 <div className="mt-16 pt-10 border-t border-paper/10">
 <p className="font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 {isDe
 ? "Danke, daß du mit uns gehst. Ehre sei Gott für alles."
                : "Thank you for walking this with us. Glory to God for all things."}
 </p>

 <p
 className="mt-10 font-serif italic text-lede md:text-title-sm tracking-wide text-gold"
 >
 {isDe ? "Von Edgar, dem Purify-Team." : "From Edgar, the Purify Team."}
 </p>
 </div>

 {/* Changelog: dates collapse, releases inside also collapse. */}
 <section className="mt-20 pt-10 border-t border-paper/10" data-changelog>
 <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55">
 {isDe ? "Versionshinweise" : "Release notes"}
 </p>
 <ChangelogControls />
 </div>
 <p className="font-sans text-detail text-paper/55 mb-8 leading-[1.65]">
 {isDe
 ? "Nach Jahr, dann Monat, dann Tag gruppiert. Der jüngste Tag ist voreingestellt offen; tippe ein Jahr, einen Monat oder einen Tag an, um es aufzuklappen. Innerhalb eines Tages tippe auf eine Version, um ihre vollständige Liste zu lesen."
 : "Grouped by year, then month, then day. The most recent day is open by default; tap any year, month or day to expand it. Inside a day, tap a release to read its full item list."}
 </p>

 <div className="space-y-3">
          {years.map((y, yi) => (
            <details
              key={y.key}
              open={yi === 0}
              className="group/yr rounded-md border border-paper/12 bg-paper/[0.02] open:bg-paper/[0.04] transition-colors"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
                <span className="flex items-baseline gap-3 min-w-0">
                  <span className="font-sans text-ui font-semibold text-paper truncate">
                    {y.label}
                  </span>
                  <span className="font-sans text-caption uppercase tracking-[1.2px] text-paper/55">
                    {updateCount(y.count, isDe)}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="text-paper/55 group-open/yr:rotate-180 transition-transform duration-200 text-caption"
                >
                  ▾
                </span>
              </summary>

              <div className="px-3 pb-4 pt-1 space-y-2">
                {y.months.map((mo, mi) => (
                  <details
                    key={mo.key}
                    open={yi === 0 && mi === 0}
                    className="group/mo rounded-md border border-paper/10 bg-paper/[0.015] open:bg-paper/[0.03] transition-colors"
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
                      <span className="flex items-baseline gap-3 min-w-0">
                        <span className="font-sans text-detail font-semibold text-paper/90 truncate">
                          {mo.label}
                        </span>
                        <span className="font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/55">
                          {updateCount(mo.count, isDe)}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="text-paper/55 group-open/mo:rotate-180 transition-transform duration-200 text-eyebrow"
                      >
                        ▾
                      </span>
                    </summary>

                    <div className="px-3 pb-3 pt-1 space-y-2">
                      {mo.days.map((d, di) => (
                        <details
                          key={d.date}
                          open={yi === 0 && mi === 0 && di === 0}
                          className="group/day rounded-md border border-paper/10 bg-night-soft/25 open:bg-night-soft/45 transition-colors"
                        >
                          <summary className="cursor-pointer list-none px-4 py-2.5 flex items-center justify-between gap-3">
                            <span className="flex items-baseline gap-3 min-w-0">
                              <span
                                title={d.date}
                                className="font-sans text-detail font-medium text-paper/85 truncate"
                              >
                                {d.label}
                              </span>
                              <span className="font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/55">
                                {updateCount(d.entries.length, isDe)}
                              </span>
                            </span>
                            <span
                              aria-hidden
                              className="text-paper/55 group-open/day:rotate-180 transition-transform duration-200 text-eyebrow"
                            >
                              ▾
                            </span>
                          </summary>

                          <div className="px-3 pb-3 pt-1 space-y-2">
                            {d.entries.map((e) => (
                              <ReleaseDetails key={e.version} entry={e} />
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
 </div>
 </section>
 </article>
 </section>
 );
}

function ReleaseDetails({ entry: e }: { entry: Entry }) {
 return (
 <details className="group/rel rounded-md border border-paper/10 bg-night-soft/40 open:bg-night-soft/70 transition-colors">
 <summary className="cursor-pointer list-none px-4 py-3">
 <div className="flex items-baseline gap-3 flex-wrap">
 <span className="font-sans text-body font-bold text-paper tracking-[-0.01em]">
 {e.version}
 </span>
 <span className="font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/50">
 {e.kind}
 </span>
 <span
 aria-hidden
 className="ml-auto text-paper/55 group-open/rel:rotate-180 transition-transform duration-200 text-eyebrow"
 >
 ▾
 </span>
 </div>
 <p className="mt-1.5 font-sans text-detail text-paper/65 leading-[1.55] group-open/rel:text-paper/80 transition-colors">
 {e.blurb}
 </p>
 </summary>
 <ul className="px-4 pb-4 pt-1 space-y-2 font-sans text-ui text-paper/85 leading-[1.6] list-disc pl-9 marker:text-paper/30">
 {e.items.map((it) => (
 <li key={it}>{it}</li>
 ))}
 </ul>
 </details>
 );
}
