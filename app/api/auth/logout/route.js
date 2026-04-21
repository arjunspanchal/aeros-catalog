// Clears all three cookies so the user is signed out of every module at once.
import { cookies } from "next/headers";
import { clearCookie as clearHub } from "@/lib/hub/auth";
import { clearCookie as clearCalc } from "@/lib/calc/auth";
import { clearCookie as clearFactoryos } from "@/lib/factoryos/auth";

export const runtime = "nodejs";

export async function POST() {
  const jar = cookies();
  jar.set(clearHub());
  jar.set(clearCalc());
  jar.set(clearFactoryos());
  return Response.json({ ok: true });
}
