'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function HomePage() {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  useEffect(() => {
    window.location.href = `/${locale}/copros/`;
  }, [locale]);

  return null;
}
