"use client";
// Single unified top header for every page across every module. Row 1: brand
// "Aeros · {Module}" + per-user module switcher + identity + sign-out + theme.
// Row 2: module-specific sub-tabs derived from the current pathname + session.
//
// This component is the ONE place where cross-module nav is defined — modules
// should not render their own top bars. Sub-page layouts handle their own
// body chrome below the header.
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const MODULES = [
  { key: "calculator",  label: "Calculator",  href: "/calculator"  },
  { key: "rate_cards",  label: "Rate Cards",  href: "/rate-cards"  },
  { key: "factoryos",   label: "FactoryOS",   href: "/factoryos"   },
  { key: "catalogue",   label: "Catalogue",   href: "/catalog"     },
  { key: "clearance",   label: "Clearance",   href: "/clearance"   },
];

function activeModuleKey(pathname) {
  if (pathname.startsWith("/calculator")) return "calculator";
  if (pathname.startsWith("/rate-cards")) return "rate_cards";
  if (pathname.startsWith("/factoryos"))  return "factoryos";
  if (pathname.startsWith("/catalog"))    return "catalogue";
  if (pathname.startsWith("/clearance"))  return "clearance";
  return null;
}

// Derive sub-tabs from the current module + the user's role within that module.
// Returning [] means the header shows only the top row.
function subTabsFor(pathname, session) {
  const active = activeModuleKey(pathname);
  if (!active) return [];

  if (active === "calculator") {
    const role = session?.modules?.calculator;
    if (role === "admin") {
      return [
        { href: "/calculator/admin",          label: "Bag",      short: "Bag" },
        { href: "/calculator/admin/box",      label: "Box",      short: "Box" },
        { href: "/calculator/admin/cup",      label: "Cup",      short: "Cup" },
        { href: "/calculator/admin/pp",       label: "PP",       short: "PP" },
        { href: "/calculator/admin/history",  label: "History",  short: "History" },
        { href: "/calculator/admin/clients",  label: "Clients",  short: "Clients" },
        { href: "/calculator/admin/rates",    label: "Rates",    short: "Rates" },
      ];
    }
    if (role === "client") {
      return [
        { href: "/calculator/client",         label: "Bag",       short: "Bag" },
        { href: "/calculator/client/box",     label: "Box",       short: "Box" },
        { href: "/calculator/client/cup",     label: "Cup",       short: "Cup" },
        { href: "/calculator/client/quotes",  label: "My Quotes", short: "Quotes" },
      ];
    }
    return [];
  }

  if (active === "factoryos") {
    const role = session?.modules?.factoryos;
    if (role === "customer") {
      return [
        { href: "/factoryos/customer",          label: "My Orders",      short: "Orders"   },
        { href: "/factoryos/customer/pos",      label: "Purchase Orders", short: "POs"     },
        { href: "/factoryos/customer/profile",  label: "Profile",        short: "Profile"  },
      ];
    }
    const internal = role === "admin" || role === "account_manager" || role === "factory_manager" || role === "factory_executive";
    const adminish = role === "admin" || role === "factory_manager";
    const tabs = [];
    if (internal) {
      tabs.push({ href: "/factoryos/manager",      label: "Jobs",         short: "Jobs" });
      tabs.push({ href: "/factoryos/manager/pos",  label: "Customer POs", short: "POs"  });
    }
    if (adminish) {
      tabs.push({ href: "/factoryos/admin",                  label: "Admin",      short: "Admin" });
      tabs.push({ href: "/factoryos/admin/hr/attendance",    label: "Attendance", short: "Attn"  });
    }
    return tabs;
  }

  if (active === "rate_cards") {
    const role = session?.modules?.rate_cards;
    if (role === "admin") {
      return [
        { href: "/rate-cards",            label: "All Cards",   short: "All"    },
        { href: "/rate-cards/admin/new",  label: "+ New Card",  short: "New"    },
      ];
    }
    if (role === "client") {
      return [
        { href: "/rate-cards", label: "My Rate Cards", short: "Cards" },
      ];
    }
    return [];
  }

  if (active === "catalogue") {
    // Show a Manage tab for Admin / Factory Manager / Factory Executive.
    // Everyone else just sees the catalogue — no sub-tabs needed.
    const role = session?.modules?.factoryos;
    const canEdit = role === "admin" || role === "factory_manager" || role === "factory_executive";
    if (canEdit || session?.isAdmin) {
      return [
        { href: "/catalog",         label: "Catalogue", short: "Browse" },
        { href: "/catalog/manage",  label: "Manage",    short: "Manage" },
      ];
    }
    return [];
  }

  if (active === "clearance") {
    // Show a Manage tab for anyone with manage access. The base /clearance
    // tab is implicit (home of the module).
    const role = session?.modules?.factoryos;
    const adminish = role === "admin" || role === "factory_manager" || role === "factory_executive";
    if (adminish || session?.isAdmin) {
      return [
        { href: "/clearance",         label: "Stock",  short: "Stock"  },
        { href: "/clearance/manage",  label: "Manage", short: "Manage" },
      ];
    }
    return [];
  }

  return [];
}

function moduleLabel(key) {
  return MODULES.find((m) => m.key === key)?.label || "";
}

export default function AppHeader({ session }) {
  const router = useRouter();
  const pathname = usePathname();
  const active = activeModuleKey(pathname);
  const modules = session?.modules || {};
  const available = MODULES.filter((m) => !!modules[m.key]);
  const subTabs = subTabsFor(pathname, session);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const identity = session?.isAdmin ? "Admin" : session?.email;
  const brandSuffix = active ? ` · ${moduleLabel(active)}` : "";

  return (
    <header className="bg-white border-b border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
        {/* Row 1 — brand, module switcher, identity */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <Link href="/" className="font-semibold text-gray-900 text-sm hover:text-blue-700 shrink-0 dark:text-white dark:hover:text-blue-400 whitespace-nowrap">
              Aeros<span className="text-gray-400 dark:text-gray-500">{brandSuffix}</span>
            </Link>
            {available.length > 0 && (
              <nav className="flex gap-1 overflow-x-auto -mx-1 px-1">
                {available.map((m) => {
                  const isActive = active === m.key;
                  return (
                    <Link
                      key={m.key}
                      href={m.href}
                      className={`shrink-0 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg ${
                        isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      {m.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-500 truncate max-w-[140px] sm:max-w-[200px] dark:text-gray-400">
              {identity}
            </span>
            <button
              onClick={logout}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Sign out
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Row 2 — module sub-tabs (if any) */}
        {subTabs.length > 0 && (
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pt-2 mt-1 border-t border-gray-100 dark:border-gray-800">
            {subTabs.map((t) => {
              const isActive = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`shrink-0 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="sm:hidden">{t.short || t.label}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
