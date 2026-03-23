'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCoproSchema } from '@/lib/validation';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { createCopropriete } from '@/services/copropriete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateCoproFormProps {
  onSuccess?: () => void;
}

export function CreateCoproForm({ onSuccess }: CreateCoproFormProps) {
  const t = useTranslations('copro');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');

  const coproSchema = createCoproSchema(tv);
  type CreateCoproFormValues = z.infer<typeof coproSchema>;
  const { user } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCoproFormValues>({
    resolver: zodResolver(coproSchema),
    defaultValues: {
      nom: '',
      adresse: '',
      numero_societe: '',
      iban: '',
      bic: '',
      milliemes: 0,
    },
  });

  const onSubmit = async (values: CreateCoproFormValues) => {
    if (!user) {
      setError('Not authenticated');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const { coproId, error: rpcError } = await createCopropriete({
        nom: values.nom,
        adresse: values.adresse,
        numero_societe: values.numero_societe,
        iban: values.iban,
        bic: values.bic || undefined,
        milliemes: values.milliemes,
        userId: user.id,
      });

      if (rpcError || !coproId) {
        setError(rpcError?.message || tc('error'));
        setIsSubmitting(false);
        return;
      }

      logAudit({
        coproprieteId: coproId,
        action: 'create',
        entityType: 'copropriete',
        entityId: coproId,
        details: { nom: values.nom },
      });

      setCreated(true);
      reset();
      onSuccess?.();
    } catch {
      setError(tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (created) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('createSuccess')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            {t('inviteDescription')}
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={() => setCreated(false)}>
            {tc('close')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{t('create')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="nom">{t('name')}</Label>
            <Input id="nom" {...register('nom')} />
            {errors.nom && (
              <p className="text-sm text-destructive">{errors.nom.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">{t('address')}</Label>
            <Input id="adresse" {...register('adresse')} />
            {errors.adresse && (
              <p className="text-sm text-destructive">{errors.adresse.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_societe">
              {t('numeroSociete')} <span className="text-muted-foreground text-xs">({tc('optional')})</span>
            </Label>
            <Input id="numero_societe" {...register('numero_societe')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="iban">{t('iban')}</Label>
              <Input id="iban" {...register('iban')} />
              {errors.iban && (
                <p className="text-sm text-destructive">{errors.iban.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bic">
                {t('bic')} <span className="text-muted-foreground text-xs">({tc('optional')})</span>
              </Label>
              <Input id="bic" {...register('bic')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="milliemes">{t('milliemes')}</Label>
            <Input
              id="milliemes"
              type="number"
              min={0}
              {...register('milliemes', { valueAsNumber: true })}
            />
            {errors.milliemes && (
              <p className="text-sm text-destructive">{errors.milliemes.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tc('loading') : tc('create')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
