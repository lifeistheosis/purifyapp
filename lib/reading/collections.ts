import type { CollectionSlug } from "./feelings";
import { workHref } from "./workHref";

/**
 * The Purify collections (1.8): passages gathered on one subject, each copied
 * letter for letter from a text the app already carries, with its exact place
 * and an address that opens it there. The room's row by feeling opens them
 * (lib/reading/feelings.ts, components/reading/FeelingsRow.tsx), and each has
 * its own calm page (app/(app)/reading/collections/[slug]).
 *
 * WHAT A PASSAGE IS. Scripture is whole verses of the app's own Bible, the
 * King James New Testament and Brenton's Old Testament (data/bible), named by
 * book, chapter and verses, and its text is those verses joined by a space. A
 * passage of the Fathers is whole sentences of one paragraph of a work in the
 * library (data/saints), named by the work, its section (`Section.n`) and the
 * paragraph's place in it, which is also where it opens
 * (components/saints/WritingReader.tsx, `#p-<section>-<paragraph>`). The
 * author, the work's title and the section's title are read from the
 * registry and the work itself when the page is built, never typed here.
 *
 * NOTHING IS OURS. No passage is paraphrased, shortened inside or put
 * together from two places, and none comes from a section that is Purify's
 * own prose. lib/reading/__tests__/collections.test.ts holds every passage to
 * its source, letter for letter, and to whole verses and whole sentences.
 * The choice of passages and each collection's line of introduction are ours,
 * and wait for a future clergy review (./feelings.ts, COLLECTIONS_REVIEW).
 */

export type ScripturePassage = {
  kind: "scripture";
  /** data/bible/<book> */
  book: string;
  chapter: number;
  /** The first verse, and the last of a run of them. */
  from: number;
  to?: number;
  text: string;
};

export type FatherPassage = {
  kind: "father";
  /** The saint whose page the work is on: /saints/<saint>/<work>. */
  saint: string;
  work: string;
  /** Section.n */
  section: number;
  /** The paragraph's index in the section. */
  paragraph: number;
  text: string;
};

export type Passage = ScripturePassage | FatherPassage;

/** Whole verses: [from] or [from, to]. */
function s(book: string, chapter: number, verses: readonly number[], text: string): ScripturePassage {
  const [from, to] = verses;
  return { kind: "scripture", book, chapter, from, ...(to !== undefined && to !== from ? { to } : {}), text };
}

function f(key: `${string}/${string}`, section: number, paragraph: number, text: string): FatherPassage {
  const [saint, work] = key.split("/");
  return { kind: "father", saint, work, section, paragraph, text };
}

/** Where a passage opens: the verses in the Bible, the paragraph in its work. */
export function passageHref(p: Passage): string {
  if (p.kind === "scripture") {
    return `/bible/${p.book}/${p.chapter}#v${p.from}${p.to !== undefined ? `-${p.to}` : ""}`;
  }
  return `${workHref(p.saint, p.work)}#p-${p.section}-${p.paragraph}`;
}

