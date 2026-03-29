'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Settings, FileText, Image as ImageIcon, Pencil, Trash2, CreditCard, Paperclip, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { deleteDepense, listDepenses as listDepensesService, listCategories as listCategoriesService, voteDepense, uploadDepenseDocument, removeDepenseDocument } from '@/services/depense';
import { useCoproContext } from '@/components/copro/CoproContext';
import { DepenseForm } from '@/components/depenses/DepenseForm';
import { CategoryManager } from '@/components/depenses/CategoryManager';
import { OverrideDialog } from '@/components/depenses/OverrideDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Tables } from '@/types/database.types';

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
  const td = useTranslations('dashboard');
  const tp = useTranslations('paiements');
  const { user } = useAuth();
  const { copro, membres, currentMembre, isGestionnaire, exercice } = useCoproContext();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const locale = pathname.split('/')[1] || 'fr';
  const coproBaseUrl = `/${locale}/copro/${copro?.id}`;

  const [depenses, setDepenses] = useState<DepenseWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('en_cours');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [selectedDepense, setSelectedDepense] = useState<DepenseWithRelations | null>(null);
  const [editingDepense, setEditingDepense] = useState<DepenseWithRelations | null>(null);
  const [rejectDepenseId, setRejectDepenseId] = useState<string | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');
  const [editingVoteDepenseId, setEditingVoteDepenseId] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);

  const handleVote = async (depenseId: string, vote: boolean, motif?: string) => {
    setIsVoting(true);
    const { error } = await voteDepense(depenseId, vote, motif);
    setIsVoting(false);
    if (error) { toast.error(error.message); return; }
    setRejectDepenseId(null);
    setRejectMotif('');
    setEditingVoteDepenseId(null);
    // Refetch with current filters and update selectedDepense
    if (!copro || !exercice) return;
    const effectiveStatus = currentTab === 'historique' ? 'paye' : (filterStatus !== 'all' ? filterStatus : 'en_cours_global');
    const { data } = await listDepensesService(
      copro.id, exercice.id,
      filterCategory !== 'all' ? filterCategory : undefined,
      effectiveStatus,
    );
    if (data) {
      const refreshed = data as unknown as DepenseWithRelations[];
      setDepenses(refreshed);
      if (selectedDepense) {
        const updated = refreshed.find(d => d.id === selectedDepense.id);
        setSelectedDepense(updated || null);
      }
    }
  };

  const fetchDepenses = useCallback(async (catId?: string, status?: string, tab?: string) => {
    if (!copro || !exercice) return;
    setLoading(true);
    const activeTab = tab ?? currentTab;
    // Tab determines the base filter; status filter further narrows within "en_cours" tab
    let effectiveStatus: string | undefined;
    if (activeTab === 'historique') {
      effectiveStatus = 'paye';
    } else {
      // "en_cours" tab: use sub-filter if set, otherwise "en_cours_global" (tout sauf payé)
      effectiveStatus = status && status !== 'all' ? status : 'en_cours_global';
    }
    const { data } = await listDepensesService(
      copro.id, exercice.id,
      catId && catId !== 'all' ? catId : undefined,
      effectiveStatus,
    );
    if (data) setDepenses(data as unknown as DepenseWithRelations[]);
    setLoading(false);
  }, [copro, exercice, currentTab]);

  const fetchCategories = useCallback(async () => {
    if (!copro) return;
    const { data } = await listCategoriesService(copro.id);
    if (data) setCategories(data as Category[]);
  }, [copro]);

  useEffect(() => {
    fetchDepenses();
    fetchCategories();
  }, [fetchDepenses, fetchCategories]);

  // Auto-open depense detail from ?depenseId= URL param
  useEffect(() => {
    if (depenses.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const depId = params.get('depenseId');
    if (depId) {
      const found = depenses.find(d => d.id === depId);
      if (found) setSelectedDepense(found);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [depenses]);

  const getMemberName = (membre: Tables<'membres'> & { profiles: Tables<'profiles'> | null }) => {
    if (membre.profiles) {
      return `${membre.profiles.prenom} ${membre.profiles.nom}`;
    }
    return membre.alias || '--';
  };

  const getVisibleStatus = (dep: DepenseWithRelations): string => {
    const depAny = dep as any;
    if (!depAny.is_validated) return 'en_attente_acceptation';
    const statuts = dep.repartitions.map(r => r.statut);
    if (statuts.length === 0) return 'en_attente_paiement';
    if (statuts.every(s => s === 'paye')) return 'paye';
    if (statuts.some(s => s === 'en_cours_paiement')) return 'en_cours_paiement';
    return 'en_attente_paiement';
  };

  const renderStatusWithCharge = (dep: DepenseWithRelations) => {
    const depAny = dep as any;
    return (
      <span className="inline-flex items-center gap-1">
        {depAny.is_charge && <Badge variant="outline">{t('charge')}</Badge>}
        {getVisibleStatusBadge(getVisibleStatus(dep))}
      </span>
    );
  };

  const getVisibleStatusBadge = (status: string) => {
    switch (status) {
      case 'en_attente_acceptation':
        return <Badge variant="secondary">{t('enAttenteAcceptation')}</Badge>;
      case 'en_attente_paiement':
        return <Badge variant="secondary">{t('enAttentePaiement')}</Badge>;
      case 'en_cours_paiement':
        return <Badge variant="secondary">{t('enCoursPaiement')}</Badge>;
      case 'paye':
        return <Badge variant="success">{t('paye')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleAddSuccess = () => {
    setAddOpen(false);
    fetchDepenses();
  };

  const handleDelete = async (dep: any) => {
    if (!user) return;
    const { error } = await deleteDepense(dep.id, dep.version || 1);
    if (error) { toast.error(error.message); return; }
    setSelectedDepense(null);
    fetchDepenses();
  };

  const renderDepenseDetail = (dep: DepenseWithRelations) => {
    const depAny = dep as any;
    const canEdit = depAny.can_edit === true;
    const canDelete = depAny.can_delete === true;
    const canOverride = isGestionnaire;

    // Check if partially covered
    const sumEffective = dep.repartitions.reduce((s, r) => s + (r.montant_override ?? r.montant_du), 0);
    const isPartiallyCovered = sumEffective < dep.montant_total && dep.repartitions.length > 0;

    return (
    <div className="space-y-4">
      {(canEdit || canDelete) && (
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditingDepense(dep); setEditOpen(true); }}
            >
              <Pencil className="h-4 w-4 mr-1" />
              {tc('edit')}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => handleDelete(dep)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {tc('delete')}
            </Button>
          )}
        </div>
      )}
      {isPartiallyCovered && (
        <Badge variant="outline">{t('partiellementCouvert')}</Badge>
      )}

      {/* Validation status */}
      {!depAny.is_validated && (() => {
        const myVote = (depAny.votes as any[] || []).find((v: any) => v.membre_id === currentMembre?.id);
        const voteCount = (depAny.votes as any[] || []).filter((v: any) => v.vote).length;
        return (
          <div className="space-y-2 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{t('enAttenteAcceptation')}</Badge>
              <span className="text-xs text-muted-foreground">
                <span className="text-primary font-semibold">{voteCount}/{depAny.total_members || 0} {t('votesLabel')}</span>
              </span>
            </div>

            {rejectDepenseId === dep.id ? (
              /* Inline reject with reason */
              <div className="space-y-2 pt-2 border-t">
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                  placeholder={t('motifRejet')}
                  value={rejectMotif}
                  onChange={(e) => setRejectMotif(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={!rejectMotif.trim() || isVoting}
                    onClick={() => handleVote(dep.id, false, rejectMotif)}>
                    {t('refuser')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setRejectDepenseId(null); setRejectMotif(''); }}>
                    {tc('cancel')}
                  </Button>
                </div>
              </div>
            ) : myVote && editingVoteDepenseId !== dep.id ? (
              /* Already voted — show modify button + badge aligned right */
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={() => setEditingVoteDepenseId(dep.id)}>
                  {t('modifyVote')}
                </Button>
                <Badge variant={myVote.vote ? 'success' : 'destructive'}>
                  {myVote.vote ? `${t('accepted')} ✓` : `${t('rejected')} ✗`}
                </Badge>
              </div>
            ) : (
              /* Vote buttons (no vote yet or editing) */
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={isVoting} onClick={() => handleVote(dep.id, true)}>
                  {t('accepter')}
                </Button>
                <Button size="sm" variant="outline" disabled={isVoting} onClick={() => setRejectDepenseId(dep.id)}>
                  {t('refuser')}
                </Button>
              </div>
            )}
          </div>
        );
      })()}

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{dep.date_depense}</Badge>
        {dep.categories_depenses && <Badge variant="outline">{dep.categories_depenses.nom}</Badge>}
        <Badge variant="outline">{t(dep.frequence)}</Badge>
      </div>

      {dep.description && (
        <p className="text-sm text-muted-foreground">{dep.description}</p>
      )}


      <div className="space-y-2 mt-4">
        <p className="text-xs font-medium text-muted-foreground">Répartitions</p>
        <div className="space-y-0 ml-3">
          {dep.repartitions.map(rep => {
            const effectiveAmount = rep.montant_override ?? rep.montant_du;
            const name = getMemberName(rep.membres);
            const memberVote = !depAny.is_validated
              ? (depAny.votes as any[] || []).find((v: any) => v.membre_id === rep.membres?.id)
              : null;

            // Line 2 status — always a Badge
            let repStatus: React.ReactNode = null;
            if (!depAny.is_validated) {
              if (memberVote?.vote === true) repStatus = <Badge variant="success">{t('accepted')}</Badge>;
              else if (memberVote?.vote === false) repStatus = <Badge variant="destructive">{t('rejected')}</Badge>;
              else repStatus = <Badge variant="secondary">{t('enAttenteAcceptation')}</Badge>;
            } else {
              switch (rep.statut) {
                case 'en_cours': repStatus = <Badge variant="secondary">{t('enAttentePaiement')}</Badge>; break;
                case 'en_cours_paiement':
                  if (isGestionnaire) {
                    repStatus = (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); window.location.href = `${coproBaseUrl}/paiements`; }}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        {tp('markAsPaid')}
                      </Button>
                    );
                  } else {
                    repStatus = <Badge variant="secondary">{t('enCoursPaiement')}</Badge>;
                  }
                  break;
                case 'paye': repStatus = <Badge variant="success">{t('paye')}</Badge>; break;
              }
            }

            const amountEl = canOverride ? (
              <OverrideDialog
                repartition={rep}
                memberName={name}
                coproprieteId={copro?.id}
                onSuccess={() => { fetchDepenses(); setSelectedDepense(null); }}
              >
                <span className="underline decoration-dashed cursor-pointer hover:text-primary font-bold">
                  {effectiveAmount.toFixed(2)} {copro?.devise}
                  {rep.montant_override !== null && <span className="ml-1 text-xs font-normal text-muted-foreground">(mod.)</span>}
                </span>
              </OverrideDialog>
            ) : (
              <span className="font-bold">
                {effectiveAmount.toFixed(2)} {copro?.devise}
                {rep.montant_override !== null && <span className="ml-1 text-xs font-normal text-muted-foreground">(mod.)</span>}
              </span>
            );

            const isMe = rep.membres?.user_id === user?.id;
            return (
              <div key={rep.id} className={`py-2 border-b border-dashed last:border-0 ${isMe ? 'bg-muted/50 rounded px-2 -mx-2' : ''}`}>
                {/* Line 1: name */}
                <p className="text-sm">{name}</p>
                {/* Line 2: status + pay btn + amount */}
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="flex items-center gap-2">
                    {repStatus}
                  </div>
                  <div className="text-sm shrink-0">{amountEl}</div>
                </div>
                {/* Line 3: rejection reason if applicable */}
                {memberVote?.vote === false && memberVote.motif_rejet && (
                  <div className="mt-1 bg-muted rounded p-2 text-xs text-muted-foreground">
                    {memberVote.motif_rejet}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Pay button — after repartition list, aligned right with user's amount */}
        {depAny.is_validated && (() => {
          const myRep = dep.repartitions.find(r => r.membres?.user_id === user?.id && r.statut === 'en_cours');
          if (!myRep) return null;
          const myAmount = myRep.montant_override ?? myRep.montant_du;
          return (
            <div className="flex items-center justify-end gap-2 pt-2">
              <span className="text-sm font-bold">{myAmount.toFixed(2)} {copro?.devise}</span>
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); window.location.href = `${coproBaseUrl}/paiements?generate=true`; }}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                {td('pay')}
              </Button>
            </div>
          );
        })()}
      </div>

      {/* Documents section */}
      <div className="space-y-2 mt-4">
        <p className="text-xs font-medium text-muted-foreground">{t('documents')}</p>
        {(() => {
          const docs = (depAny.documents as any[] || []);
          return (
            <div className="space-y-1 ml-3">
              {docs.map((doc: any) => {
                const isImage = /\.(jpg|jpeg|png|webp)$/i.test(doc.filename);
                return (
                  <div key={doc.id} className="flex items-center justify-between py-1 border-b border-dashed last:border-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs hover:text-primary transition-colors min-w-0"
                    >
                      {isImage ? <ImageIcon className="h-3.5 w-3.5 shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{doc.filename}</span>
                    </a>
                    {doc.uploaded_by === user?.id && (
                      confirmDeleteDocId === doc.id ? (
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={async () => {
                            const { error } = await removeDepenseDocument(doc.id);
                            setConfirmDeleteDocId(null);
                            if (error) { toast.error(error.message); return; }
                            const { data } = await listDepensesService(
                              copro!.id, exercice!.id,
                              filterCategory !== 'all' ? filterCategory : undefined,
                              filterStatus !== 'all' ? filterStatus : undefined,
                            );
                            if (data) {
                              const refreshed = data as unknown as DepenseWithRelations[];
                              setDepenses(refreshed);
                              const updated = refreshed.find(d => d.id === dep.id);
                              if (updated) setSelectedDepense(updated);
                            }
                          }}>{tc('confirm')}</Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setConfirmDeleteDocId(null)}>{tc('cancel')}</Button>
                        </div>
                      ) : (
                        <button
                          className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                          onClick={() => setConfirmDeleteDocId(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
              {docs.length < 5 && (
                <>
                  <input
                    id={`doc-upload-${dep.id}`}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !copro) return;
                      const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
                      if (!allowed.includes(file.type)) { toast.error(t('fileTypeError')); e.target.value = ''; return; }
                      const { error } = await uploadDepenseDocument({ depenseId: dep.id, coproId: copro.id, file });
                      e.target.value = '';
                      if (error) { toast.error(error.message); return; }
                      // Refresh
                      const { data } = await listDepensesService(
                        copro.id, exercice!.id,
                        filterCategory !== 'all' ? filterCategory : undefined,
                        filterStatus !== 'all' ? filterStatus : undefined,
                      );
                      if (data) {
                        const refreshed = data as unknown as DepenseWithRelations[];
                        setDepenses(refreshed);
                        const updated = refreshed.find(d => d.id === dep.id);
                        if (updated) setSelectedDepense(updated);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={() => document.getElementById(`doc-upload-${dep.id}`)?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1" />
                    {t('addDocument')}
                  </Button>
                </>
              )}
              {docs.length === 0 && docs.length >= 5 && null}
            </div>
          );
        })()}
      </div>

    </div>
  );
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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          {currentMembre && (
            <span className="text-sm text-muted-foreground">
              {td('solde')} : <span className="font-bold text-foreground">{(currentMembre.solde ?? 0).toFixed(2)} {copro?.devise}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isGestionnaire && (
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
          )}

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
              <DepenseForm onSuccess={handleAddSuccess} isGestionnaire={isGestionnaire} />
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingDepense(null); }}>
            <DialogContent className="sm:max-w-lg">
              {editingDepense && (
                <DepenseForm
                  depense={editingDepense}
                  isGestionnaire={isGestionnaire}
                  onSuccess={() => { setEditOpen(false); setEditingDepense(null); setSelectedDepense(null); fetchDepenses(); }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={(v) => { setCurrentTab(v); setFilterCategory('all'); setFilterStatus('all'); fetchDepenses('all', 'all', v); }}>
        <TabsList className="w-full">
          <TabsTrigger value="en_cours" className="flex-1">{t('inProgress')}</TabsTrigger>
          <TabsTrigger value="historique" className="flex-1">{t('history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="en_cours" className="mt-4">
          {/* Filters — only in "en cours" tab */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-muted-foreground">{t('filter')}</span>
            <Select value={filterCategory} onValueChange={(v) => { const val = v ?? 'all'; setFilterCategory(val); fetchDepenses(val, filterStatus); }}>
              <SelectTrigger>
                {filterCategory !== 'all'
                  ? <span data-slot="select-value" className="flex flex-1 text-left">{categories.find(c => c.id === filterCategory)?.nom}</span>
                  : <span data-slot="select-value" className="flex flex-1 text-left text-muted-foreground">{t('category')}</span>
                }
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('category')}</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { const val = v ?? 'all'; setFilterStatus(val); fetchDepenses(filterCategory, val); }}>
              <SelectTrigger>
                {filterStatus !== 'all'
                  ? <span data-slot="select-value" className="flex flex-1 text-left">{
                      filterStatus === 'en_attente_acceptation' ? t('enAttenteAcceptation') :
                      filterStatus === 'en_attente_paiement' ? t('enAttentePaiement') :
                      filterStatus === 'en_cours_paiement' ? t('enCoursPaiement') :
                      t('status')
                    }</span>
                  : <span data-slot="select-value" className="flex flex-1 text-left text-muted-foreground">{t('status')}</span>
                }
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('status')}</SelectItem>
                <SelectItem value="en_attente_acceptation">{t('enAttenteAcceptation')}</SelectItem>
                <SelectItem value="en_attente_paiement">{t('enAttentePaiement')}</SelectItem>
                <SelectItem value="en_cours_paiement">{t('enCoursPaiement')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {depenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('noDepenses')}</div>
          ) : (<>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">{t('label')}</th>
                    <th className="pb-2 font-medium">{t('date')}</th>
                    <th className="pb-2 font-medium">{t('category')}</th>
                    <th className="pb-2 font-medium text-right">{t('amount')}</th>
                    <th className="pb-2 font-medium text-right">{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {depenses.map(dep => (
                    <tr key={dep.id} className="border-b hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedDepense(dep)}>
                      <td className="py-2.5 font-medium">{dep.libelle}</td>
                      <td className="py-2.5 text-muted-foreground">{dep.date_depense}</td>
                      <td className="py-2.5 text-muted-foreground">{dep.categories_depenses?.nom ?? '-'}</td>
                      <td className="py-2.5 text-right font-medium">{dep.montant_total.toFixed(2)} {copro?.devise}</td>
                      <td className="py-2.5 text-right">{renderStatusWithCharge(dep)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden grid gap-2">
              {depenses.map(dep => (
                <div key={dep.id} className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors" onClick={() => setSelectedDepense(dep)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{dep.libelle}</span>
                    {renderStatusWithCharge(dep)}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{dep.date_depense} · {dep.categories_depenses?.nom ?? '-'}</span>
                    <span className="text-sm font-medium">{dep.montant_total.toFixed(2)} {copro?.devise}</span>
                  </div>
                </div>
              ))}
            </div>
          </>)}
        </TabsContent>

        <TabsContent value="historique" className="mt-4">
          {depenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('noDepenses')}</div>
          ) : (<>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">{t('label')}</th>
                    <th className="pb-2 font-medium">{t('date')}</th>
                    <th className="pb-2 font-medium">{t('category')}</th>
                    <th className="pb-2 font-medium text-right">{t('amount')}</th>
                    <th className="pb-2 font-medium text-right">{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {depenses.map(dep => (
                    <tr key={dep.id} className="border-b hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedDepense(dep)}>
                      <td className="py-2.5 font-medium">{dep.libelle}</td>
                      <td className="py-2.5 text-muted-foreground">{dep.date_depense}</td>
                      <td className="py-2.5 text-muted-foreground">{dep.categories_depenses?.nom ?? '-'}</td>
                      <td className="py-2.5 text-right font-medium">{dep.montant_total.toFixed(2)} {copro?.devise}</td>
                      <td className="py-2.5 text-right">{renderStatusWithCharge(dep)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden grid gap-2">
              {depenses.map(dep => (
                <div key={dep.id} className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors" onClick={() => setSelectedDepense(dep)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{dep.libelle}</span>
                    {renderStatusWithCharge(dep)}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{dep.date_depense} · {dep.categories_depenses?.nom ?? '-'}</span>
                    <span className="text-sm font-medium">{dep.montant_total.toFixed(2)} {copro?.devise}</span>
                  </div>
                </div>
              ))}
            </div>
          </>)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedDepense} onOpenChange={(open) => { if (!open) setSelectedDepense(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedDepense && (
            <>
              <DialogHeader>
                <DialogTitle>&nbsp;</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between gap-2 -mt-2">
                <span className="text-lg font-bold">{selectedDepense.libelle}</span>
                <span className="text-lg font-bold shrink-0">{selectedDepense.montant_total.toFixed(2)} {copro?.devise}</span>
              </div>
              {renderDepenseDetail(selectedDepense)}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
