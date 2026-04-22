import AppHeader from "@/app/components/AppHeader";
import { getSession } from "@/lib/hub/session";

// Every /rate-cards page shares the unified header + sub-tabs defined in AppHeader.
export default function RateCardsLayout({ children }) {
  const session = getSession();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader session={session} />
      <div>{children}</div>
    </div>
  );
}
