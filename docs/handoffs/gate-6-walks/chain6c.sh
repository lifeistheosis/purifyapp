#!/usr/bin/env bash
# Gate 6c (2026-11-16): the rest of the gate on the one export of 4ca097da3 (out/), one step at a time, detached so
# no step is cut by a two-hour limit. Each step adds a line to $S/chain.txt; $S/chain.done is written at the end.
#   setsid nohup bash docs/handoffs/gate-6-walks/chain6c.sh [first step] > $S/chain.log 2>&1 &
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-6-walks
export GATE6_SCRATCH=${GATE6_SCRATCH:-/tmp/gate6}
S=$GATE6_SCRATCH
mkdir -p "$S"
stamp() { date -u +%H:%M:%S; }
say() { echo "$*" >> "$S/chain.txt"; }
STEPS="reading5 tap-en tap-ar order guard-800 guard-1032 tests light motion you journal listen player lines round3 web"
FROM=${1:-reading5}; go=0
for step in $STEPS; do
  [ "$step" = "$FROM" ] && go=1; [ $go = 1 ] || continue
  say "START $step $(stamp)"
  case "$step" in
    reading5) # /reading/ in Arabic at 390 on the five palettes and the two earned (21 at once closes the walker's page)
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --workers 1 --online --lang ar --only /reading/ \
        --json "$D/c-ar-390-reading5.json" > "$D/c-ar-390-reading5.log" 2>&1
      say "reading5 EXIT $? $(stamp) $(grep -E 'screens measured' "$D/c-ar-390-reading5.log")"; gzip -f "$D/c-ar-390-reading5.json" ;;
    tap-en|tap-ar) say "$(bash $D/walks6c.sh tap "${step#tap-}" | head -1)" ;;
    order) say "$(bash $D/walks6c.sh order | head -1)" ;;
    guard-800|guard-1032) for l in en ar; do say "$(bash $D/walks6c.sh guard "${step#guard-}" $l | head -1)"; done ;;
    tests) say "$(bash $D/walks6c.sh tests | head -2 | tr '\n' ' ')" ;;
    light) say "$(bash $D/walks6.sh light | head -2 | tr '\n' ' ')" ;;
    motion) say "$(bash $D/walks6.sh motion-screens | head -2 | tr '\n' ' ')" ;;
    you|journal|listen|player|lines) say "$(bash $D/new6.sh "$step" | grep -v '^DONE' | tr '\n' ' ')" ;;
    round3) NODE_USE_ENV_PROXY=1 node $D/round3-probe.mjs out "$S/round3" > "$D/round3-6c.log" 2>&1
      say "round3 EXIT $? $(stamp) $(grep -c 'note line' "$D/round3-6c.log") screens"; cp "$S/round3/round3-words.json" "$D/round3-words-6c.json" 2>/dev/null ;;
    web) npm run build > "$S/web-build.txt" 2>&1; e=$?; say "web-build EXIT $e $(stamp) $(grep -E 'Compiled|Error|error' "$S/web-build.txt" | head -2 | tr '\n' ' ' | cut -c1-200)"
      if [ $e = 0 ]; then
        (npm start > "$S/web-start.txt" 2>&1 &) ; for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000/ && break; sleep 2; done
        NODE_USE_ENV_PROXY=1 node scripts/gate/books-version.mjs out http://localhost:3000 > "$D/books-version-6c.log" 2>&1
        say "books-version EXIT $? $(stamp) $(grep -v -E '^\s*$|UNDICI|trace-warnings' "$D/books-version-6c.log" | tail -1 | cut -c1-200)"
        pkill -f "next start" ; pkill -f "next-server" ; true
      fi ;;
  esac
done
say "CHAIN DONE $(stamp)"; touch "$S/chain.done"
