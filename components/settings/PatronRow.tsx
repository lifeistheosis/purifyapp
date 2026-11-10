"use client";

// The patron saint in Settings (build 89, note 17). The owner looked for the
// choice among the settings when the My saint widget asked for a saint, and
// found none: it lived only on the reader's own page under You. Here it is a
// row of the calendar, whose reckoning a name day follows: the same picker
// (components/profile/PatronSaintPicker.tsx), the same saving, and the widget
// told at once. Nothing shows until the list is in, and nothing for a reader
// signed out, who has no patron to keep.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PatronSelect, usePatronChoice } from "@/components/profile/PatronSaintPicker";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";

import { Row } from "./LitPanel";

export function PatronRow() {
  const { t } = useTranslate();
  const choice = usePatronChoice();
  if (choice.state !== "ready") return null;
  return (
    <Row icon={<HaloedHead size={18} />} label={t("patron.title")}>
      <div data-settings-patron="" className="mt-3">
        <PatronSelect choice={choice} />
      </div>
    </Row>
  );
}
