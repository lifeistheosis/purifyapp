// How long an MP3 plays, read from its own frames, with no ffmpeg.
//
// Used by the chant intake (prepare-audio.mjs) to print the duration a chant's
// data file records for a recording, and by its test. Every MPEG audio frame
// says how many samples it carries and at what rate, so the duration is the
// sum of the frames: exact for constant and variable bit rates alike, where a
// guess from the file's size and one bit rate is not.
import fs from "node:fs";

// Bit rates in kbps, by version (1, or 2 and 2.5) and layer (1, 2, 3).
const BITRATES = {
  v1: {
    1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  },
  v2: {
    1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  },
};
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** The header of the frame starting at `i`, or null when there is none. */
function frameAt(buf, i) {
  if (i + 4 > buf.length || buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) return null;
  const version = (buf[i + 1] >> 3) & 3; // 3: MPEG 1, 2: MPEG 2, 0: MPEG 2.5
  const layerBits = (buf[i + 1] >> 1) & 3;
  if (version === 1 || layerBits === 0) return null;
  const layer = 4 - layerBits;
  const bitrateIndex = (buf[i + 2] >> 4) & 15;
  const rateIndex = (buf[i + 2] >> 2) & 3;
  if (bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const padding = (buf[i + 2] >> 1) & 1;
  const kbps = BITRATES[version === 3 ? "v1" : "v2"][layer][bitrateIndex];
  const rate = RATES[version][rateIndex];
  const samples = layer === 1 ? 384 : layer === 2 || version === 3 ? 1152 : 576;
  const length =
    layer === 1
      ? Math.floor(((12 * kbps * 1000) / rate + padding) * 4)
      : Math.floor(((samples / 8) * kbps * 1000) / rate) + padding;
  return length > 4 ? { length, samples, rate } : null;
}

/** Seconds of sound in an MP3 file, to the hundredth. */
export function mp3Duration(file) {
  const buf = fs.readFileSync(file);
  let i = 0;
  // An ID3v2 tag at the start: its size is four 7-bit bytes.
  if (buf.length > 10 && buf.toString("latin1", 0, 3) === "ID3") {
    const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
    i = 10 + size + (buf[5] & 0x10 ? 10 : 0);
  }
  let seconds = 0;
  let frames = 0;
  while (i < buf.length) {
    const frame = frameAt(buf, i);
    if (frame && (i + frame.length === buf.length || frameAt(buf, i + frame.length) || i + frame.length > buf.length - 4)) {
      seconds += frame.samples / frame.rate;
      frames += 1;
      i += frame.length;
    } else {
      i += 1;
    }
  }
  if (frames === 0) throw new Error(`${file}: no MPEG audio frames found`);
  return Math.round(seconds * 100) / 100;
}
