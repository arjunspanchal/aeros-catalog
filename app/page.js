import Link from 'next/link';
import Footer from './components/Footer';

export const metadata = {
  title: 'Aeros',
  description: 'Paper packaging — clearance stock, product catalog, and rate calculator.',
};

const OPTIONS = [
  {
    href: '/clearance',
    title: 'Clearance Stock',
    description: 'Ready-to-ship packaging inventory, available for immediate dispatch.',
    accent: 'from-amber-500 to-orange-600',
  },
  {
    href: '/catalog',
    title: 'Product Catalogue',
    description: 'Our full range of paper cups, bags, boxes, and tubes.',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    href: '/calculator',
    title: 'Paper Bag Rate Calculator',
    description: 'Generate a live bag quote — pick your specs, see the rate.',
    accent: 'from-blue-600 to-indigo-700',
  },
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900">
            Welcome to Aeros
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Paper packaging manufactured in India. Pick what you&apos;re here for.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {OPTIONS.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-6 shadow-sm transition-all hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${o.accent}`} />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-1">{o.title}</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{o.description}</p>
              <p className="mt-4 text-sm font-medium text-blue-700 group-hover:text-blue-800">
                Enter →
              </p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
