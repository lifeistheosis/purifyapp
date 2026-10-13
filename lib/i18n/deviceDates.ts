// Can this device write a date in the reader's language?
//
// Asking an engine for a date in a language it has no data for does not
// fail. On a device set to that language it answers in a bare pattern: the
// test browser (Chromium 148), asked for April 30 in Georgian, wrote
// "M04 30", and "Sun" for Sunday. It carries no data for Georgian or Nepali,
// two of the app's twenty-one languages. Node, which builds the pages and
// serves the website, carries both.
//
// The English a screen already has is better than "M04 30". So the code that
// hands a date to the device asks here first, and keeps the English when the
// answer is no.
//
// Import-free and synchronous on purpose: lib/calendar/orthodox.ts uses it,
// and the native build loads that file in plain Node.

const answers = new Map<string, boolean>();

export function writesDatesIn(locale: string): boolean {
  const known = answers.get(locale);
  if (known !== undefined) return known;
  let answer = false;
  try {
    answer = Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
  } catch {
    // Not a language tag at all.
  }
  // The answer cannot change while the app runs, so it is asked once.
  answers.set(locale, answer);
  return answer;
}

/**
 * The language to hand the device for a date, a weekday or "3 days ago": the
 * reader's when the device can write it, English when it cannot. For the
 * screens that have no English of their own to keep, which is most of them:
 * `new Intl.DateTimeFormat(dateLocale(locale), ...)`.
 */
export function dateLocale(locale: string): string {
  return writesDatesIn(locale) ? locale : "en";
}

/**
 * For a date written the device's own way, which the shop, the messages and
 * the profile do: in the device's own language and its region's order of day
 * and month. `undefined`, which is the device's own default, when the device
 * can write its own language, and English when it cannot: a phone set to a
 * language its engine has no data for then shows "Nov 13" and not "M11 13".
 *
 * Not the reader's chosen language, on purpose. Handing these "en" would
 * give a reader in Britain the American order on an order's date.
 */
export function deviceDateLocale(): string | undefined {
  if (typeof navigator === "undefined" || !navigator.language) return undefined;
  return writesDatesIn(navigator.language) ? undefined : "en";
}

/** Tests ask again after changing what the engine says. */
export function forgetDeviceDatesForTests(): void {
  answers.clear();
}
