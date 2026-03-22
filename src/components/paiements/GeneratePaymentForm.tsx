'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { useCoproContext } from '@/components/copro/CoproContext';
import { generatePaymentPdf, downloadBlob } from '@/lib/pdf-generator';
import type { PdfPaymentData } from '@/lib/pdf-generator';
import { Button } from '@/components/ui/button';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Tables } from '@/types/database.types';

type Repartition = Tables<'repartitions'>;
type Depense = Tables<'depenses'>;

type RepartitionWithDepense = Repartition & {
  depenses: Depense;
};

interface GeneratePaymentFormProps {
  onSuccess?: () => void;
}

export function GeneratePaymentForm({ onSuccess }: GeneratePaymentFormProps) {
  const t = useTranslations('paiements');
  const tc = useTranslations('common');
  const { user, profile } = useAuth();
  const { copro, currentMembre, membres } = useCoproContext();

  const [repartitions, setRepartitions] = useState<RepartitionWithDepense[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchRepartitions = useCallback(async () => {
    if (!currentMembre) return;
    setLoading(true);

    const { data } = await supabase
      .from('repartitions')
      .select('*, depenses(*)')
      .eq('membre_id', currentMembre.id)
      .eq('statut', 'en_cours');

    if (data) setRepartitions(data as unknown as RepartitionWithDepense[]);
    setLoading(false);
  }, [currentMembre]);

  useEffect(() => {
    fetchRepartitions();
  }, [fetchRepartitions]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === repartitions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(repartitions.map(r => r.id)));
    }
  };

  const selectedRepartitions = repartitions.filter(r => selectedIds.has(r.id));
  const total = selectedRepartitions.reduce(
    (sum, r) => sum + (r.montant_override ?? r.montant_du),
    0
  );

  const handleGenerate = async () => {
    if (!copro || !user || !currentMembre || !profile || selectedRepartitions.length === 0) return;

    setIsGenerating(true);
    try {
      const reference = `AP-${Date.now().toString(36).toUpperCase()}`;

      // Create appel_paiement
      const { data: appel, error: appelError } = await supabase
        .from('appels_paiement')
        .insert({
          copropriete_id: copro.id,
          membre_id: currentMembre.id,
          montant_total: total,
          reference,
          created_by: user.id,
          statut: 'en_cours',
        })
        .select()
        .single();

      if (appelError || !appel) {
        toast.error(tc('error'));
        return;
      }

      // Link repartitions to appel
      const { error: linkError } = await supabase.from('appel_repartitions').insert(
        selectedRepartitions.map(r => ({
          appel_id: appel.id,
          repartition_id: r.id,
        }))
      );

      if (linkError) {
        toast.error(tc('error'));
        return;
      }

      // Update repartition statuts
      const { error: updateError } = await supabase
        .from('repartitions')
        .update({ statut: 'en_cours_paiement' })
        .in(
          'id',
          selectedRepartitions.map(r => r.id)
        );

      if (updateError) {
        toast.error(tc('error'));
        return;
      }

      // Generate PDF
      const pdfData: PdfPaymentData = {
        coproName: copro.nom,
        coproAddress: copro.adresse,
        memberName: `${profile.prenom} ${profile.nom}`,
        memberAddress: profile.adresse,
        reference,
        expenses: selectedRepartitions.map(r => ({
          libelle: r.depenses.libelle,
          date: r.depenses.date_depense,
          montant: r.montant_override ?? r.montant_du,
        })),
        total,
        iban: copro.iban,
        bic: copro.bic ?? '',
        currency: copro.devise,
      };

      const blob = await generatePaymentPdf(pdfData);
      downloadBlob(blob, `${reference}.pdf`);

      logAudit({
        coproprieteId: copro.id,
        action: 'create',
        entityType: 'appel_paiement',
        entityId: appel.id,
        details: { reference, montant: total },
      });

      const gestionnaireEmails = membres
        .filter(m => m.role === 'gestionnaire')
        .map(m => m.profiles?.email)
        .filter(Boolean) as string[];

      if (gestionnaireEmails.length > 0) {
        sendNotification({
          type: 'appel_paiement',
          coproprieteId: copro.id,
          recipientEmails: gestionnaireEmails,
          data: { coproName: copro.nom, reference, amount: total },
        });
      }

      toast.success(tc('success'));
      onSuccess?.();
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{t('generate')}</DialogTitle>
        <DialogDescription>{t('selectDepenses')}</DialogDescription>
      </DialogHeader>

      {repartitions.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {t('noPaiements')}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={selectedIds.size === repartitions.length}
                onChange={toggleAll}
                className="rounded"
              />
              {t('selectDepenses')} ({repartitions.length})
            </label>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {repartitions.map(rep => {
              const amount = rep.montant_override ?? rep.montant_du;
              return (
                <label
                  key={rep.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(rep.id)}
                    onChange={() => toggleSelection(rep.id)}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {rep.depenses.libelle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rep.depenses.date_depense}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {amount.toFixed(2)} {copro?.devise}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-medium">{t('totalToPay')}</span>
            <span className="text-lg font-bold">
              {total.toFixed(2)} {copro?.devise}
            </span>
          </div>

          <DialogFooter>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || selectedRepartitions.length === 0}
            >
              <FileDown className="mr-1.5" />
              {isGenerating ? '...' : t('downloadPdf')}
            </Button>
          </DialogFooter>
        </div>
      )}
    </div>
  );
}
