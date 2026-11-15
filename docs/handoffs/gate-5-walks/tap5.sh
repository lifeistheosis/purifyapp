#!/usr/bin/env bash
# Gate 5 (2026-11-15), step 3: the tap walk, both readers, --online, on the screens Updates 92 to 97 touched.
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-5-walks
ONLY="/account/,/settings/,/premium/,/plan/,/community/,/prayers/bows/,/reading/,/history/alaska-mission/,/bible/matthew/28/,/walkthroughs/job/1/,/set-password/,/campaigns/,/shop/,/shop/stores/"
for reader in open new; do
  env_=""; [ "$reader" = new ] && env_="SELLS_PLUS=1"
  env $env_ NODE_USE_ENV_PROXY=1 node scripts/tap-walk.mjs out --online --only "$ONLY" --json "$D/tap-$reader.json" > "$D/tap-$reader.log" 2>&1
  echo "tap-$reader EXIT $? $(date -u +%H:%M:%S) $(tail -1 "$D/tap-$reader.log" | cut -c1-200)"; gzip -f "$D/tap-$reader.json"
done
echo "DONE tap $(date -u +%H:%M:%S)"
