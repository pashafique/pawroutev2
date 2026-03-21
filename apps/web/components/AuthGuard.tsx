'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Client-side auth guard.
 * Redirects to /login if there is no accessToken in localStorage.
 * Renders nothing until the check is complete to avoid a flash of protected content.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-4xl animate-bounce">🐾</span>
      </div>
    );
  }

  return <>{children}</>;
}
