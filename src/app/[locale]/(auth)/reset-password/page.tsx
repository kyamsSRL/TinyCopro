'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createResetSchema } from '@/lib/validation';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tv = useTranslations('validation');
  const { resetPassword } = useAuth();

  const resetSchema = createResetSchema(tv);
  type ResetFormValues = z.infer<typeof resetSchema>;
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (values: ResetFormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: resetError } = await resetPassword(values.email);
      if (resetError) {
        setError(resetError.message);
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
          <CardTitle className="text-2xl">{t('resetTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{t('resetSuccess')}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Link
              href={`/${locale}/login`}
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
        <CardTitle className="text-2xl">{t('resetTitle')}</CardTitle>
        <CardDescription>
          <Link
            href={`/${locale}/login`}
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '...' : t('resetPassword')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
