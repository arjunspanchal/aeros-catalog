import './globals.css';
import ChatWidget from './components/ChatWidget';
import WhatsAppButton from './components/WhatsAppButton';

export const metadata = {
  title: 'Aeros Packaging',
  description: 'Browse our clearance packaging inventory and full product catalog. Inquire via WhatsApp or email.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
        <WhatsAppButton />
        <ChatWidget />
      </body>
    </html>
  );
}
