// Job 22 to 27: the third round. Eliphaz invents crimes, Baldad has only six
// verses left, Sophar never speaks again, and Job holds fast to his
// innocence. Father lines are verbatim from St. Gregory the Great's Morals on
// the Book of Job (Oxford, 1844), held to the corpus by
// lib/walkthroughs/__tests__/job.test.ts.

import type { ChapterWalk } from "../types";

export const THIRD_ROUND: ChapterWalk[] = [
  {
    n: 22,
    title: "Silver tried in the fire",
    movement: "third",
    cards: [
      {
        id: "job-22-6",
        verse: 6,
        title: "Crimes that never happened",
        hook: "Out of arguments, Eliphaz invents crimes: stripping the naked, starving the hungry.",
        body: "Eliphaz's theory demanded great sin, so he supplies it. None of it is true, as chapter 31 will show. When we are sure someone must be guilty, we start to see evidence that is not there. Rash judgment grows by feeding itself.",
        question: "Have you ever filled the gaps in someone's story with guilt they did not have?",
        art: "scales",
        father: {
          verse: 5,
          index: 0,
          excerpt:
            "For these are the descents of increasing sin, that the tongue when not restrained should never there where it has fallen lie still, but be always descending to what is worse;",
        },
      },
      {
        id: "job-22-25",
        verse: 25,
        title: "Silver tried in the fire",
        hook: "Our Septuagint promises that God will bring Job out pure as silver tried in the fire.",
        body: "Eliphaz promises that if Job repents, God will refine him like silver. St. Gregory hears more in the image: silver is God's own word, pure as silver tried in the fire (Psalm 11:6). The truest wealth God gives is His word.",
        question: "Which of God's words has been treasure to you in a hard time?",
        art: "altar",
        father: {
          verse: 25,
          index: 0,
          excerpt:
            "Now by the name of ‘silver,’ the Psalmist testifies the sacred oracles are denoted, when he says, The words of the Lord are pure words, as silver tried in a furnace of earth.",
        },
      },
      {
        id: "job-22-29",
        verse: 29,
        title: "Lowly eyes",
        hook: "Eliphaz says God saves the one of lowly eyes. The whole Church lives by this line.",
        body: "Eliphaz is right about humility, and wrong about Job. God resists the proud and gives grace to the humble (Proverbs 3:34, James 4:6). The irony is that at the end, Eliphaz will need the humble Job to pray for him (42:8).",
        question: "Where is God asking you to lower your eyes, and let Him lift them?",
        art: "lamp",
      },
    ],
    beats: [
      { id: "b1", text: "Eliphaz asks what Job's blamelessness matters to the Lord.", verse: 3 },
      { id: "b2", text: "He accuses Job of stripping the naked.", verse: 6 },
      { id: "b3", text: "He says Job sent widows away empty.", verse: 9 },
      { id: "b4", text: "He says God will bring Job forth pure as silver tried by fire.", verse: 25 },
      { id: "b5", text: "He says God saves the one of lowly eyes.", verse: 29 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Is not thy wickedness abundant, and thy sins innumerable?",
        verse: 5,
        speaker: "eliphaz",
        choices: ["eliphaz", "baldad", "lord"],
      },
      {
        id: "a2",
        quote: "lay up his words in thine heart",
        verse: 22,
        speaker: "eliphaz",
        choices: ["job", "eliphaz", "sophar"],
      },
    ],
    prompt: "Eliphaz gave good counsel wrapped in false accusation. Write one piece of advice you received that was true, even though it hurt.",
  },
  {
    n: 23,
    title: "Tried as gold",
    movement: "third",
    cards: [
      {
        id: "job-23-6",
        verse: 6,
        title: "The Strong made weak",
        hook: "Job trusts that God, coming in all His strength, would still not crush him.",
        body: "Job trusts that if God came near in all His strength, He would not crush him but hear him. In Christ, God came near in a way no one needed to fear: the Almighty as a child, meek and approachable.",
        question: "Do you come to God expecting to be crushed, or to be heard?",
        art: "redeemer",
        father: {
          verse: 7,
          index: 0,
          excerpt:
            "but the Strong above all things came weak among all things, that whereas He agreed with us by assumed weakness, He might elevate us to His own abiding strength.",
        },
      },
      {
        id: "job-23-10",
        verse: 10,
        title: "Tried as gold",
        hook: "Job says God knows his way and has tried him as gold. The trial is not the end of him.",
        body: "Here Job reaches a new confidence: God knows my way. Gold goes into the fire to come out purer, not to be destroyed. The Fathers read all of Job's suffering this way, as a trial that revealed his faithfulness to the world, and to himself.",
        question: "What might God be refining in you through what you are carrying now?",
        art: "mine",
        father: {
          verse: 17,
          index: 0,
          excerpt:
            "For scourges inflicted on the good either wipe out evil things done, or parry off future ones which might have been done.",
        },
      },
      {
        id: "job-23-12",
        verse: 12,
        title: "Words hidden in the heart",
        hook: "Job has already done what Eliphaz told him to: he has hidden God's words in his bosom.",
        body: "Eliphaz told Job to lay up God's words in his heart (22:22), not knowing Job had done it all along. The Church's great example is the Mother of God, who kept all these things and pondered them in her heart (Luke 2:19).",
        question: "Which verse have you carried in your heart the longest?",
        art: "lamp",
        father: {
          verse: 12,
          index: 0,
          excerpt:
            "For we ‘hide the words of His mouth in the bosom of our heart,’ when we hear His commandments not in a passing way, but to fulfil them in practice.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job says God's hand is heavy upon his groaning.", verse: 2 },
      { id: "b2", text: "He wishes he knew where to find God.", verse: 3 },
      { id: "b3", text: "He says God knows his way and has tried him as gold.", verse: 10 },
      { id: "b4", text: "He says he has hidden God's words in his bosom.", verse: 12 },
      { id: "b5", text: "He says thick darkness has covered his face.", verse: 17 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "he has tried me as gold",
        verse: 10,
        speaker: "job",
        choices: ["eliphaz", "job", "sophar"],
      },
      {
        id: "a2",
        quote: "Who would then know that I might find him",
        verse: 3,
        speaker: "job",
        choices: ["job", "baldad", "narrator"],
      },
    ],
    prompt: "Job wanted to find God more than he wanted answers. Write what you would say if you found Him today.",
  },
  {
    n: 24,
    title: "The cry of the poor",
    movement: "third",
    cards: [
      {
        id: "job-24-12",
        verse: 12,
        title: "The cry of the poor",
        hook: "Job's grief widens to the poor of the whole earth, the oppressed whose children groan aloud.",
        body: "Job's grief opens outward: children snatched from the breast, labourers unpaid, the naked sleeping in the rain. The prophets and the Gospel share his outrage. Christ counts what is done to the least of these as done to Him (Matthew 25:40).",
        question: "Whose cry in your own town might God be asking you to hear?",
        art: "uz",
      },
      {
        id: "job-24-13",
        verse: 13,
        title: "Why the delay?",
        hook: "Job asks why God has not yet called the oppressors to account.",
        body: "It is the question of every age: why does God let injustice run on? Scripture's answer is patience, not indifference. The Lord is longsuffering, not willing that any should perish, but that all should come to repentance (2 Peter 3:9).",
        question: "Can you trust God's patience with others the way you rely on it for yourself?",
        art: "scales",
        father: {
          verse: 13,
          index: 0,
          excerpt:
            "But Almighty God waited that they might go ‘by the paths thereof.’ And would that they had been minded even to have ‘returned’ by them, that the paths of life which they would not keep by innocency they might at least keep by repentance.",
        },
      },
      {
        id: "job-24-16",
        verse: 16,
        title: "They know not the light",
        hook: "Job describes those who work in the dark and flee the morning.",
        body: "The thief and the adulterer love the night because the light would expose them. Christ says the same: men loved darkness rather than light, because their deeds were evil (John 3:19). The cure is not more darkness but coming into the light.",
        question: "What part of your life would you rather keep out of the light, and why?",
        art: "night",
        father: {
          verse: 13,
          index: 0,
          excerpt:
            "Very often wicked people at once know the right things that they ought to follow, and yet neglect to follow what they know;",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job says the ungodly carry off the flock with the shepherd.", verse: 2 },
      { id: "b2", text: "He says they leave the naked without clothing.", verse: 7 },
      { id: "b3", text: "He says the soul of the children groans aloud.", verse: 12 },
      { id: "b4", text: "He asks why God has not visited them.", verse: 13 },
      { id: "b5", text: "He says the wicked dig through houses in the dark.", verse: 16 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Why then has he not visited these?",
        verse: 13,
        speaker: "job",
        choices: ["job", "eliphaz", "lord"],
      },
      {
        id: "a2",
        quote: "They have caused many naked to sleep without clothes",
        verse: 7,
        speaker: "job",
        choices: ["eliphaz", "job", "sophar"],
      },
    ],
    prompt: "Job's pain opened his eyes to the pain of others. Write the name of someone suffering whom you will pray for this week.",
  },
  {
    n: 25,
    title: "The last word of the friends",
    movement: "third",
    cards: [
      {
        id: "job-25-4",
        verse: 4,
        title: "The friends run dry",
        hook: "Baldad's last speech is six verses long, and none of it is new. The friends have run out.",
        body: "This is the last word any of the three friends will speak. Baldad can only repeat what has been said: no mortal is pure before God. True, and already granted. When comfort has become a script, silence would be kinder.",
        question: "Is there a script you fall back on when someone suffers? What could replace it?",
        art: "friends",
        father: {
          verse: 4,
          index: 0,
          excerpt:
            "This verse is spoken above by blessed Job, and is now repeated in the upbraiding of him; since every just man is just by illumination from God, not by comparison with God.",
        },
      },
      {
        id: "job-25-6",
        verse: 6,
        title: "A worm, and no man",
        hook: "Baldad calls man a worm. The psalm Christ prayed on the Cross takes up the same word.",
        body: "Baldad means it as contempt: man is corruption, the son of man a worm. Psalm 21, the psalm Christ prayed on the Cross, says: I am a worm, and not a man (21:6). The Son of Man took the lowest name to raise us from it.",
        question: "When you feel small before God, what does it mean that Christ became small with you?",
        art: "ashheap",
      },
    ],
    beats: [
      { id: "b1", text: "Baldad speaks of God who makes all things in the highest.", verse: 2 },
      { id: "b2", text: "He says there is no respite for robbers.", verse: 3 },
      { id: "b3", text: "He asks how a mortal can be just before the Lord.", verse: 4 },
      { id: "b4", text: "He says even the stars are not pure before Him.", verse: 5 },
      { id: "b5", text: "He calls man corruption, and the son of man a worm.", verse: 6 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "man is corruption, and the son of man a worm",
        verse: 6,
        speaker: "baldad",
        choices: ["baldad", "job", "eliphaz"],
      },
    ],
    prompt: "The friends ran out of words. Write about a time when silence and presence helped you more than anything said.",
  },
  {
    n: 26,
    title: "The edges of His ways",
    movement: "third",
    cards: [
      {
        id: "job-26-7",
        verse: 7,
        title: "Hung upon nothing",
        hook: "Job says God hangs the earth upon nothing, a world held by His word alone.",
        body: "Job's hymn pictures the earth suspended over emptiness, held by nothing but God. The Fathers read creation this way: not a machine left running, but a world sustained each moment by His word (Hebrews 1:3). Nothing holds you up that He does not hold.",
        question: "What are you leaning on today that only God is really holding?",
        art: "stars",
      },
      {
        id: "job-26-13",
        verse: 13,
        title: "The apostate dragon",
        hook: "Our Septuagint names God's victory over the apostate dragon, the ancient serpent.",
        body: "Where the Hebrew speaks of the fleeing serpent, our Septuagint says apostate dragon: the Church hears the devil, that old serpent (Revelation 12:9). St. Gregory shows how he fell: he seized a sinless Man on the Cross and lost his hold on all of us.",
        question: "Which evil, in the world or in you, do you most need to remember is not God's equal?",
        art: "leviathan",
        father: {
          verse: 12,
          index: 0,
          excerpt: "Thus our Lord did in our behalf pay death not due, that death due might not injure us;",
        },
      },
      {
        id: "job-26-14",
        verse: 14,
        title: "Only the edges",
        hook: "After all this wonder, Job says we have seen only the edges of God's ways.",
        body: "Everything Job has described, the earth hung on nothing, the sea stilled, the dragon slain, is only a part of His way, a whisper of His word. It is the right posture for theology: to say true things and know how little they contain.",
        question: "What small glimpse of God's ways has stayed with you?",
        art: "whirlwind",
        father: {
          verse: 14,
          index: 0,
          excerpt:
            "And when He said to them directly, I am He, He only uttered a voice of the mildest answer, and at once prostrated His armed persecutors to the earth.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job asks Baldad whom he thinks he is helping.", verse: 2 },
      { id: "b2", text: "He says Hades is naked before God.", verse: 6 },
      { id: "b3", text: "He says God hangs the earth upon nothing.", verse: 7 },
      { id: "b4", text: "He says God calmed the sea with His might.", verse: 12 },
      { id: "b5", text: "He says these are only parts of God's way.", verse: 14 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "he upon nothing hangs the earth",
        verse: 7,
        speaker: "job",
        choices: ["lord", "job", "baldad"],
      },
      {
        id: "a2",
        quote: "Behold, these are parts of his way",
        verse: 14,
        speaker: "job",
        choices: ["job", "sophar", "lord"],
      },
    ],
    prompt: "Job said all he could see were the edges of God's ways. Write about one small glimpse of God that has stayed with you.",
  },
  {
    n: 27,
    title: "I will not let go",
    movement: "third",
    cards: [
      {
        id: "job-27-3",
        verse: 3,
        title: "The breath of God",
        hook: "Job calls the breath in his nostrils the breath of God, and vows not to use it for evil.",
        body: "Job remembers where his breath came from: God breathed the breath of life upon the first man (Genesis 2:7). So he will not spend that breath on lies. Every word we speak is spoken with borrowed breath.",
        question: "How would you speak today if you remembered every word uses God's breath?",
        art: "lamp",
      },
      {
        id: "job-27-6",
        verse: 6,
        title: "No false confession",
        hook: "Job refuses to confess sins he did not commit, even to end the argument.",
        body: "It would be easy to agree with his friends and be left in peace. Job will not lie about himself, not even in humility. False confession is not humility. The Church asks us to confess our real sins honestly, not to invent guilt to please our accusers.",
        question: "Have you ever confessed to something false just to end a conflict?",
        art: "altar",
        father: {
          verse: 6,
          index: 0,
          excerpt: "For whereinsoever it sees itself to have done amiss, the conscience by itself secretly accuses self.",
        },
      },
      {
        id: "job-27-10",
        verse: 10,
        title: "Confidence in distress",
        hook: "Job asks whether the ungodly man has any confidence before God when trouble comes.",
        body: "Job's question cuts to the heart of prayer. Faith built only on good times has nothing to stand on when distress comes. The Psalmist's answer is to delight in the Lord Himself (Psalm 36:4), not in what He gives, so that trouble cannot take Him away.",
        question: "If everything you have were taken away, what would remain of your prayer?",
        art: "night",
        father: {
          verse: 10,
          index: 0,
          excerpt: "For he that is overcome by the love of earthly things, in no degree delights himself in God.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job swears by the living God who has embittered his soul.", verse: 2 },
      { id: "b2", text: "He vows his lips shall not speak evil words.", verse: 4 },
      { id: "b3", text: "He says he will keep fast to his righteousness.", verse: 6 },
      { id: "b4", text: "He asks what hope the ungodly have.", verse: 8 },
      { id: "b5", text: "He says the rich man lies down and is no more.", verse: 19 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "I will not let go my innocence",
        verse: 5,
        speaker: "job",
        choices: ["eliphaz", "job", "baldad"],
      },
      {
        id: "a2",
        quote: "my lips shall not speak evil words",
        verse: 4,
        speaker: "job",
        choices: ["job", "sophar", "lord"],
      },
    ],
    prompt: "Job would not trade the truth for peace with his friends. Write about a truth you are keeping hold of.",
  },
];
