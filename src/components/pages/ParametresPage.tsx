'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarDays, Download, Plus, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCoproContext } from '@/components/copro/CoproContext';
import { logAudit } from '@/lib/audit';
import { AuditLog } from '@/components/audit/AuditLog';
import { useAuth } from '@/hooks/useAuth';
import { exportToCsv } from '@/lib/csv-export';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Tables } from '@/types/database.types';

type Exercice = Tables<'exercices'>;
type Depense = Tables<'depenses'>;
type Repartition = Tables<'repartitions'>;

export function ParametresPageContent() {
  const t = useTranslations('exercice');
  const tc = useTranslations('common');
  const tCopro = useTranslations('copro');
  const tAudit = useTranslations('audit');
  const { user } = useAuth();
  const { copro, isGestionnaire, membres, exercice, refetch } = useCoproContext();

  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const fetchExercices = useCallback(async () => {
    if (!copro) return;
    setLoading(true);

    const { data } = await supabase
      .from('exercices')
      .select('*')
      .eq('copropriete_id', copro.id)
      .order('annee', { ascending: false });

    if (data) setExercices(data);
    setLoading(false);
  }, [copro]);

  useEffect(() => {
    fetchExercices();
  }, [fetchExercices]);

  const handleCloseExercice = async () => {
    if (!copro || !exercice || !user) return;
    setIsClosing(true);

    try {
      // Close current exercice
      const { error: closeError } = await supabase
        .from('exercices')
        .update({ statut: 'cloture' })
        .eq('id', exercice.id);

      if (closeError) {
        toast.error(tc('error'));
        return;
      }

      // Create next exercice
      const nextYear = exercice.annee + 1;
      const { data: newExercice, error: createError } = await supabase
        .from('exercices')
        .insert({
          copropriete_id: copro.id,
          annee: nextYear,
          date_debut: `${nextYear}-01-01`,
          date_fin: `${nextYear}-12-31`,
          statut: 'ouvert',
        })
        .select()
        .single();

      if (createError || !newExercice) {
        toast.error(tc('error'));
        return;
      }

      // Duplicate recurring expenses
      const { data: recurringDepenses } = await supabase
        .from('depenses')
        .select('*')
        .eq('exercice_id', exercice.id)
        .eq('copropriete_id', copro.id)
        .eq('is_recurrence_active', true)
        .neq('frequence', 'unique');

      if (recurringDepenses && recurringDepenses.length > 0) {
        for (const dep of recurringDepenses) {
          const { data: newDep } = await supabase
            .from('depenses')
            .insert({
              libelle: dep.libelle,
              montant_total: dep.montant_total,
              date_depense: dep.date_depense.replace(String(exercice.annee), String(nextYear)),
              description: dep.description,
              categorie_id: dep.categorie_id,
              frequence: dep.frequence,
              copropriete_id: copro.id,
              exercice_id: newExercice.id,
              created_by: user.id,
              is_recurrence_active: true,
              justificatif_urls: null,
            })
            .select()
            .single();

          // Create repartitions for duplicated expense
          if (newDep) {
            const { calculateRepartition } = await import('@/lib/milliemes');
            const repartitions = calculateRepartition(
              newDep.montant_total,
              membres.map(m => ({ id: m.id, milliemes: m.milliemes }))
            );

            if (repartitions.length > 0) {
              await supabase.from('repartitions').insert(
                repartitions.map(r => ({
                  depense_id: newDep.id,
                  membre_id: r.membre_id,
                  montant_du: r.montant_du,
                }))
              );
            }
          }
        }
      }

      logAudit({
        coproprieteId: copro.id,
        action: 'close',
        entityType: 'exercice',
        entityId: exercice.id,
        details: { annee: exercice.annee },
      });

      toast.success(tc('success'));
      setCloseDialogOpen(false);
      fetchExercices();
      refetch();
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsClosing(false);
    }
  };

  const handleCreateExercice = async () => {
    if (!copro) return;
    setIsCreating(true);

    try {
      // Determine next year
      const latestYear = exercices.length > 0
        ? Math.max(...exercices.map(e => e.annee))
        : new Date().getFullYear() - 1;
      const nextYear = latestYear + 1;

      const { error } = await supabase.from('exercices').insert({
        copropriete_id: copro.id,
        annee: nextYear,
        date_debut: `${nextYear}-01-01`,
        date_fin: `${nextYear}-12-31`,
        statut: 'ouvert',
      });

      if (error) {
        toast.error(tc('error'));
      } else {
        toast.success(tc('success'));
        fetchExercices();
        refetch();
      }
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportCsv = async (exerciceToExport: Exercice) => {
    if (!copro) return;
    setIsExporting(true);

    try {
      // Fetch depenses with repartitions for this exercice
      const { data: depenses } = await supabase
        .from('depenses')
        .select('*, categories_depenses(nom), repartitions(*, membres(*, profiles(*)))')
        .eq('copropriete_id', copro.id)
        .eq('exercice_id', exerciceToExport.id)
        .order('date_depense', { ascending: true });

      if (!depenses || depenses.length === 0) {
        toast.error(tc('noResults'));
        return;
      }

      // Build CSV data: one row per repartition
      const csvData: Record<string, unknown>[] = [];

      for (const dep of depenses as unknown as (Depense & {
        categories_depenses: { nom: string } | null;
        repartitions: (Repartition & {
          membres: Tables<'membres'> & { profiles: Tables<'profiles'> };
        })[];
      })[]) {
        for (const rep of dep.repartitions) {
          csvData.push({
            'Depense': dep.libelle,
            'Date': dep.date_depense,
            'Montant Total': dep.montant_total,
            'Categorie': dep.categories_depenses?.nom ?? '',
            'Frequence': dep.frequence,
            'Membre': `${rep.membres.profiles.prenom} ${rep.membres.profiles.nom}`,
            'Milliemes': rep.membres.milliemes,
            'Montant Du': rep.montant_du,
            'Montant Override': rep.montant_override ?? '',
            'Motif Override': rep.motif_override ?? '',
            'Statut': rep.statut,
          });
        }
      }

      exportToCsv(
        `${copro.nom}-exercice-${exerciceToExport.annee}.csv`,
        csvData
      );

      toast.success(tc('success'));
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        {isGestionnaire && exercices.length === 0 && (
          <Button onClick={handleCreateExercice} disabled={isCreating}>
            <Plus className="mr-1.5" />
            {isCreating ? '...' : t('create')}
          </Button>
        )}
      </div>

      {exercices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Aucun exercice. Créez le premier exercice pour commencer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exercices.map(ex => {
            const isCurrent = exercice?.id === ex.id;
            const isOpen = ex.statut === 'ouvert';

            return (
              <Card
                key={ex.id}
                className={isCurrent ? 'ring-2 ring-primary/30' : ''}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        {t('year')} {ex.annee}
                        {isCurrent && (
                          <Badge variant="default">{t('current')}</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {ex.date_debut} - {ex.date_fin}
                      </CardDescription>
                    </div>
                    <Badge variant={isOpen ? 'secondary' : 'outline'}>
                      {isOpen ? t('open') : t('closed')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCsv(ex)}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {t('export')}
                    </Button>

                    {isGestionnaire && isOpen && isCurrent && (
                      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
                        <DialogTrigger
                          render={
                            <Button variant="destructive" size="sm">
                              <Lock className="h-4 w-4 mr-1" />
                              {t('close')}
                            </Button>
                          }
                        />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('close')}</DialogTitle>
                            <DialogDescription>{t('closeConfirm')}</DialogDescription>
                          </DialogHeader>
                          <p className="text-sm text-muted-foreground">
                            {t('year')} {ex.annee} ({ex.date_debut} - {ex.date_fin})
                          </p>
                          <DialogFooter>
                            <Button
                              variant="destructive"
                              onClick={handleCloseExercice}
                              disabled={isClosing}
                            >
                              {isClosing ? '...' : tc('confirm')}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create new exercice if all are closed and user is gestionnaire */}
      {isGestionnaire && exercices.length > 0 && !exercices.some(e => e.statut === 'ouvert') && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">{t('create')}</h3>
              <p className="text-xs text-muted-foreground">
                Tous les exercices sont clôturés. Créez un nouvel exercice.
              </p>
            </div>
            <Button onClick={handleCreateExercice} disabled={isCreating}>
              <Plus className="mr-1.5" />
              {isCreating ? '...' : t('create')}
            </Button>
          </div>
        </>
      )}

      {isGestionnaire && copro && (
        <>
          <Separator />
          <h2 className="text-xl font-semibold">{tAudit('title')}</h2>
          <AuditLog coproprieteId={copro.id} />
        </>
      )}
    </div>
  );
}
