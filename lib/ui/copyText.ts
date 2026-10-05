/**
 * Put text on the clipboard, by whichever way this device allows.
 *
 * `navigator.clipboard` exists only in a secure context, and the iPhone app
 * is served from capacitor://localhost. Every copy button used to call it
 * bare and swallow the failure, so where it was missing a reader tapped Copy
 * and got nothing, with the phone's own selection menu as the only way that
 * still worked. In the apps that menu is gone since 1.5.2 (the owner,
 * 2026-10-05: "when you copy anything, it uses our system"), so the app's own
 * copy has to work everywhere it is offered.
 *
 * So: the clipboard API first, and when it is missing or refuses, the old
 * way, a field holding the text, selected, and the browser told to copy it.
 * That one works from a tap in any context. The field is a form field on
 * purpose: it stays selectable where the page around it is not.
 *
 * Returns whether the text is on the clipboard, so a button can say "Copied"
 * only when it is.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Refused (no permission, not focused, not secure): try the other way.
    }
  }
  return copyThroughField(text);
}

/** The pre-clipboard-API way. Exported for the test. */
export function copyThroughField(text: string): boolean {
  if (typeof document === "undefined" || !document.body) return false;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  field.tabIndex = -1;
  // Off the page without being `display: none`, which cannot be selected.
  // 16px so an iPhone does not zoom to it for the instant it is focused.
  Object.assign(field.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    padding: "0",
    border: "0",
    opacity: "0",
    fontSize: "16px",
    userSelect: "text",
    webkitUserSelect: "text",
  });
  const active = document.activeElement as HTMLElement | null;
  document.body.appendChild(field);
  let ok = false;
  try {
    field.focus({ preventScroll: true });
    field.select();
    // iOS ignores select() on a read-only field; a range does it.
    field.setSelectionRange(0, text.length);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    field.remove();
    // Hand focus back, so a sheet's focus trap or a screen reader is where it was.
    try {
      active?.focus?.({ preventScroll: true });
    } catch {
      /* the element is gone */
    }
  }
  return ok;
}
