// Clears all three cookies so the user is signed out of every module at once.
import { cookies } from "next/headers";
import { clearCookie as clearHub } from "@/lib/hub/auth";
import { clearCookie as clearCalc } from "@/lib/calc/auth";
import { clearCookie as clearOrders } from "@/lib/orders/auth";

export const runtime = "nodejs";

export async function POST() {
  const jar = cookies();
  jar.set(clearHub());
  jar.set(clearCalc());
  jar.set(clearOrders());
  return Response.json({ ok: true });
}
