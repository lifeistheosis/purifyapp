#!/usr/bin/env bash
# Gate 6 (2026-11-16): the new and changed screens of build 98 and round 3, each by its own walk, on the same
# export (out/), one at a time, after the full tap walks:
#   bash docs/handoffs/gate-6-walks/new6.sh you|journal|listen|player|lines
# you      You and Profile with days kept: the tap walk on /account/ and /account/profile/ with round 3's seeds
#          for a reader with days kept (docs/1.9-build/redesign/round-3/you-lines.json, a stand-in session for
#          reader@example.com, so with no network: a stand-in token is never sent to the main web)
# journal  a verse's note opening the journal's page (verse-note-walk), the library Quote (quote-library-walk)
# listen   the dock on the five kinds of text at 390, 800, 1032 and in Arabic, held to checkMock (--check)
# player   Now Playing: the carry (motion on), Words on a long text at CPU 4x, the transport row with the
#          recording and with the phone's voice (back and forward 15), en and ar; the player's looks
# lines    the saved line (saved-line), a chant's words meeting the singing (chant-follow), the search's motion
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-6-walks
S=${GATE6_SCRATCH:-/tmp/gate6}
mkdir -p "$S"
PART=${1:?part}
stamp() { date -u +%H:%M:%S; }
go() { # name, then the command
  local name=$1; shift
  NODE_USE_ENV_PROXY=1 "$@" > "$D/$name.log" 2>&1
  echo "$name EXIT $? $(stamp) $(grep -v -E '^\s*$' "$D/$name.log" | tail -1 | cut -c1-200)"
}
case "$PART" in
  you)
    mapfile -t ARGS < <(node -e '
      const y=require("./docs/1.9-build/redesign/round-3/you-lines.json"); const s=y.find(x=>x.name==="you-kept");
      for (const [k,v] of Object.entries(s.set)) { console.log("--store"); console.log(k+"="+(typeof v==="string"?v:JSON.stringify(v))); }')
    go tap-you-kept node scripts/tap-walk.mjs out --max 1000 --only /account/,/account/profile/ "${ARGS[@]}" --json "$D/tap-you-kept.json"
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
    go np-transport-voice node scripts/gate/listen-walk.mjs out --only bible --transport --voice
    go np-transport-voice-ar node scripts/gate/listen-walk.mjs out --only bible --transport --voice --lang ar
    go player-looks node scripts/gate/player-looks.mjs "$S/player-looks" ;;
  lines)
    go saved-line node scripts/gate/saved-line.mjs out
    go chant-follow node scripts/gate/chant-follow.mjs 390x844 out
    go search-motion node scripts/search-motion-walk.mjs ;;
esac
echo "DONE $PART $(stamp)"
