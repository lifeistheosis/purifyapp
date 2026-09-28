// Master flag for the Kitchen (the recipe catalogue once called the Trapeza),
// mirroring the shop and campaigns flags. Unset = /kitchen shows a "coming
// soon" shell and the API 404s. Set NEXT_PUBLIC_TRAPEZA_ENABLED=1 once
// 20260713_trapeza_recipes.sql is applied. The variable keeps its old name:
// it is set on Render and in every build.

export function trapezaEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_TRAPEZA_ENABLED;
  return v === "1" || v === "true";
}
