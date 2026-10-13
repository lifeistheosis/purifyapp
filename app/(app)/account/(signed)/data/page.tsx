import { ProfileSyncStatus } from "@/components/profile/ProfileSyncStatus";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { ProfileData } from "@/components/profile/ProfileData";
import { ProfileDanger } from "@/components/profile/ProfileDanger";
import { PushOptIn } from "@/components/profile/PushOptIn";
import { EmailPreferences } from "@/components/profile/EmailPreferences";
import { PatronSaintPicker } from "@/components/profile/PatronSaintPicker";

export const metadata = { title: "Data" };

/**
 * The Data screen.
 *
 * On the desktop dashboard it is the tab it always was, with everything on
 * it. On a phone, and in the apps at any width, it is what its name says and
 * no more (1.6): what is synced, the reader's data, and the danger zone.
 * The four cards in the middle are not drawn there, because each now has one
 * home on a phone and this was its second:
 *
 *   - the reader's font, size, interlinear, calendar, language and the
 *     supporter mark are in Settings, where they can also be changed signed
 *     out (five of the six could be changed in both places);
 *   - prayer reminders and email are the Notifications screen
 *     (../notifications/page.tsx);
 *   - the patron saint is on the Profile screen, with the rest of who the
 *     reader is.
 *
 * `md:contents` keeps the four as direct children of the column on the
 * desktop, so its spacing is what it was.
 */
export default function DataTabPage() {
  return (
    <div className="flex flex-col gap-8">
      <ProfileSyncStatus />
      <div className="hidden md:contents native-md-hidden" data-desktop-only="">
        <ProfileSettings />
        <PushOptIn />
        <EmailPreferences />
        <PatronSaintPicker />
      </div>
      <ProfileData signedIn />
      <ProfileDanger signedIn />
    </div>
  );
}
