import "server-only";

import { APOLOGETICS_TOPICS } from "@/lib/apologetics/topics";
import { HERESIES } from "@/lib/heresies/heresies";
import { loadAllTopics } from "@/lib/topics/topics";

import { THEOLOGY_TOPICS } from "./topics";

/**
 * How many each of Theology's four ways holds: the number beside each of the
 * hub's four buttons (app/(app)/theology/page.tsx counts them the same way,
 * and lib/theology/__tests__/ways.test.ts holds the two together), and the
 * number in the head of each way's own page, which is that button grown
 * (components/theology/WayPage.tsx). What is planned and not yet written is
 * not counted, and not listed.
 */
export async function wayCounts(): Promise<{ doctrine: number; topics: number; heresies: number; apologetics: number }> {
  const topics = await loadAllTopics();
  return {
    doctrine: THEOLOGY_TOPICS.filter((t) => !t.planned).length,
    topics: topics.length,
    heresies: HERESIES.length,
    apologetics: APOLOGETICS_TOPICS.filter((t) => !t.planned).length,
  };
}
