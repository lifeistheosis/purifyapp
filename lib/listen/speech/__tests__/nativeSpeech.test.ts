// The apps' own speech plugin (1.9, build 95 note 25): one contract, two
// halves. The player (lib/listen/speech/engine.ts) asks both the same five
// things and reads the same reports from both, so a method or a report named
// on one side and not the other would leave a phone silent, or a verse never
// lit. Neither half compiles here (no Android SDK, no Xcode), so this reads
// them; the phone walk on the release APK and TestFlight proves them.
//
// What a reader would notice if this broke: Listen that does nothing on one
// of the two phones; a voice muted by the iPhone's silent switch, or that
// stops when the screen locks; the text of a reading sent away to be spoken.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

const read = (p: string) => fs.readFileSync(p, "utf8");
const JAVA = read("android/app/src/main/java/net/purifyapp/purify/speech/PurifySpeechPlugin.java");
const SWIFT = read("ios/App/App/PurifySpeechPlugin.swift");
const ENGINE = read("lib/listen/speech/engine.ts");
const METHODS = ["voices", "speak", "stop", "preview", "nowPlaying"];
const REPORTS = ["start", "word", "done", "end", "error"];

describe("the speech plugin's two halves", () => {
  it("answer to one name and the same five methods", () => {
    expect(JAVA).toContain('@CapacitorPlugin(name = "PurifySpeech")');
    expect(SWIFT).toContain('public let jsName = "PurifySpeech"');
    expect(ENGINE).toContain('nativePlugin<PurifySpeechPlugin>("PurifySpeech")');
    for (const m of METHODS) {
      expect(JAVA, m).toContain(`public void ${m}(PluginCall call)`);
      expect(SWIFT, m).toContain(`CAPPluginMethod(name: "${m}", returnType: CAPPluginReturnPromise)`);
      expect(SWIFT, m).toContain(`@objc func ${m}(_ call: CAPPluginCall)`);
    }
  });

  it("report on one channel, with the reports the player reads, and the iPhone's lock screen buttons", () => {
    expect(JAVA).toContain('notifyListeners("speech", e)');
    expect(SWIFT).toContain('notifyListeners("speech", data: payload)');
    for (const r of REPORTS) {
      expect(ENGINE, r).toContain(`type: "${r}"`);
      expect(JAVA, r).toMatch(new RegExp(`send\\("${r}"`));
    }
    for (const r of ["start", "word", "done", "end"]) expect(SWIFT, r).toContain(`"type": "${r}"`);
    expect(SWIFT).toContain('"type": "remote"');
    for (const a of ["play", "pause", "toggle", "skip"]) expect(SWIFT).toContain(`tell("${a}"`);
  });

  it("count a word's letters in the piece as it was given, the reading's start added back", () => {
    expect(JAVA).toContain("send(\"word\", p, start + shift, end + shift)");
    expect(SWIFT).toContain('"start": range.location + s.shift');
  });

  it("list only voices on the phone: none that sends the text away, none not installed, no novelty voice", () => {
    expect(JAVA).toContain("!v.isNetworkConnectionRequired() && !missing");
    expect(JAVA).toContain("KEY_FEATURE_NOT_INSTALLED");
    expect(SWIFT).toContain("v.voiceTraits.contains(.isNoveltyVoice)");
    expect(ENGINE).toContain(".filter((v) => v.localService)");
  });

  it("queue every piece at once, so the phone reads on with the screen off", () => {
    expect(JAVA).toContain("TextToSpeech.QUEUE_ADD");
    expect(SWIFT).toContain("self.synth.speak(u)");
  });

  it("on the iPhone, speak in the playback session, so the silent switch does not mute it, with background audio declared", () => {
    expect(SWIFT).toContain("session.setCategory(.playback, mode: .spokenAudio");
    expect(read("ios/App/App/Info.plist")).toMatch(/<key>UIBackgroundModes<\/key>\s*<array>\s*<string>audio<\/string>/);
  });

  it("on the iPhone, hold the plugin weakly from the synthesizer's delegate", () => {
    expect(SWIFT).toContain("weak var owner: PurifySpeechPlugin?");
  });

  it("on Android, take the app's context, let the phone go when the app does, and ask for no audio focus (the ambience plays on under the voice)", () => {
    expect(JAVA).toContain("new TextToSpeech(getContext().getApplicationContext()");
    expect(JAVA).toContain("tts.shutdown()");
    expect(JAVA).not.toMatch(/requestAudioFocus|AudioFocusRequest/);
  });

  it("are registered in both apps, and the iPhone's file is built into the app, not the widgets", () => {
    expect(read("android/app/src/main/java/net/purifyapp/purify/MainActivity.java")).toMatch(/registerPlugin\(PurifySpeechPlugin\.class\);\s*\n\s*super\.onCreate/);
    expect(read("ios/App/App/PurifyBridgeViewController.swift")).toContain("bridge?.registerPluginInstance(PurifySpeechPlugin())");
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    const build = /(\w+) \/\* PurifySpeechPlugin\.swift in Sources \*\/ = \{isa = PBXBuildFile; fileRef = (\w+)/.exec(project);
    expect(build).not.toBeNull();
    expect(project).toContain(`${build![2]} /* PurifySpeechPlugin.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = PurifySpeechPlugin.swift;`);
    // The app target's Sources phase is the one that builds the widget bridge.
    const phases = [...project.matchAll(/\/\* Sources \*\/ = \{\s*isa = PBXSourcesBuildPhase;[\s\S]*?files = \(([\s\S]*?)\);/g)].map((m) => m[1]);
    const app = phases.find((f) => f.includes("WidgetBridgePlugin.swift in Sources"));
    expect(app).toContain(`${build![1]} /* PurifySpeechPlugin.swift in Sources */`);
    expect(phases.filter((f) => f.includes("PurifySpeechPlugin"))).toHaveLength(1);
  });

  it("can find the phone's speech engine on Android 11 and later (a visibility rule, not a permission)", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    expect(manifest).toMatch(/<queries>\s*<intent>\s*<action android:name="android\.intent\.action\.TTS_SERVICE" \/>\s*<\/intent>\s*<\/queries>/);
    expect(manifest).not.toContain("QUERY_ALL_PACKAGES");
  });
});
