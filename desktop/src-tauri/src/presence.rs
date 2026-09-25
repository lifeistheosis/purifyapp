//! What the page may ask Discord to show, and nothing more.
//!
//! The window loads https://purifyapp.net, so everything arriving here comes
//! from a remote page and is treated as untrusted input. The page proposes a
//! line of text and a path; this module decides what actually reaches
//! Discord: control characters stripped, lengths held to Discord's limits,
//! the picture fixed to our own uploaded asset, and the one button allowed to
//! point only at a public page of purifyapp.net.
//!
//! No timestamps are ever sent. Discord turns a start time into a running
//! "elapsed" clock, and Purify keeps no timers on prayer or reading (C3).

use serde::{Deserialize, Serialize};

pub const SITE: &str = "https://purifyapp.net";

/// Art asset key. The owner uploads an image under exactly this name in the
/// Discord application's Rich Presence art assets (docs/DESKTOP.md).
pub const LARGE_IMAGE: &str = "purify";
pub const LARGE_TEXT: &str = "Purify";

/// Discord's limits: 2 to 128 for details and state, 32 for a button label,
/// 512 for a button URL. Bytes, to be safe with Greek and Cyrillic titles.
const TEXT_MAX: usize = 128;
const TEXT_MIN_CHARS: usize = 2;
const LABEL_MAX: usize = 32;
const PATH_MAX: usize = 200;
const DEFAULT_LABEL: &str = "Open in Purify";

/// The only parts of the site a button may open. Library pages anyone can
/// read. Never the account, the community, the shop or anything admin: a
/// friend's click should land on the passage, not on someone's private room.
const PUBLIC_PREFIXES: &[&str] = &[
    "/bible",
    "/saints",
    "/prayers",
    "/calendar",
    "/councils",
    "/theology",
    "/apologetics",
    "/heresies",
    "/topics",
    "/history",
    "/reading",
    "/discover",
    "/florilegium",
    "/catechism",
    "/fasting",
];

/// What the page sends. Unknown fields are refused rather than ignored, so a
/// page that believes it can set an image or a timestamp learns otherwise.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PresenceRequest {
    pub details: String,
    #[serde(default)]
    pub state: Option<String>,
    /// A site path such as "/bible/john/3" for the button, or none.
    #[serde(default)]
    pub path: Option<String>,
    #[serde(default)]
    pub button_label: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Assets {
    pub large_image: &'static str,
    pub large_text: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Button {
    pub label: String,
    pub url: String,
}

/// The activity exactly as Discord's SET_ACTIVITY receives it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Activity {
    pub details: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    pub assets: Assets,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub buttons: Vec<Button>,
}

/// Collapse whitespace, drop control characters, and cut to `max` bytes on a
/// character boundary. None when fewer than two characters survive.
fn clean_text(raw: &str, max: usize) -> Option<String> {
    let mut out = String::with_capacity(raw.len().min(max));
    let mut pending_space = false;
    for c in raw.chars() {
        if c.is_whitespace() {
            pending_space = !out.is_empty();
            continue;
        }
        if c.is_control() || is_invisible(c) {
            continue;
        }
        let extra = if pending_space { 1 } else { 0 };
        if out.len() + extra + c.len_utf8() > max {
            break;
        }
        if pending_space {
            out.push(' ');
        }
        pending_space = false;
        out.push(c);
    }
    (out.chars().count() >= TEXT_MIN_CHARS).then_some(out)
}

/// Bidi overrides and zero-width characters: harmless to Discord, but they
/// let a string display as something other than what it contains.
fn is_invisible(c: char) -> bool {
    matches!(c, '\u{200B}'..='\u{200F}' | '\u{202A}'..='\u{202E}' | '\u{2060}'..='\u{2069}' | '\u{FEFF}')
}

/// A path is accepted only if it is plainly a public page of the site.
fn clean_path(raw: &str) -> Option<String> {
    let path = raw.trim();
    if path.len() > PATH_MAX || !path.starts_with('/') || path.starts_with("//") {
        return None;
    }
    let allowed = |c: char| c.is_ascii_alphanumeric() || matches!(c, '/' | '-' | '_' | '.');
    if !path.chars().all(allowed) || path.split('/').any(|seg| seg == ".." || seg == ".") {
        return None;
    }
    // The front page, exactly, or a page under one of the public sections.
    let public = path == "/"
        || PUBLIC_PREFIXES
            .iter()
            .any(|p| path == *p || path.strip_prefix(p).is_some_and(|rest| rest.starts_with('/')));
    public.then(|| path.to_string())
}

