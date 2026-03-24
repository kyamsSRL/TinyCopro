'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { listUserCopros, getCoproDetail } from '@/services/copropriete';
import type { Tables } from '@/types/database.types';

type Copropriete = Tables<'coproprietes'>;
type Membre = Tables<'membres'>;
type Exercice = Tables<'exercices'>;

export function useCopros() {
  const { user } = useAuth();
  const userId = user?.id;
  const [copros, setCopros] = useState<(Copropriete & { role: string; milliemes: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCopros = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data } = await listUserCopros();
      if (data) setCopros(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCopros();
  }, [fetchCopros]);

  return { copros, loading, refetch: fetchCopros };
}

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
      const { data } = await getCoproDetail(coproId);
      if (data) {
        if (data.copro) setCopro(data.copro);
        if (data.membres) {
          setMembres(data.membres);
          const me = data.membres.find((m: any) => m.user_id === userId);
          if (me) setCurrentMembre(me);
        }
        if (data.exercice) setExercice(data.exercice);
      }
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
