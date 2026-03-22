import { supabase } from './supabase';
import type { Json } from '@/types/database.types';

export async function logAudit(params: {
  coproprieteId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, Json | undefined>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('journal_audit').insert({
    copropriete_id: params.coproprieteId,
    user_id: user.id,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: (params.details ?? {}) as Json,
  });
}
