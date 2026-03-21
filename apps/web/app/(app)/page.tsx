import { cookies } from 'next/headers';
import HomeView from './home-view';

// Reading cookies at request time forces dynamic rendering,
// which causes Next.js to generate page_client-reference-manifest.js
// (required by Vercel's file tracer for route groups)
export default function HomePage() {
  cookies(); // opt out of static prerendering
  return <HomeView />;
}
