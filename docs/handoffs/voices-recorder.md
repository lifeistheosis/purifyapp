# Hand-over: the Voices recorder (2026-11-16)

**Changed at his word of 2026-11-16, about 22:35 UTC** ("remove locally LLM
voices and full drop ... (only leave one the standard prerecorded voices)"),
by Updates 98r: **Heart is the only voice.** Emma, Michael and Fenrir are
dropped, and with them the private bucket, its secret `R2_PLUS_BUCKET` and the
probe. `scripts/voices/full.json` is Heart's 2,447 recordings alone (113.9 h:
the Old Testament and batches 1 to 5; planned 2026-11-16 as 12 shards, the
longest 2.88 h at 3.3x, about 2.9 h end to end), `record.py` records and
plans Heart alone and refuses any other voice, the workflow hands the
recorders four secrets (`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET`), and his steps are OWNER-STEPS V10 to
V13 as rewritten (V10 nothing, V11 a key for the one bucket, V12 four
secrets). `scripts/voices/run.json` was not touched and still holds the dry
run of four voices, which `plan` now refuses: the go copies `full.json` over
it, as step 1 below says. What follows is the hand-over as it was written;
where it names the Plus voices, the private bucket or five secrets, read the
above.

Started 00:34 UTC by Arbiter 14 at his yes (about 00:33) to record the voices
on GitHub's free runners. Stopped at its step 5: the dry run and his steps are
done; **the full recording waits for the arbiter's go**, given once his
private bucket (V10), key (V11) and five Actions secrets (V12) are in place.
The arbiter's call at 01:37: the Plus voices go in a separate private bucket
(`R2_PLUS_BUCKET`, `<voice>/read/...` and `<voice>/listen/...`), not behind a
rule on the public one; Heart stays in the Bible's bucket (`R2_BUCKET`).

## What is built (d531607b, and the commit that adds this file)

- `scripts/voices/record.py`: `plan`, `record`, `report`, `probe`. Records a
  Bible chapter verse by verse in Heart's chapter format and a batch file as
  OWNER-STEPS V1 says, from the repository alone. Stand-in voice for tests.
- `.github/workflows/voices-record.yml`: runs only on a push to
  ccr-07896cf2-bo0afd that changes `scripts/voices/run.json` (or by hand once
  the file is on main); never on a pull request. Plan, then shards (20 at
  once, two recorders a runner), then a summary. Secrets only in the full
  run's probe and upload steps.
- `scripts/voices/run.json`: the watched run file, now the dry run (run 1).
  `scripts/voices/full.json`: the whole scope, ready (run 2).
- `scripts/voices/requirements.txt` (pinned), `models.sha256` (the fp16
  model and the voices file, checked on every runner).
- `lib/voices/__tests__/recorder.test.ts`: shapes, counts, pauses, lengths,
  the app's own `timingsFit`, Heart's NT guard, the plan.
- `docs/1.9-build/OWNER-STEPS.md`, "Voices on GitHub's runners", V10 to V13
  (V10 the private bucket, V11 the key for both, V12 five secrets).

## Matched to Heart's New Testament, by measurement

Heart, measured where the app plays it (John 1, Romans 8, Mark 4 from
audio.purifyapp.net/read/, and all 260 timings files): LAME 3.100 VBR mp3,
24 kHz mono, 39.8 to 40.3 kbit/s; -22.1 to -22.5 LUFS; sample peak -0.92 to
-1.01 dBFS; every gap after a verse 0.45 s (7,697 gaps, 260 endings).

The recorder: kokoro-onnx 0.6.1 (the engine in docs/licensing/audio-provenance.md),
`kokoro-v1.0.fp16.onnx`, speed 1.0 (on John 1 the fp16 model is 1.4 percent
short of Heart's length, fp32 2.7, int8 3.6; kokoro-onnx 0.4.9 was also
short); 0.45 s after each verse or sentence, 0.9 s after each block;
-22.2 LUFS, samples over -1.0 dBFS brought under it by 10 ms dips (John 1:
3 samples of 7.8 million); `libmp3lame -q:a 7`, no ID3.

## The dry run: run 43785379582 (run number 1), all six jobs green, 7.5 min

