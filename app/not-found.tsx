import { NotFoundScreen } from "@/components/layout/NotFoundScreen";

// One reference and nothing else, on purpose. Next writes this component's
// output into every page's payload as that page's fallback, so whatever is
// drawn here is paid for once per page of the export. See NotFoundScreen.
export default function NotFound() {
  return <NotFoundScreen />;
}
