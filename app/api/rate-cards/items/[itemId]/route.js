// Per-item update / delete. Admin only.

import { requireRateCardAdmin } from "@/lib/rate-cards/auth";
import { updateItem, deleteItem } from "@/lib/rate-cards/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  try { requireRateCardAdmin(); } catch (r) { return r; }
  const body = await req.json();
  const item = await updateItem(params.itemId, body);
  return Response.json(item);
}

export async function DELETE(_req, { params }) {
  try { requireRateCardAdmin(); } catch (r) { return r; }
  await deleteItem(params.itemId);
  return Response.json({ ok: true });
}
