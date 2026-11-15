#!/usr/bin/env bash
# Gate 5 (2026-11-15): the check of what changed since Gate 4's export, on one export of the head (out/),
# one walk at a time, nothing else running. Each part is its own background command (under two hours).
#   bash docs/handoffs/gate-5-walks/walks5.sh online|offline|extras
# online: Updates 94's two controls, Updates 96's switch into /set-password/ and the account family, and
#   Updates 95 and 97's arrival on /history/alaska-mission/ with "Matthew 28:19-20". Both readers, motion on
#   and --reduced, once each.
# offline (no --online): Gate 4's ten Try again screens (Updates 93), the /history/ arrival and its three taps,
#   "Matthew 28:19-20" and Job's two verse contexts (Updates 95 and 97). Both readers, both lanes, once each.
# extras: a post's replies' Try again with no network (Updates 94's replies94.mjs), both readers and lanes,
#   then Updates 97's probe once at the chapter's foot (--end --delay 2500 --up 1500).
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-5-walks
PART=${1:?online, offline or extras}
run() { # name, reader(open|new), extra flags (the rest)
  local name=$1 reader=$2; shift 2
  local env=""; [ "$reader" = new ] && env="SELLS_PLUS=1"
  env $env NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --workers 1 "$@" --json "$D/$name.json" --shots "$D/shots-$name" > "$D/$name.log" 2>&1
  echo "$name EXIT $? $(date -u +%H:%M:%S)"; gzip -f "$D/$name.json"
}
case "$PART" in
  online)
    ONLY="/prayers/bows/,/reading/,/set-password/,/account/,/account/data/,/account/eikon-box/,/account/notifications/,/account/profile/,/account/profile/edit/,/account/security/,/account/sessions/,/history/alaska-mission/"
    CONTROLS="Read it in Purify|See all|Matthew 28:19-20"
    for reader in open new; do
      run on-$reader $reader --online --only "$ONLY" --controls "$CONTROLS"
      run onr-$reader $reader --online --reduced --only "$ONLY" --controls "$CONTROLS"
    done ;;
  offline)
    ONLY="/,/history/alaska-mission/,/dictionary/,/walkthroughs/job/1/,/campaigns/,/campaigns/detail/,/campaigns/mine/,/campaigns/new/,/campaigns/rules/,/community/moderate/,/shop/,/shop/category/all/,/shop/stores/,/community/"
    CONTROLS="Try again|1782 Philokalia|New Martyrs|Hesychast councils|Matthew 28:19-20|Context for verse 1|Context for verse 5"
    for reader in open new; do
      run off-$reader $reader --only "$ONLY" --controls "$CONTROLS"
      run offr-$reader $reader --reduced --only "$ONLY" --controls "$CONTROLS"
    done ;;
  extras)
    for lane in on reduce; do
      for reader in open new; do
        flag=""; [ "$reader" = new ] && flag="--new"
        NODE_USE_ENV_PROXY=1 node docs/handoffs/updates-94-runners/replies94.mjs out $lane $flag > "$D/replies-$reader-$lane.txt" 2>&1
        echo "replies-$reader-$lane EXIT $? $(date -u +%H:%M:%S)"
      done
    done
    NODE_USE_ENV_PROXY=1 node docs/handoffs/updates-97-runners/probe97.mjs /history/alaska-mission/ /bible/matthew/28/ on feed \
      --end --delay 2500 --up 1500 --out out > "$D/probe97-foot-feed-on.txt" 2>&1
    echo "probe97 EXIT $? $(date -u +%H:%M:%S)" ;;
esac
echo "DONE $PART $(date -u +%H:%M:%S)"
