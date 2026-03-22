'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
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
import { logAudit } from '@/lib/audit';
import type { Tables } from '@/types/database.types';

type Repartition = Tables<'repartitions'>;

const overrideSchema = z.object({
  montant_override: z.string().min(1, 'Amount is required'),
  motif_override: z.string().min(1, 'Reason is required'),
});

type OverrideFormValues = z.infer<typeof overrideSchema>;

interface OverrideDialogProps {
  repartition: Repartition;
  memberName: string;
  coproprieteId?: string;
  onSuccess?: () => void;
  children: React.ReactNode;
}

export function OverrideDialog({
  repartition,
  memberName,
  coproprieteId,
  onSuccess,
  children,
}: OverrideDialogProps) {
  const t = useTranslations('depenses');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      montant_override: String(repartition.montant_override ?? repartition.montant_du),
      motif_override: repartition.motif_override ?? '',
    },
  });

  const onSubmit = async (values: OverrideFormValues) => {
    const montant = parseFloat(values.montant_override);
    if (isNaN(montant) || montant < 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('repartitions')
        .update({
          montant_override: montant,
          motif_override: values.motif_override,
        })
        .eq('id', repartition.id);

      if (error) {
        toast.error(tc('error'));
      } else {
        if (coproprieteId) {
          logAudit({
            coproprieteId,
            action: 'override',
            entityType: 'repartition',
            entityId: repartition.id,
            details: { montant: montant, motif: values.motif_override },
          });
        }
        toast.success(tc('success'));
        setOpen(false);
        onSuccess?.();
      }
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
            montant_override: String(repartition.montant_override ?? repartition.montant_du),
            motif_override: repartition.motif_override ?? '',
          });
        }
      }}
    >
      <DialogTrigger render={<span className="cursor-pointer" />}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('override')}</DialogTitle>
          <DialogDescription>{memberName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              {t('amount')} ({t('enCours')}): {repartition.montant_du.toFixed(2)}
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="montant_override">{t('override')} *</Label>
            <Input
              id="montant_override"
              type="number"
              step="0.01"
              min="0"
              {...register('montant_override')}
            />
            {errors.montant_override && (
              <p className="text-sm text-destructive">{errors.montant_override.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motif_override">{t('overrideReason')} *</Label>
            <textarea
              id="motif_override"
              className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              {...register('motif_override')}
            />
            {errors.motif_override && (
              <p className="text-sm text-destructive">{errors.motif_override.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '...' : tc('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
