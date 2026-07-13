import { FastingTrackerClient } from "@/components/fasting/FastingTrackerClient";

export const metadata = {
  title: "The Fast",
  description:
    "Keep the Church's fast day by day: today's rule, a gentle check-in, and the days you have kept. The whole fasting calendar is free.",
};

// Local-first: the tracker reads the reader's marks from the device, so the
// page renders on the client. A plain server shell carries the metadata.
export default function FastingPage() {
  return <FastingTrackerClient />;
}
