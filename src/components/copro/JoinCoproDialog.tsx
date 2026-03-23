'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { calculateRepartition } from '@/lib/milliemes';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

const joinSchema = z.object({
  code: z.string().length(12),
  milliemes: z.number().int().min(1),
});

type JoinFormValues = z.infer<typeof joinSchema>;

interface JoinCoproDialogProps {
  onSuccess?: () => void;
  children: React.ReactNode;
  defaultCode?: string;
}

export function JoinCoproDialog({ onSuccess, children, defaultCode }: JoinCoproDialogProps) {
  const t = useTranslations('copro');
  const tc = useTranslations('common');
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      code: defaultCode || '',
      milliemes: undefined,
    },
  });

  // Auto-open dialog if defaultCode is provided
  useEffect(() => {
    if (defaultCode) {
      setValue('code', defaultCode);
      setOpen(true);
    }
  }, [defaultCode, setValue]);

  const recalculateRepartitions = async (
    membreId: string,
    coproId: string,
    dateAdhesion: string | null,
    newMilliemes: number
  ) => {
    if (!dateAdhesion) return;

    // Get all active members with their current milliemes (after the UPDATE)
    const { data: allMembres } = await supabase
      .from('membres')
      .select('id, milliemes')
      .eq('copropriete_id', coproId)
      .eq('is_active', true);

    if (!allMembres) return;

    // Get all depenses after date_adhesion
    const { data: depenses } = await supabase
      .from('depenses')
      .select('id, montant_total, date_depense')
      .eq('copropriete_id', coproId)
      .gte('date_depense', dateAdhesion);

    if (!depenses || depenses.length === 0) return;

    // For each depense, recalculate repartitions for all non-paid, non-overridden members
    for (const dep of depenses) {
      const repartition = calculateRepartition(dep.montant_total, allMembres);

      // Get existing repartitions for this depense
      const { data: existingReps } = await supabase
        .from('repartitions')
        .select('id, membre_id, montant_override, statut')
        .eq('depense_id', dep.id);

      if (!existingReps) continue;

      for (const rep of existingReps) {
        // Skip paid or overridden repartitions
        if (rep.statut === 'paye') continue;
        if (rep.montant_override !== null) continue;

        const newAmount = repartition.find(r => r.membre_id === rep.membre_id);
        if (newAmount) {
          await supabase
            .from('repartitions')
            .update({ montant_du: newAmount.montant_du })
            .eq('id', rep.id);
        }
      }
    }
  };

  const onSubmit = async (values: JoinFormValues) => {
    if (!user) return;
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Look up placeholder membre by invitation_code
      const { data: placeholder, error: lookupError } = await supabase
        .from('membres')
        .select('id, copropriete_id, date_adhesion')
        .eq('invitation_code', values.code)
        .is('user_id', null)
        .gte('invitation_expires_at', new Date().toISOString())
        .single();

      if (lookupError || !placeholder) {
        setError(t('codeInvalide'));
        setIsSubmitting(false);
        return;
      }

      const coproId = placeholder.copropriete_id;

      // Check if user is already an active member
      const { data: existingMembre } = await supabase
        .from('membres')
        .select('id')
        .eq('copropriete_id', coproId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingMembre) {
        setError(t('dejaMembre'));
        setIsSubmitting(false);
        return;
      }

      // UPDATE the placeholder membre
      const { error: updateError } = await supabase
        .from('membres')
        .update({
          user_id: user.id,
          milliemes: values.milliemes,
          alias: null,
          invitation_used_by: user.id,
        })
        .eq('id', placeholder.id);

      if (updateError) {
        setError(updateError.message);
        setIsSubmitting(false);
        return;
      }

      // Recalculate repartitions retroactively
      await recalculateRepartitions(
        placeholder.id,
        coproId,
        placeholder.date_adhesion,
        values.milliemes
      );

      logAudit({
        coproprieteId: coproId,
        action: 'recalcul_retroactif',
        entityType: 'membre',
        entityId: placeholder.id,
        details: { milliemes: values.milliemes, date_adhesion: placeholder.date_adhesion },
      });

      logAudit({
        coproprieteId: coproId,
        action: 'join',
        entityType: 'copropriete',
        entityId: coproId,
      });

      // Notify existing members about the new member
      const { data: existingMembres } = await supabase
        .from('membres')
        .select('user_id, profiles:user_id(email)')
        .eq('copropriete_id', coproId)
        .eq('is_active', true)
        .not('user_id', 'is', null)
        .neq('user_id', user.id);

      if (existingMembres && existingMembres.length > 0) {
        const recipientEmails = existingMembres
          .map((m: any) => m.profiles?.email)
          .filter(Boolean) as string[];

        if (recipientEmails.length > 0) {
          sendNotification({
            type: 'nouveau_membre',
            coproprieteId: coproId,
            recipientEmails,
            data: {},
          });
        }
      }

      reset();
      setOpen(false);
      onSuccess?.();
    } catch {
      setError(tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('joinTitle')}</DialogTitle>
          <DialogDescription>{t('joinDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="join-code">{t('invitationCode')}</Label>
            <Input
              id="join-code"
              placeholder="abc123def456"
              maxLength={12}
              className="font-mono tracking-wider"
              readOnly={!!defaultCode}
              {...register('code')}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="join-milliemes">{t('milliemes')}</Label>
            <Input
              id="join-milliemes"
              type="number"
              min={1}
              {...register('milliemes', { valueAsNumber: true })}
            />
            {errors.milliemes && (
              <p className="text-sm text-destructive">{errors.milliemes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('loading') : t('join')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
