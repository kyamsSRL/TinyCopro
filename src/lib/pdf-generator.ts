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
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#333',
  },
  memberInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  memberName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  colLabel: {
    flex: 3,
  },
  colDate: {
    flex: 2,
  },
  colAmount: {
    flex: 1,
    textAlign: 'right',
  },
  headerCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#333',
    paddingTop: 6,
    marginTop: 4,
  },
  totalLabel: {
    flex: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
  totalAmount: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
  bankInfo: {
    marginTop: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bankLabel: {
    width: 100,
    fontFamily: 'Helvetica-Bold',
    color: '#666',
  },
  bankValue: {
    flex: 1,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  qrImage: {
    width: 150,
    height: 150,
  },
  qrCaption: {
    marginTop: 8,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    paddingTop: 8,
  },
});

export interface PdfExpenseItem {
  libelle: string;
  date: string;
  montant: number;
}

export interface PdfPaymentData {
  coproName: string;
  coproAddress: string;
  memberName: string;
  memberAddress: string;
  reference: string;
  expenses: PdfExpenseItem[];
  total: number;
  iban: string;
  bic: string;
  currency: string;
}

function PaymentCallDocument({
  data,
  qrDataUrl,
}: {
  data: PdfPaymentData;
  qrDataUrl: string | null;
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.headerTitle }, data.coproName),
        React.createElement(Text, { style: styles.headerSubtitle }, data.coproAddress)
      ),
      // Reference
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          Text,
          { style: { fontSize: 11, fontFamily: 'Helvetica-Bold' } },
          `Appel de paiement: ${data.reference}`
        ),
        React.createElement(
          Text,
          { style: { fontSize: 9, color: '#666', marginTop: 4 } },
          `Date: ${new Date().toLocaleDateString('fr-FR')}`
        )
      ),
      // Member Info
      React.createElement(
        View,
        { style: styles.memberInfo },
        React.createElement(Text, { style: styles.memberName }, data.memberName),
        React.createElement(Text, null, data.memberAddress)
      ),
      // Expenses Table
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Charges'),
        React.createElement(
          View,
          { style: styles.table },
          // Table Header
          React.createElement(
            View,
            { style: styles.tableHeader },
            React.createElement(
              Text,
              { style: [styles.colLabel, styles.headerCell] },
              'Description'
            ),
            React.createElement(
              Text,
              { style: [styles.colDate, styles.headerCell] },
              'Date'
            ),
            React.createElement(
              Text,
              { style: [styles.colAmount, styles.headerCell] },
              'Montant'
            )
          ),
          // Table Rows
          ...data.expenses.map((expense, index) =>
            React.createElement(
              View,
              { style: styles.tableRow, key: String(index) },
              React.createElement(Text, { style: styles.colLabel }, expense.libelle),
              React.createElement(Text, { style: styles.colDate }, expense.date),
              React.createElement(
                Text,
                { style: styles.colAmount },
                `${expense.montant.toFixed(2)} ${data.currency}`
              )
            )
          ),
          // Total
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, { style: styles.totalLabel }, 'Total'),
            React.createElement(
              Text,
              { style: styles.totalAmount },
              `${data.total.toFixed(2)} ${data.currency}`
            )
          )
        )
      ),
      // Bank Info
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Informations bancaires'),
        React.createElement(
          View,
          { style: styles.bankInfo },
          React.createElement(
            View,
            { style: styles.bankRow },
            React.createElement(Text, { style: styles.bankLabel }, 'IBAN:'),
            React.createElement(Text, { style: styles.bankValue }, data.iban)
          ),
          React.createElement(
            View,
            { style: styles.bankRow },
            React.createElement(Text, { style: styles.bankLabel }, 'BIC:'),
            React.createElement(Text, { style: styles.bankValue }, data.bic)
          ),
          React.createElement(
            View,
            { style: styles.bankRow },
            React.createElement(Text, { style: styles.bankLabel }, 'Communication:'),
            React.createElement(Text, { style: styles.bankValue }, data.reference)
          )
        )
      ),
      // QR Code
      qrDataUrl
        ? React.createElement(
            View,
            { style: styles.qrSection },
            React.createElement(Text, { style: styles.sectionTitle }, 'Paiement rapide'),
            React.createElement(Image, { style: styles.qrImage, src: qrDataUrl }),
            React.createElement(
              Text,
              { style: styles.qrCaption },
              'Scannez ce QR code avec votre application bancaire'
            )
          )
        : null,
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          null,
          `${data.coproName} - Document genere automatiquement par TinyCopro`
        )
      )
    )
  );
}

export async function generatePaymentPdf(data: PdfPaymentData): Promise<Blob> {
  // Generate QR code data URL
  let qrDataUrl: string | null = null;
  try {
    if (data.iban && data.bic) {
      const epcData = generateEpcQrData({
        iban: data.iban,
        bic: data.bic,
        beneficiaryName: data.coproName.substring(0, 70),
        amount: data.total,
        reference: data.reference,
        currency: data.currency,
      });
      qrDataUrl = await QRCode.toDataURL(epcData, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
    }
  } catch {
    // QR generation failed, continue without it
  }

  const doc = React.createElement(PaymentCallDocument, { data, qrDataUrl });
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
