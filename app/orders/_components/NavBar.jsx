"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function NavBar({ role, name, email }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const isInternal =
    role === "admin" || role === "account_manager" || role === "factory_manager" || role === "factory_executive";

  return (
    <nav className="border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link href="/orders" className="font-semibold text-gray-900 dark:text-white">
            Aeros Orders
          </Link>
          {isInternal && (
            <>
              <Link href="/orders/manager" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Jobs
              </Link>
              <Link href="/orders/manager/pos" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Customer POs
              </Link>
            </>
          )}
          {(role === "admin" || role === "factory_manager") && (
            <>
              <Link href="/orders/admin" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Admin
              </Link>
              <Link href="/orders/admin/hr/attendance" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Attendance
              </Link>
            </>
          )}
          {role === "customer" && (
            <>
              <Link href="/orders/customer" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                My orders
              </Link>
              <Link href="/orders/customer/pos" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Purchase orders
              </Link>
              <Link href="/orders/customer/profile" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Profile
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
            {(() => {
              const who = name || email;
              const roleLabel = role?.replace("_", " ") || "";
              // Admin's session name is literally "Admin" — avoid "Admin · admin".
              if (!who || who.trim().toLowerCase() === roleLabel.toLowerCase()) {
                return <span className="capitalize">{roleLabel}</span>;
              }
              return (
                <>
                  {who} · <span className="capitalize">{roleLabel}</span>
                </>
              );
            })()}
          </span>
          <ThemeToggle />
          <button
            onClick={logout}
            className="text-xs text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
