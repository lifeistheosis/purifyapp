// Job 15 to 21: the second round. The friends speak again, harder, and
// Job answers with the book's two great flashes of hope: a witness in heaven
// (16) and the Deliverer who lives (19). Father lines are verbatim from St.
// Gregory the Great's Morals on the Book of Job (Oxford, 1844), held to the
// corpus by lib/walkthroughs/__tests__/job.test.ts.

import type { ChapterWalk } from "../types";

export const SECOND_ROUND: ChapterWalk[] = [
  {
    n: 15,
    title: "Born before the hills?",
    movement: "second",
    cards: [
      {
        id: "job-15-6",
        verse: 6,
        title: "Grief heard as guilt",
        hook: "Eliphaz now treats Job's honest lament as proof of his guilt.",
        body: "In the first round Eliphaz was gentle. Now Job's words themselves are the evidence: your own mouth condemns you. It is a common trap, to hear grief as rebellion. The Psalms are full of lament, and the Church still prays them every day.",
        question: "When someone near you grieves out loud, do you hear rebellion or pain?",
        art: "scales",
      },
      {
        id: "job-15-7",
        verse: 7,
        title: "Before the hills",
        hook: "Eliphaz mocks Job: were you born before the hills, or did you sit in God's counsel?",
        body: "Eliphaz means it as sarcasm: no man was born before the hills or sat in God's counsel. Yet Proverbs speaks of Wisdom begotten before all hills (8:25), and the Fathers knew that Wisdom as Christ. What Job could not claim, Christ is.",
        question: "What does it mean to you that Christ was there before all things?",
        art: "council",
      },
      {
        id: "job-15-21",
        verse: 21,
        title: "A portrait aimed at Job",
        hook: "Eliphaz paints the wicked man's fearful life, and means Job to see himself in it.",
        body: "Eliphaz paints the wicked man: anxious all his days, terror in his ears, prosperity that withers. Every stroke is aimed at Job. The portrait is not false. Its error is the frame: suffering does not prove that the sufferer is the man in the picture.",
        question: "What would simplicity of heart look like in your life this week?",
        art: "night",
        father: {
          verse: 21,
          index: 1,
          excerpt:
            "But there is nothing more happy than simplicity of heart, in that in proportion as it shews forth innocency towards others, there is nothing it dreads to meet with from others.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Eliphaz says a wise man would not answer with empty words.", verse: 2 },
      { id: "b2", text: "He says Job's own mouth condemns him.", verse: 6 },
      { id: "b3", text: "He asks if Job was born before the hills.", verse: 7 },
      { id: "b4", text: "He calls man unclean, drinking unrighteousness like water.", verse: 16 },
      { id: "b5", text: "He says terror sounds in the ears of the wicked.", verse: 21 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "art thou the first man that was born?",
        verse: 7,
        speaker: "eliphaz",
        choices: ["eliphaz", "lord", "baldad"],
      },
      {
        id: "a2",
        quote: "Thou hast been scourged for but few of thy sins",
        verse: 11,
        speaker: "eliphaz",
        choices: ["sophar", "eliphaz", "job"],
      },
    ],
    prompt: "Eliphaz heard Job's grief as rebellion. Write a lament of your own to God, honest and unafraid.",
  },
  {
    n: 16,
    title: "My witness is in heaven",
    movement: "second",
    cards: [
      {
        id: "job-16-2",
        verse: 2,
        title: "Poor comforters",
        hook: "Job names what his friends have become: poor comforters, every one.",
        body: "Comfort that corrects before it listens only adds weight. Job says that if their places were swapped, he too could pile up words and shake his head. Anyone can. Real consolation shares the burden instead of explaining it: bear one another's burdens (Galatians 6:2).",
        question: "Whose burden could you help carry this week without a word of advice?",
        art: "friends",
        father: {
          verse: 3,
          index: 0,
          excerpt:
            "For if there be some points which might be justly found fault with in time of distress, they ought to be put aside, lest the comforter by rebuking heighten the sorrow, which he had it in view to alleviate.",
        },
      },
      {
        id: "job-16-18",
        verse: 18,
        title: "Clean hands, pure prayer",
        hook: "Job says his hands are clean and his prayer pure. Gregory hears the voice of Christ.",
        body: "Job protests his innocence, and he is telling the truth. St. Gregory reads the line further: only One suffered with wholly clean hands and prayed a wholly pure prayer, Christ on the Cross, asking forgiveness for those who crucified Him.",
        question: "Is there someone you need to pray for, not only about?",
        art: "altar",
        father: {
          verse: 17,
          index: 0,
          excerpt:
            "Who only above all others ‘made pure prayers to God,’ in that even in the very anguish of His Passion He prayed in behalf of His persecutors, saying, Father, forgive them, for they know not what they do.",
        },
      },
      {
        id: "job-16-20",
        verse: 20,
        title: "A witness on high",
        hook: "At the bottom of his lament, Job is sure of one thing: he has a witness in heaven.",
        body: "Job feels attacked by God, yet he appeals to God against God: my witness is in heaven, my advocate on high. The Church hears Christ here, who ever lives to intercede for us (Hebrews 7:25), an advocate with the Father (1 John 2:1).",
        question: "Who do you trust to speak for you when your own words run out?",
        art: "redeemer",
        father: {
          verse: 19,
          index: 0,
          excerpt: "For when the Son was brought to His downfall on earth, there was a witness to Him in heaven.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job calls his friends poor comforters.", verse: 2 },
      { id: "b2", text: "He says neither speaking nor silence eases his wound.", verse: 7 },
      { id: "b3", text: "He says God has set him up as a mark.", verse: 13 },
      { id: "b4", text: "He says his hands are clean and his prayer pure.", verse: 18 },
      { id: "b5", text: "He says his witness is in heaven.", verse: 20 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "poor comforters are ye all",
        verse: 2,
        speaker: "job",
        choices: ["eliphaz", "job", "sophar"],
      },
      {
        id: "a2",
        quote: "my witness is in heaven, and my advocate is on high",
        verse: 20,
        speaker: "job",
        choices: ["job", "lord", "baldad"],
      },
    ],
    prompt: "Job had a witness in heaven when no one on earth understood him. Write what you would want your Advocate to say for you.",
  },
  {
    n: 17,
    title: "Where then is my hope?",
    movement: "second",
    cards: [
      {
        id: "job-17-3",
        verse: 3,
        title: "Someone to join hands",
        hook: "Job looks for someone to join hands with him, to stand surety for him.",
        body: "Joining hands sealed a pledge: someone vouching for you, taking your debt as his. Job finds no one on earth willing. The Church confesses the One who did it: Jesus was made a surety of a better testament (Hebrews 7:22).",
        question: "Who has stood surety for you, and for whom could you?",
        art: "friends",
        father: {
          verse: 3,
          index: 0,
          excerpt:
            "For He did not sin either in thought or deed: He was made to ‘abide in bitterness’ by His Passion, He was ‘set free’ by the Resurrection, He was ‘put beside’ the Father by His Ascension;",
        },
      },
      {
        id: "job-17-9",
        verse: 9,
        title: "Hold on your way",
        hook: "In the middle of his darkest words, Job says something steady: let the faithful hold on his way.",
        body: "Job's lament does not end in unbelief. Even while mocked and worn out, he tells the righteous to hold to their road and take courage. Endurance is not the absence of lament. It is keeping to the way while you lament.",
        question: "What is the one thing you will keep doing, even on the hardest day?",
        art: "wild",
        father: {
          verse: 9,
          index: 0,
          excerpt:
            "For he sees how much those things deserve to be despised, which Almighty God vouchsafes even to bad men: for if they were primarily great, the Creator would never vouchsafe them to His adversaries;",
        },
      },
      {
        id: "job-17-15",
        verse: 15,
        title: "Where is my hope?",
        hook: "Job calls corruption his mother and Hades his home, and asks where his hope has gone.",
        body: "Before Christ, even the righteous went down to Hades to wait. Job cannot see past that darkness, so he asks where his hope is. The Church answers with Holy Saturday: Christ descended into Hades and led out those who waited for Him.",
        question: "Where do you look for hope when you cannot see past today?",
        art: "night",
        father: {
          verse: 12,
          index: 0,
          excerpt:
            "in that since our Creator and Redeemer, penetrating the bars of hell, brought out from thence the souls of the Elect, He does not permit us to go there, from whence He has already by descending set others free.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job says he perishes and seeks for burial.", verse: 1 },
      { id: "b2", text: "He asks who will join hands with him.", verse: 3 },
      { id: "b3", text: "He says he has become a byword among the nations.", verse: 6 },
      { id: "b4", text: "He says the faithful should hold on their way.", verse: 9 },
      { id: "b5", text: "He asks where his hope is.", verse: 15 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "let the faithful hold on his own way",
        verse: 9,
        speaker: "job",
        choices: ["eliphaz", "job", "baldad"],
      },
      {
        id: "a2",
        quote: "Where then is yet my hope?",
        verse: 15,
        speaker: "job",
        choices: ["job", "wife", "sophar"],
      },
    ],
    prompt: "Job asked where his hope had gone. Write where you have found yours, or where you are still looking.",
  },
  {
    n: 18,
    title: "The lamp of the wicked",
    movement: "second",
    cards: [
      {
        id: "job-18-4",
        verse: 4,
        title: "Should the mountains move?",
        hook: "Baldad asks whether the mountains should be overthrown for Job's sake.",
        body: "Baldad scolds Job for thinking his suffering matters to the order of the world. The book says otherwise: heaven itself was watching Job's trial (1:8, 2:3). Not a sparrow falls to the ground without the Father (Matthew 10:29).",
        question: "Do you believe your pain is seen? What would change if you did?",
        art: "wild",
      },
      {
        id: "job-18-5",
        verse: 5,
        title: "True of the end, not of now",
        hook: "Baldad says the lamp of the wicked goes out. Gregory says that is true of the end, not of this life.",
        body: "Baldad's poem about the wicked is vivid: the lamp snuffed, the foot in the snare, the name forgotten. As a picture of the final judgment it holds. As a reading of this life it fails, since the wicked often prosper and the godly suffer.",
        question: "Where have you seen the good suffer and the careless prosper? How do you hold that?",
        art: "lamp",
        father: {
          verse: 5,
          index: 0,
          excerpt:
            "Which if it might have been rightly spoken in regard to an ungodly man, ought never to have been delivered against a holy man set fast in the midst of scourges.",
        },
      },
      {
        id: "job-18-8",
        verse: 8,
        title: "The net of habit",
        hook: "Baldad's foot caught in a net becomes, in Gregory, a picture of sin that has become habit.",
        body: "Baldad means it of Job, wrongly. But the image itself is true to the spiritual life, and the Fathers use it: a sin repeated becomes a snare, and the one caught cannot simply walk free. Only grace, with our struggle, loosens the net.",
        question: "Which small habit would you most like God to help you untangle?",
        art: "night",
        father: {
          verse: 8,
          index: 0,
          excerpt:
            "He, who ‘puts his feet into a net,’ cannot get them out, when he has a mind; so he that lets himself down, into habits of sin, cannot rise up the moment he wishes it;",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Baldad asks how long Job will go on.", verse: 2 },
      { id: "b2", text: "He asks if the mountains should be overthrown for Job's sake.", verse: 4 },
      { id: "b3", text: "He says the light of the ungodly shall be quenched.", verse: 5 },
      { id: "b4", text: "He says the wicked man's foot is caught in a snare.", verse: 8 },
      { id: "b5", text: "He says these are the dwellings of those who know not the Lord.", verse: 21 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "the light of the ungodly shall be quenched",
        verse: 5,
        speaker: "baldad",
        choices: ["baldad", "job", "eliphaz"],
      },
      {
        id: "a2",
        quote: "For wherefore have we been silent before thee like brutes?",
        verse: 3,
        speaker: "baldad",
        choices: ["sophar", "baldad", "job"],
      },
    ],
    prompt: "Baldad described the fate of the wicked to a man who was not wicked. Write about a time you were misjudged, and how you carried it.",
  },
  {
    n: 19,
    title: "My Deliverer lives",
    movement: "second",
    cards: [
      {
        id: "job-19-13",
        verse: 13,
        title: "Forsaken by his own",
        hook: "Brothers, kin, servants, even his wife: everyone Job loved has turned away.",
        body: "Job's list of the ones who have left him reads like the night of Christ's arrest, when they all forsook Him and fled (Mark 14:50). The Fathers saw Job as an image of Christ: righteous, suffering, and alone.",
        question: "Who near you is standing alone right now, and could use you close?",
        art: "friends",
        father: {
          verse: 21,
          index: 0,
          excerpt:
            "The mind of godly men is used to have this peculiar to itself, that when it suffers unjust treatment at the hands of enemies, it is not so much moved to wrath as to prayer;",
        },
      },
      {
        id: "job-19-23",
        verse: 23,
        title: "Written in a book",
        hook: "Job wishes his words were written in a book forever. You are reading that book.",
        body: "Job wanted his testimony carved in rock so that someone, someday, would know he was innocent. God granted more than he asked. His words entered Holy Scripture, and the Church reads his book aloud every Holy Week.",
        question: "What would you want written about your faith for those who come after you?",
        art: "mine",
      },
      {
        id: "job-19-25",
        verse: 25,
        title: "I know",
        hook: "From the ash heap comes the book's great confession: the One who will deliver me is eternal.",
        body: "At his lowest, Job confesses that his Deliverer is eternal and is coming. The Church hears Christ in these words: crucified, dead, and risen, who lives and will raise us. Hope here is not a feeling. It is knowledge: I know.",
        question: "What do you know about God that holds even when you feel nothing?",
        art: "redeemer",
        father: {
          verse: 25,
          index: 0,
          excerpt:
            "The unbelievers may know that He was scourged, mocked, struck with the palms of the hand, covered with a crown of thorns, besmeared with spittings, crucified, dead: I, with sure faith, believe Him to live after death;",
        },
      },
      {
        id: "job-19-26",
        verse: 26,
        title: "This same skin",
        hook: "Job says his own skin will be raised. Christ showed His wounds so that no one would doubt it.",
        body: "The resurrection the Church confesses is bodily. After Pascha, Christ let the disciples handle Him: a spirit has not flesh and bones (Luke 24:39). Job's hope for his own skin is the same hope, seen from far off.",
        question: "How does the resurrection of the body change how you treat your body now?",
        art: "restored",
        father: {
          verse: 26,
          index: 0,
          excerpt: "Whereas the ‘skin’ is expressly named, all doubt of a true resurrection is removed;",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job asks how long his friends will vex his soul.", verse: 2 },
      { id: "b2", text: "He says his brethren have stood aloof from him.", verse: 13 },
      { id: "b3", text: "He begs his friends to pity him.", verse: 21 },
      { id: "b4", text: "He wishes his words were written in a book forever.", verse: 23 },
      { id: "b5", text: "He says the One who will deliver him is eternal.", verse: 25 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Pity me, pity me, O friends",
        verse: 21,
        speaker: "job",
        choices: ["job", "wife", "eliphaz"],
      },
      {
        id: "a2",
        quote: "For I know that he is eternal who is about to deliver me",
        verse: 25,
        speaker: "job",
        choices: ["narrator", "job", "lord"],
      },
    ],
    prompt: "Job said 'I know' from the ash heap. Write one thing you know about God, even today.",
  },
  {
    n: 20,
    title: "Like a dream in the night",
    movement: "second",
    cards: [
      {
        id: "job-20-8",
        verse: 8,
        title: "Glory like a dream",
        hook: "Sophar says the wicked man's glory vanishes like a dream in the night.",
        body: "Sophar aims this at Job, and misses. But the image is true of every glory built on show: it looks solid until morning. Christ asks what it profits a man to gain the whole world and lose his own soul (Mark 8:36).",
        question: "What in your life is built for show, and what is built to last?",
        art: "night",
        father: {
          verse: 8,
          index: 0,
          excerpt:
            "What else is the life of the hypocrite but the vision of a phantom, which exhibits that in semblance which it does not possess in truth?",
        },
      },
      {
        id: "job-20-12",
        verse: 12,
        title: "Sweet under the tongue",
        hook: "Sophar describes sin kept like a sweet under the tongue, savoured in secret.",
        body: "Sophar's picture of hidden sin is one the Fathers knew well: a thought savoured in secret, never confessed, never let go. What tastes sweet at first turns to poison inside. The remedy the Church offers is simple and hard: bring it into the light in confession.",
        question: "Is there something you keep under your tongue that belongs in confession?",
        art: "lamp",
        father: {
          verse: 13,
          index: 0,
          excerpt:
            "For the evil that he delights in he ‘spares,’ because he does not, by practising penance, hunt it down in himself.",
        },
      },
      {
        id: "job-20-29",
        verse: 29,
        title: "Who reads the ledger?",
        hook: "Sophar closes by declaring God's verdict on the wicked, as though he could see it.",
        body: "Sophar speaks as if he could read the Lord's ledger, but the book will overturn him (42:7). Our part is St. Ephraim's Lenten prayer: grant me to see my own sins and not to judge my brother.",
        question: "What would change if you prayed to see your own faults before anyone else's?",
        art: "scales",
        father: {
          verse: 22,
          index: 0,
          excerpt:
            "For see, whereas scourges recover the Elect to life, and not even scourges keep the wicked from bad deeds, Almighty God’s judgments upon us are very secret and are not unjust.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Sophar says he did not expect Job to answer so.", verse: 2 },
      { id: "b2", text: "He says the mirth of the ungodly is a downfall.", verse: 5 },
      { id: "b3", text: "He says the wicked man flees like a dream.", verse: 8 },
      { id: "b4", text: "He says evil is sweet in the wicked man's mouth.", verse: 12 },
      { id: "b5", text: "He calls this the portion of the ungodly from the Lord.", verse: 29 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Like a dream that has fled away, he shall not be found",
        verse: 8,
        speaker: "sophar",
        choices: ["sophar", "job", "baldad"],
      },
      {
        id: "a2",
        quote: "Though evil be sweet in his mouth",
        verse: 12,
        speaker: "sophar",
        choices: ["eliphaz", "sophar", "job"],
      },
    ],
    prompt: "Sophar was sure who the wicked were. Write a short prayer asking to see your own faults first.",
  },
  {
    n: 21,
    title: "Why do the wicked prosper?",
    movement: "second",
    cards: [
      {
        id: "job-21-7",
        verse: 7,
        title: "The world as it is",
        hook: "Job states the fact the friends will not face: the ungodly often live long and die rich.",
        body: "The friends' theory needs the wicked to suffer and the good to prosper. Job points at the world as it is. Scripture asks the same question (Psalm 72, Jeremiah 12:1), and does not pretend the answer lies in this life alone.",
        question: "When the careless seem to prosper, what keeps you on your road?",
        art: "uz",
        father: {
          verse: 7,
          index: 0,
          excerpt: "For except the patience of God bore with them, they would never live long in their sins.",
        },
      },
      {
        id: "job-21-14",
        verse: 14,
        title: "Depart from us",
        hook: "The prosperous wicked say to God: depart from us, we do not want to know Your ways.",
        body: "Few people say this aloud. Gregory notes that we say it with our lives instead, by ignoring what God asks. The opposite prayer is the Church's: show me Your ways, O Lord, and teach me Your paths (Psalm 24:4).",
        question: "In what part of your life have you quietly asked God to keep His distance?",
        art: "gate",
        father: {
          verse: 14,
          index: 0,
          excerpt:
            "To say this in words even foolish men have not the boldness, yet all wicked persons say to God, not by their words but by their ways, Depart from us.",
        },
      },
      {
        id: "job-21-26",
        verse: 26,
        title: "The same dust",
        hook: "One dies at ease, another in bitterness, and the dust covers both alike.",
        body: "Job notices what the friends ignore: death does not sort the good from the bad by how they die. Whether a life was just is not decided at the graveside but at the Judgment, by the One who sees what we cannot.",
        question: "How would you want to be found when your days end?",
        art: "ashheap",
      },
    ],
    beats: [
      { id: "b1", text: "Job asks his friends simply to listen.", verse: 2 },
      { id: "b2", text: "He asks why the ungodly live and grow old in wealth.", verse: 7 },
      { id: "b3", text: "He says they tell the Lord to depart from them.", verse: 14 },
      { id: "b4", text: "He grants that the lamp of the ungodly will be put out.", verse: 17 },
      { id: "b5", text: "He says the dust covers the prosperous and the bitter alike.", verse: 26 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Wherefore do the ungodly live, and grow old even in wealth?",
        verse: 7,
        speaker: "job",
        choices: ["job", "sophar", "baldad"],
      },
      {
        id: "a2",
        quote: "How then do ye comfort me in vain?",
        verse: 34,
        speaker: "job",
        choices: ["eliphaz", "job", "sophar"],
      },
    ],
    prompt: "Job refused a neat answer to why the wicked prosper. Write about a question you have learned to carry without an answer.",
  },
];
