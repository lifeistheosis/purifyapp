import { ProfileEditor } from "@/components/community/profile/ProfileEditor";

export const metadata = { title: "Community profile" };

// Server shell (for metadata); the profile is read and saved client-side in
// ProfileEditor so this works in the native local-first export.
export default function ProfileEditPage() {
  return <ProfileEditor />;
}
