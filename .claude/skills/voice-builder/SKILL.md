---
name: voice-builder
description: >
  Build a personalised voice profile inside a Cowork project from a short interview plus 3 to 5 sample pieces of writing. Works for any content format: LinkedIn posts, newsletters, essays, emails, blog posts, tweets, or any other published writing. Use this skill at the start of any Cowork project where the user wants Claude to learn who they are and how they write before drafting new content. Trigger whenever the user says "build my voice", "learn my voice", "set up my content system", "onboard me", "train on my writing", "train on my posts", "I want Claude to sound like me", or drops a batch of writing samples into chat at the start of a project. Also trigger for first-time Cowork users who need a voice foundation before writing anything. In Purify these two files already exist at docs/brand/about-purify.md and docs/brand/voice.md, so this skill reports and edits them in place rather than regenerating them. Full rebuild only on explicit request.
---

# Voice Builder

## Purify guard: read before running anything below

Purify's voice foundation already exists and is the source of truth:

- `docs/brand/about-purify.md`
- `docs/brand/voice.md`

**Do not run the interview by default.** It is an onboarding flow for a new personal brand, and running it would overwrite curated files that encode binding editorial rules from `docs/editorial-standards.md`.

When this skill triggers:

1. Read both files and tell the user what is already established.
2. If they want a change, edit that section in place. Never regenerate either file wholesale.
3. Run the interview below only if the user explicitly asks to rebuild the voice from scratch. Warn first that Section 0 of `voice.md`, the non-negotiables, must survive any rebuild verbatim.

The interview is retained for reference, and for building a voice profile for a different brand rather than for Purify.

## Step 1. Run the About Me interview

You MUST call the AskUserQuestion tool to ask these questions. Do not type the questions as chat text. Use the tool. The tool renders as an interactive form the user fills in, which is a better experience than typing answers into chat.

AskUserQuestion supports a maximum of 4 questions per call, so send two calls: Batch 1 first, wait for answers, then Batch 2.

### Batch 1 (your very first action, no text before it)

Call AskUserQuestion with this exact JSON structure for the questions parameter:

```json
[
  {
    "question": "What is your name and what do you do?",
    "header": "About you",
    "multiSelect": false,
    "options": [
      {"label": "Founder", "description": "I run my own company or consultancy"},
      {"label": "Marketing lead", "description": "I lead marketing at a company"},
      {"label": "Creator", "description": "I create content as my main thing"},
      {"label": "Sales leader", "description": "I lead a sales team or run BD"}
    ]
  },
  {
    "question": "Who are you writing for?",
    "header": "Audience",
    "multiSelect": false,
    "options": [
      {"label": "Founders and CEOs", "description": "Decision makers running companies"},
      {"label": "Marketers", "description": "Marketing professionals at any level"},
      {"label": "Job seekers", "description": "People looking for their next role"},
      {"label": "Other professionals", "description": "A different group entirely"}
    ]
  },
  {
    "question": "What are the 3 to 5 topics you want to be known for?",
    "header": "Topics",
    "multiSelect": true,
    "options": [
      {"label": "AI and automation", "description": "How AI tools change work"},
      {"label": "Marketing", "description": "Strategy, content, growth"},
      {"label": "Leadership", "description": "Management, hiring, culture"},
      {"label": "Personal brand", "description": "Building an audience and reputation"}
    ]
  },
  {
    "question": "What is your point of view on your industry, the thing you believe that others do not?",
    "header": "Hot take",
    "multiSelect": false,
    "options": [
      {"label": "Most advice is wrong", "description": "The consensus in your industry is broken"},
      {"label": "People overcomplicate it", "description": "The answer is simpler than people think"},
      {"label": "A big shift is coming", "description": "Something is about to change and most people are not ready"}
    ]
  }
]
```

### Batch 2 (send immediately after Batch 1 answers come back, no commentary between)

Call AskUserQuestion again with:

```json
[
  {
    "question": "What is the one thing you want people to think when they see your name?",
    "header": "Brand promise",
    "multiSelect": false,
    "options": [
      {"label": "This person is practical", "description": "They give me things I use immediately"},
      {"label": "This person is honest", "description": "They tell me what others will not"},
      {"label": "This person is ahead", "description": "They see what is coming before everyone else"}
    ]
  },
  {
    "question": "What is one thing you refuse to write about?",
    "header": "Off limits",
    "multiSelect": false,
    "options": [
      {"label": "Politics", "description": "No political takes, ever"},
      {"label": "Personal life", "description": "Keep it professional only"},
      {"label": "Competitors", "description": "No naming or shaming other people or brands"}
    ]
  }
]
```

After both batches are answered, move to Step 2. If any answer is blank or skipped, ask that specific question once more in chat, then move on.

## Step 2. Write docs/brand/about-purify.md

Create docs/brand/about-purify.md in the project root. Use this structure:

```
# About Me

## Name and role
[From question 1]

## Audience
[From question 2, expanded into 2 to 3 sentences on who the reader is]

## Topic pillars
[3 to 5 topics from question 3, one line each]

## Point of view
[From question 4, the contrarian or distinctive belief, written as a clear statement]

## Brand promise
[From question 5, the one thought the author wants to own in the reader's head]

## Off limits
[From question 6, topics or angles never to write about]
```

