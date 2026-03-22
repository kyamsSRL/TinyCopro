'use client';

import { createContext, useContext } from 'react';
import type { Tables } from '@/types/database.types';

type CoproContextType = {
  copro: Tables<'coproprietes'> | null;
  membres: (Tables<'membres'> & { profiles: Tables<'profiles'> | null })[];
  currentMembre: Tables<'membres'> | null;
  isGestionnaire: boolean;
  exercice: Tables<'exercices'> | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

export const CoproContext = createContext<CoproContextType>({
  copro: null,
  membres: [],
  currentMembre: null,
  isGestionnaire: false,
  exercice: null,
  loading: true,
  refetch: async () => {},
});

export const useCoproContext = () => useContext(CoproContext);
