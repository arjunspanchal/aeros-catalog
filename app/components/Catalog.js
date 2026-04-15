'use client';

import { useMemo, useState } from 'react';
import ItemCard from './ItemCard';

export default function Catalog({ items, categories }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      if (!showOutOfStock && item.stockQuantity === 0) return false;

      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      if (q) {
        const haystack = `${item.itemName} ${item.brand} ${item.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [items, query, selectedCategory, showOutOfStock]);

  return (
    <div>
      {/* Search + filter controls */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by item name, brand, or category…"
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <CategoryChip
            active={selectedCategory === 'All'}
            onClick={() => setSelectedCategory('All')}
          >
            All ({items.filter((i) => showOutOfStock || i.stockQuantity !== 0).length})
          </CategoryChip>
          {categories.map((cat) => (
            <CategoryChip
              key={cat}
              active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </CategoryChip>
          ))}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showOutOfStock}
            onChange={(e) => setShowOutOfStock(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Show out-of-stock items
        </label>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{filteredItems.length}</span>{' '}
        {filteredItems.length === 1 ? 'item' : 'items'}
        {query && (
          <>
            {' '}
            for &ldquo;<span className="font-semibold text-gray-900">{query}</span>&rdquo;
          </>
        )}
        {selectedCategory !== 'All' && (
          <>
            {' '}in <span className="font-semibold text-gray-900">{selectedCategory}</span>
          </>
        )}
      </p>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">No items match your search. Try a different term or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-full px-4 py-1.5 text-sm font-medium transition ' +
        (active
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50')
      }
    >
      {children}
    </button>
  );
}
