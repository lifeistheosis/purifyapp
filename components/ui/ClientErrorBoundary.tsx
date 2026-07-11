"use client";

import { Component, type ReactNode } from "react";

/**
 * Minimal client error boundary. Catches render-time throws in a subtree
 * (e.g. a native billing plugin misbehaving) and shows a calm fallback
 * instead of white-screening the whole WebView. Async errors are handled
 * at their call sites; this covers the render path.
 */
export class ClientErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[ClientErrorBoundary] caught:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
