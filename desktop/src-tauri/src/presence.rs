//! What the page may ask Discord to show, and nothing more.
//!
//! The window loads https://purifyapp.net, so everything arriving here comes
//! from a remote page and is treated as untrusted input. The page proposes
//! lines of text, a path and a description of the picture; this module
//! decides what actually reaches Discord: control characters stripped,
//! lengths held to Discord's limits, a button allowed to point only at a
//! public page of purifyapp.net, and every picture either our own uploaded
//! asset or an image URL this module builds itself on purifyapp.net from
//! checked parts (a saint's slug, a whole percent, a season's name). The page
//! never supplies a URL for Discord to fetch.
//!
//! The four modes of 26 September 2026 (lib/desktop/presenceModes.ts) are
//! what the parts are for: a saint's portrait, the reading bar drawn on it,
//! and the church season's frame and badge for Plus custom.
//!
//! No timestamps are ever sent. Discord turns a start time into a running
//! "elapsed" clock, and Purify keeps no timers on prayer or reading (C3). The
//! reading bar is drawn into the picture for exactly that reason.

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
const HOME_LABEL: &str = "Visit Purify";

/// Where the pictures are drawn (app/api/discord/art/route.ts). Discord's
/// media proxy fetches them, so they are always on the public site.
pub const ART_PATH: &str = "/api/discord/art";
const SLUG_MAX: usize = 80;
const SEASONS: &[&str] = &["gold", "purple", "crimson", "green", "blue", "white"];

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
/// page that believes it can set an image URL or a timestamp learns
/// otherwise.
#[derive(Debug, Clone, Default, Deserialize)]
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
    /// With a first button, a second one to the front page, so a friend
    /// who does not have Purify can find it.
    #[serde(default)]
    pub home_label: Option<String>,
    /// Shown when the large picture is hovered.
    #[serde(default)]
    pub large_text: Option<String>,
    /// Shown when the season badge is hovered.
    #[serde(default)]
    pub small_text: Option<String>,
    /// The large picture, described. Built into a URL here, never taken as one.
    #[serde(default)]
    pub art: Option<ArtRequest>,
    /// The season badge: a season's name.
    #[serde(default)]
    pub badge: Option<String>,
}

/// The parts of the large picture. Each is checked; a part that fails is
/// dropped, and a picture with no part left is our own asset.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ArtRequest {
    /// A saint's slug, for their portrait.
    #[serde(default)]
    pub saint: Option<String>,
    /// The reading bar, a whole percent.
    #[serde(default)]
    pub progress: Option<u32>,
    /// The season's frame.
    #[serde(default)]
    pub season: Option<String>,
    /// A gold rule inside the frame.
    #[serde(default)]
    pub gilded: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Assets {
    pub large_image: String,
    pub large_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub small_image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub small_text: Option<String>,
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

/// A registry slug: lowercase letters, digits and hyphens only.
fn clean_slug(raw: &str) -> Option<&str> {
    let s = raw.trim();
    let ok = !s.is_empty()
        && s.len() <= SLUG_MAX
        && s.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
    ok.then_some(s)
}

fn clean_season(raw: &str) -> Option<&'static str> {
    SEASONS.iter().copied().find(|s| *s == raw.trim())
}

/// The large picture's URL, or None when no part of it survives the checks.
/// The query's names and order match lib/desktop/presenceModes.ts artQuery,
/// so the Settings preview loads the very picture Discord will.
pub fn art_url(art: &ArtRequest) -> Option<String> {
    let mut query: Vec<String> = Vec::new();
    if let Some(saint) = art.saint.as_deref().and_then(clean_slug) {
        query.push(format!("saint={saint}"));
    }
    if let Some(p) = art.progress.filter(|p| *p <= 100) {
        query.push(format!("p={p}"));
    }
    let season = art.season.as_deref().and_then(clean_season);
    if let Some(season) = season {
        query.push(format!("season={season}"));
        if art.gilded == Some(true) {
            query.push("gilded=1".to_string());
        }
    }
    (!query.is_empty()).then(|| format!("{SITE}{ART_PATH}?{}", query.join("&")))
}

