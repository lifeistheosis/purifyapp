# Content skills

Claude skills for writing Purify's social and newsletter content. They trigger automatically when the work matches, so ask for what you want ("write a post about the Dormition fast", "give me post ideas") rather than naming a skill.

## Source and licence

Vendored from [charlie947/social-media-skills](https://github.com/charlie947/social-media-skills) at commit `94f72ea` (2026-05-20), MIT. Upstream licence kept as `LICENSE-upstream`.

Upstream is a personal-brand LinkedIn system. Purify is an institutional voice with binding editorial rules, so the copy is patched rather than pristine. Every change is listed below so an upstream update can be re-applied deliberately.

## The foundation

Every skill reads these two first:

- `docs/brand/about-purify.md`, what Purify is, who it is for, the four content pillars
- `docs/brand/voice.md`, how it writes, and **Section 0, the six non-negotiables**

Section 0 is the point of the whole integration. It carries the rules from `docs/editorial-standards.md` into anything published: no invented patristic quotations, no settling disputed doctrine, no AI framing passed off as Church teaching, no claiming dark features, no unverified prices, honest attribution on saints' lives.

## What was changed from upstream

| Change | Why |
|---|---|
| Voice files repointed from `about-me.md` / `voice.md` at repo root to `docs/brand/about-purify.md` / `docs/brand/voice.md` (103 references) | Purify's root is a product repo root, and "about-me" is wrong for a brand |
| Purify overlay block inserted after the frontmatter of 14 content-producing skills | Makes Section 0 override each skill's own instructions to sharpen a hook or raise a score |
| `voice-builder` auto-start interview replaced with a guard | It would have overwritten the curated voice files on the phrase "build my voice". The interview is retained for other brands |
| `post-scorer` "Use Charlie Hills data" relabelled to "Use reference benchmarks" | The cached data file does not exist here. The numbers are kept as a directional creator baseline, with provenance stated |
| `pinned-comment` removed | Its entire mechanic is founder-as-butt-of-the-joke personal-brand comedy. It does not convert to an Orthodox institutional voice, and a de-Charlie'd version would be worse than nothing |
| All 47 em dashes replaced with commas | House rule, and these files are the ones teaching the model how to write. All 47 were structural separators, so no meaning changed |

Files otherwise byte-identical to upstream.

To re-apply after an upstream pull: repoint the voice paths, re-insert the overlay, re-guard `voice-builder`, re-drop `pinned-comment`, strip em dashes. Then run upstream's `validate-skills.sh` from `.claude/` and confirm `grep -rc "—"` is zero.

## The 16 skills

**Ready now, no external services:**
`post-writer`, `hook-generator`, `content-matrix`, `post-formatter`, `newsletter-voice`, `niche-research`, `analytics-dashboard` (needs a LinkedIn Analytics xlsx export)

**Need a Google Gemini API key for image generation:**
`quote-post`, `graphic-designer`, `gemini-carousel`, `gemini-infographic`, `youtube-thumbnail`, `profile-optimizer`

**Need an Apify token, paid per scrape:**
`post-scorer` (~$0.50 a run, or use the built-in benchmarks free), `reels-scripting` (also references ElevenLabs and HeyGen for voice and avatar)

No key is wired up. Nothing is set up as a background job or a paid pipeline. The Gemini and Apify paths are optional branches inside those skills, and each one has a manual fallback, so everything works without a key.

## Fit

Upstream is built for LinkedIn first. Purify's audience is not primarily on LinkedIn, so the highest-value skills here are the platform-neutral ones: `post-writer`, `hook-generator`, `content-matrix`, `newsletter-voice`, `quote-post`. Treat the LinkedIn-specific formatting rules in those files as one platform's conventions, not as Purify's house style. `docs/brand/voice.md` is the house style.
