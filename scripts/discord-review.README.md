# Discord review and respond

The loop for keeping up with the Purify community: **review → discern →
respond**. Read-only scanning gathers what people said; you decide; a templated
plan posts the replies. Nothing is ever posted automatically.

## The three tools

| Tool | Direction | What it does |
|---|---|---|
| `scripts/discord-review.mjs` | read-only | Digest of the four community surfaces since the last review |
| `scripts/discord-scan.mjs` | read-only | Deep scan of one channel / the whole guild (see discord-scan.README) |
| `scripts/discord-act.mjs` | write (dry-run by default) | Posts replies and closes threads from a JSON plan |

Surfaces reviewed: `#purify-suggestions`, `#pdf-library`, `#dogma-exegesis`
(forums) and `#main` (daily chat, to hear what people say about Purify).

## 1. Review

```
node scripts/discord-review.mjs                 # since last --mark, or last 24h
node scripts/discord-review.mjs --since 2026-06-08T00:00:00Z
node scripts/discord-review.mjs --mark          # review, then advance the cursor
```

It prints a grouped digest (SUGGESTIONS / PDF LIBRARY / DOGMA & EXEGESIS / MAIN
CHAT), marking `NEW` threads. The window is tracked in
`scripts/.discord-review-state.json` (gitignored); `--mark` updates it. Run
`--mark` only after you have finished reviewing, so a partial run never skips
messages.

## 2. Discern

Read the digest. Decide per item: ship, confirm, defer, reject, thank, or ask
for more. Cross-reference `SUGGESTIONS_AUDIT.md` and `Homerun (v9.7-v10).md`
before promising anything.

## 3. Respond

Write a plan to `scripts/discord-actions.json`, dry-run it, read it, then
execute. **Approve-first is the rule: the bot never posts unattended.**

```
node scripts/discord-act.mjs scripts/discord-actions.json            # DRY-RUN
node scripts/discord-act.mjs scripts/discord-actions.json --execute  # send
```

### Plan action fields

- `thread_id` (required) — the thread to act on.
- `thread_name` (optional) — for readable dry-run output only.
- `template` — one of `ship` `confirm` `defer` `reject` `thanks` `info`.
- `vars` — values the template uses: `version`, `feature`, `link`, `reason`, `ask`.
- `mention` — `true` to @mention the thread's original author.
- `post` — freeform message; overrides `template` when both are set.
- `close` — archive + lock. Defaults to `true` for `reject`, `false` otherwise.

### Templates (reverent, no em-dashes)

- **ship** — "Shipped in {version}. {feature} {link} Thank you for the suggestion."
- **confirm** — "Confirmed for {version}. We will ping this thread when it ships. Thank you for the suggestion."
- **defer** — "Thank you for this. It is a good idea, and we are holding it for a later patch... We will keep the thread in view."
- **reject** — "Thank you for taking the time to share this. After prayerful thought we have decided not to take it forward, for this reason: {reason}. We hope you understand, and we are grateful for your love for Purify and the Church."
- **thanks** — "Thank you, this is noted and under consideration."
- **info** — "Thank you. Could you say a little more about {ask}? It will help us scope it well."

The em-dash guard runs on the FINAL rendered message, so a `reason` or `ask`
containing an em-dash will block the run.

### Example plan

```json
[
  {
    "thread_id": "1513443886754955314",
    "thread_name": "Nicene creed",
    "template": "confirm",
    "vars": { "version": "v9.7" },
    "mention": true
  },
  {
    "thread_id": "1511240715961634909",
    "thread_name": "Debater simulator",
    "template": "reject",
    "vars": { "reason": "it leans on generated argument, and Purify stays to verbatim sources and the Fathers' own words" },
    "mention": true
  }
]
```

The first confirms and stays open; the second posts the gentle rejection and
closes the thread.
