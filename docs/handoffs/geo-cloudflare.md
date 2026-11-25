# A visit's place from Cloudflare (2026-11-25)

**Why:** the admin's Readers page warned "ipwho.is probe failed". ipwho.is answered from a container, so the failure was Render's side: its free tier (ipwhois.io's, about 1,000 a day per server address, non-commercial) runs out on Render's shared addresses. The fallback, ip-api.com, is also free for non-commercial use only. Purify sells Plus, so both are a terms risk.

**What was done, at his word ("yes do option 1", then "push"):** `geoForRequest` in `lib/analytics/geo.ts` takes a new visit's place from Cloudflare's headers first (`cf-ipcountry`, and `cf-region`, `cf-ipcity`, `cf-iplatitude`, `cf-iplongitude` with the visitor location transform), and calls the two services only when they are absent. `/api/track` uses it; `/api/admin/geo-debug` shows whether the headers arrive. Test: `lib/analytics/__tests__/geoCloudflare.test.ts` (fails on the old code). Branch `524f93d2`; main `56e9000c`; the way back is `aefe1114`.

**His steps (Cloudflare, purifyapp.net; its DNS is his Cloudflare zone):** Network, IP Geolocation on; Rules, Transform Rules, Managed Transforms, "Add visitor location headers" on; the record proxied (orange cloud). Then `purifyapp.net/api/admin/geo-debug` signed in as admin (needs `ADMIN_DEBUG_ENABLED` in Render) shows `cloudflare` filled.

**Open, each for his yes:** the health probe still asks ipwho.is directly, so the warning can stay while visits are placed by Cloudflare; once the headers are seen, the probe should warn only when no source places visits. If the free services are dropped entirely, the privacy page, which names ipwho.is, changes with it (his wording).
