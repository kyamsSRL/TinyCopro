'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FileDown, Plus, CheckCircle, Paperclip, ExternalLink, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createDepositSchema } from '@/lib/validation';
import { useCoproContext } from '@/components/copro/CoproContext';
import { GeneratePaymentForm } from '@/components/paiements/GeneratePaymentForm';
import { MarkAsPaidDialog } from '@/components/paiements/MarkAsPaidDialog';
import { generatePaymentPdf, downloadBlob } from '@/lib/pdf-generator';
import type { PdfPaymentData } from '@/lib/pdf-generator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { uploadProof, listAppels, createDeposit } from '@/services/paiement';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Tables, Enums } from '@/types/database.types';

type AppelPaiement = Tables<'appels_paiement'>;

type AppelWithMember = AppelPaiement & {
  membres: Tables<'membres'> & {
    profiles: Tables<'profiles'>;
  };
  paiements: Tables<'paiements'>[];
  appel_repartitions: {
    repartitions: Tables<'repartitions'> & {
      depenses: Tables<'depenses'>;
    };
  }[];
};

export function PaiementsPageContent() {
  const t = useTranslations('paiements');
  const tc = useTranslations('common');
  const { copro, currentMembre, isGestionnaire } = useCoproContext();

  const [myAppels, setMyAppels] = useState<AppelWithMember[]>([]);
  const [allAppels, setAllAppels] = useState<AppelWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);
  const [selectedAppel, setSelectedAppel] = useState<AppelWithMember | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);

  const tv = useTranslations('validation');
  const depositSchema = createDepositSchema(tv);
  type DepositFormValues = z.infer<typeof depositSchema>;

  const depositForm = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: { montant: '', reference: '', date_depot: new Date().toISOString().split('T')[0] },
  });

  // Auto-open generate dialog if ?generate=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('generate') === 'true') setGenerateOpen(true);
    }
  }, []);

  const handleDeposit = async (values: DepositFormValues) => {
    if (!copro) return;
    const montant = parseFloat(values.montant);
    if (isNaN(montant) || montant <= 0) return;
    setIsDepositing(true);
    const { error } = await createDeposit({ coproId: copro.id, montant, reference: values.reference, date: values.date_depot });
    setIsDepositing(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('depositSuccess'));
    setDepositOpen(false);
    depositForm.reset();
    fetchAppels();
  };

  const handleUploadProof = async (paiementId: string, file: File) => {
    if (!copro) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error(t('fileTypeError'));
      return;
    }
    setUploadingProofId(paiementId);
    const { error: proofError } = await uploadProof({ paiementId, coproId: copro.id, file });
    if (proofError) {
      toast.error(proofError.message);
      setUploadingProofId(null);
      return;
    }
    setUploadingProofId(null);
    setSelectedAppel(null);
    fetchAppels();
  };

  const fetchAppels = useCallback(async () => {
    if (!copro || !currentMembre) return;
    setLoading(true);

    const { data: myData } = await listAppels(copro.id, currentMembre.id);
    if (myData) setMyAppels(myData as unknown as AppelWithMember[]);

    if (isGestionnaire) {
      const { data: allData } = await listAppels(copro.id);
      if (allData) setAllAppels(allData as unknown as AppelWithMember[]);
    }

    setLoading(false);
  }, [copro, currentMembre, isGestionnaire]);

  useEffect(() => {
    fetchAppels();
  }, [fetchAppels]);

  const getStatusBadge = (statut: Enums<'statut_paiement'>) => {
    switch (statut) {
      case 'en_cours':
        return <Badge variant="outline">{t('generate')}</Badge>;
      case 'en_cours_paiement':
        return <Badge variant="secondary">{t('confirmPayment')}</Badge>;
      case 'paye':
        return <Badge variant="default">{t('markAsPaid')}</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const getMemberName = (appel: AppelWithMember) => {
    return `${appel.membres.profiles.prenom} ${appel.membres.profiles.nom}`;
  };

  const handleDownloadPdf = async (appel: AppelWithMember) => {
    if (!copro) return;
    setDownloadingId(appel.id);
    try {
      const expenses = appel.appel_repartitions.map(ar => ({
        libelle: ar.repartitions.depenses.libelle,
        date: ar.repartitions.depenses.date_depense,
        montant: ar.repartitions.montant_override ?? ar.repartitions.montant_du,
      }));
      const pdfData: PdfPaymentData = {
        coproName: copro.nom, coproAddress: copro.adresse,
        memberName: getMemberName(appel), memberAddress: appel.membres.profiles.adresse,
        reference: appel.reference, expenses, total: appel.montant_total,
        iban: copro.iban, bic: copro.bic ?? '', currency: copro.devise,
      };
      const blob = await generatePaymentPdf(pdfData);
      downloadBlob(blob, `${appel.reference}.pdf`);
    } catch { /* PDF error */ } finally { setDownloadingId(null); }
  };

  const handleGenerateSuccess = () => { setGenerateOpen(false); fetchAppels(); };

  const renderActions = (appel: AppelWithMember) => {
    const paiement = appel.paiements?.[0];
    const preuveUrl = paiement?.preuve_paiement_url;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleDownloadPdf(appel)} disabled={downloadingId === appel.id}>
          <FileDown className="h-4 w-4 mr-1" />
          {t('downloadPdf')}
        </Button>
        {isGestionnaire && appel.statut !== 'paye' && (
          <MarkAsPaidDialog appel={appel} coproprieteId={copro?.id} memberEmail={appel.membres?.profiles?.email} onSuccess={fetchAppels}>
            <Button variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-1" />
              {t('markAsPaid')}
            </Button>
          </MarkAsPaidDialog>
        )}
        {appel.statut === 'paye' && preuveUrl && (
          <a href={preuveUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              {t('proofOfPayment')}
            </Button>
          </a>
        )}
        {appel.statut === 'paye' && !preuveUrl && paiement && (
          <>
            <input
              id={`proof-${paiement.id}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadProof(paiement.id, file);
                e.target.value = '';
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={uploadingProofId === paiement.id}
              onClick={() => document.getElementById(`proof-${paiement.id}`)?.click()}
            >
              <Paperclip className="h-4 w-4 mr-1" />
              {uploadingProofId === paiement.id ? '...' : t('addProof')}
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderAppelsList = (appels: AppelWithMember[], showMember: boolean) => {
    if (appels.length === 0) {
      return <div className="text-center py-12 text-muted-foreground">{t('noPaiements')}</div>;
    }
    return (
      <div className="grid gap-2 md:grid-cols-2">
        {appels.map(appel => (
          <div
            key={appel.id}
            className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
            onClick={() => setSelectedAppel(appel)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{appel.reference}</span>
              {getStatusBadge(appel.statut)}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {showMember && `${getMemberName(appel)} · `}
                {new Date(appel.created_at).toLocaleDateString()}
              </span>
              <span className="text-sm font-medium">{appel.montant_total.toFixed(2)} {copro?.devise}</span>
            </div>
          </div>
        ))}
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="mr-1.5" />
                {t('generate')}
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <GeneratePaymentForm onSuccess={handleGenerateSuccess} />
          </DialogContent>
        </Dialog>

        <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
          <DialogTrigger
            render={
              <Button variant="outline">
                <Wallet className="mr-1.5" />
                {t('deposit')}
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('deposit')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={depositForm.handleSubmit(handleDeposit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-montant">{t('depositAmount')} *</Label>
                <Input id="deposit-montant" type="number" step="0.01" min="0.01" {...depositForm.register('montant')} />
                {depositForm.formState.errors.montant && (
                  <p className="text-sm text-destructive">{depositForm.formState.errors.montant.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-ref">{t('paymentReference')}</Label>
                <Input id="deposit-ref" {...depositForm.register('reference')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-date">{t('depositDate')} *</Label>
                <Input id="deposit-date" type="date" {...depositForm.register('date_depot')} />
                {depositForm.formState.errors.date_depot && (
                  <p className="text-sm text-destructive">{depositForm.formState.errors.date_depot.message}</p>
                )}
              </div>
              <Button type="submit" disabled={isDepositing} className="w-full">
                {isDepositing ? '...' : t('deposit')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isGestionnaire ? (
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">{t('history')}</TabsTrigger>
            <TabsTrigger value="all">{t('title')}</TabsTrigger>
          </TabsList>
          <TabsContent value="my" className="mt-4">
            {renderAppelsList(myAppels, false)}
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            {renderAppelsList(allAppels, true)}
          </TabsContent>
        </Tabs>
      ) : (
        <div>{renderAppelsList(myAppels, false)}</div>
      )}

      <Dialog open={!!selectedAppel} onOpenChange={(open) => { if (!open) setSelectedAppel(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedAppel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span>{selectedAppel.reference}</span>
                  <span className="text-base">{selectedAppel.montant_total.toFixed(2)} {copro?.devise}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedAppel.statut)}
                  <Badge variant="outline">{new Date(selectedAppel.created_at).toLocaleDateString()}</Badge>
                  <Badge variant="outline">{getMemberName(selectedAppel)}</Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t('selectDepenses')}</p>
                  {selectedAppel.appel_repartitions.map(ar => (
                    <div key={ar.repartitions.id} className="flex justify-between py-1.5 border-b border-dashed last:border-0 text-sm">
                      <span>{ar.repartitions.depenses.libelle}</span>
                      <span className="font-medium">{(ar.repartitions.montant_override ?? ar.repartitions.montant_du).toFixed(2)} {copro?.devise}</span>
                    </div>
                  ))}
                </div>

                {renderActions(selectedAppel)}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
