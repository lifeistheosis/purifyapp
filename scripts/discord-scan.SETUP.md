# Discord scan — step-by-step setup

This is the concrete walkthrough. Do these in order. After each step
you'll have something to paste into the `.env.discord` file that's
already sitting in the project root.

Total time: about 10 minutes.

---

## Step 1: Create the bot account

1. Open <https://discord.com/developers/applications> in your browser.
   Sign in with your Discord account.

2. Click the blue **New Application** button in the top-right corner.

3. A dialog appears asking for a name. Type something honest — for
   example **Purify Reader**. Check the box agreeing to terms. Click
   **Create**.

4. You're now on the application's settings page. On the left side
   there's a menu with **General Information**, **OAuth2**, **Bot**,
   **App Testing**, etc. Click **Bot**.

5. On the Bot page, find the section labeled **TOKEN** (it's near the
   top, under the bot's name and avatar). Click **Reset Token**.

6. A dialog warns that resetting invalidates the old token. Click
   **Yes, do it!**.

7. If you have two-factor auth enabled, Discord asks for the code.
   Enter it.

8. The page now shows a long string of letters, numbers, dots, and
   dashes. **This is your bot token.** Click **Copy** to copy it.

   > **CRITICAL**: Discord only shows the token this once. If you
   > close the page without copying, you have to reset again.

9. Open `.env.discord` (already in your project root). Paste the
   token after `DISCORD_BOT_TOKEN=`. No quotes, no spaces:

   ```env
   DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GqEXAMPLE.actualTokenHasMoreCharacters
   ```

10. Save the file.

**Do not commit this file.** It's already covered by `.env*` in
`.gitignore`, but if you ever paste the token into a screenshot, a
chat, or a public repo, immediately come back to the Bot page and
click **Reset Token** again.

---

## Step 2: Invite the bot to the Purify Discord

The bot exists now but isn't a member of your server yet.

1. Still on your application's settings page, click **OAuth2** in the
   left menu, then click **URL Generator**.

2. Under **SCOPES**, check the box next to **`bot`**.

3. A new section **BOT PERMISSIONS** appears below. Check exactly
   these two boxes:
   - **View Channels**
   - **Read Message History**

   Do not check anything else. The fewer permissions the bot has, the
   safer this is.

4. Scroll to the very bottom of the page. There's a **GENERATED URL**
   box with a long URL ending in `&permissions=...&scope=bot`. Click
   **Copy**.

5. Paste that URL into a new browser tab and hit Enter.

6. Discord shows an authorize dialog. Pick the Purify Discord from
   the dropdown. Click **Continue**, then **Authorize**.

7. Solve the captcha if asked.

The bot is now a quiet member of your server. You can see it in the
member list on the right side of the Discord app, probably under an
"Offline" section (which is correct — it doesn't run a process, so
it's permanently "offline" but the API account is fully active).

---

## Step 3: Find the channel IDs

You need the unique numeric ID for each channel you want me to read.

1. Open Discord. Click the gear icon next to your name in the
   bottom-left to open **User Settings**.

2. In the left menu, scroll down to **APP SETTINGS** and click
   **Advanced**.

3. Toggle **Developer Mode** ON. Close settings.

4. In the Purify Discord, right-click the channel you want — for
   example #suggestions. A menu appears at the bottom of which is
   **Copy Channel ID**. Click it. The ID is now in your clipboard.

5. Open `.env.discord`. Paste the ID after the matching line:

   ```env
   DISCORD_CHANNEL_SUGGESTIONS=1234567890123456789
   ```

6. Repeat for every channel you want me to be able to read. Common
   targets: #suggestions, #bugs, #general, an ideas forum. You don't
   need every channel — only the ones you care about.

7. For any line you don't fill in, either leave the value blank or
   delete the whole line. Blank values are ignored.

8. Save the file.

---

## Step 4: Verify it all works

From the project root in PowerShell:

```bash
npm run discord:list
```

**If it works**, you'll see something like:

```
Configured channels:
  bugs            #bugs                (1234567890123456788)
  suggestions     #suggestions         (1234567890123456789)
```

**Common failures**:

| Error | What it means | Fix |
|---|---|---|
| `Missing .env.discord` | The file isn't where the script expects | Make sure `.env.discord` (not `.env.discord.example`) exists in the project root |
| `Discord rejected the token (401)` | Wrong token | Reset and re-copy from the Bot page; make sure you copied the **bot token**, not the application's Client Secret |
| `Discord refused the request (403)` | Bot isn't in the server, or no permission on the channel | Re-run the OAuth invite URL; or in Discord, give the bot's role read access to that specific channel |
| `Unknown channel "suggestions"` | Channel ID is blank in `.env.discord` | Fill in the ID |

---

## Done. Now in our sessions

When you want me to read what's been posted, just say so. I'll run:

```bash
npm run discord:scan -- suggestions --limit 50
```

— and we'll work from what's there.