| voice | recording | kbit/s | LUFS | peak dBFS | pause median (min to max) | longest quiet s | words/s | length / Heart's |
|---|---|---:|---:|---:|---|---:|---:|---:|
| Heart's NT (the bucket) | john/1 | 39.8 | -22.1 | -1.00 | 0.57 (0.53 to 0.69) | 0.69 | 3.26 | |
| af_heart | john/1 | 39.6 | -22.2 | -0.87 | 0.57 (0.54 to 0.62) | 0.62 | 3.31 | 0.986 |
| af_heart | history/pentecost | 39.7 | -22.2 | -0.83 | 0.59 (0.53 to 1.14) | 1.14 | | |
| bf_emma | john/1 | 39.1 | -22.2 | -2.08 | 0.55 (0.53 to 0.58) | 0.65 | 3.59 | 0.913 |
| bf_emma | history/pentecost | 39.1 | -22.2 | -1.40 | 0.56 (0.52 to 1.03) | 1.03 | | |
| am_michael | john/1 | 37.5 | -22.1 | -0.81 | 0.65 (0.55 to 0.81) | 0.81 | 2.94 | 1.103 |
| am_michael | history/pentecost | 37.8 | -22.2 | -0.83 | 0.68 (0.53 to 1.21) | 1.21 | | |
| am_fenrir | john/1 | 40.1 | -22.2 | -1.47 | 0.58 (0.53 to 0.69) | 0.69 | 3.27 | 0.996 |
| am_fenrir | history/pentecost | 40.2 | -22.1 | -0.91 | 0.60 (0.53 to 1.12) | 1.12 | | |

All 24 kHz mono mp3, the timings' length within 0.07 s of the mp3's (the
encoder's padding). Emma reads about 9 percent faster than Heart and Michael
about 10 percent slower: their own pace at speed 1.0, as in the samples.

Speed on the runners (two recorders of two threads each): 2.84x, 2.92x, 3.75x
and 5.29x real time per runner (one recorder 1.47x to 2.75x). The machines
GitHub hands out differ; this container did 6.2x.

## The full scope, planned (`record.py plan --run scripts/voices/full.json`)

Heart 2,447 recordings (113.9 h of sound: batches 1 to 5 and the Old
Testament, 1,102 chapters); Emma, Michael and Fenrir 2,707 each (130.1 h:
the New Testament too). 504.7 h of sound, about 153 runner hours at 3.3x:
60 shards of 2.55 h, 20 at once, about 7.6 h from start to end (8.9 h at
the slowest runner measured, 4.8 h at the fastest). The longest recording
(a part of the Life of Antony, 130 min of sound) takes about 89 min on the
slowest recorder; a recorder starts nothing after 240 min, under the job's
350.

## At the go

1. Check his secrets exist: the plan job's probe needs them. Copy
   `scripts/voices/full.json` over `scripts/voices/run.json` (it says
   `"run": 2, "mode": "full"`), commit, `git pull --rebase`, push. That push
   is the start.
2. Before any Plus voice goes up, the plan job and every recorder prove the
   private bucket is private as far as an S3 key can tell: another name than
   the Bible's, Heart's John 1 in the Bible's bucket and not in it, and a test
   file in it not served at audio.purifyapp.net. Its r2.dev address cannot be
   asked for with an object key: that rests on V10 (off, as a new bucket
   starts).
3. When it ends: download the artifact `voices-timings`; copy Heart's
   `read/**.json` into `public/audio/read/` and `listen/**.json` into
   `public/audio/listen/`, run `node scripts/read-aloud-index.mjs` and
   `npm run listen:index`, commit and push. The Plus voices' timings are in
   the private bucket beside their mp3s, and in the same artifact (under
   `plus/<voice>/`, the private bucket's `<voice>/`).
4. A shard that ran out of time leaves `left-*.json` and fails the summary;
   push run.json again with `"run"` raised and the bucket's recordings are
   skipped.

## Not proved, and why

- No upload has run: the secrets are not in place (by design until the go).
  The upload, the skip of what the buckets have, and the probe are written and
  read, not run against a bucket.
- Whether the private bucket has an r2.dev address on cannot be read with an
  Object Read & Write key; it would take a token that can read bucket
  settings, which the five secrets do not include.
- The fp32 model's speed on the runners was not measured. On this container
  fp16 was faster (5.1x against 4.5x), but runners without fast half
  precision may favour fp32; the samples he chose from were fp32. A switch
  is one line in run.json (`"model"`) and one in `models.sha256`.
- Nobody has listened to the recordings: every check above is a measurement.
  The dry run's mp3s are the artifacts `voices-out-1` to `voices-out-4` of
  run 43785379582 for 3 days (shard 1 af_heart, 2 am_fenrir, 3 am_michael,
  4 bf_emma).
