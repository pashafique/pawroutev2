import Link from 'next/link';
import { appConfig } from '@pawroute/config';
import ChatWidget from '../../components/ChatWidget';
import AuthGuard from '../../components/AuthGuard';

const c = appConfig.brand.colors;

const navItems = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/pets', label: 'My Pets', icon: '🐾' },
  { href: '/services', label: 'Services', icon: '✂️' },
  { href: '/appointments', label: 'Bookings', icon: '📅' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F7FF' }}>
      {/* Top nav */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: c.primary }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <span className="text-white font-bold text-lg">{appConfig.product.name}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg px-3 py-1.5 text-sm font-medium transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t z-50"
        style={{ borderColor: c.lavenderDark }}>
        <div className="flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs"
              style={{ color: c.textSecondary }}>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="md:hidden h-16" />
      <ChatWidget />
    </div>
    </AuthGuard>
  );
}
