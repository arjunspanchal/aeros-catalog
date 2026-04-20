import HomeClient from './HomeClient';
import Footer from './components/Footer';

export const metadata = {
  title: 'Aeros',
  description: 'Paper packaging — clearance stock, product catalog, and rate calculator.',
};

export default function WelcomePage() {
  return <HomeClient footer={<Footer />} />;
}
