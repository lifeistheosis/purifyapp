# The shop, for the owner

How to run EIKON from the admin panel, phone first. Written 2026-09-25 against
the code on `claude/optimistic-cerf-dbfhtg`. Where a feature waits on a
migration or a setting, it says so.

**There is no blessing option, and there will not be one.** A price on a
blessing, even as handling, is simony. See `docs/DECISIONS.md`.

## Where things are

`/admin`, then **Shop** in the rail. Two panels:

| Panel | What it holds |
|---|---|
| EIKON catalog | Products, Deals & shipping, Icon requests, Merchant applications, Reviews |
| Marketplace governance | Other sellers' stores, their listings and applications |

Orders, Fulfillment and Messages have their own places in the rail.

## Add a product from your phone

1. **Shop, EIKON catalog, Products**, then **New product**.
2. Fill the form. The ones that matter most: name, slug (the web address,
   lower case with hyphens, such as `st-nicholas-icon`), price, category,
   images, availability. An import fills the slug for you; a new product
   needs it typed.
3. **Upload images**: pick several at once. The first is the cover shoppers
   see; any image can be made the cover later.
4. **Save**. The product is live when **Live in shop** is on; **Pause** takes
   it down without deleting it.

Nothing you type is lost if the tab closes: every listing in progress is kept
on that device within a second, and **Unsaved listings** offers it back.

### From a distributor's page instead

Paste the product link into the import box and you get a draft listing:
name, description, price, photos and the supplier fields filled from the
page. Read it, fix what is wrong, save. If a site blocks the reader, the box
tells you how to paste the page source instead. Temu imports leave Supplier
SKU empty on purpose: the item id is only in Temu's Share menu.

## Photos

Every photo is cleaned before it is stored, whichever way it arrives (your
upload, an import, a seller's upload):

- **Location removed.** Phone photos carry GPS. A product shot at home would
  otherwise publish your home. It is stripped, with all other photo data.
- **The right way up.** A phone's rotation is applied before the data is
  dropped, so portraits stay portrait.
- **Small.** The longest side is held to 1600 pixels. A 6 MB phone photo
  becomes a few hundred KB, still sharp on any screen.
- **Transparency kept.** A cut-out product on no background stays that way.

Up to 25 MB per photo from the admin, 8 MB from sellers. iPhone photos arrive
as JPEG on their own. From a computer, export HEIC photos as JPEG first; the
server cannot read HEIC.

## Stock, cost and profit

The product editor has the sourcing fields: supplier link, supplier SKU,
supplier cost, lead time, dispatch. From them the panel shows profit per
unit and ROI beside the price, and grades the price. **Quantity on hand**
drives the storefront's "Only N left", which appears at five or fewer.
**Out of stock** turns on "Tell me when it is back" for signed-in shoppers;
each waiting shopper gets one email when you mark it available again.

## Deals & shipping

- **Cart deal:** a discount for a line that has waited a set number of days
  in a cart, never below cost, card fees and a margin floor.
- **Free-shipping threshold**, with a meter in the cart.
- **"N others have this in their cart"**, counted honestly: carts touched
  this week, one per person, never the viewer. On by default.

The deal and the threshold are **off** until you turn them on here, and they
need `20260918_shop_growth.sql` applied. Until then the panel shows the
defaults and nothing is discounted.

## Orders

- **Orders**: every paid order. An unfinished checkout is never shown as an
  order; a sweep closes abandoned ones and settles any payment the webhook
  missed.
- **Fulfillment**: the eight stages from paid to posted, what each is
  waiting for, and what is late.
- Adding a **tracking number** emails the buyer the number, the carrier and
  a link to follow the parcel. Saving twice sends one email.
- A paid order with no address gets a polite email asking for one.
- Some days after delivery, the buyer gets a short care guide.
- **Packing slip** prints from the order.

## Deleting

**Delete** is soft: orders keep their record, the slug stays reserved, and
the **deleted** filter lists what was removed with a **Restore** button.

## Before a public test

Add one real product from your phone, then buy it with Stripe in test mode,
and follow it through Orders and Fulfillment to a tracking email. That walk
is the definition of done for the shop in the 1.4 plan.
