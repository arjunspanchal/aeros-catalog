'use client';
// Shared theme toggle. Flips the `dark` class on <html>, persists the preference
// in BOTH a cookie and localStorage, so the server can read it on the next
// render (preventing hydration-induced theme flashes) and the client can still
// hydrate before the server has responded.
import { useEffect, useState } from 'react';

function writeThemeCookie(value) {
  // 1-year, root path, Lax so it's sent on every same-site nav.
  document.cookie = `aeros_theme=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function ThemeToggle({ className = '' }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    const value = next ? 'dark' : 'light';
    try { localStorage.setItem('aeros_theme', value); } catch {}
    writeThemeCookie(value);
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-yellow-300 dark:border-gray-700 dark:hover:bg-gray-700 ${className}`}
    >
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
