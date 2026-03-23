import type { Tables } from '@/types/database.types';

type Membre = Tables<'membres'>;

export interface RepartitionResult {
  membre_id: string;
  montant_du: number;
}

/**
 * Calculate expense distribution based on milliemes.
 * - Each member's share = montant_total * (member_milliemes / total_milliemes)
 * - Rounded to 2 decimal places
 * - Rounding difference added to last member to ensure sum = montant_total
 * - Members with 0 milliemes get 0
 */
export function calculateRepartition(
  montantTotal: number,
  membres: Pick<Membre, 'id' | 'milliemes'>[]
): RepartitionResult[] {
  const activeMembres = membres.filter(m => m.milliemes > 0);
  const zeroMembres = membres.filter(m => m.milliemes === 0).map(m => ({
    membre_id: m.id,
    montant_du: 0,
  }));

  const totalMilliemes = activeMembres.reduce((sum, m) => sum + m.milliemes, 0);
  if (totalMilliemes === 0) return zeroMembres;

  const results: RepartitionResult[] = activeMembres.map(m => ({
    membre_id: m.id,
    montant_du: Math.round((montantTotal * m.milliemes / totalMilliemes) * 100) / 100,
  }));

  // Adjust last member for rounding
  const totalDistributed = results.reduce((sum, r) => sum + r.montant_du, 0);
  const diff = Math.round((montantTotal - totalDistributed) * 100) / 100;
  if (diff !== 0 && results.length > 0) {
    results[results.length - 1].montant_du =
      Math.round((results[results.length - 1].montant_du + diff) * 100) / 100;
  }

  return [...results, ...zeroMembres];
}
