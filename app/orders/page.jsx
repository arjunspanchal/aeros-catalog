import { redirect } from "next/navigation";
import { getSession } from "@/lib/orders/session";
import { ROLES } from "@/lib/orders/constants";

export const dynamic = "force-dynamic";

export default function OrdersRoot() {
  const s = getSession();
  if (!s) redirect("/orders/login");
  if (s.role === ROLES.ADMIN) redirect("/orders/admin");
  if (s.role === ROLES.CUSTOMER) redirect("/orders/customer");
  redirect("/orders/manager");
}
