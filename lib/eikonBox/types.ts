// Shapes shared between the EIKON Box API routes and the surfaces that
// render them. No imports, so both server and client may use it.

/**
 * A shipping address, in Stripe Checkout's exact shape.
 *
 * Deliberately identical to shop_orders.shipping_address, which the Stripe
 * webhook writes, so the admin renderer in components/admin/tabs/OrdersTab
 * and any future label tooling read a box claim and a shop order the same
 * way. Do not "tidy" this into a flat object.
 */
export type ShippingAddress = {
  name: string;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
};

export type DropStatus =
  | "draft"
  | "open"
  | "closed"
  | "fulfilling"
  | "shipped"
  | "cancelled";

export type ClaimStatus =
  | "claimed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

/** The drop as a member sees it. Never carries sourcing_notes. */
export type MemberDrop = {
  id: string;
  title: string;
  periodMonth: string;
  teaser: string | null;
  imageUrl: string | null;
  status: DropStatus;
  claimsOpenAt: string | null;
  claimsCloseAt: string | null;
};

export type MemberClaim = {
  id: string;
  status: ClaimStatus;
  claimedAt: string;
  tracking: string | null;
  shippingAddress: ShippingAddress | null;
  cancelReason: string | null;
};

/** GET /api/eikon-box/current */
export type EikonBoxCurrent = {
  /** pro_until is in the future. The SERVER decides this, never the client. */
  eligible: boolean;
  drop: MemberDrop | null;
  claim: MemberClaim | null;
  savedAddress: ShippingAddress | null;
  /** Last paid shop order's address, offered when nothing is saved yet. */
  suggestedAddress: ShippingAddress | null;
};

/** One row of a member's own box history. */
export type MemberClaimHistoryRow = MemberClaim & {
  dropId: string;
  dropTitle: string;
  periodMonth: string;
  imageUrl: string | null;
  dropStatus: DropStatus;
};
