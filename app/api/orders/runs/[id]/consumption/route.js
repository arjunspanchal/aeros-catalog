import { requireAdmin } from "@/lib/orders/session";
import { recordConsumption } from "@/lib/orders/repo";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  try {
    const s = requireAdmin();
    const body = await req.json();
    if (!body.stockLineId) {
      return Response.json({ error: "Stock line required" }, { status: 400 });
    }
    if (!body.qtyKgs || Number(body.qtyKgs) <= 0) {
      return Response.json({ error: "Qty (kgs) must be positive" }, { status: 400 });
    }
    const result = await recordConsumption({
      runId: params.id,
      stockLineId: body.stockLineId,
      qtyKgs: Number(body.qtyKgs),
      operatorEmail: body.operatorEmail || s.email || "",
      notes: body.notes || "",
    });
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: e.message || "Failed" }, { status: 400 });
  }
}
