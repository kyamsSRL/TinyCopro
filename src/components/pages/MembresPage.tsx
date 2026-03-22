'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/hooks/useAuth';
import { useCoproContext } from '@/components/copro/CoproContext';
import { CreateInvitationDialog } from '@/components/copro/CreateInvitationDialog';
import { InvitationsList } from '@/components/copro/InvitationsList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function MembresPageContent() {
  const t = useTranslations('copro');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { copro, membres, isGestionnaire, refetch } = useCoproContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMilliemes, setEditMilliemes] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);

  if (!copro) return null;

  const startEditMilliemes = (membreId: string, currentMilliemes: number) => {
    setEditingId(membreId);
    setEditMilliemes(currentMilliemes);
  };

  const saveMilliemes = async (membreId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('membres')
      .update({ milliemes: editMilliemes })
      .eq('id', membreId);

    if (!error) {
      await refetch();
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleTransferRole = async (targetMembreId: string) => {
    if (!targetMembreId || !user) return;
    setTransferring(true);

    const currentGestionnaire = membres.find(
      (m) => m.user_id === user.id && m.role === 'gestionnaire'
    );

    if (!currentGestionnaire) {
      setTransferring(false);
      return;
    }

    const { error: promoteError } = await supabase
      .from('membres')
      .update({ role: 'gestionnaire' })
      .eq('id', targetMembreId);

    if (promoteError) {
      setTransferring(false);
      return;
    }

    const { error: demoteError } = await supabase
      .from('membres')
      .update({ role: 'coproprietaire' })
      .eq('id', currentGestionnaire.id);

    if (!demoteError) {
      logAudit({
        coproprieteId: copro.id,
        action: 'transfer_role',
        entityType: 'membre',
        entityId: targetMembreId,
      });
      await refetch();
    }

    setTransferring(false);
  };

  const totalMilliemes = membres.reduce((sum, m) => sum + m.milliemes, 0);

  const getMemberDisplayName = (membre: typeof membres[0]) => {
    if (membre.user_id && membre.profiles) {
      return { nom: membre.profiles.nom || '--', prenom: membre.profiles.prenom || '--' };
    }
    // Alias placeholder
    return { nom: membre.alias || '--', prenom: '' };
  };

  const isPlaceholder = (membre: typeof membres[0]) => membre.user_id === null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">{t('membres')}</h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {t('milliemes')}: {totalMilliemes} / 1000
          </p>
          {isGestionnaire && (
            <CreateInvitationDialog onSuccess={refetch}>
              <Button>
                <UserPlus className="mr-1.5 h-4 w-4" />
                {t('inviteTitle')}
              </Button>
            </CreateInvitationDialog>
          )}
        </div>
      </div>

      {/* Invitations en attente - only for gestionnaire */}
      {isGestionnaire && <InvitationsList />}

      {/* Members table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('dateAdhesion')}</TableHead>
                <TableHead className="text-right">{t('milliemes')}</TableHead>
                {isGestionnaire && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {membres.map((membre) => {
                const display = getMemberDisplayName(membre);
                const placeholder = isPlaceholder(membre);
                return (
                  <TableRow key={membre.id} className={placeholder ? 'opacity-70' : ''}>
                    <TableCell className="font-medium">
                      {display.nom}
                      {placeholder && (
                        <Badge variant="secondary" className="ml-2">{t('enAttente')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{display.prenom}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          membre.role === 'gestionnaire' ? 'default' : 'secondary'
                        }
                      >
                        {membre.role === 'gestionnaire'
                          ? t('gestionnaire')
                          : t('coproprietaire')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {membre.date_adhesion || '--'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isGestionnaire && editingId === membre.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={editMilliemes}
                            onChange={(e) =>
                              setEditMilliemes(parseInt(e.target.value) || 0)
                            }
                            className="w-24 text-right"
                          />
                          <Button
                            size="sm"
                            onClick={() => saveMilliemes(membre.id)}
                            disabled={saving}
                          >
                            {saving ? '...' : tc('save')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            {tc('cancel')}
                          </Button>
                        </div>
                      ) : (
                        <span
                          className={
                            isGestionnaire
                              ? 'cursor-pointer hover:underline'
                              : ''
                          }
                          onClick={() =>
                            isGestionnaire &&
                            startEditMilliemes(membre.id, membre.milliemes)
                          }
                        >
                          {membre.milliemes}
                        </span>
                      )}
                    </TableCell>
                    {isGestionnaire && (
                      <TableCell className="text-right">
                        {membre.role === 'coproprietaire' &&
                          !placeholder &&
                          membre.user_id !== user?.id && (
                            <Dialog>
                              <DialogTrigger
                                render={
                                  <Button variant="ghost" size="sm">
                                    <Shield className="h-4 w-4 mr-1" />
                                    {t('transferRole')}
                                  </Button>
                                }
                              />
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{t('transferRole')}</DialogTitle>
                                  <DialogDescription>
                                    {t('transferConfirm')}
                                  </DialogDescription>
                                </DialogHeader>
                                <Alert>
                                  <AlertTitle>
                                    {display.prenom} {display.nom}
                                  </AlertTitle>
                                  <AlertDescription>
                                    {t('transferConfirm')}
                                  </AlertDescription>
                                </Alert>
                                <DialogFooter>
                                  <DialogClose
                                    render={
                                      <Button variant="outline">{tc('cancel')}</Button>
                                    }
                                  />
                                  <Button
                                    onClick={() => handleTransferRole(membre.id)}
                                    disabled={transferring}
                                  >
                                    {transferring ? tc('loading') : tc('confirm')}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {membres.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isGestionnaire ? 6 : 5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {tc('noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
