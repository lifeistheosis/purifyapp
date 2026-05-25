import { ProfileDevices } from "@/components/profile/ProfileDevices";

export const metadata = { title: "Sessions" };

export default function SessionsTabPage() {
  return (
    <div className="flex flex-col gap-6">
      <ProfileDevices />
      <p className="font-sans text-[12.5px] text-paper/45 leading-[1.55]">
        For a global sign-out, see the Security tab.
      </p>
    </div>
  );
}
