import { ProfileSyncStatus } from "@/components/profile/ProfileSyncStatus";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { ProfileData } from "@/components/profile/ProfileData";
import { ProfileDanger } from "@/components/profile/ProfileDanger";

export const metadata = { title: "Data" };

export default function DataTabPage() {
  return (
    <div className="flex flex-col gap-8">
      <ProfileSyncStatus />
      <ProfileSettings />
      <ProfileData signedIn />
      <ProfileDanger signedIn />
    </div>
  );
}
