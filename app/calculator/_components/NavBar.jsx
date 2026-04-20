"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function NavBar({ role, email }) {
  const path = usePathname();
  const router = useRouter();
  const adminLinks = [
    { href: "/calculator/admin", label: "Calculator" },
    { href: "/calculator/admin/history", label: "Quote History" },
    { href: "/calculator/admin/clients", label: "Clients" },
  ];
  const clientLinks = [
    { href: "/calculator/client", label: "Calculator" },
    { href: "/calculator/client/quotes", label: "My Quotes" },
  ];
  const links = role === "admin" ? adminLinks : clientLinks;

  async function logout() {
    await fetch("/api/calc/auth/logout", { method: "POST" });
    router.push("/calculator/login");
  }

  return (
    <nav className="bg-white border-b border-gray-100 mb-6">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-gray-900 text-sm hover:text-blue-700" title="Back to Aeros home">← Aeros</Link>
          <div className="flex gap-1">
            {links.map((l) => {
              const active = path === l.href;
              return (
                <Link key={l.href} href={l.href} className={`text-sm px-3 py-1.5 rounded-lg ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {role === "admin" ? (
            <span className="text-xs text-gray-500">Admin</span>
          ) : (
            <span className="text-xs text-gray-500">{email}</span>
          )}
          <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </div>
    </nav>
  );
}
