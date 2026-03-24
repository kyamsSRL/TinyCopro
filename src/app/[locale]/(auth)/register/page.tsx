'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRegisterSchema } from '@/lib/validation';
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
  CardFooter,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tv = useTranslations('validation');
  const { signUp, user, loading } = useAuth();

  const registerSchema = createRegisterSchema(tv);
  type RegisterFormValues = z.infer<typeof registerSchema>;
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract ?code= param for invitation flow
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('ref');
      if (code) setInvitationCode(code);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const redirect = invitationCode
        ? `/${locale}/copros/?ref=${invitationCode}`
        : `/${locale}/copros/`;
      window.location.href = redirect;
    }
  }, [user, loading, locale, invitationCode]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      nom: '',
      prenom: '',
      adresse: '',
      telephone: '',
      societe: '',
      numero_societe: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: signUpError } = await signUp(values.email, values.password, {
        nom: values.nom,
        prenom: values.prenom,
        adresse: values.adresse,
        telephone: values.telephone || '',
        societe: values.societe || '',
        numero_societe: values.numero_societe || '',
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError(tCommon('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('registerTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{t('registerSuccess')}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Link
              href={`/${locale}/login${invitationCode ? `?ref=${invitationCode}` : ''}`}
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {t('login')}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t('registerTitle')}</CardTitle>
        <CardDescription>
          {t('hasAccount')}{' '}
          <Link
            href={`/${locale}/login${invitationCode ? `?ref=${invitationCode}` : ''}`}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t('login')}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')} *</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">{t('nom')} *</Label>
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
              <Label htmlFor="prenom">{t('prenom')} *</Label>
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
            <Label htmlFor="adresse">{t('adresse')} *</Label>
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
              {t('telephone')}{' '}
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
                {t('societe')}{' '}
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
                {t('numeroSociete')}{' '}
                <span className="text-muted-foreground text-xs">({tCommon('optional')})</span>
              </Label>
              <Input
                id="numero_societe"
                {...register('numero_societe')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')} *</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')} *</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '...' : t('register')}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link
            href={`/${locale}/login${invitationCode ? `?ref=${invitationCode}` : ''}`}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t('login')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
