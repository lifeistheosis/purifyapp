// The reel's click, inlined.
//
// REPLACED 2026-09-13 on the owner's instruction with his own pop, exported
// from the "yung fazo more" FL Studio project. The source mp3 is kept at
// docs/assets/reel-click-pop.mp3 so the slice below can be cut again.
//
// That also settles the provenance question the old note left open. The
// previous sample was a Freesound bike click with no licence alongside it, and
// this repo has form there: the ambience MP3s were removed over exactly that.
// The owner made this one, so it is ours.
//
// WHY A WAV SLICE AND NOT THE MP3 ITSELF. The mp3 decodes to 78ms, but the pop
// does not start until 27.8ms in: that leading silence is encoder padding,
// which every mp3 carries. Scheduling that buffer would put 28ms between the
// reel landing and the sound of it landing, and the reel clicks in bursts
// where that lag is audible as a drag. What is kept is the 21ms that has the
// sound in it, from 2ms before the onset to 10ms after the last of the decay,
// mono 44.1kHz with a 4ms fade on each end so the slice cannot end on a step
// and click a second time. 1.8KB of WAV.
//
// INLINE RATHER THAN public/, and that is the whole reason it is trimmed.
// public/ is copied wholesale into the native bundle, so an admin-only sound
// would sit in every reader's download for something no reader can reach:
// app/admin is stashed out of the export entirely. As a base64 string in a
// module only the admin tree imports, it is tree-shaken out of that bundle and
// costs readers nothing.

/** 21ms mono 44.1kHz WAV, base64. The owner's pop. */
export const CLICK_WAV_BASE64 =
  "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";
