// The fields in the other chats' families that do not yet say dir="auto"
// (lib/i18n/__tests__/typedWords.test.ts, build 90 note 4), with how many.
// Kept apart from the test so that a chat marking its own files edits only
// its own lines here. Lower a count, or remove the line, in the commit that
// marks them; a count may only fall.
export const OTHER_FAMILIES: Record<string, number> = {
  // The Updates chat's: the shop and its sellers, the EIKON box, the saints,
  // support and the walkthroughs.
  "components/eikonBox/AddressForm.tsx": 5,
  "components/saints/ParagraphRow.tsx": 1,
  "components/shop/BuyerMessageButton.tsx": 1,
  "components/shop/BuyerRefundSection.tsx": 1,
  "components/shop/MerchantApplyForm.tsx": 9,
  "components/shop/RequestIconForm.tsx": 4,
  "components/shop/ShopSupportClient.tsx": 1,
  "components/shop/WriteReviewForm.tsx": 2,
  "components/shop/WriteStoreReviewForm.tsx": 2,
  "components/shop/seller/ListingForm.tsx": 9,
  "components/shop/seller/OpenStoreRequest.tsx": 1,
  "components/shop/seller/RefundDecisionCard.tsx": 1,
  "components/shop/seller/SellerOrderActions.tsx": 1,
  "components/shop/seller/StoreForm.tsx": 5,
  "components/shop/threadParts.tsx": 1,
  "components/support/ContactForm.tsx": 3,
  "components/walkthrough/Synthesis.tsx": 1,
};
