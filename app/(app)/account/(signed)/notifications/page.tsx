import { PushOptIn } from "@/components/profile/PushOptIn";
import { EmailPreferences } from "@/components/profile/EmailPreferences";

export const metadata = { title: "Notifications" };

/**
 * Prayer reminders and email, on a screen of their own (1.6).
 *
 * They lived on the tab called "Data", between the reader's font and the
 * button that deletes the account, and the row that led to them was called
 * "Notifications": a reader followed a word to a screen with a different
 * word on it and had to find the part they came for. Settings' Notifications
 * row opens this instead. The desktop dashboard's Data tab still shows both
 * cards, as it did; this is the same two components, not a second copy of
 * what they do.
 *
 * Server shell only: both children read and write on the device at runtime,
 * so the page ships into the apps' export like its neighbours.
 */
export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PushOptIn />
      <EmailPreferences />
    </div>
  );
}
