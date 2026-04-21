import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/calc/session";

export default function CalculatorPickerPage() {
  const session = getSession();
  if (!session) redirect("/login");

  const rolePath = session.role === "admin" ? "admin" : "client";
  const products = [
    {
      href: `/calculator/${rolePath}`,
      title: "Paper Bag Rate Calculator",
      desc: "SOS, handle and V-bottom bags. Live paper + print + pasting cost breakdown.",
      accent: "from-blue-600 to-indigo-700",
    },
    {
      href: `/calculator/${rolePath}/box`,
      title: "Custom Box Rate Calculator",
      desc: "Cake, clam, boat tray and burger boxes. Die-cut + pasting + printing cost.",
      accent: "from-emerald-600 to-teal-700",
    },
    {
      href: `/calculator/${rolePath}/cup`,
      title: "Paper Cup Rate Calculator",
      desc: "Single-wall, double-wall and ripple cups with coating, printing and margin breakdown.",
      accent: "from-amber-600 to-orange-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">Aeros Rate Calculators</h1>
        <p className="text-sm text-gray-500 mb-8 dark:text-gray-400">Pick a product to start a quote.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={`block rounded-xl p-6 text-white shadow-sm bg-gradient-to-br ${p.accent} hover:shadow-md transition-shadow`}
            >
              <h2 className="text-lg font-semibold mb-1">{p.title}</h2>
              <p className="text-sm text-white/80">{p.desc}</p>
              <p className="text-xs text-white/70 mt-4">Open →</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
