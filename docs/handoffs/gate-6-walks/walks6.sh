#!/usr/bin/env bash
# Gate 6 (2026-11-16): the pre-build gate for test build 100, on one export of 3ab13437 (app code d4399909),
# cut by `node scripts/gate/export.mjs` into out/. One walk at a time, nothing else running. Each part is its
# own background command (under two hours):
#   bash docs/handoffs/gate-6-walks/walks6.sh selftest|tap-new|tap-open|guard|light|motion-screens|motion-loaded
# selftest       the four tools prove their measures (tap, guardrail, motion walks; checkMock)
# tap-new        part 1: every control on every screen (--max 1000), a new reader (SELLS_PLUS=1), --online
# tap-open       the same, the open reader
# guard          part 2: checkMock with pixels on every screen, five palettes, at 390, 800 and 1032, en and ar
# light          part 2: the seven light looks on every screen at 390, en and ar
# motion-screens part 2: the motion walk with nothing loaded, CPU 4x, the new reader, motion on and reduced
# motion-loaded  part 2: every tab switch with a track loaded and with a sound alone, CPU 4x, both lanes,
#                then Now Playing's timings
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-6-walks
S=${GATE6_SCRATCH:-/tmp/gate6}
mkdir -p "$S"
PART=${1:?part}
stamp() { date -u +%H:%M:%S; }
case "$PART" in
  selftest)
    for t in tap-walk guardrail-walk motion-walk mock-check; do
      NODE_USE_ENV_PROXY=1 node scripts/$t.mjs --self-test > "$D/selftest-$t.log" 2>&1
      echo "selftest $t EXIT $? $(stamp) $(tail -1 "$D/selftest-$t.log" | cut -c1-160)"
    done ;;
  tap-new|tap-open)
    # The whole list in one run passed two hours (stopped at 100 of 130, 10:33 UTC), so a chunk at a time:
    # walks6.sh tap-new 1 .. 4 walks screens-N.txt (the export's 130 screens in order, 33 a chunk).
    reader=${PART#tap-}; env_=""; [ "$reader" = new ] && env_="SELLS_PLUS=1"
    n=${2:?chunk 1 to 4}; tag="tap-$reader-$n"
    env $env_ NODE_USE_ENV_PROXY=1 node scripts/tap-walk.mjs out --workers 3 --max 1000 --online --only "$(cat "$D/screens-$n.txt")" \
      --json "$D/$tag.json" > "$D/$tag.log" 2>&1
    echo "$tag EXIT $? $(stamp) $(tail -1 "$D/$tag.log" | cut -c1-200)"; gzip -f "$D/$tag.json" ;;
  guard)
    for size in 390x844 800x1280 1032x1376; do
      for lang in en ar; do
        tag="g-$lang-${size%%x*}"; langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
        SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --workers 3 --online --size "$size" "${langs[@]}" \
          --looks "$S/looks-$tag" --json "$D/$tag.json" > "$D/$tag.log" 2>&1
        echo "$tag EXIT $? $(stamp) $(tail -1 "$D/$tag.log" | cut -c1-160)"; gzip -f "$D/$tag.json"
      done
    done ;;
  light)
    for lang in en ar; do
      tag="light-$lang-390"; langs=(); [ "$lang" != en ] && langs=(--lang "$lang")
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs out --workers 3 --online --light "${langs[@]}" \
        --looks "$S/looks-$tag" --json "$D/$tag.json" > "$D/$tag.log" 2>&1
      echo "$tag EXIT $? $(stamp) $(tail -1 "$D/$tag.log" | cut -c1-160)"; gzip -f "$D/$tag.json"
    done ;;
  motion-screens)
    for lane in on reduce; do
      r=(); [ "$lane" = reduce ] && r=(--reduced)
      SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --workers 2 --online --cpu 4 "${r[@]}" \
        --json "$D/m-new-$lane.json" --shots "$S/shots-m-new-$lane" > "$D/m-new-$lane.log" 2>&1
      echo "m-new-$lane EXIT $? $(stamp) $(tail -1 "$D/m-new-$lane.log" | cut -c1-160)"; gzip -f "$D/m-new-$lane.json"
    done ;;
  motion-loaded)
    for loaded in track sound; do
      for lane in on reduce; do
        r=(); [ "$lane" = reduce ] && r=(--reduced)
        NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --loaded "$loaded" --cpu 4 "${r[@]}" \
          --json "$D/l-$loaded-$lane.json" --shots "$S/shots-l-$loaded-$lane" > "$D/l-$loaded-$lane.log" 2>&1
        echo "l-$loaded-$lane EXIT $? $(stamp) $(tail -1 "$D/l-$loaded-$lane.log" | cut -c1-160)"
      done
    done
    NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --loaded track --now-playing --cpu 4 \
      --json "$D/l-nowplaying.json" > "$D/l-nowplaying.log" 2>&1
    echo "l-nowplaying EXIT $? $(stamp) $(tail -1 "$D/l-nowplaying.log" | cut -c1-160)" ;;
esac
echo "DONE $PART $(stamp)"
