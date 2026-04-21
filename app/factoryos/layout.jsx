import Footer from "@/app/components/Footer";

// Wrapping every /orders page in a flex column so the Footer sits
// at the bottom even on short pages. The page's own <main> and NavBar
// render inside `children`.
export default function OrdersLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>
      <Footer note="Order tracking for Aeros customers and team." />
    </div>
  );
}
