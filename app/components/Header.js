// Page-level hero row: title + subtitle + optional count. Site-wide nav is
// handled by AppHeader — don't add nav links here.

export default function Header({
  title = 'Aeros Clearance Stock',
  subtitle = 'Clearance packaging inventory — available for immediate dispatch',
  itemCount,
  itemLabel = 'items in stock',
}) {
  return (
    <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl truncate">
              {title}
            </h1>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 sm:text-base">{subtitle}</p>
          </div>
          {itemCount !== undefined && (
            <div className="hidden text-right sm:block shrink-0">
              <p className="text-3xl font-bold text-brand-600">{itemCount}</p>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{itemLabel}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
