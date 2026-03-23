'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createJoinSchema } from '@/lib/validation';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { claimInvitation, getMemberEmails } from '@/services/membre';
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

interface JoinCoproDialogProps {
  onSuccess?: () => void;
  children: React.ReactNode;
  defaultCode?: string;
}

export function JoinCoproDialog({ onSuccess, children, defaultCode }: JoinCoproDialogProps) {
  const t = useTranslations('copro');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const { user } = useAuth();

  const joinSchema = createJoinSchema(tv);
  type JoinFormValues = z.infer<typeof joinSchema>;

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

  const onSubmit = async (values: JoinFormValues) => {
    if (!user) return;
    setError(null);
    setIsSubmitting(true);

    try {
      // Claim via RPC (atomic: validates code, checks membership, updates membre, recalculates repartitions)
      const { coproId, error: claimError } = await claimInvitation({
        invitationCode: values.code,
        userId: user.id,
        milliemes: values.milliemes,
      });

      if (claimError) {
        if (claimError.message.includes('Already')) setError(t('dejaMembre'));
        else if (claimError.message.includes('Invalid') || claimError.message.includes('expired')) setError(t('codeInvalide'));
        else setError(claimError.message);
        setIsSubmitting(false);
        return;
      }

      if (coproId) {
        logAudit({
          coproprieteId: coproId,
          action: 'join',
          entityType: 'copropriete',
          entityId: coproId,
        });

        const { emails } = await getMemberEmails(coproId, user.id);
        if (emails.length > 0) {
          sendNotification({
            type: 'nouveau_membre',
            coproprieteId: coproId,
            recipientEmails: emails,
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
