'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FileDown, Plus, CheckCircle, Paperclip, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCoproContext } from '@/components/copro/CoproContext';
import { GeneratePaymentForm } from '@/components/paiements/GeneratePaymentForm';
import { MarkAsPaidDialog } from '@/components/paiements/MarkAsPaidDialog';
import { generatePaymentPdf, downloadBlob } from '@/lib/pdf-generator';
import { getPaymentPdfData } from '@/services/paiement';
import { generateEpcQrData } from '@/lib/qr-generator';
import QRCode from 'qrcode';
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
import { uploadProof, listAppels, deleteProof } from '@/services/paiement';
import { getChargesConfig, getChargesMembres, markChargePaid } from '@/services/charge';
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

  const tCharges = useTranslations('charges');
  const [myAppels, setMyAppels] = useState<AppelWithMember[]>([]);
  const [allAppels, setAllAppels] = useState<AppelWithMember[]>([]);
  const [myCharges, setMyCharges] = useState<any[]>([]);
  const [chargesConfig, setChargesConfig] = useState<{ delta: number; postes: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);
  const [selectedAppel, setSelectedAppel] = useState<AppelWithMember | null>(null);
  const [selectedQrUrl, setSelectedQrUrl] = useState<string | null>(null);

  // Generate QR when a payment is selected
  useEffect(() => {
    if (!selectedAppel || !copro?.iban) { setSelectedQrUrl(null); return; }
    const epcData = generateEpcQrData({
      iban: copro.iban,
      bic: copro.bic ?? '',
      beneficiaryName: copro.nom.substring(0, 70),
      amount: selectedAppel.montant_total,
      reference: selectedAppel.reference,
      currency: copro.devise,
    });
    QRCode.toDataURL(epcData, { width: 200, margin: 2, errorCorrectionLevel: 'M' })
      .then(url => setSelectedQrUrl(url))
      .catch(() => setSelectedQrUrl(null));
  }, [selectedAppel, copro]);

  // Auto-open generate dialog if ?generate=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('generate') === 'true') setGenerateOpen(true);
    }
  }, []);

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
    await refreshAppels();
  };

  const fetchAppels = useCallback(async () => {
    if (!copro || !currentMembre) return;
    setLoading(true);

    const [myResult, chargesResult, configResult] = await Promise.all([
      listAppels(copro.id, currentMembre.id),
      isGestionnaire ? getChargesMembres(copro.id) : Promise.resolve({ data: null, error: null }),
      getChargesConfig(copro.id),
    ]);
    if (myResult.data) setMyAppels(myResult.data as unknown as AppelWithMember[]);
    if (chargesResult.data) setMyCharges(chargesResult.data);
    if (configResult.data) setChargesConfig(configResult.data);

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
        return <Badge variant="success">{t('paye')}</Badge>;
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
      const { data: pdfData } = await getPaymentPdfData(appel.id);
      if (pdfData) {
        // Detect charge payment and add provision
        const isCharge = appel.appel_repartitions.length > 0 &&
          appel.appel_repartitions.every((ar: any) => ar.repartitions?.depenses?.is_charge === true);
        const provision = isCharge && chargesConfig && chargesConfig.delta > 0
          ? {
              montant_total: chargesConfig.delta,
              montant_copro: Math.round(chargesConfig.delta * (currentMembre?.milliemes ?? 0) / 1000 * 100) / 100,
            }
          : undefined;
        const blob = await generatePaymentPdf({ ...pdfData, solde_deduit: pdfData.solde_deduit ?? 0, provision, currency: copro.devise, bic: copro.bic ?? '' });
        downloadBlob(blob, `${appel.reference}.pdf`);
      }
    } catch { /* PDF error */ } finally { setDownloadingId(null); }
  };

  const refreshAppels = useCallback(async () => {
    await fetchAppels();
    // Re-read state after fetch to update selectedAppel
    // We need to refetch and find the updated appel
    if (!copro || !currentMembre) return;
    const { data: myData } = await listAppels(copro.id, currentMembre.id);
    if (myData && selectedAppel) {
      const all = myData as unknown as AppelWithMember[];
      const updated = all.find(a => a.id === selectedAppel.id);
      setSelectedAppel(updated || null);
    }
  }, [fetchAppels, copro, currentMembre, selectedAppel]);

  const handleGenerateSuccess = async (appelId: string) => {
    setGenerateOpen(false);
    await fetchAppels();
    // Open the detail popup for the newly created appel
    if (!copro || !currentMembre) return;
    const { data: myData } = await listAppels(copro.id, currentMembre.id);
    if (myData) {
      const newAppel = (myData as unknown as AppelWithMember[]).find(a => a.id === appelId);
      if (newAppel) setSelectedAppel(newAppel);
    }
  };

  const renderActions = (appel: AppelWithMember) => {
    const paiement = appel.paiements?.[0];
    const preuveUrl = paiement?.preuve_paiement_url;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleDownloadPdf(appel)} disabled={downloadingId === appel.id}>
          <FileDown className="h-4 w-4 mr-1" />
          {t('downloadPdf')}
        </Button>
        {isGestionnaire && appel.statut !== 'paye' && (
          <MarkAsPaidDialog appel={appel} coproprieteId={copro?.id} memberEmail={appel.membres?.profiles?.email} onSuccess={refreshAppels}>
            <Button size="sm">
              <CheckCircle className="h-4 w-4 mr-1" />
              {t('markAsPaid')}
            </Button>
          </MarkAsPaidDialog>
        )}
        {appel.statut === 'paye' && paiement && (
          preuveUrl ? (
            <div className="inline-flex items-center gap-1.5 border rounded-md px-2 py-1">
              <a
                href={preuveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs hover:text-primary transition-colors"
              >
                <FileDown className="h-3.5 w-3.5 shrink-0" />
                <span>{t('proof')}</span>
              </a>
              <button
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={async () => {
                  await deleteProof(paiement.id);
                  await refreshAppels();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
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
          )
        )}
      </div>
    );
  };

  const handleMarkChargePaid = async (chargeId: string) => {
    const { error } = await markChargePaid(chargeId);
    if (error) { toast.error(error.message); return; }
    toast.success(tc('success'));
    fetchAppels();
  };

  const renderChargesTab = () => {
    const milliemes = currentMembre?.milliemes ?? 0;
    if (!chargesConfig || chargesConfig.postes.length === 0) {
      return <div className="text-center py-12 text-muted-foreground">{tCharges('noCharges')}</div>;
    }
    const totalPostes = chargesConfig.postes.reduce((s: number, p: any) => s + p.montant, 0);
    const totalCopro = totalPostes + chargesConfig.delta;
    const myShare = Math.round(totalCopro * milliemes / 1000 * 100) / 100;
    const myDelta = Math.round(chargesConfig.delta * milliemes / 1000 * 100) / 100;

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{tCharges('total')}</p>
            <p className="text-xl font-bold">{totalCopro.toFixed(2)} {copro?.devise}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{tCharges('myShare')}</p>
            <p className="text-xl font-bold">{myShare.toFixed(2)} {copro?.devise}</p>
          </div>
        </div>

        {/* Postes detail */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">{tCharges('libelle')}</th>
              <th className="pb-2 font-medium">{tCharges('frequence')}</th>
              <th className="pb-2 font-medium text-right">{tCharges('total')}</th>
              <th className="pb-2 font-medium text-right">{tCharges('myShare')}</th>
            </tr>
          </thead>
          <tbody>
            {chargesConfig.postes.map((p: any) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.libelle}</td>
                <td className="py-2 text-muted-foreground">{tCharges(p.frequence)}</td>
                <td className="py-2 text-right">{p.montant.toFixed(2)} {copro?.devise}</td>
                <td className="py-2 text-right">{(Math.round(p.montant * milliemes / 1000 * 100) / 100).toFixed(2)} {copro?.devise}</td>
              </tr>
            ))}
            {chargesConfig.delta > 0 && (
              <tr className="border-b bg-muted/30">
                <td className="py-2 font-medium" colSpan={2}>{tCharges('delta')}</td>
                <td className="py-2 text-right">{chargesConfig.delta.toFixed(2)} {copro?.devise}</td>
                <td className="py-2 text-right">{myDelta.toFixed(2)} {copro?.devise}</td>
              </tr>
            )}
            <tr className="border-t-2">
              <td className="py-2 font-bold" colSpan={2}>{tCharges('total')}</td>
              <td className="py-2 text-right font-bold">{totalCopro.toFixed(2)} {copro?.devise}</td>
              <td className="py-2 text-right font-bold">{myShare.toFixed(2)} {copro?.devise}</td>
            </tr>
          </tbody>
        </table>

        {/* Gestionnaire: charges_membres list with mark as paid */}
        {isGestionnaire && myCharges.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-bold">{tCharges('title')}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Membre</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium text-right">{tCharges('montant')}</th>
                  <th className="pb-2 font-medium text-right">Statut</th>
                  <th className="pb-2 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {myCharges.map((ch: any) => (
                  <tr key={ch.id} className="border-b">
                    <td className="py-2">{ch.membre?.profiles?.prenom} {ch.membre?.profiles?.nom}</td>
                    <td className="py-2 text-muted-foreground">{new Date(ch.date_charge).toLocaleDateString()}</td>
                    <td className="py-2 text-right font-medium">{ch.montant.toFixed(2)} {copro?.devise}</td>
                    <td className="py-2 text-right">
                      <Badge variant={ch.statut === 'paye' ? 'success' : 'secondary'}>
                        {ch.statut === 'paye' ? tCharges('paye') : tCharges('enAttente')}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">
                      {ch.statut !== 'paye' && (
                        <Button size="sm" onClick={() => handleMarkChargePaid(ch.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {tCharges('markPaid')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderAppelsList = (appels: AppelWithMember[], showMember: boolean) => {
    if (appels.length === 0) {
      return <div className="text-center py-12 text-muted-foreground">{t('noPaiements')}</div>;
    }
    return (
      <>
        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">{t('paymentReference')}</th>
                {showMember && <th className="pb-2 font-medium">Membre</th>}
                <th className="pb-2 font-medium">{t('paidDate')}</th>
                <th className="pb-2 font-medium text-right">{t('totalToPay')}</th>
                <th className="pb-2 font-medium text-right">{t('history')}</th>
                <th className="pb-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {appels.map(appel => (
                <tr
                  key={appel.id}
                  className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedAppel(appel)}
                >
                  <td className="py-2.5 font-medium">{appel.reference}</td>
                  {showMember && <td className="py-2.5 text-muted-foreground">{getMemberName(appel)}</td>}
                  <td className="py-2.5 text-muted-foreground">{new Date(appel.created_at).toLocaleDateString()}</td>
                  <td className="py-2.5 text-right font-medium">{appel.montant_total.toFixed(2)} {copro?.devise}</td>
                  <td className="py-2.5 text-right">{getStatusBadge(appel.statut)}</td>
                  <td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {isGestionnaire && appel.statut !== 'paye' && (
                      <MarkAsPaidDialog appel={appel} coproprieteId={copro?.id} memberEmail={appel.membres?.profiles?.email} onSuccess={refreshAppels}>
                        <Button size="sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t('markAsPaid')}
                        </Button>
                      </MarkAsPaidDialog>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden grid gap-2">
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
              {isGestionnaire && appel.statut !== 'paye' && (
                <div className="mt-2 flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <MarkAsPaidDialog appel={appel} coproprieteId={copro?.id} memberEmail={appel.membres?.profiles?.email} onSuccess={refreshAppels}>
                    <Button size="sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t('markAsPaid')}
                    </Button>
                  </MarkAsPaidDialog>
                </div>
              )}
            </div>
          ))}
        </div>
      </>
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
            <div className="text-sm text-muted-foreground">
              {t('availableBalance')} : <span className="font-bold text-foreground">{(currentMembre.solde ?? 0).toFixed(2)} {copro?.devise}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="my">{t('myPayments')}</TabsTrigger>
          <TabsTrigger value="deposits">{t('myDeposits')}</TabsTrigger>
          {isGestionnaire && <TabsTrigger value="all">{t('allPayments')}</TabsTrigger>}
        </TabsList>
        <TabsContent value="my" className="mt-4">
          {renderAppelsList(myAppels, false)}
        </TabsContent>
        <TabsContent value="deposits" className="mt-4">
          {renderChargesTab()}
        </TabsContent>
        {isGestionnaire && (
          <TabsContent value="all" className="mt-4">
            {renderAppelsList(allAppels.filter(a => a.membre_id !== currentMembre?.id), true)}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!selectedAppel} onOpenChange={(open) => { if (!open) setSelectedAppel(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedAppel && (() => {
            const isChargePayment = selectedAppel.appel_repartitions.length > 0 &&
              selectedAppel.appel_repartitions.every((ar: any) => ar.repartitions?.depenses?.is_charge === true);
            const fullAmount = isChargePayment
              ? selectedAppel.appel_repartitions.reduce((s: number, ar: any) => s + (ar.repartitions.montant_override ?? ar.repartitions.montant_du), 0)
              : selectedAppel.montant_total;
            const milliemes = currentMembre?.milliemes ?? 0;
            const deltaTotal = chargesConfig?.delta ?? 0;
            const myProvision = Math.round(deltaTotal * milliemes / 1000 * 100) / 100;

            return (
            <>
              <DialogHeader>
                <DialogTitle>&nbsp;</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between gap-2 -mt-2">
                <span className="text-lg font-bold">{selectedAppel.reference}</span>
                <span className="text-lg font-bold shrink-0">
                  {isChargePayment ? (fullAmount + myProvision).toFixed(2) : selectedAppel.montant_total.toFixed(2)} {copro?.devise}
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedAppel.statut)}
                  {isChargePayment && <Badge variant="outline">{tCharges('title')}</Badge>}
                  <Badge variant="outline">{new Date(selectedAppel.created_at).toLocaleDateString()}</Badge>
                  <Badge variant="outline">{getMemberName(selectedAppel)}</Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {isChargePayment ? tCharges('title') : t('depensesConcernees')}
                  </p>
                  {selectedAppel.appel_repartitions.map((ar: any) => (
                    <div key={ar.repartitions.id} className="flex justify-between py-1.5 border-b border-dashed last:border-0 text-sm">
                      <span>{ar.repartitions.depenses.libelle}</span>
                      <div className="text-right">
                        {isChargePayment && (
                          <span className="text-xs text-muted-foreground mr-2">{ar.repartitions.depenses.montant_total?.toFixed(2)} {copro?.devise}</span>
                        )}
                        <span className="font-medium">{(ar.repartitions.montant_override ?? ar.repartitions.montant_du).toFixed(2)} {copro?.devise}</span>
                      </div>
                    </div>
                  ))}
                  {isChargePayment && myProvision > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-dashed text-sm bg-muted/30 px-1 rounded">
                      <span className="font-medium">{tCharges('delta')}</span>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground mr-2">{deltaTotal.toFixed(2)} {copro?.devise}</span>
                        <span className="font-medium">{myProvision.toFixed(2)} {copro?.devise}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modalités de paiement */}
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">{t('paymentMethod')}</p>
                  <p className="text-lg font-bold">{selectedAppel.montant_total.toFixed(2)} {copro?.devise}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IBAN</span>
                      <span className="font-mono">{copro?.iban}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('paymentReference')}</span>
                      <span className="font-mono">{selectedAppel.reference}</span>
                    </div>
                  </div>
                  {selectedQrUrl && (
                    <div className="flex flex-col items-center pt-2">
                      <img src={selectedQrUrl} alt="QR SEPA" className="w-40 h-40" />
                      <p className="text-xs text-muted-foreground mt-1">Scannez avec votre app bancaire</p>
                    </div>
                  )}
                </div>

                {renderActions(selectedAppel)}
              </div>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
