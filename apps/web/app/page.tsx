import { appConfig } from '@pawroute/config';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-alt">
      <div className="text-center space-y-4">
        <div
          className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
          style={{ backgroundColor: appConfig.brand.colors.primary }}
        >
          <span className="text-4xl">🐾</span>
        </div>
        <h1 className="text-4xl font-bold text-primary">{appConfig.product.name}</h1>
        <p className="text-xl text-secondary font-medium">{appConfig.product.tagline}</p>
        <p className="text-text-secondary max-w-md">{appConfig.product.shortDescription}</p>
        <div className="flex gap-3 justify-center pt-2">
          <a href="/register" className="btn-primary">Get Started</a>
          <a href="/services" className="btn-accent">View Services</a>
        </div>
      </div>
    </main>
  );
}
