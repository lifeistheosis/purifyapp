# Draft: the Terms on what readers post, and the privacy page to match

**A draft for his OK. Nothing here is on any page.** Written 2026-11-10 by the
Admin chat on the arbiter's word, from his of about 15:45 UTC
(`docs/1.9-build/BRAINSTORM.md`, 2af3613c): "we don't need a priest or a
lawyer to make prayer campaigns. Just make it clear that the prayer campaigns
are made by the people, right? The photos they upload are their photos. And
whenever they make a prayer campaign, they accept to the terms of service so
that it's like their prayer campaigns are distinct from us. So, you know, if
they put a controversial prayer campaign, like, they're the ones at fault, but
also at the same time we are allowed to remove any prayer campaign, something
along those lines." And of about 15:50 UTC: add the takedown contact for
photos that are not the poster's own.

The pages move to the main web only with the 1.9 merge, after his yes.

## Where it goes

- **The Terms** (`components/legal/TermsText.tsx`): four short parts inside
  section 8, "Content, copyright, and your submissions", after its paragraph.
  No section is renumbered, so the arbitration clause and every reference
  keep their numbers. The Terms are English for every reader today (only the
  privacy page has a German text); the German below is for his reading, and
  for the page if the Terms are ever given a German text, in which case the
  English stays the binding one.
- **The privacy page** (`components/legal/PrivacyText.tsx`, English and
  German): the campaigns paragraph the campaigns chat drafted
  (`docs/1.9-build/notes/campaigns-fable.md`, 4.7) with four sentences added
  here, marked [added], and one new paragraph on Community, which the page
  does not mention today although posts, replies, profiles and their pictures
  are public (4.7 found the gap).

## Two things to know before he says yes

1. **"For any reason" and the EU.** He wants Purify free to remove anything.
   The draft says so. Europe's Digital Services Act also asks a service that
   removes what someone posted to tell them why, which is why the draft adds
   "when we remove something you posted, we tell you why". It costs one short
   message per removal and keeps the freedom he asked for.
2. **The copyright agent.** The takedown paragraph sends notices to
   legal@purifyapp.net and asks for what a US copyright notice must carry.
   The protection that law gives a service for what its users post also needs
   an agent registered with the US Copyright Office (the campaigns chat is
   planning that with him). When he is registered, his name and postal
   address join that paragraph; until then the paragraph still works as a
   way to reach us.

---

## The Terms (English)

> **What you post**
>
> Parts of Purify let you post for other people to see: prayer campaigns with
> their updates and pictures, Community posts and replies, comments, shared
> journal pages, shop reviews, and the name, picture and banner on your
> profile. What you post is made by you, not by Purify. It is not our view,
> and we do not vouch for it, even where a moderator has looked at it before
> it is shown.
>
> Your words and pictures stay yours. When you post them, you give us a
> worldwide, non-exclusive, royalty-free licence to store them, to prepare
> them for display (for example, to resize a picture or remove the hidden
> data a photo carries), and to show them in the Purify apps and on our
> website to the people you share them with. The licence ends when you or we
> delete them, apart from what the law requires us to keep.
>
> When you post, you confirm that:
>
> - the words and pictures are yours to share, or you have permission from
>   whoever owns them;
> - anyone you name or show has agreed to it, or their family has if they
>   have died, or you are the parent or guardian of the child;
> - you share nothing private about another person, such as their health,
>   without their permission; and
> - what you post keeps to these terms and to the law.
>
> You are responsible for what you post, and you, not Purify, answer for it.
>
> **Prayer campaigns**
>
> A prayer campaign is a request for prayer that you start and keep. When you
> start one, you accept these terms for it, and you confirm the line you tick
> before it is created. You can edit it, end it, close its comments, or take
> it down at any time.
>
> **What we may remove**
>
> We may refuse, hide, or remove any prayer campaign, post, reply, comment,
> picture, or shared page, at any time and for any reason, and we may limit
> or close an account that breaks these terms. We do not have to watch what
> is posted, and leaving something up does not mean we agree with it. When we
> remove something you posted, we tell you why, unless the law or someone's
> safety stops us.
>
> **Reports, and pictures that are not the poster's own**
>
> If something posted in Purify breaks the law or these terms, or names you
> or someone in your care without your agreement, report it from its page or
> write to support@purifyapp.net.
>
> If a picture or other work posted in Purify is yours and was used without
> your permission, write to legal@purifyapp.net with:
>
> - your signature (your full name, typed, is enough);
> - the work that is yours;
> - where it is in Purify (its link);
> - your name, postal address, and email or phone;
> - a statement that you believe in good faith that the use is not allowed
>   by you, your agent, or the law; and
> - a statement, under penalty of perjury, that your notice is accurate and
>   that you own the work or may act for its owner.
>
> We take the work down while we look into it and tell the person who posted
> it, who may write back to legal@purifyapp.net if they believe it was a
> mistake. We close the accounts of people who repeatedly post others' work
> without permission.