export const PASSAGES: Readonly<Record<CollectionSlug, readonly Passage[]>> = {
  love: [
    s("1-corinthians", 13, [4, 7],
      "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil; Rejoiceth not in iniquity, but rejoiceth in the truth; Beareth all things, believeth all things, hopeth all things, endureth all things."),
    s("1-john", 4, [7, 8],
      "Beloved, let us love one another: for love is of God; and every one that loveth is born of God, and knoweth God. He that loveth not knoweth not God; for God is love."),
    f("john-chrysostom/homilies-on-1-corinthians", 32, 42,
      "But love along with the gain hath great pleasure, too, and no trouble, and like an industrious bee, gathering the sweets from every flower, deposits them in the soul of him who loveth."),
    f("ignatius-of-antioch/epistle-to-the-ephesians", 15, 0,
      "None of these things is hid from you, if ye perfectly possess that faith and love towards Christ Jesus which are the beginning and the end of life. For the beginning is faith, and the end is love. Now these two, being inseparably connected together, are of God, while all other things which are requisite for a holy life follow after them. No man truly making a profession of faith sinneth; nor does he that possesses love hate any one."),
    s("john", 15, [12, 13],
      "This is my commandment, That ye love one another, as I have loved you. Greater love hath no man than this, that a man lay down his life for his friends."),
    f("john-chrysostom/homilies-on-1-corinthians", 33, 40,
      "For love is a great teacher, and able both to withdraw men from error, and to reform the character, and to lead them by the hand unto self-denial, and out of stones to make men."),
    s("song-of-solomon", 8, [6, 7],
      "Set me as a seal upon thy heart, as a seal upon thine arm; for love is strong as death; jealousy is cruel as the grave, her shafts are shafts of fire, even the flames thereof. Much water will not be able to quench love, and rivers shall not drown it; if a man would give all his substance for love, men would utterly despise it."),
    f("john-cassian/conferences", 320, 0,
      "Finally so highly is the virtue of love extolled that the blessed Apostle John declares that it not only belongs to God but that it is God, saying: \"God is love: he therefore that abideth in love, abideth in God, and God in him.\""),
    s("1-john", 4, [19],
      "We love him, because he first loved us."),
    s("romans", 8, [38, 39],
      "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord."),
  ],
  anger: [
    s("psalms", 4, [4],
      "Be ye angry, and sin not; feel compunction upon your beds for what ye say in your hearts. Pause."),
    s("ephesians", 4, [26, 27],
      "Be ye angry, and sin not: let not the sun go down upon your wrath: Neither give place to the devil."),
    s("james", 1, [19, 20],
      "Wherefore, my beloved brethren, let every man be swift to hear, slow to speak, slow to wrath: For the wrath of man worketh not the righteousness of God."),
    f("john-cassian/institutes", 173, 1,
      "The chief part then of our improvement and peace of mind must not be made to depend on another's will, which cannot possibly be subject to our authority, but it lies rather in our own control. And so the fact that we are not angry ought not to result from another's perfection, but from our own virtue, which is acquired, not by somebody else's patience, but by our own long-suffering."),
    f("john-cassian/institutes", 177, 1,
      "For the end and aim of patience consists, not in being angry with a good reason, but in not being angry at all."),
    f("gregory-the-dialogist/morals-on-the-book-of-job", 5, 131,
      "We must above all things know, that as often as we restrain the turbulent motions of the mind under the virtue of mildness, we are essaying to return to the likeness of our Creator. For when the peace of the mind is lashed with Anger, torn and rent, as it were, it is thrown into confusion, so that it is not in harmony with itself, and loses the force of the inward likeness. Let us consider then how great the sin of Anger is, by which, while we part with mildness, the likeness of the image of the Most High is spoilt."),
    f("john-chrysostom/homilies-on-hebrews", 22, 28,
      "Anger especially is a fire, a flame; it catches, destroys, consumes; let us quench it, by longsuffering, by forbearance."),
    s("proverbs", 16, [32],
      "A man slow to anger is better than a strong man; and he that governs his temper better than he that takes a city."),
    f("gregory-the-dialogist/morals-on-the-book-of-job", 5, 134,
      "But the second method of preserving mildness is that, when we regard the transgression of others, we have an eye to our own offences, by which we have done wrong in the case of others. For our own frailty, being considered makes excuse for the ills done us by others. Since that man bears with patience an injury that is offered him, who with right feeling remembers that perchance there may still be somewhat, in which he himself has need to be borne with. And it is as if fire were extinguished by water, when upon rage rising up in the mind each person recalls his own misdoings to his recollection; for he is ashamed not to spare offences, who recollects that he has himself often committed offences, whether against God or against his neighbour, which need to be spared."),
    f("john-cassian/conferences", 314, 0,
      "As then nothing should be put before love, so on the other hand nothing should be put below rage and anger. For all things, however useful and necessary they seem, should yet be disregarded that disturbing anger may be avoided, and all things even which we think are unfortunate should be undertaken and endured that the calm of love and peace may be preserved unimpaired, because we should reckon nothing more damaging than anger and vexation, and nothing more advantageous than love."),
  ],
  hatred: [
    s("leviticus", 19, [17, 18],
      "Thou shalt not hate thy brother in thine heart: thou shalt in any wise rebuke thy neighbour, so thou shalt not bear sin on his account. And thy hand shall not avenge thee; and thou shalt not be angry with the children of thy people; and thou shalt love thy neighbour as thyself; I am the Lord."),
    s("proverbs", 10, [12],
      "Hatred stirs up strife; but affection covers all that do not love strife."),
    s("matthew", 5, [43, 45],
      "Ye have heard that it hath been said, Thou shalt love thy neighbour, and hate thine enemy. But I say unto you, Love your enemies, bless them that curse you, do good to them that hate you, and pray for them which despitefully use you, and persecute you; That ye may be the children of your Father which is in heaven: for he maketh his sun to rise on the evil and on the good, and sendeth rain on the just and on the unjust."),
    f("john-chrysostom/homilies-on-matthew", 18, 27,
      "For He said not, \"do not hate,\" but \"love;\" He said not, \"do not injure,\" but \"do good.\""),
    f("john-chrysostom/homilies-on-matthew", 18, 29,
      "Seest thou how many steps He hath ascended, and how He hath set us on the very summit of virtue? Nay, mark it, numbering from the beginning. A first step is, not to begin with injustice: a second, after he hath begun, to vindicate one's self by equal retaliation; a third, not to do unto him that is vexing us the same that one hath suffered, but to be quiet; a fourth, even to give one's self up to suffer wrongfully; a fifth, to give up yet more than the other, who did the wrong, wishes; a sixth, not to hate him who hath done so; a seventh, even to love him; an eighth, to do him good also; a ninth, to entreat God Himself on his behalf."),
    f("augustine-of-hippo/sermon-on-the-mount", 42, 0,
      "For hatred is inveterate anger, which, as it were simply by its long duration, has acquired so great strength as to be justly called a beam. Now, it may happen that, though you are angry with a man, you wish him to be turned from his error; but if you hate a man, you cannot wish to convert him."),
    f("john-cassian/institutes", 171, 1,
      "But why should we spend any more time over evangelic and apostolic precepts, when even the old law, which is thought to be somewhat slack, guards against the same thing, when it says, \"Thou shalt not hate thy brother in thine heart;\" and again, \"Be not mindful of the injury of thy citizens;\" and again, \"The ways of those who preserve the recollection of wrongs are towards death\"? You see there too that wickedness is restrained not only in action, but also in the secret thoughts, since it is commanded that hatred be utterly rooted out from the heart, and not merely retaliation for, but the very recollection of, a wrong done."),
    s("sirach", 28, [2, 5],
      "Forgive thy neighbour the hurt that he hath done unto thee, so shall thy sins also be forgiven when thou prayest. One man beareth hatred against another, and doth he seek pardon from the Lord? He sheweth no mercy to a man, which is like himself: and doth he ask forgiveness of his own sins? If he that is but flesh nourish hatred, who will intreat for pardon of his sins?"),
    s("1-john", 4, [20, 21],
      "If a man say, I love God, and hateth his brother, he is a liar: for he that loveth not his brother whom he hath seen, how can he love God whom he hath not seen? And this commandment have we from him, That he who loveth God love his brother also."),
    s("romans", 12, [20, 21],
      "Therefore if thine enemy hunger, feed him; if he thirst, give him drink: for in so doing thou shalt heap coals of fire on his head. Be not overcome of evil, but overcome evil with good."),
  ],
  fear: [
    s("psalms", 26, [1],
      "The Lord is my light and my Saviour; whom shall I fear? the Lord is the defender of my life; of whom shall I be afraid?"),
    s("isaiah", 41, [10],
      "Fear not; for I am with thee: wander not; for I am thy God, who have strengthened thee; and I have helped thee, and have established thee with my just right hand."),
    s("matthew", 6, [34],
      "Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof."),
    f("john-chrysostom/homilies-on-matthew", 22, 20,
      "Let us not therefore be anxious, for we shall gain nothing by it, but tormenting ourselves. For whereas He gives both when we take thought, and when we do not, and more of the two, when we do not; what dost thou gain by thy anxiety, but to exact of thyself a superfluous penalty?"),
    f("john-chrysostom/homilies-on-matthew", 22, 33,
      "Why, thou hast received the day, to care for the things thereof. Wherefore then add unto it the things of the other day also? Hath it not then burden enough in its own anxiety? Why now, I pray, dost thou make it yet heavier?"),
    s("matthew", 10, [29, 31],
      "Are not two sparrows sold for a farthing? and one of them shall not fall on the ground without your Father. But the very hairs of your head are all numbered. Fear ye not therefore, ye are of more value than many sparrows."),
    s("philippians", 4, [6, 7],
      "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus."),
    f("cyprian-of-carthage/on-the-mortality", 2, 0,
      "What room is there here for anxiety and solicitude? Who, in the midst of these things, is trembling and sad, except he who is without hope and faith? For it is for him to fear death who is not willing to go to Christ. It is for him to be unwilling to go to Christ who does not believe that he is about to reign with Christ."),
    s("1-john", 4, [18],
      "There is no fear in love; but perfect love casteth out fear: because fear hath torment. He that feareth is not made perfect in love."),
  ],
  grief: [
    s("matthew", 5, [4],
      "Blessed are they that mourn: for they shall be comforted."),
    s("john", 11, [35],
      "Jesus wept."),
    f("john-chrysostom/homilies-on-john", 63, 13,
      "Why doth the Evangelist carefully in several places mention that \"He wept,\" and that, \"He groaned\"? That thou mayest learn that He had of a truth put on our nature."),
    s("1-thessalonians", 4, [13, 14],
      "But I would not have you to be ignorant, brethren, concerning them which are asleep, that ye sorrow not, even as others which have no hope. For if we believe that Jesus died and rose again, even so them also which sleep in Jesus will God bring with him."),
    f("john-chrysostom/homilies-on-1-thessalonians", 7, 1,
      "There are many things which from ignorance alone cause us sorrow, so that if we come to understand them well, we banish our grief."),
    s("wisdom", 3, [1, 3],
      "But the souls of the righteous are in the hand of God, and there shall no torment touch them. In the sight of the unwise they seemed to die: and their departure is taken for misery, And their going from us to be utter destruction: but they are in peace."),
    f("cyprian-of-carthage/on-the-mortality", 20, 0,
      "To myself also, the very least and last, how often has it been revealed, how frequently and manifestly has it been commanded by the condescension of God, that I should diligently bear witness and publicly declare that our brethren who are freed from this world by the Lord’s summons are not to be lamented, since we know that they are not lost, but sent before; that, departing from us, they precede us as travellers, as navigators are accustomed to do; that they should be desired, but not bewailed; that the black garments should not be taken upon us here, when they have already taken upon them white raiment there; that occasion should not be given to the Gentiles for them deservedly and rightly to reprehend us, that we mourn for those, who, we say, are alive with God, as if they were extinct and lost; and that we do not approve with the testimony of the heart and breast the faith which we express with speech and word."),
    f("john-chrysostom/homilies-on-1-corinthians", 41, 45,
      "For in truth one body are we all, though some members are more glorious than others; and it is possible from every source to gather pardon for them, from our prayers, from our gifts in their behalf, from those whose names are named with theirs. Why therefore dost thou grieve? Why mourn, when it is in thy power to gather so much pardon for the departed?"),
    s("psalms", 146, [3],
      "He heals the broken in heart, and binds up their wounds."),
    s("revelation", 21, [4],
      "And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away."),
  ],
  envy: [
    s("wisdom", 2, [23, 24],
      "For God created man to be immortal, and made him to be an image of his own eternity. Nevertheless through envy of the devil came death into the world: and they that do hold of his side do find it."),
    s("proverbs", 27, [4],
      "Wrath is merciless, and anger sharp: but envy can bear nothing."),
    f("john-of-damascus/exact-exposition-of-the-orthodox-faith", 28, 0,
      "There are four varieties of pain, viz., anguish, grief, envy, pity. Anguish is pain without utterance: grief is pain that is heavy to bear like a burden: envy is pain over the good fortune of others: pity is pain over the evil fortune of others."),
    f("gregory-the-dialogist/morals-on-the-book-of-job", 5, 138,
      "For it is impossible for us to envy any but those, whom we think to be better than ourselves in some respect. And so he is ‘a little one,’ who is slain by jealousy. For he bears witness against his very own self, that he is less than him, by envy of whom he is tormented."),
    s("psalms", 36, [1],
      "Fret not thyself because of evil-doers, neither be envious of them that do iniquity."),
    s("james", 3, [14, 16],
      "But if ye have bitter envying and strife in your hearts, glory not, and lie not against the truth. This wisdom descendeth not from above, but is earthly, sensual, devilish. For where envying and strife is, there is confusion and every evil work."),
    s("romans", 12, [15],
      "Rejoice with them that do rejoice, and weep with them that weep."),
    f("john-chrysostom/homilies-on-romans", 7, 27,
      "For many weep with them that weep, but still do not rejoice with them that rejoice, but are in tears when others rejoice; now this comes of grudging and envy. The good deed then of rejoicing when our brother rejoices is no small one, but even greater than the other: and haply not only greater than weeping with them that weep, but even than standing by them that are in danger."),
    f("john-chrysostom/homilies-on-romans", 7, 28,
      "For envying is even worse than warring; since he that warreth, when the cause of the war is at an end, puts an end to his hatred also: but the grudger would never become a friend."),
    f("gregory-the-dialogist/morals-on-the-book-of-job", 5, 140,
      "Let him, then, who longs to be wholly and entirely void of the bane of envy, set his affections on that inheritance, which no number of fellowheirs serves to stint or shorten, which is both one to all and whole to each, which is shewn so much the larger, as the number of those that are vouchsafed it is enlarged for its reception. And so the lessening of envy is the feeling of inward sweetness arising, and the utter death of it is the perfect love of Eternity."),
  ],
  despondency: [
    s("psalms", 41, [11],
      "Wherefore art thou very sad, O my soul? and wherefore dost thou trouble me? hope in God; for I will give thanks to him; he is the health of my countenance, and my God."),
    f("john-cassian/institutes", 192, 1,
      "Our sixth combat is with what the Greeks call akedia, which we may term weariness or distress of heart. This is akin to dejection, and is especially trying to solitaries, and a dangerous and frequent foe to dwellers in the desert; and especially disturbing to a monk about the sixth hour, like some fever which seizes him at stated times, bringing the burning heat of its attacks on the sick man at usual and regular hours."),
    s("psalms", 90, [5, 6],
      "Thou shalt not be afraid of terror by night; nor of the arrow flying by day; nor of the evil thing that walks in darkness; nor of calamity, and the evil spirit at noon-day."),
    f("john-cassian/institutes", 193, 1,
      "Then besides this he looks about anxiously this way and that, and sighs that none of the brethren come to see him, and often goes in and out of his cell, and frequently gazes up at the sun, as if it was too slow in setting, and so a kind of unreasonable confusion of mind takes possession of him like some foul darkness, and makes him idle and useless for every spiritual work, so that he imagines that no cure for so terrible an attack can be found in anything except visiting some one of the brethren, or in the solace of sleep alone."),
    f("john-cassian/institutes", 216, 0,
      "When I was beginning my stay in the desert, and had said to Abbot Moses, the chief of all the saints, that I had been terribly troubled yesterday by an attack of accidie, and that I could only be freed from it by running at once to Abbot Paul, he said, \"You have not freed yourself from it, but rather have given yourself up to it as its slave and subject. For the enemy will henceforth attack you more strongly as a deserter and runaway, since it has seen that you fled at once when overcome in the conflict: unless on a second occasion when you join battle with it you make up your mind not to dispel its attacks and heats for the moment by deserting your cell, or by the inactivity of sleep, but rather learn to triumph over it by endurance and conflict.\" Whence it is proved by experience that a fit of accidie should not be evaded by running away from it, but overcome by resisting it."),
    s("matthew", 11, [28, 30],
      "Come unto me, all ye that labour and are heavy laden, and I will give you rest. Take my yoke upon you, and learn of me; for I am meek and lowly in heart: and ye shall find rest unto your souls. For my yoke is easy, and my burden is light."),
    f("john-chrysostom/homilies-on-colossians", 8, 35,
      "Nothing is holier than that tongue, which in evils giveth thanks to God; truly in no respect doth it fall short of that of martyrs; both are alike crowned, both this, and they. For over this one also stands the executioner to force it to deny God, by blasphemy; the devil stands over it, torturing it with executioner thoughts, darkening it with despondencies. If then one bear his griefs, and give thanks, he hath gained a crown of martyrdom."),
    f("john-cassian/institutes", 191, 0,
      "We should then be able to expel this most injurious passion from our hearts, so that by spiritual meditation we may keep our mind constantly occupied with hope of the future and contemplation of the promised blessedness."),
    s("galatians", 6, [9],
      "And let us not be weary in well doing: for in due season we shall reap, if we faint not."),
    s("2-corinthians", 4, [16, 18],
      "For which cause we faint not; but though our outward man perish, yet the inward man is renewed day by day. For our light affliction, which is but for a moment, worketh for us a far more exceeding and eternal weight of glory; While we look not at the things which are seen, but at the things which are not seen: for the things which are seen are temporal; but the things which are not seen are eternal."),
  ],
  loneliness: [
    s("psalms", 24, [16, 17],
      "Look upon me, and have mercy upon me; for I am an only child and poor. The afflictions of my heart have been multiplied; deliver me from my distresses."),
    s("psalms", 101, [6, 7],
      "I have become like a pelican of the wilderness; I have become like an owl in a ruined house. I have watched, and am become as a sparrow dwelling alone on a roof."),
    s("psalms", 141, [4, 5],
      "I looked on my right hand, and behold, for there was none that noticed me; refuge failed me; and there was none that cared for my soul. I cried unto thee, O Lord, and said, Thou art my hope, my portion in the land of the living."),
    s("john", 16, [32],
      "Behold, the hour cometh, yea, is now come, that ye shall be scattered, every man to his own, and shall leave me alone: and yet I am not alone, because the Father is with me."),
    f("cyril-of-alexandria/commentary-on-john", 952, 1,
      "For we are not alone; and, though we see no friend beside us, as I have just said, we have God Who is all powerful with us at our side, to aid and fight in the conflict, shielding us with all-sufficient succour, as the Psalmist says: With favour hast Thou encompassed us as with a shield!"),
    s("2-timothy", 4, [16, 17],
      "At my first answer no man stood with me, but all men forsook me: I pray God that it may not be laid to their charge. Notwithstanding the Lord stood with me, and strengthened me; that by me the preaching might be fully known, and that all the Gentiles might hear: and I was delivered out of the mouth of the lion."),
    f("john-chrysostom/homilies-on-2-timothy", 10, 18,
      "Though deserted by man, God doth not permit him to suffer any harm. He strengthened me, he says, that is, He gave me boldness in speaking. He suffered me not to sink."),
    s("matthew", 18, [20],
      "For where two or three are gathered together in my name, there am I in the midst of them."),
    f("john-chrysostom/homilies-on-acts", 26, 5,
      "Where Christ is in the midst, there is a great multitude. Where Christ is, there needs must Angels be, needs must Archangels also and the other Powers be there. Then ye are not alone, seeing ye have Him Who is Lord of all."),
    s("isaiah", 49, [15],
      "Will a woman forget her child, so as not to have compassion upon the offspring of her womb? but if a woman should even forget these, yet I will not forget thee, saith the Lord."),
  ],
};
