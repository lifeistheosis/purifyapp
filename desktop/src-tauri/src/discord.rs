//! Discord Rich Presence over Discord's local IPC socket.
//!
//! The Discord desktop app listens on a Unix socket (macOS, Linux) or a named
//! pipe (Windows) called `discord-ipc-N`. A frame is an 8-byte header, opcode
//! then length as little-endian u32, followed by that many bytes of JSON. The
//! client says hello with its application id, waits for READY, then sends
//! SET_ACTIVITY. Closing the connection clears the activity, so if Purify
//! quits or crashes the status disappears with it.
//!
//! Nothing here touches the network. The socket is local, and Discord does
//! the rest under its own privacy policy.
//!
//! All the work happens on one background thread that owns the connection.
//! The rest of the app only ever sends it the activity it wants shown, so a
//! slow or absent Discord can never block the window. The thread coalesces
//! rapid changes (Discord accepts about five updates per twenty seconds) and,
//! while something is waiting to be shown, retries a missing Discord every
//! fifteen seconds. It holds no connection at all while presence is off.

use std::io::{self, Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use serde_json::{json, Value};

use crate::presence::Activity;

const OP_HANDSHAKE: u32 = 0;
const OP_FRAME: u32 = 1;
const OP_CLOSE: u32 = 2;
const OP_PING: u32 = 3;
const OP_PONG: u32 = 4;

/// Discord's replies are a few kilobytes. Anything far larger is not Discord.
const MAX_FRAME: u32 = 64 * 1024;

pub trait Stream: Read + Write + Send {}
impl<T: Read + Write + Send> Stream for T {}

fn invalid(msg: impl Into<String>) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, msg.into())
}

pub fn write_frame(w: &mut dyn Write, op: u32, payload: &Value) -> io::Result<()> {
    let body = serde_json::to_vec(payload)?;
    let len = u32::try_from(body.len()).map_err(|_| invalid("frame too large"))?;
    let mut frame = Vec::with_capacity(8 + body.len());
    frame.extend_from_slice(&op.to_le_bytes());
    frame.extend_from_slice(&len.to_le_bytes());
    frame.extend_from_slice(&body);
    w.write_all(&frame)?;
    w.flush()
}

pub fn read_frame(r: &mut dyn Read) -> io::Result<(u32, Value)> {
    let mut header = [0u8; 8];
    r.read_exact(&mut header)?;
    let op = u32::from_le_bytes([header[0], header[1], header[2], header[3]]);
    let len = u32::from_le_bytes([header[4], header[5], header[6], header[7]]);
    if len > MAX_FRAME {
        return Err(invalid(format!("frame of {len} bytes refused")));
    }
    let mut body = vec![0u8; len as usize];
    r.read_exact(&mut body)?;
    let value = if body.is_empty() { Value::Null } else { serde_json::from_slice(&body)? };
    Ok((op, value))
}

/// One live connection to the Discord app.
pub struct Ipc {
    stream: Box<dyn Stream>,
    nonce: u64,
}

impl Ipc {
    /// Say hello and wait for READY.
    pub fn handshake(mut stream: Box<dyn Stream>, client_id: &str) -> io::Result<Self> {
        write_frame(&mut stream, OP_HANDSHAKE, &json!({ "v": 1, "client_id": client_id }))?;
        loop {
            match read_frame(&mut stream)? {
                (OP_PING, body) => write_frame(&mut stream, OP_PONG, &body)?,
                (OP_FRAME, body) if body["evt"] == "READY" => return Ok(Self { stream, nonce: 0 }),
                (OP_CLOSE, body) => return Err(invalid(format!("Discord closed the handshake: {body}"))),
                (_, body) => return Err(invalid(format!("unexpected handshake reply: {body}"))),
            }
        }
    }

    /// Show `activity`, or clear the status with None. Waits for Discord's
    /// answer to this request so replies never pile up in the socket.
    pub fn set_activity(&mut self, activity: Option<&Activity>) -> io::Result<()> {
        self.nonce += 1;
        let nonce = format!("purify-{}-{}", std::process::id(), self.nonce);
        let payload = json!({
            "cmd": "SET_ACTIVITY",
            "args": { "pid": std::process::id(), "activity": activity },
            "nonce": nonce,
        });
        write_frame(&mut self.stream, OP_FRAME, &payload)?;
        loop {
            match read_frame(&mut self.stream)? {
                (OP_PING, body) => write_frame(&mut self.stream, OP_PONG, &body)?,
                (OP_CLOSE, body) => return Err(invalid(format!("Discord closed the connection: {body}"))),
                (OP_FRAME, body) if body["nonce"] == nonce.as_str() => {
                    return if body["evt"] == "ERROR" {
                        Err(invalid(format!("Discord refused the activity: {}", body["data"])))
                    } else {
                        Ok(())
                    };
                }
                // Events for other requests or none at all: keep reading.
                _ => {}
            }
        }
    }
}

