#!/usr/bin/env bash
# Gate 7 (2026-11-17): the new and changed screens' own walks on the gate's one export (out/), as Gate 6's new6.sh
# ran them, with three changes: You with days kept is walked in Arabic too (PractiseSheet's Change, known at 41.9 px);
# the phone's-voice transport lanes are gone (Updates 98s retired listen-walk's --voice: it exits 2 by design);
# the saved line is time-boxed at 20 minutes (it hung for an hour in Gate 6c) and said "not run" if it hangs.
#   bash docs/handoffs/gate-7-walks/new7.sh you|journal|listen|player|lines
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-7-walks
S=${GATE7_SCRATCH:-/tmp/gate7}
mkdir -p "$S"
PART=${1:?part}
stamp() { date -u +%H:%M:%S; }
go() { # name, then the command
  local name=$1; shift
  NODE_USE_ENV_PROXY=1 "$@" > "$D/$name.log" 2>&1
  local e=$?
  echo "$name EXIT $e $(stamp) $(grep -v -E '^\s*$|UNDICI|trace-warnings' "$D/$name.log" | tail -1 | cut -c1-200)"
}
case "$PART" in
  you)
    mapfile -t ARGS < <(node -e '
      const y=require("./docs/1.9-build/redesign/round-3/you-lines.json"); const s=y.find(x=>x.name==="you-kept");
      for (const [k,v] of Object.entries(s.set)) { console.log("--store"); console.log(k+"="+(typeof v==="string"?v:JSON.stringify(v))); }')
    go tap-you-kept node scripts/tap-walk.mjs out --max 1000 --only /account/,/account/profile/ "${ARGS[@]}" --json "$D/tap-you-kept.json"
    go tap-you-kept-ar node scripts/tap-walk.mjs out --max 1000 --lang ar --only /account/,/account/profile/ "${ARGS[@]}" --json "$D/tap-you-kept-ar.json"
    go tap-you-new env SELLS_PLUS=1 node scripts/tap-walk.mjs out --max 1000 --online --only /account/,/account/profile/,/journal/write/,/prayers/,/plans/gospels/ --json "$D/tap-you-new.json"
    gzip -f "$D"/tap-you-*.json ;;
  journal)
    go verse-note node scripts/verse-note-walk.mjs out
    go quote-library node scripts/quote-library-walk.mjs out ;;
  listen)
    go listen-390 node scripts/gate/listen-walk.mjs out --check --shots "$S/listen-390"
    go listen-390-ar node scripts/gate/listen-walk.mjs out --check --lang ar
    go listen-800 node scripts/gate/listen-walk.mjs out --check --size 800x1280
    go listen-1032 node scripts/gate/listen-walk.mjs out --check --size 1032x1376 ;;
  player)
    go np-carry node scripts/gate/listen-walk.mjs out --carry
    go np-words node scripts/gate/listen-walk.mjs out --only work --words --cpu 4
    go np-transport node scripts/gate/listen-walk.mjs out --only bible --transport
    go np-transport-ar node scripts/gate/listen-walk.mjs out --only bible --transport --lang ar
    go player-looks node scripts/gate/player-looks.mjs "$S/player-looks" ;;
  lines)
    go saved-line timeout -k 30 1200 node scripts/gate/saved-line.mjs out
    go chant-follow node scripts/gate/chant-follow.mjs 390x844 out
    go search-motion node scripts/search-motion-walk.mjs ;;
esac
echo "DONE $PART $(stamp)"
