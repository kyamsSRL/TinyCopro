import { supabase } from './supabase';

/**
 * Set to true to enable actual email sending via Edge Function.
 * When false, notifications are logged to console only.
 */
const NOTIFICATIONS_ENABLED = true;

type NotificationType =
  | 'nouvelle_depense'
  | 'appel_paiement'
  | 'paiement_confirme'
  | 'relance_retard'
  | 'nouveau_membre';

interface NotificationPayload {
  type: NotificationType;
  coproprieteId: string;
  recipientEmails: string[];
  data: Record<string, unknown>;
  locale?: string;
}

export async function sendNotification(payload: NotificationPayload) {
  if (!NOTIFICATIONS_ENABLED) {
    console.log('[Notifications DISABLED] Would send:', payload.type, 'to', payload.recipientEmails);
    return { error: null };
  }

  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: payload,
    });
    if (error) console.error('Notification error:', error);
    return { error };
  } catch (err) {
    console.error('Failed to send notification:', err);
    return { error: err };
  }
}
