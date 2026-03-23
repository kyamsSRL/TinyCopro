'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createMarkPaidSchema } from '@/lib/validation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { markAsPaid as markAsPaidService, uploadProof } from '@/services/paiement';
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
  const tv = useTranslations('validation');
  const { user } = useAuth();

  const markPaidSchema = createMarkPaidSchema(tv);
  type MarkPaidFormValues = z.infer<typeof markPaidSchema>;

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Upload proof file if provided
      let preuveUrl: string | null = null;
      if (proofFile && coproprieteId) {
        const result = await uploadProof({ paiementId: '', coproId: coproprieteId, file: proofFile });
        if (result.error) {
          toast.error(result.error.message);
          return;
        }
        preuveUrl = result.publicUrl ?? null;
      }

      // Mark as paid (atomic: insert paiement + update appel + update repartitions)
      const { error: rpcError } = await markAsPaidService({
        appelId: appel.id,
        datePaiement: values.date_paiement,
        reference: values.reference || undefined,
        preuvePaiementUrl: preuveUrl || undefined,
        confirmedBy: user.id,
      });

      if (rpcError) {
        toast.error(rpcError.message || tc('error'));
        return;
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
          setProofFile(null);
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

          <div className="space-y-2">
            <Label>{t('proofOfPayment')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
                  if (allowed.includes(file.type)) {
                    setProofFile(file);
                  } else {
                    toast.error(t('fileTypeError'));
                  }
                }
                e.target.value = '';
              }}
            />
            {proofFile ? (
              <div className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
                <span className="truncate mr-2">{proofFile.name}</span>
                <button
                  type="button"
                  onClick={() => setProofFile(null)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
                {t('addProof')}
              </Button>
            )}
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
