"use client";

// A crash in one tab must stay in that tab.
//
// The admin has no error boundary of its own, so anything a tab throws during
// render travels to the ROOT boundary and replaces the whole application with
// "Something went wrong". Every other tab, the rail, the theme toggle and the
// operator's session all disappear because one panel read a field off a 403
// body. lib/admin/fetchJson.ts stops the known cause; this stops the blast
// radius of the next one.
//
// Deliberately a class. React has no hook form of componentDidCatch, and the
// alternative, a route-level app/admin/error.tsx, would not help: it sits
// above the shell, so it would still take the rail and every other tab down
// with the panel. The boundary has to be INSIDE the shell, wrapped around the
// active tab only, which is where it is used in AdminShell.tsx.
//
// Reset is keyed on the tab id from the parent, so switching sections clears a
// failed panel without a reload. Retry re-mounts the same one, which is the
// right affordance when the cause was a fetch that has since recovered.

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; label: string; onRetry?: () => void };
type State = { error: Error | null };

export class TabBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept to the console rather than sent anywhere: this panel is one
    // operator on a desktop, and the stack is the thing that actually helps.
    console.error(`[admin] ${this.props.label} crashed`, error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    // A new section is a new panel. Do not carry the old failure into it.
    if (prev.label !== this.props.label && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <section
        className="rounded-[var(--adm-radius)] border p-5 md:p-6"
        style={{
          background: "var(--adm-panel)",
          borderColor: "color-mix(in oklab, var(--adm-critical), transparent 60%)",
          boxShadow: "var(--adm-shadow-card)",
        }}
      >
        <h3
          className="font-sans text-[14px] font-semibold leading-tight"
          style={{ color: "var(--adm-critical)" }}
        >
          {this.props.label} could not be shown
        </h3>
        <p
          className="mt-2 max-w-[62ch] font-sans text-[12.5px] leading-snug"
          style={{ color: "var(--adm-ink-2)" }}
        >
          The rest of the panel is unaffected, so you can carry on in another
          section. If this section keeps failing, the usual cause is a signed
          out session or a table that has not been migrated yet.
        </p>
        <p
          className="mt-3 font-mono text-[11.5px] leading-snug"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {error.message || String(error)}
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            this.props.onRetry?.();
          }}
          // h-11 is 44px, the floor lib/ui/__tests__/touchTargets.test.ts
          // ratchets on. The rail footer's controls are the same height.
          className="adm-control mt-4 h-11 rounded-[var(--adm-radius-sm)] border px-4 font-sans text-[12.5px] font-medium"
          style={{
            // Resolved by .adm-control in admin-theme.css, because an inline
            // background would beat any hover utility.
            ["--_bg" as string]: "var(--adm-control)",
            ["--_bg-hover" as string]: "var(--adm-hover)",
            borderColor: "var(--adm-line-strong)",
            color: "var(--adm-ink)",
          }}
        >
          Try again
        </button>
      </section>
    );
  }
}
