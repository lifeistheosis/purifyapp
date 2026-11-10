/**
 * A saint's initials, for a stand-in while the icon is on its way: the first
 * letter of each of the first two words that name the saint, with the small
 * words between them and the titles before them left out. "St. Ammon of
 * Nitria" is AN and "The Mother of God" MG; they read "Ao" and "TM" while each
 * stand-in counted its own way (the arbiter's yes of 2026-11-10). One rule for
 * every stand-in: the saints' icons, the Bible's commentary faces, the shop.
 */
const SMALL = new Set(["the", "of", "and", "a", "an", "to", "in", "st", "saint", "pope"]);

export function saintInitials(name: string): string {
  const words = name
    .replace(/[.,]/g, "")
    .split(/\s+/)
    .filter((word) => word && !SMALL.has(word.toLowerCase()));
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
