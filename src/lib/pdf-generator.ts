'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { generateEpcQrData } from './qr-generator';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 20, textAlign: 'center' },
  destinataire: { marginBottom: 20, alignItems: 'flex-end' },
  destinataireLabel: { fontSize: 9, color: '#666', marginBottom: 2 },
  destinataireName: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  coproBlock: { marginBottom: 15, borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 10 },
  coproName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  syndicBlock: { marginBottom: 15 },
  syndicLabel: { fontSize: 9, color: '#666', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  dateLine: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#333', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  colLabel: { flex: 3 },
  colTotal: { flex: 1.5, textAlign: 'right' },
  colPart: { flex: 1.5, textAlign: 'right' },
  headerCell: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#666' },
  totalRow: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: '#333', paddingTop: 6, marginTop: 4 },
  totalLabel: { flex: 3, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  totalVal: { flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 11 },
  paymentSection: { marginBottom: 20, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 4 },
  paymentTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  paymentRow: { flexDirection: 'row', marginBottom: 3 },
  paymentLabel: { width: 110, fontFamily: 'Helvetica-Bold', color: '#555' },
  paymentValue: { flex: 1 },
  paymentAmount: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  qrSection: { alignItems: 'center', marginTop: 10 },
  qrImage: { width: 130, height: 130 },
  qrCaption: { marginTop: 6, fontSize: 8, color: '#999', textAlign: 'center' },
  signatureBlock: { marginTop: 30 },
  signatureName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  signatureRole: { fontSize: 9, color: '#666', marginBottom: 6 },
  signatureImage: { width: 150, height: 60 },
  footer: { position: 'absolute', bottom: 25, left: 40, right: 40, fontSize: 7, color: '#bbb', textAlign: 'center' },
});

export interface PdfPaymentData {
  copro: { nom: string; adresse: string; numero_societe: string | null; iban: string };
  gestionnaire: { nom: string; prenom: string; email: string; telephone: string | null; signature_url: string | null };
  destinataire: { nom: string; prenom: string; adresse: string };
  reference: string;
  date: string;
  montant_copro: number;
  solde_deduit?: number;
  depenses: { libelle: string; montant_total: number; montant_copro: number }[];
  total_depenses: number;
  provision?: { montant_total: number; montant_copro: number };
  currency: string;
  bic: string;
}

