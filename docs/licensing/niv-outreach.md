# NIV licensing outreach

## Who controls the rights

The **New International Version** (NIV) is owned by **Biblica** (formerly the International Bible Society). Biblica handles all digital and app licensing directly. Zondervan and HarperCollins publish the printed editions in North America under license from Biblica but do **not** grant digital app rights - those come from Biblica only.

The NIV is one of the more actively enforced English translations. Biblica regularly revokes or refuses licenses that don't meet their requirements, so plan for a real review process and don't ship even snippets of the text until the license is signed.

## Contact paths

- **Biblica - Permissions & Licensing**
  - Permissions site: https://www.biblica.com/permissions/
  - Licensing inquiry form: https://www.biblica.com/contact/licensing/
  - Email (verify before sending; addresses change): permissions@biblica.com or rights@biblica.com
  - Phone: 719-867-2700 (Colorado Springs, US headquarters)
- For very large or unusual deals, Biblica may route you through **Zondervan Bible Publishing** for co-review.

Confirm current contact details on biblica.com before sending; their licensing process and forms change year to year.

## What to ask for

A digital app license that allows:

- Full NIV text in the Old and New Testaments. Note: the NIV does **not** include the deuterocanon, so you would still need a separate solution for Tobit, Wisdom, Sirach, the Maccabees, etc. (the public-domain Brenton LXX continues to fill that gap).
- Web and mobile distribution (iOS, Android, web). State both explicitly.
- Free-tier and paid-tier user counts. Biblica licenses are typically tiered by monthly active users or revenue share.
- Offline reading (cached on device).
- Optional: NIV Study Bible notes - separately licensed, separately priced. The Orthodox Study Bible uses NKJV, not NIV, so NIV study notes are a different and unrelated workstream.

Be clear that this is a **commercial app** with a free tier and a paid tier. Typical NIV digital terms run revenue share (commonly in the 10-15% range for app installs) or annual minimums; Biblica is less negotiation-friendly than smaller publishers and often has set rates.

## Draft email

Subject: NIV digital licensing for "Purify" - an Orthodox companion app

> Hello,
>
> I'm building Purify, an Eastern Orthodox companion app (web + iOS/Android, free tier with optional paid subscription). I'd like to license the NIV Bible text for in-app use.
>
> About the app:
> - Free tier: full Bible, prayer plans, saints' works, prayer campaigns, Orthodox calendar.
> - Paid tier: ad-free experience, personal prayer plans, marketplace tools.
> - Target audience: Orthodox Christians and inquirers in the English-speaking world.
>
> What I'm looking to license:
> - Full NIV text (Old and New Testament).
> - Web and native mobile distribution, with offline reading.
> - Approximate projected MAU at launch: [your estimate]. Year-1: [your estimate].
>
> The Orthodox canon includes the deuterocanonical books, which the NIV does not contain - I plan to continue serving those from the public-domain Brenton Septuagint and would be displaying the NIV alongside that text where applicable. Please let me know if that arrangement requires any additional discussion.
>
> Could you point me to your current rate sheet, term lengths, and the application process for digital app licensing at this scale?
>
> Thank you,
> [Your name]
> [Your email] - [Your phone]
> Purify (orthoapp), [link to landing page]

## Strategy note on running NKJV + NIV outreach in parallel

You now have two outreach threads:

- **NKJV + OSB notes** via HarperCollins Christian Publishing / Thomas Nelson (see [nkjv-osb-outreach.md](nkjv-osb-outreach.md)).
- **NIV** via Biblica (this doc).

If your goal is the *Orthodox Study Bible feel*, NKJV+OSB is the stronger path - the study notes are the actual Orthodox apparatus, and OSB already exists as a packaged product. NIV is mainly useful as a familiar everyday translation for users; its study notes are not Orthodox.

A pragmatic order:

1. Send the NKJV+OSB inquiry first; this is the closer match to the product vision.
2. Send NIV in parallel only if you want to offer multiple translations on the paid tier as a feature.
3. While both are pending, ship Brenton LXX + KJV (already in production) with patristic commentary growing from public-domain Schaff.

## Realistic timeline

- Initial response from Biblica: 1-3 weeks (sometimes longer).
- Application + terms negotiation: 1-3 months.
- Integration once licensed: ~1 week (text ingestion + UI affordances are already in place).