/// Turn a page's request into the activity Discord will show, or None when
/// the request has nothing acceptable in it.
pub fn sanitize(req: &PresenceRequest) -> Option<Activity> {
    let details = clean_text(&req.details, TEXT_MAX)?;
    let state = req.state.as_deref().and_then(|s| clean_text(s, TEXT_MAX));
    let buttons = req
        .path
        .as_deref()
        .and_then(clean_path)
        .map(|path| {
            let label = req
                .button_label
                .as_deref()
                .and_then(|l| clean_text(l, LABEL_MAX))
                .unwrap_or_else(|| DEFAULT_LABEL.to_string());
            vec![Button { label, url: format!("{SITE}{path}") }]
        })
        .unwrap_or_default();
    Some(Activity {
        details,
        state,
        assets: Assets { large_image: LARGE_IMAGE, large_text: LARGE_TEXT },
        buttons,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(details: &str) -> PresenceRequest {
        PresenceRequest { details: details.into(), state: None, path: None, button_label: None }
    }

    #[test]
    fn a_plain_request_passes_through() {
        let a = sanitize(&PresenceRequest {
            details: "Reading Scripture".into(),
            state: Some("John 3".into()),
            path: Some("/bible/john/3".into()),
            button_label: Some("Open in Purify".into()),
        })
        .unwrap();
        assert_eq!(a.details, "Reading Scripture");
        assert_eq!(a.state.as_deref(), Some("John 3"));
        assert_eq!(a.buttons, vec![Button { label: "Open in Purify".into(), url: "https://purifyapp.net/bible/john/3".into() }]);
        assert_eq!(a.assets.large_image, LARGE_IMAGE);
    }

    #[test]
    fn text_is_cleaned_and_held_to_discord_limits() {
        let a = sanitize(&req("  Reading\n\tthe\u{202E}  saints\u{0007} ")).unwrap();
        assert_eq!(a.details, "Reading the saints");
        let long = "Ω".repeat(200);
        let a = sanitize(&req(&long)).unwrap();
        assert!(a.details.len() <= TEXT_MAX);
        assert!(a.details.chars().all(|c| c == 'Ω'));
        assert!(sanitize(&req(" x ")).is_none(), "one character is below Discord's minimum");
        assert!(sanitize(&req("\u{200B}\u{200B}")).is_none());
    }

    #[test]
    fn a_short_state_is_dropped_not_fatal() {
        let a = sanitize(&PresenceRequest { state: Some("x".into()), ..req("At prayer") }).unwrap();
        assert_eq!(a.state, None);
    }

    #[test]
    fn the_button_opens_only_public_pages_of_the_site() {
        for bad in [
            "/account",
            "/account/profile",
            "/community/groups/1",
            "/shop/cart",
            "/admin",
            "/bibleX",
            "//evil.example/bible",
            "/bible/../account",
            "/bible/john?next=https://evil.example",
            "https://evil.example/bible",
            "/bible/john#x",
            "bible/john",
        ] {
            let a = sanitize(&PresenceRequest { path: Some(bad.into()), ..req("Reading Scripture") }).unwrap();
            assert!(a.buttons.is_empty(), "{bad} must not become a button");
        }
        for good in ["/", "/bible", "/bible/john/3", "/saints/john-chrysostom", "/prayers"] {
            let a = sanitize(&PresenceRequest { path: Some(good.into()), ..req("Reading Scripture") }).unwrap();
            assert_eq!(a.buttons.len(), 1, "{good} should be allowed");
            assert!(a.buttons[0].url.starts_with("https://purifyapp.net/"));
        }
    }

    #[test]
    fn button_labels_are_capped_and_defaulted() {
        let a = sanitize(&PresenceRequest {
            path: Some("/bible".into()),
            button_label: Some("A".repeat(80)),
            ..req("Reading Scripture")
        })
        .unwrap();
        assert!(a.buttons[0].label.len() <= LABEL_MAX);
        let a = sanitize(&PresenceRequest { path: Some("/bible".into()), button_label: Some(" ".into()), ..req("Reading Scripture") })
            .unwrap();
        assert_eq!(a.buttons[0].label, DEFAULT_LABEL);
    }

    #[test]
    fn unknown_fields_are_refused() {
        let json = r#"{"details":"Reading","timestamps":{"start":1}}"#;
        assert!(serde_json::from_str::<PresenceRequest>(json).is_err());
        let json = r#"{"details":"Reading","largeImage":"https://evil.example/x.png"}"#;
        assert!(serde_json::from_str::<PresenceRequest>(json).is_err());
    }

    #[test]
    fn the_serialised_activity_has_no_timestamps() {
        let a = sanitize(&req("Reading Scripture")).unwrap();
        let v = serde_json::to_value(&a).unwrap();
        assert!(v.get("timestamps").is_none());
        assert!(v.get("buttons").is_none(), "an empty button list is omitted, not sent as []");
    }
}
