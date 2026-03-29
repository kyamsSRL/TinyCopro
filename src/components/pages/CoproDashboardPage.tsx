'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, CreditCard, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useCoproContext } from '@/components/copro/CoproContext';
import { getDashboardStats } from '@/services/copropriete';
import { listDepenses, voteDepense } from '@/services/depense';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DashboardStats = {
  my_solde: number;
  my_pending: number;
  my_paid: number;
  copro_total_expenses: number;
  copro_collected: number;
  copro_outstanding: number;
  copro_iban: string;
  member_soldes: { membre_id: string; nom: string; prenom: string; alias: string | null; solde: number }[];
  category_breakdown: { categorie: string; total: number }[];
  transactions: { type: string; montant: number; reference: string | null; date: string }[];
  exercice_id: string;
};

export function CoproDashboardPageContent() {
  const t = useTranslations('dashboard');
  const { copro, exercice, currentMembre, isGestionnaire } = useCoproContext();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState<number>(exercice?.annee || new Date().getFullYear());
  const [currentExerciceId, setCurrentExerciceId] = useState<string | null>(null);
  const [pendingDepenses, setPendingDepenses] = useState<any[]>([]);
  const [recentDepenses, setRecentDepenses] = useState<any[]>([]);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');
  const [editingVoteId, setEditingVoteId] = useState<string | null>(null);
  const td = useTranslations('depenses');
  const tc = useTranslations('common');

  const fetchDepenses = useCallback(async (exerciceId: string | null) => {
    if (!copro || !exerciceId) { setPendingDepenses([]); setRecentDepenses([]); return; }
    const { data } = await listDepenses(copro.id, exerciceId);
    if (data) {
      const all = data as any[];
      setPendingDepenses(all.filter((d: any) => !d.is_validated));
      setRecentDepenses(all.filter((d: any) => d.is_validated).slice(0, 3));
    }
  }, [copro]);

  const fetchStats = useCallback(async (exerciceId: string | null, isInitial = false) => {
    if (!copro) return;
    if (isInitial) setLoading(true);
    const { data } = await getDashboardStats(copro.id, exerciceId ?? undefined);
    if (data) {
      setStats(data);
      await fetchDepenses(data.exercice_id || exerciceId);
    }
    if (isInitial) setLoading(false);
  }, [copro, fetchDepenses]);

  // Initial load only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(null, true); }, [fetchStats]);

  useEffect(() => {
    if (exercice) setCurrentYear(exercice.annee);
  }, [exercice]);

  const navigateYear = async (delta: number) => {
    const newYear = currentYear + delta;
    setCurrentYear(newYear);
    if (!copro) return;
    const { listExercices } = await import('@/services/exercice');
    const { data: exercices } = await listExercices(copro.id);
    let targetId: string | null = null;
    if (exercices) {
      const target = (exercices as any[]).find((e: any) => e.annee === newYear);
      targetId = target?.id ?? null;
    }
    setCurrentExerciceId(targetId);
    if (targetId) {
      await fetchStats(targetId);
    } else {
      // No exercice for this year — show empty stats
      setStats({
        my_solde: 0, my_pending: 0, my_paid: 0,
        copro_total_expenses: 0, copro_collected: 0, copro_outstanding: 0,
        copro_iban: copro.iban, member_soldes: [], category_breakdown: [],
        transactions: [], exercice_id: '',
      });
      setPendingDepenses([]);
      setRecentDepenses([]);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const coproBaseUrl = `/${locale}/copro/${copro?.id}`;
  const devise = copro?.devise || 'EUR';
  const fmt = (n: number) => n.toFixed(2);

  const handleVote = async (depenseId: string, vote: boolean, motif?: string) => {
    setVotingId(depenseId);
    const { error } = await voteDepense(depenseId, vote, motif);
    setVotingId(null);
    setConfirmRejectId(null);
    setRejectMotif('');
    setEditingVoteId(null);
    if (error) { toast.error(error.message); return; }
    await fetchStats(currentExerciceId || stats?.exercice_id || null);
  };

  const renderDepenseRow = (dep: any, isPending: boolean) => {
    const votes = (dep.votes as any[] || []).filter((v: any) => v.vote).length;
    const totalMembers = dep.total_members || 0;
    const myVote = isPending
      ? (dep.votes as any[] || []).find((v: any) => v.membre_id === currentMembre?.id)
      : null;

    return (
      <div
        key={dep.id}
        className="py-2 border-b border-dashed last:border-0"
      >
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
          onClick={() => { window.location.href = `${coproBaseUrl}/depenses?depenseId=${dep.id}`; }}
        >
          <div className="flex-1 min-w-0">
            <span className="text-sm truncate block">{dep.libelle}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(dep.date_depense).toLocaleDateString()}
              {isPending && <>{' · '}<span className="text-primary font-semibold">{votes}/{totalMembers} {td('votesLabel')}</span></>}
            </span>
          </div>
          <span className="text-sm font-medium shrink-0">{fmt(dep.montant_total)} {devise}</span>
        </div>

        {/* Vote buttons + current vote state for pending depenses */}
        {isPending && (
          <div className="mt-1.5 pl-1" onClick={(e) => e.stopPropagation()}>
            {myVote && editingVoteId !== dep.id ? (
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" disabled={votingId === dep.id} onClick={() => setEditingVoteId(dep.id)}>
                  {td('modifyVote')}
                </Button>
                <Badge variant={myVote.vote ? 'success' : 'destructive'}>
                  {myVote.vote ? `${td('accepted')} ✓` : `${td('rejected')} ✗`}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={votingId === dep.id} onClick={() => handleVote(dep.id, true)}>
                  {td('accepter')}
                </Button>
                <Button size="sm" variant="outline" disabled={votingId === dep.id} onClick={() => setConfirmRejectId(dep.id)}>
                  {td('refuser')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">

      {/* Year navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigateYear(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-bold">{currentYear}</span>
        <Button variant="ghost" size="icon" onClick={() => navigateYear(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="finance">
        <TabsList className="w-full">
          <TabsTrigger value="finance" className="flex-1">{t('myFinancialStatus')}</TabsTrigger>
          <TabsTrigger value="copro" className="flex-1">{t('myCopro')}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Mon état financier */}
        <TabsContent value="finance" className="space-y-4 mt-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">{t('solde')}</p>
              <p className="text-2xl font-bold">{fmt(stats.my_solde)} {devise}</p>
              {stats.my_solde < 0 && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => { window.location.href = `${coproBaseUrl}/paiements?generate=true`; }}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  {t('pay')}
                </Button>
              )}
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">{t('totalPending')}</p>
              <p className="text-2xl font-bold">{fmt(stats.my_pending)} {devise}</p>
              {isGestionnaire && stats.my_pending > 0 && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => { window.location.href = `${coproBaseUrl}/paiements`; }}
                >
                  {t('markAsPaid')}
                </Button>
              )}
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">{t('totalPaid')}</p>
              <p className="text-2xl font-bold">{fmt(stats.my_paid)} {devise}</p>
            </div>
          </div>

          {/* Pending validation depenses */}
          {pendingDepenses.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-bold mb-3">
                {t('pendingValidation')}
              </h3>
              <div className="space-y-0">
                {pendingDepenses.map(dep => renderDepenseRow(dep, true))}
              </div>
            </div>
          )}

          {/* Recent expenses */}
          {recentDepenses.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-bold mb-3">{t('recentExpenses')}</h3>
              <div className="space-y-0">
                {recentDepenses.map(dep => renderDepenseRow(dep, false))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => { window.location.href = `${coproBaseUrl}/depenses`; }}
              >
                {t('viewMore')}
              </Button>
            </div>
          )}

          {/* Transactions */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-bold mb-3">{t('transactions')}</h3>
            <div className="space-y-2">
              {stats.transactions.length === 0 && (
                <p className="text-sm text-muted-foreground">-</p>
              )}
              {stats.transactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={tx.type === 'depot' ? 'success' : 'outline'}>
                      {tx.type === 'depot' ? '+' : '-'}
                    </Badge>
                    <span className="text-sm">{tx.reference || tx.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {tx.type === 'depot' ? '+' : '-'}{fmt(tx.montant)} {devise}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => { window.location.href = `${coproBaseUrl}/paiements`; }}
            >
              {t('viewMore')}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: Ma copropriété */}
        <TabsContent value="copro" className="space-y-4 mt-4">
          {/* IBAN */}
          {stats.copro_iban && (
            <div className="flex items-center justify-between border rounded-lg p-3">
              <span className="text-sm font-mono">{stats.copro_iban}</span>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => navigator.clipboard.writeText(stats.copro_iban).catch(() => {})}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{t('totalExpenses')}</p>
              <p className="text-xl font-bold">{fmt(stats.copro_total_expenses)} {devise}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{t('collected')}</p>
              <p className="text-xl font-bold">{fmt(stats.copro_collected)} {devise}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{t('outstanding')}</p>
              <p className="text-xl font-bold">{fmt(stats.copro_outstanding)} {devise}</p>
            </div>
          </div>

          {/* Soldes membres (1 column) */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">{t('memberSoldes')}</h3>
            <div className="space-y-0">
              <div className="flex items-center py-1.5 border-b text-xs font-medium text-muted-foreground">
                <span className="flex-1">Membre</span>
                <span className="w-28 text-right">{t('solde')}</span>
              </div>
              {stats.member_soldes.map(m => {
                const isMe = m.membre_id === currentMembre?.id;
                return (
                  <div key={m.membre_id} className="flex items-center py-1.5 border-b border-dashed last:border-0">
                    <span className="flex-1 text-sm">
                      {m.prenom} {m.nom}
                      {m.alias && <Badge variant="secondary" className="ml-2 text-xs">{m.alias}</Badge>}
                    </span>
                    <span className="w-28 text-right text-sm font-medium">
                      {fmt(m.solde)} {devise}
                    </span>
                    {isMe && m.solde < 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => { window.location.href = `${coproBaseUrl}/paiements?generate=true`; }}
                      >
                        {t('pay')}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categories */}
          {stats.category_breakdown.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">{t('categoryBreakdown')}</h3>
              <div className="space-y-2">
                {stats.category_breakdown.map(c => {
                  const pct = stats.copro_total_expenses > 0 ? Math.round(c.total / stats.copro_total_expenses * 100) : 0;
                  return (
                    <div key={c.categorie} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{c.categorie}</span>
                        <span className="font-medium">{fmt(c.total)} {devise} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Confirm Reject */}
      <Dialog open={!!confirmRejectId} onOpenChange={(open) => { if (!open) { setConfirmRejectId(null); setRejectMotif(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{td('refuser')}</DialogTitle>
          </DialogHeader>
          <textarea
            className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            placeholder={td('motifRejet')}
            value={rejectMotif}
            onChange={(e) => setRejectMotif(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => { setConfirmRejectId(null); setRejectMotif(''); }}>{tc('cancel')}</Button>
            <Button
              variant="destructive"
              disabled={!rejectMotif.trim() || votingId === confirmRejectId}
              onClick={() => { if (confirmRejectId) handleVote(confirmRejectId, false, rejectMotif); }}
            >
              {td('refuser')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
