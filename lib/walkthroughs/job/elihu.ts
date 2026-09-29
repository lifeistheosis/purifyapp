// Job 32 to 37: Elius, the young fourth voice. He says true things with too
// much confidence, and St. Gregory weighs both; in the end his talk of
// thunder sets the stage for the whirlwind. Father lines are verbatim from
// St. Gregory the Great's Morals on the Book of Job (Oxford, 1844), held to
// the corpus by lib/walkthroughs/__tests__/job.test.ts.

import type { ChapterWalk } from "../types";

export const ELIHU: ChapterWalk[] = [
  {
    n: 32,
    title: "A fourth voice",
    movement: "elihu",
    cards: [
      {
        id: "job-32-2",
        verse: 2,
        title: "A fourth voice",
        hook: "A new voice: young Elius, angry at Job for justifying himself, and at the friends for condemning him.",
        body: "Elius has listened to thirty chapters and found both sides wanting: Job justified himself before the Lord, and the friends condemned a man they could not answer. He is not wrong on either count. The question is whether he can do better.",
        question: "When both sides of a quarrel are wrong, how can you speak without becoming a third wrong?",
        art: "friends",
        father: {
          verse: 2,
          index: 0,
          excerpt: "For the gifts which they have received they render contemptible, by not knowing how to use them rightly.",
        },
      },
      {
        id: "job-32-8",
        verse: 8,
        title: "Wisdom is breathed, not earned",
        hook: "Elius says wisdom comes not from age but from the Spirit of God. True, and dangerous to claim for yourself.",
        body: "Elius is right that age alone does not make anyone wise: understanding is God's gift, breathed into us. St. Gregory's warning is that he claims the gift as his own. What we have received we can only hold humbly, as received (1 Corinthians 4:7).",
        question: "Which gift of yours do you most need to remember was given?",
        art: "lamp",
        father: {
          verse: 8,
          index: 0,
          excerpt: "He would be right in saying this, did he not arrogate to himself this same wisdom above all others.",
        },
      },
      {
        id: "job-32-19",
        verse: 19,
        title: "Bursting with words",
        hook: "Elius says he is so full of words he will burst like a new wineskin if he does not speak.",
        body: "It is an honest, almost comic confession. Some speech comes from God; some comes from the pressure of our own opinions. The Desert Fathers counselled holding the tongue exactly when we are bursting to speak, until we know which it is.",
        question: "Before you speak today, can you ask whether the words are God's or only yours?",
        art: "wild",
        father: {
          verse: 17,
          index: 0,
          excerpt:
            "For every proud man considers this to be his part, if he does not so much possess, as make a show of, knowledge.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "The three friends cease answering Job.", verse: 1 },
      { id: "b2", text: "Elius the son of Barachiel is angered.", verse: 2 },
      { id: "b3", text: "He says he kept silence because he was younger.", verse: 6 },
      { id: "b4", text: "He says the inspiration of the Almighty teaches.", verse: 8 },
      { id: "b5", text: "He says he is full of words like a skin of sweet wine.", verse: 19 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "I am younger in age, and ye are elder",
        verse: 6,
        speaker: "elihu",
        choices: ["elihu", "job", "sophar"],
      },
      {
        id: "a2",
        quote: "for I am full of words",
        verse: 18,
        speaker: "elihu",
        choices: ["baldad", "elihu", "eliphaz"],
      },
    ],
    prompt: "Elius was bursting to speak. Write about a time when holding your tongue was the wiser gift.",
  },
  {
    n: 33,
    title: "God speaks in the night",
    movement: "elihu",
    cards: [
      {
        id: "job-33-15",
        verse: 15,
        title: "God speaks in the night",
        hook: "Elius says God speaks once, twice, in dreams and in the quiet of the night, to turn us back.",
        body: "Elius offers something new: suffering and silence can be God's speech, not His absence. The Fathers commend exactly this stillness, which they call hesychia. When the noise stops, the heart can finally hear what God has been saying all along.",
        question: "When did you last give God ten quiet minutes with no noise at all?",
        art: "night",
        father: {
          verse: 15,
          index: 0,
          excerpt:
            "The voice of God, in truth, is heard as if in dreams, when, with minds at ease, we rest from the bustle of this world, and the Divine precepts are pondered by us in the deep silence of the mind.",
        },
      },
      {
        id: "job-33-23",
        verse: 23,
        title: "Declaring the fault",
        hook: "Our Septuagint says a man is spared when he turns to the Lord and declares his fault to man.",
        body: "Where the Hebrew speaks of an angel who interprets, our Septuagint speaks of repentance spoken aloud: turning to the Lord and declaring one's fault to another. The Church keeps this in the mystery of confession: sin confessed before Christ, with the priest as witness, is loosed.",
        question: "Is there a fault you have been carrying that you need to speak aloud in confession?",
        art: "altar",
        father: {
          verse: 17,
          index: 0,
          excerpt: "It is rightly said, then, that when man is withdrawn from what he has done, he is freed from pride.",
        },
      },
      {
        id: "job-33-27",
        verse: 27,
        title: "Not as our sins deserve",
        hook: "The restored man looks back and says: He has not punished me as my sins deserved.",
        body: "This is the voice of every penitent who has been forgiven. The psalm sung at the beginning of the Divine Liturgy says the same: He has not dealt with us according to our sins (Psalm 102:10). Mercy is always larger than the debt.",
        question: "Looking back, where has God been kinder to you than you deserved?",
        art: "restored",
      },
    ],
    beats: [
      { id: "b1", text: "Elius tells Job to hear his words.", verse: 1 },
      { id: "b2", text: "He says they were both formed out of clay.", verse: 6 },
      { id: "b3", text: "He says God speaks in dreams of the night.", verse: 15 },
      { id: "b4", text: "He says God chastens a man with sickness.", verse: 19 },
      { id: "b5", text: "He says the one delivered will see the light.", verse: 28 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Thou art formed out of the clay as also I",
        verse: 6,
        speaker: "elihu",
        choices: ["elihu", "job", "lord"],
      },
      {
        id: "a2",
        quote: "be silent, and I will speak",
        verse: 31,
        speaker: "elihu",
        choices: ["eliphaz", "elihu", "sophar"],
      },
    ],
    prompt: "Elius said God speaks in the quiet of the night. Write what you hear when you finally sit in silence.",
  },
  {
    n: 34,
    title: "Nothing escapes Him",
    movement: "elihu",
    cards: [
      {
        id: "job-34-14",
        verse: 14,
        title: "If He withheld His breath",
        hook: "Elius says that if God held back His spirit for a moment, all flesh would die together.",
        body: "Elius speaks a truth the Church sings at every Vespers: we live because God breathes life into us, moment by moment. Thou wilt take away their breath, and they shall fail (Psalm 103:29). Existence itself is a gift, renewed each moment.",
        question: "What would change today if you received each breath as a gift?",
        art: "stars",
        father: {
          verse: 13,
          index: 0,
          excerpt:
            "For He governs indeed by Himself the world which He created by Himself: nor does He need the aid of others in governing, Who needed it not for creating.",
        },
      },
      {
        id: "job-34-21",
        verse: 21,
        title: "Nothing escapes Him",
        hook: "Elius says God surveys every work of man, and nothing escapes Him.",
        body: "It sounds like a threat, and for the unrepentant it is. For the suffering it is comfort: the God who sees every deed also sees every tear. His slowness to judge is not blindness but patience, giving room for repentance.",
        question: "Is it comfort or fear you feel when you remember that God sees everything?",
        art: "lamp",
        father: {
          verse: 21,
          index: 0,
          excerpt:
            "God was supposed not to behold the deeds of the ungodly, because He was delaying to condemn them justly; and His great forbearance was regarded as a kind of carelessness.",
        },
      },
      {
        id: "job-34-32",
        verse: 32,
        title: "Show me, and I will stop",
        hook: "Elius sketches the humble prayer: show me if I have done wrong, and I will not do it again.",
        body: "Elius gets this right. The penitent does not argue his case but asks to be shown: teach me what I cannot see. It echoes the Psalmist, purge thou me from my secret sins (Psalm 18:12), a prayer worth praying daily.",
        question: "What would you ask God to show you that you cannot see in yourself?",
        art: "altar",
        father: {
          verse: 18,
          index: 1,
          excerpt:
            "Every one, who is required to correct the vices of others, ought first of all to look carefully into himself;",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Elius calls on the wise to hear him.", verse: 2 },
      { id: "b2", text: "He says Job claims to be righteous.", verse: 5 },
      { id: "b3", text: "He says all flesh would die if God withdrew His spirit.", verse: 14 },
      { id: "b4", text: "He says God hears the cry of the poor.", verse: 28 },
      { id: "b5", text: "He says Job has not spoken with understanding.", verse: 35 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "for he will hear the cry of the poor",
        verse: 28,
        speaker: "elihu",
        choices: ["job", "elihu", "lord"],
      },
      {
        id: "a2",
        quote: "But Job has not spoken with understanding",
        verse: 35,
        speaker: "elihu",
        choices: ["eliphaz", "elihu", "lord"],
      },
    ],
    prompt: "Elius described the prayer of a humble heart: show me what I cannot see. Write that prayer in your own words.",
  },
  {
    n: 35,
    title: "Praise even now",
    movement: "elihu",
    cards: [
      {
        id: "job-35-7",
        verse: 7,
        title: "What can we give God?",
        hook: "Elius reminds Job that God gains nothing from our righteousness and loses nothing by our sin.",
        body: "God needs nothing from us. Our goodness does not enrich Him, and our sin does not wound His being. It lands on people like us. That is why the Fathers say the commandments are for our healing, given not for God's sake but for ours.",
        question: "If God needs nothing from you, why do you think He still asks for your heart?",
        art: "stars",
        father: {
          verse: 8,
          index: 0,
          excerpt:
            "The iniquity of man hurts him, whom it pollutes by perversion. And, again, our righteousness profits him, whom it converts from his wickedness.",
        },
      },
      {
        id: "job-35-10",
        verse: 10,
        title: "Where is God my Maker?",
        hook: "Elius says the oppressed cry out for help, yet no one asks: Where is God my Maker?",
        body: "Elius notices something true about suffering: we cry for relief before we cry for God. The deeper prayer asks not only for the pain to end but for the One who made us, who keeps even the watches of the night.",
        question: "In your hardest moment lately, did you ask for relief, or for God Himself?",
        art: "night",
        father: {
          verse: 10,
          index: 0,
          excerpt: "For, whoever is crushed by the tribulation of adversities, does not look at Him, by Whom He was made.",
        },
      },
      {
        id: "job-35-14",
        verse: 14,
        title: "Praise even now",
        hook: "Elius urges Job to praise God even now, in the middle of it.",
        body: "Elius's best counsel is short: praise Him, as it is possible even now. The Church keeps this practice. St. John Chrysostom died saying, Glory to God for all things, and the words became a prayer for every sorrow.",
        question: "What could you thank God for today, even now?",
        art: "lamp",
        father: {
          verse: 14,
          index: 0,
          excerpt:
            "But when this storm of despair agitates us, our disordered mind sooner takes shelter in the harbour of hope, if it weighs accurately its causes with the Lord;",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Elius asks Job who he is to call himself righteous.", verse: 2 },
      { id: "b2", text: "He asks what Job's sin could do to God.", verse: 5 },
      { id: "b3", text: "He says no one asks, Where is God my Maker?", verse: 10 },
      { id: "b4", text: "He urges Job to praise God even now.", verse: 14 },
      { id: "b5", text: "He says Job multiplies words in ignorance.", verse: 16 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Look up to the sky and see",
        verse: 4,
        speaker: "elihu",
        choices: ["elihu", "lord", "job"],
      },
      {
        id: "a2",
        quote: "in ignorance he multiplies words",
        verse: 16,
        speaker: "elihu",
        choices: ["lord", "elihu", "baldad"],
      },
    ],
    prompt: "Elius told Job to praise God even now. Write a short thanksgiving from where you are today.",
  },
  {
    n: 36,
    title: "His eyes on the righteous",
    movement: "elihu",
    cards: [
      {
        id: "job-36-7",
        verse: 7,
        title: "His eyes on the righteous",
        hook: "Elius says God never turns His eyes away from the righteous, even when it seems He has.",
        body: "This is Elius at his best, and it answers Job's fear that God has looked away. God's eyes stay on the righteous, especially in their suffering. The Psalmist says it too: The eyes of the Lord are over the righteous (Psalm 33:15).",
        question: "Where do you most need to trust that God has not looked away?",
        art: "lamp",
        father: {
          verse: 7,
          index: 0,
          excerpt: "But He then more regards His servants, when the iniquity of their persecutor unjustly afflicts them.",
        },
      },
      {
        id: "job-36-10",
        verse: 10,
        title: "The prayer that waits",
        hook: "Elius insists God hears the righteous. The saints add that He sometimes answers by waiting.",
        body: "It does not always feel as if God hears. The saints learned that delay is often part of the answer: a prayer deferred can be a prayer being prepared, like seed that must wait in the ground before it rises.",
        question: "Which prayer of yours might God be answering by making you wait?",
        art: "tree",
        father: {
          verse: 13,
          index: 0,
          excerpt:
            "For our desires are often heard, because they are not speedily granted: and that, which we wish to be soon fulfilled, is the better prospered by the very delay.",
        },
      },
      {
        id: "job-36-27",
        verse: 27,
        title: "Every drop numbered",
        hook: "Elius turns to the sky: God numbers every drop of rain. A storm is gathering.",
        body: "Elius turns from argument to weather: rain counted drop by drop, clouds spread over the earth, thunder in the distance. Without knowing it he is setting the stage. The Lord Himself is about to speak out of the storm.",
        question: "When did something small in creation remind you that God is near?",
        art: "sea",
        father: {
          verse: 25,
          index: 0,
          excerpt:
            "For, to behold Him afar off, is to behold Him at present not in Person, but to think of Him as yet, solely from admiration of His works.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Elius asks Job to wait, for he has more to say.", verse: 2 },
      { id: "b2", text: "He says the Lord will not cast off an innocent man.", verse: 5 },
      { id: "b3", text: "He says God does not turn His eyes from the righteous.", verse: 7 },
      { id: "b4", text: "He asks who is powerful as the Mighty One.", verse: 22 },
      { id: "b5", text: "He says God numbers the drops of rain.", verse: 27 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "the Lord will not cast off an innocent man",
        verse: 5,
        speaker: "elihu",
        choices: ["elihu", "eliphaz", "lord"],
      },
      {
        id: "a2",
        quote: "Wait for me yet a little while, that I may teach thee",
        verse: 2,
        speaker: "elihu",
        choices: ["baldad", "elihu", "sophar"],
      },
    ],
    prompt: "Elius said God's eyes never leave the righteous. Write where you have seen God's attention in your life.",
  },
  {
    n: 37,
    title: "Stand still and consider",
    movement: "elihu",
    cards: [
      {
        id: "job-37-5",
        verse: 5,
        title: "The voice in the thunder",
        hook: "Elius hears God's voice in the thunder. The storm he describes is about to break.",
        body: "Elius describes God's voice in thunder moments before God speaks from the whirlwind. Scripture often joins the two: at Sinai, and in John's Gospel, when the Father answered Christ from heaven and the crowd said it thundered (John 12:29).",
        question: "Where might God be speaking to you in something loud that you have called only noise?",
        art: "whirlwind",
        father: {
          verse: 5,
          index: 0,
          excerpt:
            "God thunders marvellously with His voice, because He penetrates our hearts incomprehensibly with His secret might.",
        },
      },
      {
        id: "job-37-7",
        verse: 7,
        title: "To know our weakness",
        hook: "Our Septuagint says God stills every hand in the storm, so that each may know his own weakness.",
        body: "When snow and rain stop all work, even the strongest must sit still. Elius sees a lesson in it: weakness known is the beginning of wisdom. Christ told St. Paul the same: My strength is made perfect in weakness (2 Corinthians 12:9).",
        question: "What weakness of yours has taught you the most about God?",
        art: "wild",
        father: {
          verse: 7,
          index: 0,
          excerpt:
            "because when the Virtue of His Incomprehensible Majesty is acknowledged, his own life is weighed more carefully by each person.",
        },
      },
      {
        id: "job-37-14",
        verse: 14,
        title: "Stand still and consider",
        hook: "Elius's last charge to Job is the right one: stand still, and consider the power of the Lord.",
        body: "After all his talk, Elius ends well. Stop, stand still, and look at the works of God. It is exactly what God is about to do with Job: not argue, but show him the world. Wonder is where the answer begins.",
        question: "When did you last stop and simply wonder at something God made?",
        art: "stars",
        father: {
          verse: 14,
          index: 0,
          excerpt:
            "For there are some who consider the wondrous works of God, but lying down; because they do not follow and admire the power of His doings.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Elius says his heart is troubled at the storm.", verse: 1 },
      { id: "b2", text: "He says the Mighty One thunders wonderfully.", verse: 5 },
      { id: "b3", text: "He says God seals every man's hand, so he may know his weakness.", verse: 7 },
      { id: "b4", text: "He tells Job to stand still and consider God's power.", verse: 14 },
      { id: "b5", text: "He says golden clouds come from the north.", verse: 22 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "stand still, and be admonished of the power of the Lord",
        verse: 14,
        speaker: "elihu",
        choices: ["elihu", "lord", "eliphaz"],
      },
      {
        id: "a2",
        quote: "From the north come the clouds shining like gold",
        verse: 22,
        speaker: "elihu",
        choices: ["job", "elihu", "lord"],
      },
    ],
    prompt: "Elius told Job to stand still and consider the works of God. Look outside for a minute, then write what you saw.",
  },
];
