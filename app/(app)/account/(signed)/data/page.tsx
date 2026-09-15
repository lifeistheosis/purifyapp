import { ProfileSyncStatus } from "@/components/profile/ProfileSyncStatus";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { ProfileData } from "@/components/profile/ProfileData";
import { ProfileDanger } from "@/components/profile/ProfileDanger";
import { PushOptIn } from "@/components/profile/PushOptIn";
import { EmailPreferences } from "@/components/profile/EmailPreferences";
import { PatronSaintPicker } from "@/components/profile/PatronSaintPicker";

export const metadata = { title: "Data" };

export default function DataTabPage() {
  return (
    <div className="flex flex-col gap-8">
      <ProfileSyncStatus />
      <ProfileSettings />
      <PushOptIn />
      <EmailPreferences />
      <PatronSaintPicker />
      <ProfileData signedIn />
      <ProfileDanger signedIn />
    </div>
  );
}
