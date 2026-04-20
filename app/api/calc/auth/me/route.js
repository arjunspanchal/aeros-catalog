import { cookies } from "next/headers";
import { verifySession, COOKIE } from "@/lib/calc/auth";

export const runtime = "nodejs";

export async function GET() {
  const token = cookies().get(COOKIE)?.value;
  const session = verifySession(token);
  if (!session) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: true, ...session });
}
