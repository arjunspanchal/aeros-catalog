import AppHeader from "@/app/components/AppHeader";
import { getSession } from "@/lib/hub/session";

// Wraps every /calculator page with the shared AppHeader. Child pages render
// inside {children} and should no longer render their own NavBar.
export default function CalculatorLayout({ children }) {
  const session = getSession();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader session={session} />
      <div>{children}</div>
    </div>
  );
}
