// Job 38 to 42: the voice from the whirlwind, and the restoration. God
// answers with creation, Job lays his hand upon his mouth, and our
// Septuagint ends with the promise that he will rise again. Father lines are
// verbatim from St. Gregory the Great's Morals on the Book of Job (Oxford,
// 1844), held to the corpus by lib/walkthroughs/__tests__/job.test.ts.

import type { ChapterWalk } from "../types";

export const WHIRLWIND_AND_EPILOGUE: ChapterWalk[] = [
  {
    n: 38,
    title: "Where were you?",
    movement: "whirlwind",
    cards: [
      {
        id: "job-38-1",
        verse: 1,
        title: "The Lord answers",
        hook: "After thirty-five chapters of human words, the Lord Himself speaks, out of the whirlwind.",
        body: "Job asked for a hearing, and God comes. He does not explain the trial in heaven from chapter one, and He does not repeat the friends' theory. He answers with Himself. For Job, and for us, God's presence is the answer before any explanation.",
        question: "Would you rather have God's answer, or God Himself?",
        art: "whirlwind",
      },
      {
        id: "job-38-4",
        verse: 4,
        title: "Where were you?",
        hook: "God's first question turns everything around: where were you when I founded the earth?",
        body: "The questions are not a rebuke of Job's suffering. They lift his eyes. Job has been looking at a small circle of pain; God shows him the whole creation, held in wisdom. Trust grows when we see how much larger His care is than our view.",
        question: "What small circle of worry would look different against the whole of creation?",
        art: "uz",
        father: {
          verse: 4,
          index: 0,
          excerpt:
            "The foundation of this earth is laid, when the first cause of firmness, the fear of God, is breathed in the secret places of the heart.",
        },
      },
      {
        id: "job-38-7",
        verse: 7,
        title: "When the stars were made",
        hook: "At creation, our Septuagint says, all God's angels praised Him with a loud voice.",
        body: "Before any human word, creation began in praise. The angels' song at the making of the stars was heard again over Bethlehem: Glory to God in the highest (Luke 2:14). Worship is not something we add to the world. It is what the world was made in.",
        question: "Where could you join creation's praise today?",
        art: "stars",
        father: {
          verse: 7,
          index: 0,
          excerpt:
            "They praise together, because when they behold us admitted, they rejoice that their own number is filled up.",
        },
      },
      {
        id: "job-38-11",
        verse: 11,
        title: "This far, and no farther",
        hook: "God sets a boundary for the raging sea: this far, and no farther.",
        body: "The sea in Scripture is chaos and threat, yet God swaddles it like a newborn (38:8-9). Nothing rages beyond the limit He sets. It is the comfort of chapter one again: the enemy could go only so far (1:12). He still says it to our storms.",
        question: "Which storm in your life do you need to hear God tell, this far and no farther?",
        art: "sea",
        father: {
          verse: 10,
          index: 1,
          excerpt:
            "For what do we understand by ‘doors,’ in a moral sense, but virtues, and what by a ‘bar,’ but the strength of charity?",
        },
      },
    ],
    beats: [
      { id: "b1", text: "The Lord speaks to Job through the whirlwind.", verse: 1 },
      { id: "b2", text: "He asks where Job was when He founded the earth.", verse: 4 },
      { id: "b3", text: "He says the angels praised Him when the stars were made.", verse: 7 },
      { id: "b4", text: "He tells the sea how far it may come.", verse: 11 },
      { id: "b5", text: "He asks who feeds the young ravens.", verse: 41 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Where wast thou when I founded the earth?",
        verse: 4,
        speaker: "lord",
        choices: ["lord", "elihu", "job"],
      },
      {
        id: "a2",
        quote: "Gird thy loins like a man",
        verse: 3,
        speaker: "lord",
        choices: ["elihu", "lord", "eliphaz"],
      },
    ],
    prompt: "God answered Job with the wonders of creation. Write about one wonder that reminds you who God is.",
  },
  {
    n: 39,
    title: "My hand upon my mouth",
    movement: "whirlwind",
    cards: [
      {
        id: "job-39-1",
        verse: 1,
        title: "Who watches the wild goats?",
        hook: "God asks whether Job knows when the wild goats give birth. God knows, and tends them.",
        body: "No human watches the mountain goat's labour, yet God numbers her months and eases her pangs. Christ said the same of the birds of the air and the lilies of the field (Matthew 6:26-30). If God's care reaches creatures no one sees, it reaches you.",
        question: "What unseen part of your life do you need to remember God is tending?",
        art: "wild",
      },
      {
        id: "job-39-5",
        verse: 5,
        title: "Free in the wilderness",
        hook: "God made the wild ass free, laughing at the noise of the city. St. Gregory saw the desert monks in it.",
        body: "The wild ass lives in the wilderness, free of the city's noise and the tax collector's shout. St. Gregory reads it as the life of those who leave the crowd for God, as the desert monks did. Their solitude was not escape but freedom.",
        question: "Where could you find a little of that freedom in your own day?",
        art: "uz",
        father: {
          verse: 6,
          index: 0,
          excerpt: "But what avails the solitude of the body, if the solitude of the heart be wanting?",
        },
      },
      {
        id: "job-39-34",
        verse: 34,
        title: "My hand upon my mouth",
        hook: "In our Septuagint, Job's first answer to God comes here: I am nothing; I will lay my hand upon my mouth.",
        body: "After all his arguments, Job meets God and falls silent. It is not defeat but awe: he has been heard. On Holy Saturday the Church sings, Let all mortal flesh keep silence, and stand with fear and trembling.",
        question: "When did you last come before God with nothing to say, and let that be enough?",
        art: "ashheap",
        father: {
          verse: 34,
          index: 0,
          excerpt:
            "To lay therefore the hand upon the mouth, is by the virtue of good living to conceal the faults of incautious speech.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "The Lord asks if Job knows when the wild goats give birth.", verse: 1 },
      { id: "b2", text: "He asks who set the wild ass free.", verse: 5 },
      { id: "b3", text: "He asks if Job gave the horse its strength.", verse: 19 },
      { id: "b4", text: "He asks if the eagle rises at Job's command.", verse: 27 },
      { id: "b5", text: "Job lays his hand upon his mouth.", verse: 34 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "I will lay my hand upon my mouth",
        verse: 34,
        speaker: "job",
        choices: ["job", "elihu", "lord"],
      },
      {
        id: "a2",
        quote: "And who is he that sent forth the wild ass free?",
        verse: 5,
        speaker: "lord",
        choices: ["elihu", "lord", "job"],
      },
    ],
    prompt: "Job answered God by laying his hand upon his mouth. Sit in silence for a minute, then write one line.",
  },
  {
    n: 40,
    title: "That you might appear righteous",
    movement: "whirlwind",
    cards: [
      {
        id: "job-40-3",
        verse: 3,
        title: "That you might appear righteous",
        hook: "Our Septuagint keeps God's own reason for the trial: that Job's righteousness might be seen.",
        body: "Here our Septuagint says what the book has been waiting for. God has not dealt with Job as a sinner to be punished, but so that his righteousness would appear. The trial was never a verdict. It was a revelation of what grace had made of him.",
        question: "What might your hardest trial be revealing, rather than punishing?",
        art: "scales",
        father: {
          verse: 3,
          index: 0,
          excerpt: "For the righteous will of our Maker, is a great satisfaction for the blow.",
        },
      },
      {
        id: "job-40-14",
        verse: 14,
        title: "The chief of creation",
        hook: "God shows Job a great beast, strong as brass and iron, and calls it a plaything for His angels.",
        body: "Behemoth is the strongest thing Job can imagine, and God treats it as His creature, even a plaything. St. Gregory reads the beast as the devil, mighty to us, small before God. What terrifies us is held in His hand.",
        question: "What fear in your life do you need to see as smaller than God?",
        art: "behemoth",
        father: {
          verse: 14,
          index: 0,
          excerpt:
            "And therefore, when sinning, he was condemned without pardon, because he had been created great beyond comparison.",
        },
      },
      {
        id: "job-40-20",
        verse: 20,
        title: "Caught with a hook",
        hook: "God asks if Job can catch the serpent with a hook. St. Gregory answers: Christ did.",
        body: "The Fathers loved this image. The devil saw in Christ only a mortal man and seized Him on the Cross, not knowing divinity was hidden in the flesh. As St. John Chrysostom's Paschal homily says of Hades: it took a body, and met God.",
        question: "Where does the Cross change how you see the power of evil?",
        art: "leviathan",
        father: {
          verse: 19,
          index: 0,
          excerpt:
            "He was caught, therefore, in the ‘hook’ of His Incarnation, because while he sought in Him the bait of His Body, he was pierced with the sharp point of His Divinity.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "The Lord speaks again out of the cloud.", verse: 1 },
      { id: "b2", text: "He says He dealt with Job so that he might appear righteous.", verse: 3 },
      { id: "b3", text: "He tells Job to look at the great beast.", verse: 10 },
      { id: "b4", text: "He calls it the chief of His creation.", verse: 14 },
      { id: "b5", text: "He asks if Job can catch the serpent with a hook.", verse: 20 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Hast thou an arm like the Lord's?",
        verse: 4,
        speaker: "lord",
        choices: ["lord", "elihu", "job"],
      },
      {
        id: "a2",
        quote: "wilt thou catch the serpent with a hook",
        verse: 20,
        speaker: "lord",
        choices: ["job", "lord", "elihu"],
      },
    ],
    prompt: "God told Job the trial was so that his righteousness might appear. Write what your own trials have revealed in you.",
  },
  {
    n: 41,
    title: "The dragon of the deep",
    movement: "whirlwind",
    cards: [
      {
        id: "job-41-2",
        verse: 2,
        title: "The whole world is Mine",
        hook: "Before describing the monster, God says it plainly: the whole world under heaven is Mine.",
        body: "The Leviathan poem is terrifying, and meant to be. But it opens with a claim that frames every terror after it: the whole world is God's. The Psalmist sings the same: The earth is the Lord's and the fullness thereof (Psalm 23:1).",
        question: "What frightens you most, and can you hear it inside the words, the whole world is Mine?",
        art: "sea",
      },
      {
        id: "job-41-7",
        verse: 7,
        title: "No air between",
        hook: "The monster's scales fit so tight that no air can pass between them. St. Gregory saw a warning in it.",
        body: "St. Gregory reads the scales as sinners who shield one another, so close that no word of correction can get through. It is a warning for any of us: friends who only defend our sins are not friends. Love lets the truth in.",
        question: "Who in your life is allowed to tell you a hard truth?",
        art: "leviathan",
        father: {
          verse: 7,
          index: 0,
          excerpt:
            "These scales of sinners are both hardened and joined together, so as not to be penetrated by any breath of life from the mouth of preachers.",
        },
      },
      {
        id: "job-41-24",
        verse: 24,
        title: "A plaything for angels",
        hook: "The most fearsome creature on earth, God says, was made to be sported with by His angels.",
        body: "After all the fire and armour, the last word is almost a smile. What no human spear can touch is a plaything before God. The Vespers psalm says the same of the dragon God made to play in the sea (Psalm 103:26).",
        question: "What evil seems enormous to you that is small before God?",
        art: "whirlwind",
        father: {
          verse: 24,
          index: 0,
          excerpt:
            "For though he has lost the happiness of eternal felicity, yet he has not lost the greatness of his nature;",
        },
      },
    ],
    beats: [
      { id: "b1", text: "The Lord asks if Job has seen the great serpent.", verse: 1 },
      { id: "b2", text: "He says the whole world under heaven is His.", verse: 2 },
      { id: "b3", text: "He says burning lamps come out of its mouth.", verse: 10 },
      { id: "b4", text: "He says it counts iron as chaff.", verse: 18 },
      { id: "b5", text: "He says it was formed to be sported with by His angels.", verse: 24 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "the whole world under heaven is mine",
        verse: 2,
        speaker: "lord",
        choices: ["lord", "job", "elihu"],
      },
      {
        id: "a2",
        quote: "There is nothing upon the earth like to him",
        verse: 24,
        speaker: "lord",
        choices: ["elihu", "lord", "baldad"],
      },
    ],
    prompt: "God showed Job the most fearsome creature and called it a plaything. Write about a fear you want to hand to God.",
  },
  {
    n: 42,
    title: "Now my eye has seen You",
    movement: "epilogue",
    cards: [
      {
        id: "job-42-5",
        verse: 5,
        title: "Now my eye has seen You",
        hook: "Job's last words hold the whole book: I had heard of You by the ear, but now my eye has seen You.",
        body: "Job never received an explanation. He received God. Knowledge about God became encounter with God, and it changed everything. This is what the Church means by theology: not information about God, but the vision of Him, purified by repentance.",
        question: "Is your faith mostly heard about, or has it begun to be seen? What would help it grow?",
        art: "restored",
        father: {
          verse: 5,
          index: 0,
          excerpt:
            "By these words he doubtless plainly declares, that as far as sight is superior to hearing, so far does the progress also he had made through suffering differ from that which he was before.",
        },
      },
      {
        id: "job-42-6",
        verse: 6,
        title: "Dust and ashes",
        hook: "Having seen God, Job counts himself dust and ashes. The closer the light, the clearer the dust.",
        body: "Job's repentance is not a confession of the crimes his friends invented. It is what every saint feels near God: the brighter the light, the more we see our own dust. The holiest monks called themselves the least of all. Humility grows with vision.",
        question: "When has being close to God made you more honest about yourself?",
        art: "ashheap",
        father: {
          verse: 6,
          index: 0,
          excerpt:
            "For the less a person sees himself, the less is he displeased with himself; and the more he discerns the light of greater grace, the more blameworthy does he acknowledge himself to be.",
        },
      },
      {
        id: "job-42-10",
        verse: 10,
        title: "Praying for the friends",
        hook: "Job's restoration comes bound up with his prayer for the friends who wounded him.",
        body: "God sends the friends to Job with sacrifices, and Job prays for the men who wounded him. His restoration is bound up with that prayer. Christ prayed for those who crucified Him, and asks the same of us: pray for them which despitefully use you (Matthew 5:44).",
        question: "Who has wounded you that you could pray for today, by name?",
        art: "altar",
        father: {
          verse: 10,
          index: 0,
          excerpt: "For he makes his prayers more powerful in his own behalf, who offers them also in behalf of others.",
        },
      },
      {
        id: "job-42-17",
        verse: 17,
        title: "He will rise again",
        hook: "Our Septuagint ends with a promise: it is written that Job will rise again with those the Lord raises.",
        body: "The Greek Job does not end at the grave. It ends in resurrection hope, the same hope the Church sings over every departed Christian. Job's double restoration was a sign; the true restoration is the Resurrection, when all who sleep in Christ will rise.",
        question: "What would it change today to live as one who will rise again?",
        art: "restored",
        father: {
          verse: 16,
          index: 0,
          excerpt:
            "In Holy Scripture a person is not easily recorded as ‘full of days,’ unless he is one whose conduct is praised in the same Scripture.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job confesses that God can do all things.", verse: 2 },
      { id: "b2", text: "He says, now mine eye has seen Thee.", verse: 5 },
      { id: "b3", text: "The Lord sends the friends to Job with offerings.", verse: 8 },
      { id: "b4", text: "Job prays for his friends, and the Lord gives him double.", verse: 10 },
      { id: "b5", text: "Job dies, an old man and full of days.", verse: 17 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "but now mine eye has seen thee",
        verse: 5,
        speaker: "job",
        choices: ["job", "elihu", "lord"],
      },
      {
        id: "a2",
        quote: "ye have not said anything true before me, as my servant Job has",
        verse: 7,
        speaker: "lord",
        choices: ["elihu", "lord", "job"],
      },
    ],
    prompt: "Job had heard of God, and then he saw Him. Write where you are on that road, and what you hope to see.",
  },
];
