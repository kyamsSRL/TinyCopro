'use client';

import { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { CoproDetailShell } from '@/components/copro/CoproDetailShell';
import { CoproDashboardPageContent } from '@/components/pages/CoproDashboardPage';
import { DepensesPageContent } from '@/components/pages/DepensesPage';
import { PaiementsPageContent } from '@/components/pages/PaiementsPage';
import { MembresPageContent } from '@/components/pages/MembresPage';
import { ParametresPageContent } from '@/components/pages/ParametresPage';

/**
 * Extract the slug from the pathname when useParams returns empty slug.
 * In static export, [[...slug]] is pre-rendered with slug=[] but
 * the client URL has the actual path segments.
 */
function useSlug(): string[] {
  const params = useParams();
  const pathname = usePathname();
  const paramSlug = params.slug as string[] | undefined;

  if (paramSlug && paramSlug.length > 0) return paramSlug;

  // Fallback: parse slug from the pathname
  // Pattern: /{locale}/copro/{coproId}/{section}
  const segments = pathname.split('/').filter(Boolean);
  const coproIdx = segments.indexOf('copro');
  if (coproIdx >= 0 && coproIdx + 1 < segments.length) {
    return segments.slice(coproIdx + 1);
  }
  return [];
}

export function CoproCatchAllPageContent() {
  const slug = useSlug();
  const pathname = usePathname();

  useEffect(() => {
    if (slug.length === 0) {
      const locale = pathname.split('/')[1] || 'fr';
      window.location.href = `/${locale}/copros/`;
    }
  }, [slug, pathname]);

  if (slug.length === 0) {
    return null;
  }

  const section = slug[1] || 'dashboard';

  const renderContent = () => {
    switch (section) {
      case 'depenses':
        return <DepensesPageContent />;
      case 'paiements':
        return <PaiementsPageContent />;
      case 'membres':
        return <MembresPageContent />;
      case 'parametres':
        return <ParametresPageContent />;
      default:
        return <CoproDashboardPageContent />;
    }
  };

  return (
    <CoproDetailShell>
      {renderContent()}
    </CoproDetailShell>
  );
}
