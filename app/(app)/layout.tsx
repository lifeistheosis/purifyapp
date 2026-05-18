import { AppNav } from "@/components/nav/AppNav";
import { Footer } from "@/components/layout/Footer";
import { SyncBridge } from "@/components/profile/SyncBridge";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppNav />
      <SyncBridge />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
