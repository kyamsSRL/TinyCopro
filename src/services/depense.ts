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
  justificatifUrls?: string[];
  autoAccept?: boolean;
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
    p_justificatif_urls: params.justificatifUrls ?? null,
    p_auto_accept: params.autoAccept ?? false,
  });
  return { depenseId: data as string | null, error };
}

export async function updateDepense(params: {
  depenseId: string;
  libelle: string;
  montantTotal: number;
  dateDepense: string;
  description?: string;
  categorieId?: string;
  frequence: string;
  version: number;
}) {
  const { data, error } = await supabase.rpc('update_depense', {
    p_depense_id: params.depenseId,
    p_libelle: params.libelle,
    p_montant_total: params.montantTotal,
    p_date_depense: params.dateDepense,
    p_description: params.description ?? null,
    p_categorie_id: params.categorieId ?? null,
    p_frequence: params.frequence,
    p_version: params.version,
  });
  return { depenseId: data as string | null, error };
}

export async function deleteDepense(depenseId: string, version: number) {
  const { error } = await supabase.rpc('delete_depense', { p_depense_id: depenseId, p_version: version });
  return { error };
}

export async function listDepenses(coproId: string, exerciceId: string, categorieId?: string, statut?: string) {
  const { data, error } = await supabase.rpc('get_depenses', {
    p_copro_id: coproId,
    p_exercice_id: exerciceId,
    p_categorie_id: categorieId ?? null,
    p_statut: statut ?? null,
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

export async function voteDepense(depenseId: string, vote: boolean, motif?: string) {
  const { error } = await supabase.rpc('vote_depense', {
    p_depense_id: depenseId,
    p_vote: vote,
    p_motif: motif ?? null,
  });
  return { error };
}

export async function uploadDepenseDocument(params: { depenseId: string; coproId: string; file: File }) {
  const ext = params.file.name.split('.').pop();
  const filePath = `${params.coproId}/documents/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('justificatifs').upload(filePath, params.file);
  if (uploadError) return { error: uploadError, documentId: null };
  const { data: { publicUrl } } = supabase.storage.from('justificatifs').getPublicUrl(filePath);
  const { data, error } = await supabase.rpc('add_depense_document', {
    p_depense_id: params.depenseId,
    p_url: publicUrl,
    p_filename: params.file.name,
  });
  return { documentId: data as string | null, error };
}

export async function removeDepenseDocument(documentId: string) {
  const { error } = await supabase.rpc('remove_depense_document', { p_document_id: documentId });
  return { error };
}

export async function overrideRepartition(params: { repartitionId: string; montantOverride: number; motifOverride?: string }) {
  const { error } = await supabase.rpc('override_repartition', { p_repartition_id: params.repartitionId, p_montant: params.montantOverride, p_motif: params.motifOverride ?? null });
  return { error };
}
