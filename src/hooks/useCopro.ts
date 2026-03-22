'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Tables } from '@/types/database.types';

type Copropriete = Tables<'coproprietes'>;
type Membre = Tables<'membres'>;

export function useCopros() {
  const { user } = useAuth();
  const userId = user?.id;
  const [copros, setCopros] = useState<(Copropriete & { role: string; milliemes: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCopros = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data: membres } = await supabase
        .from('membres')
        .select('copropriete_id, role, milliemes, coproprietes(*)')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (membres) {
        const mapped = membres.map((m: any) => ({
          ...m.coproprietes,
          role: m.role,
          milliemes: m.milliemes,
        }));
        setCopros(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCopros();
  }, [fetchCopros]);

  return { copros, loading, refetch: fetchCopros };
}

type Exercice = Tables<'exercices'>;

export function useCoproDetail(coproId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const [copro, setCopro] = useState<Copropriete | null>(null);
  const [membres, setMembres] = useState<(Membre & { profiles: Tables<'profiles'> | null })[]>([]);
  const [currentMembre, setCurrentMembre] = useState<Membre | null>(null);
  const [exercice, setExercice] = useState<Exercice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCopro = useCallback(async () => {
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || !coproId || !isValidUuid.test(coproId)) {
      setLoading(false);
      return;
    }

    try {
      const [coproRes, membresRes, exerciceRes] = await Promise.all([
        supabase.from('coproprietes').select('*').eq('id', coproId).single(),
        supabase
          .from('membres')
          .select('*, profiles(*)')
          .eq('copropriete_id', coproId)
          .eq('is_active', true),
        supabase
          .from('exercices')
          .select('*')
          .eq('copropriete_id', coproId)
          .eq('statut', 'ouvert')
          .order('annee', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (coproRes.data) setCopro(coproRes.data);
      if (membresRes.data) {
        setMembres(membresRes.data as any);
        const me = membresRes.data.find((m: any) => m.user_id === userId);
        if (me) setCurrentMembre(me);
      }
      if (exerciceRes.data) setExercice(exerciceRes.data);
    } finally {
      setLoading(false);
    }
  }, [userId, coproId]);

  useEffect(() => {
    fetchCopro();
  }, [fetchCopro]);

  const isGestionnaire = currentMembre?.role === 'gestionnaire';

  return { copro, membres, currentMembre, isGestionnaire, exercice, loading, refetch: fetchCopro };
}
