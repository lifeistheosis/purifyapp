"use client";

// Print one part of a page, alone (1.9): the browser's own print, whose
// dialog also saves a PDF. The part wears data-print-part, anything inside it
// that is no use on paper wears data-print-hide, and the rules are globals.css
// "One part printed": ink on white, nothing of the app around it. The journal
// (s4-09) and a florilegium as a booklet (s5-05) print this way. The apps'
// WebView cannot print; the screens that offer it offer it on the website.

/** Print the page's data-print-part alone. */
export function printPart(): void {
  const root = document.documentElement;
  root.classList.add("print-part");
  window.addEventListener("afterprint", () => root.classList.remove("print-part"), { once: true });
  window.print();
}