## The Terms (German, "du", as the app speaks)

> **Was du veröffentlichst**
>
> In Teilen von Purify kannst du etwas veröffentlichen, das andere sehen:
> Gebetskampagnen mit ihren Neuigkeiten und Bildern, Beiträge und Antworten
> in der Gemeinschaft, Kommentare, geteilte Tagebuchseiten, Bewertungen im
> Shop sowie den Namen, das Bild und das Titelbild deines Profils. Was du
> veröffentlichst, stammt von dir, nicht von Purify. Es gibt nicht unsere
> Ansicht wieder, und wir stehen nicht dafür ein, auch wenn ein Moderator es
> angesehen hat, bevor es gezeigt wird.
>
> Deine Worte und Bilder bleiben deine. Wenn du sie veröffentlichst, räumst
> du uns eine weltweite, nicht ausschließliche, unentgeltliche Lizenz ein, sie
> zu speichern, für die Anzeige vorzubereiten (zum Beispiel ein Bild zu
> verkleinern oder die verborgenen Daten zu entfernen, die ein Foto mit sich
> trägt) und sie in den Purify-Apps und auf unserer Website den Menschen zu
> zeigen, mit denen du sie teilst. Die Lizenz endet, wenn du oder wir sie
> löschen, abgesehen von dem, was wir von Gesetzes wegen aufbewahren müssen.
>
> Wenn du etwas veröffentlichst, bestätigst du, dass:
>
> - die Worte und Bilder dir gehören oder du die Erlaubnis dessen hast, dem
>   sie gehören;
> - jeder, den du nennst oder zeigst, damit einverstanden ist, oder seine
>   Familie, wenn er verstorben ist, oder dass du Elternteil oder Vormund des
>   Kindes bist;
> - du nichts Privates über einen anderen Menschen teilst, etwa über seine
>   Gesundheit, ohne seine Erlaubnis; und
> - das, was du veröffentlichst, diesen Bedingungen und dem Gesetz
>   entspricht.
>
> Du bist für das verantwortlich, was du veröffentlichst, und du, nicht
> Purify, stehst dafür ein.
>
> **Gebetskampagnen**
>
> Eine Gebetskampagne ist eine Bitte um Gebet, die du anlegst und betreust.
> Wenn du eine anlegst, nimmst du diese Bedingungen für sie an und bestätigst
> die Zeile, die du vor dem Anlegen ankreuzt. Du kannst sie jederzeit
> bearbeiten, beenden, ihre Kommentare schließen oder ganz löschen.
>
> **Was wir entfernen dürfen**
>
> Wir dürfen jede Gebetskampagne, jeden Beitrag, jede Antwort, jeden
> Kommentar, jedes Bild und jede geteilte Seite jederzeit und aus jedem Grund
> ablehnen, ausblenden oder entfernen, und wir dürfen ein Konto, das gegen
> diese Bedingungen verstößt, einschränken oder schließen. Wir sind nicht
> verpflichtet zu überwachen, was veröffentlicht wird, und wenn wir etwas
> stehen lassen, heißt das nicht, dass wir ihm zustimmen. Wenn wir etwas
> entfernen, das du veröffentlicht hast, sagen wir dir, warum, es sei denn,
> das Gesetz oder die Sicherheit eines Menschen steht dem entgegen.
>
> **Meldungen, und Bilder, die nicht dem gehören, der sie veröffentlicht hat**
>
> Wenn etwas, das in Purify veröffentlicht wurde, gegen das Gesetz oder diese
> Bedingungen verstößt oder dich oder einen Menschen in deiner Obhut ohne
> deine Zustimmung nennt, melde es auf seiner Seite oder schreib an
> support@purifyapp.net.
>
> Wenn ein Bild oder ein anderes Werk, das in Purify veröffentlicht wurde,
> dir gehört und ohne deine Erlaubnis verwendet wurde, schreib an
> legal@purifyapp.net mit:
>
> - deiner Unterschrift (dein vollständiger Name, getippt, genügt);
> - dem Werk, das dir gehört;
> - der Stelle, an der es in Purify steht (sein Link);
> - deinem Namen, deiner Postanschrift und deiner E-Mail-Adresse oder
>   Telefonnummer;
> - der Erklärung, dass du in gutem Glauben annimmst, dass die Verwendung
>   weder von dir noch von deinem Vertreter noch vom Gesetz erlaubt ist; und
> - der Erklärung, die das US-Recht unter Strafandrohung verlangt, dass deine
>   Angaben richtig sind und dass dir das Werk gehört oder du für seinen
>   Eigentümer handeln darfst.
>
> Wir nehmen das Werk herunter, während wir die Sache prüfen, und sagen es
> dem, der es veröffentlicht hat; er kann an legal@purifyapp.net
> zurückschreiben, wenn er es für einen Irrtum hält. Wer wiederholt Werke
> anderer ohne Erlaubnis veröffentlicht, dessen Konto schließen wir.

