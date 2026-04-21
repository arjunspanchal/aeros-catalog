import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/orders/session";
import { listEmployees, listAttendance, listUsers } from "@/lib/orders/repo";
import { ROLES } from "@/lib/orders/constants";
import {
  currentMonthKeyIST,
  monthEnd,
  monthStart,
} from "@/lib/orders/hr";
import NavBar from "@/app/orders/_components/NavBar";
import CalendarView from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }) {
  const s = getSession();
  if (!s) redirect("/orders/login");
  if (s.role !== ROLES.ADMIN && s.role !== ROLES.FACTORY_MANAGER) redirect("/orders");

  const monthKey = (searchParams?.month && /^\d{4}-\d{2}$/.test(searchParams.month))
    ? searchParams.month
    : currentMonthKeyIST();

  const [allEmployees, users] = await Promise.all([
    listEmployees(),
    listUsers(),
  ]);

  const isAdmin = s.role === ROLES.ADMIN;
  const showAll = isAdmin;
  const employees = isAdmin
    ? allEmployees
    : allEmployees.filter((e) => e.managerId === s.userId);

  const from = monthStart(monthKey);
  const to = monthEnd(monthKey);

  // Fetch attendance once for the whole month, then split per employee.
  // Restricted to visible employees so other managers' rows never ship to the client.
  const visibleIds = new Set(employees.map((e) => e.id));
  const allAttendance = await listAttendance({ from, to });
  const byEmployee = {};
  for (const r of allAttendance) {
    if (!visibleIds.has(r.employeeId)) continue;
    if (!byEmployee[r.employeeId]) byEmployee[r.employeeId] = [];
    byEmployee[r.employeeId].push(r);
  }

  const managerMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar role={s.role} name={s.name} email={s.email} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/orders/admin/hr" className="text-xs text-gray-500 hover:text-blue-700 dark:text-gray-400 dark:hover:text-blue-400">
          ← HR
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 dark:text-white">Attendance calendar</h1>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
          P = Present · A = Absent · H = Half-day. Green borders = OT logged.
        </p>
        <CalendarView
          monthKey={monthKey}
          employees={employees}
          attendanceByEmployee={byEmployee}
          managerMap={managerMap}
          canToggleScope={s.role === ROLES.ADMIN}
          showingAll={showAll}
        />
      </main>
    </div>
  );
}
