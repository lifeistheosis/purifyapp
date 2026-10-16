"use client";

// Your rule on the device (1.7): reading it, keeping it, and the hook the
// builder, the prayer reader and Today read it through. The model is
// lib/prayers/myRule.ts.

import { useSyncExternalStore } from "react";

import { MY_RULE_EVENT, MY_RULE_KEY, emptyMyRule, parseMyRule, type MyRule } from "@/lib/prayers/myRule";

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(MY_RULE_KEY);
  } catch {
    return null;
  }
}

export function readMyRule(): MyRule {
  return parseMyRule(readRaw());
}

export function writeMyRule(rule: MyRule): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MY_RULE_KEY, JSON.stringify(rule));
    window.dispatchEvent(new CustomEvent(MY_RULE_EVENT));
  } catch {
    /* blocked storage: the change is not kept */
  }
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(MY_RULE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(MY_RULE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

let cache: { raw: string | null; rule: MyRule } | null = null;

function snapshot(): MyRule {
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.rule;
  cache = { raw, rule: parseMyRule(raw) };
  return cache.rule;
}

const SERVER_RULE = emptyMyRule();

/** The reader's rule; empty on the server and before mount. */
export function useMyRule(): MyRule {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER_RULE);
}
