import { supabase } from '@/lib/supabase';

export async function createDepense(params: {
  coproId: string;
  exerciceId: string;
  libelle: string;
  montantTotal: number;
  dateDepense: string;
  description?: string;
  categorieId?: string;
  frequence: string;
  createdBy: string;
  justificatifUrls?: string[];
}) {
  const { data, error } = await supabase.rpc('create_depense_with_repartitions', {
    p_copro_id: params.coproId,
    p_exercice_id: params.exerciceId,
    p_libelle: params.libelle,
    p_montant_total: params.montantTotal,
    p_date_depense: params.dateDepense,
    p_description: params.description ?? null,
    p_categorie_id: params.categorieId ?? null,
    p_frequence: params.frequence,
    p_created_by: params.createdBy,
    p_justificatif_urls: params.justificatifUrls ?? null,
  });
  return { depenseId: data as string | null, error };
}

export async function listDepenses(coproId: string, exerciceId: string) {
  const { data, error } = await supabase.rpc('get_depenses', {
    p_copro_id: coproId,
    p_exercice_id: exerciceId,
  });
  return { data: data as any[] | null, error };
}

export async function listCategories(coproId: string) {
  const { data, error } = await supabase.rpc('get_categories', { p_copro_id: coproId });
  return { data: data as any[] | null, error };
}

export async function addCategory(coproId: string, nom: string) {
  const { data, error } = await supabase.rpc('add_category', { p_copro_id: coproId, p_nom: nom });
  return { categoryId: data as string | null, error };
}

export async function deleteCategory(categoryId: string) {
  const { error } = await supabase.rpc('delete_category', { p_category_id: categoryId });
  return { error };
}

export async function overrideRepartition(params: {
  repartitionId: string;
  montantOverride: number;
  motifOverride?: string;
}) {
  const { error } = await supabase.rpc('override_repartition', {
    p_repartition_id: params.repartitionId,
    p_montant: params.montantOverride,
    p_motif: params.motifOverride ?? null,
  });
  return { error };
}
