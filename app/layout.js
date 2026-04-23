import './globals.css';

export const metadata = {
  title: 'Aeros Packaging',
  description: 'Browse our clearance packaging inventory and full product catalog. Inquire via WhatsApp or email.',
};

// Inline script that runs before React hydrates so the `dark` class is set on
// <html> up front. Without this there's a white flash on dark-mode pages.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('aeros_theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning on <html> is required because THEME_INIT_SCRIPT
    // mutates documentElement.classList before React hydrates. Without it,
    // React detects the mismatch vs. the server-rendered HTML (no `dark`
    // class) and strips the class to match — flipping the theme to light on
    // every reload.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
