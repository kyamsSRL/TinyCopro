'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCoproContext } from '@/components/copro/CoproContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/types/database.types';

type Repartition = Tables<'repartitions'>;
type Depense = Tables<'depenses'>;
type AppelPaiement = Tables<'appels_paiement'>;
type Category = Tables<'categories_depenses'>;

interface DashboardStats {
  totalDue: number;
  totalPending: number;
  totalPaid: number;
}

interface GestionnaireStats {
  totalExpenses: number;
  totalCollected: number;
  totalOutstanding: number;
}

interface LatePaymentMember {
  memberId: string;
  memberName: string;
  amountDue: number;
}

interface CategoryBreakdown {
  name: string;
  total: number;
}

export function CoproDashboardPageContent() {
  const t = useTranslations('dashboard');
  const tCopro = useTranslations('copro');
  const tNav = useTranslations('nav');
  const tDepenses = useTranslations('depenses');
  const tPaiements = useTranslations('paiements');
  const { copro, currentMembre, isGestionnaire, membres, exercice } = useCoproContext();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const [myStats, setMyStats] = useState<DashboardStats>({
    totalDue: 0,
    totalPending: 0,
    totalPaid: 0,
  });
  const [gestStats, setGestStats] = useState<GestionnaireStats>({
    totalExpenses: 0,
    totalCollected: 0,
    totalOutstanding: 0,
  });
  const [lateMembers, setLateMembers] = useState<LatePaymentMember[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<AppelPaiement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!copro || !currentMembre) return;
    setLoading(true);

    try {
      if (exercice) {
        // Copropri\u00e9taire stats (always fetched for both roles)
        const { data: myReps } = await supabase
          .from('repartitions')
          .select('*, depenses!inner(*)')
          .eq('membre_id', currentMembre.id)
          .eq('depenses.exercice_id', exercice.id);

        if (myReps) {
          const reps = myReps as unknown as (Repartition & { depenses: Depense })[];
          const due = reps
            .filter(r => r.statut === 'en_cours')
            .reduce((s, r) => s + (r.montant_override ?? r.montant_du), 0);
          const pending = reps
            .filter(r => r.statut === 'en_cours_paiement')
            .reduce((s, r) => s + (r.montant_override ?? r.montant_du), 0);
          const paid = reps
            .filter(r => r.statut === 'paye')
            .reduce((s, r) => s + (r.montant_override ?? r.montant_du), 0);

          setMyStats({ totalDue: due, totalPending: pending, totalPaid: paid });
        }
      }

      // Upcoming deadlines
      const { data: appels } = await supabase
        .from('appels_paiement')
        .select('*')
        .eq('copropriete_id', copro.id)
        .eq('membre_id', currentMembre.id)
        .neq('statut', 'paye')
        .not('date_echeance', 'is', null)
        .order('date_echeance', { ascending: true })
        .limit(5);

      if (appels) setUpcomingDeadlines(appels);

      // Gestionnaire stats
      if (isGestionnaire && exercice) {
        // Total expenses for this exercice
        const { data: depenses } = await supabase
          .from('depenses')
          .select('montant_total')
          .eq('copropriete_id', copro.id)
          .eq('exercice_id', exercice.id);

        const totalExpenses = depenses
          ? depenses.reduce((s, d) => s + d.montant_total, 0)
          : 0;

        // All repartitions for this exercice
        const { data: allReps } = await supabase
          .from('repartitions')
          .select('*, depenses!inner(*), membres(*, profiles(*))')
          .eq('depenses.copropriete_id', copro.id)
          .eq('depenses.exercice_id', exercice.id);

        let totalCollected = 0;
        let totalOutstanding = 0;
        const lateMemberMap = new Map<string, { name: string; amount: number }>();

        if (allReps) {
          const reps = allReps as unknown as (Repartition & {
            depenses: Depense;
            membres: Tables<'membres'> & { profiles: Tables<'profiles'> };
          })[];
          for (const rep of reps) {
            const amount = rep.montant_override ?? rep.montant_du;
            if (rep.statut === 'paye') {
              totalCollected += amount;
            } else {
              totalOutstanding += amount;
              if (rep.statut === 'en_cours') {
                const existing = lateMemberMap.get(rep.membre_id);
                const name = `${rep.membres.profiles.prenom} ${rep.membres.profiles.nom}`;
                if (existing) {
                  existing.amount += amount;
                } else {
                  lateMemberMap.set(rep.membre_id, { name, amount });
                }
              }
            }
          }
        }

        setGestStats({ totalExpenses, totalCollected, totalOutstanding });

        setLateMembers(
          Array.from(lateMemberMap.entries()).map(([memberId, data]) => ({
            memberId,
            memberName: data.name,
            amountDue: data.amount,
          }))
        );

        // Category breakdown
        const { data: catDepenses } = await supabase
          .from('depenses')
          .select('montant_total, categories_depenses(nom)')
          .eq('copropriete_id', copro.id)
          .eq('exercice_id', exercice.id);

        if (catDepenses) {
          const catMap = new Map<string, number>();
          for (const dep of catDepenses as unknown as { montant_total: number; categories_depenses: Category | null }[]) {
            const catName = dep.categories_depenses?.nom ?? 'Sans categorie';
            const existing = catMap.get(catName) ?? 0;
            catMap.set(catName, existing + dep.montant_total);
          }
          setCategoryBreakdown(
            Array.from(catMap.entries())
              .map(([name, total]) => ({ name, total }))
              .sort((a, b) => b.total - a.total)
          );
        }
      }
    } catch {
      // Error fetching dashboard data
    } finally {
      setLoading(false);
    }
  }, [copro, currentMembre, isGestionnaire, exercice]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (!copro) return null;

  const coproBaseUrl = `/${locale}/copro/${copro.id}`;
  const maxCategoryTotal = Math.max(...categoryBreakdown.map(c => c.total), 1);
  const totalMilliemes = membres.reduce((sum, m) => sum + m.milliemes, 0);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Copro info */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-xl font-semibold">{tCopro('dashboard')}</h2>
          <Badge variant={isGestionnaire ? 'default' : 'secondary'}>
            {isGestionnaire ? tCopro('gestionnaire') : tCopro('coproprietaire')}
          </Badge>
        </div>
        {exercice && (
          <p className="text-sm text-muted-foreground">
            {exercice.annee} - {exercice.date_debut} / {exercice.date_fin}
          </p>
        )}
      </div>

      {/* Copropri\u00e9taire View */}
      {!isGestionnaire && (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('totalDue')}
                  </CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{myStats.totalDue.toFixed(2)} {copro.devise}</p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('totalPending')}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{myStats.totalPending.toFixed(2)} {copro.devise}</p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('totalPaid')}
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{myStats.totalPaid.toFixed(2)} {copro.devise}</p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('nextDeadlines')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingDeadlines.map(appel => (
                    <div
                      key={appel.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{appel.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          {appel.date_echeance}
                        </p>
                      </div>
                      <span className="font-medium text-sm">
                        {appel.montant_total.toFixed(2)} {copro.devise}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Link href={`${coproBaseUrl}/paiements`}>
              <Button>
                {tPaiements('generate')}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link href={`${coproBaseUrl}/depenses`}>
              <Button variant="outline">
                {tDepenses('title')}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* Gestionnaire View */}
      {isGestionnaire && (
        <>
          {/* Overview stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {tCopro('membres')}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{membres.length}</p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('totalExpenses')}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{gestStats.totalExpenses.toFixed(2)} {copro.devise}</p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('collected')}
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{gestStats.totalCollected.toFixed(2)} {copro.devise}</p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('outstanding')}
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{gestStats.totalOutstanding.toFixed(2)} {copro.devise}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Late Members */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('lateMembers')}</CardTitle>
              </CardHeader>
              <CardContent>
                {lateMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">--</p>
                ) : (
                  <div className="space-y-2">
                    {lateMembers.map(member => (
                      <div
                        key={member.memberId}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">{member.memberName}</span>
                        </div>
                        <Badge variant="destructive">
                          {member.amountDue.toFixed(2)} {copro.devise}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('categoryBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tDepenses('noDepenses')}</p>
                ) : (
                  <div className="space-y-3">
                    {categoryBreakdown.map(cat => (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{cat.name}</span>
                          <span className="font-medium">
                            {cat.total.toFixed(2)} {copro.devise}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${(cat.total / maxCategoryTotal) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bank Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tCopro('parametres')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">{tCopro('iban')}</p>
                  <p className="font-mono text-sm break-all">{copro.iban}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{tCopro('bic')}</p>
                  <p className="font-mono text-sm break-all">{copro.bic}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{tCopro('milliemes')}</p>
                  <p className="text-sm font-medium">{totalMilliemes} / 1000</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{tCopro('currency')}</p>
                  <p className="text-sm">{copro.devise}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Link href={`${coproBaseUrl}/depenses`}>
              <Button>
                {tDepenses('add')}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link href={`${coproBaseUrl}/paiements`}>
              <Button variant="outline">
                {tPaiements('title')}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link href={`${coproBaseUrl}/parametres`}>
              <Button variant="outline">
                {tNav('parametres')}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
