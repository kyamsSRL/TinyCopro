'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { useCoproContext } from '@/components/copro/CoproContext';
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

const invitationSchema = z.object({
  alias: z.string().min(2),
  date_adhesion: z.string().min(1),
});

type InvitationFormValues = z.infer<typeof invitationSchema>;

function generateInvitationCode(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

interface CreateInvitationDialogProps {
  onSuccess?: () => void;
  children: React.ReactNode;
}

export function CreateInvitationDialog({ onSuccess, children }: CreateInvitationDialogProps) {
  const t = useTranslations('copro');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { copro } = useCoproContext();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      alias: '',
      date_adhesion: '',
    },
  });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback: user can select the code text
    }
  };

  const onSubmit = async (values: InvitationFormValues) => {
    if (!user || !copro) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const code = generateInvitationCode();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const membreId = crypto.randomUUID();

      // 1. Create placeholder membre with invitation fields
      const { error: membreError } = await supabase.from('membres').insert({
        id: membreId,
        copropriete_id: copro.id,
        user_id: null,
        role: 'coproprietaire',
        milliemes: 0,
        alias: values.alias,
        date_adhesion: values.date_adhesion,
        invitation_code: code,
        invitation_expires_at: expiresAt.toISOString(),
      });

      if (membreError) {
        setError(membreError.message);
        setIsSubmitting(false);
        return;
      }

      // 2. Create retroactive repartitions for existing depenses after date_adhesion
      const { data: depenses } = await supabase
        .from('depenses')
        .select('id')
        .eq('copropriete_id', copro.id)
        .gte('date_depense', values.date_adhesion);

      if (depenses && depenses.length > 0) {
        await supabase.from('repartitions').insert(
          depenses.map(d => ({ depense_id: d.id, membre_id: membreId, montant_du: 0 }))
        );
      }

      logAudit({
        coproprieteId: copro.id,
        action: 'create_invitation',
        entityType: 'membre',
        entityId: membreId,
        details: { alias: values.alias, date_adhesion: values.date_adhesion },
      });

      setCreatedCode(code);
      reset();
      onSuccess?.();
    } catch {
      setError(tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCreatedCode(null);
    setError(null);
    setCodeCopied(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inviteTitle')}</DialogTitle>
          <DialogDescription>{t('inviteDescription')}</DialogDescription>
        </DialogHeader>

        {createdCode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <code className="flex-1 text-base sm:text-lg font-mono font-bold tracking-wider sm:tracking-widest bg-muted p-3 rounded-lg text-center select-all break-all">
                {createdCode}
              </code>
              <Button variant="outline" size="icon" onClick={() => copyCode(createdCode)}>
                {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {tc('close')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="inv-alias">{t('alias')}</Label>
              <Input
                id="inv-alias"
                placeholder={t('aliasPlaceholder')}
                {...register('alias')}
              />
              {errors.alias && (
                <p className="text-sm text-destructive">{errors.alias.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-date">{t('dateAdhesion')}</Label>
              <Input
                id="inv-date"
                type="date"
                {...register('date_adhesion')}
              />
              {errors.date_adhesion && (
                <p className="text-sm text-destructive">{errors.date_adhesion.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tc('loading') : tc('create')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
