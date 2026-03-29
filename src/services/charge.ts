import { supabase } from '@/lib/supabase';

export async function getChargesConfig(coproId: string) {
  const { data, error } = await supabase.rpc('get_charges_config', { p_copro_id: coproId });
  return { data: data as { delta: number; postes: { id: string; libelle: string; montant: number; frequence: string; created_at: string }[] } | null, error };
}

export async function addChargeConfig(coproId: string, libelle: string, montant: number, frequence: string) {
  const { data, error } = await supabase.rpc('add_charge_config', { p_copro_id: coproId, p_libelle: libelle, p_montant: montant, p_frequence: frequence });
  return { chargeId: data as string | null, error };
}

export async function updateChargeConfig(chargeId: string, libelle: string, montant: number, frequence: string) {
  const { error } = await supabase.rpc('update_charge_config', { p_charge_id: chargeId, p_libelle: libelle, p_montant: montant, p_frequence: frequence });
  return { error };
}

export async function deleteChargeConfig(chargeId: string) {
  const { error } = await supabase.rpc('delete_charge_config', { p_charge_id: chargeId });
  return { error };
}

export async function updateDeltaCharges(coproId: string, delta: number) {
  const { error } = await supabase.rpc('update_delta_charges', { p_copro_id: coproId, p_delta: delta });
  return { error };
}

export async function getChargesMembres(coproId: string, membreId?: string) {
  const { data, error } = await supabase.rpc('get_charges_membres', { p_copro_id: coproId, p_membre_id: membreId ?? null });
  return { data: data as any[] | null, error };
}

export async function markChargePaid(chargeId: string) {
  const { error } = await supabase.rpc('mark_charge_paid', { p_charge_id: chargeId });
  return { error };
}

export async function generateMonthlyCharges(coproId: string, month: number, year: number) {
  const { error } = await supabase.rpc('generate_monthly_charges', { p_copro_id: coproId, p_month: month, p_year: year });
  return { error };
}
