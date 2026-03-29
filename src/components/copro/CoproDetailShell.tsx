'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Users,
  Settings,
} from 'lucide-react';
import { useCoproDetail } from '@/hooks/useCopro';
import { CoproContext } from '@/components/copro/CoproContext';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, segment: '' },
  { key: 'depenses', icon: Receipt, segment: '/depenses' },
  { key: 'paiements', icon: CreditCard, segment: '/paiements' },
  { key: 'membres', icon: Users, segment: '/membres' },
  { key: 'parametres', icon: Settings, segment: '/parametres' },
] as const;

export function CoproDetailShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations('copro');

  // In static export, useParams().slug may be [] even when the URL has segments.
  // Parse from pathname as fallback.
  let slug = params.slug as string[] | undefined;
  if (!slug || slug.length === 0) {
    const segments = pathname.split('/').filter(Boolean);
    const coproIdx = segments.indexOf('copro');
    if (coproIdx >= 0 && coproIdx + 1 < segments.length) {
      slug = segments.slice(coproIdx + 1);
    }
  }
  const coproId = slug?.[0] || '';
  const locale = (params.locale as string) || pathname.split('/')[1] || 'fr';

  const coproDetail = useCoproDetail(coproId);
  const { copro, loading } = coproDetail;

  const basePath = `/${locale}/copro/${coproId}`;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!copro) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t('notFound')}</p>
        <Link
          href={`/${locale}/copros`}
          className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
        >
          &larr; {t('title')}
        </Link>
      </div>
    );
  }

  return (
    <CoproContext.Provider value={coproDetail}>
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{copro.nom}</h1>
          <p className="text-sm text-muted-foreground">{copro.adresse}</p>
        </div>

        <Separator />

        <div className="flex flex-col md:flex-row gap-6 mt-6">
          {/* Desktop sidebar */}
          <nav className="hidden md:flex md:flex-col gap-1 md:w-48 shrink-0">
            {navItems.map((item) => {
              const href = `${basePath}${item.segment}`;
              const isActive =
                item.segment === ''
                  ? pathname === basePath || pathname === `${basePath}/`
                  : pathname.startsWith(href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.key}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-muted text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(item.key)}
                </Link>
              );
            })}
            <div className="mt-auto pt-4">
              <Link
                href={`/${locale}/copros`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                &larr; {t('title')}
              </Link>
            </div>
          </nav>

          <div className="flex-1 min-w-0 pb-16 md:pb-0">{children}</div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const href = `${basePath}${item.segment}`;
            const isActive =
              item.segment === ''
                ? pathname === basePath || pathname === `${basePath}/`
                : pathname.startsWith(href);
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {t(item.key)}
              </Link>
            );
          })}
        </div>
      </nav>
    </CoproContext.Provider>
  );
}
