import { redirect } from "next/navigation";
import { getSession } from "@/lib/factoryos/session";
import { ROLES } from "@/lib/factoryos/constants";

export const dynamic = "force-dynamic";

export default function OrdersRoot() {
  const s = getSession();
  if (!s) redirect("/login");
  if (s.role === ROLES.ADMIN) redirect("/factoryos/admin");
  if (s.role === ROLES.CUSTOMER) redirect("/factoryos/customer");
  redirect("/factoryos/manager");
}
