import { supabase } from '@/lib/supabase';

export async function generatePayment(params: {
  coproId: string;
  membreId: string;
  repartitionIds: string[];
}) {
  const { data, error } = await supabase.rpc('generate_payment', {
    p_copro_id: params.coproId,
    p_membre_id: params.membreId,
    p_repartition_ids: params.repartitionIds,
  });
  return { data: data as { appel_id: string; reference: string; montant_total: number } | null, error };
}

export async function markAsPaid(params: {
  appelId: string;
  datePaiement: string;
  reference?: string;
  preuvePaiementUrl?: string;
}) {
  const { data, error } = await supabase.rpc('mark_payment_as_paid', {
    p_appel_id: params.appelId,
    p_date_paiement: params.datePaiement,
    p_reference: params.reference ?? null,
    p_preuve_paiement_url: params.preuvePaiementUrl ?? null,
  });
  return { paiementId: data as string | null, error };
}

export async function uploadProof(params: { paiementId: string; coproId: string; file: File }) {
  const ext = params.file.name.split('.').pop();
  const filePath = `${params.coproId}/preuves/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('justificatifs').upload(filePath, params.file);
  if (uploadError) return { error: uploadError, publicUrl: null };
  const { data: { publicUrl } } = supabase.storage.from('justificatifs').getPublicUrl(filePath);
  const { error } = await supabase.rpc('upload_proof_url', { p_paiement_id: params.paiementId, p_url: publicUrl });
  return { publicUrl, error };
}

export async function getRepartitionsEnCours(coproId: string) {
  const { data, error } = await supabase.rpc('get_repartitions_en_cours', { p_copro_id: coproId });
  return { data: data as any[] | null, error };
}

export async function createDeposit(params: {
  coproId: string;
  montant: number;
  reference?: string;
  date: string;
}) {
  const { data, error } = await supabase.rpc('create_deposit', {
    p_copro_id: params.coproId,
    p_montant: params.montant,
    p_reference: params.reference ?? null,
    p_date: params.date,
  });
  return { depositId: data as string | null, error };
}

export async function uploadSignature(file: File) {
  const filePath = `signatures/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage.from('justificatifs').upload(filePath, file);
  if (uploadError) return { error: uploadError };
  const { data: { publicUrl } } = supabase.storage.from('justificatifs').getPublicUrl(filePath);
  const { error } = await supabase.rpc('upload_signature', { p_url: publicUrl });
  return { publicUrl, error };
}

export async function getPaymentPdfData(appelId: string) {
  const { data, error } = await supabase.rpc('get_payment_pdf_data', { p_appel_id: appelId });
  return { data: data as {
    copro: { nom: string; adresse: string; numero_societe: string | null; iban: string };
    gestionnaire: { nom: string; prenom: string; email: string; telephone: string | null; signature_url: string | null };
    destinataire: { nom: string; prenom: string; adresse: string };
    reference: string;
    date: string;
    montant_copro: number;
    solde_deduit: number;
    depenses: { libelle: string; montant_total: number; montant_copro: number }[];
    total_depenses: number;
  } | null, error };
}

export async function deleteProof(paiementId: string) {
  const { error } = await supabase.rpc('delete_proof', { p_paiement_id: paiementId });
  return { error };
}

export async function getMyDeposits(coproId: string) {
  const { data, error } = await supabase.rpc('get_my_deposits', { p_copro_id: coproId });
  return { data: data as { id: string; montant: number; date_depot: string; reference: string | null; created_at: string }[] | null, error };
}

export async function listAppels(coproId: string, membreId?: string) {
  const { data, error } = await supabase.rpc('get_appels', { p_copro_id: coproId, p_membre_id: membreId ?? null });
  return { data: data as any[] | null, error };
}
