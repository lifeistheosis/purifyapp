# Discord scan helper

A small CLI that reads recent messages from the Purify Discord on demand,
so Claude (and you) can scan the suggestions / forum / general channels
during a dev session without running a 24/7 bot.

No persistent process. No hosting. The Discord bot account exists in
Discord's database, and we hit Discord's REST API with a token whenever
we want fresh content.

## One-time setup

### 1. Create the bot account

1. Visit <https://discord.com/developers/applications> and sign in.
2. **New Application** → name it something honest (e.g. *Purify Reader*).
3. **Bot** tab → **Reset Token** → copy the token immediately
   (Discord only shows it once; if you miss it, reset again).
4. **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `View Channels`, `Read Message History`
   - Copy the generated URL, paste it into your browser, and authorize the bot to join the Purify Discord.

### 2. Find your channel IDs

1. In Discord, open **User Settings → Advanced** and enable **Developer Mode**.
2. Right-click each channel you want to scan (suggestions, forum, general,
   bugs, etc.) → **Copy Channel ID**.

### 3. Configure credentials

```bash
cp .env.discord.example .env.discord
```

Open `.env.discord` and fill in:

```env
DISCORD_BOT_TOKEN=your-bot-token-here
DISCORD_CHANNEL_SUGGESTIONS=123456789012345678
DISCORD_CHANNEL_FORUM=987654321098765432
# add or remove rows freely; any DISCORD_CHANNEL_<NAME> row is picked up
```

`.env.discord` is already covered by `.env*` in `.gitignore`. Do **not**
commit this file. If you ever leak the token, Discord auto-revokes it
within minutes — but reset it on the developer portal anyway.

### 4. Verify

```bash
npm run discord:list
```

Expected output:

```
Configured channels:
  forum           #ideas-and-forum        (987654321098765432)
  suggestions     #suggestions            (123456789012345678)
```

If you see a 401 the token is wrong; a 403 means the bot isn't invited
to the server or lacks the channel permission.

## Daily use

```bash
# Last 50 messages, human-readable feed
npm run discord:scan -- suggestions

# Last 100 messages
npm run discord:scan -- forum --limit 100

# JSON (for piping into other tools, or for Claude to parse)
npm run discord:scan -- suggestions --json

# Only messages since a date
npm run discord:scan -- bugs --since 2026-06-01T00:00:00Z
```

The `--` separator is npm's way of forwarding flags to the underlying
script. You can also call the script directly:

```bash
node scripts/discord-scan.mjs suggestions --limit 100
```

## Output shape (human mode)

```
# #suggestions  (123456789012345678)
# topic: Tell us what to build next.
# 12 messages

── 2026-06-06 14:22:01Z  Edgar @lifeistheosis
   Could we add a sleep timer to the ambience player?
   [reactions] ⭐×3  👀×1

── 2026-06-06 15:08:44Z  Maria @maria
   The Prayer Rope Anthem panel needs the lyrics to be visible by default on mobile.
   [thread] mobile-lyrics-default (1234...)
```

## What Claude does with this

During a dev session you can say "scan the Discord suggestions" or
"what's new on the forum?" Claude runs `npm run discord:scan -- <channel>
--limit <N>` via the Bash tool, reads the output, and folds the actual
requests into the work in flight.

If you want Claude to scan proactively (without you asking) we'd need to
upgrade to Option B — a 24/7 archiver on Fly.io with messages persisted
to Supabase. That's a separate effort; this script is the minimum
viable scanner.

## Limits and caveats

- **One channel per call.** Loop the script if you want a sweep.
- **Last ~100 messages per call.** Discord's REST API paginates; the
  `--limit` flag caps at 100. For longer history we'd need to add a
  pagination loop using the `before=<message-id>` parameter.
- **No real-time monitoring.** This is pull, not push. The bot doesn't
  need to be "online" — it just needs to exist and be a member of the
  server.
- **Token security.** Treat `.env.discord` like a password file.
  Regenerate the token if it ever ends up in a screenshot, a shared
  log, a pasted error, or a public repo.
- **Rate limits.** Discord allows generous polling rates. If you hit
  429, the script reports the retry-after value.
