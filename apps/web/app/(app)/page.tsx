import HomeView from './home-view';

// Force dynamic rendering so Next.js generates page_client-reference-manifest.js
// (required by Vercel's file tracer for route groups with client components)
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <HomeView />;
}
