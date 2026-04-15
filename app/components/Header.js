export default function Header({ itemCount }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Aeros Clearance Stock
            </h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              Clearance packaging inventory — available for immediate dispatch
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-3xl font-bold text-brand-600">{itemCount}</p>
            <p className="text-xs uppercase tracking-wide text-gray-500">items in stock</p>
          </div>
        </div>
      </div>
    </header>
  );
}
