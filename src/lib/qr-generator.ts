/**
 * Generate EPC QR code data string for SEPA bank transfers.
 * BCD (Bank Customer Direct) format version 002.
 */
export function generateEpcQrData(params: {
  iban: string;
  bic?: string;
  beneficiaryName: string;
  amount: number;
  reference: string;
  currency?: string;
}): string {
  const { iban, bic = '', beneficiaryName, amount, reference, currency = 'EUR' } = params;
  const lines = [
    'BCD',           // Service Tag
    '002',           // Version
    '1',             // Character set (UTF-8)
    'SCT',           // Identification code
    bic,             // BIC
    beneficiaryName, // Beneficiary name (max 70 chars)
    iban,            // IBAN
    `${currency}${amount.toFixed(2)}`, // Amount
    '',              // Purpose (empty)
    reference,       // Remittance Reference
    '',              // Remittance Text
    '',              // Information
  ];
  return lines.join('\n');
}
