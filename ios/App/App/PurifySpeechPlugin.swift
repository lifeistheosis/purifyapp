import AVFoundation
import Capacitor
import Foundation
import MediaPlayer

/// The phone's own voices, for Purify's player (1.9, build 95 note 25: the
/// choice of voices, by the phone's own voices). The player
/// (lib/listen/speech/engine.ts, session.ts) plays a text spoken here as it
/// plays a recording.
///
/// Spoken here, not by the web view's own speech: the web view's would be
/// muted by the silent switch and would stop when the screen locks. Here the
/// app's audio session is set to playback, as a recording's is, and the app
/// already keeps sound going in the background (Info.plist, UIBackgroundModes
/// audio).
///
/// A text comes as its pieces (verses, or paragraphs), all queued at once.
/// Each report names the ask it answers (token) and the piece (index); a
/// word's letters are counted in the piece as it was given, so the player
/// lights the very word said.
///
/// While it speaks, the lock screen shows what is read and its buttons come
/// back to the player (the web view draws the lock screen only for what it
/// plays itself). Novelty voices (bells, bubbles and the like) are never
/// listed: this is Scripture and the Fathers.
///
/// A phone call, Siri, an alarm or another app taking the sound interrupts
/// the audio session: the voice stops at its word and says so
/// ("interruption"), and the player shows it paused there. When the phone
/// ends the interruption and says the reading may go on (a call or Siri
/// over), the player takes it up at that word, as a recording goes on after a
/// call; otherwise it waits for the reader.
@objc(PurifySpeechPlugin)
public class PurifySpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PurifySpeechPlugin"
    public let jsName = "PurifySpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "voices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "preview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "nowPlaying", returnType: CAPPluginReturnPromise),
    ]

    private let synth = AVSpeechSynthesizer()
    /// The synthesizer's delegate, holding this plugin weakly.
    private lazy var relay = SpeechRelay(owner: self)
    /// What each utterance is: the ask, the piece, where its letters begin, and the pieces in all.
    private var spoken: [ObjectIdentifier: (token: Int, index: Int, shift: Int, count: Int)] = [:]
    private var remoteTargets: [(MPRemoteCommand, Any)] = []
    /// The audio session was interrupted while a text was read: say when it is over.
    private var interruptedWhileReading = false

    override public func load() {
        synth.delegate = relay
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(audioInterrupted(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    /// A call, Siri, an alarm or another app took the sound, or gave it back.
    @objc private func audioInterrupted(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        var resume = false
        if let options = note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt {
            resume = AVAudioSession.InterruptionOptions(rawValue: options).contains(.shouldResume)
        }
        DispatchQueue.main.async {
            switch type {
            case .began:
                // A reading, not a voice's "Hear it": stopped at its word.
                guard !self.spoken.isEmpty else { return }
                self.synth.stopSpeaking(at: .immediate)
                self.spoken.removeAll()
                self.interruptedWhileReading = true
                self.send(["type": "interruption", "began": true])
            case .ended:
                guard self.interruptedWhileReading else { return }
                self.interruptedWhileReading = false
                self.send(["type": "interruption", "began": false, "resume": resume])
            @unknown default:
                break
            }
        }
    }

    private func send(_ payload: [String: Any]) {
        notifyListeners("speech", data: payload)
    }

    private func onDevice(_ v: AVSpeechSynthesisVoice) -> Bool {
        if #available(iOS 17.0, *) {
            if v.voiceTraits.contains(.isNoveltyVoice) || v.voiceTraits.contains(.isPersonalVoice) { return false }
        }
        return !v.identifier.contains("speech.synthesis.voice")
    }

    private func voice(_ id: String?, _ lang: String) -> AVSpeechSynthesisVoice? {
        if let id = id, let v = AVSpeechSynthesisVoice(identifier: id), onDevice(v) { return v }
        return AVSpeechSynthesisVoice(language: lang)
    }

    /// The reader's speed (1 is the voice's own) on the iPhone's scale, where 0.5 is the voice's own.
    private func iosRate(_ r: Float) -> Float {
        let base = AVSpeechUtteranceDefaultSpeechRate
        let value = r >= 1
            ? base + (AVSpeechUtteranceMaximumSpeechRate - base) * (r - 1) * 0.3
            : base * (0.5 + 0.5 * r)
        return max(AVSpeechUtteranceMinimumSpeechRate, min(AVSpeechUtteranceMaximumSpeechRate, value))
    }

    /// Playback, as a recording's: the silent switch does not mute it and it goes on with the screen locked.
    private func playbackSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio, options: [])
        try? session.setActive(true)
    }

    @objc func voices(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var standard: [String: String] = [:]
            var list: [[String: Any]] = []
            for v in AVSpeechSynthesisVoice.speechVoices() where self.onDevice(v) {
                if standard[v.language] == nil {
                    standard[v.language] = AVSpeechSynthesisVoice(language: v.language)?.identifier ?? ""
                }
                var o: [String: Any] = ["id": v.identifier, "name": v.name, "lang": v.language, "quality": v.quality.rawValue]
                if standard[v.language] == v.identifier { o["default"] = true }
                list.append(o)
            }
            call.resolve(["voices": list])
        }
    }

    @objc func speak(_ call: CAPPluginCall) {
        let pieces = call.getArray("pieces", String.self) ?? []
        let token = call.getInt("token") ?? 0
        let from = max(0, call.getInt("from") ?? 0)
        let offset = max(0, call.getInt("offset") ?? 0)
        let lang = call.getString("lang") ?? "en"
        let id = call.getString("voice")
        let rate = call.getFloat("rate") ?? 1
        let volume = call.getFloat("volume") ?? 1
        let info = (title: call.getString("title"), artist: call.getString("artist"), duration: call.getDouble("duration"), elapsed: call.getDouble("elapsed"))
        DispatchQueue.main.async {
            self.synth.stopSpeaking(at: .immediate)
            self.spoken.removeAll()
            self.interruptedWhileReading = false
            self.playbackSession()
            let chosen = self.voice(id, lang)
            for i in from..<max(from, pieces.count) {
                let piece = pieces[i]
                let shift = i == from ? min(offset, piece.utf16.count) : 0
                let text = shift > 0 ? String(piece.utf16.dropFirst(shift)) ?? piece : piece
                let u = AVSpeechUtterance(string: text)
                u.voice = chosen
                u.rate = self.iosRate(rate)
                u.volume = max(0, min(1, volume))
                self.spoken[ObjectIdentifier(u)] = (token, i, shift, pieces.count)
                self.synth.speak(u)
            }
            self.lockScreen(title: info.title, artist: info.artist, duration: info.duration, elapsed: info.elapsed, playing: true)
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.synth.stopSpeaking(at: .immediate)
            self.spoken.removeAll()
            // The reader's own pause or a new reading: an interruption ending takes nothing up.
            self.interruptedWhileReading = false
            call.resolve()
        }
    }

    @objc func preview(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        let lang = call.getString("lang") ?? "en"
        let id = call.getString("voice")
        let rate = call.getFloat("rate") ?? 1
        DispatchQueue.main.async {
            self.synth.stopSpeaking(at: .immediate)
            self.spoken.removeAll()
            self.playbackSession()
            let u = AVSpeechUtterance(string: text)
            u.voice = self.voice(id, lang)
            u.rate = self.iosRate(rate)
            self.synth.speak(u)
            call.resolve()
        }
    }

    @objc func nowPlaying(_ call: CAPPluginCall) {
        let clear = call.getBool("clear") ?? false
        let info = (title: call.getString("title"), artist: call.getString("artist"), duration: call.getDouble("duration"), elapsed: call.getDouble("elapsed"), playing: call.getBool("playing") ?? false)
        DispatchQueue.main.async {
            if clear {
                MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
                for (command, target) in self.remoteTargets { command.removeTarget(target) }
                self.remoteTargets.removeAll()
            } else {
                self.lockScreen(title: info.title, artist: info.artist, duration: info.duration, elapsed: info.elapsed, playing: info.playing)
            }
            call.resolve()
        }
    }

    /// What the lock screen shows, and its buttons back to the player, while a text is spoken.
    private func lockScreen(title: String?, artist: String?, duration: Double?, elapsed: Double?, playing: Bool) {
        var now: [String: Any] = [MPNowPlayingInfoPropertyPlaybackRate: playing ? 1.0 : 0.0]
        if let title = title { now[MPMediaItemPropertyTitle] = title }
        if let artist = artist { now[MPMediaItemPropertyArtist] = artist }
        now[MPMediaItemPropertyAlbumTitle] = "Purify"
        if let duration = duration { now[MPMediaItemPropertyPlaybackDuration] = duration }
        if let elapsed = elapsed { now[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = now
        guard remoteTargets.isEmpty else { return }
        let center = MPRemoteCommandCenter.shared()
        let tell: (String, Double?) -> MPRemoteCommandHandlerStatus = { [weak self] action, seconds in
            var payload: [String: Any] = ["type": "remote", "action": action]
            if let seconds = seconds { payload["seconds"] = seconds }
            self?.send(payload)
            return .success
        }
        center.skipForwardCommand.preferredIntervals = [15]
        center.skipBackwardCommand.preferredIntervals = [15]
        remoteTargets = [
            (center.playCommand, center.playCommand.addTarget { _ in tell("play", nil) }),
            (center.pauseCommand, center.pauseCommand.addTarget { _ in tell("pause", nil) }),
            (center.togglePlayPauseCommand, center.togglePlayPauseCommand.addTarget { _ in tell("toggle", nil) }),
            (center.skipForwardCommand, center.skipForwardCommand.addTarget { _ in tell("skip", 15) }),
            (center.skipBackwardCommand, center.skipBackwardCommand.addTarget { _ in tell("skip", -15) }),
        ]
    }

    fileprivate func started(_ u: AVSpeechUtterance) {
        guard let s = spoken[ObjectIdentifier(u)] else { return }
        send(["type": "start", "token": s.token, "index": s.index])
    }

    fileprivate func word(_ u: AVSpeechUtterance, _ range: NSRange) {
        guard let s = spoken[ObjectIdentifier(u)] else { return }
        send(["type": "word", "token": s.token, "index": s.index, "start": range.location + s.shift, "end": range.location + range.length + s.shift])
    }

    fileprivate func finished(_ u: AVSpeechUtterance) {
        guard let s = spoken.removeValue(forKey: ObjectIdentifier(u)) else { return }
        send(["type": "done", "token": s.token, "index": s.index])
        if s.index == s.count - 1 { send(["type": "end", "token": s.token]) }
    }
}

/// AVSpeechSynthesizer's delegate, kept apart so it holds the plugin weakly.
final class SpeechRelay: NSObject, AVSpeechSynthesizerDelegate {
    weak var owner: PurifySpeechPlugin?

    init(owner: PurifySpeechPlugin) {
        self.owner = owner
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        owner?.started(utterance)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString characterRange: NSRange, utterance: AVSpeechUtterance) {
        owner?.word(utterance, characterRange)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        owner?.finished(utterance)
    }
}
