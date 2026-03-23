'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FileDown, Plus, CheckCircle, Paperclip, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useCoproContext } from '@/components/copro/CoproContext';
import { GeneratePaymentForm } from '@/components/paiements/GeneratePaymentForm';
import { MarkAsPaidDialog } from '@/components/paiements/MarkAsPaidDialog';
import { generatePaymentPdf, downloadBlob } from '@/lib/pdf-generator';
import type { PdfPaymentData } from '@/lib/pdf-generator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);
  const [selectedAppel, setSelectedAppel] = useState<AppelWithMember | null>(null);

  const handleUploadProof = async (paiementId: string, file: File) => {
    if (!copro) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error(t('fileTypeError'));
      return;
    }
    setUploadingProofId(paiementId);
    const ext = file.name.split('.').pop();
    const filePath = `${copro.id}/preuves/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('justificatifs')
      .upload(filePath, file);
    if (uploadError) {
      toast.error(uploadError.message);
      setUploadingProofId(null);
      return;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('justificatifs')
      .getPublicUrl(filePath);
    await supabase.from('paiements').update({ preuve_paiement_url: publicUrl }).eq('id', paiementId);
    setUploadingProofId(null);
    setSelectedAppel(null);
    fetchAppels();
  };

  const fetchAppels = useCallback(async () => {
    if (!copro || !currentMembre) return;
    setLoading(true);

    const { data: myData } = await supabase
      .from('appels_paiement')
      .select(`
        *,
        membres(*, profiles(*)),
        paiements(*),
        appel_repartitions(repartitions(*, depenses(*)))
      `)
      .eq('copropriete_id', copro.id)
      .eq('membre_id', currentMembre.id)
      .order('created_at', { ascending: false });

    if (myData) setMyAppels(myData as unknown as AppelWithMember[]);

    if (isGestionnaire) {
      const { data: allData } = await supabase
        .from('appels_paiement')
        .select(`
          *,
          membres(*, profiles(*)),
          paiements(*),
          appel_repartitions(repartitions(*, depenses(*)))
        `)
        .eq('copropriete_id', copro.id)
        .order('created_at', { ascending: false });

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
    return (<>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
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

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('paymentReference')}</TableHead>
              {showMember && <TableHead>Membre</TableHead>}
              <TableHead>{t('totalToPay')}</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appels.map(appel => (
              <TableRow key={appel.id} className="cursor-pointer" onClick={() => setSelectedAppel(appel)}>
                <TableCell className="font-medium">{appel.reference}</TableCell>
                {showMember && <TableCell>{getMemberName(appel)}</TableCell>}
                <TableCell>{appel.montant_total.toFixed(2)} {copro?.devise}</TableCell>
                <TableCell>{new Date(appel.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(appel.statut)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {renderActions(appel)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>);
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

      {/* Detail sheet */}
      <Sheet open={!!selectedAppel} onOpenChange={(open) => { if (!open) setSelectedAppel(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          {selectedAppel && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between gap-2">
                  <span>{selectedAppel.reference}</span>
                  <span className="text-base">{selectedAppel.montant_total.toFixed(2)} {copro?.devise}</span>
                </SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4">
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
