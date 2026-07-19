import { ProfileDevices } from "@/components/profile/ProfileDevices";
import { T } from "@/components/i18n/T";

export const metadata = { title: "Sessions" };

export default function SessionsTabPage() {
  return (
    <div className="flex flex-col gap-6">
      <ProfileDevices />
      <p className="font-sans text-caption text-paper/45 leading-[1.55]">
        <T k="ui.forAGlobalSignOut" />
      </p>
    </div>
  );
}
