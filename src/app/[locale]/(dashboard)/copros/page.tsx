'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Building2, Plus, UserPlus } from 'lucide-react';
import { useCopros } from '@/hooks/useCopro';
import { CreateCoproForm } from '@/components/copro/CreateCoproForm';
import { JoinCoproDialog } from '@/components/copro/JoinCoproDialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from '@/components/ui/dialog';

export default function CoprosPage() {
  const t = useTranslations('copro');
  const tc = useTranslations('common');
  const { copros, loading, refetch } = useCopros();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const [createOpen, setCreateOpen] = useState(false);
  const [invitationCode, setInvitationCode] = useState<string | undefined>(undefined);

  // Extract ?code= param for invitation flow
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('ref');
      if (code) setInvitationCode(code);
    }
  }, []);

  const handleCreateSuccess = () => {
    setCreateOpen(false);
    refetch();
  };

  const handleJoinSuccess = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-1.5" />
                  {t('create')}
                </Button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <CreateCoproForm onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>

          <JoinCoproDialog onSuccess={handleJoinSuccess} defaultCode={invitationCode}>
            <Button variant="outline">
              <UserPlus className="mr-1.5" />
              {t('join')}
            </Button>
          </JoinCoproDialog>
        </div>
      </div>

      {copros.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">{t('noCopros')}</h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {t('noCoprosDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {copros.map((copro) => (
            <Link
              key={copro.id}
              href={`/${locale}/copro/${copro.id}`}
              className="block"
            >
              <Card className="transition-shadow hover:ring-2 hover:ring-primary/20 cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{copro.nom}</CardTitle>
                      <CardDescription className="truncate mt-1">
                        {copro.adresse}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={copro.role === 'gestionnaire' ? 'default' : 'secondary'}
                    >
                      {copro.role === 'gestionnaire'
                        ? t('gestionnaire')
                        : t('coproprietaire')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t('milliemes')}:</span>
                    <span className="font-medium text-foreground">
                      {copro.milliemes}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
