// Master flag for the Trapeza recipe board, mirroring the shop and campaigns
// flags. Unset = /trapeza shows a "coming soon" shell and the API 404s. Set
// NEXT_PUBLIC_TRAPEZA_ENABLED=1 once 20260713_trapeza_recipes.sql is applied.

export function trapezaEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_TRAPEZA_ENABLED;
  return v === "1" || v === "true";
}
