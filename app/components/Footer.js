export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-gray-900">Aeros Clearance Stock</p>
            <p className="mt-1 text-xs text-gray-500">
              All items subject to availability. Inquire for current pricing.
            </p>
          </div>
          <div className="text-xs text-gray-500">
            <p>WhatsApp: +91 79770 07497</p>
            <p>Email: clearance@aeros-x.com</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
