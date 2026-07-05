/**
 * Public shapes for the shop. These mirror the PUBLIC columns of the
 * shop_ tables only — supplier/sourcing data and reviewer notes have no
 * types here on purpose: they must never cross into client code. Admin
 * routes type their own payloads locally.
 */

export type ShopCategory =
  | "christ"
  | "theotokos"
  | "saints"
  | "feasts"
  | "prayer_corner"
  | "crosses"
  | "sets";

export type ShopClassification =
  | "printed_mounted"
  | "standard_reproduction"
  | "laminated"
  | "wooden"
  | "hand_finished_reproduction";

export type ShopInventoryStatus =
  | "ready_to_ship"
  | "special_order"
  | "coming_soon"
  | "out_of_stock";

export type ShopFulfillmentType =
  | "eikon_two_stage"
  | "seller_fulfilled"
  | "supplier_direct"
  | "purify_fulfilled"
  | "made_to_order"
  | "custom_commission";

export type ShopSubjectType =
  | "saint"
  | "christ"
  | "theotokos"
  | "feast"
  | "event"
  | "council";

export type ShopStore = {
  id: string;
  slug: string;
  public_name: string;
  tagline: string | null;
  description: string | null;
  ownership_disclosure: string;
  operational_disclosure: string | null;
  logo_url: string | null;
  banner_url: string | null;
  support_email: string | null;
  shipping_origin: string | null;
  shipping_policy_md: string | null;
  return_policy_md: string | null;
  status: "draft" | "live" | "paused" | "closed";
};

export type ShopProductMedia = {
  id: string;
  media_url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
};

export type ShopProductSubject = {
  subject_type: ShopSubjectType;
  subject_slug: string;
};

export type ShopProduct = {
  id: string;
  store_id: string;
  seller_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description_md: string | null;
  price_cents: number;
  currency: string;
  category: ShopCategory;
  classification: ShopClassification;
  fulfillment_type: ShopFulfillmentType;
  inventory_status: ShopInventoryStatus;
  quantity_available: number | null;
  dispatch_min_days: number;
  dispatch_max_days: number;
  materials: string | null;
  dimensions: string | null;
  production_method: string | null;
  maker_name: string | null;
  country_of_origin: string | null;
  image_is_representative: boolean;
  status: "draft" | "published" | "paused" | "archived";
  created_at: string;
};

/** Product joined with its media, subjects, and selling store. */
export type ShopProductFull = ShopProduct & {
  media: ShopProductMedia[];
  subjects: ShopProductSubject[];
  store: Pick<ShopStore, "slug" | "public_name" | "ownership_disclosure">;
};

export type ShopIconRequestStatus =
  | "new"
  | "reviewing"
  | "sourced"
  | "contacted"
  | "closed";

export type ShopBudgetBand =
  | "under_50"
  | "50_100"
  | "100_250"
  | "250_500"
  | "500_plus"
  | "unsure";

export type ShopIconRequest = {
  id: string;
  subject: string;
  saint_slug: string | null;
  request_type: "ready_made" | "custom" | "either";
  preferred_size: string | null;
  product_preference: string | null;
  budget_band: ShopBudgetBand | null;
  desired_date: string | null;
  notes: string | null;
  notify_when_available: boolean;
  status: ShopIconRequestStatus;
  created_at: string;
};

export type ShopApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "more_info_required"
  | "approved"
  | "store_setup"
  | "live"
  | "declined"
  | "suspended";

export type ShopMerchantApplication = {
  id: string;
  proposed_store_name: string;
  seller_type: "independent_iconographer" | "monastery" | "workshop" | "retailer";
  legal_name: string;
  email: string;
  phone: string | null;
  country: string;
  shipping_origin: string | null;
  portfolio_url: string | null;
  product_methods: string[];
  fulfillment_offerings: string[];
  processing_time: string | null;
  countries_served: string | null;
  return_policy: string | null;
  rights_declaration: boolean;
  seller_description: string | null;
  agreed_standards: boolean;
  status: ShopApplicationStatus;
  created_at: string;
  updated_at: string;
};

/** Internal fulfillment pipeline; buyers never see these raw values. */
export type ShopFulfillmentStatus =
  | "pending"
  | "supplier_order_needed"
  | "supplier_order_placed"
  | "inbound_to_eikon"
  | "received_for_inspection"
  | "packaged"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type ShopOrder = {
  id: string;
  items_total_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  payment_status: "pending" | "paid" | "refunded" | "cancelled";
  fulfillment_status: ShopFulfillmentStatus;
  outbound_tracking: string | null;
  created_at: string;
  items: { title: string; unit_price_cents: number; quantity: number }[];
};

/** The seller's view of an order adds what fulfillment needs. */
export type ShopSellerOrder = ShopOrder & {
  email: string | null;
  shipping_address: unknown;
  updated_at: string;
  items: {
    product_id: string | null;
    title: string;
    unit_price_cents: number;
    quantity: number;
  }[];
};

export type ShopSeller = {
  id: string;
  seller_type:
    | "purify_owned"
    | "independent_iconographer"
    | "monastery"
    | "workshop"
    | "retailer";
  public_name: string;
  status: "active" | "suspended" | "closed";
  verification_status: "unverified" | "verified" | "purify_operated";
};

export type ShopConversation = {
  id: string;
  store_id: string;
  seller_id: string;
  buyer_user_id: string;
  order_id: string | null;
  product_id: string | null;
  subject: string;
  status: "open" | "closed";
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
  last_message_at: string;
  created_at: string;
};

export type ShopMessage = {
  id: string;
  conversation_id: string;
  sender: "buyer" | "seller";
  body: string;
  created_at: string;
};

export type ShopRefundReason =
  | "damaged"
  | "not_as_described"
  | "never_arrived"
  | "wrong_item"
  | "change_of_mind"
  | "other";

export type ShopRefundStatus =
  | "requested"
  | "approved"
  | "declined"
  | "processed"
  | "cancelled";

export type ShopRefundRequest = {
  id: string;
  order_id: string;
  reason: ShopRefundReason;
  details: string | null;
  amount_cents: number | null;
  status: ShopRefundStatus;
  resolution_note: string | null;
  decided_at: string | null;
  processed_at: string | null;
  created_at: string;
};
