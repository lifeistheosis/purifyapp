@AGENTS.md

# Claude-specific notes

- Owner is Leona (Edgar). Plain, direct communication; never em dashes in anything user-facing.
- **Simplified mode** (the owner's older name for it: driver mode). When the owner asks for it, replies to them are very short and plain, emojis welcome, to save tokens. It changes only how you talk to the owner, never the work: the same verification, the same care in anything committed, and no em dashes. It stays on until they say to turn it off.
- Preferred loop: verify with commands, not memory — this repo has burned "it worked in dev" twice (prod-only 500s, dead CI). Production truth is `curl https://purifyapp.net/...`; native truth is the AAB.
- The owner usually authorizes pushes per-session; when in doubt, commit locally and ask — a push deploys the website.
- Current audit state, open findings, and the continuation ledger live in `docs/audit/`. Read `findings.yaml` before touching billing, webhook, cancel, or CI code.
