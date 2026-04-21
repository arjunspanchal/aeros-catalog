// Create a new line item on a given rate card. Admin only.

import { requireRateCardAdmin } from "@/lib/rate-cards/auth";
import { getCard, createItem } from "@/lib/rate-cards/store";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  try { requireRateCardAdmin(); } catch (r) { return r; }
  const card = await getCard(params.id);
  if (!card) return Response.json({ error: "Rate card not found" }, { status: 404 });
  const body = await req.json();
  const item = await createItem({ cardId: card.id, cardRef: card.ref }, body);
  return Response.json(item);
}
