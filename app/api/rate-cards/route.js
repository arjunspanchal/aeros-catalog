// List rate cards (client → own only, admin → all) and create new ones (admin).

import {
  getRateCardSession, requireRateCardSession, requireRateCardAdmin,
} from "@/lib/rate-cards/auth";
import { listCards, createCard } from "@/lib/rate-cards/store";
import { nextCardRef } from "@/lib/rate-cards/ref";

export const runtime = "nodejs";

export async function GET() {
  let session;
  try { session = requireRateCardSession(); } catch (r) { return r; }
  const opts = {};
  if (session.rateCardRole !== "admin") {
    opts.clientEmail = session.email;
  }
  const cards = await listCards(opts);
  return Response.json(cards);
}

export async function POST(req) {
  try { requireRateCardAdmin(); } catch (r) { return r; }
  const body = await req.json();
  const clientEmail = (body.clientEmail || "").trim().toLowerCase();
  if (!clientEmail) return Response.json({ error: "clientEmail required" }, { status: 400 });

  const ref = body.ref || await nextCardRef({
    clientEmail,
    clientName: body.clientName,
    brand: body.brand,
  });

  const card = await createCard({
    ref,
    title: body.title,
    clientEmail,
    clientName: body.clientName,
    brand: body.brand,
    status: body.status || "Draft",
    terms: body.terms,
  });
  return Response.json(card);
}
