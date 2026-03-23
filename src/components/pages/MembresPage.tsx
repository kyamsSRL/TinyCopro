'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, UserPlus, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/hooks/useAuth';
import { useCoproContext } from '@/components/copro/CoproContext';
import { CreateInvitationDialog } from '@/components/copro/CreateInvitationDialog';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [selectedMembre, setSelectedMembre] = useState<typeof membres[0] | null>(null);

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
      setSelectedMembre(null);
    }
    setSaving(false);
  };

  const handleTransferRole = async (targetMembreId: string) => {
    if (!targetMembreId || !user) return;
    setTransferring(true);
    const currentGestionnaire = membres.find(
      (m) => m.user_id === user.id && m.role === 'gestionnaire'
    );
    if (!currentGestionnaire) { setTransferring(false); return; }

    const { error: promoteError } = await supabase
      .from('membres')
      .update({ role: 'gestionnaire' })
      .eq('id', targetMembreId);
    if (promoteError) { setTransferring(false); return; }

    const { error: demoteError } = await supabase
      .from('membres')
      .update({ role: 'coproprietaire' })
      .eq('id', currentGestionnaire.id);
    if (!demoteError) {
      logAudit({ coproprieteId: copro.id, action: 'transfer_role', entityType: 'membre', entityId: targetMembreId });
      await refetch();
    }
    setTransferring(false);
    setSelectedMembre(null);
  };

  const copyCode = async (code: string, membreId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(membreId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback */ }
  };

  const handleRegenerate = async (membreId: string) => {
    if (!copro) return;
    setRegenerating(membreId);
    const chars = '0123456789abcdef';
    let newCode = '';
    for (let i = 0; i < 12; i++) newCode += chars[Math.floor(Math.random() * chars.length)];
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    await supabase.from('membres').update({
      invitation_code: newCode,
      invitation_expires_at: expiresAt.toISOString(),
    }).eq('id', membreId);
    logAudit({ coproprieteId: copro.id, action: 'regenerate_invitation', entityType: 'membre', entityId: membreId });
    setRegenerating(null);
    await refetch();
  };

  const handleRevoke = async (membreId: string) => {
    if (!copro || !user) return;
    setRevoking(membreId);
    await supabase.from('membres').delete().eq('id', membreId);
    logAudit({ coproprieteId: copro.id, action: 'revoke_invitation', entityType: 'membre', entityId: membreId });
    setRevoking(null);
    setSelectedMembre(null);
    await refetch();
  };

  const totalMilliemes = membres.reduce((sum, m) => sum + m.milliemes, 0);

  const getMemberDisplayName = (membre: typeof membres[0]) => {
    if (membre.user_id && membre.profiles) {
      return { nom: membre.profiles.nom || '--', prenom: membre.profiles.prenom || '--' };
    }
    return { nom: membre.alias || '--', prenom: '' };
  };

  const isPlaceholder = (membre: typeof membres[0]) => membre.user_id === null;

  const renderMembreActions = (membre: typeof membres[0]) => {
    const display = getMemberDisplayName(membre);
    const placeholder = isPlaceholder(membre);
    const membreAny = membre as any;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {isGestionnaire && placeholder && membreAny.invitation_code && (<>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => copyCode(membreAny.invitation_code, membre.id)}
            title={t('copierCode')}
          >
            {copiedId === membre.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleRegenerate(membre.id)}
            disabled={regenerating === membre.id}
            title={t('regenerer')}
          >
            <RefreshCw className={`h-4 w-4 ${regenerating === membre.id ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="ghost" size="icon" title={t('revoquer')}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('revoquer')}</DialogTitle>
                <DialogDescription>{t('revoquerConfirm')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline">{tc('cancel')}</Button>} />
                <Button
                  variant="destructive"
                  onClick={() => handleRevoke(membre.id)}
                  disabled={revoking === membre.id}
                >
                  {revoking === membre.id ? '...' : t('revoquer')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>)}
        {isGestionnaire && membre.role === 'coproprietaire' && !placeholder && membre.user_id !== user?.id && (
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
                <DialogDescription>{t('transferConfirm')}</DialogDescription>
              </DialogHeader>
              <Alert>
                <AlertTitle>{display.prenom} {display.nom}</AlertTitle>
                <AlertDescription>{t('transferConfirm')}</AlertDescription>
              </Alert>
              <DialogFooter>
                <DialogClose render={<Button variant="outline">{tc('cancel')}</Button>} />
                <Button
                  onClick={() => handleTransferRole(membre.id)}
                  disabled={transferring}
                >
                  {transferring ? '...' : tc('confirm')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  };

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

      {membres.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{tc('noResults')}</div>
      ) : (<>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {membres.map((membre) => {
            const display = getMemberDisplayName(membre);
            const placeholder = isPlaceholder(membre);
            return (
              <div
                key={membre.id}
                className={`border rounded-lg p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors ${placeholder ? 'opacity-70' : ''}`}
                onClick={() => setSelectedMembre(membre)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">
                      {display.prenom} {display.nom}
                    </span>
                    {placeholder && <Badge variant="secondary">{t('enAttente')}</Badge>}
                  </div>
                  <Badge variant={membre.role === 'gestionnaire' ? 'default' : 'secondary'}>
                    {membre.role === 'gestionnaire' ? t('gestionnaire') : t('coproprietaire')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{membre.date_adhesion || '--'}</span>
                  <span className="text-sm font-medium">{membre.milliemes} {t('milliemes')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <Card className="hidden md:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('dateAdhesion')}</TableHead>
                  {isGestionnaire && <TableHead>{t('invitationCode')}</TableHead>}
                  <TableHead className="text-right">{t('milliemes')}</TableHead>
                  {isGestionnaire && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {membres.map((membre) => {
                  const display = getMemberDisplayName(membre);
                  const placeholder = isPlaceholder(membre);
                  const membreAny = membre as any;
                  return (
                    <TableRow key={membre.id} className={`cursor-pointer ${placeholder ? 'opacity-70' : ''}`} onClick={() => setSelectedMembre(membre)}>
                      <TableCell className="font-medium">
                        {display.nom}
                        {placeholder && <Badge variant="secondary" className="ml-2">{t('enAttente')}</Badge>}
                      </TableCell>
                      <TableCell>{display.prenom}</TableCell>
                      <TableCell>
                        <Badge variant={membre.role === 'gestionnaire' ? 'default' : 'secondary'}>
                          {membre.role === 'gestionnaire' ? t('gestionnaire') : t('coproprietaire')}
                        </Badge>
                      </TableCell>
                      <TableCell>{membre.date_adhesion || '--'}</TableCell>
                      {isGestionnaire && (
                        <TableCell>
                          {placeholder && membreAny.invitation_code ? (
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono tracking-wide text-xs bg-muted px-1.5 py-0.5 rounded">{membreAny.invitation_code}</code>
                              <span className="text-xs text-muted-foreground">
                                exp. {new Date(membreAny.invitation_expires_at).toLocaleDateString()}
                              </span>
                            </div>
                          ) : null}
                        </TableCell>
                      )}
                      <TableCell className="text-right">{membre.milliemes}</TableCell>
                      {isGestionnaire && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {renderMembreActions(membre)}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail sheet */}
        <Sheet open={!!selectedMembre} onOpenChange={(open) => { if (!open) setSelectedMembre(null); }}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            {selectedMembre && (() => {
              const display = getMemberDisplayName(selectedMembre);
              const placeholder = isPlaceholder(selectedMembre);
              const membreAny = selectedMembre as any;
              return (
                <>
                  <SheetHeader>
                    <SheetTitle>
                      {display.prenom} {display.nom}
                      {placeholder && <Badge variant="secondary" className="ml-2">{t('enAttente')}</Badge>}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={selectedMembre.role === 'gestionnaire' ? 'default' : 'secondary'}>
                        {selectedMembre.role === 'gestionnaire' ? t('gestionnaire') : t('coproprietaire')}
                      </Badge>
                      <Badge variant="outline">{selectedMembre.milliemes} {t('milliemes')}</Badge>
                      {selectedMembre.date_adhesion && <Badge variant="outline">{selectedMembre.date_adhesion}</Badge>}
                    </div>

                    {isGestionnaire && placeholder && membreAny.invitation_code && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{t('invitationCode')}</p>
                        <div className="flex items-center gap-2">
                          <code className="font-mono tracking-wider text-sm bg-muted px-2 py-1 rounded">{membreAny.invitation_code}</code>
                          <span className="text-xs text-muted-foreground">
                            exp. {new Date(membreAny.invitation_expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {isGestionnaire && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{t('milliemes')}</p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={editingId === selectedMembre.id ? editMilliemes : selectedMembre.milliemes}
                            onChange={(e) => {
                              if (editingId !== selectedMembre.id) startEditMilliemes(selectedMembre.id, parseInt(e.target.value) || 0);
                              else setEditMilliemes(parseInt(e.target.value) || 0);
                            }}
                            onFocus={() => {
                              if (editingId !== selectedMembre.id) startEditMilliemes(selectedMembre.id, selectedMembre.milliemes);
                            }}
                            className="w-24 text-right"
                          />
                          {editingId === selectedMembre.id && (
                            <>
                              <Button size="sm" onClick={() => saveMilliemes(selectedMembre.id)} disabled={saving}>
                                {saving ? '...' : tc('save')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                {tc('cancel')}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {renderMembreActions(selectedMembre)}
                  </div>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>
      </>)}
    </div>
  );
}
