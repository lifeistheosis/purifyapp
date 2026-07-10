/**
 * Human-friendly order confirmation number, derived deterministically from
 * the order UUID so no extra column or sequence is needed. Stable for a given
 * order, shown on the success page, in the confirmation email, and on the
 * order-status page. Example: "EIK-72D8D24B".
 */
export function orderConfirmationNumber(orderId: string): string {
  const hex = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `EIK-${hex}`;
}