---

## The privacy page (English)

The campaigns paragraph is the campaigns chat's (4.7), with one phrase
changed and four sentences added, all marked. The Community paragraph is new.

> **Prayer campaigns.** A prayer campaign is public unless you keep it to a
> circle: its title, the first name of the person it is for, what you wrote,
> its pictures, its place if you gave one, your updates, and the name and
> picture on your profile. People's comments on it are public too. Give only
> what prayer needs: a first name is enough, and say nothing of another
> person's health or life that they have not agreed to share. Before a
> campaign for someone else is made, you are asked to affirm that they, or
> their family, have given their blessing, and we keep the day you did.
>
> Pictures are made again on our server before they are stored, which removes
> the place and the device a photo carries inside it, and a moderator looks at
> each one before it is shown. A place is a country and a town that you type;
> the app never asks where you are.
>
> Who has added a campaign to their prayers is never shown, to its creator or
> to anyone, and [changed: "nothing is counted in public"] no number of them
> is shown. If you are signed in, the campaigns you carry are kept with your
> account so they follow you to your other devices; if you are not, they are
> kept on your device alone. The name and the campaign's title are kept on
> your device while you carry it, and leave when it ends.
>
> You can end a campaign, remove a picture, close its comments, or take the
> whole campaign down at any time. Taking it down deletes it from our servers
> with its pictures, updates and comments, and it leaves other people's
> prayers the next time their app is online. A campaign for a living person is
> deleted thirty days after its last day unless you renew it. Deleting your
> account deletes your campaigns. [added] We may also remove a campaign, a
> picture or a comment that breaks our terms; one removed for that reason is
> kept, unseen, for thirty days in case of an appeal or a lawful request, and
> then deleted. [added] If you report a campaign, we keep the report, its
> reason and the account that made it, so a moderator can review it; it is
> deleted with the campaign, and if you delete your account first, it stays
> without your name.
>
> If a campaign names you, or someone in your care, and you did not agree to
> it, report it from its page or write to support@purifyapp.net and we will
> take it down. [added] If a picture in it is yours and was used without your
> permission, write to legal@purifyapp.net. [added] Our terms say what you
> agree to when you post.
>
> **Community.** Posts and replies in the Community are public: anyone can
> read them, in the apps and on our website, with the name and picture your
> profile had when you posted. Your profile is public too, its name, picture
> and banner, at its own address on our website. They are kept until you
> delete them, and deleting your account deletes them. Moderators may hide or
> remove a post or a reply that breaks our terms. If you report one, we keep
> the report and the account that made it so a moderator can review it; it is
> deleted with the post, and if you delete your account first, it stays
> without your name.

## The privacy page (German, "du")