/// Where the Discord app may be listening, most likely first.
#[cfg(unix)]
fn candidates() -> Vec<std::path::PathBuf> {
    use std::path::PathBuf;
    let mut roots: Vec<PathBuf> = ["XDG_RUNTIME_DIR", "TMPDIR", "TMP", "TEMP"]
        .iter()
        .filter_map(|v| std::env::var_os(v).map(PathBuf::from))
        .collect();
    roots.push(PathBuf::from("/tmp"));
    // The plain install, then the Flatpak and Snap sandboxes, which put the
    // socket one directory down.
    let subdirs = ["", "app/com.discordapp.Discord", "snap.discord", "app/com.discordapp.DiscordCanary"];
    let mut out = Vec::new();
    for root in &roots {
        for sub in subdirs {
            for i in 0..10 {
                let p = root.join(sub).join(format!("discord-ipc-{i}"));
                if !out.contains(&p) {
                    out.push(p);
                }
            }
        }
    }
    out
}

/// Find a running Discord and complete the handshake.
pub fn connect(client_id: &str) -> io::Result<Ipc> {
    #[cfg(unix)]
    {
        use std::os::unix::net::UnixStream;
        for path in candidates() {
            let Ok(stream) = UnixStream::connect(&path) else { continue };
            // A Discord that accepts and then says nothing must not hang the
            // presence thread forever.
            stream.set_read_timeout(Some(Duration::from_secs(5)))?;
            stream.set_write_timeout(Some(Duration::from_secs(5)))?;
            if let Ok(ipc) = Ipc::handshake(Box::new(stream), client_id) {
                return Ok(ipc);
            }
        }
    }
    #[cfg(windows)]
    {
        for i in 0..10 {
            let name = format!(r"\\.\pipe\discord-ipc-{i}");
            let Ok(pipe) = std::fs::OpenOptions::new().read(true).write(true).open(&name) else { continue };
            if let Ok(ipc) = Ipc::handshake(Box::new(pipe), client_id) {
                return Ok(ipc);
            }
        }
    }
    Err(io::Error::new(io::ErrorKind::NotFound, "Discord is not running"))
}

pub enum Command {
    Set(Activity),
    Clear,
    Shutdown,
}

#[derive(Clone, Copy)]
pub struct Timing {
    /// The least time between two updates Discord sees.
    pub min_interval: Duration,
    /// How long to wait before looking for Discord again.
    pub retry: Duration,
    /// How often the thread wakes with nothing to do.
    pub tick: Duration,
}

impl Default for Timing {
    fn default() -> Self {
        Self { min_interval: Duration::from_secs(4), retry: Duration::from_secs(15), tick: Duration::from_millis(500) }
    }
}

/// The presence thread's handle. Cheap to clone.
#[derive(Clone)]
pub struct Presence {
    tx: Option<Sender<Command>>,
    connected: Arc<AtomicBool>,
}

impl Presence {
    /// Start the thread for this Discord application id. With no id (a build
    /// made before the owner has created the Discord application) nothing is
    /// started and every call is a no-op.
    pub fn start(client_id: Option<String>) -> Self {
        match client_id {
            Some(id) => Self::start_with(id, connect, Timing::default()),
            None => Self { tx: None, connected: Arc::new(AtomicBool::new(false)) },
        }
    }

