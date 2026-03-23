import { supabase } from '@/lib/supabase';

export async function generatePayment(params: {
  coproId: string;
  membreId: string;
  repartitionIds: string[];
  createdBy: string;
}) {
  const { data, error } = await supabase.rpc('generate_payment', {
    p_copro_id: params.coproId,
    p_membre_id: params.membreId,
    p_repartition_ids: params.repartitionIds,
    p_created_by: params.createdBy,
  });
  return {
    data: data as { appel_id: string; reference: string; montant_total: number } | null,
    error,
  };
}

export async function markAsPaid(params: {
  appelId: string;
  datePaiement: string;
  reference?: string;
  preuvePaiementUrl?: string;
  confirmedBy: string;
}) {
  const { data, error } = await supabase.rpc('mark_payment_as_paid', {
    p_appel_id: params.appelId,
    p_date_paiement: params.datePaiement,
    p_reference: params.reference ?? null,
    p_preuve_paiement_url: params.preuvePaiementUrl ?? null,
    p_confirmed_by: params.confirmedBy,
  });
  return { paiementId: data as string | null, error };
}

export async function uploadProof(params: {
  paiementId: string;
  coproId: string;
  file: File;
}) {
  const ext = params.file.name.split('.').pop();
  const filePath = `${params.coproId}/preuves/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('justificatifs')
    .upload(filePath, params.file);
  if (uploadError) return { error: uploadError, publicUrl: null };

  const { data: { publicUrl } } = supabase.storage
    .from('justificatifs')
    .getPublicUrl(filePath);

  const { error } = await supabase.rpc('upload_proof_url', {
    p_paiement_id: params.paiementId,
    p_url: publicUrl,
  });
  return { publicUrl, error };
}

export async function getRepartitionsEnCours(membreId: string) {
  const { data, error } = await supabase.rpc('get_repartitions_en_cours', { p_membre_id: membreId });
  return { data: data as any[] | null, error };
}

export async function listAppels(coproId: string, membreId?: string) {
  const { data, error } = await supabase.rpc('get_appels', {
    p_copro_id: coproId,
    p_membre_id: membreId ?? null,
  });
  return { data: data as any[] | null, error };
}
