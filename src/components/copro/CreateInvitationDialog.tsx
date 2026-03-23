'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createInvitationSchema } from '@/lib/validation';
import { Copy, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { createInvitation } from '@/services/membre';
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

// Schema created inside component via createInvitationSchema(tv)

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
  const tv = useTranslations('validation');
  const { user } = useAuth();
  const { copro } = useCoproContext();

  const invitationSchema = createInvitationSchema(tv);
  type InvitationFormValues = z.infer<typeof invitationSchema>;

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      alias: '',
      email: '',
      date_adhesion: '',
    },
  });

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const handleSendEmail = async () => {
    if (!createdEmail || !createdLink || !copro) return;
    setEmailSent(true);
    await sendNotification({
      type: 'invitation',
      coproprieteId: copro.id,
      recipientEmails: [createdEmail],
      data: { coproName: copro.nom, invitationLink: createdLink },
    });
    toast.success(tc('success'));
  };

  const onSubmit = async (values: InvitationFormValues) => {
    if (!user || !copro) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const { invitationCode, error: rpcError } = await createInvitation({
        coproId: copro.id,
        alias: values.alias,
        email: values.email || undefined,
        dateAdhesion: values.date_adhesion,
        createdBy: user.id,
      });

      if (rpcError || !invitationCode) {
        setError(rpcError?.message || tc('error'));
        setIsSubmitting(false);
        return;
      }

      logAudit({
        coproprieteId: copro.id,
        action: 'create_invitation',
        entityType: 'membre',
        entityId: invitationCode,
        details: { alias: values.alias, date_adhesion: values.date_adhesion },
      });

      const locale = window.location.pathname.split('/')[1] || 'fr';
      const link = `${window.location.origin}/${locale}/register?ref=${invitationCode}`;
      setCreatedLink(link);
      setCreatedEmail(values.email || null);
      reset();
      onSuccess?.();
    } catch {
      setError(tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCreatedLink(null);
    setCreatedEmail(null);
    setError(null);
    setLinkCopied(false);
    setEmailSent(false);
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

        {createdLink ? (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{t('copyLink')}</p>
              <p className="text-sm font-mono break-all select-all">{createdLink}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="flex-1" onClick={() => copyLink(createdLink)}>
                {linkCopied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {t('copyLink')}
              </Button>
              {createdEmail && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSendEmail}
                  disabled={emailSent}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  {emailSent ? tc('success') : t('sendByEmail')}
                </Button>
              )}
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
              <Label htmlFor="inv-email">
                {t('invitationEmail')}{' '}
                <span className="text-muted-foreground text-xs">({tc('optional')})</span>
              </Label>
              <Input
                id="inv-email"
                type="email"
                placeholder="email@exemple.com"
                {...register('email')}
              />
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
