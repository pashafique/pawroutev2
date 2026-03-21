import { appConfig } from '@pawroute/config';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const c = appConfig.brand.colors;
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 100%)` }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐾</div>
          <h1 className="text-3xl font-bold text-white">{appConfig.product.name}</h1>
          <p className="text-white/70 mt-1">{appConfig.product.tagline}</p>
        </div>
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
