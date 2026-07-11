import { SecurityTabClient } from "@/components/account/security/SecurityTabClient";

export const metadata = { title: "Security" };

// Server shell (for metadata); the user/identities read runs client-side in
// SecurityTabClient so this works in the native local-first export.
export default function SecurityTabPage() {
  return <SecurityTabClient />;
}
