#!/usr/bin/env bash
# Updates 92's checkMock with pixels: /account/, /settings/, /plan/ and /shop/eikon/ on all 21 palettes and looks
# (guardrail-walk --every), at 390, 800 and 1032, en and ar, the new reader (the shell that sells Plus) then the open.
#   bash docs/handoffs/updates-92-runners/guard92.sh <results dir> [new|open ...]
set -u
RES="${1:?results dir}"; shift
READERS="${*:-new open}"
mkdir -p "$RES"
for reader in $READERS; do
  for size in 390x844 800x1280 1032x1376; do
    for lang in en ar; do
      tag="g-$reader-$lang-${size%%x*}"
      echo "== $tag $(date -u +%H:%M:%S)"
      sells=(); [ "$reader" = new ] && sells=(env SELLS_PLUS=1)
      langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
      "${sells[@]}" env NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --only /account/,/settings/,/plan/,/shop/eikon/ \
        --workers 2 --online --every --size "$size" "${langs[@]}" --json "$RES/$tag.json" --looks "$RES/looks-$tag" > "$RES/$tag.log" 2>&1
      echo "   exit $? $(tail -1 "$RES/$tag.log" | cut -c1-200)"
    done
  done
done
