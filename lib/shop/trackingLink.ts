// Carrier detection for outbound tracking numbers, so a buyer's order page
// can link straight to live package tracking. Heuristics over the number
// alone (that is all we store). Order matters: USPS's 92-95 prefixed
// numbers are 20+ digits and would otherwise read as FedEx. Anything
// unrecognized falls back to 17TRACK's universal tracker, which resolves
// numbers from hundreds of carriers (the common case for supplier-routed
// parcels like YunExpress or 4PX).

export type TrackingLink = { carrier: string | null; url: string };

export function trackingLink(raw: string): TrackingLink | null {
  const num = raw.replace(/\s+/g, "").toUpperCase();
  if (!num) return null;
  const n = encodeURIComponent(num);

  if (/^1Z[0-9A-Z]{16}$/.test(num)) {
    return { carrier: "UPS", url: `https://www.ups.com/track?tracknum=${n}` };
  }
  if (/^9[2-5]\d{18,24}$/.test(num) || /^[A-Z]{2}\d{9}US$/.test(num)) {
    return {
      carrier: "USPS",
      url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
    };
  }
  if (/^\d{10}$/.test(num)) {
    return {
      carrier: "DHL",
      url: `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,
    };
  }
  if (/^(\d{12}|\d{15}|\d{20}|\d{22})$/.test(num)) {
    return {
      carrier: "FedEx",
      url: `https://www.fedex.com/fedextrack/?trknbr=${n}`,
    };
  }
  return { carrier: null, url: `https://t.17track.net/en#nums=${n}` };
}
