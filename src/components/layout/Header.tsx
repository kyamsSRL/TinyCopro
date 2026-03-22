'use client';

import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from './LanguageSwitcher';
import Link from 'next/link';

export function Header() {
  const { profile, signOut } = useAuth();
  const t = useTranslations('auth');
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'fr';

  const initials = profile
    ? `${(profile.prenom?.[0] || '').toUpperCase()}${(profile.nom?.[0] || '').toUpperCase()}`
    : '?';

  const handleSignOut = async () => {
    await signOut();
    window.location.href = `/${locale}/login/`;
  };

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href={`/${locale}/copros`} className="font-bold text-lg">
          TinyCopro
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex items-center gap-2 p-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.prenom} {profile?.nom}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/${locale}/profil`)}>
                {tNav('profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
