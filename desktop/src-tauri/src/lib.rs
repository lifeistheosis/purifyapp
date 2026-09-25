//! Purify for the desktop: a native window around purifyapp.net, plus the
//! things only a native app can do. Today that is Discord Rich Presence.
//!
//! The window loads the live site rather than a bundled copy, so the desktop
//! app is always the current Purify without a release of its own, and every
//! server feature (sign-in, sync, community, the shop) works exactly as on
//! the web. The native side stays small on purpose: three commands, callable
//! only from purifyapp.net (capabilities/main.json), each validating what it
//! is given. See docs/DESKTOP.md.

mod discord;
mod nav;
mod presence;

use serde::Serialize;
use tauri::webview::NewWindowResponse;
use tauri::{Manager, RunEvent, State, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

struct AppPresence(discord::Presence);

/// Show an activity on Discord. The page proposes; presence::sanitize
/// decides. A request with nothing acceptable in it is refused, not trimmed
/// into something the page did not ask for.
#[tauri::command]
fn presence_set(request: presence::PresenceRequest, state: State<'_, AppPresence>) -> Result<(), String> {
    let activity = presence::sanitize(&request).ok_or_else(|| "rejected".to_string())?;
    state.0.set(activity);
    Ok(())
}

#[tauri::command]
fn presence_clear(state: State<'_, AppPresence>) {
    state.0.clear();
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PresenceStatus {
    /// False in a build made without a Discord application id.
    configured: bool,
    /// True while the Discord app on this computer is connected.
    connected: bool,
}

#[tauri::command]
fn presence_status(state: State<'_, AppPresence>) -> PresenceStatus {
    PresenceStatus { configured: state.0.configured(), connected: state.0.connected() }
}

/// The Discord application id, baked in at build time. It is public (Discord
/// shows it in every client that sees the status), so it is configuration,
/// not a secret. Anything that is not a Discord snowflake is ignored.
fn discord_client_id() -> Option<String> {
    #[cfg(debug_assertions)]
    if let Ok(id) = std::env::var("PURIFY_DISCORD_CLIENT_ID") {
        return valid_snowflake(&id);
    }
    option_env!("PURIFY_DISCORD_CLIENT_ID").and_then(valid_snowflake)
}

fn valid_snowflake(id: &str) -> Option<String> {
    let id = id.trim();
    (id.len() >= 15 && id.len() <= 22 && id.bytes().all(|b| b.is_ascii_digit())).then(|| id.to_string())
}

/// A local Next.js server to load instead of the live site, for development
/// builds only. A release build always opens purifyapp.net.
fn dev_origin() -> Option<Url> {
    #[cfg(debug_assertions)]
    if let Ok(raw) = std::env::var("PURIFY_DESKTOP_URL") {
        return Url::parse(&raw).ok();
    }
    None
}

fn open_in_browser<R: tauri::Runtime>(app: &tauri::AppHandle<R>, url: &Url) {
    let _ = app.opener().open_url(url.as_str(), None::<&str>);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        // First, so a second launch hands over to the running window before
        // anything else starts.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(AppPresence(discord::Presence::start(discord_client_id())))
        .invoke_handler(tauri::generate_handler![presence_set, presence_clear, presence_status])
        .setup(|app| {
            let dev = dev_origin();
            // The dev server is a different origin from the one main.json
            // grants, so development builds grant it too. Never in release.
            #[cfg(debug_assertions)]
            if dev.is_some() {
                app.add_capability(include_str!("../capabilities/dev.json"))?;
            }

            let start = dev.clone().unwrap_or_else(|| presence::SITE.parse().expect("SITE is a valid URL"));
            let nav_handle = app.handle().clone();
            let nav_dev = dev.clone();
            let popup_handle = app.handle().clone();
            let popup_dev = dev.clone();

            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(start))
                .title("Purify")
                .inner_size(1280.0, 840.0)
                .min_inner_size(380.0, 560.0)
                .center()
                // Matches --color-night, so a cold start is never a white flash.
                .background_color(tauri::window::Color(0x10, 0x10, 0x13, 0xff))
                .on_navigation(move |url| match nav::decide(url, nav_dev.as_ref()) {
                    nav::Decision::InApp => true,
                    nav::Decision::External => {
                        open_in_browser(&nav_handle, url);
                        false
                    }
                    nav::Decision::Block => false,
                })
                // target="_blank" and window.open: never a second webview.
                // Purify's own links load in the main window; the rest go to
                // the browser.
                .on_new_window(move |url, _features| {
                    match nav::decide(&url, popup_dev.as_ref()) {
                        nav::Decision::InApp => {
                            if let Some(w) = popup_handle.get_webview_window("main") {
                                let _ = w.navigate(url);
                            }
                        }
                        nav::Decision::External => open_in_browser(&popup_handle, &url),
                        nav::Decision::Block => {}
                    }
                    NewWindowResponse::Deny
                })
                .build()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Purify");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            // Discord drops the status when the socket closes anyway; saying
            // so first makes it disappear at once instead of on a timeout.
            handle.state::<AppPresence>().0.shutdown();
        }
    });
}

#[cfg(test)]
mod tests {
    use super::valid_snowflake;

    #[test]
    fn only_a_discord_snowflake_is_taken_as_the_application_id() {
        assert_eq!(valid_snowflake(" 1234567890123456789 "), Some("1234567890123456789".into()));
        assert_eq!(valid_snowflake(""), None);
        assert_eq!(valid_snowflake("12345"), None);
        assert_eq!(valid_snowflake("123456789012345678x"), None);
    }
}
