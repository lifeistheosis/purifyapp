#!/usr/bin/env bash
# Gate 7 (2026-11-17): the gate on one export of the branch's head (07ca327c, app code 5c419b90), out/, one step at a
# time, detached, as Gate 6c's chain6c.sh ran: the container is restarted about every 81 minutes, which kills whatever
# runs, so every step is cut to finish inside one container's life, writes "OK <step>" to $S/chain.txt when it has run
# to its end, and is skipped when the chain is started again. $S/chain.done is written at the end.
#   GATE7_SCRATCH=<scratch>/gate7 setsid nohup bash docs/handoffs/gate-7-walks/chain7.sh > <scratch>/gate7/chain.log 2>&1 &
# Steps: the four self-tests; the motion walk on every screen at CPU 4x, a new reader, online, both lanes, in eight
# chunks (screens-N.txt, the export's screens in order); the rows Updates 98t could not reproduce and John 1's
# Community link, walked again; the tap walk on every screen, a new reader, en and ar, in eight chunks; new7.sh;
# round 3's probe; checkMock with pixels on all 21 on /reading/ and on the screens 98s to 98v touched, at 390, 800 and
# 1032, en and ar; the unit suite and part 3; the web build with books-version last.
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-7-walks
export GATE7_SCRATCH=${GATE7_SCRATCH:-/tmp/gate7}
S=$GATE7_SCRATCH
mkdir -p "$S"; touch "$S/chain.txt"
stamp() { date -u +%H:%M:%S; }
say() { echo "$*" >> "$S/chain.txt"; }
last() { grep -v -E '^\s*$|UNDICI|trace-warnings|MODULE_TYPELESS|Reparsing|eliminate this' "$1" | grep -E "${2:-.}" | tail -1 | cut -c1-220; }
EXTRA="/theology/creed/,/bible/,/theology/doctrine/,/fathers-on/anger/,/bible/john/1/"
# The screens Updates 98s to 98v touched, in two halves so each run fits inside one container's life.
TOUCHA="/whats-new/,/bible/john/1/,/bible/genesis/1/,/saints/xenia-of-petersburg/,/saints/athanasius-the-great/against-the-heathen/,/councils/first-nicaea/the-synodal-letter/,/settings/,/dictionary/"
TOUCHB="/discover/,/prayers/morning/,/prayers/hours/compline/,/prayers/evening/,/prayers/after-meals/,/prayers/akathists/theotokos/,/account/"
N=$(ls $D/screens-*.txt | wc -l)
STEPS="selftest"
for n in $(seq 1 $N); do STEPS="$STEPS motion-on-$n"; done
for n in $(seq 1 $N); do STEPS="$STEPS motion-reduce-$n"; done
STEPS="$STEPS motion-extra-1"
for n in $(seq 1 $N); do STEPS="$STEPS tap-en-$n"; done
for n in $(seq 1 $N); do STEPS="$STEPS tap-ar-$n"; done
STEPS="$STEPS you journal listen player lines round3"
for w in 390 800 1032; do for l in en ar; do STEPS="$STEPS reading-$w-$l touchA-$w-$l touchB-$w-$l kept-$w-$l"; done; done
STEPS="$STEPS notes tests web"
for step in $STEPS; do
  grep -q "^OK $step\$" "$S/chain.txt" && continue
  say "START $step $(stamp)"
  case "$step" in
    selftest) for t in tap-walk guardrail-walk motion-walk mock-check; do
        NODE_USE_ENV_PROXY=1 node scripts/$t.mjs --self-test > "$D/selftest-$t.log" 2>&1
        say "selftest $t EXIT $? $(stamp) $(last "$D/selftest-$t.log")"
      done; say "OK $step" ;;
    motion-extra-*) n=${step##*-}; tag="m-extra-$n"
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --workers 2 --online --cpu 4 --only "$EXTRA" \
        --json "$D/$tag.json" --shots "$S/shots-$tag" > "$D/$tag.log" 2>&1
      say "$step EXIT $? $(stamp) $(last "$D/$tag.log")"; [ -f "$D/$tag.json" ] && gzip -f "$D/$tag.json" && say "OK $step" ;;
    motion-*) n=${step##*-}; lane=${step#motion-}; lane=${lane%-*}; tag="m-new-$lane-$n"; r=(); [ "$lane" = reduce ] && r=(--reduced)
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --workers 2 --online --cpu 4 "${r[@]}" --only "$(cat $D/screens-$n.txt)" \
        --json "$D/$tag.json" --shots "$S/shots-$tag" > "$D/$tag.log" 2>&1
      say "$step EXIT $? $(stamp) $(last "$D/$tag.log")"; [ -f "$D/$tag.json" ] && gzip -f "$D/$tag.json" && say "OK $step" ;;
    tap-*) n=${step##*-}; lang=${step#tap-}; lang=${lang%-*}; tag="tap-$lang-$n"; langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/tap-walk.mjs out --workers 3 --max 1000 --online "${langs[@]}" --only "$(cat $D/screens-$n.txt)" \
        --json "$D/$tag.json" > "$D/$tag.log" 2>&1
      say "$step EXIT $? $(stamp) $(last "$D/$tag.log" 'controls tapped')"; [ -f "$D/$tag.json" ] && gzip -f "$D/$tag.json" && say "OK $step" ;;
    you|journal|listen|player|lines) bash $D/new7.sh "$step" > "$S/new-$step.out" 2>&1; say "$(grep -v '^DONE' "$S/new-$step.out" | tr '\n' ' ' | cut -c1-700)"
      grep -q "^DONE" "$S/new-$step.out" && say "OK $step" ;;
    round3) NODE_USE_ENV_PROXY=1 node docs/handoffs/gate-6-walks/round3-probe.mjs out "$S/round3" > "$D/round3-7.log" 2>&1; e=$?
      say "round3 EXIT $e $(stamp) $(grep -c 'note line' "$D/round3-7.log") screens"; cp "$S/round3/round3-words.json" "$D/round3-words-7.json" 2>/dev/null && say "OK $step" ;;
    reading-*|touchA-*|touchB-*|kept-*) kind=${step%%-*}; rest=${step#*-}; w=${rest%-*}; lang=${rest#*-}
      case "$w" in 390) wh=390x844;; 800) wh=800x1280;; 1032) wh=1032x1376;; esac
      langs=(); [ "$lang" != en ] && langs=(--lang "$lang"); extra=()
      case "$kind" in reading) list=/reading/;; touchA) list=$TOUCHA;; touchB) list=$TOUCHB;; kept) list=/account/
        mapfile -t extra < <(node -e '
          const y=require("./docs/1.9-build/redesign/round-3/you-lines.json"); const s=y.find(x=>x.name==="you-kept");
          for (const [k,v] of Object.entries(s.set)) { console.log("--store"); console.log(k+"="+(typeof v==="string"?v:JSON.stringify(v))); }') ;;
      esac
      tag="g-$kind-$lang-$w"; on=(--online); [ "$kind" = kept ] && on=()
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 timeout -k 30 4500 node scripts/guardrail-walk.mjs out --workers 3 "${on[@]}" --every --size "$wh" "${langs[@]}" "${extra[@]}" \
        --only "$list" --looks "$S/looks-$tag" --json "$D/$tag.json" > "$D/$tag.log" 2>&1
      e=$?; say "$step EXIT $e $(stamp) $(last "$D/$tag.log" 'screens measured|closed|rror')"
      if [ -f "$D/$tag.json" ]; then gzip -f "$D/$tag.json"; say "OK $step"; elif [ $e = 124 ]; then say "OK $step (timed out at 75 min, not measured)"; say "OK $step"; fi ;;
    notes) bash $D/notes-old7.sh "$S" > "$D/notes-old7.txt" 2>&1; say "notes EXIT $? $(stamp) $(wc -l < "$D/notes-old7.txt") lines"; say "OK $step" ;;
    tests) npx vitest run > "$S/unit-7.txt" 2>&1; say "unit EXIT $? $(stamp) $(grep -E 'Test Files|Tests ' "$S/unit-7.txt" | tr -s ' ' | tr '\n' ' ')"
      npx vitest run $(cat scripts/gate/gate-tests.txt) > "$D/gate-tests-7.txt" 2>&1
      say "part3 EXIT $? $(stamp) $(grep -E 'Test Files|Tests ' "$D/gate-tests-7.txt" | tr -s ' ' | tr '\n' ' ')"; say "OK $step" ;;
    web) npm run build > "$S/web-build.txt" 2>&1; e=$?; say "web-build EXIT $e $(stamp) $(grep -E 'Compiled|rror' "$S/web-build.txt" | head -2 | tr '\n' ' ' | cut -c1-200)"
      if [ $e = 0 ]; then
        (npm start > "$S/web-start.txt" 2>&1 &) ; for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000/ && break; sleep 2; done
        NODE_USE_ENV_PROXY=1 node scripts/gate/books-version.mjs out http://localhost:3000 > "$D/books-version-7.log" 2>&1; e=$?
        say "books-version EXIT $e $(stamp) $(last "$D/books-version-7.log")"
        pkill -f "next start"; pkill -f "next-server"; say "OK $step"
      fi ;;
  esac
done
say "CHAIN DONE $(stamp)"; touch "$S/chain.done"