pub fn badge_url(raw: &str) -> Option<String> {
    clean_season(raw).map(|season| format!("{SITE}{ART_PATH}?badge={season}"))
}

/// Turn a page's request into the activity Discord will show, or None when
/// the request has nothing acceptable in it.
pub fn sanitize(req: &PresenceRequest) -> Option<Activity> {
    let details = clean_text(&req.details, TEXT_MAX)?;
    let state = req.state.as_deref().and_then(|s| clean_text(s, TEXT_MAX));
    let mut buttons = req
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
    // The second button, to the front page, only beside a first that goes
    // somewhere else: two buttons to the same page would be one too many.
    let home = format!("{SITE}/");
    if let (Some(first), Some(label)) = (buttons.first(), req.home_label.as_deref()) {
        if first.url != home {
            let label = clean_text(label, LABEL_MAX).unwrap_or_else(|| HOME_LABEL.to_string());
            buttons.push(Button { label, url: home });
        }
    }

    let large_image = req.art.as_ref().and_then(art_url).unwrap_or_else(|| LARGE_IMAGE.to_string());
    let has_art = large_image != LARGE_IMAGE;
    let large_text = req
        .large_text
        .as_deref()
        .and_then(|s| clean_text(s, TEXT_MAX))
        .unwrap_or_else(|| LARGE_TEXT.to_string());
    // The small picture: the season's disc under Plus custom, else our own
    // mark beside a portrait, so the status still says Purify at a glance.
    let (small_image, small_text) = match req.badge.as_deref().and_then(badge_url) {
        Some(url) => (Some(url), req.small_text.as_deref().and_then(|s| clean_text(s, TEXT_MAX))),
        None if has_art => (Some(LARGE_IMAGE.to_string()), Some(LARGE_TEXT.to_string())),
        None => (None, None),
    };

    Some(Activity {
        details,
        state,
        assets: Assets { large_image, large_text, small_image, small_text },
        buttons,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(details: &str) -> PresenceRequest {
        PresenceRequest { details: details.into(), ..Default::default() }
    }

    #[test]
    fn a_plain_request_passes_through() {
        let a = sanitize(&PresenceRequest {
            details: "Reading Scripture".into(),
            state: Some("John 3".into()),
            path: Some("/bible/john/3".into()),
            button_label: Some("Open in Purify".into()),
            ..Default::default()
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
        assert!(v["assets"].get("small_image").is_none(), "no small picture without a portrait or a season");
    }

    fn art(saint: Option<&str>, progress: Option<u32>, season: Option<&str>, gilded: Option<bool>) -> ArtRequest {
        ArtRequest {
            saint: saint.map(Into::into),
            progress,
            season: season.map(Into::into),
            gilded,
        }
    }

    #[test]
    fn the_picture_url_is_built_here_from_checked_parts() {
        // The same strings lib/desktop/__tests__/presenceModes.test.ts expects
        // from artQuery, so the preview and Discord load the same picture.
        assert_eq!(
            art_url(&art(Some("apostle-john"), Some(12), None, None)).as_deref(),
            Some("https://purifyapp.net/api/discord/art?saint=apostle-john&p=12")
        );
        assert_eq!(
            art_url(&art(Some("basil-the-great"), Some(62), Some("purple"), Some(true))).as_deref(),
            Some("https://purifyapp.net/api/discord/art?saint=basil-the-great&p=62&season=purple&gilded=1")
        );
        assert_eq!(
            art_url(&art(None, Some(0), None, None)).as_deref(),
            Some("https://purifyapp.net/api/discord/art?p=0")
        );
        // Gilded means nothing without a season's frame.
        assert_eq!(
            art_url(&art(Some("apostle-paul"), None, None, Some(true))).as_deref(),
            Some("https://purifyapp.net/api/discord/art?saint=apostle-paul")
        );
    }

    #[test]
    fn a_part_that_fails_its_check_is_dropped() {
        for bad in ["Apostle-John", "../etc", "john chrysostom", "john%2Fchrysostom", "", "a/b", "saint?x=1"] {
            assert_eq!(art_url(&art(Some(bad), None, None, None)), None, "{bad} is not a slug");
        }
        assert_eq!(art_url(&art(None, Some(101), None, None)), None);
        assert_eq!(art_url(&art(None, None, Some("mauve"), Some(true))), None);
        let long = "a".repeat(81);
        assert_eq!(art_url(&art(Some(long.as_str()), None, None, None)), None);
        let a = sanitize(&PresenceRequest { art: Some(art(Some("../x"), None, None, None)), ..req("Reading") }).unwrap();
        assert_eq!(a.assets.large_image, LARGE_IMAGE, "nothing left of the picture: our own asset");
    }

    #[test]
    fn a_portrait_carries_our_mark_and_a_season_its_badge() {
        let a = sanitize(&PresenceRequest {
            art: Some(art(Some("nicholas-the-wonderworker"), None, None, None)),
            large_text: Some("My patron saint".into()),
            ..req("St. Nicholas the Wonderworker")
        })
        .unwrap();
        assert_eq!(a.assets.large_image, "https://purifyapp.net/api/discord/art?saint=nicholas-the-wonderworker");
        assert_eq!(a.assets.large_text, "My patron saint");
        assert_eq!(a.assets.small_image.as_deref(), Some(LARGE_IMAGE));

        let a = sanitize(&PresenceRequest {
            art: Some(art(Some("nicholas-the-wonderworker"), None, Some("gold"), Some(true))),
            badge: Some("gold".into()),
            small_text: Some("Paschal season".into()),
            ..req("St. Nicholas the Wonderworker")
        })
        .unwrap();
        assert_eq!(a.assets.small_image.as_deref(), Some("https://purifyapp.net/api/discord/art?badge=gold"));
        assert_eq!(a.assets.small_text.as_deref(), Some("Paschal season"));

        let a = sanitize(&PresenceRequest { badge: Some("https://evil.example/x.png".into()), ..req("Reading") }).unwrap();
        assert_eq!(a.assets.small_image, None, "a badge is a season's name, never a URL");
    }

    #[test]
    fn a_second_button_goes_to_the_front_page_only_beside_a_first() {
        let a = sanitize(&PresenceRequest {
            path: Some("/saints/basil-the-great/on-the-holy-spirit".into()),
            button_label: Some("Read along".into()),
            home_label: Some("Visit Purify".into()),
            ..req("Reading On the Holy Spirit")
        })
        .unwrap();
        assert_eq!(a.buttons.len(), 2);
        assert_eq!(a.buttons[1], Button { label: "Visit Purify".into(), url: "https://purifyapp.net/".into() });

        let a = sanitize(&PresenceRequest { home_label: Some("Visit Purify".into()), ..req("In Purify") }).unwrap();
        assert!(a.buttons.is_empty(), "no first button, no second");

        let a = sanitize(&PresenceRequest {
            path: Some("/".into()),
            home_label: Some("Visit Purify".into()),
            ..req("In Purify")
        })
        .unwrap();
        assert_eq!(a.buttons.len(), 1, "never two buttons to the same page");
    }

    #[test]
    fn a_page_cannot_hand_over_an_image_url() {
        let json = r#"{"details":"Reading","art":{"url":"https://evil.example/x.png"}}"#;
        assert!(serde_json::from_str::<PresenceRequest>(json).is_err());
        let json = r#"{"details":"Reading","art":{"saint":"apostle-john","progress":12}}"#;
        assert!(serde_json::from_str::<PresenceRequest>(json).is_ok());
    }
}
