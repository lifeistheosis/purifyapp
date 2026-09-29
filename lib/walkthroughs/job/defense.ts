// Job 28 to 31: the hymn to wisdom, then Job's last defense: the life he
// remembers (29), the mockery he suffers (30), and the oath that closes his
// words (31). Father lines are verbatim from St. Gregory the Great's Morals
// on the Book of Job (Oxford, 1844), held to the corpus by
// lib/walkthroughs/__tests__/job.test.ts.

import type { ChapterWalk } from "../types";

export const WISDOM_AND_DEFENSE: ChapterWalk[] = [
  {
    n: 28,
    title: "Where is wisdom found?",
    movement: "wisdom",
    cards: [
      {
        id: "job-28-1",
        verse: 1,
        title: "Every treasure but one",
        hook: "Chapter 28 changes key: a quiet hymn about miners who find every treasure but one.",
        body: "Humans tunnel under mountains, turn rivers aside and bring hidden gems to light. We can find almost anything. The hymn's point is the exception: wisdom cannot be dug out. It has to be given by the One who knows where it lives.",
        question: "What are you digging for that only God can give?",
        art: "mine",
        father: {
          verse: 11,
          index: 1,
          excerpt:
            "But this wisdom cannot be ‘found in the land of those that live sweetly;’ because the man that is still fed with the pleasures of this life, is severed from the perception of Eternal Wisdom.",
        },
      },
      {
        id: "job-28-7",
        verse: 7,
        title: "A path no eye has seen",
        hook: "There is a path no bird has known and no vulture's eye has seen: the way to wisdom.",
        body: "The sharpest eyes in creation cannot see the way to wisdom. It is not found by keener sight but revealed. St. Gregory reads even this verse as Christ, who came down from on high to seek us where we lay dead.",
        question: "Where have you tried to see your way by sharper sight instead of asking?",
        art: "wild",
        father: {
          verse: 7,
          index: 0,
          excerpt:
            "For in our behalf He vouchsafed to become man, and while he sought the dead creature, He found death among us, Who was deathless in Himself.",
        },
      },
      {
        id: "job-28-18",
        verse: 18,
        title: "Above the most precious things",
        hook: "No gold or pearl compares with wisdom. The Church gives Wisdom a name.",
        body: "The hymn piles up treasures, gold of Sophir, onyx, coral, pearl, and sets wisdom above them all. The Church confesses Christ as the Wisdom of God (1 Corinthians 1:24). The saints shine not by rivalling that Wisdom but by sharing its light.",
        question: "What have you valued above wisdom lately?",
        art: "lamp",
        father: {
          verse: 18,
          index: 0,
          excerpt:
            "Now ‘Light’ Wisdom is used to be called, ‘light’ also the servants of Wisdom are wont to be called; but She as light lighting up, they as light lighted up;",
        },
      },
      {
        id: "job-28-28",
        verse: 28,
        title: "Godliness is wisdom",
        hook: "The hymn ends where all wisdom begins: godliness is wisdom, and turning from evil is understanding.",
        body: "After the search through mountains and seas, the answer is simple and practical. Wisdom is not a secret for the clever. It is godliness, the fear of God, and turning from evil, open to the unlearned and the child alike.",
        question: "What would it look like to turn from one small evil today?",
        art: "altar",
        father: {
          verse: 28,
          index: 0,
          excerpt:
            "Therefore the Word of God draws Itself in to our littleness; just as a father, when he speaks to his little child, in order that he may be able to be understood by him, talks stammeringly of his own accord.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job says there is a place where silver and gold are found.", verse: 1 },
      { id: "b2", text: "He speaks of a path no bird has known.", verse: 7 },
      { id: "b3", text: "He asks where wisdom can be found.", verse: 12 },
      { id: "b4", text: "He says God knows the place of wisdom.", verse: 23 },
      { id: "b5", text: "God tells man that godliness is wisdom.", verse: 28 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "But whence has wisdom been discovered?",
        verse: 12,
        speaker: "job",
        choices: ["sophar", "job", "eliphaz"],
      },
      {
        id: "a2",
        quote: "One shall not give fine gold instead of it",
        verse: 15,
        speaker: "job",
        choices: ["job", "lord", "baldad"],
      },
    ],
    prompt: "Wisdom cannot be dug out, only received. Write where you most need God's wisdom right now.",
  },
  {
    n: 29,
    title: "As in months past",
    movement: "defense",
    cards: [
      {
        id: "job-29-3",
        verse: 3,
        title: "When His lamp shone",
        hook: "Job remembers when God's lamp shone over his head and he walked by its light through darkness.",
        body: "Job's memory is not of wealth first but of closeness: God's lamp over his head, God's care over his house. Loss teaches what the gift was. The Psalmist prays the same: Thy law is a lamp to my feet, and a light to my paths (Psalm 118:105).",
        question: "When did you last feel God's lamp over your head, and what did you do by its light?",
        art: "lamp",
      },
      {
        id: "job-29-15",
        verse: 15,
        title: "Eyes to the blind",
        hook: "Job's defense is a record of mercy: eyes for the blind, feet for the lame, a father to the helpless.",
        body: "This is the answer to Eliphaz's invented crimes. Job's righteousness was not private piety but mercy in public: rescuing the poor, the orphan, the widow. It is the religion St. James calls pure and undefiled (James 1:27).",
        question: "Whose eyes or feet could you be this week?",
        art: "gate",
        father: {
          verse: 14,
          index: 1,
          excerpt:
            "For ‘the blind’ is he that as yet seeth not whither he is going, but ‘the lame’ is he who has not the power to go there where he sees.",
        },
      },
      {
        id: "job-29-25",
        verse: 25,
        title: "The comforter uncomforted",
        hook: "Job was once the comforter. Now he sits among comforters who do not comfort.",
        body: "The last line of Job's memory is the saddest: he used to be the one who consoled mourners. Now his friends fail at what he did well. St. Paul says we comfort others with the comfort we ourselves receive from God (2 Corinthians 1:4).",
        question: "What comfort have you received that you could now pass on?",
        art: "friends",
        father: {
          verse: 3,
          index: 0,
          excerpt: "For a man is perfect in such proportion as he perfectly feels the sorrows of others.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job wishes he were as in months past.", verse: 2 },
      { id: "b2", text: "He remembers God's lamp shining over his head.", verse: 3 },
      { id: "b3", text: "He remembers his seat of honour in the city.", verse: 7 },
      { id: "b4", text: "He says he was eyes to the blind and feet to the lame.", verse: 15 },
      { id: "b5", text: "He says he once comforted mourners.", verse: 25 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "I was the eye of the blind, and the foot of the lame.",
        verse: 15,
        speaker: "job",
        choices: ["lord", "job", "eliphaz"],
      },
      {
        id: "a2",
        quote: "Oh that I were as in months past",
        verse: 2,
        speaker: "job",
        choices: ["job", "wife", "baldad"],
      },
    ],
    prompt: "Job remembered when God's lamp shone over him. Write about a season when you felt God near, and what it taught you.",
  },
  {
    n: 30,
    title: "My harp is turned to mourning",
    movement: "defense",
    cards: [
      {
        id: "job-30-10",
        verse: 10,
        title: "Spat upon",
        hook: "Men Job once thought beneath notice now spit in his face. The Gospels saw the same done to Christ.",
        body: "Job describes the lowest humiliation: men he once thought beneath notice now mock and spit on him. The Church hears the Servant of Isaiah, who turned not his face from the shame of spitting (Isaiah 50:6), fulfilled when they spat in Christ's face (Matthew 26:67).",
        question: "How does Christ's humiliation change the way you carry your own?",
        art: "friends",
      },
      {
        id: "job-30-20",
        verse: 20,
        title: "Heard by no one",
        hook: "Job cries to God and hears nothing. Even Christ prayed through such a silence.",
        body: "Unanswered prayer is not proof of abandonment. Christ Himself cried from the Cross, My God, why hast Thou forsaken Me, and was answered on the third day. The silence Job feels is real, and it is not the end of the story.",
        question: "What prayer are you still waiting to see answered? Can you keep praying it?",
        art: "night",
        father: {
          verse: 11,
          index: 0,
          excerpt: "For that any man is scourged, we know, but for what cause the scourge comes, we know not.",
        },
      },
      {
        id: "job-30-25",
        verse: 25,
        title: "Tears for others",
        hook: "At his lowest, Job remembers that he wept over every helpless man.",
        body: "Even in his despair Job's record holds: he wept with those who wept (Romans 12:15). Compassion given in good times does not vanish in bad ones. It becomes part of who we are, and God remembers it when we cannot.",
        question: "Whose sorrow could you weep with this week?",
        art: "altar",
        father: {
          verse: 16,
          index: 0,
          excerpt: "For now is the time of affliction to the good, that one day exulting may follow them apart from tears.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job says the youngest now laugh him to scorn.", verse: 1 },
      { id: "b2", text: "He says they spare not to spit in his face.", verse: 10 },
      { id: "b3", text: "He says he cries to God and is not heard.", verse: 20 },
      { id: "b4", text: "He remembers weeping over every helpless man.", verse: 25 },
      { id: "b5", text: "He says his harp has turned to mourning.", verse: 31 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "My harp also has been turned into mourning",
        verse: 31,
        speaker: "job",
        choices: ["job", "eliphaz", "lord"],
      },
      {
        id: "a2",
        quote: "Yet I wept over every helpless man",
        verse: 25,
        speaker: "job",
        choices: ["sophar", "job", "baldad"],
      },
    ],
    prompt: "Job's harp became mourning, yet he kept speaking to God. Write a few honest words to God about something you are mourning.",
  },
  {
    n: 31,
    title: "Weighed in a just balance",
    movement: "defense",
    cards: [
      {
        id: "job-31-1",
        verse: 1,
        title: "A covenant with the eyes",
        hook: "Job's defense begins with the heart: he made a covenant with his eyes.",
        body: "Job's purity starts before any deed, with what he lets himself look at and dwell on. Christ teaches the same: whoever looks with lust has already sinned in the heart (Matthew 5:28). The Fathers call this guarding the senses, the first work of watchfulness.",
        question: "What do you let your eyes dwell on that you would rather not carry in your heart?",
        art: "lamp",
        father: {
          verse: 1,
          index: 0,
          excerpt:
            "For by these senses of the body as by a kind of windows the soul takes a view of the several exterior objects, and on viewing longs after them.",
        },
      },
      {
        id: "job-31-15",
        verse: 15,
        title: "Formed in the same womb",
        hook: "Job heard his servants' complaints because the same God formed them both.",
        body: "In a world where servants had few rights, Job heard their complaints as a man who would one day answer to God. His reason is striking: the same God formed us both. Every person bears His image, whatever their station.",
        question: "Who in your life do you treat as less, without noticing?",
        art: "friends",
        father: {
          verse: 15,
          index: 0,
          excerpt:
            "For all of us men are equal by nature, but it has been added by a distributive arrangement, that we should appear as set over particular persons.",
        },
      },
      {
        id: "job-31-17",
        verse: 17,
        title: "Bread not eaten alone",
        hook: "Job never ate his bread alone while an orphan went hungry.",
        body: "Job's righteousness was shared bread, an open door, clothing for the naked (31:17-32). St. Basil the Great would later preach that the bread we store up belongs to the hungry. Mercy is not an extra. It is what the Lord's gifts are for.",
        question: "What do you have more of than you need, and who could share it?",
        art: "altar",
        father: {
          verse: 17,
          index: 0,
          excerpt:
            "That is to say, reckoning that he prejudiced his pitifulness, if he ate alone what the Lord of all created in common.",
        },
      },
      {
        id: "job-31-29",
        verse: 29,
        title: "No joy at an enemy's fall",
        hook: "Job swears he never said Aha when those who hated him came to ruin.",
        body: "It is one of the hardest lines in Job's oath: no gloating at an enemy's downfall. Proverbs forbids rejoicing when your enemy falls (24:17), and Christ goes further: love your enemies, and pray for them (Matthew 5:44).",
        question: "Is there someone whose downfall you would quietly enjoy? Could you pray for them instead?",
        art: "scales",
        father: {
          verse: 29,
          index: 0,
          excerpt: "That we are disciples of Almighty God, the keeping of charity is the only proof.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job says he made a covenant with his eyes.", verse: 1 },
      { id: "b2", text: "He asks to be weighed in a just balance.", verse: 6 },
      { id: "b3", text: "He says his servants were formed in the same womb.", verse: 15 },
      { id: "b4", text: "He says he never ate his morsel alone.", verse: 17 },
      { id: "b5", text: "Job ceases speaking.", verse: 40 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "I made a covenant with mine eyes",
        verse: 1,
        speaker: "job",
        choices: ["eliphaz", "job", "sophar"],
      },
      {
        id: "a2",
        quote: "for I am weighed in a just balance",
        verse: 6,
        speaker: "job",
        choices: ["job", "baldad", "lord"],
      },
    ],
    prompt: "Job's oath is a portrait of a merciful life. Write one line you would want to be able to say about your own.",
  },
];
