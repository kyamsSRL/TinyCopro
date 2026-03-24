'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const locale = pathname.split('/')[1] || 'fr';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      window.location.href = `/${locale}/login/${search}`;
    }
  }, [user, loading, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
