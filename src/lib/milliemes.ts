import type { Tables } from '@/types/database.types';

type Membre = Tables<'membres'>;

export interface RepartitionResult {
  membre_id: string;
  montant_du: number;
}

/**
 * Calculate expense distribution based on milliemes (base 1000).
 * - Each member's share = montant_total * (member_milliemes / 1000)
 * - Rounded to 2 decimal places
 * - Members with 0 milliemes get 0
 * - Unattributed milliemes are not paid by anyone
 */
export function calculateRepartition(
  montantTotal: number,
  membres: Pick<Membre, 'id' | 'milliemes'>[]
): RepartitionResult[] {
  return membres.map(m => ({
    membre_id: m.id,
    montant_du: m.milliemes > 0
      ? Math.round((montantTotal * m.milliemes / 1000) * 100) / 100
      : 0,
  }));
}
