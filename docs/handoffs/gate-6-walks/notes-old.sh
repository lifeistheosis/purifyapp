#!/usr/bin/env bash
# Gate 6, part 5: each walk note of build 98 has its own test that fails on the old code (78c5297e1, the last
# app commit before build 98's notes were worked). The head's version of each note's tests is put into a
# worktree of 78c5297e1 and run there, then on the head; a test proves its note when it fails there and passes here.
#   bash docs/handoffs/gate-6-walks/notes-old.sh <scratch dir>
set -u
cd /home/user/purifyapp
D=docs/handoffs/gate-6-walks
W=${1:?scratch dir}/old-78c5297e1
OLD=78c5297e1
# note: tests (notes 1 and 10 need none: a decision, and no build)
NOTES=(
  "2:lib/listen/__tests__/dockFace.test.ts lib/ui/__tests__/dockTitle.test.ts lib/ui/__tests__/glideDirection.test.ts lib/listen/__tests__/listenLikeTheBible.test.ts lib/player/__tests__/longWordsNear.test.ts lib/player/__tests__/longWordsWait.test.ts lib/ui/__tests__/pageMovesItself.test.ts lib/readAloud/__tests__/rollOnComing.test.ts lib/listen/speech/__tests__/session.test.ts lib/marks/__tests__/startEdge.test.ts"
  "3:lib/chants/__tests__/shelf.test.ts lib/prayers/__tests__/prayersHome.test.ts lib/prayers/__tests__/prayersMirror.test.ts"
  "4:lib/ui/__tests__/keyboardSlide.test.ts lib/ui/__tests__/returnKeyboard.test.ts lib/ui/__tests__/scrimStrip.test.ts lib/journal/__tests__/writingPage.test.ts"
  "5:lib/journal/__tests__/libraryQuote.test.ts lib/journal/__tests__/quoteInJournal.test.ts"
  "6:lib/bible/downloads/__tests__/store.test.ts"
  "7:lib/bible/__tests__/booksSheetVersion.test.ts"
  "8:lib/player/__tests__/nowPlayingReady.test.ts lib/player/__tests__/nowPlayingTap.test.ts lib/player/__tests__/wordsLeaveLit.test.ts"
  "9:lib/player/__tests__/savedLine.test.ts"
  "11:lib/profile/__tests__/youAndProfileOnePiece.test.ts lib/you/__tests__/youTab.test.ts lib/auth/__tests__/accountGateKeptSession.test.ts"
  "12:lib/search/__tests__/searchMotion.test.ts"
  "13:lib/player/__tests__/meetSinging.test.ts"
  "14:lib/chants/__tests__/chantPage.test.ts lib/player/__tests__/footHandover.test.ts lib/player/__tests__/footSurface.test.ts"
)
[ -d "$W" ] || git worktree add --detach "$W" "$OLD" > /dev/null 2>&1
ln -sfn /home/user/purifyapp/node_modules "$W/node_modules"
ALL=()
for n in "${NOTES[@]}"; do for f in ${n#*:}; do ALL+=("$f"); done; done
for f in "${ALL[@]}"; do
  [ -f "$f" ] || { echo "MISSING ON HEAD $f"; continue; }
  mkdir -p "$W/$(dirname "$f")"; cp "$f" "$W/$f"
done
( cd "$W" && npx vitest run "${ALL[@]}" --reporter=json --outputFile="/home/user/purifyapp/$D/old.json" > /dev/null 2>&1 ) ; echo "old EXIT $?"
npx vitest run "${ALL[@]}" --reporter=json --outputFile="$D/head.json" > /dev/null 2>&1; echo "head EXIT $?"
node -e '
const fs=require("fs"); const D=process.argv[1]; const notes=JSON.parse(process.argv[2]);
const read=(f)=>{ const j=JSON.parse(fs.readFileSync(f,"utf8")); const m={}; for (const r of j.testResults) { const k=r.name.replace(/^.*?(lib\/)/,"$1"); const a=r.assertionResults||[]; m[k]={ status:r.status, failed:a.filter(x=>x.status==="failed").length, passed:a.filter(x=>x.status==="passed").length, msg:(r.message||"").split("\n")[0].slice(0,140) }; } return m; };
const o=read(D+"/old.json"), h=read(D+"/head.json"); const lines=[];
for (const n of notes) { const [note, files]=[n.split(":")[0], n.split(":")[1].split(" ")]; for (const f of files) { const a=o[f]||{status:"absent"}, b=h[f]||{status:"absent"};
  const how = a.status==="failed" ? (a.failed>0 ? `fails on 78c5297e1 (${a.failed} of ${a.failed+a.passed})` : `fails on 78c5297e1 to load: ${a.msg}`) : `PASSES on 78c5297e1 (${a.passed})`;
  lines.push(`note ${note} | ${f} | ${how} | head: ${b.status} (${b.passed} passed, ${b.failed} failed)`); } }
fs.writeFileSync(D+"/notes-old.txt", lines.join("\n")+"\n"); console.log(lines.join("\n"));
' "$D" "$(printf '%s\n' "${NOTES[@]}" | node -e 'console.log(JSON.stringify(require("fs").readFileSync(0,"utf8").trim().split("\n")))')"
