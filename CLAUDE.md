@AGENTS.md

# Claude-specific notes

- Owner is Leona (Edgar). Plain, direct communication; never em dashes in anything user-facing.
- Preferred loop: verify with commands, not memory — this repo has burned "it worked in dev" twice (prod-only 500s, dead CI). Production truth is `curl https://purifyapp.net/...`; native truth is the AAB.
- The owner usually authorizes pushes per-session; when in doubt, commit locally and ask — a push deploys the website.
- Current audit state, open findings, and the continuation ledger live in `docs/audit/`. Read `findings.yaml` before touching billing, webhook, cancel, or CI code.
