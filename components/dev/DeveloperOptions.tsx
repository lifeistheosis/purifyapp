"use client";

// Developer options panel. Rendered only on /account/developer, which is
// gated to allowlisted developer accounts (lib/dev/developer): by the server
// on the website, on the device in the apps (./DeveloperGate.tsx). All
// settings live on this device (localStorage); "test premium" also writes
// a cookie so server-rendered surfaces honor it.
//
// Under the bar every screen under You wears from 1.8, with its name as the
// page's heading. Developer-only, so in English only, as it always was.

import { useRouter } from "next/navigation";
import { useDevOptions } from "@/lib/dev/options";
import { DEV_FEATURE_FLAGS } from "@/lib/dev/developer";

export function DeveloperOptions() {
  const router = useRouter();
  const { options, setTestPremium, setFlag } = useDevOptions();

  return (
    <section className="mx-auto w-full max-w-[640px] px-5 pb-16 pt-8" aria-labelledby="developer-title">
      <h1 id="developer-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper">
        Developer options
      </h1>
      <p className="mt-2 font-sans text-detail leading-[1.6] text-paper/55">
        Visible only to developer accounts. These settings live on this device
        and never affect other users.
      </p>

      <Group title="Premium">
        <ToggleRow
          label="Test premium"
          hint="Treat this account as Purify Plus everywhere, without a purchase. Takes effect immediately; clear it when you’re done."
          on={options.testPremium}
          onChange={(on) => {
            setTestPremium(on);
            // Server components read the cookie; refresh so gated surfaces update.
            router.refresh();
          }}
        />
      </Group>

      <Group title="New features">
        {DEV_FEATURE_FLAGS.map((f) => (
          <ToggleRow
            key={f.key}
            label={f.label}
            hint={f.hint}
            on={options.flags[f.key] === true}
            onChange={(on) => setFlag(f.key, on)}
          />
        ))}
      </Group>

      <Group title="Themes">
        <ToggleRow
          label="Alternate theme"
          hint="Coming soon. Purify ships one deliberate dark theme today."
          on={false}
          disabled
          onChange={() => {}}
        />
      </Group>
    </section>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      {/* A heading by role: every h1 to h6 is set in Lora (globals.css). */}
      <p role="heading" aria-level={2} className="mb-2 px-1 font-sans text-caption text-paper/50">
        {title}
      </p>
      <div className="divide-y divide-paper/[0.06] overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]">
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-ui text-paper">{label}</p>
        {hint ? (
          <p className="mt-0.5 font-sans text-caption leading-snug text-paper/55">
            {hint}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full motion-safe:transition-colors disabled:opacity-40 ${
          on ? "bg-paper" : "bg-paper/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-night motion-safe:transition-[left] ${
            on ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
