import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/clearance', label: 'Clearance Stock', key: 'clearance' },
  { href: '/catalog', label: 'Product Catalog', key: 'catalog' },
  { href: '/calculator', label: 'Rate Calculator', key: 'calculator' },
];

export default function Header({
  title = 'Aeros Clearance Stock',
  subtitle = 'Clearance packaging inventory — available for immediate dispatch',
  itemCount,
  itemLabel = 'items in stock',
  activeNav = 'clearance',
}) {
  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Top bar: logo + count */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl truncate">
              {title}
            </h1>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 sm:text-base">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {itemCount !== undefined && (
              <div className="hidden text-right sm:block">
                <p className="text-3xl font-bold text-brand-600">{itemCount}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{itemLabel}</p>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Nav tabs — horizontally scrollable on narrow viewports so labels don't wrap */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px mt-4 flex gap-4 sm:gap-6 overflow-x-auto" aria-label="Site navigation">
          {NAV_LINKS.map(({ href, label, key }) => (
            <Link
              key={key}
              href={href}
              className={
                'shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition ' +
                (activeNav === key
                  ? 'border-brand-600 text-brand-700 dark:text-brand-500'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200')
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
