'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCoproContext } from '@/components/copro/CoproContext';
import { DepenseForm } from '@/components/depenses/DepenseForm';
import { CategoryManager } from '@/components/depenses/CategoryManager';
import { OverrideDialog } from '@/components/depenses/OverrideDialog';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from '@/components/ui/dialog';
import type { Tables, Enums } from '@/types/database.types';

type Depense = Tables<'depenses'>;
type Repartition = Tables<'repartitions'>;
type Category = Tables<'categories_depenses'>;

type DepenseWithRelations = Depense & {
  categories_depenses: Category | null;
  repartitions: (Repartition & {
    membres: Tables<'membres'> & { profiles: Tables<'profiles'> | null };
  })[];
};

export function DepensesPageContent() {
  const t = useTranslations('depenses');
  const tc = useTranslations('common');
  const { copro, membres, isGestionnaire, exercice } = useCoproContext();

  const [depenses, setDepenses] = useState<DepenseWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const fetchDepenses = useCallback(async () => {
    if (!copro || !exercice) return;
    setLoading(true);

    const { data } = await supabase
      .from('depenses')
      .select(`
        *,
        categories_depenses(*),
        repartitions(*, membres(*, profiles(*)))
      `)
      .eq('copropriete_id', copro.id)
      .eq('exercice_id', exercice.id)
      .order('date_depense', { ascending: false });

    if (data) setDepenses(data as unknown as DepenseWithRelations[]);
    setLoading(false);
  }, [copro, exercice]);

  const fetchCategories = useCallback(async () => {
    if (!copro) return;
    const { data } = await supabase
      .from('categories_depenses')
      .select('*')
      .or(`is_global.eq.true,copropriete_id.eq.${copro.id}`)
      .order('nom');
    if (data) setCategories(data);
  }, [copro]);

  useEffect(() => {
    fetchDepenses();
    fetchCategories();
  }, [fetchDepenses, fetchCategories]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusBadge = (statut: Enums<'statut_paiement'>) => {
    switch (statut) {
      case 'en_cours':
        return <Badge variant="outline">{t('enCours')}</Badge>;
      case 'en_cours_paiement':
        return <Badge variant="secondary">{t('enCoursPaiement')}</Badge>;
      case 'paye':
        return <Badge variant="default">{t('paye')}</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const getMemberName = (membre: Tables<'membres'> & { profiles: Tables<'profiles'> | null }) => {
    if (membre.profiles) {
      return `${membre.profiles.prenom} ${membre.profiles.nom}`;
    }
    return membre.alias || '--';
  };

  // Compute the dominant status for the depense from its repartitions
  const getDepenseStatus = (depense: DepenseWithRelations): Enums<'statut_paiement'> => {
    const statuts = depense.repartitions.map(r => r.statut);
    if (statuts.every(s => s === 'paye')) return 'paye';
    if (statuts.some(s => s === 'en_cours_paiement')) return 'en_cours_paiement';
    return 'en_cours';
  };

  // Filter depenses
  const filteredDepenses = depenses.filter(dep => {
    if (filterCategory !== 'all' && dep.categorie_id !== filterCategory) return false;
    if (filterStatus !== 'all' && getDepenseStatus(dep) !== filterStatus) return false;
    return true;
  });

  const handleAddSuccess = () => {
    setAddOpen(false);
    fetchDepenses();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          {isGestionnaire && (
            <>
              <Dialog open={catOpen} onOpenChange={setCatOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline">
                      <Settings className="mr-1.5" />
                      {t('categories')}
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-md">
                  <CategoryManager />
                </DialogContent>
              </Dialog>

              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger
                  render={
                    <Button>
                      <Plus className="mr-1.5" />
                      {t('add')}
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-lg">
                  <DepenseForm onSuccess={handleAddSuccess} />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">{t('filterByCategory')}:</span>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? 'all')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">--</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('filterByStatus')}:</span>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">--</SelectItem>
              <SelectItem value="en_cours">{t('enCours')}</SelectItem>
              <SelectItem value="en_cours_paiement">{t('enCoursPaiement')}</SelectItem>
              <SelectItem value="paye">{t('paye')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredDepenses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('noDepenses')}
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t('label')}</TableHead>
              <TableHead>{t('amount')}</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead>{t('recurrence')}</TableHead>
              <TableHead>{t('status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDepenses.map(dep => (
              <Fragment key={dep.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => toggleRow(dep.id)}
                >
                  <TableCell>
                    {expandedRows.has(dep.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{dep.libelle}</TableCell>
                  <TableCell>{dep.montant_total.toFixed(2)} {copro?.devise}</TableCell>
                  <TableCell>{dep.date_depense}</TableCell>
                  <TableCell>{dep.categories_depenses?.nom ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(dep.frequence)}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(getDepenseStatus(dep))}</TableCell>
                </TableRow>
                {expandedRows.has(dep.id) && (
                  <TableRow key={`${dep.id}-detail`}>
                    <TableCell colSpan={7}>
                      <div className="py-2 px-4 bg-muted/30 rounded-lg">
                        {dep.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {dep.description}
                          </p>
                        )}
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1 font-medium">Membre</th>
                              <th className="text-right py-1 font-medium">{t('amount')}</th>
                              <th className="text-right py-1 font-medium">{t('override')}</th>
                              <th className="text-center py-1 font-medium">{t('status')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dep.repartitions.map(rep => {
                              const effectiveAmount = rep.montant_override ?? rep.montant_du;
                              const name = getMemberName(rep.membres);
                              return (
                                <tr key={rep.id} className="border-b border-dashed">
                                  <td className="py-1">{name}</td>
                                  <td className="text-right py-1">
                                    {rep.montant_du.toFixed(2)} {copro?.devise}
                                  </td>
                                  <td className="text-right py-1">
                                    {isGestionnaire ? (
                                      <OverrideDialog
                                        repartition={rep}
                                        memberName={name}
                                        coproprieteId={copro?.id}
                                        onSuccess={fetchDepenses}
                                      >
                                        <span className="underline decoration-dashed cursor-pointer hover:text-primary">
                                          {effectiveAmount.toFixed(2)} {copro?.devise}
                                          {rep.montant_override !== null && (
                                            <span className="ml-1 text-xs text-muted-foreground">
                                              (modifie)
                                            </span>
                                          )}
                                        </span>
                                      </OverrideDialog>
                                    ) : (
                                      <span>
                                        {effectiveAmount.toFixed(2)} {copro?.devise}
                                        {rep.montant_override !== null && (
                                          <span className="ml-1 text-xs text-muted-foreground">
                                            (modifie)
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-center py-1">
                                    {getStatusBadge(rep.statut)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {dep.repartitions.some(r => r.motif_override) && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {dep.repartitions
                              .filter(r => r.motif_override)
                              .map(r => (
                                <p key={r.id}>
                                  {getMemberName(r.membres)}: {r.motif_override}
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  );
}