> **Gebetskampagnen.** Eine Gebetskampagne ist öffentlich, es sei denn, du
> beschränkst sie auf einen Kreis: ihr Titel, der Vorname des Menschen, für
> den gebetet wird, dein Text, ihre Bilder, ihr Ort, falls du einen angibst,
> deine Neuigkeiten sowie der Name und das Bild deines Profils. Auch die
> Kommentare anderer sind öffentlich. Gib nur an, was das Gebet braucht: Ein
> Vorname genügt, und schreibe nichts über die Gesundheit oder das Leben eines
> anderen Menschen, dem er nicht zugestimmt hat. Bevor eine Kampagne für
> jemand anderen angelegt wird, bestätigst du, dass dieser Mensch oder seine
> Familie den Segen dazu gegeben hat, und wir speichern den Tag, an dem du das
> bestätigt hast.
>
> Bilder werden auf unserem Server neu erzeugt, bevor sie gespeichert werden.
> Dabei gehen der Ort und das Gerät verloren, die ein Foto in sich trägt, und
> ein Moderator sieht sich jedes Bild an, bevor es gezeigt wird. Ein Ort
> besteht aus einem Land und einer Stadt, die du selbst eintippst; die App
> fragt nie, wo du bist.
>
> Wer eine Kampagne in seine Gebete aufgenommen hat, wird niemandem gezeigt,
> auch nicht dem, der sie angelegt hat, und [geändert] keine Zahl davon wird
> gezeigt. Bist du angemeldet, werden die Kampagnen, die du mitträgst, bei
> deinem Konto gespeichert, damit sie dir auf deine anderen Geräte folgen;
> bist du es nicht, bleiben sie allein auf deinem Gerät. Der Name und der
> Titel der Kampagne liegen auf deinem Gerät, solange du sie mitträgst, und
> verschwinden, wenn sie endet.
>
> Du kannst eine Kampagne jederzeit beenden, ein Bild entfernen, ihre
> Kommentare schließen oder die ganze Kampagne löschen. Beim Löschen wird sie
> mit ihren Bildern, Neuigkeiten und Kommentaren von unseren Servern entfernt,
> und sie verschwindet aus den Gebeten anderer, sobald deren App das nächste
> Mal online ist. Eine Kampagne für einen lebenden Menschen wird dreißig Tage
> nach ihrem letzten Tag gelöscht, wenn du sie nicht erneuerst. Wenn du dein
> Konto löschst, werden auch deine Kampagnen gelöscht. [neu] Auch wir dürfen
> eine Kampagne, ein Bild oder einen Kommentar entfernen, der gegen unsere
> Bedingungen verstößt; was wir deshalb entfernen, bewahren wir dreißig Tage
> lang unsichtbar auf, für einen Einspruch oder eine rechtmäßige Anfrage, und
> löschen es dann. [neu] Wenn du eine Kampagne meldest, speichern wir die
> Meldung, ihren Grund und das Konto, von dem sie kam, damit ein Moderator sie
> prüfen kann; sie wird mit der Kampagne gelöscht, und wenn du vorher dein
> Konto löschst, bleibt sie ohne deinen Namen.
>
> Nennt eine Kampagne dich oder einen Menschen in deiner Obhut, ohne dass du
> zugestimmt hast, melde sie auf ihrer Seite oder schreib an
> support@purifyapp.net, und wir nehmen sie herunter. [neu] Gehört dir ein
> Bild darin, das ohne deine Erlaubnis verwendet wurde, schreib an
> legal@purifyapp.net. [neu] Was du zusagst, wenn du etwas veröffentlichst,
> steht in unseren Nutzungsbedingungen.
>
> **Gemeinschaft.** Beiträge und Antworten in der Gemeinschaft sind
> öffentlich: Jeder kann sie lesen, in den Apps und auf unserer Website, mit
> dem Namen und dem Bild, die dein Profil hatte, als du sie geschrieben hast.
> Auch dein Profil ist öffentlich, sein Name, sein Bild und sein Titelbild,
> unter einer eigenen Adresse auf unserer Website. Sie bleiben, bis du sie
> löschst, und wenn du dein Konto löschst, werden sie gelöscht. Moderatoren
> dürfen einen Beitrag oder eine Antwort ausblenden oder entfernen, der gegen
> unsere Bedingungen verstößt. Wenn du einen meldest, speichern wir die
> Meldung und das Konto, von dem sie kam, damit ein Moderator sie prüfen
> kann; sie wird mit dem Beitrag gelöscht, und wenn du vorher dein Konto
> löschst, bleibt sie ohne deinen Namen.

---

## What each added sentence rests on

So nothing is promised that the build does not do. The campaigns chat's own
list (4.7) covers its sentences.

- **Readers' posts are public:** `community_posts` and its replies are read
  with the public key, visible rows only
  (`supabase/migrations/20260722000000_community.sql`, its header), and the
  name and picture are copies made when the post is written (same header).
- **The profile's own address:** `app/(app)/u/[handle]/page.tsx`
  (purifyapp.net/u/<handle>, on the website; in the apps a profile opens
  over Community).
- **Deleting the account deletes posts and replies:** both tables cascade
  from `auth.users` (same file, lines 14 and 45).
- **Reports are deleted with what they report, and keep no name after the
  reporter's account goes:** `community_reports` cascades from the post and
  the reply and sets the reporter to null
  (`20260801000100_community_safety.sql`); `prayer_campaign_reports`
  cascades from the campaign and sets the reporter to null
  (`20260713000200_prayer_campaigns.sql`).
- **A campaign removed for breaking the rules, kept unseen for thirty days:**
  the campaigns chat's design (4.4). True once their upkeep does it, as 4.7
  says of its own thirty days.
- **"No number of them is shown"** in place of "nothing is counted in
  public": "Prayed by many" may ship with 1.9 (his word of 15:50 UTC,
  everything in 1.9), and it rests on a count even though it shows none. The
  campaigns chat should confirm it shows no number.
- **We tell a poster why we removed something:** a promise the panel has to
  keep. Today Community's removal writes the moderators' log; a message to
  the poster is to be built with this, or the sentence waits for it.
- **Not the poster's own:** the legal@ inbox exists (the 1.9 contact sweep).
