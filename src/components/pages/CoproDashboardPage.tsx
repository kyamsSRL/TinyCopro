'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { CreditCard, Copy } from 'lucide-react';
import { useCoproContext } from '@/components/copro/CoproContext';
import { getDashboardStats } from '@/services/copropriete';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type DashboardStats = {
  my_total_due: number;
  my_pending: number;
  my_paid: number;
  copro_total_expenses: number;
  copro_collected: number;
  copro_outstanding: number;
  copro_iban: string;
  member_soldes: { membre_id: string; nom: string; prenom: string; alias: string | null; du: number; depot: number }[];
  category_breakdown: { categorie: string; total: number }[];
};

export function CoproDashboardPageContent() {
  const t = useTranslations('dashboard');
  const { copro, exercice } = useCoproContext();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!copro) return;
    setLoading(true);
    const { data } = await getDashboardStats(copro.id);
    if (data) setStats(data);
    setLoading(false);
  }, [copro]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

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

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">

      {/* Section 1: Mon état financier */}
      <section>
        <h2 className="text-lg font-semibold mb-3">{t('myFinancialStatus')}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {/* Total dû */}
          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">{t('totalDue')}</p>
            <p className="text-2xl font-bold">{fmt(stats.my_total_due)} {devise}</p>
            {stats.my_total_due > 0 && (
              <Button
                size="sm"
                onClick={() => { window.location.href = `${coproBaseUrl}/paiements?generate=true`; }}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                {t('pay')}
              </Button>
            )}
          </div>

          {/* En cours de paiement */}
          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">{t('totalPending')}</p>
            <p className="text-2xl font-bold">{fmt(stats.my_pending)} {devise}</p>
          </div>

          {/* Total payé */}
          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">{t('totalPaid')}</p>
            <p className="text-2xl font-bold">{fmt(stats.my_paid)} {devise}</p>
          </div>
        </div>
      </section>

      {/* Section 2: Ma copropriété */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t('myCopro')}</h2>
          {stats.copro_iban && (
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigator.clipboard.writeText(stats.copro_iban).catch(() => {})}
              title="Copier l'IBAN"
            >
              <span className="font-mono">{stats.copro_iban}</span>
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Stats copro */}
        <div className="grid gap-3 md:grid-cols-3 mb-4">
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

        {/* Soldes membres */}
        <div className="border rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium mb-3">{t('memberSoldes')}</h3>
          <div className="space-y-0">
            <div className="flex items-center py-1.5 border-b text-xs font-medium text-muted-foreground">
              <span className="flex-1">Membre</span>
              <span className="w-28 text-right">{t('due')}</span>
              <span className="w-28 text-right">{t('depositColumn')}</span>
            </div>
            {stats.member_soldes.map(m => (
              <div key={m.membre_id} className="flex items-center py-1.5 border-b border-dashed last:border-0">
                <span className="flex-1 text-sm">
                  {m.prenom} {m.nom}
                  {m.alias && <Badge variant="secondary" className="ml-2 text-xs">{m.alias}</Badge>}
                </span>
                <span className="w-28 text-right text-sm font-medium">
                  {fmt(m.du)} {devise}
                </span>
                <span className="w-28 text-right text-sm font-medium">
                  {fmt(m.depot)} {devise}
                </span>
              </div>
            ))}
            {stats.member_soldes.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">-</p>
            )}
          </div>
        </div>

        {/* Répartition par catégorie */}
        {stats.category_breakdown.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">{t('categoryBreakdown')}</h3>
            <div className="space-y-2">
              {stats.category_breakdown.map(c => {
                const pct = stats.copro_total_expenses > 0
                  ? Math.round(c.total / stats.copro_total_expenses * 100)
                  : 0;
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
      </section>
    </div>
  );
}
