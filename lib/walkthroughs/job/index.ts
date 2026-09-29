// Walking with Job: the book in ten movements, as the Church reads it in
// Holy Week and the Fathers comment on it, one file per movement group.
// lib/walkthroughs/__tests__/job.test.ts holds every chapter to the same
// rules, and refuses the live switch in lib/walkthroughs/flags.ts unless all
// forty-two are here.

import type { Walkthrough } from "../types";
import { WISDOM_AND_DEFENSE } from "./defense";
import { ELIHU } from "./elihu";
import { FIRST_ROUND } from "./first";
import { PROLOGUE } from "./prologue";
import { SECOND_ROUND } from "./second";
import { THIRD_ROUND } from "./third";
import { WHIRLWIND_AND_EPILOGUE } from "./whirlwind";

export const JOB: Walkthrough = {
  book: "job",
  bookName: "Job",
  title: "Walking with Job",
  intro:
    "Job is the Church's book for suffering, read at Vespers in Holy Week. Walk it a chapter at a time: context where the text needs it, a line from St. Gregory the Great's commentary, and at each chapter's end a moment to put it in your own words.",
  fatherSource: "St. Gregory the Great, Morals on the Book of Job",
  movements: [
    { id: "prologue", title: "The trial", from: 1, to: 2 },
    { id: "lament", title: "Job's lament", from: 3, to: 3 },
    { id: "first", title: "The first round", from: 4, to: 14 },
    { id: "second", title: "The second round", from: 15, to: 21 },
    { id: "third", title: "The third round", from: 22, to: 27 },
    { id: "wisdom", title: "Where wisdom is found", from: 28, to: 28 },
    { id: "defense", title: "Job's last defense", from: 29, to: 31 },
    { id: "elihu", title: "Elius speaks", from: 32, to: 37 },
    { id: "whirlwind", title: "The voice from the whirlwind", from: 38, to: 41 },
    { id: "epilogue", title: "Restoration", from: 42, to: 42 },
  ],
  chapters: [...PROLOGUE, ...FIRST_ROUND, ...SECOND_ROUND, ...THIRD_ROUND, ...WISDOM_AND_DEFENSE, ...ELIHU, ...WHIRLWIND_AND_EPILOGUE],
};

/** The book's chapter count, whatever has been written so far. */
export const JOB_CHAPTER_COUNT = 42;
