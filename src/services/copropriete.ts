import { supabase } from '@/lib/supabase';

export async function createCopropriete(params: {
  nom: string;
  adresse: string;
  numero_societe: string;
  iban: string;
  bic?: string;
  milliemes: number;
}) {
  const { data, error } = await supabase.rpc('create_copro_with_member', {
    p_nom: params.nom,
    p_adresse: params.adresse,
    p_numero_societe: params.numero_societe,
    p_iban: params.iban,
    p_bic: params.bic ?? null,
    p_milliemes: params.milliemes,
  });
  return { coproId: data as string | null, error };
}

export async function listUserCopros() {
  const { data, error } = await supabase.rpc('get_user_copros');
  return { data: data as any[] | null, error };
}

export async function getCoproDetail(coproId: string) {
  const { data, error } = await supabase.rpc('get_copro_detail', { p_copro_id: coproId });
  return { data: data as { copro: any; membres: any[]; exercice: any } | null, error };
}

export async function getDashboardStats(coproId: string, exerciceId?: string) {
  const { data, error } = await supabase.rpc('get_dashboard_stats', { p_copro_id: coproId, p_exercice_id: exerciceId ?? null });
  return { data: data as {
    my_solde: number;
    my_pending: number;
    my_paid: number;
    copro_total_expenses: number;
    copro_collected: number;
    copro_outstanding: number;
    copro_iban: string;
    member_soldes: { membre_id: string; nom: string; prenom: string; alias: string | null; solde: number }[];
    transactions: { type: string; montant: number; reference: string | null; date: string }[];
    exercice_id: string;
    category_breakdown: { categorie: string; total: number }[];
  } | null, error };
}
