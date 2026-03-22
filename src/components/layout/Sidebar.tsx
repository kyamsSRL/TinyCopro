'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useCoproContext } from '@/components/copro/CoproContext';

interface SidebarProps {
  coproId: string;
}

export function Sidebar({ coproId }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const { isGestionnaire } = useCoproContext();

  const basePath = `/${locale}/copro/${coproId}`;

  const links = [
    { href: basePath, label: t('dashboard'), exact: true },
    { href: `${basePath}/depenses`, label: t('depenses') },
    { href: `${basePath}/paiements`, label: t('paiements') },
    { href: `${basePath}/membres`, label: t('membres') },
    ...(isGestionnaire
      ? [
          { href: `${basePath}/parametres`, label: t('parametres') },
          { href: `${basePath}/parametres#audit`, label: t('audit') },
        ]
      : []),
  ];

  return (
    <nav className="w-56 border-r bg-muted/30 p-4 space-y-1 min-h-[calc(100vh-3.5rem)]">
      {links.map((link) => {
        const isActive = link.exact
          ? pathname === link.href || pathname === `${link.href}/`
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
