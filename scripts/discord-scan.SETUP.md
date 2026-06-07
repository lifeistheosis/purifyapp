# Discord scan — step-by-step setup

Concrete walkthrough. Do these in order; about 10 minutes. After each
step you'll have something to paste into the `.env.discord` file that's
already sitting in the project root.

When you're done you can scan **everything** — every text channel, every
forum, every thread — with a single command.

---

## Step 1: Create the bot account

1. Open <https://discord.com/developers/applications> in your browser.
   Sign in with your Discord account.

2. Click the blue **New Application** button in the top-right.

3. A dialog asks for a name. Type something honest, for example
   **Purify Reader**. Check the terms box. Click **Create**.

4. You're now on the application's settings page. On the left menu
   click **Bot**.

5. On the Bot page, near the top under the bot's name, click
   **Reset Token**.

6. A dialog warns that resetting invalidates the old token. Click
   **Yes, do it!**. If you have 2FA, enter the code.

7. The page now shows a long string of letters, numbers, dots, and
   dashes. Click **Copy**.

   > **CRITICAL**: Discord shows the token this once. If you close the
   > page without copying, just reset again.

8. Open `.env.discord` (already in your project root). Paste the
   token after `DISCORD_BOT_TOKEN=`. No quotes, no spaces:

   ```env
   DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GqEXAMPLE.actualTokenHasMoreCharacters
   ```

9. Save the file.

---

## Step 2: Invite the bot to the Purify Discord

The bot exists but isn't in your server yet.

1. Still in the developer portal, click **OAuth2 → URL Generator**.

2. Under **SCOPES**, check **`bot`**.

3. A **BOT PERMISSIONS** section appears. Check exactly:
   - **View Channels**
   - **Read Message History**

   That's it. Nothing else. The fewer permissions, the safer.

4. Scroll to the bottom. There's a **GENERATED URL** box. Click
   **Copy**.

5. Paste that URL into a new browser tab and press Enter.

6. Discord shows an authorize dialog. Pick the Purify Discord from
   the dropdown. Click **Continue**, then **Authorize**.

7. Solve the captcha if asked.

The bot is now a quiet member of your server. It'll show up in the
member list as permanently "Offline" — that's normal. The account
is fully active; it just isn't running a real-time gateway connection.

---

## Step 3: Get the server (guild) ID

This is the single piece that lets the script discover every channel
on its own, so you don't have to list each one.

1. Open Discord. Click the gear icon by your name (bottom-left) to
   open **User Settings**.

2. **APP SETTINGS → Advanced → Developer Mode** = ON. Close settings.

3. In the Purify Discord, **right-click the server icon** at the very
   top of the channel list (the round image representing the whole
   server). A menu appears with **Copy Server ID** at the bottom. Click it.

4. Open `.env.discord`. Paste after `DISCORD_GUILD_ID=`:

   ```env
   DISCORD_GUILD_ID=1234567890123456789
   ```

5. Save.

You don't need to fill in any individual `DISCORD_CHANNEL_*` lines
with the guild ID set. They're optional shortcuts for naming
specific channels if you ever want to.

---

## Step 4: Verify it all works

From the project root in PowerShell:

```bash
npm run discord:list
```

**If it works**, you'll see a tree of every channel and forum the bot
can see, grouped under their Discord categories. Something like:

```
Guild 1234567890123456789 — readable surfaces

[Community]
  #welcome                       [text]      9876...
  #general                       [text]      9876...
  #suggestions                   [text]      9876...

[Forums]
  #ideas                         [forum]     9876...
  #bugs                          [forum]     9876...

— Forum threads —

  ideas  (active: 4, archived sample: 8)
    🟢 Sleep timer for ambience  1111...
    🟢 Anthem lyrics on mobile   2222...
    ⚪ (older, archived)         3333...
```

If you see a 401, the token is wrong. If 403, the bot isn't in the
server or its role can't see a particular channel.

---

## Done. Now in our sessions

When you want me to look at what's been posted, just say so.

```bash
# Scan EVERYTHING — every text channel + every forum thread
npm run discord:all

# Scan a single channel by its real Discord name
npm run discord:scan -- suggestions

# Scan a forum (auto-enumerates its threads)
npm run discord:scan -- ideas

# Only new stuff since a date
npm run discord:all -- --since 2026-06-01T00:00:00Z

# Dump JSON instead of the readable feed
npm run discord:all -- --json

# When scanning a forum, dive into each thread's replies, not just openers
npm run discord:scan -- ideas --full
```

The `--` after the npm script name is npm's way of forwarding flags to
the underlying node script — you have to include it before any flag.

---

## Common failures

| Error | What it means | Fix |
|---|---|---|
| `Missing .env.discord` | The file isn't where the script expects | Confirm `.env.discord` (not the `.example`) sits in the project root |
| `Discord rejected the token (401)` | Wrong token | Reset and recopy from the Bot page. Confirm you copied the bot token, not the application Client Secret |
| `Discord refused the request (403)` | Bot not in server, or role can't read that channel | Re-run the OAuth invite URL; or in Discord, edit the bot's role and grant View Channels + Read Message History on the affected channel |
| `Unknown channel "ideas"` | Channel doesn't exist or is hidden from the bot | `npm run discord:list` to see what the bot can see |
| `Cannot scan all without DISCORD_GUILD_ID` | The guild ID wasn't pasted into `.env.discord` | Right-click the server icon → Copy Server ID, paste into `.env.discord` |
| `Rate limited; gave up after retries` | Hit Discord's per-bot rate ceiling on a huge scan | Wait a minute and try again; or narrow with `--since` |
