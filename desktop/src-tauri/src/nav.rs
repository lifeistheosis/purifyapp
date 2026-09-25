//! Where the window may go.
//!
//! The app window is Purify and nothing else. Purify's own pages load in it,
//! and so do the two flows that must come back to Purify in the same window:
//! signing in (Supabase, and Google behind it) and paying (Stripe Checkout,
//! whose success page returns to purifyapp.net). Every other web address
//! opens in the reader's own browser, where they can see the address bar.
//! Anything that is not a web address at all (file:, javascript:, data:) is
//! refused outright.

use tauri::Url;

#[derive(Debug, PartialEq, Eq)]
pub enum Decision {
    InApp,
    External,
    Block,
}

const APP_HOSTS: &[&str] = &["purifyapp.net", "www.purifyapp.net"];

/// Hosts a sign-in or a payment passes through on its way back to Purify.
const FLOW_HOSTS: &[&str] = &["accounts.google.com", "checkout.stripe.com"];
const FLOW_SUFFIXES: &[&str] = &[".supabase.co"];

pub fn decide(url: &Url, dev_origin: Option<&Url>) -> Decision {
    if let Some(dev) = dev_origin {
        if url.origin() == dev.origin() {
            return Decision::InApp;
        }
    }
    match url.scheme() {
        "https" => {
            let host = url.host_str().unwrap_or_default().to_ascii_lowercase();
            if APP_HOSTS.contains(&host.as_str())
                || FLOW_HOSTS.contains(&host.as_str())
                || FLOW_SUFFIXES.iter().any(|s| host.ends_with(s) && host.len() > s.len())
            {
                Decision::InApp
            } else {
                Decision::External
            }
        }
        "http" | "mailto" => Decision::External,
        _ => Decision::Block,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn d(s: &str) -> Decision {
        decide(&Url::parse(s).unwrap(), None)
    }

    #[test]
    fn purify_and_its_sign_in_and_payment_flows_stay_in_the_window() {
        assert_eq!(d("https://purifyapp.net/bible/john/3"), Decision::InApp);
        assert_eq!(d("https://www.purifyapp.net/"), Decision::InApp);
        assert_eq!(d("https://avbqyvjgcrucjwevwixt.supabase.co/auth/v1/authorize"), Decision::InApp);
        assert_eq!(d("https://accounts.google.com/o/oauth2/v2/auth"), Decision::InApp);
        assert_eq!(d("https://checkout.stripe.com/c/pay/cs_test"), Decision::InApp);
    }

    #[test]
    fn everything_else_on_the_web_opens_in_the_browser() {
        assert_eq!(d("https://discord.gg/purify"), Decision::External);
        assert_eq!(d("https://en.wikipedia.org/wiki/Theosis"), Decision::External);
        assert_eq!(d("http://purifyapp.net/"), Decision::External, "plain http is never trusted in the window");
        assert_eq!(d("mailto:support@purifyapp.net"), Decision::External);
    }

    #[test]
    fn lookalike_hosts_are_not_purify() {
        assert_eq!(d("https://purifyapp.net.evil.example/"), Decision::External);
        assert_eq!(d("https://evilpurifyapp.net/"), Decision::External);
        assert_eq!(d("https://supabase.co/"), Decision::External);
        assert_eq!(d("https://evil-supabase.co/"), Decision::External);
        assert_eq!(d("https://accounts.google.com.evil.example/"), Decision::External);
    }

    #[test]
    fn non_web_schemes_are_refused() {
        assert_eq!(d("file:///etc/passwd"), Decision::Block);
        assert_eq!(d("javascript:alert(1)"), Decision::Block);
        assert_eq!(d("data:text/html,<p>x</p>"), Decision::Block);
    }

    #[test]
    fn the_dev_server_is_allowed_only_when_one_is_given() {
        let dev = Url::parse("http://localhost:3000").unwrap();
        assert_eq!(decide(&Url::parse("http://localhost:3000/bible").unwrap(), Some(&dev)), Decision::InApp);
        assert_eq!(decide(&Url::parse("http://localhost:3000/bible").unwrap(), None), Decision::External);
        assert_eq!(decide(&Url::parse("http://localhost:4000/").unwrap(), Some(&dev)), Decision::External);
    }
}
