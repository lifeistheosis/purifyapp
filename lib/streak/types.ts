// What /api/streak answers. Shared by the route and the device. Never the
// number of saves: a reader learns only that one was used, once.

import type { StripDay } from "./compute";

export type StreakPayload =
  | {
      state: "ok";
      /** The streak as it stands today, in the reader's own zone. */
      current: number;
      best: number;
      keptToday: boolean;
      lastKept: string | null;
      /** A save just covered a missed day, and the reader has not been told. */
      saved: boolean;
      /** The last seven days, oldest first. */
      strip: StripDay[];
      /** The day this was judged on. */
      today: string;
    }
  | { state: "unavailable" };
