import type { LocaleCode } from "./locales";

// Spelled-out cardinals for editorial copy (e.g. "Seventy-six profiles"),
// so prose counts can be derived from data instead of hardcoded and left to
// drift. Covers 0–999, which comfortably bounds any of the app's corpora;
// anything larger falls back to the numeral.

const EN_ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen",
];
const EN_TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty",
  "ninety",
];

const DE_ONES = [
  "null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht",
  "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn",
  "sechzehn", "siebzehn", "achtzehn", "neunzehn",
];
const DE_TENS = [
  "", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig",
  "achtzig", "neunzig",
];

function enUnder100(n: number): string {
  if (n < 20) return EN_ONES[n];
  const tens = EN_TENS[Math.floor(n / 10)];
  const ones = n % 10;
  return ones === 0 ? tens : `${tens}-${EN_ONES[ones]}`;
}

function deUnder100(n: number): string {
  if (n < 20) return DE_ONES[n];
  const tens = DE_TENS[Math.floor(n / 10)];
  const ones = n % 10;
  if (ones === 0) return tens;
  // German joins ones-and-tens: "sechsundsiebzig"; 1 becomes "ein".
  const onesWord = ones === 1 ? "ein" : DE_ONES[ones];
  return `${onesWord}und${tens}`;
}

export function numberToWords(n: number, locale: LocaleCode): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) return String(n);

  if (locale === "de") {
    if (n < 100) return deUnder100(n);
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const head = hundreds === 1 ? "einhundert" : `${DE_ONES[hundreds]}hundert`;
    return rest === 0 ? head : `${head}${deUnder100(rest)}`;
  }

  if (n < 100) return enUnder100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${EN_ONES[hundreds]} hundred`;
  return rest === 0 ? head : `${head} ${enUnder100(rest)}`;
}

// Capitalized for sentence-initial use ("Seventy-six profiles").
export function numberToWordsCapitalized(n: number, locale: LocaleCode): string {
  const w = numberToWords(n, locale);
  return w.charAt(0).toUpperCase() + w.slice(1);
}
