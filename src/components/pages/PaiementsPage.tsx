'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FileDown, Plus, CheckCircle } from 'lucide-react';
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
  const { copro, currentMembre, isGestionnaire, membres } = useCoproContext();

  const [myAppels, setMyAppels] = useState<AppelWithMember[]>([]);
  const [allAppels, setAllAppels] = useState<AppelWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchAppels = useCallback(async () => {
    if (!copro || !currentMembre) return;
    setLoading(true);

    // Fetch my appels
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

    // Fetch all appels if gestionnaire
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
        coproName: copro.nom,
        coproAddress: copro.adresse,
        memberName: getMemberName(appel),
        memberAddress: appel.membres.profiles.adresse,
        reference: appel.reference,
        expenses,
        total: appel.montant_total,
        iban: copro.iban,
        bic: copro.bic ?? '',
        currency: copro.devise,
      };

      const blob = await generatePaymentPdf(pdfData);
      downloadBlob(blob, `${appel.reference}.pdf`);
    } catch {
      // PDF generation error
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGenerateSuccess = () => {
    setGenerateOpen(false);
    fetchAppels();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const renderAppelsTable = (appels: AppelWithMember[], showMember: boolean) => (
    <div className="overflow-x-auto">
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
        {appels.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showMember ? 6 : 5} className="text-center text-muted-foreground py-8">
              {t('noPaiements')}
            </TableCell>
          </TableRow>
        ) : (
          appels.map(appel => (
            <TableRow key={appel.id}>
              <TableCell className="font-medium">{appel.reference}</TableCell>
              {showMember && <TableCell>{getMemberName(appel)}</TableCell>}
              <TableCell>{appel.montant_total.toFixed(2)} {copro?.devise}</TableCell>
              <TableCell>{new Date(appel.created_at).toLocaleDateString()}</TableCell>
              <TableCell>{getStatusBadge(appel.statut)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadPdf(appel)}
                    disabled={downloadingId === appel.id}
                  >
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
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  );

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
            {renderAppelsTable(myAppels, false)}
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            {renderAppelsTable(allAppels, true)}
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          {renderAppelsTable(myAppels, false)}
        </div>
      )}
    </div>
  );
}
