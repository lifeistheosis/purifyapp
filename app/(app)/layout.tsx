import { AppNav } from "@/components/nav/AppNav";
import { Footer } from "@/components/layout/Footer";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
