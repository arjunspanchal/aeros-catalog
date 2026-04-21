import AppHeader from "@/app/components/AppHeader";
import Footer from "@/app/components/Footer";
import { getSession } from "@/lib/hub/session";

// Wraps every /factoryos page with the shared AppHeader + a footer. Child pages
// render inside {children} and should no longer render their own NavBar.
export default function FactoryosLayout({ children }) {
  const session = getSession();
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <AppHeader session={session} />
      <div className="flex-1">{children}</div>
      <Footer note="FactoryOS — operations for the Aeros team." />
    </div>
  );
}
