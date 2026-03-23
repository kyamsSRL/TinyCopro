'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createLoginSchema } from '@/lib/validation';
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

export default function LoginPage() {
  const t = useTranslations('auth');
  const tv = useTranslations('validation');
  const { signIn, user, loading } = useAuth();

  const loginSchema = createLoginSchema(tv);
  type LoginFormValues = z.infer<typeof loginSchema>;
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const [error, setError] = useState<string | null>(null);
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
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: signInError } = await signIn(values.email, values.password);
      if (signInError) {
        setError(t('loginError'));
      } else {
        const redirect = invitationCode
          ? `/${locale}/copros/?ref=${invitationCode}`
          : `/${locale}/copros/`;
        window.location.href = redirect;
      }
    } catch {
      setError(t('loginError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t('loginTitle')}</CardTitle>
        <CardDescription>
          {t('noAccount')}{' '}
          <Link
            href={`/${locale}/register`}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t('register')}
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
            <Label htmlFor="email">{t('email')}</Label>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('password')}</Label>
              <Link
                href={`/${locale}/reset-password`}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
              >
                {t('forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '...' : t('login')}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link
            href={`/${locale}/register`}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t('register')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
