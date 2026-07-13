import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { getRecipe } from "@/lib/trapeza/catalog";
import { trapezaEnabled } from "@/lib/trapeza/flags";

/** Read one published recipe. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!trapezaEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }
  return withCors(
    NextResponse.json(
      { recipe },
      { headers: { "Cache-Control": "public, max-age=60" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
