; NSIS hooks for the Windows installer (tauri.conf.json,
; bundle.windows.nsis.installerHooks).
;
; WebView2Loader.dll. The Windows app is built on the GNU toolchain
; (docs/DESKTOP.md), and there webview2-com links Microsoft's WebView2 loader
; dynamically: purify-desktop.exe does not start unless WebView2Loader.dll
; sits beside it. The build leaves one next to the exe in target/<profile>,
; but Tauri's installer template copies only the main binary, resources and
; sidecars. So 1.4.0 installed without it, and on any PC without a stray copy
; on the search path it died at launch with "The code execution cannot
; proceed because WebView2Loader.dll was not found" (a reader's report,
; 2026-09-28). The build PC never showed it: another program had left an
; older WebView2Loader.dll in C:\Windows.
;
; The path is worked out at compile time from the main binary's, so a debug
; and a release build each take their own copy. An MSVC build links the
; loader statically and has no DLL to copy, hence the /FileExists guard: the
; same config still builds in CI (.github/workflows/desktop.yml).

!macro NSIS_HOOK_POSTINSTALL
  !searchreplace PURIFY_WV2_LOADER "${MAINBINARYSRCPATH}" "${MAINBINARYNAME}.exe" "WebView2Loader.dll"
  !if /FileExists "${PURIFY_WV2_LOADER}"
    SetOutPath $INSTDIR
    File "${PURIFY_WV2_LOADER}"
  !endif
  !undef PURIFY_WV2_LOADER
!macroend

; The template's uninstaller removes only what it installed, so the loader
; goes here, and the folder with it once it is empty.
!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$INSTDIR\WebView2Loader.dll"
  RMDir "$INSTDIR"
!macroend
