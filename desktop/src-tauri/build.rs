fn main() {
    // Declaring the app's own commands in a manifest makes Tauri generate a
    // permission for each one (allow-presence-set and so on), so a command is
    // callable only where a capability grants it. Without the manifest every
    // command would be open to every page the window can load.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["presence_set", "presence_clear", "presence_status"]),
    ))
    .expect("failed to run tauri-build");
}
