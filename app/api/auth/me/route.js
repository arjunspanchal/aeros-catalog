import { getSession } from "@/lib/hub/session";

export const runtime = "nodejs";

export async function GET() {
  const session = getSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, session });
}
