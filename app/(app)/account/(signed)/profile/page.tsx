import { ProfileTabClient } from "@/components/profile/ProfileTabClient";

export const metadata = { title: "Profile" };

// Server shell (for metadata); the user/profile read runs client-side in
// ProfileTabClient so this works in the native local-first export.
export default function ProfileTabPage() {
  return <ProfileTabClient />;
}
