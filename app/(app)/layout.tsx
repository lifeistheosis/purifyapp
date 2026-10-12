import { AppFrame } from "@/components/layout/AppFrame";

// One client component and nothing else, on purpose. Each client component
// rendered from a layout is named in every page's payload under it, on a line
// of its own, and this layout is over every screen but Today. What used to be
// mounted here (the web header and footer, the tab bar, the way back, the
// bridges) is in components/layout/AppFrame.tsx, with the reason for each.
export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppFrame>{children}</AppFrame>;
}
