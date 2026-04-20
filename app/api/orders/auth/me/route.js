import { getSession } from "@/lib/orders/session";

export const runtime = "nodejs";

export async function GET() {
  const s = getSession();
  if (!s) return Response.json({ authenticated: false });
  return Response.json({
    authenticated: true,
    role: s.role,
    email: s.email || null,
    name: s.name || null,
    clientIds: s.clientIds || [],
  });
}