Keep it under 300 words. Every line should be something Claude would reference when writing.

## Step 3. Ask for the samples

Say this:

> Now paste 3 to 5 pieces of writing you want me to learn from. These can be LinkedIn posts, newsletter issues, essays, blog posts, emails, tweets, or any other writing you have published. They can be yours or someone whose voice you admire. One piece per message or all at once. If you do not have any samples ready, type "use samples" and I will load a starter set you can swap out later.

Wait for the user to paste. Minimum 3 samples before moving to analysis. If they paste fewer than 3, ask for more.

If the user types "use samples", load the writing from `references/sample-content.md` inside this skill folder. Tell the user which author the samples are from so they know what voice they are borrowing. Remind them they can replace these with their own writing later.

## Step 4. Analyse the samples

Read every sample. Look for patterns across all of them, not individual quirks from one piece. Extract:

**Voice signals**
- Average sentence length
- Paragraph rhythm (single line breaks, blank lines, staccato versus flowing)
- Hook or opening style (contrarian, question, data point, story, confession, observation)
- Point of view (first person, second person, observational)
- Tone (deadpan, warm, blunt, playful, clinical)
- Signature phrases or recurring words
- CTA or closing style

**Structural signals**
- Length range
- Lists versus prose
- How they open, how they close
- How they handle transitions

**Topic signals**
- Subjects that come up across multiple samples
- Who the audience appears to be
- What the author stands for

**Absence signals**
- Words and punctuation consistently absent (for example, em dashes in 0 of 5 samples)
- Hook types the author never uses
- Tones the author never hits
- Structures the author avoids

## Step 5. Write docs/brand/voice.md

Create docs/brand/voice.md in the project root. This is a single integrated profile covering both how the voice writes and what the voice avoids. No separate voice file.

```
# Voice Profile

## Who I sound like
[2 to 3 sentences describing the overall voice in plain language]

## Tone
[3 to 5 attributes the voice consistently hits, followed by 1 to 2 tones the voice never hits, drawn from gaps in the samples]

## Sentence rhythm
[Average length, pacing, paragraph structure. Include avoidance patterns: e.g. never staccato fragments, never tricolons, no sentences over 25 words]

## Hook patterns
[3 to 5 hook types observed, with one example each from the samples. Note any hook types absent across all samples, e.g. never rhetorical questions, never "imagine a world where"]

## How I open
[1 to 2 sentences. Note opening moves the voice avoids if a clear pattern of avoidance exists across samples]

## How I close
[1 to 2 sentences, include CTA style. Note closing moves the voice avoids, e.g. never motivational summaries, never "in conclusion"]

## Signature phrases
[Recurring words or phrases from the samples]

## Off-limits
[Words, punctuation, or constructions absent from every sample. Only list items the samples clearly avoid. Examples: no em dashes (0 of 5 samples), no hashtags, no corporate jargon by name]

## What this voice never does
[3 to 5 specific behaviours drawn from gaps in the samples. Be specific. If the samples never use the "not X, but Y" construction, list it. If they avoid a specific vocabulary set, name the words]
```

Fill every section from the actual samples. No generic filler. If a pattern is not present, say so. Do not duplicate audience or topic pillars from docs/brand/about-purify.md.

The Off-limits and What this voice never does sections are drawn from observation, not from a generic banned-words template. Every item must be backed by absence across the samples.

## Step 6. Confirm and hand off

Tell the user:

> Your voice profile is built. Two files are now in your project: docs/brand/about-purify.md and docs/brand/voice.md. Every time you work in this project, I will reference both automatically. You can open and edit either file anytime.
>
> You are ready to go. Here is what you can do next:
>
> - Say "build my newsletter voice" to create newsletter-specific writing instructions
> - Say "write a post" to draft a LinkedIn post in your voice
> - Say "design a graphic" to create a visual for a post
> - Say "score my post" to get feedback on a draft
> - Say "optimize my profile" to rebuild your LinkedIn profile
>
> Each of these is a separate skill. Pick one and go.

## What this skill produces

Two files in the project root:

1. docs/brand/about-purify.md: who the user is, their audience, their topic pillars, their point of view
2. docs/brand/voice.md: the integrated voice profile, covering positive signals (how the voice writes) and absence signals (what the voice avoids) in one document

## Rules

- When this skill triggers, go straight to Step 1. No summary, no explanation, no preamble.
- Always output sample content inside a code block so the user can copy-paste the exact formatting without losing line breaks or whitespace. Use a plain code block (triple backticks with no language tag).
- Work from what is in the samples. Do not invent patterns that are not there.
- Minimum 3 samples for pattern detection. Ask for more if fewer than 3.
- If samples contradict each other, note the contradiction in docs/brand/voice.md rather than smoothing it over.
- Keep docs/brand/about-purify.md under 300 words.
- Keep docs/brand/voice.md under 500 words.
- British English throughout unless the samples are clearly American.
- Never use em dashes in any output file or in any draft.
- Do not produce an docs/brand/voice.md file. Absence signals live inside docs/brand/voice.md.
