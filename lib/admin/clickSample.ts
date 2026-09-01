// The reel's click, inlined.
//
// Trimmed from freesound_community-bike-click-7033.mp3, which is 8 seconds of
// 320kbps stereo and 156KB for a transient that turned out to be 6.4ms long,
// sitting 5.34 seconds into the file. What is kept is a 26ms mono slice at
// 22.05kHz starting 2ms before the onset, with a 3ms fade so the slice cannot
// end on a step and click a second time. 1.2KB of WAV.
//
// INLINE RATHER THAN public/, and that is the whole reason it was trimmed.
// public/ is copied wholesale into the native bundle, so a 156KB admin-only
// sound would have been 156KB in every reader's download for something no
// reader can reach: app/admin is stashed out of the export entirely. As a
// base64 string in a module only the admin tree imports, it is tree-shaken out
// of that bundle and costs readers nothing.
//
// PROVENANCE IS NOT SETTLED. The file came from Freesound with no licence
// alongside it, and this repo has form here: the ambience MP3s were removed
// over exactly this. Freesound's own community packs are usually CC0, but a
// filename does not prove a licence. Confirm before this ships publicly, and
// if it cannot be confirmed, lib/admin/sound.ts still has the synthesised tick
// that this replaced.

/** 26ms mono 22.05kHz WAV, base64. */
export const CLICK_WAV_BASE64 =
  "UklGRp4EAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YXoEAAAn8sbxYPH38JfwUPAX8Nfvo+9772XvRO8t7yHvHO8w7zzvVO9w75rv3e8r8ILw4PBN8bXxLPKv8ivzpfMt9Nn0ePUP9rn2cfc2+Pf4wvmD+lP7MfwM/ev9yv7C/68AmgGTAo8DgwRtBW0GagddCEgJQQpICzIMGw0LDgkP9g/TELMRiRJcEyoUAxXMFYYWThcZGNQYbhkSGrcaShvRG1Qc2Bw+HaYdEB50HsceDR9ZH5IfwB/kHwUgGyApIEIgTiBRIE8gUiBNIDMgGSD+H+Efsx+KH2sfRB8WH+EesR5zHjAe8R2wHWsdGB3QHIscRhz3G6YbVxv0GpAaLRrPGWsZBBmtGE8Y7BeEFyAXrhYwFr0VRBXCFDEUqRMfE4sS+xFpEdgQPhCqDxMPdA7fDUoNtgwUDHwL6gpPCq8JCwl3CN8HQAedBv0FYAW2BBEEcQPWAjACjwEAAWwA1P80/5/+C/50/dv8Ofyh+xP7j/oJ+oX5A/l7+Pf3ePf79nX27/Vy9fX0f/QK9JrzKPO68lny+/Gm8U7x+fCg8E/w/e+r717vJe/o7qTuW+4s7gHu0+2l7X7tY+1G7S7tHO0Q7QbtA+0D7QvtH+0r7TTtO+1F7V3tcO2O7art1u327SHuVu6P7r7u5u4q71vvmO/I7xHwWfCg8N3wHfFl8bjx5vEl8m7ys/Ly8jvzgfPM8wD0UfSR9MX0DPVL9ZL1tPX+9Sr2YvZ/9sr25vYu9z73l/ep99j3+vcq+Fv4bPiS+LT40/jC+P/4DPkk+UD5TPle+Xr5oPmR+br5tfnA+cL51Pn3+en5I/r4+RX6MfoZ+ib6J/r0+fz5/PnU+eX5v/nP+cD5o/ms+X35lPmX+WT5bfmE+VT5OPlW+Tn5Kfk7+SH5Ofki+Rb5H/kM+S/5GPkG+Ub5PPky+Vv5T/li+aD5evnK+ab50/nM+fT5Cfrv+S/6I/os+jD6V/pO+n76kvpz+uD60PoD++L6OPsg+2z7OPty+5z7lvvb+677Mfz6+1L8V/yJ/Ff8vvzE/Pn8vvwZ/Vb9Bf1N/VP9W/1f/WP9wP1d/Wb9pf2L/XX9k/1t/Zf9Vv00/WH97fwX/bj85/xh/ID8J/wR/Ov7kft++1T7Hvvh+vL6hfq1+mz6S/pT+h76J/rV+fD57vmO+cb5Y/nz+ZD5ePml+Yj5pvl0+bL5tfnQ+c/58PkL+jf6Zvol+r76jvrG+tz6Jfsi+3b7ZPu++8D70PtD/Fb8ivyT/Ev91fxJ/ZP9u/3n/UL+j/41/mH/Ov8h/xoAvv9fADMA0wDvAEIBywHZATgChwLEAioDfAOLAwsEuQOqBIwE/gRbBb0FegY9BnIGyAbLBucGegf0Bu4HTQdbCMUHUwmHB2EIvQceClEGIgm9B2gHJgkrBy8K2gd3CJEHewgpBlcHYwf1BzsH3wa0B/EG6AY5B+sFzgWUBZgFbwXYBJ4FEgXkBHoELwQmBHwDiAM1A3cD3QLNAtECewIOAvkBxwFoAWIBEQEOAdsAqQB4AFYAJQA=";
