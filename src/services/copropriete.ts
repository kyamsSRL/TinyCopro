import { supabase } from '@/lib/supabase';

export async function createCopropriete(params: {
  nom: string;
  adresse: string;
  numero_societe: string;
  iban: string;
  bic?: string;
  milliemes: number;
  userId: string;
}) {
  const { data, error } = await supabase.rpc('create_copro_with_member', {
    p_nom: params.nom,
    p_adresse: params.adresse,
    p_numero_societe: params.numero_societe,
    p_iban: params.iban,
    p_bic: params.bic ?? null,
    p_milliemes: params.milliemes,
    p_user_id: params.userId,
  });
  return { coproId: data as string | null, error };
}

export async function listUserCopros(userId: string) {
  const { data, error } = await supabase.rpc('get_user_copros', { p_user_id: userId });
  return { data: data as any[] | null, error };
}

export async function getCoproDetail(coproId: string) {
  const { data, error } = await supabase.rpc('get_copro_detail', { p_copro_id: coproId });
  return { data: data as { copro: any; membres: any[]; exercice: any } | null, error };
}
