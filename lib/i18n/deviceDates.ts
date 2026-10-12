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

/** Tests ask again after changing what the engine says. */
export function forgetDeviceDatesForTests(): void {
  answers.clear();
}