    pub fn start_with<C>(client_id: String, mut connector: C, timing: Timing) -> Self
    where
        C: FnMut(&str) -> io::Result<Ipc> + Send + 'static,
    {
        let (tx, rx) = mpsc::channel::<Command>();
        let connected = Arc::new(AtomicBool::new(false));
        let flag = connected.clone();
        thread::Builder::new()
            .name("discord-presence".into())
            .spawn(move || {
                let mut conn: Option<Ipc> = None;
                let mut desired: Option<Activity> = None;
                // What Discord is showing, as far as we know. None: nothing
                // sent on this connection yet.
                let mut shown: Option<Option<Activity>> = None;
                let mut last_send: Option<Instant> = None;
                let mut next_attempt = Instant::now();
                loop {
                    match rx.recv_timeout(timing.tick) {
                        Ok(Command::Set(a)) => desired = Some(a),
                        Ok(Command::Clear) => desired = None,
                        Ok(Command::Shutdown) | Err(RecvTimeoutError::Disconnected) => {
                            if let Some(c) = conn.as_mut() {
                                let _ = c.set_activity(None);
                            }
                            flag.store(false, Ordering::Relaxed);
                            return;
                        }
                        Err(RecvTimeoutError::Timeout) => {}
                    }
                    // Take every queued change before acting, so a burst of
                    // navigation becomes one update.
                    while let Ok(cmd) = rx.try_recv() {
                        match cmd {
                            Command::Set(a) => desired = Some(a),
                            Command::Clear => desired = None,
                            Command::Shutdown => {
                                if let Some(c) = conn.as_mut() {
                                    let _ = c.set_activity(None);
                                }
                                flag.store(false, Ordering::Relaxed);
                                return;
                            }
                        }
                    }

                    let now = Instant::now();
                    if conn.is_none() {
                        if desired.is_none() || now < next_attempt {
                            continue;
                        }
                        match connector(&client_id) {
                            Ok(c) => {
                                conn = Some(c);
                                shown = None;
                                flag.store(true, Ordering::Relaxed);
                            }
                            Err(_) => {
                                next_attempt = now + timing.retry;
                                continue;
                            }
                        }
                    }

                    if shown.as_ref() == Some(&desired) {
                        // Presence is off and Discord knows it: let go of the
                        // connection entirely rather than idle on it.
                        if desired.is_none() {
                            conn = None;
                            flag.store(false, Ordering::Relaxed);
                        }
                        continue;
                    }
                    if last_send.is_some_and(|t| now.duration_since(t) < timing.min_interval) {
                        continue;
                    }
                    let Some(c) = conn.as_mut() else { continue };
                    match c.set_activity(desired.as_ref()) {
                        Ok(()) => {
                            shown = Some(desired.clone());
                            last_send = Some(now);
                        }
                        Err(_) => {
                            // Discord quit or restarted. Look again shortly.
                            conn = None;
                            shown = None;
                            flag.store(false, Ordering::Relaxed);
                            next_attempt = now + timing.retry;
                        }
                    }
                }
            })
            .expect("failed to start the presence thread");
        Self { tx: Some(tx), connected }
    }

    pub fn configured(&self) -> bool {
        self.tx.is_some()
    }

