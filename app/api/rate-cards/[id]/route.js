// One rate card: fetch (header + priced items), update header, delete card.

import { requireRateCardSession, requireRateCardAdmin } from "@/lib/rate-cards/auth";
import { getCard, updateCard, deleteCard, listItems } from "@/lib/rate-cards/store";
import { priceAll } from "@/lib/rate-cards/pricing";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  let session;
  try { session = requireRateCardSession(); } catch (r) { return r; }
  const card = await getCard(params.id);
  if (!card) return Response.json({ error: "Not found" }, { status: 404 });

  if (session.rateCardRole !== "admin" && card.clientEmail !== session.email) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await listItems(card.ref);
  const priced = priceAll(items);
  return Response.json({ card, items: priced });
}

export async function PATCH(req, { params }) {
  try { requireRateCardAdmin(); } catch (r) { return r; }
  const body = await req.json();
  const updated = await updateCard(params.id, body);
  return Response.json(updated);
}

export async function DELETE(_req, { params }) {
  try { requireRateCardAdmin(); } catch (r) { return r; }
  await deleteCard(params.id);
  return Response.json({ ok: true });
}
