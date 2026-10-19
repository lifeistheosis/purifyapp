import type { AppReview, StoreRatings } from "@/lib/marketing/storeRatings";
import { PhoneClosing } from "./PhoneClosing";
import { PhoneHero } from "./PhoneHero";
import { PhonePillars } from "./PhonePillars";
import { ReviewRow } from "./ReviewRow";

/**
 * The website's front page on a phone (under 768px), remade for 1.8.
 *
 * The owner, 2026-10-17: "I like ... the pictures of the phones and how the
 * phones move, but it ... could be structured way more better ... the
 * scrolling is kind of weird ... it's like a bad shadow of what we had
 * before, and it was badly optimized to look more simplified. So we might as
 * well just remake the whole thing just for the mobile web version." Then:
 * "I'm only talking about the front page."
 *
 * What changed from the September page, and why:
 *
 * - One story read top to bottom: what Purify is and the store to get it
 *   from, what is inside, what readers say, and the store again. Each
 *   section is as tall as what it holds. The September page made every
 *   section exactly one screen and settled the scroll on each, which is the
 *   scrolling he called weird: a phone that cut off its own pictures to fit,
 *   and a page that pulled back against the thumb. Nothing snaps now but the
 *   row of reviews, which a thumb swipes sideways.
 * - The pillars carry a line each again, and the reviews are a row of every
 *   real one the Admin chose, under both stores' ratings (ReviewRow).
 * - The phones stay, and still move with the scroll: the hero's phone lifts
 *   into the light, and the closing pair rises and settles. Both follow
 *   Purify's motion switch. No gold or yellow anywhere: stars and light take
 *   the page's own ink.
 *
 * Still the rules of 2026-09-29: on a phone the front page onboards nobody
 * and asks for the store app; the one pop-up per visit is AppNudge, on the
 * way to another page; onboarding begins at /signup.
 *
 * The computer's front page (768px and up) is unchanged and hidden here,
 * as this is hidden there.
 */
export function PhoneHome({ ratings, reviews }: { ratings: StoreRatings; reviews: readonly AppReview[] }) {
  return (
    <div className="md:hidden">
      <PhoneHero ratings={ratings} />
      <PhonePillars />
      <ReviewRow ratings={ratings} reviews={reviews} />
      <PhoneClosing />
    </div>
  );
}
