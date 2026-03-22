'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { useCoproContext } from '@/components/copro/CoproContext';
import { calculateRepartition } from '@/lib/milliemes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Tables } from '@/types/database.types';

type Category = Tables<'categories_depenses'>;

const depenseSchema = z.object({
  libelle: z.string().min(1, 'Libelle is required'),
  montant_total: z.string().min(1, 'Amount is required'),
  date_depense: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  justificatif_url: z.string().optional(),
});

type DepenseFormValues = z.infer<typeof depenseSchema>;

interface DepenseFormProps {
  onSuccess?: () => void;
}

export function DepenseForm({ onSuccess }: DepenseFormProps) {
  const t = useTranslations('depenses');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { copro, membres, exercice } = useCoproContext();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedFrequence, setSelectedFrequence] = useState<string>('unique');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DepenseFormValues>({
    resolver: zodResolver(depenseSchema),
    defaultValues: {
      date_depense: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (!copro) return;
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories_depenses')
        .select('*')
        .or(`is_global.eq.true,copropriete_id.eq.${copro.id}`)
        .order('nom');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, [copro]);

  const onSubmit = async (values: DepenseFormValues) => {
    if (!copro || !user || !exercice) {
      toast.error(tc('error'));
      return;
    }

    const montant = parseFloat(values.montant_total);
    if (isNaN(montant) || montant <= 0) {
      toast.error(tc('error'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert depense
      const { data: depense, error: depError } = await supabase
        .from('depenses')
        .insert({
          libelle: values.libelle,
          montant_total: montant,
          date_depense: values.date_depense,
          description: values.description || null,
          categorie_id: selectedCategoryId || null,
          frequence: selectedFrequence as 'unique' | 'mensuelle' | 'trimestrielle' | 'annuelle',
          copropriete_id: copro.id,
          exercice_id: exercice.id,
          created_by: user.id,
          justificatif_urls: values.justificatif_url ? [values.justificatif_url] : null,
        })
        .select()
        .single();

      if (depError || !depense) {
        toast.error(tc('error'));
        return;
      }

      // Calculate repartitions
      const repartitions = calculateRepartition(
        montant,
        membres.map(m => ({ id: m.id, milliemes: m.milliemes }))
      );

      if (repartitions.length > 0) {
        const { error: repError } = await supabase.from('repartitions').insert(
          repartitions.map(r => ({
            depense_id: depense.id,
            membre_id: r.membre_id,
            montant_du: r.montant_du,
          }))
        );

        if (repError) {
          toast.error(tc('error'));
          return;
        }
      }

      logAudit({
        coproprieteId: copro.id,
        action: 'create',
        entityType: 'depense',
        entityId: depense.id,
        details: { libelle: values.libelle, montant: montant },
      });

      const recipientEmails = membres
        .filter(m => m.user_id !== user.id)
        .map(m => m.profiles?.email)
        .filter(Boolean) as string[];

      if (recipientEmails.length > 0) {
        sendNotification({
          type: 'nouvelle_depense',
          coproprieteId: copro.id,
          recipientEmails,
          data: { coproName: copro.nom, libelle: values.libelle, amount: montant },
        });
      }

      toast.success(tc('success'));
      onSuccess?.();
    } catch {
      toast.error(tc('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequenceOptions = [
    { value: 'unique', label: t('unique') },
    { value: 'mensuelle', label: t('mensuelle') },
    { value: 'trimestrielle', label: t('trimestrielle') },
    { value: 'annuelle', label: t('annuelle') },
  ];

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{t('add')}</DialogTitle>
        <DialogDescription>
          {exercice
            ? `${t('title')} - ${exercice.annee}`
            : t('title')}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="libelle">{t('label')} *</Label>
          <Input id="libelle" {...register('libelle')} />
          {errors.libelle && (
            <p className="text-sm text-destructive">{errors.libelle.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="montant_total">{t('amount')} *</Label>
            <Input
              id="montant_total"
              type="number"
              step="0.01"
              min="0"
              {...register('montant_total')}
            />
            {errors.montant_total && (
              <p className="text-sm text-destructive">{errors.montant_total.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_depense">{t('date')} *</Label>
            <Input
              id="date_depense"
              type="date"
              {...register('date_depense')}
            />
            {errors.date_depense && (
              <p className="text-sm text-destructive">{errors.date_depense.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('category')}</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={(v) => setSelectedCategoryId(v ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('category')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('recurrence')}</Label>
            <Select
              value={selectedFrequence}
              onValueChange={(v) => setSelectedFrequence(v ?? 'unique')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('recurrence')} />
              </SelectTrigger>
              <SelectContent>
                {frequenceOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('description')}</Label>
          <textarea
            id="description"
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            {...register('description')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="justificatif_url">
            {t('justificatif')}{' '}
            <span className="text-muted-foreground text-xs">({tc('optional')})</span>
          </Label>
          <Input
            id="justificatif_url"
            type="url"
            placeholder="https://..."
            {...register('justificatif_url')}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '...' : tc('save')}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