    pub fn connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }

    pub fn set(&self, activity: Activity) {
        self.send(Command::Set(activity));
    }

    pub fn clear(&self) {
        self.send(Command::Clear);
    }

    pub fn shutdown(&self) {
        self.send(Command::Shutdown);
    }

    fn send(&self, cmd: Command) {
        if let Some(tx) = &self.tx {
            let _ = tx.send(cmd);
        }
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use crate::presence::{sanitize, PresenceRequest};
    use std::os::unix::net::UnixStream;
    use std::sync::Mutex;

    fn activity(details: &str) -> Activity {
        sanitize(&PresenceRequest { details: details.into(), state: None, path: None, button_label: None }).unwrap()
    }

    /// A stand-in for the Discord app on the other end of a socket pair. It
    /// answers the handshake, pings once to prove the client pongs, and
    /// records every SET_ACTIVITY it receives.
    fn fake_discord(mut server: UnixStream, log: Arc<Mutex<Vec<Value>>>) {
        thread::spawn(move || {
            let (op, hello) = read_frame(&mut server).unwrap();
            assert_eq!(op, OP_HANDSHAKE);
            assert_eq!(hello["v"], 1);
            assert_eq!(hello["client_id"], "123");
            write_frame(&mut server, OP_PING, &json!({ "n": 1 })).unwrap();
            write_frame(&mut server, OP_FRAME, &json!({ "cmd": "DISPATCH", "evt": "READY" })).unwrap();
            let (op, pong) = read_frame(&mut server).unwrap();
            assert_eq!(op, OP_PONG);
            assert_eq!(pong["n"], 1);
            while let Ok((op, body)) = read_frame(&mut server) {
                assert_eq!(op, OP_FRAME);
                assert_eq!(body["cmd"], "SET_ACTIVITY");
                // An unrelated event first: the client must skip it.
                write_frame(&mut server, OP_FRAME, &json!({ "evt": "ACTIVITY_JOIN" })).unwrap();
                write_frame(&mut server, OP_FRAME, &json!({ "cmd": "SET_ACTIVITY", "nonce": body["nonce"], "data": {} }))
                    .unwrap();
                log.lock().unwrap().push(body["args"]["activity"].clone());
            }
        });
    }

    fn pair() -> (Box<dyn Stream>, UnixStream) {
        let (client, server) = UnixStream::pair().unwrap();
        client.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
        (Box::new(client), server)
    }

    #[test]
    fn frames_round_trip() {
        let mut buf = Vec::new();
        write_frame(&mut buf, OP_FRAME, &json!({ "a": "Ω" })).unwrap();
        assert_eq!(&buf[0..4], &1u32.to_le_bytes());
        let (op, v) = read_frame(&mut buf.as_slice()).unwrap();
        assert_eq!((op, v), (OP_FRAME, json!({ "a": "Ω" })));
    }

    #[test]
    fn an_oversized_frame_is_refused_before_it_is_read() {
        let mut buf = Vec::new();
        buf.extend_from_slice(&OP_FRAME.to_le_bytes());
        buf.extend_from_slice(&(MAX_FRAME + 1).to_le_bytes());
        assert!(read_frame(&mut buf.as_slice()).is_err());
    }

    #[test]
    fn handshake_then_set_and_clear() {
        let (client, server) = pair();
        let log = Arc::new(Mutex::new(Vec::new()));
        fake_discord(server, log.clone());
        let mut ipc = Ipc::handshake(client, "123").unwrap();
        ipc.set_activity(Some(&activity("Reading Scripture"))).unwrap();
        ipc.set_activity(None).unwrap();
        let log = log.lock().unwrap();
        assert_eq!(log[0]["details"], "Reading Scripture");
        assert_eq!(log[0]["assets"]["large_image"], "purify");
        assert!(log[0].get("timestamps").is_none());
        assert_eq!(log[1], Value::Null);
    }

    #[test]
    fn a_close_during_handshake_is_an_error() {
        let (client, mut server) = pair();
        thread::spawn(move || {
            let _ = read_frame(&mut server);
            write_frame(&mut server, OP_CLOSE, &json!({ "code": 4000, "message": "Invalid Client ID" })).unwrap();
        });
        assert!(Ipc::handshake(client, "123").is_err());
    }

    fn fast() -> Timing {
        Timing { min_interval: Duration::from_millis(300), retry: Duration::from_millis(200), tick: Duration::from_millis(10) }
    }

    fn wait_until(mut f: impl FnMut() -> bool) -> bool {
        let end = Instant::now() + Duration::from_secs(5);
        while Instant::now() < end {
            if f() {
                return true;
            }
            thread::sleep(Duration::from_millis(10));
        }
        false
    }

    #[test]
    fn the_thread_coalesces_a_burst_and_shows_the_last() {
        let log = Arc::new(Mutex::new(Vec::new()));
        let l = log.clone();
        let p = Presence::start_with(
            "123".into(),
            move |id| {
                let (client, server) = pair();
                fake_discord(server, l.clone());
                Ipc::handshake(client, id)
            },
            fast(),
        );
        for i in 0..20 {
            p.set(activity(&format!("Chapter {i}")));
        }
        assert!(wait_until(|| log.lock().unwrap().last().map(|a| a["details"] == "Chapter 19").unwrap_or(false)));
        assert!(log.lock().unwrap().len() <= 3, "a burst of twenty is a handful of updates at most");
        assert!(p.connected());
    }

    #[test]
    fn no_connection_is_made_until_there_is_something_to_show() {
        let attempts = Arc::new(Mutex::new(0));
        let a = attempts.clone();
        let p = Presence::start_with(
            "123".into(),
            move |_| {
                *a.lock().unwrap() += 1;
                Err(io::Error::new(io::ErrorKind::NotFound, "no Discord"))
            },
            fast(),
        );
        thread::sleep(Duration::from_millis(150));
        assert_eq!(*attempts.lock().unwrap(), 0);
        p.set(activity("Reading Scripture"));
        assert!(wait_until(|| *attempts.lock().unwrap() >= 2), "a missing Discord is looked for again");
        assert!(!p.connected());
    }

    #[test]
    fn clearing_lets_go_of_the_connection() {
        let log = Arc::new(Mutex::new(Vec::new()));
        let l = log.clone();
        let p = Presence::start_with(
            "123".into(),
            move |id| {
                let (client, server) = pair();
                fake_discord(server, l.clone());
                Ipc::handshake(client, id)
            },
            fast(),
        );
        p.set(activity("At prayer"));
        assert!(wait_until(|| p.connected()));
        p.clear();
        assert!(wait_until(|| !p.connected()));
        assert_eq!(log.lock().unwrap().last(), Some(&Value::Null), "Discord is told to clear before the socket closes");
    }

    #[test]
    fn an_unconfigured_build_does_nothing() {
        let p = Presence::start(None);
        p.set(activity("Reading Scripture"));
        assert!(!p.configured());
        assert!(!p.connected());
    }
}
