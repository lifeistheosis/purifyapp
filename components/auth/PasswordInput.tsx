"use client";

import { useId, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Password field with show/hide toggle and an optional inline strength
 * meter (renders only when `showStrength` is on, typically the signup +
 * reset flows). The meter is a four-step bar coloured by a tiny
 * heuristic, long-enough length plus character-class variety.
 *
 * Controlled component: parent owns the value.
 */
export function PasswordInput({
  value,
  onChange,
  label,
  placeholder = "••••••••",
  autoComplete,
  showStrength = false,
  minLength = 8,
  id: idProp,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  autoComplete: "current-password" | "new-password";
  showStrength?: boolean;
  minLength?: number;
  id?: string;
}) {
  const { t } = useTranslate();
  const autoId = useId();
  const id = idProp ?? autoId;
  const [shown, setShown] = useState(false);
  const strength = computeStrength(value, minLength);

  return (
    <div>
      <label
        htmlFor={id}
        className="font-sans text-caption font-medium text-paper/75 block mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          required
          className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill pl-4 pr-12 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/55 transition-colors"
        />
        <button
          type="button"
          aria-label={shown ? t("common.hidePassword") : t("common.showPassword")}
          onClick={() => setShown((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-pill text-paper/55 hover:text-paper"
        >
          {shown ? "🙈" : "👁"}
        </button>
      </div>
      {showStrength ? <StrengthMeter score={strength} value={value} /> : null}
    </div>
  );
}

function StrengthMeter({ score, value }: { score: 0 | 1 | 2 | 3 | 4; value: string }) {
  const { t } = useTranslate();
  const labels = [
    "",
    t("common.passwordStrengthTooShort"),
    t("common.passwordStrengthWeak"),
    t("common.passwordStrengthOkay"),
    t("common.passwordStrengthStrong"),
  ];
  const tones = [
    "bg-paper/10",
    "bg-crimson/70",
    "bg-[#e3a7a7]",
    "bg-gold/65",
    "bg-emerald-500/75",
  ];
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex-1 flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={
              "h-[3px] flex-1 rounded-full " +
              (i <= score ? tones[score] : "bg-paper/10")
            }
          />
        ))}
      </div>
      <span className="font-sans text-eyebrow text-paper/55 min-w-[64px] text-right">
        {value.length > 0 ? labels[score] : ""}
      </span>
    </div>
  );
}

function computeStrength(v: string, min: number): 0 | 1 | 2 | 3 | 4 {
  if (v.length === 0) return 0;
  if (v.length < min) return 1;
  let classes = 0;
  if (/[a-z]/.test(v)) classes++;
  if (/[A-Z]/.test(v)) classes++;
  if (/[0-9]/.test(v)) classes++;
  if (/[^a-zA-Z0-9]/.test(v)) classes++;
  if (v.length >= 12 && classes >= 3) return 4;
  if (v.length >= min && classes >= 2) return 3;
  return 2;
}
