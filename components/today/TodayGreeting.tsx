import { loadHourVerses } from "@/lib/today/hourVerse.server";
import { GreetingHeader } from "./GreetingHeader";

/**
 * The greeting's shell on Today: the verses for the hour, read from the
 * Psalter on the server (lib/today/hourVerse.server.ts), handed to the
 * greeting, which decides everything else on the device. Nothing here knows
 * the day or the hour: a server component under the static export renders
 * once, at build time (lib/calendar/useToday.ts).
 */
export async function TodayGreeting() {
  const verses = await loadHourVerses();
  return <GreetingHeader verses={verses} />;
}
