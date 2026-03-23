'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, ChevronDown, ChevronRight, Settings, FileText, Image as ImageIcon } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [selectedDepense, setSelectedDepense] = useState<DepenseWithRelations | null>(null);

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

  const getDepenseStatus = (depense: DepenseWithRelations): Enums<'statut_paiement'> => {
    const statuts = depense.repartitions.map(r => r.statut);
    if (statuts.length === 0) return 'en_cours';
    if (statuts.every(s => s === 'paye')) return 'paye';
    if (statuts.some(s => s === 'en_cours_paiement')) return 'en_cours_paiement';
    return 'en_cours';
  };

  const filteredDepenses = depenses.filter(dep => {
    if (filterCategory !== 'all' && dep.categorie_id !== filterCategory) return false;
    if (filterStatus !== 'all' && getDepenseStatus(dep) !== filterStatus) return false;
    return true;
  });

  const handleAddSuccess = () => {
    setAddOpen(false);
    fetchDepenses();
  };

  // Shared detail content for both sheet and expanded row
  const renderDepenseDetail = (dep: DepenseWithRelations) => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{dep.date_depense}</Badge>
        {dep.categories_depenses && <Badge variant="outline">{dep.categories_depenses.nom}</Badge>}
        <Badge variant="outline">{t(dep.frequence)}</Badge>
        {getStatusBadge(getDepenseStatus(dep))}
      </div>

      {dep.description && (
        <p className="text-sm text-muted-foreground">{dep.description}</p>
      )}

      {dep.justificatif_urls && dep.justificatif_urls.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('files')}</p>
          <div className="flex flex-wrap gap-2">
            {dep.justificatif_urls.map((url, i) => {
              const fileName = decodeURIComponent(url.split('/').pop() || `file-${i + 1}`);
              const isImage = /\.(jpg|jpeg|png|webp)$/i.test(url);
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs bg-background border rounded-md px-2 py-1 hover:bg-accent transition-colors"
                >
                  {isImage ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                  <span className="max-w-[150px] truncate">{fileName}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Répartitions</p>
        <div className="space-y-1">
          {dep.repartitions.map(rep => {
            const effectiveAmount = rep.montant_override ?? rep.montant_du;
            const name = getMemberName(rep.membres);
            const sumOther = dep.repartitions
              .filter(r => r.id !== rep.id)
              .reduce((s, r) => s + (r.montant_override ?? r.montant_du), 0);
            return (
              <div key={rep.id} className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm truncate">{name}</span>
                  {getStatusBadge(rep.statut)}
                </div>
                <div className="text-sm font-medium shrink-0 ml-2">
                  {isGestionnaire ? (
                    <OverrideDialog
                      repartition={rep}
                      memberName={name}
                      coproprieteId={copro?.id}
                      onSuccess={() => { fetchDepenses(); setSelectedDepense(null); }}
                    >
                      <span className="underline decoration-dashed cursor-pointer hover:text-primary">
                        {effectiveAmount.toFixed(2)} {copro?.devise}
                        {rep.montant_override !== null && (
                          <span className="ml-1 text-xs text-muted-foreground">(mod.)</span>
                        )}
                      </span>
                    </OverrideDialog>
                  ) : (
                    <span>
                      {effectiveAmount.toFixed(2)} {copro?.devise}
                      {rep.montant_override !== null && (
                        <span className="ml-1 text-xs text-muted-foreground">(mod.)</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dep.repartitions.some(r => r.motif_override) && (
        <div className="text-xs text-muted-foreground">
          {dep.repartitions
            .filter(r => r.motif_override)
            .map(r => (
              <p key={r.id}>{getMemberName(r.membres)}: {r.motif_override}</p>
            ))}
        </div>
      )}
    </div>
  );

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
              {filterCategory !== 'all'
                ? <span data-slot="select-value" className="flex flex-1 text-left">{categories.find(c => c.id === filterCategory)?.nom}</span>
                : <SelectValue />
              }
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
      ) : (<>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filteredDepenses.map(dep => (
            <div
              key={dep.id}
              className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
              onClick={() => setSelectedDepense(dep)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{dep.libelle}</span>
                {getStatusBadge(getDepenseStatus(dep))}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{dep.date_depense}</span>
                <span className="text-sm font-medium">{dep.montant_total.toFixed(2)} {copro?.devise}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow
                  key={dep.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedDepense(dep)}
                >
                  <TableCell className="font-medium">{dep.libelle}</TableCell>
                  <TableCell>{dep.montant_total.toFixed(2)} {copro?.devise}</TableCell>
                  <TableCell>{dep.date_depense}</TableCell>
                  <TableCell>{dep.categories_depenses?.nom ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(dep.frequence)}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(getDepenseStatus(dep))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Detail sheet (bottom on mobile, right on desktop) */}
        <Sheet open={!!selectedDepense} onOpenChange={(open) => { if (!open) setSelectedDepense(null); }}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            {selectedDepense && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between gap-2">
                    <span>{selectedDepense.libelle}</span>
                    <span className="text-base">{selectedDepense.montant_total.toFixed(2)} {copro?.devise}</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6">
                  {renderDepenseDetail(selectedDepense)}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </>)}
    </div>
  );
}
