//! Signing in with Google or Apple through the reader's own browser.
//!
//! Google refuses sign-in inside embedded app windows ("This browser or app
//! may not be secure"), and its guidance, like RFC 8252's, is to use the
//! system browser. So in the desktop app the flow runs there:
//!
//!   1. The page asks Supabase for the provider URL, with redirect_to
//!      `purify://auth-callback?next=...`, and hands it to `auth_open`. The
//!      one-time PKCE verifier stays in this window's cookies, where the
//!      page's Supabase client put it.
//!   2. The reader signs in in their browser. Supabase redirects to the
//!      `purify://` link, which the OS hands to this app.
//!   3. The app turns that link into `https://purifyapp.net/api/auth/callback
//!      ?code=...` and loads it in the window, where the verifier is. The
//!      site's own callback exchanges the code; nothing here touches a token.
//!
//! Both ends are untrusted input. `auth_open` opens only a Supabase authorize
//! URL that will come back to this app; a `purify://` link becomes a callback
//! only with a well-formed code or error, and only for a safe `next` path.

use tauri::Url;

pub const CALLBACK_HOST: &str = "auth-callback";
const PROVIDERS: &[&str] = &["google", "apple"];
const NEXT_MAX: usize = 512;
const ERROR_MAX: usize = 200;

fn one_param<'a>(url: &'a Url, name: &str) -> Option<std::borrow::Cow<'a, str>> {
    let mut values = url.query_pairs().filter(|(k, _)| k == name).map(|(_, v)| v);
    let first = values.next()?;
    // A parameter given twice is ambiguous, and ambiguity is refused.
    values.next().is_none().then_some(first)
}

/// Is this the Supabase authorize URL for a provider, returning to this app?
pub fn is_auth_start_url(url: &Url) -> bool {
    if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() || url.port().is_some() {
        return false;
    }
    let host = url.host_str().unwrap_or_default().to_ascii_lowercase();
    let project = host.strip_suffix(".supabase.co").unwrap_or_default();
    if project.is_empty() || project.contains('.') {
        return false;
    }
    if url.path() != "/auth/v1/authorize" {
        return false;
    }
    let provider_ok = one_param(url, "provider").is_some_and(|p| PROVIDERS.contains(&p.as_ref()));
    let returns_here = one_param(url, "redirect_to")
        .and_then(|r| Url::parse(&r).ok())
        .is_some_and(|r| r.scheme() == "purify" && r.host_str() == Some(CALLBACK_HOST));
    provider_ok && returns_here
}

fn safe_next(raw: &str) -> Option<String> {
    let ok = raw.len() <= NEXT_MAX
        && raw.starts_with('/')
        && !raw.starts_with("//")
        && !raw.contains('\\')
        && !raw.contains("://")
        && !raw.chars().any(|c| c.is_control());
    ok.then(|| raw.to_string())
}

fn safe_code(raw: &str) -> Option<String> {
    let ok = (8..=512).contains(&raw.len())
        && raw.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.' | '~'));
    ok.then(|| raw.to_string())
}

fn clean_error(raw: &str) -> String {
    raw.chars().filter(|c| !c.is_control()).take(ERROR_MAX).collect()
}

