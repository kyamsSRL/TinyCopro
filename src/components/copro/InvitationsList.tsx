'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { useCoproContext } from '@/components/copro/CoproContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
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

interface Invitation {
  id: string;
  code: string;
  expires_at: string;
  is_used: boolean;
  membre_id: string | null;
  membres: {
    id: string;
    alias: string | null;
    date_adhesion: string | null;
  } | null;
}

function generateInvitationCode(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function InvitationsList() {
  const t = useTranslations('copro');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { copro, refetch } = useCoproContext();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!copro) return;
    setLoading(true);

    const { data } = await supabase
      .from('invitations')
      .select('id, code, expires_at, is_used, membre_id, membres!invitations_membre_id_fkey(id, alias, date_adhesion)')
      .eq('copropriete_id', copro.id)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) setInvitations(data as unknown as Invitation[]);
    setLoading(false);
  }, [copro]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRevoke = async (invitation: Invitation) => {
    if (!user || !copro) return;
    setRevoking(invitation.id);

    // Delete the placeholder membre (cascade will handle repartitions)
    if (invitation.membre_id) {
      await supabase.from('membres').delete().eq('id', invitation.membre_id);
    }

    // Delete the invitation
    await supabase.from('invitations').delete().eq('id', invitation.id);

    logAudit({
      coproprieteId: copro.id,
      action: 'revoke_invitation',
      entityType: 'invitation',
      entityId: invitation.id,
      details: { alias: invitation.membres?.alias },
    });

    setRevoking(null);
    await fetchInvitations();
    await refetch();
  };

  const handleRegenerate = async (invitation: Invitation) => {
    if (!user || !copro) return;
    setRegenerating(invitation.id);

    const newCode = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await supabase
      .from('invitations')
      .update({ code: newCode, expires_at: expiresAt.toISOString() })
      .eq('id', invitation.id);

    logAudit({
      coproprieteId: copro.id,
      action: 'regenerate_invitation',
      entityType: 'invitation',
      entityId: invitation.id,
    });

    setRegenerating(null);
    await fetchInvitations();
  };

  if (loading) return null;
  if (invitations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('invitationsPending')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('alias')}</TableHead>
              <TableHead>{t('invitationCode')}</TableHead>
              <TableHead>{t('dateAdhesion')}</TableHead>
              <TableHead>{t('expiration')}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">
                  {inv.membres?.alias || '--'}
                  <Badge variant="secondary" className="ml-2">{t('enAttente')}</Badge>
                </TableCell>
                <TableCell>
                  <code className="font-mono tracking-wide text-sm">{inv.code}</code>
                </TableCell>
                <TableCell>{inv.membres?.date_adhesion || '--'}</TableCell>
                <TableCell>{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyCode(inv.code, inv.id)}
                      title={t('copierCode')}
                    >
                      {copiedId === inv.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRegenerate(inv)}
                      disabled={regenerating === inv.id}
                      title={t('regenerer')}
                    >
                      <RefreshCw className={`h-4 w-4 ${regenerating === inv.id ? 'animate-spin' : ''}`} />
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
                            onClick={() => handleRevoke(inv)}
                            disabled={revoking === inv.id}
                          >
                            {revoking === inv.id ? tc('loading') : t('revoquer')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
