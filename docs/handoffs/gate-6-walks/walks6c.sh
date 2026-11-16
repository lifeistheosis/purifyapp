#!/usr/bin/env bash
# Gate 6c (2026-11-16): the check of what Updates 98q changed since Gate 6b's head (lib/calendar/fastDot.ts,
# components/ui/ScrollRail.tsx, lib/ui/railRange.ts, components/prayers/PrayersDayCard.tsx), on the gate's one
# export of 4ca097da3 (app code b40e4192), out/. One walk at a time, each part its own background command:
#   bash docs/handoffs/gate-6-walks/walks6c.sh guard 390|800|1032 | tap | order | tests
# guard N  checkMock with pixels on every palette and look (--every, all 21) on the item-2 screens, en and ar
# tap      the tap walk, a new reader, --online, on the same screens, en and ar (part 1 again for them)
# order    the failing order Gate 6b found (/shop/ before /shop/category/all/), 390, Arabic, five palettes
# tests    the whole unit suite, then part 3's list (scripts/gate/gate-tests.txt)
# The screens: Prayers' day (fastDot), the website day card's page, /fasting/, the shop's front and its category
# pages, and every screen whose ScrollRail holds a current item or a chip row (ProductRail, SaintIconsRail,
# ShopBySaint, CoverRow, ChantRow, KeptShelf, FeatureShowcase, CategoryChips, ShopSubTabs, PrayerPieces).
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-6-walks
S=${GATE6_SCRATCH:-/tmp/gate6}
mkdir -p "$S"
PART=${1:?part}
stamp() { date -u +%H:%M:%S; }
CATS=$(ls -d out/shop/category/*/ 2>/dev/null | sed 's#^out##' | grep -v '/all/$' | grep -v '/\[' | tr '\n' ',')
ITEM2="/prayers/today/,/prayers/,/fasting/,/shop/,/shop/category/all/,${CATS}/shop/icons/byzantine-three-beam-wall-cross/,/shop/cart/,/shop/orders/,/saints/abraham-of-smolensk/,/reading/,/reading/collections/anger/,/reading/councils/,/reading/councils/ancyra-314/,/reading/paths/,/reading/paths/nativity/,/councils/ancyra-314/,/chants/,/chants/paschal-canon/,/account/,/plan/"
case "$PART" in
  list) echo "$ITEM2" ;;
  guard)
    size=${2:?390, 800 or 1032}; case "$size" in 390) wh=390x844;; 800) wh=800x1280;; 1032) wh=1032x1376;; esac
    for lang in en ar; do
      tag="c-$lang-$size"; langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --workers 3 --online --every --size "$wh" "${langs[@]}" \
        --only "$ITEM2" --looks "$S/looks-$tag" --json "$D/$tag.json" > "$D/$tag.log" 2>&1
      echo "$tag EXIT $? $(stamp) $(tail -1 "$D/$tag.log" | cut -c1-160)"; gzip -f "$D/$tag.json"
    done ;;
  tap)
    for lang in en ar; do
      tag="c-tap-$lang"; langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/tap-walk.mjs out --workers 3 --max 1000 --online "${langs[@]}" --only "$ITEM2" \
        --json "$D/$tag.json" > "$D/$tag.log" 2>&1
      echo "$tag EXIT $? $(stamp) $(tail -1 "$D/$tag.log" | cut -c1-200)"; gzip -f "$D/$tag.json"
    done ;;
  order)
    SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --workers 1 --online --lang ar \
      --only /shop/,/shop/ambassador/,/shop/cart/,/shop/category/all/ --json "$D/c-order.json" > "$D/c-order.log" 2>&1
    echo "c-order EXIT $? $(stamp) $(tail -1 "$D/c-order.log" | cut -c1-160)"; gzip -f "$D/c-order.json" ;;
  tests)
    npx vitest run > "$S/unit-6c.txt" 2>&1; echo "unit EXIT $? $(stamp) $(grep -E 'Test Files|Tests ' "$S/unit-6c.txt" | tr -s ' ' | tr '\n' ' ')"
    npx vitest run $(cat scripts/gate/gate-tests.txt) > "$D/gate-tests-6c.txt" 2>&1
    echo "part3 EXIT $? $(stamp) $(grep -E 'Test Files|Tests ' "$D/gate-tests-6c.txt" | tr -s ' ' | tr '\n' ' ')" ;;
esac
echo "DONE $PART $(stamp)"
