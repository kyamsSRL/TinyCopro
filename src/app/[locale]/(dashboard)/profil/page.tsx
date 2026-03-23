'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createProfileSchema } from '@/lib/validation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export default function ProfilPage() {
  const t = useTranslations('profile');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tv = useTranslations('validation');

  const profileSchema = createProfileSchema(tv);
  type ProfileFormValues = z.infer<typeof profileSchema>;
  const { profile, loading, updateProfile } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({
        nom: profile.nom ?? '',
        prenom: profile.prenom ?? '',
        adresse: profile.adresse ?? '',
        telephone: profile.telephone ?? '',
        societe: profile.societe ?? '',
        numero_societe: profile.numero_societe ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await updateProfile({
        nom: values.nom,
        prenom: values.prenom,
        adresse: values.adresse,
        telephone: values.telephone || null,
        societe: values.societe || null,
        numero_societe: values.numero_societe || null,
      });
      if (error) {
        toast.error(tCommon('error'));
      } else {
        toast.success(t('saveSuccess'));
      }
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>{t('editProfile')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{tAuth('email')}</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">{t('emailNotEditable')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">{tAuth('nom')} *</Label>
                <Input
                  id="nom"
                  autoComplete="family-name"
                  {...register('nom')}
                />
                {errors.nom && (
                  <p className="text-sm text-destructive">{errors.nom.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prenom">{tAuth('prenom')} *</Label>
                <Input
                  id="prenom"
                  autoComplete="given-name"
                  {...register('prenom')}
                />
                {errors.prenom && (
                  <p className="text-sm text-destructive">{errors.prenom.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse">{tAuth('adresse')} *</Label>
              <Input
                id="adresse"
                autoComplete="street-address"
                {...register('adresse')}
              />
              {errors.adresse && (
                <p className="text-sm text-destructive">{errors.adresse.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">
                {tAuth('telephone')}{' '}
                <span className="text-muted-foreground text-xs">({tCommon('optional')})</span>
              </Label>
              <Input
                id="telephone"
                type="tel"
                autoComplete="tel"
                {...register('telephone')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="societe">
                  {tAuth('societe')}{' '}
                  <span className="text-muted-foreground text-xs">({tCommon('optional')})</span>
                </Label>
                <Input
                  id="societe"
                  autoComplete="organization"
                  {...register('societe')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_societe">
                  {tAuth('numeroSociete')}{' '}
                  <span className="text-muted-foreground text-xs">({tCommon('optional')})</span>
                </Label>
                <Input
                  id="numero_societe"
                  {...register('numero_societe')}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '...' : tCommon('save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
