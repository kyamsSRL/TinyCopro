import { supabase } from '@/lib/supabase';

export async function createInvitation(params: {
  coproId: string;
  alias: string;
  email?: string;
  dateAdhesion: string;
  createdBy: string;
}) {
  const { data, error } = await supabase.rpc('create_invitation_with_repartitions', {
    p_copro_id: params.coproId,
    p_alias: params.alias,
    p_email: params.email ?? null,
    p_date_adhesion: params.dateAdhesion,
    p_created_by: params.createdBy,
  });
  return { invitationCode: data as string | null, error };
}

export async function claimInvitation(params: {
  invitationCode: string;
  userId: string;
  milliemes: number;
}) {
  const { data, error } = await supabase.rpc('claim_invitation', {
    p_invitation_code: params.invitationCode,
    p_user_id: params.userId,
    p_milliemes: params.milliemes,
  });
  const result = data as { membre_id: string; copropriete_id: string } | null;
  return { membreId: result?.membre_id ?? null, coproId: result?.copropriete_id ?? null, error };
}

export async function getMemberEmails(coproId: string, excludeUserId: string) {
  const { data, error } = await supabase.rpc('get_member_emails', {
    p_copro_id: coproId,
    p_exclude_user_id: excludeUserId,
  });
  return { emails: (data as string[] | null) ?? [], error };
}

export async function updateMilliemes(membreId: string, milliemes: number) {
  const { error } = await supabase.rpc('update_membre_milliemes', {
    p_membre_id: membreId,
    p_milliemes: milliemes,
  });
  return { error };
}

export async function transferRole(params: {
  fromMembreId: string;
  toMembreId: string;
}) {
  const { error } = await supabase.rpc('transfer_role', {
    p_from_membre_id: params.fromMembreId,
    p_to_membre_id: params.toMembreId,
  });
  return { error };
}

export async function revokeMember(membreId: string) {
  const { error } = await supabase.rpc('revoke_membre', { p_membre_id: membreId });
  return { error };
}

export async function regenerateCode(membreId: string) {
  const { data, error } = await supabase.rpc('regenerate_invitation_code', { p_membre_id: membreId });
  return { code: data as string | null, error };
}