/// The page to load for a `purify://auth-callback` link, or None for any
/// other link or a malformed one.
pub fn callback_target(link: &Url, base: &Url) -> Option<Url> {
    if link.scheme() != "purify" || link.host_str() != Some(CALLBACK_HOST) {
        return None;
    }
    let allowed = ["code", "next", "error", "error_code", "error_description"];
    if link.query_pairs().any(|(k, _)| !allowed.contains(&k.as_ref())) {
        return None;
    }
    let code = one_param(link, "code").map(|c| safe_code(&c));
    let error = one_param(link, "error").map(|e| clean_error(&e));
    let next = match one_param(link, "next") {
        Some(n) => Some(safe_next(&n)?),
        None => None,
    };

    let mut target = base.join("/api/auth/callback").ok()?;
    {
        let mut q = target.query_pairs_mut();
        match (code, error) {
            (Some(Some(code)), None) => {
                q.append_pair("code", &code);
            }
            (None, Some(error)) if !error.is_empty() => {
                q.append_pair("error", &error);
                if let Some(d) = one_param(link, "error_description") {
                    q.append_pair("error_description", &clean_error(&d));
                }
            }
            _ => return None,
        }
        if let Some(next) = &next {
            q.append_pair("next", next);
        }
    }
    Some(target)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn u(s: &str) -> Url {
        Url::parse(s).unwrap()
    }

    const START: &str = "https://abcdefghijk.supabase.co/auth/v1/authorize?provider=google&redirect_to=purify%3A%2F%2Fauth-callback%3Fnext%3D%252Faccount&code_challenge=x&code_challenge_method=s256";

    #[test]
    fn opens_only_a_supabase_authorize_url_that_returns_here() {
        assert!(is_auth_start_url(&u(START)));
        assert!(is_auth_start_url(&u(&START.replace("google", "apple"))));
        for bad in [
            START.replace("https://", "http://"),
            START.replace("abcdefghijk.supabase.co", "evil.example"),
            START.replace("abcdefghijk.supabase.co", "abcdefghijk.supabase.co.evil.example"),
            START.replace("abcdefghijk.supabase.co", "a.b.supabase.co"),
            START.replace("abcdefghijk.supabase.co", "user@abcdefghijk.supabase.co"),
            START.replace("abcdefghijk.supabase.co", "abcdefghijk.supabase.co:8443"),
            START.replace("/auth/v1/authorize", "/auth/v1/logout"),
            START.replace("provider=google", "provider=github"),
            START.replace("purify%3A%2F%2Fauth-callback", "https%3A%2F%2Fevil.example"),
            START.replace("purify%3A%2F%2Fauth-callback", "purify%3A%2F%2Fsomething-else"),
            format!("{START}&provider=apple"),
        ] {
            assert!(!is_auth_start_url(&u(&bad)), "must refuse {bad}");
        }
    }

    fn base() -> Url {
        u("https://purifyapp.net")
    }

    #[test]
    fn a_code_becomes_the_sites_own_callback() {
        let t = callback_target(&u("purify://auth-callback?code=AbC123-_.~xyz&next=%2Faccount%2Fprofile"), &base()).unwrap();
        assert_eq!(t.origin(), base().origin());
        assert_eq!(t.path(), "/api/auth/callback");
        let pairs: Vec<(String, String)> = t.query_pairs().map(|(k, v)| (k.into(), v.into())).collect();
        assert_eq!(pairs, vec![("code".into(), "AbC123-_.~xyz".into()), ("next".into(), "/account/profile".into())]);
    }

    #[test]
    fn a_provider_error_is_passed_on_cleaned() {
        let t = callback_target(
            &u("purify://auth-callback?error=access_denied&error_description=User%20cancelled%0Athe%20flow"),
            &base(),
        )
        .unwrap();
        assert_eq!(t.path(), "/api/auth/callback");
        let pairs: Vec<(String, String)> = t.query_pairs().map(|(k, v)| (k.into(), v.into())).collect();
        assert!(pairs.contains(&("error".into(), "access_denied".into())));
        assert!(pairs.contains(&("error_description".into(), "User cancelledthe flow".into())));
    }

    #[test]
    fn anything_else_is_refused() {
        for bad in [
            "https://auth-callback?code=abcdefgh1",
            "purify://elsewhere?code=abcdefgh1",
            "purify://auth-callback",
            "purify://auth-callback?code=short",
            "purify://auth-callback?code=abc%20defghij",
            "purify://auth-callback?code=abcdefgh1&code=abcdefgh2",
            "purify://auth-callback?code=abcdefgh1&error=x",
            "purify://auth-callback?code=abcdefgh1&redirect=https://evil.example",
            "purify://auth-callback?code=abcdefgh1&next=%2F%2Fevil.example",
            "purify://auth-callback?code=abcdefgh1&next=https%3A%2F%2Fevil.example",
            "purify://auth-callback?code=abcdefgh1&next=%2F%5Cevil.example",
            "purify://auth-callback?code=abcdefgh1&next=account",
        ] {
            assert!(callback_target(&u(bad), &base()).is_none(), "must refuse {bad}");
        }
    }

    #[test]
    fn the_callback_lands_on_the_dev_server_when_that_is_the_base() {
        let t = callback_target(&u("purify://auth-callback?code=abcdefgh1"), &u("http://localhost:3000")).unwrap();
        assert_eq!(t.as_str(), "http://localhost:3000/api/auth/callback?code=abcdefgh1");
    }
}
