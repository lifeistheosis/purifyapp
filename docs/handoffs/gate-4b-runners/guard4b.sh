#!/usr/bin/env bash
# Gate 4b's part 2: the guardrail walk (checkMock with pixels, every rule) on the screens tonight's mends
# touched, online, en and ar at 390, 800 and 1032, the new reader (the shell that sells Plus) then the
# open reader, one configuration at a time.
#   [WORKERS=2] [SKIP="g-new-en-390 ..."] bash docs/handoffs/gate-4b-runners/guard4b.sh <results dir> <only list file> [new|open ...]
set -u
RES="${1:?results dir}"; ONLY="$(cat "${2:?only list file}")"; shift 2
READERS="${*:-new open}"
mkdir -p "$RES"
for reader in $READERS; do
  for size in 390x844 800x1280 1032x1376; do
    for lang in en ar; do
      tag="g-$reader-$lang-${size%%x*}"
      case " ${SKIP:-} " in *" $tag "*) continue ;; esac
      echo "== $tag $(date -u +%H:%M:%S)"
      sells=(); [ "$reader" = new ] && sells=(env SELLS_PLUS=1)
      langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
      "${sells[@]}" env NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --only "$ONLY" --workers "${WORKERS:-1}" --online --size "$size" "${langs[@]}" \
        --json "$RES/$tag.json" --looks "$RES/looks-$tag" > "$RES/$tag.log" 2>&1
      echo "   exit $? $(date -u +%H:%M:%S)"
    done
  done
done
