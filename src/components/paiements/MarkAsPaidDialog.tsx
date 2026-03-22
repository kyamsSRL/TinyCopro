'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type AppelPaiement = Tables<'appels_paiement'>;

const markPaidSchema = z.object({
  date_paiement: z.string().min(1, 'Date is required'),
  reference: z.string().optional(),
});

type MarkPaidFormValues = z.infer<typeof markPaidSchema>;

interface MarkAsPaidDialogProps {
  appel: AppelPaiement;
  coproprieteId?: string;
  memberEmail?: string;
  onSuccess?: () => void;
  children: React.ReactNode;
}

export function MarkAsPaidDialog({ appel, coproprieteId, memberEmail, onSuccess, children }: MarkAsPaidDialogProps) {
  const t = useTranslations('paiements');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MarkPaidFormValues>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      date_paiement: new Date().toISOString().split('T')[0],
      reference: '',
    },
  });

  const onSubmit = async (values: MarkPaidFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Insert paiement record
      const { error: paiementError } = await supabase.from('paiements').insert({
        appel_id: appel.id,
        montant_paye: appel.montant_total,
        date_paiement: values.date_paiement,
        reference: values.reference || null,
        confirmed_by: user.id,
        methode: 'virement',
      });

      if (paiementError) {
        toast.error(tc('error'));
        return;
      }

      // Update appel statut
      const { error: appelError } = await supabase
        .from('appels_paiement')
        .update({ statut: 'paye' })
        .eq('id', appel.id);

      if (appelError) {
        toast.error(tc('error'));
        return;
      }

      // Get linked repartition IDs
      const { data: links } = await supabase
        .from('appel_repartitions')
        .select('repartition_id')
        .eq('appel_id', appel.id);

      if (links && links.length > 0) {
        const repIds = links.map(l => l.repartition_id);
        const { error: repError } = await supabase
          .from('repartitions')
          .update({ statut: 'paye' })
          .in('id', repIds);

        if (repError) {
          toast.error(tc('error'));
          return;
        }
      }

      if (coproprieteId) {
        logAudit({
          coproprieteId,
          action: 'confirm',
          entityType: 'paiement',
          entityId: appel.id,
          details: { reference: appel.reference, montant: appel.montant_total },
        });
      }

      if (coproprieteId && memberEmail) {
        sendNotification({
          type: 'paiement_confirme',
          coproprieteId,
          recipientEmails: [memberEmail],
          data: { reference: appel.reference, amount: appel.montant_total },
        });
      }

      toast.success(tc('success'));
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          reset({
            date_paiement: new Date().toISOString().split('T')[0],
            reference: '',
          });
        }
      }}
    >
      <DialogTrigger render={<span className="inline-flex" />}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirmPayment')}</DialogTitle>
          <DialogDescription>
            {appel.reference} - {appel.montant_total.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date_paiement">{t('paidDate')} *</Label>
            <Input
              id="date_paiement"
              type="date"
              {...register('date_paiement')}
            />
            {errors.date_paiement && (
              <p className="text-sm text-destructive">{errors.date_paiement.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">{t('paymentReference')}</Label>
            <Input
              id="reference"
              {...register('reference')}
              placeholder={t('paymentReference')}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '...' : t('markAsPaid')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
