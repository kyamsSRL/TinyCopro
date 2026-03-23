import { supabase } from '@/lib/supabase';

export async function closeExercice(params: {
  coproId: string;
  exerciceId: string;
}) {
  const { data, error } = await supabase.rpc('close_exercice', {
    p_copro_id: params.coproId,
    p_exercice_id: params.exerciceId,
  });
  return { newExerciceId: data as string | null, error };
}

export async function createExercice(coproId: string, annee: number) {
  const { data, error } = await supabase.rpc('create_exercice', {
    p_copro_id: coproId,
    p_annee: annee,
  });
  return { exerciceId: data as string | null, error };
}

export async function listExercices(coproId: string) {
  const { data, error } = await supabase.rpc('get_exercices', { p_copro_id: coproId });
  return { data: data as any[] | null, error };
}

export async function getExportData(coproId: string, exerciceId: string) {
  const { data, error } = await supabase.rpc('get_export_data', {
    p_copro_id: coproId,
    p_exercice_id: exerciceId,
  });
  return { data: data as any[] | null, error };
}
