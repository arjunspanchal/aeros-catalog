import './globals.css';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Aeros Packaging',
  description: 'Browse our clearance packaging inventory and full product catalog. Inquire via WhatsApp or email.',
};

// First-visit fallback: before a cookie is written, respect the system color
// scheme. Runs synchronously in <head> so there's no flash.
const THEME_BOOT_SCRIPT = `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)aeros_theme=([^;]+)/);if(c)return;if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default async function RootLayout({ children }) {
  // Server-read the theme cookie so the `dark` class is baked into the HTML
  // we send. This eliminates the hydration mismatch that caused dark mode to
  // flip to light on every refresh. The ThemeToggle writes this cookie in
  // sync with localStorage.
  const theme = (await cookies()).get('aeros_theme')?.value;
  const htmlClass = theme === 'dark' ? 'dark' : '';

  return (
    <html lang="en" className={htmlClass} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
