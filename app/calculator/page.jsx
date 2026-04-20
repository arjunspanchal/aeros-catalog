import { redirect } from "next/navigation";
import { getSession } from "@/lib/calc/session";

export default function RootPage() {
  const session = getSession();
  if (!session) redirect("/calculator/login");
  redirect(session.role === "admin" ? "/calculator/admin" : "/calculator/client");
}
