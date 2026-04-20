"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function NavBar({ role, email }) {
  const path = usePathname();
  const router = useRouter();
  // `short` shows on phones; `label` on sm+ screens. Keeps long-name tabs readable on mobile.
  const adminLinks = [
    { href: "/calculator/admin", label: "Paper Bag Rate Calculator", short: "Calculator" },
    { href: "/calculator/admin/history", label: "Quote History", short: "History" },
    { href: "/calculator/admin/clients", label: "Clients", short: "Clients" },
    { href: "/calculator/admin/rates", label: "Mill Rates", short: "Rates" },
  ];
  const clientLinks = [
    { href: "/calculator/client", label: "Paper Bag Rate Calculator", short: "Calculator" },
    { href: "/calculator/client/quotes", label: "My Quotes", short: "Quotes" },
  ];
  const links = role === "admin" ? adminLinks : clientLinks;

  async function logout() {
    await fetch("/api/calc/auth/logout", { method: "POST" });
    router.push("/calculator/login");
  }

  return (
    <nav className="bg-white border-b border-gray-100 mb-4 sm:mb-6">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3">
        {/* Top row: home link + identity/signout */}
        <div className="flex items-center justify-between gap-3 mb-2 sm:mb-0">
          <Link href="/" className="font-semibold text-gray-900 text-sm hover:text-blue-700 shrink-0" title="Back to Aeros home">← Aeros</Link>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-500 truncate max-w-[160px] sm:max-w-none">
              {role === "admin" ? "Admin" : email}
            </span>
            <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-700">Sign out</button>
          </div>
        </div>
        {/* Tabs — horizontally scrollable on mobile, inline on desktop */}
        <div className="flex gap-1 overflow-x-auto -mx-1 px-1 sm:mt-2">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link key={l.href} href={l.href}
                className={`shrink-0 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}>
                <span className="sm:hidden">{l.short}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