function PaymentCallDocument({ data, qrDataUrl, signatureDataUrl }: { data: PdfPaymentData; qrDataUrl: string | null; signatureDataUrl: string | null }) {
  const fmt = (n: number) => n.toFixed(2);
  const e = React.createElement;

  return e(Document, null,
    e(Page, { size: 'A4', style: styles.page },

      // Title
      e(Text, { style: styles.title }, 'Demande de paiement'),

      // Destinataire (aligned right)
      e(View, { style: styles.destinataire },
        e(Text, { style: styles.destinataireLabel }, 'À l\'attention de :'),
        e(Text, { style: styles.destinataireName }, `${data.destinataire.prenom} ${data.destinataire.nom}`),
        e(Text, null, data.destinataire.adresse),
      ),

      // Copro
      e(View, { style: styles.coproBlock },
        e(Text, { style: styles.coproName }, data.copro.nom),
        e(Text, null, data.copro.adresse),
        data.copro.numero_societe ? e(Text, { style: { fontSize: 9, color: '#666' } }, `N° d'entreprise : ${data.copro.numero_societe}`) : null,
      ),

      // Syndic
      e(View, { style: styles.syndicBlock },
        e(Text, { style: styles.syndicLabel }, 'Syndic :'),
        e(Text, { style: { fontFamily: 'Helvetica-Bold' } }, `${data.gestionnaire.prenom} ${data.gestionnaire.nom}`),
        e(Text, null, `Email : ${data.gestionnaire.email}`),
        data.gestionnaire.telephone ? e(Text, null, `Tél : ${data.gestionnaire.telephone}`) : null,
      ),

      // Date + Reference
      e(View, { style: styles.dateLine },
        e(Text, null, `Date : ${data.date}`),
        e(Text, { style: { fontFamily: 'Helvetica-Bold' } }, `Réf : ${data.reference}`),
      ),

      // Table
      e(View, { style: styles.table },
        e(View, { style: styles.tableHeader },
          e(Text, { style: [styles.colLabel, styles.headerCell] }, 'Libellé'),
          e(Text, { style: [styles.colTotal, styles.headerCell] }, 'Montant total'),
          e(Text, { style: [styles.colPart, styles.headerCell] }, 'Votre part'),
        ),
        ...data.depenses.map((d, i) =>
          e(View, { style: styles.tableRow, key: String(i) },
            e(Text, { style: styles.colLabel }, d.libelle),
            e(Text, { style: styles.colTotal }, `${fmt(d.montant_total)} ${data.currency}`),
            e(Text, { style: styles.colPart }, `${fmt(d.montant_copro)} ${data.currency}`),
          )
        ),
        data.provision ? e(View, { style: styles.tableRow, key: 'provision' },
          e(Text, { style: [styles.colLabel, { fontFamily: 'Helvetica-Bold' }] }, 'Provisionnement'),
          e(Text, { style: styles.colTotal }, `${fmt(data.provision.montant_total)} ${data.currency}`),
          e(Text, { style: styles.colPart }, `${fmt(data.provision.montant_copro)} ${data.currency}`),
        ) : null,
        e(View, { style: styles.totalRow },
          e(Text, { style: styles.totalLabel }, 'TOTAL'),
          e(Text, { style: styles.totalVal }, `${fmt(data.total_depenses + (data.provision?.montant_total ?? 0))} ${data.currency}`),
          e(Text, { style: styles.totalVal }, `${fmt(data.montant_copro + (data.provision?.montant_copro ?? 0))} ${data.currency}`),
        ),
      ),

      // Modalités + Signature — keep together, never split across pages
      e(View, { wrap: false },
        // Modalités de paiement
        e(View, { style: styles.paymentSection },
          e(Text, { style: styles.paymentTitle }, 'Modalités de paiement'),
          data.solde_deduit && data.solde_deduit > 0
            ? e(View, null,
                e(Text, { style: { marginBottom: 2 } }, `Solde déduit : -${fmt(data.solde_deduit)} ${data.currency}`),
                e(Text, { style: styles.paymentAmount }, `Montant à payer : ${fmt(data.montant_copro)} ${data.currency}`),
              )
            : e(Text, { style: styles.paymentAmount }, `Montant à payer : ${fmt(data.montant_copro)} ${data.currency}`),
          e(View, { style: styles.paymentRow },
            e(Text, { style: styles.paymentLabel }, 'IBAN :'),
            e(Text, { style: styles.paymentValue }, data.copro.iban),
          ),
          e(View, { style: styles.paymentRow },
            e(Text, { style: styles.paymentLabel }, 'Bénéficiaire :'),
            e(Text, { style: styles.paymentValue }, data.copro.nom),
          ),
          e(View, { style: styles.paymentRow },
            e(Text, { style: styles.paymentLabel }, 'Communication :'),
            e(Text, { style: styles.paymentValue }, data.reference),
          ),
          qrDataUrl ? e(View, { style: styles.qrSection },
            e(Image, { style: styles.qrImage, src: qrDataUrl }),
            e(Text, { style: styles.qrCaption }, 'Scannez ce QR code avec votre application bancaire'),
          ) : null,
        ),

        // Signature
        e(View, { style: styles.signatureBlock },
          e(Text, { style: styles.signatureName }, `${data.gestionnaire.prenom} ${data.gestionnaire.nom}`),
          e(Text, { style: styles.signatureRole }, `Syndic – ${data.copro.nom}`),
          signatureDataUrl ? e(Image, { style: styles.signatureImage, src: signatureDataUrl }) : null,
        ),
      ),

      // Footer
      e(View, { style: styles.footer },
        e(Text, null, `${data.copro.nom} – Document généré par TinyCopro`),
      ),
    )
  );
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generatePaymentPdf(data: PdfPaymentData): Promise<Blob> {
  let qrDataUrl: string | null = null;
  try {
    // No QR if amount is 0 (fully covered by solde)
    if (data.copro.iban && data.montant_copro > 0) {
      const epcData = generateEpcQrData({
        iban: data.copro.iban,
        bic: data.bic,
        beneficiaryName: data.copro.nom.substring(0, 70),
        amount: data.montant_copro,
        reference: data.reference,
        currency: data.currency,
      });
      qrDataUrl = await QRCode.toDataURL(epcData, { width: 300, margin: 2, errorCorrectionLevel: 'M' });
    }
  } catch { /* QR failed, continue */ }

  // Fetch signature as data URL (CORS-safe)
  let signatureDataUrl: string | null = null;
  if (data.gestionnaire.signature_url) {
    signatureDataUrl = await fetchImageAsDataUrl(data.gestionnaire.signature_url);
  }

  const doc = React.createElement(PaymentCallDocument, { data, qrDataUrl, signatureDataUrl });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(doc as any).toBlob();
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
