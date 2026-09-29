// Job 1 to 3: the trial in heaven and on earth, and Job's lament.
// The text is our Septuagint (Brenton), so its names are used: the devil,
// the land of Ausis, Baldad and Sophar. Father lines are verbatim from St.
// Gregory the Great's Morals on the Book of Job (Oxford, 1844), held to the
// corpus by lib/walkthroughs/__tests__/job.test.ts.

import type { ChapterWalk } from "../types";

export const PROLOGUE: ChapterWalk[] = [
  {
    n: 1,
    title: "A righteous man in the land of Ausis",
    movement: "prologue",
    cards: [
      {
        id: "job-1-1",
        verse: 1,
        title: "Who Job is",
        hook: "Scripture praises a man who was not of Israel before it tells us anything he did.",
        body: "Ausis lay east of Israel, toward Edom and Arabia, and Job was not an Israelite. Scripture still calls him true, blameless, righteous and godly. The Church keeps his memory as the Righteous Job the Long-suffering on May 6, and reads his book in Holy Week.",
        question: "Which of those four words would you most want to be true of you?",
        art: "uz",
      },
      {
        id: "job-1-5",
        verse: 5,
        title: "A father's early prayer",
        hook: "After every feast, Job rose early to pray for children who had not asked him to.",
        body: "Before the Law of Moses, the head of a household offered sacrifice for it. Job offers one for each child, in case any had thought evil of God in their hearts. Scripture adds that he did this continually: prayer for them was his rule, not his emergency.",
        question: "Whom do you carry in prayer who does not know you do?",
        art: "altar",
        father: {
          verse: 5,
          index: 0,
          excerpt:
            "When it is said, sent and sanctified them, it is openly shewn what strictness he practised with those when present, for whom when absent he was not wanting in concern.",
        },
      },
      {
        id: "job-1-12",
        verse: 12,
        title: "The limit God draws",
        hook: "The devil can take nothing without leave, and even then he is told where to stop.",
        body: "The accuser needs permission, and God sets its bounds: all Job has, but not Job himself. The Fathers read this as comfort. No trial comes from outside God's providence, and none is allowed beyond what His grace makes bearable (1 Corinthians 10:13).",
        question: "Looking back, where did a hard season have a limit you only saw afterwards?",
        art: "council",
        father: {
          verse: 12,
          index: 0,
          excerpt:
            "We should mark in the Lord's words the dispensations of heavenly pity, how He lets go our enemy, and keeps him in; how He looses, and yet bridles him.",
        },
      },
      {
        id: "job-1-21",
        verse: 21,
        title: "Blessing with empty hands",
        hook: "Four messengers, four losses, and Job's first words are a blessing.",
        body: "Job grieves as the East grieved: he tears his robe and shaves his head. Then he falls to the ground and worships. His words give thanks for what was given before they name what was taken, and they end in blessing, not accusation.",
        question: "What could you thank God for today, before you are ever asked to give it back?",
        art: "messengers",
        father: {
          verse: 21,
          index: 0,
          excerpt:
            "it is a high consolation in the loss of what we have, to recall to mind those times, when it was not our fortune to possess the things which we have lost.",
        },
      },
    ],
    beats: [
      { id: "b1", text: "Job offers sacrifices for his children after their feasts.", verse: 5 },
      { id: "b2", text: "The angels come before the Lord, and the devil with them.", verse: 6 },
      { id: "b3", text: "The Lord gives all Job has into the devil's hand, but not Job himself.", verse: 12 },
      { id: "b4", text: "Messengers arrive one after another with news of loss.", verse: 14 },
      { id: "b5", text: "Job tears his robe, falls to the earth, and worships.", verse: 20 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Does Job worship the Lord for nothing?",
        verse: 9,
        speaker: "devil",
        choices: ["devil", "lord", "job"],
      },
      {
        id: "a2",
        quote: "the Lord gave, the Lord has taken away",
        verse: 21,
        speaker: "job",
        choices: ["narrator", "job", "lord"],
      },
    ],
    prompt: "Job blessed God with empty hands. Write one sentence about something you hold loosely, or would like to.",
  },
  {
    n: 2,
    title: "On the dung-heap",
    movement: "prologue",
    cards: [
      {
        id: "job-2-6",
        verse: 6,
        title: "Without cause",
        hook: "God Himself says Job lost everything without cause, and still the trial goes on.",
        body: "The Lord says Job still holds fast to his innocence, though he was struck without cause. So his suffering is not punishment for hidden sin. The book overturns, from its second page, the idea the friends will argue for thirty chapters. Again God sets a bound: spare his life.",
        question: "When you suffer, what do you assume it says about you?",
        art: "council",
        father: {
          verse: 6,
          index: 0,
          excerpt:
            "the dispensation of God both while guarding, forsakes his elect servant, and while forsaking, guards him.",
        },
      },
      {
        id: "job-2-8",
        verse: 8,
        title: "A potsherd outside the city",
        hook: "The greatest man of the East now sits where the city burned its refuse.",
        body: "Outside the city was where refuse was burned and the unclean were sent. The richest man of the East scrapes his sores with a broken piece of pottery. Scripture shows the whole distance of his fall before he says a single word of complaint.",
        question: "What is left of you when everything you are known for is taken away?",
        art: "ashheap",
        father: {
          verse: 8,
          index: 0,
          excerpt:
            "For the holy man reflected, whence that which he carried about him had been taken, and with the broken piece of a vessel of clay he scraped his broken vessel of clay.",
        },
      },
      {
        id: "job-2-9",
        verse: 9,
        title: "His wife's grief",
        hook: "Our Septuagint lets Job's wife speak at length, and she has lost everything too.",
        body: "The Septuagint gives her a longer speech than the Hebrew: she too buried their children and now wanders from house to house as a servant. Her grief is real. Yet her counsel is the enemy's last weapon, and Job answers it without cursing her.",
        question: "How do you answer despair in someone you love without despising them?",
        art: "night",
        father: {
          verse: 9,
          index: 0,
          excerpt:
            "The old adversary is wont to tempt mankind in two ways; viz. so as either to break the hearts of the stedfast by tribulation, or to melt them by persuasion.",
        },
      },
      {
        id: "job-2-13",
        verse: 13,
        title: "Seven days of silence",
        hook: "The friends' finest hour comes first, and they say nothing at all.",
        body: "Three kings travel far and sit in the dust beside him for seven days and seven nights, the length of mourning in the East, without a word. Silence honoured a grief too great for speech. Their trouble begins only when they start to explain it.",
        question: "When has someone's presence helped you more than their words?",
        art: "friends",
      },
    ],
    beats: [
      { id: "b1", text: "The Lord says Job still holds fast to his innocence.", verse: 3 },
      { id: "b2", text: "The devil strikes Job with sores from head to foot.", verse: 7 },
      { id: "b3", text: "Job sits on the dung-heap outside the city with a potsherd.", verse: 8 },
      { id: "b4", text: "His wife urges him to say a word against the Lord.", verse: 9 },
      { id: "b5", text: "Three friends come and sit with him seven days in silence.", verse: 13 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Skin for skin, all that a man has will he give as a ransom for his life.",
        verse: 4,
        speaker: "devil",
        choices: ["job", "devil", "wife"],
      },
      {
        id: "a2",
        quote: "If we have received good things of the hand of the Lord, shall we not endure evil things?",
        verse: 10,
        speaker: "job",
        choices: ["wife", "lord", "job"],
      },
    ],
    prompt: "The friends did best when they said nothing. Write about a time someone simply stayed with you.",
  },
  {
    n: 3,
    title: "Let the day perish",
    movement: "lament",
    cards: [
      {
        id: "job-3-3",
        verse: 3,
        title: "Lament is prayer",
        hook: "The devil said Job would curse God. He curses his birthday instead.",
        body: "Job does not curse God, as the devil said he would; he curses his own day. This is lament: pain spoken toward God rather than away from Him. Psalm 87, one of the Six Psalms read at every Matins, prays in the same dark key.",
        question: "What would you say to God if you stopped choosing your words?",
        art: "night",
        father: {
          verse: 3,
          index: 0,
          excerpt:
            "He, then, who already beholds the day of eternity, endures with difficulty the day of his mortal being.",
        },
      },
      {
        id: "job-3-8",
        verse: 8,
        title: "The great whale",
        hook: "Where the Hebrew says Leviathan, our Septuagint says the great whale.",
        body: "Job calls on those who can stir up the great whale, the monster of the deep and a picture of chaos, to undo the night he was born. The same beast returns at the end of the book, and there only God can master it.",
        question: "What chaos in your life have you asked to swallow a day whole?",
        art: "sea",
        father: {
          verse: 8,
          index: 0,
          excerpt:
            "For the strength of this whale is taken as a prey in the water, in that the wiliness of our old enemy is overcome by the Sacrament of Baptism.",
        },
      },
      {
        id: "job-3-23",
        verse: 23,
        title: "The same hedge",
        hook: "In chapter one the devil resented Job's hedge. Now Job feels it as a wall.",
        body: "The devil complained that God had put a hedge around Job to protect him. Now Job says God has hedged him in. What is shelter seen from outside can feel like confinement from within, and Job cannot yet see which one he is in.",
        question: "Is there a boundary in your life that is shelter, though it feels like a wall?",
        art: "lamp",
      },
    ],
    beats: [
      { id: "b1", text: "Job opens his mouth and curses the day of his birth.", verse: 1 },
      { id: "b2", text: "He asks that the night he was conceived be swallowed by darkness.", verse: 4 },
      { id: "b3", text: "He asks why he did not die at birth.", verse: 11 },
      { id: "b4", text: "He pictures the rest of the dead, small and great together.", verse: 19 },
      { id: "b5", text: "He says the thing he feared has come upon him.", verse: 25 },
    ],
    attribution: [
      {
        id: "a1",
        quote: "Let the day perish in which I was born",
        verse: 3,
        speaker: "job",
        choices: ["wife", "job", "devil"],
      },
      {
        id: "a2",
        quote: "why is light given to those who are in bitterness",
        verse: 20,
        speaker: "job",
        choices: ["job", "eliphaz", "narrator"],
      },
    ],
    prompt: "Job brought his worst words to God instead of walking away. Write one honest sentence you would find hard to pray.",
  },
];
