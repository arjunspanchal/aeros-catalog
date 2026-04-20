import './globals.css';

export const metadata = {
  title: 'Aeros Packaging',
  description: 'Browse our clearance packaging inventory and full product catalog. Inquire via WhatsApp or email.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
